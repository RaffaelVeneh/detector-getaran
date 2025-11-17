// ===== ADMIN_NEW_V3.JS - Multi-Frequency Overlay System =====

let ws = null;
let reconnectInterval = null;
let reconnectAttempts = 0;

// Charts untuk 5 frekuensi per lantai
let chartsLantai3 = {}; // { '1.5': chartObj, '2.5': chartObj, ... }
let chartsLantai10 = {};

// Timer (naik dari 0 ke 60)
let timerInterval = null;
let elapsedSeconds = 0;
let currentSessionId = null;
let currentFrequency = null;
let currentCategory = 'baja'; // Default: Baja
let isRecording = false;

// Freeze state - admin controls freeze for all clients
let dataFrozenGlobal = false;
let frozenSnapshot = null;

// Data storage per kategori, per tim, per frekuensi
let dataByTeamAndFreq = {
    'baja': {}, // { 1: { '1.5': {dataA: [], dataB: []}, ... }, 2: {...}, ... }
    'beton': {} // { 1: { '1.5': {dataA: [], dataB: []}, ... }, 2: {...}, ... }
};

// Team colors (8 distinct colors) - sama untuk Baja dan Beton
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

// Team names per kategori (akan di-load dari API)
let teamNamesBaja = [
    'Universitas Udayana_Abhipraya',
    'Politeknik Negeri Semarang_Tim Seismastha',
    'Universitas Jember_Alvandaru Team',
    'Politeknik Astra_Astura Team',
    'Institut Teknologi Sepuluh Nopember_Askara Team',
    'Institut Teknologi Nasional Malang_TRISHA ABINAWA',
    'Universitas Brawijaya_SRIKANDI',
    'Universitas Negeri Malang_Warock'
];

let teamNamesBeton = [
    'Politeknik Negeri Bandung_Wirajaya Palawiri',
    'Universitas Warmadewa_EL-BADAK Wanskuy',
    'Institut Teknologi Sepuluh Nopember_Indestrukta Team',
    'Universitas Muhammadiyah Malang_AKTARA',
    'universitas Brawijaya_K-300',
    'Universitas Negeri Yogyakarta_Sahakarya',
    'Politeknik Negeri Malang_Akral Baswara',
    'Universitas Negeri Jakarta_Astungkara'
];

// Active team names (based on current category)
let teamNames = teamNamesBaja; // Default: Baja

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    initializeDataStructure();
    initCharts();
    connectWebSocket();
    setupEventListeners();
    initStatsTable();
    // Set timer display ke 01:00 saat page load
    updateTimerDisplay();
});

// ===== DATA STRUCTURE =====
function initializeDataStructure() {
    // Initialize untuk kedua kategori (Baja dan Beton)
    ['baja', 'beton'].forEach(category => {
        dataByTeamAndFreq[category] = {};
        for (let laptopId = 1; laptopId <= 8; laptopId++) {
            dataByTeamAndFreq[category][laptopId] = {
                '1.5': { dataA: [], dataB: [], maxA: 0, maxB: 0, avgA: 0, avgB: 0 },
                '2.5': { dataA: [], dataB: [], maxA: 0, maxB: 0, avgA: 0, avgB: 0 },
                '3.5': { dataA: [], dataB: [], maxA: 0, maxB: 0, avgA: 0, avgB: 0 },
                '4.5': { dataA: [], dataB: [], maxA: 0, maxB: 0, avgA: 0, avgB: 0 },
                '5.5': { dataA: [], dataB: [], maxA: 0, maxB: 0, avgA: 0, avgB: 0 }
            };
        }
    });
}

