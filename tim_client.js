// ===== TIM_CLIENT.JS - Shared WebSocket Client untuk Tim Pages =====

let ws = null;
let reconnectInterval = null;
let chartLantai3 = null;
let chartLantai10 = null;

let currentFrequency = 1.5;
let teamName = '';

// Data storage per frequency
let dataByFrequency = {
    '1.5': { dataA: [], dataB: [], maxA: 0, maxB: 0, avgA: 0, avgB: 0 },
    '2.5': { dataA: [], dataB: [], maxA: 0, maxB: 0, avgA: 0, avgB: 0 },
    '3.5': { dataA: [], dataB: [], maxA: 0, maxB: 0, avgA: 0, avgB: 0 },
    '4.5': { dataA: [], dataB: [], maxA: 0, maxB: 0, avgA: 0, avgB: 0 },
    '5.5': { dataA: [], dataB: [], maxA: 0, maxB: 0, avgA: 0, avgB: 0 }
};

document.addEventListener('DOMContentLoaded', () => {
    initCharts();
    connectWebSocket();
    setupEventListeners();
    loadInitialData();
});

// ===== WebSocket Connection =====
function connectWebSocket() {
    updateConnectionStatus('connecting');
    
    ws = new WebSocket('ws://localhost:8080');
    
    ws.onopen = () => {
        console.log('WebSocket connected');
        updateConnectionStatus('connected');
        
        // Request this team's data
        ws.send(JSON.stringify({ 
            action: 'get_team',
            laptop_id: LAPTOP_ID 
        }));
        
        if (reconnectInterval) {
            clearInterval(reconnectInterval);
            reconnectInterval = null;
        }
    };
    
    ws.onmessage = (event) => {
        const message = JSON.parse(event.data);
        handleWebSocketMessage(message);
    };
    
    ws.onerror = (error) => {
        console.error('WebSocket error:', error);
        updateConnectionStatus('error');
    };
    
    ws.onclose = () => {
        console.log('WebSocket disconnected');
        updateConnectionStatus('disconnected');
        
        if (!reconnectInterval) {
            reconnectInterval = setInterval(() => {
                console.log('Reconnecting...');
                connectWebSocket();
            }, 3000);
        }
    };
}

function updateConnectionStatus(status) {
    const statusEl = document.getElementById('wsStatus');
    
    switch(status) {
        case 'connected':
            statusEl.innerHTML = '<span class="status-dot connected"></span> Connected';
            break;
        case 'connecting':
            statusEl.innerHTML = '<span class="status-dot connecting"></span> Connecting...';
            break;
        case 'disconnected':
            statusEl.innerHTML = '<span class="status-dot disconnected"></span> Disconnected';
            break;
        case 'error':
            statusEl.innerHTML = '<span class="status-dot error"></span> Error';
            break;
    }
}

function handleWebSocketMessage(message) {
    console.log('Received:', message.type);
    
    switch(message.type) {
        case 'initial_data':
        case 'team_data':
            processTeamData(message.data || message);
            break;
            
        case 'new_data':
            const myData = message.data.filter(d => d.laptop_id === LAPTOP_ID);
            if (myData.length > 0) {
                processNewData(myData);
                updateCharts();
                updateStats();
            }
            break;
    }
}

// ===== Data Processing =====
function processTeamData(data) {
    if (data.team) {
        teamName = data.team.nama_tim;
        document.getElementById('teamName').textContent = teamName;
    }
    
    if (data.data) {
        Object.keys(data.data).forEach(freq => {
            const freqData = data.data[freq];
            if (dataByFrequency[freq] && freqData.length > 0) {
                dataByFrequency[freq].dataA = freqData.map(d => ({
                    time: d.relative_time || 0,
                    value: d.dista
                }));
                
                dataByFrequency[freq].dataB = freqData.map(d => ({
                    time: d.relative_time || 0,
                    value: d.distb
                }));
            }
        });
    }
    
    if (data.statistics) {
        Object.keys(data.statistics).forEach(freq => {
            const stats = data.statistics[freq];
            if (dataByFrequency[freq]) {
                dataByFrequency[freq].maxA = stats.max_dista || 0;
                dataByFrequency[freq].maxB = stats.max_distb || 0;
                dataByFrequency[freq].avgA = stats.avg_dista || 0;
                dataByFrequency[freq].avgB = stats.avg_distb || 0;
            }
        });
    }
    
    if (data.current_session) {
        updateSessionInfo(data.current_session);
    }
    
    updateCharts();
    updateStats();
}

