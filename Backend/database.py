import sqlite3
import pandas as pd

# Connect to SQLite database (it will create the database file if it doesn't exist)
conn = sqlite3.connect('PocketFarm.db')
cursor = conn.cursor()

# Create the crops table if it doesn't exist
cursor.execute('''
CREATE TABLE IF NOT EXISTS crops (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
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

# Create the weather_instructions table if it doesn't exist
cursor.execute('''
CREATE TABLE IF NOT EXISTS weather_instructions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    alert_type TEXT NOT NULL UNIQUE,
    instructions TEXT NOT NULL
)
''')

# Create the watering_schedules table if it doesn't exist
cursor.execute('''
CREATE TABLE IF NOT EXISTS watering_schedules (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    crop_id INTEGER NOT NULL,
    last_watered DATE NULL,
    next_watering DATE,
    watering_frequency INTEGER,  
    fertilization_schedule INTEGER,
    water_status BOOLEAN DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (crop_id) REFERENCES crops(id) ON DELETE CASCADE,
    UNIQUE(user_id, crop_id)
)
''')

# Add water_status column if it doesn't exist
try:
    cursor.execute("SELECT water_status FROM watering_schedules LIMIT 1")
except sqlite3.OperationalError:
    print("Adding water_status column to watering_schedules table...")
    cursor.execute('''
    ALTER TABLE watering_schedules
    ADD COLUMN water_status BOOLEAN DEFAULT 0
    ''')
    conn.commit()

# Create indexes for better performance
cursor.execute('CREATE INDEX IF NOT EXISTS idx_watering_schedules_user_id ON watering_schedules(user_id)')
cursor.execute('CREATE INDEX IF NOT EXISTS idx_watering_schedules_crop_id ON watering_schedules(crop_id)')
cursor.execute('CREATE INDEX IF NOT EXISTS idx_watering_schedules_next_watering ON watering_schedules(next_watering)')
cursor.execute('CREATE INDEX IF NOT EXISTS idx_watering_schedules_water_status ON watering_schedules(water_status)')

# Enable WAL mode for better concurrency
cursor.execute('PRAGMA journal_mode=WAL')
cursor.execute('PRAGMA busy_timeout=30000')  # 30 seconds

# Create the users table if it doesn't exist
cursor.execute('''
CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    email TEXT NOT NULL UNIQUE,
    password TEXT NOT NULL,
    phone TEXT,
    location_city TEXT,
    location_state TEXT,
    location_country TEXT,
    location_latitude REAL,
    location_longitude REAL,
    notification_enabled BOOLEAN DEFAULT 1,
    last_alert_check TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
)
''')

# Create the user_crops table if it doesn't exist
cursor.execute('''
CREATE TABLE IF NOT EXISTS user_crops (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    crop_id INTEGER NOT NULL,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (crop_id) REFERENCES crops(id) ON DELETE CASCADE,
    UNIQUE(user_id, crop_id)
)
''')

# Create indexes for better performance
cursor.execute('CREATE INDEX IF NOT EXISTS idx_user_crops_user_id ON user_crops(user_id)')
cursor.execute('CREATE INDEX IF NOT EXISTS idx_user_crops_crop_id ON user_crops(crop_id)')

# Create the notification_preferences table if it doesn't exist
cursor.execute('''
CREATE TABLE IF NOT EXISTS notification_preferences (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    watering_reminders BOOLEAN DEFAULT 1,
    weather_alerts BOOLEAN DEFAULT 1,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
)
''')

# Create the weather_alerts table if it doesn't exist
cursor.execute('''
CREATE TABLE IF NOT EXISTS weather_alerts (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    alert_type TEXT NOT NULL,
    alert_message TEXT NOT NULL,
    alert_date DATE NOT NULL,
    alert_status TEXT DEFAULT 'pending',
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
)
''')

# Create the crop_schedule table if it doesn't exist
cursor.execute('''
CREATE TABLE IF NOT EXISTS crop_schedule (
    crop_name TEXT PRIMARY KEY,
    growing_time INTEGER,
    watering_frequency INTEGER,
    fertilization_schedule INTEGER
)
''')

# Create indexes for better performance
cursor.execute('CREATE INDEX IF NOT EXISTS idx_crops_name ON crops(name)')
cursor.execute('CREATE INDEX IF NOT EXISTS idx_crop_schedule_crop_name ON crop_schedule(crop_name)')

# Commit the changes
conn.commit()

# Load the CSV file into a DataFrame only if the tables are empty
cursor.execute("SELECT COUNT(*) FROM crops")
if cursor.fetchone()[0] == 0:
    print("Initializing crops data...")
    df_crops = pd.read_csv('cropdata.csv')
    df_crops.to_sql('crops', conn, if_exists='append', index=False)

cursor.execute("SELECT COUNT(*) FROM crop_schedule")
if cursor.fetchone()[0] == 0:
    print("Initializing crop schedule data...")
    df_schedule = pd.read_csv('crop_schedule_numerical.csv')
    df_schedule.to_sql('crop_schedule', conn, if_exists='append', index=False)

# Define weather instructions to insert only if the table is empty
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
    cursor.executemany("INSERT INTO weather_instructions (alert_type, instructions) VALUES (?, ?)", weather_instructions)

# Commit any new data insertions
conn.commit()
conn.close()

print("Database created and data inserted successfully.")
