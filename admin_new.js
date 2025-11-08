// ===== ADMIN_NEW.JS - WebSocket + Stacked Charts =====

let ws = null;
let reconnectInterval = null;
let chartLantai3 = null;
let chartLantai10 = null;

let currentFrequency = 1.5;
let currentSessionId = null;
let timerInterval = null;
let elapsedSeconds = 0;

// Data storage per frequency per team
let dataByFrequency = {
    '1.5': {}, '2.5': {}, '3.5': {}, '4.5': {}, '5.5': {}
};

// Team colors (8 distinct colors)
const teamColors = [
    { bg: 'rgba(255, 99, 132, 0.2)', border: 'rgb(255, 99, 132)' },   // Red
    { bg: 'rgba(54, 162, 235, 0.2)', border: 'rgb(54, 162, 235)' },   // Blue
    { bg: 'rgba(255, 206, 86, 0.2)', border: 'rgb(255, 206, 86)' },   // Yellow
    { bg: 'rgba(75, 192, 192, 0.2)', border: 'rgb(75, 192, 192)' },   // Green
    { bg: 'rgba(153, 102, 255, 0.2)', border: 'rgb(153, 102, 255)' }, // Purple
    { bg: 'rgba(255, 159, 64, 0.2)', border: 'rgb(255, 159, 64)' },   // Orange
    { bg: 'rgba(199, 199, 199, 0.2)', border: 'rgb(199, 199, 199)' }, // Grey
    { bg: 'rgba(83, 102, 255, 0.2)', border: 'rgb(83, 102, 255)' }    // Indigo
];

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
        
        // Request all teams data
        ws.send(JSON.stringify({ action: 'get_all' }));
        
        // Clear reconnect interval
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
        
        // Auto reconnect setelah 3 detik
        if (!reconnectInterval) {
            reconnectInterval = setInterval(() => {
                console.log('Attempting to reconnect...');
                connectWebSocket();
            }, 3000);
        }
    };
}

function updateConnectionStatus(status) {
    const statusEl = document.getElementById('wsStatus');
    const dot = statusEl.querySelector('.status-dot');
    
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
            updateStatsTable(message.data);
            break;
            
        case 'new_data':
            processNewData(message.data);
            updateCharts();
            break;
            
        case 'all_teams':
            updateStatsTable(message.data);
            break;
    }
}

// ===== Data Processing =====
function processNewData(newDataArray) {
    newDataArray.forEach(item => {
        const freq = parseFloat(item.frequency).toFixed(1);
        const laptop_id = item.laptop_id;
        
        if (!dataByFrequency[freq]) return;
        if (!dataByFrequency[freq][laptop_id]) {
            dataByFrequency[freq][laptop_id] = {
                nama_tim: item.nama_tim,
                dataA: [],
                dataB: [],
                maxA: 0,
                maxB: 0,
                avgA: 0,
                avgB: 0
            };
        }
        
        const teamData = dataByFrequency[freq][laptop_id];
        
        // Add data point
        teamData.dataA.push({
            time: item.relative_time || 0,
            value: parseFloat(item.dista)
        });
        
        teamData.dataB.push({
            time: item.relative_time || 0,
            value: parseFloat(item.distb)
        });
        
        // Update max
        const absA = Math.abs(item.dista);
        const absB = Math.abs(item.distb);
        
        if (absA > teamData.maxA) teamData.maxA = absA;
        if (absB > teamData.maxB) teamData.maxB = absB;
        
        // Limit data points
        if (teamData.dataA.length > 600) teamData.dataA.shift();
        if (teamData.dataB.length > 600) teamData.dataB.shift();
    });
}

// ===== Charts Initialization =====
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
            legend: { display: true, position: 'top' },
            tooltip: {
                callbacks: {
                    label: function(context) {
                        return context.dataset.label + ': ' + context.parsed.y.toFixed(2) + ' mm';
                    }
                }
            }
        }
    };
    
    // Chart Lantai 3
    const ctx3 = document.getElementById('chartLantai3').getContext('2d');
    chartLantai3 = new Chart(ctx3, {
        type: 'bar',
        data: { labels: [], datasets: [] },
        options: commonOptions
    });
    
    // Chart Lantai 10
    const ctx10 = document.getElementById('chartLantai10').getContext('2d');
    chartLantai10 = new Chart(ctx10, {
        type: 'bar',
        data: { labels: [], datasets: [] },
        options: commonOptions
    });
}

function updateCharts() {
    const freq = currentFrequency.toFixed(1);
    const freqData = dataByFrequency[freq];
    
    if (!freqData) return;
    
    // Prepare datasets untuk chart
    const datasets3 = [];
    const datasets10 = [];
    let allTimes = new Set();
    
    // Collect all unique times
    Object.keys(freqData).forEach(laptop_id => {
        const teamData = freqData[laptop_id];
        teamData.dataA.forEach(d => allTimes.add(d.time.toFixed(1)));
    });
    
    const sortedTimes = Array.from(allTimes).sort((a, b) => parseFloat(a) - parseFloat(b));
    const labels = sortedTimes.map(t => parseFloat(t).toFixed(1));
    
    // Build datasets for each team
    Object.keys(freqData).forEach((laptop_id, index) => {
        const teamData = freqData[laptop_id];
        const color = teamColors[index % teamColors.length];
        
        // Dataset untuk lantai 3
        const dataA = sortedTimes.map(time => {
            const point = teamData.dataA.find(d => d.time.toFixed(1) === time);
            return point ? point.value : null;
        });
        
        datasets3.push({
            label: teamData.nama_tim,
            data: dataA,
            backgroundColor: color.bg,
            borderColor: color.border,
            borderWidth: 1,
            barThickness: 2,
            categoryPercentage: 0.9,
            barPercentage: 1.0
        });
        
        // Dataset untuk lantai 10
        const dataB = sortedTimes.map(time => {
            const point = teamData.dataB.find(d => d.time.toFixed(1) === time);
            return point ? point.value : null;
        });
        
        datasets10.push({
            label: teamData.nama_tim,
            data: dataB,
            backgroundColor: color.bg,
            borderColor: color.border,
            borderWidth: 1,
            barThickness: 2,
            categoryPercentage: 0.9,
            barPercentage: 1.0
        });
    });
    
    // Update charts
    chartLantai3.data.labels = labels;
    chartLantai3.data.datasets = datasets3;
    chartLantai3.update('none');
    
    chartLantai10.data.labels = labels;
    chartLantai10.data.datasets = datasets10;
    chartLantai10.update('none');
}