function processNewData(newDataArray) {
    newDataArray.forEach(item => {
        const freq = parseFloat(item.frequency).toFixed(1);
        
        if (!dataByFrequency[freq]) return;
        
        const freqData = dataByFrequency[freq];
        
        // Add data points
        freqData.dataA.push({
            time: item.relative_time || 0,
            value: parseFloat(item.dista)
        });
        
        freqData.dataB.push({
            time: item.relative_time || 0,
            value: parseFloat(item.distb)
        });
        
        // Update max
        const absA = Math.abs(item.dista);
        const absB = Math.abs(item.distb);
        
        if (absA > freqData.maxA) freqData.maxA = absA;
        if (absB > freqData.maxB) freqData.maxB = absB;
        
        // Limit data points (max 600)
        if (freqData.dataA.length > 600) freqData.dataA.shift();
        if (freqData.dataB.length > 600) freqData.dataB.shift();
    });
}

// ===== Charts =====
function initCharts() {
    const commonOptions = {
        responsive: true,
        maintainAspectRatio: false,
        animation: false,
        scales: {
            x: {
                title: { display: true, text: 'Waktu (detik)' },
                ticks: { maxTicksLimit: 20 }
            },
            y: {
                title: { display: true, text: 'Displacement (mm)' },
                beginAtZero: false
            }
        },
        plugins: {
            legend: { display: false },
            tooltip: {
                callbacks: {
                    label: (context) => 'Displacement: ' + context.parsed.y.toFixed(2) + ' mm'
                }
            }
        }
    };
    
    // Chart Lantai 3
    const ctx3 = document.getElementById('chartLantai3').getContext('2d');
    chartLantai3 = new Chart(ctx3, {
        type: 'bar',
        data: {
            labels: [],
            datasets: [{
                label: 'Displacement',
                data: [],
                backgroundColor: function(context) {
                    if (!context.parsed) return 'rgba(75, 192, 192, 0.8)';
                    const value = context.parsed.y;
                    return value >= 0 ? 'rgba(75, 192, 192, 0.8)' : 'rgba(255, 99, 132, 0.8)';
                },
                borderColor: function(context) {
                    if (!context.parsed) return 'rgb(75, 192, 192)';
                    const value = context.parsed.y;
                    return value >= 0 ? 'rgb(75, 192, 192)' : 'rgb(255, 99, 132)';
                },
                borderWidth: 1,
                barThickness: 2,
                categoryPercentage: 0.2,
                barPercentage: 1.0
            }]
        },
        options: commonOptions
    });
    
    // Chart Lantai 10
    const ctx10 = document.getElementById('chartLantai10').getContext('2d');
    chartLantai10 = new Chart(ctx10, {
        type: 'bar',
        data: {
            labels: [],
            datasets: [{
                label: 'Displacement',
                data: [],
                backgroundColor: function(context) {
                    if (!context.parsed) return 'rgba(54, 162, 235, 0.8)';
                    const value = context.parsed.y;
                    return value >= 0 ? 'rgba(54, 162, 235, 0.8)' : 'rgba(255, 159, 64, 0.8)';
                },
                borderColor: function(context) {
                    if (!context.parsed) return 'rgb(54, 162, 235)';
                    const value = context.parsed.y;
                    return value >= 0 ? 'rgb(54, 162, 235)' : 'rgb(255, 159, 64)';
                },
                borderWidth: 1,
                barThickness: 2,
                categoryPercentage: 0.2,
                barPercentage: 1.0
            }]
        },
        options: commonOptions
    });
}