// ===== WEBSOCKET =====
function connectWebSocket() {
    updateConnectionStatus('connecting');
    
    // Gunakan hostname dari URL saat ini (support localhost, IP, dan mDNS)
    const wsHost = window.location.hostname || 'localhost';
    const wsUrl = `ws://${wsHost}:8080`;
    console.log(`🔌 Connecting to WebSocket: ${wsUrl}`);
    
    ws = new WebSocket(wsUrl);
    
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
            statusEl.className = 'connection-status connected';
            break;
        case 'connecting':
            statusEl.innerHTML = '<span class="status-dot connecting"></span> Connecting...';
            statusEl.className = 'connection-status connecting';
            break;
        case 'disconnected':
            statusEl.innerHTML = '<span class="status-dot disconnected"></span> Disconnected';
            statusEl.className = 'connection-status disconnected';
            break;
        case 'error':
            statusEl.innerHTML = '<span class="status-dot error"></span> Error';
            statusEl.className = 'connection-status error';
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
            
        case 'session_started':
            // Sinkronkan admin dengan broadcast session start
            handleSessionStartedBroadcast(message);
            break;
            
        case 'session_stopped':
            // Sinkronkan admin dengan broadcast session stop
            handleSessionStoppedBroadcast(message);
            break;
    }
}

// Handle session_started broadcast (untuk sinkronisasi)
function handleSessionStartedBroadcast(data) {
    // Jika admin yang start, skip (sudah dihandle di startRecording)
    if (isRecording) return;
    
    console.log('Received session_started broadcast:', data);
    
    // Update state dari broadcast
    currentSessionId = data.session_id;
    currentFrequency = String(data.frequency);
    isRecording = true;
    
    // Update category jika berbeda
    if (data.category && data.category !== currentCategory) {
        currentCategory = data.category;
        document.getElementById('categorySelect').value = data.category;
        teamNames = currentCategory === 'baja' ? teamNamesBaja : teamNamesBeton;
        updateStatsTable();
    }
    
    // Sinkronkan timer dengan elapsed_seconds dari broadcast
    elapsedSeconds = Math.floor(data.elapsed_seconds || 0);
    updateTimerDisplay();
    
    // Update UI
    document.getElementById('startBtn').style.display = 'none';
    document.getElementById('stopBtn').style.display = 'inline-flex';
    document.getElementById('categorySelect').disabled = true;
    document.getElementById('frequencySelect').disabled = true;
    document.getElementById('frequencySelect').value = data.frequency;
    
    // Start timer (sinkron dengan broadcast)
    if (timerInterval) clearInterval(timerInterval);
    timerInterval = setInterval(() => {
        elapsedSeconds++;
        updateTimerDisplay();
        
        if (elapsedSeconds >= 60) {
            stopRecording(true);
        }
    }, 1000);
    
    console.log(`Admin synced: Session ${currentSessionId}, Freq ${currentFrequency} Hz, Category ${currentCategory}, Elapsed ${elapsedSeconds}s`);
}

// Handle session_stopped broadcast (untuk sinkronisasi)
function handleSessionStoppedBroadcast(data) {
    // Jika admin yang stop, skip (sudah dihandle di stopRecording)
    if (!isRecording) return;
    
    console.log('Received session_stopped broadcast');
    
    isRecording = false;
    clearInterval(timerInterval);
    
    // Reset UI
    document.getElementById('startBtn').style.display = 'inline-flex';
    document.getElementById('stopBtn').style.display = 'none';
    document.getElementById('categorySelect').disabled = false;
    document.getElementById('frequencySelect').disabled = false;
    
    // Reset timer ke 00:00
    elapsedSeconds = 0;
    updateTimerDisplay();
    
    console.log('Admin synced: Session stopped');
}

