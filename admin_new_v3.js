// ===== ADMIN_NEW_V3.JS - Multi-Frequency Overlay System =====

let ws = null;
let reconnectInterval = null;
let reconnectAttempts = 0;

// Charts untuk 5 frekuensi per lantai
let chartsLantai3 = {}; // { '1.5': chartObj, '2.5': chartObj, ... }
let chartsLantai10 = {};

// Timer
let timerInterval = null;
let elapsedSeconds = 0;
let currentSessionId = null;
let currentFrequency = null;
let isRecording = false;

// Data storage per tim per frekuensi
let dataByTeamAndFreq = {
    // Structure: { laptop_id: { '1.5': {dataA: [], dataB: [], maxA: 0, maxB: 0}, ... } }
};

// Team colors (8 distinct colors)
const teamColors = [
    'rgb(255, 99, 132)',   // Tim 1 - Red
    'rgb(54, 162, 235)',   // Tim 2 - Blue
    'rgb(255, 206, 86)',   // Tim 3 - Yellow
    'rgb(75, 192, 192)',   // Tim 4 - Teal
    'rgb(153, 102, 255)',  // Tim 5 - Purple
    'rgb(255, 159, 64)',   // Tim 6 - Orange
    'rgb(199, 199, 199)',  // Tim 7 - Gray
    'rgb(83, 102, 255)'    // Tim 8 - Indigo
];

const teamNames = ['Tim 1', 'Tim 2', 'Tim 3', 'Tim 4', 'Tim 5', 'Tim 6', 'Tim 7', 'Tim 8'];

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    initializeDataStructure();
    initCharts();
    connectWebSocket();
    setupEventListeners();
    initStatsTable();
});

// ===== DATA STRUCTURE =====
function initializeDataStructure() {
    for (let laptopId = 1; laptopId <= 8; laptopId++) {
        dataByTeamAndFreq[laptopId] = {
            '1.5': { dataA: [], dataB: [], maxA: 0, maxB: 0, avgA: 0, avgB: 0 },
            '2.5': { dataA: [], dataB: [], maxA: 0, maxB: 0, avgA: 0, avgB: 0 },
            '3.5': { dataA: [], dataB: [], maxA: 0, maxB: 0, avgA: 0, avgB: 0 },
            '4.5': { dataA: [], dataB: [], maxA: 0, maxB: 0, avgA: 0, avgB: 0 },
            '5.5': { dataA: [], dataB: [], maxA: 0, maxB: 0, avgA: 0, avgB: 0 }
        };
    }
}

// ===== WEBSOCKET =====
function connectWebSocket() {
    updateConnectionStatus('connecting');
    
    ws = new WebSocket('ws://localhost:8080');
    
    ws.onopen = () => {
        console.log('WebSocket connected');
        updateConnectionStatus('connected');
        reconnectAttempts = 0;
        
        // Request all teams data
        ws.send(JSON.stringify({ action: 'get_all' }));
        
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
                reconnectAttempts++;
                console.log(`Attempting to reconnect... ${reconnectAttempts}`);
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
        case 'all_teams':
            processAllTeamsData(message.data || message);
            break;
            
        case 'new_data':
            processNewData(message.data);
            updateAllCharts();
            updateStatsTable();
            break;
    }
}

// ===== DATA PROCESSING =====
function processAllTeamsData(data) {
    if (data.teams) {
        // Initial load - populate from database
        data.teams.forEach(teamData => {
            const laptopId = teamData.laptop_id;
            
            if (teamData.data) {
                Object.keys(teamData.data).forEach(freq => {
                    const freqData = teamData.data[freq];
                    if (dataByTeamAndFreq[laptopId] && dataByTeamAndFreq[laptopId][freq]) {
                        dataByTeamAndFreq[laptopId][freq].dataA = freqData.map(d => ({
                            time: d.relative_time || 0,
                            value: d.dista
                        }));
                        
                        dataByTeamAndFreq[laptopId][freq].dataB = freqData.map(d => ({
                            time: d.relative_time || 0,
                            value: d.distb
                        }));
                    }
                });
            }
            
            if (teamData.statistics) {
                Object.keys(teamData.statistics).forEach(freq => {
                    const stats = teamData.statistics[freq];
                    if (dataByTeamAndFreq[laptopId] && dataByTeamAndFreq[laptopId][freq]) {
                        dataByTeamAndFreq[laptopId][freq].maxA = stats.max_dista || 0;
                        dataByTeamAndFreq[laptopId][freq].maxB = stats.max_distb || 0;
                        dataByTeamAndFreq[laptopId][freq].avgA = stats.avg_dista || 0;
                        dataByTeamAndFreq[laptopId][freq].avgB = stats.avg_distb || 0;
                    }
                });
            }
        });
    }
    
    updateAllCharts();
    updateStatsTable();
}