function updateCharts() {
    const freq = currentFrequency.toFixed(1);
    const freqData = dataByFrequency[freq];
    
    if (!freqData) return;
    
    // Prepare data for chart
    const times = freqData.dataA.map(d => d.time.toFixed(1));
    const valuesA = freqData.dataA.map(d => d.value);
    const valuesB = freqData.dataB.map(d => d.value);
    
    // Update Chart Lantai 3
    chartLantai3.data.labels = times;
    chartLantai3.data.datasets[0].data = valuesA;
    chartLantai3.update('none');
    
    // Update Chart Lantai 10
    chartLantai10.data.labels = times;
    chartLantai10.data.datasets[0].data = valuesB;
    chartLantai10.update('none');
}

// ===== Stats Update =====
function updateStats() {
    const freq = currentFrequency.toFixed(1);
    const freqData = dataByFrequency[freq];
    
    if (!freqData) return;
    
    const realtimeA = freqData.dataA.length > 0 ? freqData.dataA[freqData.dataA.length - 1].value : 0;
    const realtimeB = freqData.dataB.length > 0 ? freqData.dataB[freqData.dataB.length - 1].value : 0;
    
    document.getElementById('realtime3').textContent = realtimeA.toFixed(2) + ' mm';
    document.getElementById('max3').textContent = freqData.maxA.toFixed(2) + ' mm';
    document.getElementById('avg3').textContent = freqData.avgA.toFixed(2) + ' mm/s';
    
    document.getElementById('realtime10').textContent = realtimeB.toFixed(2) + ' mm';
    document.getElementById('max10').textContent = freqData.maxB.toFixed(2) + ' mm';
    document.getElementById('avg10').textContent = freqData.avgB.toFixed(2) + ' mm/s';
}

// ===== Session Info =====
function updateSessionInfo(session) {
    if (session) {
        document.getElementById('currentFrequency').textContent = session.frequency + ' Hz';
        document.getElementById('sessionStatus').textContent = 'Rekaman Aktif';
        
        // Update timer (jika ada elapsed)
        if (session.elapsed !== undefined) {
            const minutes = Math.floor(session.elapsed / 60);
            const seconds = session.elapsed % 60;
            document.getElementById('timerDisplay').textContent = 
                `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
        }
    } else {
        document.getElementById('currentFrequency').textContent = '-';
        document.getElementById('sessionStatus').textContent = 'Tidak Ada Sesi';
        document.getElementById('timerDisplay').textContent = '00:00';
    }
}

// ===== Event Listeners =====
function setupEventListeners() {
    // Frequency tabs
    document.querySelectorAll('.freq-tab-btn').forEach(btn => {
        btn.addEventListener('click', function() {
            document.querySelectorAll('.freq-tab-btn').forEach(b => b.classList.remove('active'));
            this.classList.add('active');
            
            currentFrequency = parseFloat(this.dataset.freq);
            updateCharts();
            updateStats();
        });
    });
    
    // Export buttons
    document.getElementById('exportRealtimeBtn').addEventListener('click', () => {
        window.location.href = `/detector-getaran/api/export_realtime.php?laptop_id=${LAPTOP_ID}`;
    });
    
    document.getElementById('exportSessionBtn').addEventListener('click', () => {
        window.location.href = `/detector-getaran/api/export_session.php?laptop_id=${LAPTOP_ID}`;
    });
}

// ===== Initial Data Load =====
async function loadInitialData() {
    try {
        const response = await fetch(`/detector-getaran/api/tim_${LAPTOP_ID}.php`);
        const result = await response.json();
        
        if (result.status === 'success') {
            processTeamData(result);
        }
    } catch (error) {
        console.error('Error loading initial data:', error);
    }
}
