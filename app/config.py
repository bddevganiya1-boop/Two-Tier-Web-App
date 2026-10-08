import os
from urllib.parse import quote_plus

class Config:
    """Application configuration loader from environment variables."""
    SECRET_KEY = os.environ.get('SECRET_KEY', 'default-dev-secret-key-2026')
    
    # MySQL Database Config
    DB_USER = os.environ.get('MYSQL_USER', 'flask_user')
    DB_PASSWORD = os.environ.get('MYSQL_PASSWORD', 'flask_secret_pwd_2026')
    DB_HOST = os.environ.get('DB_HOST', 'db')
    DB_PORT = os.environ.get('MYSQL_PORT', '3306')
    DB_NAME = os.environ.get('MYSQL_DATABASE', 'app_db')

    # URL-encode password to handle special characters safely
    SQLALCHEMY_DATABASE_URI = (
        f"mysql+pymysql://{DB_USER}:{quote_plus(DB_PASSWORD)}@{DB_HOST}:{DB_PORT}/{DB_NAME}"
    )
    SQLALCHEMY_TRACK_MODIFICATIONS = False
    SQLALCHEMY_ENGINE_OPTIONS = {
        'pool_pre_ping': True,
        'pool_recycle': 280,
        'pool_timeout': 20,
        'pool_size': 10,
        'max_overflow': 5
    }
