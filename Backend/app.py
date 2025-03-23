from flask import Flask, request, jsonify
import requests
import sqlite3
from crops import recommend_crops  # Ensure crops.py exists and contains recommend_crops
from flask_socketio import SocketIO
import time
import threading
import os
from functools import lru_cache
from flask_cors import CORS  # Import CORS
from dotenv import load_dotenv
import bcrypt
from datetime import datetime, timedelta

# Load environment variables
load_dotenv()

app = Flask(__name__)
CORS(app, resources={
    r"/*": {
        "origins": ["http://localhost:8080", "https://localhost:8080"],
        "methods": ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
        "allow_headers": ["Content-Type", "Authorization"],
        "supports_credentials": True
    }
})
socketio = SocketIO(app, cors_allowed_origins=["http://localhost:8080", "https://localhost:8080"], supports_credentials=True)

# Use environment variable for API key
API_KEY = os.getenv("OPENWEATHERMAP_API_KEY")
if not API_KEY:
    raise ValueError("OpenWeatherMap API key is missing. Set OPENWEATHERMAP_API_KEY in .env file.")

# Add these constants after the API_KEY definition
WEATHER_ALERT_THRESHOLDS = {
    'heavy_rain': {
        'condition': 'Rain',
        'threshold': 10,  # mm/hour
        'message': 'Heavy rain alert! Consider protecting your plants.'
    },
    'strong_wind': {
        'condition': 'Wind',
        'threshold': 30,  # km/h
        'message': 'Strong winds detected! Secure your plants.'
    },
    'high_temperature': {
        'condition': 'Temperature',
        'threshold': 35,  # Celsius
        'message': 'High temperature alert! Ensure proper watering.'
    },
    'low_temperature': {
        'condition': 'Temperature',
        'threshold': 5,  # Celsius
        'message': 'Low temperature alert! Protect sensitive plants.'
    },
    'high_humidity': {
        'condition': 'Humidity',
        'threshold': 85,  # percentage
        'message': 'High humidity alert! Watch for fungal diseases.'
    }
}

def get_db():
    """Get a database connection."""
    conn = sqlite3.connect('PocketFarm.db')
    conn.row_factory = sqlite3.Row
    return conn

@app.route('/crop_schedule', methods=['GET'])
def get_crop_schedule():
    try:
        conn = get_db()
        cursor = conn.cursor()

        # Fetch all crop schedules
        cursor.execute("SELECT * FROM crop_schedule")
        schedules = cursor.fetchall()

        conn.close()

        # Format the response
        schedule_list = [dict(schedule) for schedule in schedules]
        return jsonify(schedule_list), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/user_schedule', methods=['POST'])
def create_user_schedule():
    try:
        data = request.get_json()
        user_id = data.get('user_id')
        crop_name = data.get('crop_name')

        if not user_id or not crop_name:
            return jsonify({'error': 'Missing required fields: user_id or crop_name'}), 400

        conn = get_db()
        cursor = conn.cursor()

        # First check if the crop exists in the crops table
        cursor.execute("SELECT id FROM crops WHERE name = ?", (crop_name,))
        crop = cursor.fetchone()
        if not crop:
            conn.close()
            return jsonify({'error': f'Crop "{crop_name}" not found in the database'}), 404

        # Check if the user exists
        cursor.execute("SELECT id FROM users WHERE id = ?", (user_id,))
        user = cursor.fetchone()
        if not user:
            conn.close()
            return jsonify({'error': f'User with id "{user_id}" not found'}), 404

        # Check if schedule already exists
        cursor.execute('''
            SELECT ws.id FROM watering_schedules ws
            JOIN crops c ON ws.crop_id = c.id
            WHERE ws.user_id = ? AND c.name = ?
        ''', (user_id, crop_name))
        existing_schedule = cursor.fetchone()
        if existing_schedule:
            conn.close()
            return jsonify({'message': 'Schedule already exists for this crop'}), 200

        # Get the schedule details from crop_schedule
        cursor.execute('''
            SELECT growing_time, watering_frequency, fertilization_schedule
            FROM crop_schedule
            WHERE crop_name = ?
        ''', (crop_name,))
        schedule_data = cursor.fetchone()
        
        if not schedule_data:
            conn.close()
            return jsonify({'error': f'No schedule data found for crop "{crop_name}"'}), 404

        growing_time, watering_frequency, fertilization_schedule = schedule_data

        # Calculate initial watering dates
        current_date = datetime.now().strftime('%Y-%m-%d')
        next_watering = (datetime.now() + timedelta(days=watering_frequency)).strftime('%Y-%m-%d')

        # Insert the user's watering schedule
        cursor.execute('''
            INSERT INTO watering_schedules 
            (user_id, crop_id, watering_frequency, fertilization_schedule, last_watered, next_watering)
            VALUES (?, ?, ?, ?, ?, ?)
        ''', (user_id, crop[0], watering_frequency, fertilization_schedule, current_date, next_watering))
        conn.commit()

        conn.close()
        return jsonify({'message': 'User schedule created successfully!'}), 200
    except Exception as e:
        print(f"Error creating user schedule: {str(e)}")  # Add logging
        return jsonify({'error': str(e)}), 500

