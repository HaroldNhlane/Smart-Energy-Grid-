// Function to fetch and process data from the live Django API
async function fetchData() {
    try {
        const response = await fetch('http://127.0.0.1:8000/api/sensordata/');
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        const data = await response.json();
        return data;
    } catch (error) {
        console.error("Could not fetch data:", error);
        return [];
    }
}

// Function to fetch and process alerts
async function fetchAlerts() {
    try {
        const response = await fetch('http://127.0.0.1:8000/api/alerts/');
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        const data = await response.json();
        return data;
    } catch (error) {
        console.error("Could not fetch alerts:", error);
        return [];
    }
}

// Function to make a simple prediction based on the rule (temperature > 35)
function getPrediction(temperature) {
    return temperature > 35 ? 'Failure' : 'Normal';
}

// Function to render the chart using Chart.js
function renderChart(data) {
    const existingChart = Chart.getChart('status-chart');
    if (existingChart) {
        existingChart.destroy();
    }
    
    const ctx = document.getElementById('status-chart').getContext('2d');
    
    const timestamps = data.map(item => new Date(item.timestamp).toLocaleTimeString());
    const temperatures = data.map(item => item.temperature);
    
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
                        color: 'white'
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
                    }
                }
            },
            plugins: {
                legend: {
                    labels: {
                        color: 'white'
                    }
                }
            }
        }
    });
}

// Function to populate the data table
function populateTable(data) {
    const tableBody = document.getElementById('data-table-body');
    tableBody.innerHTML = ''; // Clear existing data

    data.forEach(item => {
        const row = tableBody.insertRow();
        row.innerHTML = `
            <td>${new Date(item.timestamp).toLocaleString()}</td>
            <td>${item.device_name || item.device}</td>
            <td>${item.current !== null ? `${item.current} A` : 'N/A'}</td>
            <td>${item.temperature !== null ? `${item.temperature} °C` : 'N/A'}</td>
            <td>${item.vibration !== null ? `${item.vibration} m/s²` : 'N/A'}</td>
            <td>${item.voltage !== null ? `${item.voltage} V` : 'N/A'}</td>
        `;
    });
}

// Function to display alerts
function displayAlerts(alerts) {
    const alertsList = document.getElementById('alerts-list');
    alertsList.innerHTML = '';
    
    const alertCount = document.querySelector('.alert-count');
    alertCount.textContent = alerts.length;

    if (alerts.length === 0) {
        alertsList.innerHTML = '<li class="no-alerts">No recent alerts.</li>';
    } else {
        alerts.forEach(alert => {
            const li = document.createElement('li');
            li.innerHTML = `
                <i class="fas fa-exclamation-circle alert-icon"></i>
                <div class="alert-content">
                    <div>${alert.message}</div>
                    <div class="alert-time">${new Date(alert.timestamp).toLocaleString()}</div>
                </div>
                <i class="fas fa-chevron-right"></i>
            `;
            if (alert.severity === 'warning') {
                li.classList.add('warning');
                li.querySelector('.alert-icon').classList.add('warning');
            }
            alertsList.appendChild(li);
        });
    }
}


// Main function to run the dashboard
async function main() {
    const sensorData = await fetchData();
    const alerts = await fetchAlerts();

    if (sensorData && sensorData.length > 0) {
        const latestData = sensorData[sensorData.length - 1];
        
        // Update the prediction status
        const prediction = getPrediction(latestData.temperature);
        const predictionElement = document.getElementById('prediction-status');
        predictionElement.textContent = prediction;
        predictionElement.className = `status-indicator ${prediction.toLowerCase()}`;
        
        // Update the metric cards
        document.getElementById('latest-temp').textContent = latestData.temperature !== null ? `${latestData.temperature} °C` : 'N/A';
        document.getElementById('latest-current').textContent = latestData.current !== null ? `${latestData.current} A` : 'N/A';
        document.getElementById('latest-voltage').textContent = latestData.voltage !== null ? `${latestData.voltage} V` : 'N/A';
        document.getElementById('latest-vibration').textContent = latestData.vibration !== null ? `${latestData.vibration} m/s²` : 'N/A';
        
        // Update the last updated timestamp
        document.getElementById('last-updated').textContent = new Date().toLocaleString();
        
        // Render the chart and table
        renderChart(sensorData);
        populateTable(sensorData.slice(-10).reverse()); // Show last 10 records, newest first
    }

    displayAlerts(alerts.slice(-5).reverse()); // Show last 5 alerts, newest first
}

// Update the dashboard every 5 seconds
setInterval(main, 5000);

// Run the main function once on page load
main();