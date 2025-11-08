// ============================================
// TIM CLIENT V3 - INDIVIDUAL TEAM 5-FREQUENCY VIEW
// ============================================

// Data structure for this team's 5 frequencies
const dataByFreq = {
    '1.5': { dataA: [], dataB: [], maxA: 0, maxB: 0, avgA: 0, avgB: 0 },
    '2.5': { dataA: [], dataB: [], maxA: 0, maxB: 0, avgA: 0, avgB: 0 },
    '3.5': { dataA: [], dataB: [], maxA: 0, maxB: 0, avgA: 0, avgB: 0 },
    '4.5': { dataA: [], dataB: [], maxA: 0, maxB: 0, avgA: 0, avgB: 0 },
    '5.5': { dataA: [], dataB: [], maxA: 0, maxB: 0, avgA: 0, avgB: 0 }
};

// Chart instances - 5 per building
let chartsLantai3 = {};
let chartsLantai10 = {};

// WebSocket
let ws = null;

// Session state
let currentFrequency = null;
let sessionActive = false;
let sessionId = null;
let timerInterval = null;
let timerSeconds = 0;

// Color for this team (blue theme)
const teamColor = 'rgb(54, 162, 235)';

// ============================================
// INITIALIZATION
// ============================================

document.addEventListener('DOMContentLoaded', () => {
    initCharts();
    connectWebSocket();
    setupExportButtons();
});

// ============================================
// CHART INITIALIZATION
// ============================================