@app.route('/user_schedule/<int:user_id>/<crop_name>', methods=['DELETE'])
def delete_user_schedule(user_id, crop_name):
    try:
        conn = get_db()
        cursor = conn.cursor()

        # Delete the user's watering schedule
        cursor.execute('''
            DELETE FROM watering_schedules ws
            WHERE ws.user_id = ? AND ws.crop_id IN (
                SELECT id FROM crops WHERE name = ?
            )
        ''', (user_id, crop_name))
        conn.commit()

        conn.close()
        return jsonify({'message': 'User schedule deleted successfully!'}), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500

def calculate_next_dates(last_date, frequency):
    if not last_date:
        return datetime.now().strftime('%Y-%m-%d')
    last_date = datetime.strptime(last_date, '%Y-%m-%d')
    next_date = last_date + timedelta(days=frequency)
    return next_date.strftime('%Y-%m-%d')

@app.route('/update_watering', methods=['POST'])
def update_watering():
    try:
        data = request.get_json()
        user_id = data.get('user_id')
        crop_name = data.get('crop_name')

        if not user_id or not crop_name:
            return jsonify({'error': 'Missing required fields: user_id or crop_name'}), 400

        conn = get_db()
        cursor = conn.cursor()

        # Fetch the user's watering schedule
        cursor.execute('''
            SELECT ws.id, ws.last_watered, ws.watering_frequency
            FROM watering_schedules ws
            JOIN crops c ON ws.crop_id = c.id
            WHERE ws.user_id = ? AND c.name = ?
        ''', (user_id, crop_name))
        schedule = cursor.fetchone()

        if not schedule:
            conn.close()
            return jsonify({'error': 'Watering schedule not found for the user and crop'}), 404

        schedule_id, last_watered, watering_frequency = schedule

        # Calculate the next watering date
        next_watering = calculate_next_dates(last_watered, watering_frequency)

        # Update the watering schedule
        cursor.execute('''
            UPDATE watering_schedules
            SET last_watered = DATE('now'), next_watering = ?
            WHERE id = ?
        ''', (next_watering, schedule_id))
        conn.commit()

        # Create a notification for the user
        notification_message = f"Great job! You've watered your {crop_name}. Next watering is scheduled for {next_watering}."
        create_notification(user_id, notification_message)

        conn.close()
        return jsonify({'message': 'Watering schedule updated successfully!', 'next_watering': next_watering}), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500


def get_weather_data(location):
    """Fetch weather data from OpenWeatherMap API with fallback for unavailable locations."""
    if not API_KEY:
        return None

    # Step 1: Try the user-provided location
    url = f"http://api.openweathermap.org/data/2.5/weather?q={location}&appid={API_KEY}&units=metric"
    
    try:
        response = requests.get(url)
        response.raise_for_status()  # Raise an error for bad responses (e.g., 404)
        return response.json()
    except requests.exceptions.HTTPError as e:
        if response.status_code == 404:
            print(f"Location '{location}' not found. Falling back to a broader location.")
            # Step 2: Fallback to a broader location (e.g., Kochi)
            fallback_location = "Kochi"  # You can adjust this based on your app's context
            url = f"http://api.openweathermap.org/data/2.5/weather?q={fallback_location}&appid={API_KEY}&units=metric"
            try:
                response = requests.get(url)
                response.raise_for_status()
                print(f"Using weather data for fallback location: {fallback_location}")
                return response.json()
            except requests.exceptions.RequestException as e2:
                print(f"Error fetching weather data for fallback location: {e2}")
                return None
        else:
            print(f"Error fetching weather data: {e}")
            return None
    except requests.exceptions.RequestException as e:
        print(f"Error fetching weather data: {e}")
        return None

