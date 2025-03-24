import os
import pandas as pd
from datetime import datetime, timedelta
import psycopg2
from psycopg2.extras import DictCursor
from urllib.parse import urlparse
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

def get_db():
    """Get a PostgreSQL database connection"""
    database_url = os.getenv('DATABASE_URL')
    
    if database_url:
        # Parse the database URL (Render provides this)
        result = urlparse(database_url)
        conn = psycopg2.connect(
            database=result.path[1:],
            user=result.username,
            password=result.password,
            host=result.hostname,
            port=result.port,
            sslmode='require'
        )
    else:
        # Local development fallback
        conn = psycopg2.connect(
            dbname=os.getenv('DB_NAME', 'farm'),
            user=os.getenv('DB_USER', 'farm_user'),
            password=os.getenv('DB_PASSWORD', 'farm_password'),
            host=os.getenv('DB_HOST', 'localhost')
        )
    
    conn.autocommit = True
    return conn

def check_column_exists(table, column, conn):
    """Check if a column exists in a table"""
    cursor = conn.cursor()
    try:
        cursor.execute(f"""
            SELECT column_name 
            FROM information_schema.columns 
            WHERE table_name='{table}' AND column_name='{column}'
        """)
        return bool(cursor.fetchone())
    finally:
        cursor.close()

