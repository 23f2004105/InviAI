"""
Database initialization and testing script
Run this to verify database setup
"""

import sys
import os
from pathlib import Path

# Add parent directory to path
sys.path.insert(0, str(Path(__file__).parent))

from app.database import (
    check_db_connection,
    init_db,
    reset_db,
    SessionLocal
)
from app.models import User, Portfolio, Asset, Transaction
import logging

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


def test_connection():
    """Test database connection"""
    logger.info("Testing database connection...")
    if check_db_connection():
        logger.info("✅ Database connection successful")
        return True
    else:
        logger.error("❌ Database connection failed")
        return False


def initialize_tables():
    """Initialize all database tables"""
    logger.info("Initializing database tables...")
    if init_db():
        logger.info("✅ Database tables created successfully")
        return True
    else:
        logger.error("❌ Failed to create database tables")
        return False


def test_crud_operations():
    """Test basic CRUD operations"""
    logger.info("Testing CRUD operations...")
    
    db = SessionLocal()
    try:
        # Create a test user
        test_user = User(
            supabase_id="test_supabase_id_123",
            email="test@example.com",
            full_name="Test User"
        )
        db.add(test_user)
        db.commit()
        db.refresh(test_user)
        logger.info(f"✅ Created test user: {test_user.email}")
        
        # Read user
        user = db.query(User).filter(User.email == "test@example.com").first()
        if user:
            logger.info(f"✅ Read test user: {user.email}")
        
        # Update user
        user.full_name = "Updated Test User"
        db.commit()
        logger.info(f"✅ Updated test user: {user.full_name}")
        
        # Delete user
        db.delete(user)
        db.commit()
        logger.info("✅ Deleted test user")
        
        logger.info("✅ All CRUD operations successful")
        return True
        
    except Exception as e:
        logger.error(f"❌ CRUD operations failed: {e}")
        db.rollback()
        return False
    finally:
        db.close()


def print_table_info():
    """Print information about database tables"""
    logger.info("\nDatabase Tables:")
    logger.info("=" * 50)
    
    from app.database import engine
    from sqlalchemy import inspect
    
    inspector = inspect(engine)
    tables = inspector.get_table_names()
    
    for table in tables:
        columns = inspector.get_columns(table)
        logger.info(f"\n📋 Table: {table}")
        logger.info(f"   Columns: {len(columns)}")
        for col in columns:
            logger.info(f"   - {col['name']}: {col['type']}")


def main():
    """Main initialization function"""
    print("\n" + "=" * 60)
    print("InviAI Database Initialization")
    print("=" * 60 + "\n")
    
    # Test connection
    if not test_connection():
        logger.error("Cannot proceed without database connection")
        return False
    
    # Initialize tables
    if not initialize_tables():
        logger.error("Cannot proceed without database tables")
        return False
    
    # Print table info
    print_table_info()
    
    # Test CRUD operations
    if not test_crud_operations():
        logger.warning("CRUD operations test failed, but tables are created")
    
    print("\n" + "=" * 60)
    print("✅ Database initialization complete!")
    print("=" * 60 + "\n")
    
    return True


if __name__ == "__main__":
    try:
        success = main()
        sys.exit(0 if success else 1)
    except KeyboardInterrupt:
        print("\n\nInterrupted by user")
        sys.exit(1)
    except Exception as e:
        logger.error(f"Unexpected error: {e}", exc_info=True)
        sys.exit(1)
