import os
from dotenv import load_dotenv
print("=== Starting init_db.py ===")

load_dotenv()
print("1. Environment variables loaded")

from database import initialize_database
print("2. Database module imported")

print("3. Starting initialization...")
initialize_database()
print("=== Script finished ===")
