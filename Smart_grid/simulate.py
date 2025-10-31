import requests
import time
import random
from datetime import datetime

# The new API endpoint to receive a single, comprehensive data object
API_URL = "http://127.0.0.1:8000/api/sensordata/"

# Device ID to associate with the sensor data
DEVICE_ID = 1

def send_data(sensor_readings):
    """
    Sends a single comprehensive sensor data object to the API.
    """
    data = {
        "device": DEVICE_ID,
        "timestamp": datetime.now().isoformat(),
        "current": sensor_readings["current"],
        "temperature": sensor_readings["temperature"],
        "vibration": sensor_readings["vibration"],
        "voltage": sensor_readings["voltage"],
    }
    try:
        response = requests.post(API_URL, json=data)
        if response.status_code == 201:
            print("Successfully sent all sensor data for one timestamp.")
        else:
            print(f"Failed to send data. Status code: {response.status_code}, Response: {response.text}")
    except requests.exceptions.RequestException as e:
        print(f"Request failed: {e}")

def generate_random_sensor_data():
    """
    Generates a realistic range of random sensor data.
    """
    return {
        "current": round(random.uniform(0.1, 5.0), 3),
        "temperature": round(random.uniform(25.0, 40.0), 2),
        "vibration": round(random.uniform(0.01, 1.5), 2),
        "voltage": round(random.uniform(220.0, 240.0), 2),
    }

if __name__ == "__main__":
    while True:
        sensor_readings = generate_random_sensor_data()
        send_data(sensor_readings)
        time.sleep(5) # Wait for 5 seconds before sending the next batch