def get_weather_alerts(location):
    """Fetch weather data using OpenWeatherMap Current Weather Data API (free plan)."""
    url = f"http://api.openweathermap.org/data/2.5/weather?lat={location['lat']}&lon={location['lon']}&appid={API_KEY}&units=metric"
    try:
        response = requests.get(url)
        response.raise_for_status()
        data = response.json()
        return data  # Return the current weather data
    except requests.exceptions.RequestException as e:
        print(f"Error fetching weather data: {e}")
        return None

def check_weather_alerts(weather_data):
    """Check weather conditions against thresholds and return alerts."""
    alerts = []
    
    # Extract weather data
    temp = weather_data['main']['temp']
    humidity = weather_data['main']['humidity']
    wind_speed = weather_data['wind']['speed']
    weather_condition = weather_data['weather'][0]['main']
    
    # Check each threshold
    for alert_type, threshold_data in WEATHER_ALERT_THRESHOLDS.items():
        if threshold_data['condition'] == 'Temperature':
            if temp >= threshold_data['threshold']:
                alerts.append({
                    'type': 'high_temperature',
                    'message': threshold_data['message'],
                    'value': temp
                })
            elif temp <= threshold_data['threshold']:
                alerts.append({
                    'type': 'low_temperature',
                    'message': threshold_data['message'],
                    'value': temp
                })
        elif threshold_data['condition'] == 'Humidity':
            if humidity >= threshold_data['threshold']:
                alerts.append({
                    'type': 'high_humidity',
                    'message': threshold_data['message'],
                    'value': humidity
                })
        elif threshold_data['condition'] == 'Wind':
            if wind_speed >= threshold_data['threshold']:
                alerts.append({
                    'type': 'strong_wind',
                    'message': threshold_data['message'],
                    'value': wind_speed
                })
        elif threshold_data['condition'] == 'Rain':
            if weather_condition == 'Rain':
                # Note: OpenWeatherMap free API doesn't provide rain volume
                alerts.append({
                    'type': 'heavy_rain',
                    'message': threshold_data['message'],
                    'value': weather_condition
                })
    
    return alerts

def fetch_weather_alerts():
    """Background thread to fetch and emit weather data and alerts."""
    if not API_KEY:
        print("OpenWeatherMap API key is missing.")
        return

    while True:
        # Get all users from the database
        conn = sqlite3.connect('PocketFarm.db')
        cursor = conn.cursor()
        cursor.execute("SELECT id, location_latitude, location_longitude FROM users")
        users = cursor.fetchall()
        conn.close()

        for user in users:
            user_id, lat, lon = user
            location = {'lat': lat, 'lon': lon}
            
            weather_data = get_weather_alerts(location)
            if weather_data:
                # Check for weather alerts
                alerts = check_weather_alerts(weather_data)
                
                # Emit both weather data and alerts to specific user
                socketio.emit('weather_update', {
                    'weather_data': weather_data,
                    'alerts': alerts,
                    'user_id': user_id
                }, room=f'user_{user_id}')
                
                # If there are alerts, create notifications and emit them
                if alerts:
                    # Create notifications in the database
                    conn = sqlite3.connect('PocketFarm.db')
                    cursor = conn.cursor()
                    for alert in alerts:
                        cursor.execute("""
                            INSERT INTO notifications (user_id, message)
                            VALUES (?, ?)
                        """, (user_id, alert['message']))
                    conn.commit()
                    conn.close()
                    
                    # Emit alerts for immediate notification
                    socketio.emit('weather_alert', alerts, room=f'user_{user_id}')
        
        time.sleep(1800)  # Check every 30 minutes

@lru_cache(maxsize=1000)
def cached_geocode(latitude, longitude, service="openweathermap"):
    """
    Fetch geocode data from OpenWeatherMap (primary) or Nominatim (fallback).
    Caches results to avoid hitting API rate limits.
    """
    headers = {"User-Agent": "PocketFarm/1.0 (contact: arjunsanthosh11b2@gmail.com)"}

    if service == "openweathermap" and API_KEY:
        # Use OpenWeatherMap Geocoding API
        url = f"http://api.openweathermap.org/geo/1.0/reverse?lat={latitude}&lon={longitude}&limit=1&appid={API_KEY}"
        try:
            response = requests.get(url, headers=headers)
            response.raise_for_status()
            data = response.json()
            if data and len(data) > 0:
                return {"source": "openweathermap", "data": data[0]}
        except requests.exceptions.RequestException as e:
            print(f"OpenWeatherMap geocoding failed: {e}")

    # Fallback to Nominatim if OpenWeatherMap fails or no API key
    url = f"https://nominatim.openstreetmap.org/reverse?format=json&lat={latitude}&lon={longitude}&zoom=18&addressdetails=1"
    try:
        response = requests.get(url, headers=headers)
        response.raise_for_status()
        return {"source": "nominatim", "data": response.json()}
    except requests.exceptions.RequestException as e:
        raise Exception(f"Geocoding failed: {e}")