// ===== DATA PROCESSING =====
function processAllTeamsData(data) {
    if (data.teams) {
        // Initial load - populate from database
        console.log('[processAllTeamsData] Processing teams:', data.teams.length);
        
        data.teams.forEach(teamData => {
            const laptopId = teamData.laptop_id;
            const teamCategory = teamData.category || currentCategory; // Ambil category dari data
            
            console.log(`[processAllTeamsData] Team ${laptopId}, Category: ${teamCategory}`);
            
            if (teamData.data) {
                Object.keys(teamData.data).forEach(freq => {
                    const freqData = teamData.data[freq];
                    // FIX: Gunakan struktur dataByTeamAndFreq[category][laptopId][freq]
                    if (dataByTeamAndFreq[teamCategory] && 
                        dataByTeamAndFreq[teamCategory][laptopId] && 
                        dataByTeamAndFreq[teamCategory][laptopId][freq]) {
                        
                        dataByTeamAndFreq[teamCategory][laptopId][freq].dataA = freqData.map(d => ({
                            time: d.relative_time || 0,
                            value: d.dista
                        }));
                        
                        dataByTeamAndFreq[teamCategory][laptopId][freq].dataB = freqData.map(d => ({
                            time: d.relative_time || 0,
                            value: d.distb
                        }));
                        
                        console.log(`[processAllTeamsData] Team ${laptopId}, Freq ${freq}: dataA=${freqData.length}, dataB=${freqData.length}`);
                    } else {
                        console.warn(`[processAllTeamsData] Structure not found: category=${teamCategory}, laptop=${laptopId}, freq=${freq}`);
                    }
                });
            }
            
            if (teamData.statistics) {
                Object.keys(teamData.statistics).forEach(freq => {
                    const stats = teamData.statistics[freq];
                    // FIX: Gunakan struktur dataByTeamAndFreq[category][laptopId][freq]
                    if (dataByTeamAndFreq[teamCategory] && 
                        dataByTeamAndFreq[teamCategory][laptopId] && 
                        dataByTeamAndFreq[teamCategory][laptopId][freq]) {
                        
                        dataByTeamAndFreq[teamCategory][laptopId][freq].maxA = stats.max_dista || 0;
                        dataByTeamAndFreq[teamCategory][laptopId][freq].maxB = stats.max_distb || 0;
                        dataByTeamAndFreq[teamCategory][laptopId][freq].avgA = stats.avg_dista || 0;
                        dataByTeamAndFreq[teamCategory][laptopId][freq].avgB = stats.avg_distb || 0;
                        
                        console.log(`[processAllTeamsData] Team ${laptopId}, Freq ${freq} Stats: maxA=${stats.max_dista}, maxB=${stats.max_distb}, avgA=${stats.avg_dista}, avgB=${stats.avg_distb}`);
                    }
                });
            }
        });
    }
    
    console.log('[processAllTeamsData] Complete. Updating charts and table...');
    updateAllCharts();
    updateStatsTable();
}

