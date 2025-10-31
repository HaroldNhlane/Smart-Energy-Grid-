# grid/urls.py

from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import DeviceViewSet, SensorDataViewSet, AlertViewSet

# Create a router and register the ViewSets.
router = DefaultRouter()
router.register(r'devices', DeviceViewSet)
router.register(r'sensordata', SensorDataViewSet)
router.register(r'alerts', AlertViewSet)

urlpatterns = [
    path('', include(router.urls)),
]