@app.route('/geocode', methods=['POST'])
def geocode():
    """
    Reverse geocode latitude and longitude to get city, state, and country.
    Uses OpenWeatherMap as primary service with Nominatim fallback.
    """
    try:
        data = request.get_json()
        latitude = data['latitude']
        longitude = data['longitude']

        # Fetch geocode data (cached)
        result = cached_geocode(latitude, longitude, service="openweathermap")
        source = result["source"]
        geocode_data = result["data"]

        if source == "openweathermap":
            # Extract details from OpenWeatherMap response
            city = geocode_data.get('name', 'Unknown City')
            state = geocode_data.get('state', 'Unknown State')
            country = geocode_data.get('country', 'Unknown Country')
        else:
            # Extract details from Nominatim response
            address = geocode_data.get('address', {})
            city = address.get('city') or address.get('town') or address.get('village') or 'Unknown City'
            state = address.get('state') or 'Unknown State'
            country = address.get('country') or 'Unknown Country'

        # Log the result for debugging
        print(f"Geocoded {latitude}, {longitude} using {source}: {city}, {state}, {country}")

        return jsonify({
            'city': city,
            'state': state,
            'country': country,
        })
    except KeyError as e:
        return jsonify({'error': f"Missing required field: {str(e)}"}), 400
    except Exception as e:
        return jsonify({'error': str(e)}), 500
    
@app.route('/response', methods=['POST'])
def handle_response():
    """Handle user response for watering."""
    try:
        data = request.get_json()
        device_token = data['device_token']
        response = data['response']  # 'yes' or 'no'

        # Connect to the database
        conn = sqlite3.connect('PocketFarm.db')
        cursor = conn.cursor()

        current_date = time.strftime('%Y-%m-%d')

        if response.lower() == 'yes':
            # Update last watered date and set next watering date (e.g., 7 days later)
            next_watering_date = time.strftime('%Y-%m-%d', time.localtime(time.time() + 7 * 86400))  # 7 days later
            cursor.execute("UPDATE users SET last_watered_date=?, next_watering_date=? WHERE device_token=?", 
                          (current_date, next_watering_date, device_token))
        elif response.lower() == 'no':
            # Set the next watering date to the current date
            cursor.execute("UPDATE users SET next_watering_date=? WHERE device_token=?", 
                          (current_date, device_token))

        conn.commit()
        conn.close()

        return jsonify({'message': 'Response recorded successfully!'}), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/predict', methods=['POST'])
