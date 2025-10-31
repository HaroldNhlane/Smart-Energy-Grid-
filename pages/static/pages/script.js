// Function to get CSRF token for Django POST requests
function getCSRFToken() {
    const name = 'csrftoken';
    let cookieValue = null;
    if (document.cookie && document.cookie !== '') {
        const cookies = document.cookie.split(';');
        for (let i = 0; i < cookies.length; i++) {
            const cookie = cookies[i].trim();
            if (cookie.substring(0, name.length + 1) === (name + '=')) {
                cookieValue = decodeURIComponent(cookie.substring(name.length + 1));
                break;
            }
        }
    }
    return cookieValue;
}

// Function to fetch with retry logic
async function fetchWithRetry(url, retries = 3) {
    for (let i = 0; i < retries; i++) {
        try {
            const response = await fetch(url);
            if (response.ok) return await response.json();
            
            if (i === retries - 1) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
        } catch (error) {
            if (i === retries - 1) throw error;
            await new Promise(resolve => setTimeout(resolve, 1000 * (i + 1)));
        }
    }
    return [];
}

// Function to fetch and process sensor data from the live Django API
async function fetchData() {
    try {
        console.log("📡 Fetching sensor data from /api/sensordata/");
        const data = await fetchWithRetry('/api/sensordata/');
        console.log("✅ Sensor data fetched successfully. Records:", data.length);
        return validateSensorData(data);
    } catch (error) {
        console.error("❌ Could not fetch sensor data:", error);
        updateConnectionStatus(false);
        return [];
    }
}

// Function to fetch and process alerts from the Django API
async function fetchAlerts() {
    try {
        console.log("📡 Fetching alerts from /api/alerts/");
        const data = await fetchWithRetry('/api/alerts/');
        console.log("✅ Alerts fetched successfully. Count:", data.length);
        
        // DEBUG: Check the actual data structure
        debugAlerts(data);
        
        updateConnectionStatus(true);
        return data;
    } catch (error) {
        console.error("❌ Could not fetch alerts:", error);
        updateConnectionStatus(false);
        return [];
    }
}

// Function to validate sensor data
function validateSensorData(data) {
    if (!Array.isArray(data)) return [];
    
    return data.filter(item => 
        item &&
        item.timestamp &&
        // Validate temperature
        item.temperature !== null && 
        item.temperature !== undefined &&
        !isNaN(item.temperature) &&
        item.temperature >= -50 && 
        item.temperature <= 150 &&
        // Validate current if present
        (item.current === null || item.current === undefined || 
         (!isNaN(item.current) && item.current >= 0 && item.current <= 100)) &&
        // Validate vibration if present
        (item.vibration === null || item.vibration === undefined || 
         (!isNaN(item.vibration) && item.vibration >= 0 && item.vibration <= 50)) &&
        // Validate voltage if present
        (item.voltage === null || item.voltage === undefined || 
         (!isNaN(item.voltage) && item.voltage >= 0 && item.voltage <= 500))
    );
}

// Function to post a new alert back to the Django API
async function postAlert(message, severity, latestData, alertType = null) {
    try {
        console.log("🚨 Attempting to post alert:", message);
        
        // Determine alert_type from message if not provided
        let determinedAlertType = alertType;
        if (!determinedAlertType) {
            if (message.includes('Temperature') || message.includes('temperature')) {
                determinedAlertType = 'Overheating';
            } else if (message.includes('Current') || message.includes('current')) {
                determinedAlertType = 'High Current';
            } else if (message.includes('Vibration') || message.includes('vibration')) {
                determinedAlertType = 'High Vibration';
            } else if (message.includes('Voltage') || message.includes('voltage')) {
                determinedAlertType = 'Voltage Anomaly';
            } else {
                determinedAlertType = 'System Alert';
            }
        }

        const alertData = {
            message: message,
            alert_type: determinedAlertType,
            // Note: severity field is commented out until added to Django model
            // severity: severity,
            device: latestData.device || latestData.device_id || 1, // Use device ID
        };

        console.log("📦 Alert data being sent:", alertData);

        const response = await fetch('/api/alerts/', { 
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-CSRFToken': getCSRFToken()
            },
            body: JSON.stringify(alertData),
        });

        console.log("📨 POST response status:", response.status);
        
        if (!response.ok) {
            const errorText = await response.text();
            console.error("❌ Failed to post alert. Server response:", errorText);
            
            try {
                const errorJson = JSON.parse(errorText);
                console.error("❌ Detailed error:", errorJson);
            } catch (e) {
                console.error("❌ Raw error response:", errorText);
            }
            return false;
        } else {
            const responseData = await response.json();
            console.log("✅ Alert successfully posted:", responseData);
            return true;
        }
    } catch (error) {
        console.error("❌ Error posting alert:", error);
        return false;
    }
}

