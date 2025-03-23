import sqlite3
import pandas as pd

# Connect to SQLite database (it will create the database file if it doesn't exist)
conn = sqlite3.connect('PocketFarm.db')
cursor = conn.cursor()

# Drop the crops table if it exists
cursor.execute('DROP TABLE IF EXISTS crops')

# Create the crops table
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

# Drop the weather_instructions table if it exists
cursor.execute('DROP TABLE IF EXISTS weather_instructions')

# Create the weather_instructions table
cursor.execute('''
CREATE TABLE IF NOT EXISTS weather_instructions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    alert_type TEXT NOT NULL UNIQUE,
    instructions TEXT NOT NULL
)
''')

# Drop the watering_schedules table if it exists
cursor.execute('DROP TABLE IF EXISTS watering_schedules')

# Create the watering_schedules table with user_id and crop_id
cursor.execute('''
CREATE TABLE IF NOT EXISTS watering_schedules (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    crop_id INTEGER NOT NULL,
    last_watered DATE NULL,
    next_watering DATE,
    watering_frequency INTEGER,  
    fertilization_schedule INTEGER,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (crop_id) REFERENCES crops(id) ON DELETE CASCADE,
    UNIQUE(user_id, crop_id)
)
''')

# Create indexes for better performance
cursor.execute('CREATE INDEX IF NOT EXISTS idx_watering_schedules_user_id ON watering_schedules(user_id)')
cursor.execute('CREATE INDEX IF NOT EXISTS idx_watering_schedules_crop_id ON watering_schedules(crop_id)')

# Drop the users table if it exists
cursor.execute('DROP TABLE IF EXISTS users')

# Create the users table with updated fields
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

# Drop the user_crops table if it exists
cursor.execute('DROP TABLE IF EXISTS user_crops')

# Create the user_crops table to associate users with their crops
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

# Drop the notification_preferences table if it exists
cursor.execute('DROP TABLE IF EXISTS notification_preferences')

# Create the notification_preferences table
cursor.execute('''
CREATE TABLE IF NOT EXISTS notification_preferences (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    watering_reminders BOOLEAN DEFAULT 1,
    weather_alerts BOOLEAN DEFAULT 1,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
)
''')

# Drop the weather_alerts table if it exists
cursor.execute('DROP TABLE IF EXISTS weather_alerts')

# Create the weather_alerts table
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

# Drop the crop_schedule table if it exists
cursor.execute('DROP TABLE IF EXISTS crop_schedule')

# Create the crop_schedule table to store numerical crop schedules
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

# Load the CSV file into a DataFrame
df_crops = pd.read_csv('cropdata.csv')  # Ensure this file is in the same directory or provide the correct path
df_schedule = pd.read_csv('crop_schedule_numerical.csv')  # Load the new numerical schedule CSV

# Insert data into the crops table
df_crops.to_sql('crops', conn, if_exists='append', index=False)

# Insert data into the crop_schedule table
df_schedule.to_sql('crop_schedule', conn, if_exists='append', index=False)

# Define weather instructions to insert
weather_instructions = [
    ("Rain", "Ensure proper drainage in your garden. Cover sensitive plants."),
    ("Frost", "Cover plants with cloth or bring them indoors. Water them well."),
    ("Heatwave", "Provide shade for plants and ensure they are well-watered."),
    ("Flood", "Move potted plants to higher ground and ensure drainage."),
    ("Strong Wind", "Secure plants and structures to prevent damage."),
    ("Storm", "Bring potted plants indoors and secure garden structures."),
    # Add more instructions as needed
]

# Insert data into the weather_instructions table
cursor.executemany("INSERT OR IGNORE INTO weather_instructions (alert_type, instructions) VALUES (?, ?)", weather_instructions)

# Commit the changes and close the connection
conn.commit()
conn.close()

print("Database created and data inserted successfully.")