function processNewData(newDataArray) {
    newDataArray.forEach(item => {
        const laptopId = item.laptop_id;
        const freq = parseFloat(item.frequency).toFixed(1);
        
        if (!dataByTeamAndFreq[laptopId] || !dataByTeamAndFreq[laptopId][freq]) return;
        
        const teamFreqData = dataByTeamAndFreq[laptopId][freq];
        
        // Add data points
        teamFreqData.dataA.push({
            time: item.relative_time || 0,
            value: parseFloat(item.dista)
        });
        
        teamFreqData.dataB.push({
            time: item.relative_time || 0,
            value: parseFloat(item.distb)
        });
        
        // Update max
        const absA = Math.abs(item.dista);
        const absB = Math.abs(item.distb);
        
        if (absA > teamFreqData.maxA) teamFreqData.maxA = absA;
        if (absB > teamFreqData.maxB) teamFreqData.maxB = absB;
        
        // Limit data points (max 600)
        if (teamFreqData.dataA.length > 600) teamFreqData.dataA.shift();
        if (teamFreqData.dataB.length > 600) teamFreqData.dataB.shift();
    });
}

// ===== CHARTS INITIALIZATION =====
function initCharts() {
    const frequencies = ['1.5', '2.5', '3.5', '4.5', '5.5'];
    
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
            legend: { 
                display: true,
                position: 'top',
                labels: {
                    boxWidth: 15,
                    font: { size: 10 }
                }
            },
            tooltip: {
                callbacks: {
                    label: (context) => {
                        const label = context.dataset.label || '';
                        const value = context.parsed.y.toFixed(2);
                        return `${label}: ${value} mm`;
                    }
                }
            }
        }
    };
    
    // Initialize Lantai 3 charts
    frequencies.forEach(freq => {
        const canvasId = `chartLantai3_Freq${freq.replace('.', '')}`;
        const ctx = document.getElementById(canvasId).getContext('2d');
        
        chartsLantai3[freq] = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: [],
                datasets: [] // Will be populated dynamically
            },
            options: commonOptions
        });
    });
    
    // Initialize Lantai 10 charts
    frequencies.forEach(freq => {
        const canvasId = `chartLantai10_Freq${freq.replace('.', '')}`;
        const ctx = document.getElementById(canvasId).getContext('2d');
        
        chartsLantai10[freq] = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: [],
                datasets: [] // Will be populated dynamically
            },
            options: commonOptions
        });
    });
}

// ===== CHARTS UPDATE =====
function updateAllCharts() {
    const frequencies = ['1.5', '2.5', '3.5', '4.5', '5.5'];
    
    frequencies.forEach(freq => {
        updateChart(chartsLantai3[freq], freq, 'A');
        updateChart(chartsLantai10[freq], freq, 'B');
    });
}

function updateChart(chart, frequency, building) {
    // Building: 'A' = Lantai 3 (dista), 'B' = Lantai 10 (distb)
    
    // Find max time across all teams for this frequency
    let maxTime = 0;
    for (let laptopId = 1; laptopId <= 8; laptopId++) {
        const data = building === 'A' ? 
            dataByTeamAndFreq[laptopId][frequency].dataA :
            dataByTeamAndFreq[laptopId][frequency].dataB;
        
        if (data.length > 0) {
            const teamMaxTime = Math.max(...data.map(d => d.time));
            if (teamMaxTime > maxTime) maxTime = teamMaxTime;
        }
    }
    
    // Generate time labels
    const timeLabels = [];
    for (let t = 0; t <= maxTime; t += 0.1) {
        timeLabels.push(t.toFixed(1));
    }
    
    // Find global max displacement for highlight
    let globalMaxValue = 0;
    let globalMaxTeam = null;
    
    for (let laptopId = 1; laptopId <= 8; laptopId++) {
        const maxVal = building === 'A' ?
            dataByTeamAndFreq[laptopId][frequency].maxA :
            dataByTeamAndFreq[laptopId][frequency].maxB;
        
        if (maxVal > globalMaxValue) {
            globalMaxValue = maxVal;
            globalMaxTeam = laptopId;
        }
    }
    
    // Build datasets for 8 teams
    const datasets = [];
    
    for (let laptopId = 1; laptopId <= 8; laptopId++) {
        const data = building === 'A' ?
            dataByTeamAndFreq[laptopId][frequency].dataA :
            dataByTeamAndFreq[laptopId][frequency].dataB;
        
        const values = data.map(d => d.value);
        const isMaxTeam = (laptopId === globalMaxTeam);
        const opacity = isMaxTeam ? 1.0 : 0.2; // 100% for max team, 20% for others
        
        const color = teamColors[laptopId - 1];
        const rgbaColor = color.replace('rgb', 'rgba').replace(')', `, ${opacity})`);
        
        datasets.push({
            label: teamNames[laptopId - 1] + (isMaxTeam ? ` ★ MAX: ${globalMaxValue.toFixed(2)}mm` : ''),
            data: values,
            backgroundColor: rgbaColor,
            borderColor: color,
            borderWidth: isMaxTeam ? 2 : 1,
            barThickness: 2,
            categoryPercentage: 0.8,
            barPercentage: 1.0
        });
    }
    
    chart.data.labels = timeLabels;
    chart.data.datasets = datasets;
    chart.update('none');
}