function initCharts() {
    const frequencies = ['1.5', '2.5', '3.5', '4.5', '5.5'];
    
    // Initialize Lantai 3 charts
    frequencies.forEach(freq => {
        const canvasId = `chartLantai3_Freq${freq.replace('.', '')}`;
        const ctx = document.getElementById(canvasId);
        
        if (ctx) {
            chartsLantai3[freq] = new Chart(ctx, {
                type: 'bar',
                data: {
                    labels: [],
                    datasets: [{
                        label: `${TEAM_NAME} - ${freq} Hz`,
                        data: [],
                        backgroundColor: context => {
                            if (!context.parsed) return teamColor;
                            const value = context.parsed.y;
                            return value >= 0 ? teamColor : 'rgba(255, 99, 132, 0.7)';
                        },
                        borderColor: context => {
                            if (!context.parsed) return teamColor;
                            const value = context.parsed.y;
                            return value >= 0 ? teamColor : 'rgb(255, 99, 132)';
                        },
                        borderWidth: 2,
                        barThickness: 8,
                        maxBarThickness: 12
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    animation: false,
                    scales: {
                        y: {
                            beginAtZero: false,
                            title: {
                                display: true,
                                text: 'Displacement (mm)',
                                font: { size: 12, weight: 'bold' }
                            },
                            grid: {
                                color: 'rgba(0, 0, 0, 0.05)'
                            }
                        },
                        x: {
                            title: {
                                display: true,
                                text: 'Waktu (detik)',
                                font: { size: 12 }
                            },
                            grid: {
                                display: false
                            }
                        }
                    },
                    plugins: {
                        legend: {
                            display: true,
                            position: 'top',
                            labels: {
                                font: { size: 11 }
                            }
                        },
                        tooltip: {
                            callbacks: {
                                label: function(context) {
                                    return `Displacement: ${context.parsed.y.toFixed(2)} mm`;
                                }
                            }
                        }
                    }
                }
            });
        }
    });
    
    // Initialize Lantai 10 charts
    frequencies.forEach(freq => {
        const canvasId = `chartLantai10_Freq${freq.replace('.', '')}`;
        const ctx = document.getElementById(canvasId);
        
        if (ctx) {
            chartsLantai10[freq] = new Chart(ctx, {
                type: 'bar',
                data: {
                    labels: [],
                    datasets: [{
                        label: `${TEAM_NAME} - ${freq} Hz`,
                        data: [],
                        backgroundColor: context => {
                            if (!context.parsed) return teamColor;
                            const value = context.parsed.y;
                            return value >= 0 ? teamColor : 'rgba(255, 99, 132, 0.7)';
                        },
                        borderColor: context => {
                            if (!context.parsed) return teamColor;
                            const value = context.parsed.y;
                            return value >= 0 ? teamColor : 'rgb(255, 99, 132)';
                        },
                        borderWidth: 2,
                        barThickness: 8,
                        maxBarThickness: 12
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    animation: false,
                    scales: {
                        y: {
                            beginAtZero: false,
                            title: {
                                display: true,
                                text: 'Displacement (mm)',
                                font: { size: 12, weight: 'bold' }
                            },
                            grid: {
                                color: 'rgba(0, 0, 0, 0.05)'
                            }
                        },
                        x: {
                            title: {
                                display: true,
                                text: 'Waktu (detik)',
                                font: { size: 12 }
                            },
                            grid: {
                                display: false
                            }
                        }
                    },
                    plugins: {
                        legend: {
                            display: true,
                            position: 'top',
                            labels: {
                                font: { size: 11 }
                            }
                        },
                        tooltip: {
                            callbacks: {
                                label: function(context) {
                                    return `Displacement: ${context.parsed.y.toFixed(2)} mm`;
                                }
                            }
                        }
                    }
                }
            });
        }
    });
}

// ============================================
// WEBSOCKET CONNECTION
// ============================================

function connectWebSocket() {
    const statusEl = document.getElementById('wsStatus');
    statusEl.innerHTML = '<span class="status-dot"></span> Connecting...';
    statusEl.className = 'connection-status connecting';
    
    ws = new WebSocket('ws://localhost:8080');
    
    ws.onopen = () => {
        console.log('WebSocket Connected');
        statusEl.innerHTML = '<span class="status-dot"></span> Connected';
        statusEl.className = 'connection-status connected';
        
        // Subscribe to this team's data
        ws.send(JSON.stringify({
            type: 'subscribe',
            laptop_id: LAPTOP_ID
        }));
    };
    
    ws.onmessage = (event) => {
        try {
            const message = JSON.parse(event.data);
            
            switch (message.type) {
                case 'session_start':
                    handleSessionStart(message.data);
                    break;
                    
                case 'session_stop':
                    handleSessionStop(message.data);
                    break;
                    
                case 'new_data':
                    // Filter for this team
                    if (message.laptop_id === LAPTOP_ID) {
                        handleNewData(message.data);
                    }
                    break;
                    
                case 'initial_data':
                    handleInitialData(message.data);
                    break;
            }
        } catch (error) {
            console.error('Error parsing WebSocket message:', error);
        }
    };
    
    ws.onerror = (error) => {
        console.error('WebSocket Error:', error);
        statusEl.innerHTML = '<span class="status-dot"></span> Error';
        statusEl.className = 'connection-status error';
    };
    
    ws.onclose = () => {
        console.log('WebSocket Disconnected');
        statusEl.innerHTML = '<span class="status-dot"></span> Disconnected';
        statusEl.className = 'connection-status disconnected';
        
        // Attempt reconnect after 3 seconds
        setTimeout(connectWebSocket, 3000);
    };
}

// ============================================
// SESSION HANDLERS
// ============================================

function handleSessionStart(data) {
    sessionActive = true;
    sessionId = data.session_id;
    currentFrequency = data.frequency;
    timerSeconds = 0;
    
    // Update UI
    document.getElementById('currentFrequency').textContent = `${currentFrequency} Hz`;
    document.getElementById('sessionStatus').textContent = 'Recording';
    document.getElementById('sessionStatus').className = 'status-recording';
    
    // Clear previous data for this frequency
    if (dataByFreq[currentFrequency]) {
        dataByFreq[currentFrequency].dataA = [];
        dataByFreq[currentFrequency].dataB = [];
    }
    
    // Start timer display
    startTimerDisplay();
    
    console.log(`Session started: ${sessionId}, Frequency: ${currentFrequency} Hz`);
}

function handleSessionStop(data) {
    sessionActive = false;
    
    // Update UI
    document.getElementById('sessionStatus').textContent = 'Stopped';
    document.getElementById('sessionStatus').className = 'status-stopped';
    
    // Stop timer
    stopTimerDisplay();
    
    console.log('Session stopped');
}

function startTimerDisplay() {
    if (timerInterval) clearInterval(timerInterval);
    
    timerInterval = setInterval(() => {
        timerSeconds++;
        const minutes = Math.floor(timerSeconds / 60);
        const seconds = timerSeconds % 60;
        document.getElementById('timerDisplay').textContent = 
            `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
    }, 1000);
}

function stopTimerDisplay() {
    if (timerInterval) {
        clearInterval(timerInterval);
        timerInterval = null;
    }
}

// ============================================
// DATA HANDLERS
// ============================================

function handleInitialData(data) {
    // Load initial data from database
    if (!data || data.length === 0) return;
    
    data.forEach(point => {
        if (point.laptop_id === LAPTOP_ID) {
            const freq = String(point.frequency);
            if (dataByFreq[freq]) {
                dataByFreq[freq].dataA.push({
                    time: point.time_seconds,
                    value: point.displacement_a
                });
                dataByFreq[freq].dataB.push({
                    time: point.time_seconds,
                    value: point.displacement_b
                });
            }
        }
    });
    
    // Update all charts
    Object.keys(dataByFreq).forEach(freq => {
        updateChart(chartsLantai3[freq], freq, 'A');
        updateChart(chartsLantai10[freq], freq, 'B');
    });
}

function handleNewData(data) {
    if (!data) return;
    
    const freq = String(data.frequency);
    
    // Add to data structure
    if (dataByFreq[freq]) {
        dataByFreq[freq].dataA.push({
            time: data.time_seconds,
            value: data.displacement_a
        });
        dataByFreq[freq].dataB.push({
            time: data.time_seconds,
            value: data.displacement_b
        });
        
        // Update charts for this frequency
        updateChart(chartsLantai3[freq], freq, 'A');
        updateChart(chartsLantai10[freq], freq, 'B');
    }
}

// ============================================
// CHART UPDATE
// ============================================

function updateChart(chart, frequency, building) {
    if (!chart || !dataByFreq[frequency]) return;
    
    const freqData = dataByFreq[frequency];
    const dataPoints = building === 'A' ? freqData.dataA : freqData.dataB;
    
    if (dataPoints.length === 0) return;
    
    // Prepare chart data
    const labels = dataPoints.map(d => d.time.toFixed(2));
    const values = dataPoints.map(d => d.value);
    
    // Calculate statistics
    const maxValue = Math.max(...values.map(Math.abs));
    const avgValue = values.reduce((sum, v) => sum + Math.abs(v), 0) / values.length;
    
    // Update stored stats
    if (building === 'A') {
        freqData.maxA = maxValue;
        freqData.avgA = avgValue;
    } else {
        freqData.maxB = maxValue;
        freqData.avgB = avgValue;
    }
    
    // Update chart
    chart.data.labels = labels;
    chart.data.datasets[0].data = values;
    chart.update('none'); // No animation
    
    // Update stats display
    updateStatsDisplay(frequency, building);
}

function updateStatsDisplay(frequency, building) {
    const freqData = dataByFreq[frequency];
    const freqKey = frequency.replace('.', '');
    const buildingKey = building === 'A' ? '3' : '10';
    
    // Get latest value (realtime)
    const dataPoints = building === 'A' ? freqData.dataA : freqData.dataB;
    const latestValue = dataPoints.length > 0 ? Math.abs(dataPoints[dataPoints.length - 1].value) : 0;
    
    // Update DOM elements
    const realtimeEl = document.getElementById(`realtime${buildingKey}_${freqKey}`);
    const maxEl = document.getElementById(`max${buildingKey}_${freqKey}`);
    const avgEl = document.getElementById(`avg${buildingKey}_${freqKey}`);
    
    if (realtimeEl) realtimeEl.textContent = `${latestValue.toFixed(2)} mm`;
    if (maxEl) maxEl.textContent = `${(building === 'A' ? freqData.maxA : freqData.maxB).toFixed(2)} mm`;
    if (avgEl) avgEl.textContent = `${(building === 'A' ? freqData.avgA : freqData.avgB).toFixed(2)} mm/s`;
}

// ============================================
// EXPORT FUNCTIONS
// ============================================

function setupExportButtons() {
    document.getElementById('exportRealtimeBtn').addEventListener('click', exportRealtime);
    document.getElementById('exportSessionBtn').addEventListener('click', exportSession);
}

async function exportRealtime() {
    try {
        const response = await fetch(`/detector-getaran/api/export_realtime.php?laptop_id=${LAPTOP_ID}`);
        
        if (!response.ok) throw new Error('Export failed');
        
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `realtime_${TEAM_NAME}_${new Date().toISOString().slice(0, 10)}.csv`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        window.URL.revokeObjectURL(url);
        
        alert('Export Realtime berhasil!');
    } catch (error) {
        console.error('Export error:', error);
        alert('Export gagal. Lihat console untuk detail.');
    }
}

async function exportSession() {
    if (!sessionId) {
        alert('Tidak ada sesi aktif untuk diexport.');
        return;
    }
    
    try {
        const response = await fetch(`/detector-getaran/api/export_session.php?session_id=${sessionId}&laptop_id=${LAPTOP_ID}`);
        
        if (!response.ok) throw new Error('Export failed');
        
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `session_${TEAM_NAME}_${new Date().toISOString().slice(0, 10)}.csv`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        window.URL.revokeObjectURL(url);
        
        alert('Export Session berhasil!');
    } catch (error) {
        console.error('Export error:', error);
        alert('Export gagal. Lihat console untuk detail.');
    }
}
