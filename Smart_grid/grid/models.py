from django.db import models
from django.contrib.auth.models import User

# The Device model represents the physical appliances in the grid,
# such as motors and LEDs.
class Device(models.Model):
    name = models.CharField(max_length=100)
    priority = models.IntegerField(default=1)  # Default priority is 1
    status = models.CharField(max_length=50, default='disconnected')
    user = models.ForeignKey(User, on_delete=models.CASCADE)

    def __str__(self):
        return self.name

# The SensorData model now stores all readings in a single record
class SensorData(models.Model):
    timestamp = models.DateTimeField(auto_now_add=True)
    current = models.FloatField(null=True)
    temperature = models.FloatField(null=True)
    vibration = models.FloatField(null=True)
    voltage = models.FloatField(null=True)
    device = models.ForeignKey(Device, on_delete=models.CASCADE)

    def __str__(self):
        return f"Data from {self.device.name} at {self.timestamp}"

# The Alert model is for notifications about grid anomalies.
class Alert(models.Model):
    message = models.CharField(max_length=255)
    timestamp = models.DateTimeField(auto_now_add=True)
    alert_type = models.CharField(max_length=50) # e.g., 'Overloading', 'Power Disconnect'
    device = models.ForeignKey(Device, on_delete=models.CASCADE)

    def __str__(self):
        return f"{self.alert_type} on {self.device.name} - {self.message}"