def predict():
    """Predict crops based on environmental factors."""
    try:
        data = request.get_json()
        
        # Extract features from the incoming JSON data
        sunlight = data['sunlight']
        water_needs = data['water_needs']
        avg_temp = data['avg_temp']
        avg_humidity = data['avg_humidity']
        avg_area = data['avg_area']
        current_month = data['current_month']
        
        # Ensure water_needs and sunlight match the case in crop.csv
        water_needs = water_needs.capitalize()  # Convert to capitalized form (e.g., 'medium' -> 'Medium')
        sunlight = sunlight.capitalize()  # Convert to capitalized form (e.g., 'full' -> 'Full')
        
        # Call the recommend_crops function from crops.py
        result = recommend_crops(sunlight, water_needs, avg_temp, avg_humidity, avg_area, current_month)
        
        return jsonify(result)
    except KeyError as e:
        return jsonify({'error': f'Missing feature: {str(e)}'}), 400
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@app.route('/recommend', methods=['POST'])
def recommend():
    try:
        data = request.get_json()
        
        # Extract features from the incoming JSON data
        location = data['location']  # User's location (city name)
        sunlight = data['sunlight']
        water_needs = data['water_needs']
        area = data['avg_area']
        include_companions = data.get('include_companions', False)
        
        # Ensure water_needs and sunlight match the case in crop.csv
        water_needs = water_needs.capitalize()  # Convert to capitalized form (e.g., 'medium' -> 'Medium')
        sunlight = sunlight.capitalize()  # Convert to capitalized form (e.g., 'full' -> 'Full')
        
        # Fetch weather data for the user's location
        weather_data = get_weather_data(location)
        if weather_data is None:
            return jsonify({'error': 'Could not fetch weather data.'}), 500
        
        # Extract temperature and humidity from the weather data
        avg_temp = weather_data['main']['temp']
        avg_humidity = weather_data['main']['humidity']
        current_month = time.strftime('%b')  # Use current month dynamically
        
        # Call the recommend_crops function with actual weather data
        recommended_crops = recommend_crops(sunlight, water_needs, avg_temp, avg_humidity, area, current_month)
        
        # Connect to the SQLite database
        conn = sqlite3.connect('PocketFarm.db')
        cursor = conn.cursor()

        # Prepare a list to hold crop details
        crops_with_details = []

        # Fetch details for each recommended crop
        for crop in recommended_crops['Crops']:
            crop_name = crop['Crop']
            cursor.execute("SELECT * FROM crops WHERE name = ?", (crop_name,))
            crop_details = cursor.fetchone()
            if crop_details:
                detailed_info = {
                    'id': crop_details[0],
                    'name': crop_details[1],
                    'imageURL': crop_details[2],
                    'scientific_name': crop_details[3],
                    'description': crop_details[4],
                    'origin': crop_details[5],
                    'growing_conditions': crop_details[6],
                    'planting_info': crop_details[7],
                    'care_instructions': crop_details[8],
                    'storage_info': crop_details[9],
                    'nutritional_info': crop_details[10],
                    'culinary_info': crop_details[11],
                    'recommended_info': crop
                }

                # Fetch companion crop names if requested
                if include_companions:
                    companion_crops = []
                    companion_crop_1 = crop['Companion Crop 1']
                    companion_crop_2 = crop['Companion Crop 2']

                    for companion in [companion_crop_1, companion_crop_2]:
                        if companion:
                            companion_crops.append(companion)

                    detailed_info['companion_crops'] = companion_crops

                crops_with_details.append(detailed_info)

        conn.close()
        return jsonify(crops_with_details)
    except KeyError as e:
        return jsonify({'error': f'Missing feature: {str(e)}'}), 400
    except Exception as e:
        return jsonify({'error': str(e)}), 500

    

@app.route('/crop/<crop_name>', methods=['GET'])
def get_crop_details(crop_name):
    """Get details for a specific crop."""
    try:
        conn = sqlite3.connect('PocketFarm.db')
        cursor = conn.cursor()
        crop_name=crop_name.capitalize()
        cursor.execute("SELECT * FROM crops WHERE name = ?", (crop_name,))
        crop = cursor.fetchone()

        conn.close()

        if crop is None:
            return jsonify({'error': 'Crop not found.'}), 404

        crop_details = {
            'id': crop[0],
            'name': crop[1],
            'imageURL': crop[2],
            'scientific_name': crop[3],
            'description': crop[4],
            'origin': crop[5],
            'growing_conditions': crop[6],
            'planting_info': crop[7],
            'care_instructions': crop[8],
            'storage_info': crop[9],
            'nutritional_info': crop[10],
            'culinary_info': crop[11]
        }

        return jsonify(crop_details)
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@app.route('/add_to_library', methods=['POST'])
def add_to_library():
    try:
        data = request.get_json()
        if not data:
            return jsonify({'error': 'No data provided in the request'}), 400

        user_id = data.get('user_id')
        crop_name = data.get('crop_name')

        if not user_id or not crop_name:
            return jsonify({'error': 'Missing required fields: user_id or crop_name'}), 400

        # Connect to the database
        conn = sqlite3.connect('PocketFarm.db')
        cursor = conn.cursor()

        # Check if the crop exists in the crops table
        cursor.execute("SELECT id FROM crops WHERE name = ?", (crop_name,))
        crop = cursor.fetchone()
        if not crop:
            conn.close()
            return jsonify({'error': f'Crop "{crop_name}" not found in the database'}), 404

        # Check if the user exists
        cursor.execute("SELECT id FROM users WHERE id = ?", (user_id,))
        user = cursor.fetchone()
        if not user:
            conn.close()
            return jsonify({'error': f'User with id "{user_id}" not found'}), 404

        # Check if the crop is already in the user's library
        cursor.execute("SELECT * FROM user_crops WHERE user_id = ? AND crop_id = ?", (user_id, crop[0]))
        existing_entry = cursor.fetchone()
        if existing_entry:
            conn.close()
            return jsonify({'message': 'Crop is already in your library!'}), 200

        # Insert the crop into the user's library
        cursor.execute("INSERT INTO user_crops (user_id, crop_id) VALUES (?, ?)", (user_id, crop[0]))

        conn.commit()
        conn.close()

        return jsonify({'message': 'Crop added to library successfully!'}), 200
    except sqlite3.Error as e:
        print(f"Database error: {e}")
        return jsonify({'error': 'Database error occurred'}), 500
    except Exception as e:
        print(f"Unexpected error: {e}")
        return jsonify({'error': str(e)}), 500
    