// ===== Stats Table =====
function updateStatsTable(teamsData) {
    const tbody = document.getElementById('statsTableBody');
    tbody.innerHTML = '';
    
    teamsData.forEach((team, index) => {
        const row = document.createElement('tr');
        row.innerHTML = `
            <td>${team.laptop_id || index + 1}</td>
            <td><strong>${team.nama_tim}</strong></td>
            <td>${(team.realtime?.dista || 0).toFixed(2)} mm</td>
            <td>${(team.statistics?.max_dista || 0).toFixed(2)} mm</td>
            <td>${(team.statistics?.avg_dista || 0).toFixed(2)} mm/s</td>
            <td>${(team.realtime?.distb || 0).toFixed(2)} mm</td>
            <td>${(team.statistics?.max_distb || 0).toFixed(2)} mm</td>
            <td>${(team.statistics?.avg_distb || 0).toFixed(2)} mm/s</td>
        `;
        tbody.appendChild(row);
    });
}

// ===== Timer Controls =====
async function startTimer() {
    const frequency = parseFloat(document.getElementById('frequencySelect').value);
    
    try {
        const response = await fetch('/detector-getaran/api/start_timer.php', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ frequency })
        });
        
        const result = await response.json();
        
        if (result.status === 'success') {
            currentSessionId = result.session_id;
            currentFrequency = frequency;
            elapsedSeconds = 0;
            
            document.getElementById('startTimerBtn').disabled = true;
            document.getElementById('stopTimerBtn').disabled = false;
            document.getElementById('frequencySelect').disabled = true;
            document.getElementById('sessionStatus').textContent = `Rekaman aktif - Frekuensi ${frequency} Hz`;
            
            // Start timer display
            timerInterval = setInterval(() => {
                elapsedSeconds++;
                updateTimerDisplay();
                
                // Auto-stop at 60 seconds
                if (elapsedSeconds >= 60) {
                    stopTimer(true);
                }
            }, 1000);
            
            console.log('Timer started:', result);
        } else {
            alert('Gagal start timer: ' + result.message);
        }
    } catch (error) {
        console.error('Error starting timer:', error);
        alert('Error: ' + error.message);
    }
}

async function stopTimer(autoStopped = false) {
    try {
        const response = await fetch('/detector-getaran/api/stop_timer.php', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
                session_id: currentSessionId,
                auto_stopped: autoStopped
            })
        });
        
        const result = await response.json();
        
        if (result.status === 'success') {
            clearInterval(timerInterval);
            
            document.getElementById('startTimerBtn').disabled = false;
            document.getElementById('stopTimerBtn').disabled = true;
            document.getElementById('frequencySelect').disabled = false;
            document.getElementById('sessionStatus').textContent = `Sesi selesai - Durasi: ${result.duration_seconds} detik`;
            
            if (autoStopped) {
                alert(`Timer otomatis berhenti di 60 detik untuk frekuensi ${result.frequency} Hz`);
            }
            
            console.log('Timer stopped:', result);
        } else {
            alert('Gagal stop timer: ' + result.message);
        }
    } catch (error) {
        console.error('Error stopping timer:', error);
        alert('Error: ' + error.message);
    }
}

function updateTimerDisplay() {
    const minutes = Math.floor(elapsedSeconds / 60);
    const seconds = elapsedSeconds % 60;
    document.getElementById('timerDisplay').textContent = 
        `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
}

// ===== Event Listeners =====
function setupEventListeners() {
    document.getElementById('startTimerBtn').addEventListener('click', startTimer);
    document.getElementById('stopTimerBtn').addEventListener('click', () => stopTimer(false));
    
    // Frequency tabs
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.addEventListener('click', function() {
            document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
            this.classList.add('active');
            
            currentFrequency = parseFloat(this.dataset.freq);
            updateCharts();
        });
    });
    
    // Export buttons
    document.getElementById('exportRealtimeBtn').addEventListener('click', () => {
        window.location.href = '/detector-getaran/api/export_realtime.php';
    });
    
    document.getElementById('exportSessionBtn').addEventListener('click', () => {
        window.location.href = '/detector-getaran/api/export_session.php';
    });
}

// ===== Initial Data Load =====
async function loadInitialData() {
    try {
        const response = await fetch('/detector-getaran/api/all.php');
        const result = await response.json();
        
        if (result.status === 'success') {
            updateStatsTable(result.data);
        }
    } catch (error) {
        console.error('Error loading initial data:', error);
    }
}
