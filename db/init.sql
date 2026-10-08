-- Database Initialization Script for Two-Tier Web Application
-- Executed automatically on MySQL container startup via /docker-entrypoint-initdb.d/

CREATE DATABASE IF NOT EXISTS app_db CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE app_db;

-- Table for Task & Item Management
CREATE TABLE IF NOT EXISTS tasks (
    id INT AUTO_INCREMENT PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    priority ENUM('Low', 'Medium', 'High', 'Critical') DEFAULT 'Medium',
    status ENUM('Pending', 'In Progress', 'Completed') DEFAULT 'Pending',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Table for System Audit & Health Logs
CREATE TABLE IF NOT EXISTS audit_logs (
    id INT AUTO_INCREMENT PRIMARY KEY,
    action VARCHAR(100) NOT NULL,
    details TEXT,
    ip_address VARCHAR(45),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Insert Initial Seed Data
INSERT INTO tasks (title, description, priority, status) VALUES
('Setup Docker Bridge Network', 'Configure isolated custom bridge network for Flask backend and MySQL database container communication.', 'High', 'Completed'),
('Implement Persistent Volumes', 'Mount MySQL data directory to a named Docker volume to prevent data loss on container recreation.', 'Critical', 'Completed'),
('Containerize Two-Tier Flask Architecture', 'Package Python Flask app with multi-stage lightweight Docker image and connect to MySQL backend.', 'High', 'Completed'),
('Deploy Multi-Container with Docker Compose', 'Orchestrate build, environment variables, healthchecks, dependencies, and port mappings.', 'Medium', 'In Progress'),
('Test Database Resilience & Failover', 'Verify that data persists after restarting or recreating MySQL container.', 'Medium', 'Pending');

INSERT INTO audit_logs (action, details, ip_address) VALUES
('SYSTEM_INIT', 'Database schema created and initial seed records inserted.', '127.0.0.1');
