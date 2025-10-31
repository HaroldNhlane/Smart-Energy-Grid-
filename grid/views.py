# grid/views.py
from rest_framework import viewsets, permissions
from rest_framework.response import Response
from rest_framework import status
from .models import Device, SensorData, Alert
from .serializers import DeviceSerializer, SensorDataSerializer, AlertSerializer

class DeviceViewSet(viewsets.ModelViewSet):
    queryset = Device.objects.all()
    serializer_class = DeviceSerializer
    permission_classes = [permissions.AllowAny]  # Add this line

class SensorDataViewSet(viewsets.ModelViewSet):
    queryset = SensorData.objects.all().order_by('-timestamp')
    serializer_class = SensorDataSerializer
    permission_classes = [permissions.AllowAny]  # Add this line

class AlertViewSet(viewsets.ModelViewSet):
    queryset = Alert.objects.all().order_by('-timestamp')
    serializer_class = AlertSerializer
    permission_classes = [permissions.AllowAny]  # Add this line

    def get_queryset(self):
        # Return only recent alerts, newest first
        return Alert.objects.all().order_by('-timestamp')[:50]