@app.route('/get_user_crops', methods=['GET'])
def get_user_crops():
    try:
        # Extract user_id from the Authorization header
        auth_header = request.headers.get('Authorization')
        if not auth_header or not auth_header.startswith('Bearer '):
            return jsonify({'error': 'Authorization header is missing or invalid'}), 401

        user_id = auth_header.split(' ')[1]  # Extract user_id from the token

        # Connect to the database
        conn = sqlite3.connect('PocketFarm.db')
        cursor = conn.cursor()

        # Fetch the crops added by the user
        cursor.execute(
            "SELECT crops.name FROM user_crops JOIN crops ON user_crops.crop_id = crops.id WHERE user_crops.user_id = ?",
            (user_id,)
        )
        crops = cursor.fetchall()

        conn.close()

        # Format the response
        crop_list = [crop[0] for crop in crops]
        return jsonify(crop_list), 200
    except sqlite3.Error as e:
        print(f"Database error: {e}")
        return jsonify({'error': 'Database error occurred'}), 500
    except Exception as e:
        print(f"Unexpected error: {e}")
        return jsonify({'error': str(e)}), 500



@app.route('/signup', methods=['POST'])
def signup():
    try:
        data = request.get_json()
        name = data.get('name')
        email = data.get('email')
        password = data.get('password')  # Plain text password from the frontend
        phone = data.get('phone')
        location = data.get('location')  # { latitude, longitude }

        if not name or not email or not password:
            return jsonify({'error': 'Missing required fields: name, email, or password'}), 400

        # Hash the password
        hashed_password = bcrypt.hashpw(password.encode('utf-8'), bcrypt.gensalt())

        # Geocode the location to get city, state, and country
        geocode_result = cached_geocode(location['latitude'], location['longitude'])
        city = geocode_result['data'].get('city', 'Unknown')
        state = geocode_result['data'].get('state', 'Unknown')
        country = geocode_result['data'].get('country', 'Unknown')

        # Insert the user into the database
        conn = sqlite3.connect('PocketFarm.db')
        cursor = conn.cursor()
        cursor.execute(
            "INSERT INTO users (name, email, password, phone, location_city, location_state, location_country, location_latitude, location_longitude) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)",
            (name, email, hashed_password, phone, city, state, country, location['latitude'], location['longitude'])
        )
        user_id = cursor.lastrowid
        conn.commit()
        conn.close()

        # Return the user data including location
        return jsonify({
            'id': user_id,
            'name': name,
            'email': email,
            'phone': phone,
            'location': {
                'city': city,
                'state': state,
                'country': country,
                'latitude': location['latitude'],
                'longitude': location['longitude'],
            }
        }), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500
@app.route('/login', methods=['POST'])
def login():
    try:
        data = request.get_json()
        email = data.get('email')
        password = data.get('password')

        if not email or not password:
            return jsonify({'error': 'Missing required fields: email or password'}), 400

        # Fetch the user from the database
        conn = sqlite3.connect('PocketFarm.db')
        cursor = conn.cursor()
        cursor.execute("SELECT * FROM users WHERE email = ?", (email,))
        user = cursor.fetchone()
        conn.close()

        if not user:
            return jsonify({'error': 'User not found'}), 404

        # Verify the password
        hashed_password = user[3]  # Password is stored in the 4th column
        if not bcrypt.checkpw(password.encode('utf-8'), hashed_password):
            return jsonify({'error': 'Invalid password'}), 401

        # Join the user's socket room for weather updates
        socketio.emit('join_room', {'room': f'user_{user[0]}'})

        # Return the user data including location
        return jsonify({
            'id': user[0],
            'name': user[1],
            'email': user[2],
            'phone': user[4],
            'location': {
                'city': user[5],
                'state': user[6],
                'country': user[7],
                'latitude': user[8],
                'longitude': user[9],
            }
        }), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@socketio.on('join_room')
def on_join(data):
    """Handle socket room joining."""
    room = data['room']
    join_room(room)
    print(f"Client joined room: {room}")