// ===== STATS TABLE =====
function initStatsTable() {
    const tbody = document.getElementById('statsTableBody');
    tbody.innerHTML = '';
    
    for (let i = 1; i <= 8; i++) {
        const row = document.createElement('tr');
        row.innerHTML = `
            <td><strong>${teamNames[i-1]}</strong></td>
            <td id="realtime3_${i}">0.00 mm</td>
            <td id="max3_${i}">0.00 mm</td>
            <td id="avg3_${i}">0.00 mm/s</td>
            <td id="realtime10_${i}">0.00 mm</td>
            <td id="max10_${i}">0.00 mm</td>
            <td id="avg10_${i}">0.00 mm/s</td>
        `;
        tbody.appendChild(row);
    }
}

function updateStatsTable() {
    const currentFreq = currentFrequency || '1.5';
    
    for (let i = 1; i <= 8; i++) {
        const teamData = dataByTeamAndFreq[i][currentFreq];
        
        // Lantai 3 (A)
        const realtimeA = teamData.dataA.length > 0 ? 
            teamData.dataA[teamData.dataA.length - 1].value : 0;
        document.getElementById(`realtime3_${i}`).textContent = realtimeA.toFixed(2) + ' mm';
        document.getElementById(`max3_${i}`).textContent = teamData.maxA.toFixed(2) + ' mm';
        document.getElementById(`avg3_${i}`).textContent = teamData.avgA.toFixed(2) + ' mm/s';
        
        // Lantai 10 (B)
        const realtimeB = teamData.dataB.length > 0 ?
            teamData.dataB[teamData.dataB.length - 1].value : 0;
        document.getElementById(`realtime10_${i}`).textContent = realtimeB.toFixed(2) + ' mm';
        document.getElementById(`max10_${i}`).textContent = teamData.maxB.toFixed(2) + ' mm';
        document.getElementById(`avg10_${i}`).textContent = teamData.avgB.toFixed(2) + ' mm/s';
    }
}

// ===== TIMER CONTROL =====
function setupEventListeners() {
    document.getElementById('startBtn').addEventListener('click', startRecording);
    document.getElementById('stopBtn').addEventListener('click', stopRecording);
    document.getElementById('exportRealtimeBtn').addEventListener('click', exportRealtime);
    document.getElementById('exportSessionBtn').addEventListener('click', exportSession);
}

async function startRecording() {
    const frequency = parseFloat(document.getElementById('frequencySelect').value);
    
    try {
        const response = await fetch('/detector-getaran/api/start_timer.php', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ frequency: frequency })
        });
        
        const result = await response.json();
        
        if (result.status === 'success') {
            currentSessionId = result.session_id;
            currentFrequency = frequency.toFixed(1);
            isRecording = true;
            elapsedSeconds = 0;
            
            // UI changes
            document.getElementById('startBtn').style.display = 'none';
            document.getElementById('stopBtn').style.display = 'inline-flex';
            document.getElementById('frequencySelect').disabled = true;
            
            // Start timer
            timerInterval = setInterval(() => {
                elapsedSeconds++;
                updateTimerDisplay();
                
                // Auto-stop at 60 seconds
                if (elapsedSeconds >= 60) {
                    stopRecording(true);
                }
            }, 1000);
            
            console.log(`Recording started: Frequency ${frequency} Hz, Session ID ${currentSessionId}`);
        } else {
            alert('Error starting recording: ' + result.message);
        }
    } catch (error) {
        console.error('Error starting recording:', error);
        alert('Failed to start recording');
    }
}

async function stopRecording(autoStopped = false) {
    if (!isRecording) return;
    
    clearInterval(timerInterval);
    
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
            isRecording = false;
            
            // UI reset
            document.getElementById('startBtn').style.display = 'inline-flex';
            document.getElementById('stopBtn').style.display = 'none';
            document.getElementById('frequencySelect').disabled = false;
            
            const stopType = autoStopped ? 'Auto-stopped' : 'Manually stopped';
            console.log(`${stopType} recording: Session ${currentSessionId}, Duration: ${elapsedSeconds}s`);
            
            if (autoStopped) {
                alert(`Session ${currentFrequency} Hz selesai (60 detik). Silakan pilih frekuensi berikutnya.`);
            }
        }
    } catch (error) {
        console.error('Error stopping recording:', error);
    }
}

function updateTimerDisplay() {
    const minutes = Math.floor(elapsedSeconds / 60);
    const seconds = elapsedSeconds % 60;
    document.getElementById('timerDisplay').textContent = 
        `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
}

// ===== EXPORT =====
function exportRealtime() {
    window.location.href = '/detector-getaran/api/export_realtime.php';
}

function exportSession() {
    window.location.href = '/detector-getaran/api/export_session.php';
}
