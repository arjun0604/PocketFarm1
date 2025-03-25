import os
import sys
import psycopg2
import sqlite3
import csv
import pandas as pd
from dotenv import load_dotenv
from psycopg2.extras import execute_values

# Load environment variables
load_dotenv()

def get_sqlite_connection():
    """Connect to SQLite database"""
    try:
        conn = sqlite3.connect('PocketFarm.db')
        conn.row_factory = sqlite3.Row
        return conn
    except sqlite3.Error as e:
        print(f"SQLite connection error: {e}")
        sys.exit(1)

def get_postgres_connection():
    """Connect to PostgreSQL database"""
    db_url = os.getenv("DATABASE_URL")
    if not db_url:
        print("Error: DATABASE_URL environment variable not set")
        sys.exit(1)
        
    try:
        conn = psycopg2.connect(db_url)
        conn.autocommit = True
        return conn
    except Exception as e:
        print(f"PostgreSQL connection error: {e}")
        sys.exit(1)

def setup_postgres_schema(pg_conn):
    """Create PostgreSQL schema using schema_postgres.sql"""
    cursor = pg_conn.cursor()
    
    try:
        with open('schema_postgres.sql', 'r') as f:
            sql_script = f.read()
            cursor.execute(sql_script)
        print("PostgreSQL schema created successfully")
    except Exception as e:
        print(f"Error creating PostgreSQL schema: {e}")
        sys.exit(1)
    finally:
        cursor.close()

def migrate_table(sqlite_conn, pg_conn, table_name, columns):
    """Migrate data from SQLite table to PostgreSQL table"""
    sqlite_cursor = sqlite_conn.cursor()
    pg_cursor = pg_conn.cursor()
    
    try:
        # Get data from SQLite
        sqlite_cursor.execute(f"SELECT {', '.join(columns)} FROM {table_name}")
        rows = sqlite_cursor.fetchall()
        
        if not rows:
            print(f"No data found in SQLite table '{table_name}'")
            return
            
        # Convert to list of dicts
        data = []
        for row in rows:
            row_dict = {}
            for i, col in enumerate(columns):
                row_dict[col] = row[i]
            data.append(row_dict)
            
        # Insert into PostgreSQL
        column_names = ', '.join(columns)
        placeholders = ', '.join([f'%({col})s' for col in columns])
        query = f"INSERT INTO {table_name} ({column_names}) VALUES ({placeholders}) ON CONFLICT DO NOTHING"
        
        # Execute in batches to avoid memory issues
        batch_size = 100
        for i in range(0, len(data), batch_size):
            batch = data[i:i+batch_size]
            pg_cursor.executemany(query, batch)
            
        pg_conn.commit()
        print(f"Migrated {len(rows)} rows from '{table_name}'")
    except Exception as e:
        print(f"Error migrating table '{table_name}': {e}")
    finally:
        sqlite_cursor.close()
        pg_cursor.close()

def import_crop_data(pg_conn):
    """Import crop data from CSV files if available"""
    try:
        # Check if crop data files exist
        if os.path.exists('crop.csv'):
            crop_data = pd.read_csv('crop.csv')
            
            pg_cursor = pg_conn.cursor()
            
            # Clear existing data if needed
            pg_cursor.execute("DELETE FROM crop_schedule")
            
            # Process each row
            for _, row in crop_data.iterrows():
                pg_cursor.execute(
                    "INSERT INTO crop_schedule (crop_name, growing_time, watering_frequency, fertilization_schedule) VALUES (%s, %s, %s, %s)",
                    (row['crop_name'], row['growing_time'], row['watering_frequency'], row['fertilization_schedule'])
                )
                
            pg_conn.commit()
            print("Crop schedule data imported successfully")
    except Exception as e:
        print(f"Error importing crop data: {e}")

def main():
    print("Starting database migration from SQLite to PostgreSQL...")
    
    # Connect to both databases
    sqlite_conn = get_sqlite_connection()
    pg_conn = get_postgres_connection()
    
    # Setup PostgreSQL schema
    setup_postgres_schema(pg_conn)
    
    # Define table structures to migrate
    tables = {
        'users': ['id', 'name', 'email', 'password', 'phone', 'location_city', 'location_state', 
                 'location_country', 'location_latitude', 'location_longitude', 'email_verified'],
        'crops': ['id', 'name', 'imageURL', 'scientific_name', 'description', 'origin', 
                 'growing_conditions', 'planting_info', 'care_instructions', 'storage_info', 
                 'nutritional_info', 'culinary_info'],
        'crop_schedule': ['id', 'crop_name', 'growing_time', 'watering_frequency', 'fertilization_schedule'],
        'user_crops': ['id', 'user_id', 'crop_id'],
        'watering_schedules': ['id', 'user_id', 'crop_id', 'watering_frequency', 'fertilization_schedule', 
                              'last_watered', 'next_watering', 'water_status'],
        'verification_tokens': ['id', 'user_id', 'token', 'expires_at'],
        'notifications': ['id', 'user_id', 'message', 'timestamp', 'read_status'],
        'notification_preferences': ['id', 'user_id', 'weather_alerts']
    }
    
    # Migrate each table
    for table, columns in tables.items():
        migrate_table(sqlite_conn, pg_conn, table, columns)
    
    # Import additional crop data if needed
    import_crop_data(pg_conn)
    
    # Close connections
    sqlite_conn.close()
    pg_conn.close()
    
    print("Migration completed successfully")

if __name__ == "__main__":
    main() 