function processNewData(newDataArray) {
    newDataArray.forEach(item => {
        const laptopId = item.laptop_id;
        const freq = parseFloat(item.frequency).toFixed(1);
        const itemCategory = item.category || currentCategory; // Fallback ke currentCategory
        
        // Filter: Hanya proses data yang sesuai dengan kategori aktif
        if (itemCategory !== currentCategory) return;
        
        if (!dataByTeamAndFreq[currentCategory][laptopId] || !dataByTeamAndFreq[currentCategory][laptopId][freq]) return;
        
        const teamFreqData = dataByTeamAndFreq[currentCategory][laptopId][freq];
        
        // PERBAIKI: pastikan relative_time selalu ada dan valid
        const relTime = parseFloat(item.relative_time || 0);
        
        // Add data points
        teamFreqData.dataA.push({
            time: relTime,
            value: parseFloat(item.dista || 0)
        });
        
        teamFreqData.dataB.push({
            time: relTime,
            value: parseFloat(item.distb || 0)
        });
        
        // Update max
        const absA = Math.abs(item.dista || 0);
        const absB = Math.abs(item.distb || 0);
        
        if (absA > teamFreqData.maxA) teamFreqData.maxA = absA;
        if (absB > teamFreqData.maxB) teamFreqData.maxB = absB;
        
        // Update average (hitung dari semua data yang ada)
        const allAbsA = teamFreqData.dataA.map(d => Math.abs(parseFloat(d.value || 0)));
        const allAbsB = teamFreqData.dataB.map(d => Math.abs(parseFloat(d.value || 0)));
        
        const sumA = allAbsA.reduce((sum, v) => sum + v, 0);
        const sumB = allAbsB.reduce((sum, v) => sum + v, 0);
        
        teamFreqData.avgA = allAbsA.length > 0 ? (sumA / allAbsA.length) : 0;
        teamFreqData.avgB = allAbsB.length > 0 ? (sumB / allAbsB.length) : 0;
        
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
        maintainAspectRatio: false,  // Chart akan mengikuti tinggi container
        animation: false,
        aspectRatio: 2.5,  // Ratio lebih lebar untuk lebih banyak space vertikal
        scales: {
            x: {
                min: 0,
                max: 60,
                ticks: {
                    stepSize: 5,
                    callback: function(value) {
                        return value + 's';
                    }
                },
                title: { display: true, text: 'Waktu (detik)' }
            },
            y: {
                type: 'linear',
                // FIXED SCALE: -100mm sampai +100mm (konsisten dengan user page)
                min: -100,
                max: 100,
                ticks: {
                    autoSkip: true,
                    maxTicksLimit: 11,
                    font: { size: 13 },
                    padding: 8,
                    callback: function(value) {
                        return value.toFixed(0) + ' mm';
                    }
                },
                title: {
                    display: true,
                    text: 'Displacement (mm)',
                    font: { size: 13, weight: 'bold' }
                },
                grid: {
                    color: function(context) {
                        // Garis putus-putus di Y=0
                        if (context.tick.value === 0) {
                            return 'rgba(0, 0, 0, 0.3)';
                        }
                        return 'rgba(0, 0, 0, 0.1)';
                    },
                    lineWidth: function(context) {
                        // Garis Y=0 lebih tebal
                        if (context.tick.value === 0) {
                            return 2;
                        }
                        return 1;
                    },
                    borderDash: function(context) {
                        // Garis Y=0 putus-putus [5, 5]
                        if (context.tick.value === 0) {
                            return [5, 5];
                        }
                        return [];
                    },
                    drawBorder: true,
                    borderColor: 'rgba(0, 0, 0, 0.3)',
                    borderWidth: 2
                },
                beginAtZero: true,
                grace: '10%'  // 10% padding untuk visibility
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
                        const sign = value >= 0 ? '+' : '';
                        return `${label}: ${sign}${value} mm`;
                    }
                }
            }
        },
        layout: {
            padding: {
                left: 15,   // Extra padding untuk Y-axis labels
                right: 15,
                top: 30,    // Padding atas lebih besar agar legend tidak ketutup
                bottom: 15
            }
        }
    };
    
    // Initialize Displacement Puncak charts (menggunakan distb)
    frequencies.forEach(freq => {
        const canvasId = `chartPuncak_Freq${freq.replace('.', '')}`;
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
    
    // Hanya update Displacement Puncak (distb)
    frequencies.forEach(freq => {
        updateChart(chartsLantai10[freq], freq, 'B');
    });
}

function updateChart(chart, frequency, building) {
    // Building: 'B' = Displacement Puncak (distb)
    
    // Find max time across all teams for this frequency (per kategori aktif)
    let maxTime = 0;
    for (let laptopId = 1; laptopId <= 8; laptopId++) {
        const data = building === 'A' ? 
            dataByTeamAndFreq[currentCategory][laptopId][frequency].dataA :
            dataByTeamAndFreq[currentCategory][laptopId][frequency].dataB;
        
        if (data.length > 0) {
            const teamMaxTime = Math.max(...data.map(d => parseFloat(d.time || 0)));
            if (teamMaxTime > maxTime) maxTime = teamMaxTime;
        }
    }
    
    // Generate time labels - PERBAIKI: pastikan ada label meskipun maxTime = 0
    const timeLabels = [];
    if (maxTime > 0) {
        for (let t = 0; t <= maxTime; t += 0.1) {
            timeLabels.push(t.toFixed(1));
        }
    } else {
        // Fallback jika tidak ada data dengan waktu valid
        for (let t = 0; t <= 60; t += 0.1) {
            timeLabels.push(t.toFixed(1));
        }
    }
    
    // Find global max and min displacement for highlight
    let globalMaxValue = 0;
    let globalMaxTeam = null;
    let globalMinValue = Infinity;
    let globalMinTeam = null;
    
    for (let laptopId = 1; laptopId <= 8; laptopId++) {
        const maxVal = building === 'A' ?
            dataByTeamAndFreq[currentCategory][laptopId][frequency].maxA :
            dataByTeamAndFreq[currentCategory][laptopId][frequency].maxB;
        
        // Max displacement (goyang paling besar)
        if (maxVal > globalMaxValue) {
            globalMaxValue = maxVal;
            globalMaxTeam = laptopId;
        }
        
        // Min displacement (goyang paling kecil / gedung paling stabil)
        if (maxVal < globalMinValue && maxVal > 0) {
            globalMinValue = maxVal;
            globalMinTeam = laptopId;
        }
    }
    
    // Build datasets for 8 teams
    const datasets = [];
    
    for (let laptopId = 1; laptopId <= 8; laptopId++) {
        const data = building === 'A' ?
            dataByTeamAndFreq[currentCategory][laptopId][frequency].dataA :
            dataByTeamAndFreq[currentCategory][laptopId][frequency].dataB;
        
        const values = data.map(d => parseFloat(d.value || 0)); // TIDAK di-abs untuk grafik!
        
        const isMaxTeam = (laptopId === globalMaxTeam);
        const isMinTeam = (laptopId === globalMinTeam);
        
        // Opacity: 100% untuk tim MAX, 70% untuk tim lainnya (agar lebih terlihat)
        const opacity = isMaxTeam ? 1.0 : 0.7;
        
        // Warna dasar tim (setiap tim punya warna berbeda)
        const baseColor = teamColors[laptopId - 1];
        
        // Background color (FILL): Pakai warna tim dengan opacity yang sama untuk semua nilai
        // Konversi rgb ke rgba dengan opacity
        const backgroundColor = baseColor.replace('rgb', 'rgba').replace(')', `, ${opacity})`);
        
        // Border color: Pakai warna tim yang sama dengan opacity penuh
        const borderColor = baseColor;
        
        // Label: Bintang untuk MIN (stabil), label khusus untuk MAX
        let labelText = teamNames[laptopId - 1];
        if (isMinTeam) {
            labelText += ` ★ STABIL (${globalMinValue.toFixed(2)}mm)`;
        }
        if (isMaxTeam) {
            labelText += ` | MAX: ${globalMaxValue.toFixed(2)}mm`;
        }
        
        datasets.push({
            label: labelText,
            data: values,
            backgroundColor: backgroundColor,
            borderColor: borderColor,
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
            <td id="realtimePuncak_${i}">0.00 mm</td>
            <td id="maxPuncak_${i}">0.00 mm</td>
            <td id="avgPuncak_${i}">0.00 mm</td>
        `;
        tbody.appendChild(row);
    }
}

function updateStatsTable() {
    const currentFreq = currentFrequency || '1.5';
    const tbody = document.getElementById('statsTableBody');
    
    // Update table rows (including team names)
    for (let i = 1; i <= 8; i++) {
        const teamData = dataByTeamAndFreq[currentCategory][i][currentFreq];
        
        // DEBUG: Log team data
        if (i === 1) {
            console.log(`[updateStatsTable] Team ${i}, Freq ${currentFreq}, Category ${currentCategory}:`, {
                dataA_count: teamData.dataA.length,
                dataB_count: teamData.dataB.length,
                maxA: teamData.maxA,
                maxB: teamData.maxB,
                avgA: teamData.avgA,
                avgB: teamData.avgB
            });
        }
        
        // Update team name (kolom pertama)
        const row = tbody.children[i - 1];
        if (row) {
            row.children[0].innerHTML = `<strong>${teamNames[i-1]}</strong>`;
        }
        
        // Displacement Puncak (B / distb) - Pakai Math.abs untuk statistik
        const realtimeB = teamData.dataB.length > 0 ?
            Math.abs(teamData.dataB[teamData.dataB.length - 1].value) : 0;
        document.getElementById(`realtimePuncak_${i}`).textContent = realtimeB.toFixed(2) + ' mm';
        document.getElementById(`maxPuncak_${i}`).textContent = teamData.maxB.toFixed(2) + ' mm';
        document.getElementById(`avgPuncak_${i}`).textContent = teamData.avgB.toFixed(2) + ' mm';
    }
}

// ===== TIMER CONTROL =====
function setupEventListeners() {
    document.getElementById('startBtn').addEventListener('click', startRecording);
    document.getElementById('stopBtn').addEventListener('click', stopRecording);
    document.getElementById('exportRealtimeBtn').addEventListener('click', exportRealtime);
    document.getElementById('exportSessionBtn').addEventListener('click', exportSession);
    document.getElementById('freezeDataBtn').addEventListener('click', toggleFreezeData);
    document.getElementById('clearDataBtn').addEventListener('click', clearAllData);
    
    // Category selector change event
    document.getElementById('categorySelect').addEventListener('change', handleCategoryChange);
}

function handleCategoryChange(event) {
    const newCategory = event.target.value;
    console.log(`Category changed: ${currentCategory} → ${newCategory}`);
    
    currentCategory = newCategory;
    
    // Update team names based on category
    teamNames = currentCategory === 'baja' ? teamNamesBaja : teamNamesBeton;
    
    // Update charts dengan data kategori baru
    updateAllCharts();
    
    // Update stats table
    updateStatsTable();
    
    // Broadcast category change ke semua user pages via WebSocket
    if (ws && ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify({
            type: 'category_change',
            category: currentCategory
        }));
        console.log(`Broadcasted category_change: ${currentCategory}`);
    }
}

function toggleFreezeData() {
    dataFrozenGlobal = !dataFrozenGlobal;
    
    const freezeBtn = document.getElementById('freezeDataBtn');
    
    if (dataFrozenGlobal) {
        // FREEZE: Save snapshot of all data (current category)
        frozenSnapshot = JSON.parse(JSON.stringify(dataByTeamAndFreq));
        
        // Update button UI to show frozen state
        freezeBtn.innerHTML = `
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <circle cx="12" cy="12" r="10"></circle>
                <circle cx="12" cy="12" r="3"></circle>
            </svg>
            Unfreeze All Data
        `;
        freezeBtn.classList.remove('btn-warning');
        freezeBtn.classList.add('btn-danger');
        
        // Broadcast freeze command to all clients
        if (ws && ws.readyState === WebSocket.OPEN) {
            ws.send(JSON.stringify({
                type: 'freeze_data',
                frozen: true
            }));
            console.log('Broadcasted freeze_data: true');
        }
        
        console.log('🔴 DATA FROZEN - All clients will stop accepting new data');
    } else {
        // UNFREEZE
        frozenSnapshot = null;
        
        // Update button UI to normal state
        freezeBtn.innerHTML = `
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M12 2L2 7v5c0 5.5 3.8 10.7 10 12 6.2-1.3 10-6.5 10-12V7l-10-5z"></path>
            </svg>
            Freeze All Data
        `;
        freezeBtn.classList.remove('btn-danger');
        freezeBtn.classList.add('btn-warning');
        
        // Broadcast unfreeze command
        if (ws && ws.readyState === WebSocket.OPEN) {
            ws.send(JSON.stringify({
                type: 'freeze_data',
                frozen: false
            }));
            console.log('Broadcasted freeze_data: false');
        }
        
        // Refresh all charts with live data
        updateAllCharts();
        updateStatsTable();
        
        console.log('🟢 DATA UNFROZEN - All clients resume accepting new data');
    }
}

async function clearAllData() {
    // Konfirmasi dengan user
    const confirmation = confirm(
        '⚠️ WARNING: Clear All Data\n\n' +
        'Ini akan menghapus:\n' +
        '• Semua data realtime_data\n' +
        '• Semua statistics\n' +
        '• Stop semua session aktif\n' +
        '• Clear broadcast queue\n\n' +
        'Data yang TETAP ADA:\n' +
        '• Teams (laptop_id, nama tim)\n' +
        '• Categories (Baja, Beton)\n' +
        '• Session history (status = stopped)\n\n' +
        'Lanjutkan?'
    );
    
    if (!confirmation) {
        console.log('Clear data cancelled by user');
        return;
    }
    
    const clearBtn = document.getElementById('clearDataBtn');
    const originalHTML = clearBtn.innerHTML;
    
    try {
        // Update button to show loading
        clearBtn.disabled = true;
        clearBtn.innerHTML = `
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="animation: spin 1s linear infinite;">
                <circle cx="12" cy="12" r="10"></circle>
                <path d="M12 6v6l4 2"></path>
            </svg>
            Clearing...
        `;
        
        console.log('🗑️ Clearing all data...');
        
        const response = await fetch('/detector-getaran/api/clear_data.php', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            }
        });
        
        const result = await response.json();
        
        if (result.success) {
            console.log('✅ Data cleared successfully:', result);
            
            // Clear local data structures
            for (let i = 1; i <= 8; i++) {
                if (dataByTeamAndFreq[i]) {
                    for (let freq of ['1.5', '2.5', '3.5', '4.5', '5.5']) {
                        dataByTeamAndFreq[i][freq].dataA = [];
                        dataByTeamAndFreq[i][freq].dataB = [];
                        dataByTeamAndFreq[i][freq].maxA = 0;
                        dataByTeamAndFreq[i][freq].maxB = 0;
                        dataByTeamAndFreq[i][freq].avgA = 0;
                        dataByTeamAndFreq[i][freq].avgB = 0;
                    }
                }
            }
            
            // Clear frozen snapshot if exists
            frozenSnapshot = null;
            dataFrozenGlobal = false;
            
            // Reset freeze button (with null check)
            const freezeBtn = document.getElementById('freezeDataBtn');
            if (freezeBtn) {
                freezeBtn.innerHTML = `
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <path d="M12 2L2 7v5c0 5.5 3.8 10.7 10 12 6.2-1.3 10-6.5 10-12V7l-10-5z"></path>
                    </svg>
                    Freeze All Data
                `;
                freezeBtn.classList.remove('btn-danger');
                freezeBtn.classList.add('btn-warning');
            }
            
            // Reset timer display (with null check)
            const timerDisplay = document.getElementById('timerDisplay');
            if (timerDisplay) {
                timerDisplay.textContent = '00:00';
            }
            
            // Show/hide buttons (with null check)
            const startBtn = document.getElementById('startBtn');
            const stopBtn = document.getElementById('stopBtn');
            if (startBtn) startBtn.style.display = 'inline-flex';
            if (stopBtn) stopBtn.style.display = 'none';
            
            // Update charts and stats
            updateAllCharts();
            updateStatsTable();
            
            // Broadcast clear command to all clients
            if (ws && ws.readyState === WebSocket.OPEN) {
                ws.send(JSON.stringify({
                    type: 'clear_data',
                    message: 'All data cleared by admin'
                }));
                console.log('Broadcasted clear_data command');
            }
            
            // Show success message
            alert(
                '✅ Data Cleared Successfully!\n\n' +
                `Deleted:\n` +
                `• ${result.deleted.realtime_data} realtime data\n` +
                `• ${result.deleted.statistics} statistics\n` +
                `• ${result.deleted.stopped_sessions} active sessions\n\n` +
                'Sistem siap untuk percobaan baru!'
            );
            
        } else {
            throw new Error(result.message || 'Failed to clear data');
        }
        
    } catch (error) {
        console.error('❌ Clear data error:', error);
        alert('❌ Gagal menghapus data!\n\nError: ' + error.message);
    } finally {
        // Restore button
        clearBtn.disabled = false;
        clearBtn.innerHTML = originalHTML;
    }
}

async function startRecording() {
    const frequency = parseFloat(document.getElementById('frequencySelect').value);
    
    console.log('🎬 Starting recording...');
    console.log('   - Frequency:', frequency, 'Hz');
    console.log('   - Category:', currentCategory);
    
    try {
        console.log('📡 Calling API: /detector-getaran/api/start_timer.php');
        const response = await fetch('/detector-getaran/api/start_timer.php', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
                frequency: frequency,
                category: currentCategory  // Include category
            })
        });
        
        console.log('📡 API Response status:', response.status);
        const result = await response.json();
        console.log('📦 API Result:', result);
        
        if (result.status === 'success') {
            currentSessionId = result.session_id;
            currentFrequency = frequency.toFixed(1);
            isRecording = true;
            
            // --- TIMER NAIK 0 KE 60 ---
            elapsedSeconds = 0; // Mulai dari 0
            updateTimerDisplay(); // Tampilkan 00:00
            
            // UI changes
            document.getElementById('startBtn').style.display = 'none';
            document.getElementById('stopBtn').style.display = 'inline-flex';
            document.getElementById('categorySelect').disabled = true;  // Disable category saat recording
            document.getElementById('frequencySelect').disabled = true;
            
            // ✅ BROADCAST session_started ke semua user pages via WebSocket
            if (ws && ws.readyState === WebSocket.OPEN) {
                ws.send(JSON.stringify({
                    type: 'broadcast',
                    message: {
                        type: 'session_started',
                        session_id: currentSessionId,
                        frequency: frequency,
                        category: currentCategory,
                        started_at: result.started_at,
                        elapsed_seconds: 0,
                        timestamp: new Date().toISOString()
                    }
                }));
                console.log('✅ Broadcasted session_started via WebSocket');
            }
            
            // Start timer (naik dari 0 ke 60)
            timerInterval = setInterval(() => {
                elapsedSeconds++;
                updateTimerDisplay();
                
                // Auto-stop at 60
                if (elapsedSeconds >= 60) {
                    stopRecording(true); // Kirim true untuk auto-stopped
                }
            }, 1000);
            
            console.log(`✅ Recording started: Frequency ${frequency} Hz, Category ${currentCategory}, Session ID ${currentSessionId}`);
        } else {
            alert('Error starting recording: ' + result.message);
        }
    } catch (error) {
        console.error('Error starting recording:', error);
        alert('Failed to start recording');
    }
}

async function stopRecording(autoStopped = false) {
    if (!isRecording && !autoStopped) return; // Jangan stop jika sudah stop, kecuali auto-stop
    
    isRecording = false;
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
            // ✅ BROADCAST session_stopped ke semua user pages via WebSocket
            if (ws && ws.readyState === WebSocket.OPEN) {
                ws.send(JSON.stringify({
                    type: 'broadcast',
                    message: {
                        type: 'session_stopped',
                        session_id: currentSessionId,
                        timestamp: new Date().toISOString()
                    }
                }));
                console.log('✅ Broadcasted session_stopped via WebSocket');
            }
            
            // UI reset
            document.getElementById('startBtn').style.display = 'inline-flex';
            document.getElementById('stopBtn').style.display = 'none';
            document.getElementById('categorySelect').disabled = false;  // Enable category
            document.getElementById('frequencySelect').disabled = false;
            
            // Reset timer display ke 00:00
            elapsedSeconds = 0;
            updateTimerDisplay();
            
            const stopType = autoStopped ? 'Auto-stopped' : 'Manually stopped';
            console.log(`${stopType} recording: Session ${currentSessionId}`);
            
            if (autoStopped) {
                alert(`Session ${currentFrequency} Hz selesai (60 detik). Silakan pilih frekuensi berikutnya.`);
            }
        }
    } catch (error) {
        console.error('Error stopping recording:', error);
    }
}

function updateTimerDisplay() {
    // Timer naik dari 0 ke 60 (format MM:SS)
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
