"""
InviAI Database Configuration
SQLAlchemy setup with connection pooling and session management
"""

from sqlalchemy import create_engine, event
from sqlalchemy.exc import SQLAlchemyError
from sqlalchemy.orm import declarative_base, sessionmaker, Session
from sqlalchemy.pool import QueuePool
import os
import logging
from dotenv import load_dotenv

# Load backend/.env regardless of the directory the server is started from
load_dotenv(os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), ".env"))

logger = logging.getLogger(__name__)

# ========================================
# Database URL Configuration
# ========================================

# Get database URL from environment variable
DATABASE_URL = os.getenv(
    "DATABASE_URL",
    "postgresql://inviai_user:password@localhost:5432/inviai_db"
)

# SQLAlchemy requires 'postgresql://' not 'postgres://'
if DATABASE_URL.startswith("postgres://"):
    DATABASE_URL = DATABASE_URL.replace("postgres://", "postgresql://", 1)

logger.info(f"Database URL configured: {DATABASE_URL.split('@')[1] if '@' in DATABASE_URL else 'local'}")


# ========================================
# Engine Configuration
# ========================================

# Create SQLAlchemy engine with connection pooling
engine = create_engine(
    DATABASE_URL,
    poolclass=QueuePool,
    pool_size=10,  # Number of connections to maintain
    max_overflow=20,  # Maximum overflow connections
    pool_timeout=30,  # Timeout for getting connection from pool
    pool_recycle=3600,  # Recycle connections after 1 hour
    pool_pre_ping=True,  # Test connections before using them
    echo=os.getenv("ENVIRONMENT") == "development",  # Log SQL in development
    connect_args={
        "options": "-c timezone=utc"  # Set timezone to UTC
    }
)


# Enable connection pool logging in development
if os.getenv("ENVIRONMENT") == "development":
    @event.listens_for(engine, "connect")
    def receive_connect(dbapi_conn, connection_record):
        logger.debug("Database connection established")
    
    @event.listens_for(engine, "checkout")
    def receive_checkout(dbapi_conn, connection_record, connection_proxy):
        logger.debug("Connection checked out from pool")


# ========================================
# Session Configuration
# ========================================

# Create SessionLocal class for database sessions
SessionLocal = sessionmaker(
    autocommit=False,
    autoflush=False,
    bind=engine
)

# Create declarative base for models
Base = declarative_base()


# ========================================
# Dependency Injection for FastAPI
# ========================================

def get_db():
    """
    Dependency function to get database session
    Usage in FastAPI endpoints:
        def endpoint(db: Session = Depends(get_db)):
            ...
    """
    db = SessionLocal()
    try:
        yield db
    except SQLAlchemyError as e:
        logger.error(f"Database session error: {e}")
        db.rollback()
        raise
    except Exception:
        # HTTP errors, rate limits etc. - not a DB problem, just don't leave work half-done
        db.rollback()
        raise
    finally:
        db.close()


# ========================================
# Database Utilities
# ========================================

def init_db():
    """
    Initialize database - create all tables
    """
    try:
        # Import all models to ensure they are registered with Base
        from app.models import LocalUser, Portfolio, Asset, Transaction, MarketDataCache
        
        # Create all tables
        Base.metadata.create_all(bind=engine)
        logger.info("Database tables created successfully")
        return True
    except Exception as e:
        logger.error(f"Error initializing database: {e}")
        return False


def drop_db():
    """
    Drop all database tables (use with caution!)
    """
    try:
        Base.metadata.drop_all(bind=engine)
        logger.warning("All database tables dropped")
        return True
    except Exception as e:
        logger.error(f"Error dropping database: {e}")
        return False


def reset_db():
    """
    Reset database - drop and recreate all tables
    """
    logger.warning("Resetting database...")
    drop_db()
    return init_db()


def check_db_connection():
    """
    Check if database connection is working
    """
    try:
        from sqlalchemy import text
        db = SessionLocal()
        db.execute(text("SELECT 1"))
        db.close()
        logger.info("Database connection successful")
        return True
    except Exception as e:
        logger.error(f"Database connection failed: {e}")
        return False


# ========================================
# Context Manager for Database Sessions
# ========================================

class DatabaseSession:
    """
    Context manager for database sessions
    Usage:
        with DatabaseSession() as db:
            user = db.query(LocalUser).first()
    """
    def __enter__(self):
        self.db = SessionLocal()
        return self.db
    
    def __exit__(self, exc_type, exc_val, exc_tb):
        if exc_type is not None:
            self.db.rollback()
        self.db.close()


# ========================================
# Transaction Helper
# ========================================

def execute_transaction(func):
    """
    Decorator for executing database transactions
    Automatically commits on success and rolls back on error
    """
    def wrapper(*args, **kwargs):
        db = SessionLocal()
        try:
            result = func(db, *args, **kwargs)
            db.commit()
            return result
        except Exception as e:
            db.rollback()
            logger.error(f"Transaction failed: {e}")
            raise
        finally:
            db.close()
    return wrapper


# ========================================
# Initialization on Import
# ========================================

# Check database connection on module import
if __name__ != "__main__":
    try:
        check_db_connection()
    except Exception as e:
        logger.warning(f"Initial database connection check failed: {e}")
        logger.warning("Database may not be available yet. Will retry on first request.")
