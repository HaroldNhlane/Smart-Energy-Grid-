# grid/admin.py

from django.contrib import admin
from .models import Device, SensorData, Alert

admin.site.register(Device)
admin.site.register(SensorData)
admin.site.register(Alert)