@socketio.on('disconnect')
def on_disconnect():
    """Handle socket disconnection."""
    print("Client disconnected")

@app.route('/weather', methods=['POST'])
def get_weather():
    """Fetch weather data for a specific location."""
    try:
        data = request.get_json()
        location = data.get('location')  # Location can be a city name or coordinates

        if not location:
            return jsonify({'error': 'Location is required'}), 400

        # Fetch weather data from OpenWeatherMap API
        weather_data = get_weather_data(location)
        if not weather_data:
            return jsonify({'error': 'Failed to fetch weather data'}), 500

        # Extract relevant weather information
        weather_info = {
            'temp': weather_data['main']['temp'],
            'condition': weather_data['weather'][0]['main'],
            'humidity': weather_data['main']['humidity'],
            'wind_speed': weather_data['wind']['speed'],
            'icon': weather_data['weather'][0]['icon'],  # Weather icon code
        }

        return jsonify(weather_info), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/remove_from_garden', methods=['POST'])
def remove_from_garden():
    try:
        data = request.get_json()
        user_id = data.get('user_id')
        crop_name = data.get('crop_name')

        if not user_id or not crop_name:
            return jsonify({'error': 'Missing required fields: user_id or crop_name'}), 400

        # Connect to the database
        conn = sqlite3.connect('PocketFarm.db')
        cursor = conn.cursor()

        # Fetch the crop ID
        cursor.execute("SELECT id FROM crops WHERE name = ?", (crop_name,))
        crop = cursor.fetchone()
        if not crop:
            conn.close()
            return jsonify({'error': f'Crop "{crop_name}" not found in the database'}), 404

        # Delete the crop from the user's garden
        cursor.execute("DELETE FROM user_crops WHERE user_id = ? AND crop_id = ?", (user_id, crop[0]))
        conn.commit()
        conn.close()

        return jsonify({'message': 'Crop removed from garden successfully!'}), 200
    except sqlite3.Error as e:
        print(f"Database error: {e}")
        return jsonify({'error': 'Database error occurred'}), 500
    except Exception as e:
        print(f"Unexpected error: {e}")
        return jsonify({'error': str(e)}), 500   
    

@app.route('/user_schedule/<int:user_id>', methods=['GET'])
def get_user_schedules(user_id):
    try:
        conn = get_db()
        cursor = conn.cursor()

        # Fetch all schedules for the user with crop details
        cursor.execute('''
            SELECT 
                c.name,
                c.imageURL,
                ws.last_watered,
                ws.next_watering,
                cs.growing_time,
                cs.watering_frequency,
                cs.fertilization_schedule
            FROM watering_schedules ws
            JOIN crops c ON ws.crop_id = c.id
            JOIN crop_schedule cs ON c.name = cs.crop_name
            WHERE ws.user_id = ?
        ''', (user_id,))
        schedules = cursor.fetchall()

        conn.close()

        # Format the response
        schedule_list = [dict(schedule) for schedule in schedules]
        return jsonify(schedule_list), 200
    except Exception as e:
        print(f"Error fetching user schedules: {str(e)}")  # Add logging
        return jsonify({'error': str(e)}), 500

@app.route('/notifications/<int:user_id>', methods=['GET'])
def get_user_notifications(user_id):
    try:
        print(f"Fetching notifications for user {user_id}")  # Debug log
        conn = get_db()
        cursor = conn.cursor()

        # Get notifications from the database
        cursor.execute("""
            SELECT id, message, timestamp, read_status 
            FROM notifications 
            WHERE user_id = ? 
            ORDER BY timestamp DESC
        """, (user_id,))
        notifications = cursor.fetchall()
        print(f"Found {len(notifications) if notifications else 0} notifications")  # Debug log

        # Format notifications
        formatted_notifications = [{
            'id': notification[0],
            'message': notification[1],
            'timestamp': notification[2],
            'read': bool(notification[3])  # Map read_status to read
        } for notification in notifications]

        print(f"Returning formatted notifications: {formatted_notifications}")  # Debug log
        return jsonify(formatted_notifications)
    except Exception as e:
        print(f"Error fetching notifications: {str(e)}")
        return jsonify({'error': 'Failed to fetch notifications'}), 500

def create_notification(user_id, message):
    """Helper function to create a notification for a user."""
    try:
        conn = get_db()
        cursor = conn.cursor()
        cursor.execute("""
            INSERT INTO notifications (user_id, message)
            VALUES (?, ?)
        """, (user_id, message))
        conn.commit()
        conn.close()
    except Exception as e:
        print(f"Error creating notification: {str(e)}")