// Enhanced prediction function with multiple thresholds
function getEnhancedPrediction(temperature, current, vibration, voltage) {
    let issues = [];
    let severity = 'normal';
    
    // Temperature thresholds
    if (temperature > 35) {
        issues.push('high_temperature');
        severity = 'critical';
    } else if (temperature > 30) {
        issues.push('elevated_temperature');
        severity = 'warning';
    }
    
    // Current thresholds
    if (current > 25) {
        issues.push('high_current');
        severity = 'critical';
    } else if (current > 20) {
        issues.push('elevated_current');
        severity = severity === 'normal' ? 'warning' : severity;
    }
    
    // Vibration thresholds
    if (vibration > 15) {
        issues.push('high_vibration');
        severity = severity === 'normal' ? 'warning' : severity;
    } else if (vibration > 10) {
        issues.push('elevated_vibration');
        severity = severity === 'normal' ? 'warning' : severity;
    }
    
    // Voltage thresholds
    if (voltage < 200 || voltage > 250) {
        issues.push('voltage_anomaly');
        severity = severity === 'normal' ? 'warning' : severity;
    }
    
    if (issues.length > 0) {
        return {
            status: severity === 'critical' ? 'Failure' : 'Warning',
            issues: issues,
            severity: severity
        };
    }
    
    return {
        status: 'Normal',
        issues: [],
        severity: 'normal'
    };
}

// Backward compatible simple prediction
function getPrediction(temperature, current) {
    const enhanced = getEnhancedPrediction(temperature, current, 0, 220);
    return enhanced.status;
}

// Function to update connection status indicator
function updateConnectionStatus(connected) {
    const statusElement = document.getElementById('connection-status');
    if (!statusElement) return;
    
    if (connected) {
        statusElement.className = 'connection-status connected';
        statusElement.innerHTML = '<i class="fas fa-wifi"></i><span>Connected</span>';
    } else {
        statusElement.className = 'connection-status disconnected';
        statusElement.innerHTML = '<i class="fas fa-wifi-slash"></i><span>Disconnected</span>';
    }
}

