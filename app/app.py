import os
import socket
import time
import logging
from flask import Flask, render_template, request, jsonify, redirect, url_for, flash
from sqlalchemy import text
from app.config import Config
from app.models import db, Task, AuditLog

logging.basicConfig(level=logging.INFO, format='%(asctime)s [%(levelname)s] %(message)s')
logger = logging.getLogger(__name__)

def create_app():
    app = Flask(__name__)
    app.config.from_object(Config)

    db.init_app(app)

    # Healthcheck / Retry helper for MySQL connection on container startup
    with app.app_context():
        max_retries = 10
        retry_delay = 3
        connected = False

        for attempt in range(1, max_retries + 1):
            try:
                logger.info(f"Attempting database connection ({attempt}/{max_retries})...")
                db.session.execute(text("SELECT 1"))
                db.create_all()
                logger.info("Database connection established and tables verified successfully.")
                connected = True
                break
            except Exception as e:
                logger.warning(f"Database connection attempt {attempt} failed: {e}")
                if attempt < max_retries:
                    time.sleep(retry_delay)
                else:
                    logger.error("Could not connect to MySQL database after multiple attempts.")

    # --- Web Routes ---
    @app.route('/')
    def index():
        try:
            tasks = Task.query.order_by(Task.created_at.desc()).all()
            total_tasks = len(tasks)
            completed_tasks = sum(1 for t in tasks if t.status == 'Completed')
            in_progress_tasks = sum(1 for t in tasks if t.status == 'In Progress')
            pending_tasks = sum(1 for t in tasks if t.status == 'Pending')
            
            db_status = "Connected"
            db_error = None
        except Exception as e:
            logger.error(f"Error fetching tasks: {e}")
            tasks = []
            total_tasks = completed_tasks = in_progress_tasks = pending_tasks = 0
            db_status = "Disconnected"
            db_error = str(e)

        hostname = socket.gethostname()
        db_host = os.environ.get('DB_HOST', 'db')
        db_name = os.environ.get('MYSQL_DATABASE', 'app_db')

        return render_template(
            'index.html',
            tasks=tasks,
            total_tasks=total_tasks,
            completed_tasks=completed_tasks,
            in_progress_tasks=in_progress_tasks,
            pending_tasks=pending_tasks,
            hostname=hostname,
            db_host=db_host,
            db_name=db_name,
            db_status=db_status,
            db_error=db_error
        )

    @app.route('/tasks/add', methods=['POST'])
    def add_task():
        title = request.form.get('title', '').strip()
        description = request.form.get('description', '').strip()
        priority = request.form.get('priority', 'Medium')
        status = request.form.get('status', 'Pending')

        if not title:
            flash('Task title is required!', 'danger')
            return redirect(url_for('index'))

        try:
            task = Task(title=title, description=description, priority=priority, status=status)
            db.session.add(task)
            
            # Audit log entry
            log = AuditLog(
                action='CREATE_TASK',
                details=f"Created task '{title}' with priority {priority}",
                ip_address=request.remote_addr
            )
            db.session.add(log)
            db.session.commit()
            flash('Task added successfully!', 'success')
        except Exception as e:
            db.session.rollback()
            logger.error(f"Error creating task: {e}")
            flash(f'Failed to add task: {e}', 'danger')

        return redirect(url_for('index'))

    @app.route('/tasks/<int:task_id>/update-status', methods=['POST'])
    def update_task_status(task_id):
        try:
            task = Task.query.get_or_404(task_id)
            new_status = request.form.get('status', task.status)
            old_status = task.status
            task.status = new_status
            
            log = AuditLog(
                action='UPDATE_STATUS',
                details=f"Task #{task.id} '{task.title}' status changed from '{old_status}' to '{new_status}'",
                ip_address=request.remote_addr
            )
            db.session.add(log)
            db.session.commit()
            flash(f"Task status updated to '{new_status}'!", 'info')
        except Exception as e:
            db.session.rollback()
            logger.error(f"Error updating task {task_id}: {e}")
            flash(f'Failed to update task: {e}', 'danger')

        return redirect(url_for('index'))

    @app.route('/tasks/<int:task_id>/delete', methods=['POST'])
    def delete_task(task_id):
        try:
            task = Task.query.get_or_404(task_id)
            title = task.title
            db.session.delete(task)
            
            log = AuditLog(
                action='DELETE_TASK',
                details=f"Deleted task #{task_id} '{title}'",
                ip_address=request.remote_addr
            )
            db.session.add(log)
            db.session.commit()
            flash('Task deleted successfully!', 'warning')
        except Exception as e:
            db.session.rollback()
            logger.error(f"Error deleting task {task_id}: {e}")
            flash(f'Failed to delete task: {e}', 'danger')

        return redirect(url_for('index'))

    # --- REST API Endpoints ---
    @app.route('/api/health', methods=['GET'])
    def health_check():
        db_connected = False
        db_latency_ms = None
        start = time.time()
        try:
            db.session.execute(text("SELECT 1"))
            db_connected = True
            db_latency_ms = round((time.time() - start) * 1000, 2)
        except Exception as e:
            logger.error(f"Healthcheck DB failure: {e}")

        status_code = 200 if db_connected else 503
        return jsonify({
            'status': 'healthy' if db_connected else 'unhealthy',
            'timestamp': time.strftime('%Y-%m-%d %H:%M:%S'),
            'hostname': socket.gethostname(),
            'database': {
                'connected': db_connected,
                'latency_ms': db_latency_ms,
                'host': os.environ.get('DB_HOST', 'db'),
                'name': os.environ.get('MYSQL_DATABASE', 'app_db')
            }
        }), status_code

    @app.route('/api/tasks', methods=['GET'])
    def get_tasks_api():
        try:
            tasks = Task.query.order_by(Task.created_at.desc()).all()
            return jsonify({'success': True, 'count': len(tasks), 'data': [t.to_dict() for t in tasks]})
        except Exception as e:
            return jsonify({'success': False, 'error': str(e)}), 500

    @app.route('/api/tasks', methods=['POST'])
    def create_task_api():
        data = request.get_json() or {}
        title = data.get('title', '').strip()
        if not title:
            return jsonify({'success': False, 'error': 'Title is required'}), 400

        try:
            task = Task(
                title=title,
                description=data.get('description', ''),
                priority=data.get('priority', 'Medium'),
                status=data.get('status', 'Pending')
            )
            db.session.add(task)
            db.session.commit()
            return jsonify({'success': True, 'data': task.to_dict()}), 201
        except Exception as e:
            db.session.rollback()
            return jsonify({'success': False, 'error': str(e)}), 500

    @app.route('/api/logs', methods=['GET'])
    def get_logs_api():
        try:
            logs = AuditLog.query.order_by(AuditLog.created_at.desc()).limit(20).all()
            return jsonify({'success': True, 'count': len(logs), 'data': [l.to_dict() for l in logs]})
        except Exception as e:
            return jsonify({'success': False, 'error': str(e)}), 500

    return app

app = create_app()

if __name__ == '__main__':
    port = int(os.environ.get('APP_PORT', 5000))
    debug_mode = os.environ.get('FLASK_ENV', 'production').lower() == 'development'
    app.run(host='0.0.0.0', port=port, debug=debug_mode)