@app.route('/notifications/<int:user_id>/read', methods=['POST'])
def mark_notifications_read(user_id):
    try:
        conn = get_db()
        cursor = conn.cursor()
        
        # Update all notifications for the user to read status
        cursor.execute("""
            UPDATE notifications 
            SET read_status = 1 
            WHERE user_id = ? AND read_status = 0
        """, (user_id,))
        
        conn.commit()
        conn.close()
        
        return jsonify({'message': 'Notifications marked as read'}), 200
    except Exception as e:
        print(f"Error marking notifications as read: {str(e)}")
        return jsonify({'error': 'Failed to mark notifications as read'}), 500

@app.route('/nurseries', methods=['GET'])
def get_nurseries():
    try:
        # Get query parameters for filtering
        location = request.args.get('location', 'Kochi')
        specialty = request.args.get('specialty')
        
        # Connect to the database
        conn = sqlite3.connect('PocketFarm.db')
        cursor = conn.cursor()
        
        # Base query
        query = """
            SELECT 
                id,
                name,
                address,
                phone,
                hours,
                specialties,
                rating,
                location,
                website,
                description
            FROM nurseries
            WHERE location = ?
        """
        params = [location]
        
        # Add specialty filter if provided
        if specialty:
            query += " AND specialties LIKE ?"
            params.append(f"%{specialty}%")
        
        cursor.execute(query, params)
        nurseries = cursor.fetchall()
        
        # Format the response
        formatted_nurseries = []
        for nursery in nurseries:
            formatted_nurseries.append({
                'id': nursery[0],
                'name': nursery[1],
                'address': nursery[2],
                'phone': nursery[3],
                'hours': nursery[4],
                'specialties': nursery[5].split(','),
                'rating': nursery[6],
                'location': nursery[7],
                'website': nursery[8],
                'description': nursery[9]
            })
        
        conn.close()
        return jsonify(formatted_nurseries)
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/nearby-nurseries', methods=['GET'])
def get_nearby_nurseries():
    try:
        # Get location parameters
        latitude = request.args.get('latitude')
        longitude = request.args.get('longitude')
        radius = request.args.get('radius', '5000')  # Default 5km radius

        if not latitude or not longitude:
            return jsonify({'error': 'Latitude and longitude are required'}), 400

        # Google Places API endpoint
        url = "https://maps.googleapis.com/maps/api/place/nearbysearch/json"
        
        # Parameters for the API request
        params = {
            'location': f"{latitude},{longitude}",
            'radius': radius,
            'type': 'garden_center',
            'key': os.getenv('GOOGLE_PLACES_API_KEY')
        }

        # Make the API request
        response = requests.get(url, params=params)
        response.raise_for_status()
        data = response.json()

        if data['status'] != 'OK':
            return jsonify({'error': f"Places API error: {data['status']}"}), 500

        # Format the response
        nurseries = []
        for place in data['results']:
            # Get detailed place information
            place_id = place['place_id']
            details_url = "https://maps.googleapis.com/maps/api/place/details/json"
            details_params = {
                'place_id': place_id,
                'fields': 'opening_hours,formatted_phone_number,website,rating,reviews',
                'key': os.getenv('GOOGLE_PLACES_API_KEY')
            }
            
            details_response = requests.get(details_url, params=details_params)
            details_data = details_response.json()

            nursery = {
                'id': place_id,
                'name': place['name'],
                'address': place['vicinity'],
                'location': {
                    'lat': place['geometry']['location']['lat'],
                    'lng': place['geometry']['location']['lng']
                },
                'rating': place.get('rating', 0),
                'total_ratings': place.get('user_ratings_total', 0),
                'phone': details_data.get('result', {}).get('formatted_phone_number', 'N/A'),
                'website': details_data.get('result', {}).get('website', 'N/A'),
                'hours': details_data.get('result', {}).get('opening_hours', {}).get('weekday_text', []),
                'reviews': details_data.get('result', {}).get('reviews', [])
            }
            nurseries.append(nursery)

        return jsonify(nurseries)

    except requests.exceptions.RequestException as e:
        return jsonify({'error': f'API request failed: {str(e)}'}), 500
    except Exception as e:
        return jsonify({'error': str(e)}), 500

if __name__ == '__main__':
    # Start the background thread to fetch weather data
    threading.Thread(target=fetch_weather_alerts, daemon=True).start()
    
    # Run the Flask app with SocketIO
    socketio.run(app, debug=True)