// Function to render the chart using Chart.js
function renderChart(data) {
    const existingChart = Chart.getChart('status-chart');
    if (existingChart) {
        existingChart.destroy();
    }
    
    const ctx = document.getElementById('status-chart').getContext('2d');
    
    // Only show last 50 data points for performance
    const displayData = data.slice(-50);
    const timestamps = displayData.map(item => new Date(item.timestamp).toLocaleTimeString());
    const temperatures = displayData.map(item => item.temperature);
    
    new Chart(ctx, {
        type: 'line',
        data: {
            labels: timestamps,
            datasets: [{
                label: 'Temperature (°C)',
                data: temperatures,
                borderColor: 'rgb(75, 192, 192)',
                tension: 0.1,
                fill: true,
                backgroundColor: 'rgba(75, 192, 192, 0.2)'
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                x: {
                    title: {
                        display: true,
                        text: 'Timestamp',
                        color: 'white'
                    },
                    ticks: {
                        color: 'white',
                        maxTicksLimit: 10
                    },
                    grid: {
                        color: '#333'
                    }
                },
                y: {
                    title: {
                        display: true,
                        text: 'Temperature (°C)',
                        color: 'white'
                    },
                    ticks: {
                        color: 'white'
                    },
                    grid: {
                        color: '#333'
                    },
                    suggestedMin: 0,
                    suggestedMax: 50
                }
            },
            plugins: {
                legend: {
                    labels: {
                        color: 'white'
                    }
                },
                tooltip: {
                    mode: 'index',
                    intersect: false
                }
            },
            interaction: {
                intersect: false,
                mode: 'nearest'
            }
        }
    });
}

// Function to populate the data table
function populateTable(data) {
    const tableBody = document.getElementById('data-table-body');
    if (!tableBody) return;
    
    tableBody.innerHTML = ''; // Clear existing data

    // Show last 10 records, newest first
    const displayData = data.slice(-10).reverse();

    if (displayData.length === 0) {
        tableBody.innerHTML = '<tr><td colspan="6" class="no-data">No sensor data available</td></tr>';
        return;
    }

    displayData.forEach(item => {
        const row = tableBody.insertRow();
        row.innerHTML = `
            <td>${new Date(item.timestamp).toLocaleString()}</td>
            <td>${item.device_name || item.device || 'N/A'}</td>
            <td>${item.current !== null ? `${item.current.toFixed(2)} A` : 'N/A'}</td>
            <td>${item.temperature !== null ? `${item.temperature.toFixed(2)} °C` : 'N/A'}</td>
            <td>${item.vibration !== null ? `${item.vibration.toFixed(2)} m/s²` : 'N/A'}</td>
            <td>${item.voltage !== null ? `${item.voltage.toFixed(2)} V` : 'N/A'}</td>
        `;
    });
}

// Enhanced displayAlerts function that handles current data structure
function displayAlerts(alerts) {
    const alertsList = document.getElementById('alerts-list');
    if (!alertsList) {
        console.error("❌ Could not find alerts-list element");
        return;
    }
    
    alertsList.innerHTML = '';
    
    // Update alert count
    const alertCount = document.querySelector('.alert-count');
    if (alertCount) {
        alertCount.textContent = alerts.length;
        console.log("🔢 Alert count updated to:", alerts.length);
    }

    if (alerts.length === 0) {
        alertsList.innerHTML = '<li class="no-alerts"><i class="fas fa-check-circle"></i> No recent alerts. All systems normal.</li>';
        console.log("ℹ️ No alerts to display");
    } else {
        // Sort alerts by timestamp descending (newest first)
        const sortedAlerts = alerts.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
        
        console.log("📝 Displaying sorted alerts:", sortedAlerts.slice(0, 5));
        
        // Show only the last 5 alerts
        sortedAlerts.slice(0, 5).forEach(alert => {
            const li = document.createElement('li');
            
            // Extract device information - handle both device object and device_id
            const deviceId = alert.device_id || (alert.device && alert.device.id) || 'Unknown';
            const deviceName = alert.device_name || (alert.device && alert.device.name) || 'Unknown Device';
            
            // Determine severity and styling - infer from alert_type and message since severity field doesn't exist yet
            let severity = getSeverityFromAlertData(alert);
            let iconClass = getIconFromAlertType(alert.alert_type) || getIconFromMessage(alert.message);
            let alertType = alert.alert_type || getAlertTypeFromMessage(alert.message) || 'System Alert';
            
            console.log(`🔄 Processing alert:`, {
                message: alert.message,
                alert_type: alert.alert_type,
                inferred_severity: severity,
                deviceName: deviceName,
                deviceId: deviceId
            });
            
            // Apply appropriate CSS classes
            if (severity === 'critical') {
                li.classList.add('critical');
                iconClass += ' critical';
            } else if (severity === 'warning') {
                li.classList.add('warning');
                iconClass += ' warning';
            } else {
                li.classList.add('info');
                iconClass += ' info';
            }
            
            li.innerHTML = `
                <i class="${iconClass} alert-icon"></i>
                <div class="alert-content">
                    <div class="alert-message">${alert.message}</div>
                    <div class="alert-meta">
                        <span class="alert-type">${alertType}</span>
                        <span class="alert-device">• Device: ${deviceName}</span>
                        <span class="alert-device-id">• ID: ${deviceId}</span>
                    </div>
                    <div class="alert-time">${formatAlertTime(alert.timestamp)}</div>
                </div>
                <i class="fas fa-chevron-right alert-arrow"></i>
            `;
            alertsList.appendChild(li);
        });
    }
}

// Enhanced helper function to determine severity from available data
function getSeverityFromAlertData(alert) {
    // First check if severity field exists (for future compatibility)
    if (alert.severity) {
        return alert.severity;
    }
    
    // Infer from alert_type
    if (alert.alert_type) {
        const type = alert.alert_type.toLowerCase();
        if (type.includes('critical') || type.includes('overheating') || type.includes('overloading')) {
            return 'critical';
        } else if (type.includes('warning') || type.includes('elevated')) {
            return 'warning';
        }
    }
    
    // Infer from message content as fallback
    if (alert.message) {
        const msg = alert.message.toLowerCase();
        if (msg.includes('critical') || msg.includes('exceeded') || msg.includes('above') || msg.includes('over')) {
            return 'critical';
        } else if (msg.includes('warning') || msg.includes('approaching') || msg.includes('high')) {
            return 'warning';
        }
    }
    
    return 'info'; // Default
}

// Enhanced helper function to get appropriate icon
function getIconFromAlertType(alertType) {
    if (!alertType) return 'fas fa-exclamation-circle';
    
    const type = alertType.toLowerCase();
    if (type.includes('temperature') || type.includes('overheating')) {
        return 'fas fa-temperature-high';
    } else if (type.includes('current') || type.includes('power')) {
        return 'fas fa-bolt';
    } else if (type.includes('vibration')) {
        return 'fas fa-wave-square';
    } else if (type.includes('voltage')) {
        return 'fas fa-bolt';
    }
    return 'fas fa-exclamation-circle';
}

// Helper function to get icon from message (fallback)
function getIconFromMessage(message) {
    if (!message) return 'fas fa-exclamation-circle';
    
    const msg = message.toLowerCase();
    if (msg.includes('temperature')) {
        return 'fas fa-temperature-high';
    } else if (msg.includes('current')) {
        return 'fas fa-bolt';
    } else if (msg.includes('vibration')) {
        return 'fas fa-wave-square';
    } else if (msg.includes('voltage')) {
        return 'fas fa-bolt';
    }
    return 'fas fa-exclamation-circle';
}

// Helper function to determine alert type from message
function getAlertTypeFromMessage(message) {
    if (!message) return 'System Alert';
    
    const msg = message.toLowerCase();
    if (msg.includes('temperature')) {
        return 'Overheating';
    } else if (msg.includes('current')) {
        return 'High Current';
    } else if (msg.includes('vibration')) {
        return 'High Vibration';
    } else if (msg.includes('voltage')) {
        return 'Voltage Issue';
    } else if (msg.includes('power') || msg.includes('disconnect')) {
        return 'Power Disconnect';
    } else if (msg.includes('overload')) {
        return 'Overloading';
    }
    return 'System Alert';
}

// Helper function to format timestamp nicely
function formatAlertTime(timestamp) {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    
    if (diffMins < 1) {
        return 'Just now';
    } else if (diffMins < 60) {
        return `${diffMins} minute${diffMins > 1 ? 's' : ''} ago`;
    } else if (diffHours < 24) {
        return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
    } else {
        return date.toLocaleString();
    }
}

// Function to update metric cards with trend indicators
function updateMetricCards(latestData, previousData) {
    // Update temperature with trend
    if (latestData.temperature !== null && latestData.temperature !== undefined) {
        const tempElement = document.getElementById('latest-temp');
        tempElement.textContent = `${latestData.temperature.toFixed(2)} °C`;
        
        // Add trend indicator if previous data exists
        if (previousData && previousData.temperature !== null && previousData.temperature !== undefined) {
            const trend = latestData.temperature - previousData.temperature;
            updateTrendIndicator(tempElement.parentElement, trend, '°C');
        }
    }
    
    // Update current
    if (latestData.current !== null && latestData.current !== undefined) {
        document.getElementById('latest-current').textContent = `${latestData.current.toFixed(2)} A`;
    }
    
    // Update voltage
    if (latestData.voltage !== null && latestData.voltage !== undefined) {
        document.getElementById('latest-voltage').textContent = `${latestData.voltage.toFixed(2)} V`;
    }
    
    // Update vibration
    if (latestData.vibration !== null && latestData.vibration !== undefined) {
        document.getElementById('latest-vibration').textContent = `${latestData.vibration.toFixed(2)} m/s²`;
    }
}

// Helper function to update trend indicators
function updateTrendIndicator(parentElement, trend, unit = '') {
    let trendElement = parentElement.querySelector('.trend-indicator');
    if (!trendElement) {
        trendElement = document.createElement('div');
        trendElement.className = 'trend-indicator';
        parentElement.appendChild(trendElement);
    }
    
    const trendValue = Math.abs(trend).toFixed(2);
    const trendSymbol = trend >= 0 ? '↗' : '↘';
    const trendClass = trend >= 0 ? 'up' : 'down';
    
    trendElement.innerHTML = `
        <span class="trend ${trendClass}">
            <i class="fas fa-arrow-${trend >= 0 ? 'up' : 'down'}"></i> ${trendValue}${unit}
        </span>
    `;
}

// Global variable to track alert state for deduplication
let lastAlertState = {
    status: 'normal',
    timestamp: null
};

// Main function to run the dashboard
async function main() {
    console.log("🔄 === Starting Dashboard Update ===");
    
    try {
        const sensorData = await fetchData();
        
        if (sensorData && sensorData.length > 0) {
            const latestData = sensorData[sensorData.length - 1];
            const previousData = sensorData.length > 1 ? sensorData[sensorData.length - 2] : null;
            
            console.log("📊 Latest sensor data:", latestData);
            
            // Use enhanced prediction
            const prediction = getEnhancedPrediction(
                latestData.temperature || 0, 
                latestData.current || 0, 
                latestData.vibration || 0, 
                latestData.voltage || 220
            );
            
            console.log("🔮 System prediction:", prediction);
            
            // Alert deduplication logic
            const currentAlertState = {
                status: prediction.severity,
                timestamp: Date.now()
            };
            
            // Only post alert if state changed to critical/warning and enough time passed (5 minutes)
            const shouldPostAlert = (prediction.severity === 'critical' || prediction.severity === 'warning') &&
                                  (lastAlertState.status !== prediction.severity || 
                                   !lastAlertState.timestamp || 
                                   Date.now() - lastAlertState.timestamp > 300000); // 5 minutes
            
            if (shouldPostAlert) {
                let alertMessage = '';
                let alertType = 'System Alert';

                if (latestData.temperature > 35) {
                    alertMessage = `CRITICAL: Temperature ${latestData.temperature.toFixed(2)}°C exceeded threshold (35°C)`;
                    alertType = 'Overheating';
                } else if (latestData.current > 25) {
                    alertMessage = `CRITICAL: Current ${latestData.current.toFixed(2)}A exceeded threshold (25A)`;
                    alertType = 'High Current';
                } else if (latestData.vibration > 15) {
                    alertMessage = `WARNING: Vibration ${latestData.vibration.toFixed(2)}m/s² exceeded threshold (15m/s²)`;
                    alertType = 'High Vibration';
                } else if (prediction.status === 'Warning') {
                    alertMessage = `WARNING: ${prediction.issues.join(', ').replace(/_/g, ' ')} detected`;
                    alertType = 'System Warning';
                } else {
                    alertMessage = `ALERT: Multiple parameters exceeded safety thresholds`;
                    alertType = 'Multiple Parameters';
                }
                
                console.log(`🚨 Creating ${prediction.severity} alert (${alertType}):`, alertMessage);
                const alertPosted = await postAlert(alertMessage, prediction.severity, latestData, alertType);
                console.log("📝 Alert creation result:", alertPosted ? "SUCCESS" : "FAILED");
                
                if (alertPosted) {
                    lastAlertState = currentAlertState;
                }
            }
            
            // Update the prediction status indicator on the dashboard
            const predictionElement = document.getElementById('prediction-status');
            if (predictionElement) {
                predictionElement.textContent = prediction.status;
                predictionElement.className = `status-indicator ${prediction.status.toLowerCase()}`;
                
                // Update status details
                const statusDetails = document.querySelector('.status-details');
                if (statusDetails) {
                    if (prediction.status === 'Failure') {
                        statusDetails.textContent = `Critical issues detected: ${prediction.issues.join(', ').replace(/_/g, ' ')}`;
                        statusDetails.style.color = 'var(--danger)';
                    } else if (prediction.status === 'Warning') {
                        statusDetails.textContent = `Warnings: ${prediction.issues.join(', ').replace(/_/g, ' ')}`;
                        statusDetails.style.color = 'var(--warning)';
                    } else {
                        statusDetails.textContent = 'System operating within normal parameters. No issues detected.';
                        statusDetails.style.color = 'var(--text-secondary)';
                    }
                }
            }
            
            // Update metric cards with trend indicators
            updateMetricCards(latestData, previousData);
            
            // Update the last updated timestamp
            document.getElementById('last-updated').textContent = new Date().toLocaleString();
            
            // Render the chart and table
            renderChart(sensorData);
            populateTable(sensorData);
        } else {
            // No data available
            console.log("⚠️ No sensor data available");
            updateConnectionStatus(false);
            const predictionElement = document.getElementById('prediction-status');
            if (predictionElement) {
                predictionElement.textContent = 'No Data';
                predictionElement.className = 'status-indicator unknown';
            }
        }

        // Fetch and display alerts
        const alerts = await fetchAlerts();
        console.log("📋 Displaying alerts:", alerts);
        displayAlerts(alerts);
        
    } catch (error) {
        console.error("💥 Error in main dashboard function:", error);
        updateConnectionStatus(false);
    }
    
    console.log("✅ === Dashboard Update Complete ===\n");
}

// Enhanced debug function for current data structure
function debugAlerts(alerts) {
    console.log("=== ALERT DATA STRUCTURE DEBUG ===");
    console.log("Number of alerts:", alerts.length);
    
    if (alerts.length === 0) {
        console.log("No alerts found");
        return;
    }
    
    // Show first alert structure in detail
    const sampleAlert = alerts[0];
    console.log("📋 Sample Alert Structure:", {
        id: sampleAlert.id,
        message: sampleAlert.message,
        timestamp: sampleAlert.timestamp,
        alert_type: sampleAlert.alert_type,
        device: sampleAlert.device, // This might be an object or ID
        device_id: sampleAlert.device_id,
        device_name: sampleAlert.device_name,
        severity: sampleAlert.severity, // This will be undefined in current model
        // Show all available properties
        all_properties: Object.keys(sampleAlert)
    });
    
    // Show what each alert contains
    alerts.forEach((alert, index) => {
        console.log(`Alert ${index + 1}: "${alert.message}"`, {
            type: alert.alert_type,
            device: alert.device_name || (alert.device && alert.device.name) || 'Unknown',
            has_severity: !!alert.severity
        });
    });
    console.log("=== END DEBUGGING ===");
}

// Initialize dashboard on page load
document.addEventListener('DOMContentLoaded', function() {
    console.log("🚀 Dashboard initialized");
    
    // Create connection status element if it doesn't exist
    if (!document.getElementById('connection-status')) {
        const statusElement = document.createElement('div');
        statusElement.id = 'connection-status';
        statusElement.className = 'connection-status connected';
        statusElement.innerHTML = '<i class="fas fa-wifi"></i><span>Connected</span>';
        document.body.appendChild(statusElement);
    }
    
    // Add refresh button functionality
    const refreshBtn = document.getElementById('refresh-btn');
    if (refreshBtn) {
        refreshBtn.addEventListener('click', function() {
            console.log("🔄 Manual refresh triggered");
            main();
        });
    }
    
    // Run main function immediately
    main();
});

// Update the dashboard every 5 seconds
setInterval(main, 5000);

// Export functions for testing (if needed)
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        getEnhancedPrediction,
        validateSensorData,
        getCSRFToken,
        displayAlerts,
        formatAlertTime
    };
}