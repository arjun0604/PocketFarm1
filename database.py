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

# Create the watering_schedules table with user_id
cursor.execute('''
CREATE TABLE IF NOT EXISTS watering_schedules (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    crop_name TEXT NOT NULL,
    watering_frequency TEXT NOT NULL,
    last_watered DATE,
    next_watering DATE
)
''')

# Create the users table
cursor.execute('''
CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    device_token TEXT NOT NULL,
    watering_reminder INTEGER DEFAULT 0,
    last_watered_date TEXT,
    next_watering_date TEXT
)
''')

# Commit the changes
conn.commit()

# Load the CSV file into a DataFrame
df = pd.read_csv('cropdata.csv')  # Ensure this file is in the same directory or provide the correct path

# Insert data into the crops table
df.to_sql('crops', conn, if_exists='append', index=False)

# Define weather instructions to insert
weather_instructions = [
    ("Rain", "Ensure proper drainage in your garden. Cover sensitive plants."),
    ("Frost", "Cover plants with cloth or bring them indoors. Water them well."),
    ("Heatwave", "Provide shade for plants and ensure they are well-watered."),
    ("Flood", "Move potted plants to higher ground and ensure drainage."),
    # Add more instructions as needed
]

# Insert data into the weather_instructions table
cursor.executemany("INSERT OR IGNORE INTO weather_instructions (alert_type, instructions) VALUES (?, ?)", weather_instructions)

# Commit the changes and close the connection
conn.commit()
conn.close()

print("Database created and data inserted successfully.")