def initialize_database():
    """Initialize the database with tables and sample data"""
    conn = get_db()
    cursor = conn.cursor()
    
    try:
        # Create users table
        cursor.execute('''
        CREATE TABLE IF NOT EXISTS users (
            id SERIAL PRIMARY KEY,
            name TEXT NOT NULL,
            email TEXT UNIQUE NOT NULL,
            password BYTEA NOT NULL,
            phone TEXT,
            location_city TEXT,
            location_state TEXT,
            location_country TEXT,
            location_latitude REAL,
            location_longitude REAL,
            last_login TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
            created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
            google_id TEXT
        )
        ''')

        # Create crops table
        cursor.execute('''
        CREATE TABLE IF NOT EXISTS crops (
            id SERIAL PRIMARY KEY,
            name TEXT UNIQUE NOT NULL,
            imageURL TEXT,
            scientific_name TEXT,
            description TEXT,
            origin TEXT,
            growing_conditions TEXT,
            planting_info TEXT,
            care_instructions TEXT,
            storage_info TEXT,
            nutritional_info TEXT,
            culinary_info TEXT
        )
        ''')

        # Create weather_instructions table
        cursor.execute('''
        CREATE TABLE IF NOT EXISTS weather_instructions (
            id SERIAL PRIMARY KEY,
            alert_type TEXT NOT NULL UNIQUE,
            instructions TEXT NOT NULL
        )
        ''')

        # Create watering_schedules table
        cursor.execute('''
        CREATE TABLE IF NOT EXISTS watering_schedules (
            id SERIAL PRIMARY KEY,
            user_id INTEGER NOT NULL,
            crop_id INTEGER NOT NULL,
            last_watered DATE NULL,
            next_watering DATE,
            watering_frequency INTEGER,  
            fertilization_schedule INTEGER,
            water_status BOOLEAN DEFAULT FALSE,
            created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
            FOREIGN KEY (crop_id) REFERENCES crops(id) ON DELETE CASCADE,
            UNIQUE(user_id, crop_id)
        )
        ''')

        # Create user_crops table
        cursor.execute('''
        CREATE TABLE IF NOT EXISTS user_crops (
            id SERIAL PRIMARY KEY,
            user_id INTEGER NOT NULL,
            crop_id INTEGER NOT NULL,
            FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
            FOREIGN KEY (crop_id) REFERENCES crops(id) ON DELETE CASCADE,
            UNIQUE(user_id, crop_id)
        )
        ''')

        # Create notification_preferences table
        cursor.execute('''
        CREATE TABLE IF NOT EXISTS notification_preferences (
            id SERIAL PRIMARY KEY,
            user_id INTEGER NOT NULL,
            watering_reminders BOOLEAN DEFAULT TRUE,
            weather_alerts BOOLEAN DEFAULT TRUE,
            FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
        )
        ''')

        # Create weather_alerts table
        cursor.execute('''
        CREATE TABLE IF NOT EXISTS weather_alerts (
            id SERIAL PRIMARY KEY,
            user_id INTEGER NOT NULL,
            alert_type TEXT NOT NULL,
            alert_message TEXT NOT NULL,
            alert_date DATE NOT NULL,
            alert_status TEXT DEFAULT 'pending',
            FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
        )
        ''')

        # Create crop_schedule table
        cursor.execute('''
        CREATE TABLE IF NOT EXISTS crop_schedule (
            crop_name TEXT PRIMARY KEY,
            growing_time INTEGER,
            watering_frequency INTEGER,
            fertilization_schedule INTEGER
        )
        ''')

        # Create indexes
        cursor.execute('CREATE INDEX IF NOT EXISTS idx_watering_schedules_user_id ON watering_schedules(user_id)')
        cursor.execute('CREATE INDEX IF NOT EXISTS idx_watering_schedules_crop_id ON watering_schedules(crop_id)')
        cursor.execute('CREATE INDEX IF NOT EXISTS idx_watering_schedules_next_watering ON watering_schedules(next_watering)')
        cursor.execute('CREATE INDEX IF NOT EXISTS idx_watering_schedules_water_status ON watering_schedules(water_status)')
        cursor.execute('CREATE INDEX IF NOT EXISTS idx_user_crops_user_id ON user_crops(user_id)')
        cursor.execute('CREATE INDEX IF NOT EXISTS idx_user_crops_crop_id ON user_crops(crop_id)')
        cursor.execute('CREATE INDEX IF NOT EXISTS idx_crops_name ON crops(name)')
        cursor.execute('CREATE INDEX IF NOT EXISTS idx_crop_schedule_crop_name ON crop_schedule(crop_name)')

        # Check if crops table is empty and initialize
        cursor.execute("SELECT COUNT(*) FROM crops")
        if cursor.fetchone()[0] == 0:
            print("Initializing crops data...")
            df_crops = pd.read_csv('cropdata.csv')
            # Convert DataFrame to list of tuples for executemany
            records = df_crops.to_records(index=False).tolist()
            cols = ','.join(df_crops.columns)
            placeholders = ','.join(['%s'] * len(df_crops.columns))
            cursor.executemany(
                f"INSERT INTO crops ({cols}) VALUES ({placeholders})",
                records
            )

        # Check if crop_schedule table is empty and initialize
        cursor.execute("SELECT COUNT(*) FROM crop_schedule")
        if cursor.fetchone()[0] == 0:
            print("Initializing crop schedule data...")
            df_schedule = pd.read_csv('crop_schedule_numerical.csv')
            records = df_schedule.to_records(index=False).tolist()
            cols = ','.join(df_schedule.columns)
            placeholders = ','.join(['%s'] * len(df_schedule.columns))
            cursor.executemany(
                f"INSERT INTO crop_schedule ({cols}) VALUES ({placeholders})",
                records
            )

        # Check if weather_instructions table is empty and initialize
        cursor.execute("SELECT COUNT(*) FROM weather_instructions")
        if cursor.fetchone()[0] == 0:
            print("Initializing weather instructions...")
            weather_instructions = [
                ("Rain", "Ensure proper drainage in your garden. Cover sensitive plants."),
                ("Frost", "Cover plants with cloth or bring them indoors. Water them well."),
                ("Heatwave", "Provide shade for plants and ensure they are well-watered."),
                ("Flood", "Move potted plants to higher ground and ensure drainage."),
                ("Strong Wind", "Secure plants and structures to prevent damage."),
                ("Storm", "Bring potted plants indoors and secure garden structures."),
            ]
            cursor.executemany(
                "INSERT INTO weather_instructions (alert_type, instructions) VALUES (%s, %s)",
                weather_instructions
            )

        print("Database initialized successfully!")
    except Exception as e:
        print(f"Error initializing database: {e}")
        raise
    finally:
        cursor.close()
        conn.close()

if __name__ == "__main__":
    initialize_database()
