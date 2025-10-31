# grid/models.py
from django.db import models
from django.contrib.auth.models import User

class Device(models.Model):
    name = models.CharField(max_length=100)
    priority = models.IntegerField(default=1)
    status = models.CharField(max_length=50, default='disconnected')
    user = models.ForeignKey(User, on_delete=models.CASCADE)

    def __str__(self):
        return self.name

class SensorData(models.Model):
    timestamp = models.DateTimeField(auto_now_add=True)
    current = models.FloatField(null=True)
    temperature = models.FloatField(null=True)
    vibration = models.FloatField(null=True)
    voltage = models.FloatField(null=True)
    device = models.ForeignKey(Device, on_delete=models.CASCADE)

    def __str__(self):
        return f"Data from {self.device.name} at {self.timestamp}"

class Alert(models.Model):
    SEVERITY_CHOICES = [
        ('info', 'Info'),
        ('warning', 'Warning'),
        ('critical', 'Critical'),
    ]
    
    message = models.CharField(max_length=255)
    timestamp = models.DateTimeField(auto_now_add=True)
    alert_type = models.CharField(max_length=50)  # e.g., 'Overheating', 'Power Disconnect'
    device = models.ForeignKey(Device, on_delete=models.CASCADE)
    severity = models.CharField(max_length=20, choices=SEVERITY_CHOICES, default='info')  # ADD THIS FIELD

    def __str__(self):
        return f"{self.alert_type} on {self.device.name} - {self.message}"

    class Meta:
        ordering = ['-timestamp']  # Newest first by default