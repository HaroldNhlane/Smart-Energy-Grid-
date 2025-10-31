# grid/views.py

from rest_framework import viewsets
from .models import Device, SensorData, Alert
from .serializers import DeviceSerializer, SensorDataSerializer, AlertSerializer

class DeviceViewSet(viewsets.ModelViewSet):
    queryset = Device.objects.all()
    serializer_class = DeviceSerializer

# ViewSet for the SensorData model
class SensorDataViewSet(viewsets.ModelViewSet):
    queryset = SensorData.objects.all()
    serializer_class = SensorDataSerializer

# ViewSet for the Alert model
class AlertViewSet(viewsets.ModelViewSet):
    queryset = Alert.objects.all()
    serializer_class = AlertSerializer