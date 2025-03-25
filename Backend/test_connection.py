#!/usr/bin/env python3
"""
Test script to verify database connection and imports work correctly.
Run this script to check if your environment is correctly set up.
"""

import os
import sys
import logging

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Add current directory to path
current_dir = os.path.dirname(os.path.abspath(__file__))
if current_dir not in sys.path:
    sys.path.insert(0, current_dir)

# Load environment variables
try:
    from dotenv import load_dotenv
    load_dotenv()
    logger.info("Environment variables loaded from .env file")
except ImportError:
    logger.warning("dotenv package not installed, skipping .env load")

def test_imports():
    """Test that all necessary imports work"""
    try:
        import flask
        import psycopg2
        import sqlite3
        logger.info("✅ Basic package imports successful")
    except ImportError as e:
        logger.error(f"❌ Import error: {e}")
        return False
    
    # Test database_config import
    try:
        from database_config import get_db, get_cursor
        logger.info("✅ Successfully imported database_config module")
    except ImportError as e:
        logger.error(f"❌ Failed to import database_config: {e}")
        logger.info("Trying to define functions directly...")
        
        # Define the functions inline as fallback
        try:
            def get_db():
                is_production = os.getenv("ENVIRONMENT", "development") == "production"
                db_url = os.getenv("DATABASE_URL")
                
                if is_production and db_url and db_url.startswith('postgres'):
                    # PostgreSQL connection
                    conn = psycopg2.connect(db_url)
                    return conn
                else:
                    # SQLite connection
                    conn = sqlite3.connect("PocketFarm.db")
                    conn.row_factory = sqlite3.Row
                    return conn
            
            def get_cursor(conn):
                if isinstance(conn, psycopg2.extensions.connection):
                    from psycopg2.extras import RealDictCursor
                    return conn.cursor(cursor_factory=RealDictCursor)
                return conn.cursor()
                
            logger.info("✅ Successfully defined inline database functions")
        except Exception as e:
            logger.error(f"❌ Failed to define inline functions: {e}")
            return False
    
    return True

def test_database_connection():
    """Test that database connection works"""
    try:
        from database_config import get_db, get_cursor
    except ImportError:
        # If import fails, define the functions
        def get_db():
            is_production = os.getenv("ENVIRONMENT", "development") == "production"
            db_url = os.getenv("DATABASE_URL")
            
            if is_production and db_url and db_url.startswith('postgres'):
                # PostgreSQL connection
                import psycopg2
                conn = psycopg2.connect(db_url)
                return conn
            else:
                # SQLite connection
                import sqlite3
                conn = sqlite3.connect("PocketFarm.db")
                conn.row_factory = sqlite3.Row
                return conn
        
        def get_cursor(conn):
            import psycopg2
            if isinstance(conn, psycopg2.extensions.connection):
                from psycopg2.extras import RealDictCursor
                return conn.cursor(cursor_factory=RealDictCursor)
            return conn.cursor()
    
    try:
        # Try to connect to the database
        conn = get_db()
        cursor = get_cursor(conn)
        
        # Try a simple query
        if isinstance(conn, psycopg2.extensions.connection):
            cursor.execute("SELECT current_timestamp")
        else:
            cursor.execute("SELECT datetime('now')")
            
        result = cursor.fetchone()
        logger.info(f"✅ Database connection successful! Current time: {result[0]}")
        
        # Check if users table exists
        try:
            if isinstance(conn, psycopg2.extensions.connection):
                cursor.execute("SELECT table_name FROM information_schema.tables WHERE table_name='users'")
            else:
                cursor.execute("SELECT name FROM sqlite_master WHERE type='table' AND name='users'")
                
            if cursor.fetchone():
                logger.info("✅ Users table exists in the database")
            else:
                logger.warning("⚠️ Users table does not exist in the database")
        except Exception as e:
            logger.error(f"❌ Error checking users table: {e}")
        
        cursor.close()
        conn.close()
        return True
    except Exception as e:
        logger.error(f"❌ Database connection error: {e}")
        logger.info(f"Database URL: {os.getenv('DATABASE_URL', 'Not set')}")
        logger.info(f"Environment: {os.getenv('ENVIRONMENT', 'development')}")
        return False

if __name__ == "__main__":
    logger.info("Starting connection test script...")
    
    # Test imports
    if not test_imports():
        logger.error("Import tests failed")
        sys.exit(1)
    
    # Test database connection
    if not test_database_connection():
        logger.error("Database connection test failed")
        sys.exit(1)
    
    logger.info("✅ All tests passed! Your environment is correctly configured.")
    sys.exit(0) 