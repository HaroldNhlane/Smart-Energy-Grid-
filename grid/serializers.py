# grid/serializers.py
from rest_framework import serializers
from .models import Device, SensorData, Alert

class DeviceSerializer(serializers.ModelSerializer):
    class Meta:
        model = Device
        fields = '__all__'

class SensorDataSerializer(serializers.ModelSerializer):
    device_name = serializers.CharField(source='device.name', read_only=True)

    class Meta:
        model = SensorData
        fields = ['id', 'device', 'device_name', 'current', 'temperature', 'vibration', 'voltage', 'timestamp']

class AlertSerializer(serializers.ModelSerializer):
    device_name = serializers.CharField(source='device.name', read_only=True)
    device_id = serializers.IntegerField(source='device.id', read_only=True)

    class Meta:
        model = Alert
        fields = ['id', 'message', 'timestamp', 'alert_type', 'device', 'device_name', 'device_id', 'severity']