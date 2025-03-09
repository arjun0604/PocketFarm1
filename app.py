from flask import Flask, request, jsonify
import requests
import sqlite3
from crops import recommend_crops  # Ensure crops.py exists and contains recommend_crops
from flask_socketio import SocketIO
import time
import threading
import os
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

app = Flask(__name__)
socketio = SocketIO(app)

# Use environment variable for API key
API_KEY = os.getenv("OPENWEATHERMAP_API_KEY")
if not API_KEY:
    raise ValueError("OpenWeatherMap API key is missing. Set OPENWEATHERMAP_API_KEY in .env file.")

def get_weather_data(location):
    """Fetch weather data from OpenWeatherMap API."""
    if not API_KEY:
        return None

    url = f"http://api.openweathermap.org/data/2.5/weather?q={location}&appid={API_KEY}&units=metric"
    
    try:
        response = requests.get(url)
        response.raise_for_status()  # Raise an error for bad responses
        return response.json()
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

def fetch_weather_alerts():
    """Background thread to fetch and emit weather data (no alerts in free plan)."""
    if not API_KEY:
        print("OpenWeatherMap API key is missing.")
        return

    # Example location coordinates for Kochi, India
    location = {'lat': 9.9312, 'lon': 76.2673}
    while True:
        weather_data = get_weather_alerts(location)
        if weather_data:
            # Emit general weather data instead of alerts
            socketio.emit('weather_update', weather_data)
        time.sleep(600)  # Check every 10 minutes

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
    """Recommend crops based on location and weather data."""
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

                # Fetch companion crop details if requested
                if include_companions:
                    companion_crops = []
                    companion_crop_1 = crop['Companion Crop 1']
                    companion_crop_2 = crop['Companion Crop 2']

                    for companion in [companion_crop_1, companion_crop_2]:
                        if companion:
                            cursor.execute("SELECT * FROM crops WHERE name = ?", (companion,))
                            companion_details = cursor.fetchone()
                            if companion_details:
                                companion_info = {
                                    'name': companion_details[1],
                                    'growing_conditions': companion_details[6],
                                    'water_needs': companion_details[9],
                                    'sunlight': companion_details[8]
                                }
                                companion_crops.append(companion_info)

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

if __name__ == '__main__':
    # Start the background thread to fetch weather data
    threading.Thread(target=fetch_weather_alerts, daemon=True).start()
    
    # Run the Flask app with SocketIO
    socketio.run(app, debug=False)
