// ============================================
// TIM CLIENT V3 - PERBAIKAN (SINKRON DENGAN WEBSOCKET_SERVER.PHP)
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
let reconnectInterval = null;

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
    // Panggil loadInitialData untuk mengisi data historis jika server WS offline
    loadInitialData();
});

// ============================================
// CHART INITIALIZATION
// ============================================

function initCharts() {
    const frequencies = ['1.5', '2.5', '3.5', '4.5', '5.5'];
    
    // Opsi umum untuk semua chart
    const commonOptions = {
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
                },
                ticks: {
                    maxTicksLimit: 20, // Batasi jumlah label waktu
                    autoSkip: true
                }
            }
        },
        plugins: {
            legend: {
                display: false, // Sembunyikan legenda default
            },
            tooltip: {
                callbacks: {
                    label: function(context) {
                        return `Displacement: ${context.parsed.y.toFixed(2)} mm`;
                    }
                }
            }
        }
    };
    
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
                        borderWidth: 1, // Buat bar lebih tipis
                        barThickness: 3,
                        maxBarThickness: 6
                    }]
                },
                options: commonOptions
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
                        borderWidth: 1,
                        barThickness: 3,
                        maxBarThickness: 6
                    }]
                },
                options: commonOptions
            });
        }
    });
}

// ============================================
// WEBSOCKET CONNECTION (FUNGSI UTAMA DIPERBAIKI)
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
        
        if (reconnectInterval) {
            clearInterval(reconnectInterval);
            reconnectInterval = null;
        }
        
        // Minta data tim ini (opsional, loadInitialData() juga melakukan ini via HTTP)
        ws.send(JSON.stringify({
            action: 'get_team',
            laptop_id: LAPTOP_ID
        }));
    };
    
    ws.onmessage = (event) => {
        try {
            const message = JSON.parse(event.data);
            
            // Logika baru untuk mem-parsing siaran 'new_data' dari server
            if (message.type === 'new_data' && Array.isArray(message.data)) {
                
                // 1. Loop melalui setiap item data dalam array siaran
                message.data.forEach(item => {
                    
                    // 2. Filter hanya data untuk LAPTOP_ID tim ini
                    if (item.laptop_id === LAPTOP_ID) {
                        
                        // 3. Periksa status sesi dari item data
                        if (item.session_status === 'running' && !sessionActive) {
                            // Sesi baru saja dimulai atau kita baru saja terhubung
                            console.log('Sesi terdeteksi: RUNNING');
                            handleSessionStart(item);
                        } else if (item.session_status !== 'running' && sessionActive) {
                            // Sesi baru saja berhenti
                            console.log('Sesi terdeteksi: STOPPED');
                            handleSessionStop(item);
                        }
                        
                        // 4. Jika sesi aktif, perbarui timer
                        if (sessionActive) {
                            // Sinkronkan timer lokal dengan 'relative_time' dari server
                            timerSeconds = Math.floor(item.relative_time || 0);
                        }
                        
                        // 5. Kirim data ke fungsi handler grafik
                        handleNewData(item);
                    }
                });
            } 
            // Tangani data awal (jika server mengirim 'team_data')
            else if (message.type === 'team_data' && message.laptop_id === LAPTOP_ID) {
                console.log('Menerima data historis dari WebSocket');
                handleInitialData(message.data);
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
        
        // Hentikan timer jika koneksi terputus
        if (sessionActive) {
            handleSessionStop({});
        }
        
        // Coba hubungkan kembali
        if (!reconnectInterval) {
            reconnectInterval = setTimeout(connectWebSocket, 3000);
        }
    };
}

// ============================================
// SESSION HANDLERS (DIPERBAIKI)
// ============================================

function handleSessionStart(data) {
    if (sessionActive) return; // Sudah berjalan
    
    sessionActive = true;
    sessionId = data.session_id;
    currentFrequency = String(data.frequency);
    
    // Sinkronkan timer dengan server
    timerSeconds = Math.floor(data.relative_time || 0);
    
    // Update UI
    document.getElementById('currentFrequency').textContent = `${currentFrequency} Hz`;
    const statusEl = document.getElementById('sessionStatus');
    statusEl.textContent = 'Recording';
    statusEl.className = 'status-recording';
    
    // Hapus data frekuensi sebelumnya (jika ada)
    if (dataByFreq[currentFrequency]) {
        dataByFreq[currentFrequency].dataA = [];
        dataByFreq[currentFrequency].dataB = [];
        // Reset statistik juga
        dataByFreq[currentFrequency].maxA = 0;
        dataByFreq[currentFrequency].maxB = 0;
        dataByFreq[currentFrequency].avgA = 0;
        dataByFreq[currentFrequency].avgB = 0;
    }
    
    // Mulai timer display
    startTimerDisplay();
    
    console.log(`Sesi dimulai: ${sessionId}, Frekuensi: ${currentFrequency} Hz, Waktu: ${timerSeconds}s`);
}

function handleSessionStop(data) {
    if (!sessionActive) return; // Sudah berhenti
    
    sessionActive = false;
    
    // Update UI
    const statusEl = document.getElementById('sessionStatus');
    statusEl.textContent = 'Stopped';
    statusEl.className = 'status-stopped';
    
    // Hentikan timer
    stopTimerDisplay();
    
    console.log('Sesi berhenti');
}

function startTimerDisplay() {
    if (timerInterval) clearInterval(timerInterval);
    
    // Update tampilan timer segera
    updateTimerDisplayDOM(); 
    
    timerInterval = setInterval(() => {
        timerSeconds++;
        updateTimerDisplayDOM();
    }, 1000);
}

function updateTimerDisplayDOM() {
    const minutes = Math.floor(timerSeconds / 60);
    const seconds = timerSeconds % 60;
    document.getElementById('timerDisplay').textContent = 
        `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
}

function stopTimerDisplay() {
    if (timerInterval) {
        clearInterval(timerInterval);
        timerInterval = null;
    }
    // Jangan reset timerSeconds, biarkan menunjukkan waktu akhir
}

// ============================================
// DATA HANDLERS (DIPERBAIKI)
// ============================================

function handleInitialData(data) {
    // Fungsi ini untuk memuat data historis (misal dari HTTP fallback)
    if (!data || data.length === 0) return;
    
    // Hapus data lama
    Object.keys(dataByFreq).forEach(freq => {
        dataByFreq[freq].dataA = [];
        dataByFreq[freq].dataB = [];
    });
    
    data.forEach(point => {
        const freq = String(point.frequency);
        if (dataByFreq[freq]) {
            // Gunakan NAMA FIELD YANG BENAR dari server ('relative_time', 'dista', 'distb')
            dataByFreq[freq].dataA.push({
                time: point.relative_time,
                value: point.dista
            });
            dataByFreq[freq].dataB.push({
                time: point.relative_time,
                value: point.distb
            });
        }
    });
    
    // Update semua chart
    Object.keys(dataByFreq).forEach(freq => {
        updateChart(chartsLantai3[freq], freq, 'A');
        updateChart(chartsLantai10[freq], freq, 'B');
    });
}

function handleNewData(data) {
    // data = 1 item dari array 'new_data'
    if (!data) return;
    
    const freq = String(data.frequency);
    
    // Tambahkan ke struktur data
    if (dataByFreq[freq]) {
        // Gunakan NAMA FIELD YANG BENAR ('relative_time', 'dista', 'distb')
        dataByFreq[freq].dataA.push({
            time: data.relative_time,
            value: data.dista
        });
        dataByFreq[freq].dataB.push({
            time: data.relative_time,
            value: data.distb
        });
        
        // Update chart untuk frekuensi ini
        updateChart(chartsLantai3[freq], freq, 'A');
        updateChart(chartsLantai10[freq], freq, 'B');
    }
}

// ============================================
// CHART UPDATE (DIPERBAIKI)
// ============================================

function updateChart(chart, frequency, building) {
    if (!chart || !dataByFreq[frequency]) return;
    
    const freqData = dataByFreq[frequency];
    const dataPoints = building === 'A' ? freqData.dataA : freqData.dataB;
    
    if (dataPoints.length === 0) {
        // Jika tidak ada data, kosongkan chart
        chart.data.labels = [];
        chart.data.datasets[0].data = [];
        chart.update('none');
        updateStatsDisplay(frequency, building); // Reset statistik ke 0
        return;
    }
    
    // Batasi jumlah data di chart (misal 200 poin terakhir) agar tidak lambat
    const maxDataPoints = 200;
    const startIndex = Math.max(0, dataPoints.length - maxDataPoints);
    const chartDataPoints = dataPoints.slice(startIndex);
    
    // Siapkan data chart
    const labels = chartDataPoints.map(d => (d.time || 0).toFixed(1));
    const values = chartDataPoints.map(d => d.value);
    
    // Hitung statistik dari SEMUA data, bukan hanya yang di-chart
    const allValues = dataPoints.map(d => d.value);
    const allAbsValues = allValues.map(v => Math.abs(v));
    
    const maxValue = allAbsValues.length > 0 ? Math.max(...allAbsValues) : 0;
    
    // Logika AVG (mm/s) dari Stored Procedure:
    // Rata-rata dari simpangan > 2mm / durasi total
    const largeDisplacements = allAbsValues.filter(v => v > 2);
    const sumLargeDisplacements = largeDisplacements.reduce((sum, v) => sum + v, 0);
    const totalDuration = dataPoints.length > 0 ? dataPoints[dataPoints.length - 1].time : 1;
    const avgValue = (totalDuration > 0) ? (sumLargeDisplacements / totalDuration) : 0;
    
    // Update statistik yang tersimpan
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
    chart.update('none'); // Update tanpa animasi
    
    // Update tampilan statistik
    updateStatsDisplay(frequency, building);
}

function updateStatsDisplay(frequency, building) {
    const freqData = dataByFreq[frequency];
    const freqKey = frequency.replace('.', '');
    const buildingKey = building === 'A' ? '3' : '10';
    
    // Dapatkan nilai terbaru (realtime)
    const dataPoints = building === 'A' ? freqData.dataA : freqData.dataB;
    const latestValue = dataPoints.length > 0 ? dataPoints[dataPoints.length - 1].value : 0;
    
    // Update elemen DOM
    const realtimeEl = document.getElementById(`realtime${buildingKey}_${freqKey}`);
    const maxEl = document.getElementById(`max${buildingKey}_${freqKey}`);
    const avgEl = document.getElementById(`avg${buildingKey}_${freqKey}`);
    
    if (realtimeEl) realtimeEl.textContent = `${latestValue.toFixed(2)} mm`;
    if (maxEl) maxEl.textContent = `${(building === 'A' ? freqData.maxA : freqData.maxB).toFixed(2)} mm`;
    if (avgEl) avgEl.textContent = `${(building === 'A' ? freqData.avgA : freqData.avgB).toFixed(2)} mm/s`;
}

// ============================================
// EXPORT FUNCTIONS (Path API diperbaiki)
// ============================================

function setupExportButtons() {
    document.getElementById('exportRealtimeBtn').addEventListener('click', exportRealtime);
    document.getElementById('exportSessionBtn').addEventListener('click', exportSession);
}

async function exportRealtime() {
    // Pastikan path API benar (menggunakan /api/)
    const url = `/detector-getaran/api/export_realtime.php?laptop_id=${LAPTOP_ID}`;
    window.open(url, '_blank');
}

async function exportSession() {
    // Pastikan path API benar (menggunakan /api/)
    // Kita mungkin tidak memiliki sessionId jika sesi belum dimulai,
    // jadi kita biarkan API mengambil sesi terakhir berdasarkan laptop_id
    const url = `/detector-getaran/api/export_session.php?laptop_id=${LAPTOP_ID}`;
    window.open(url, '_blank');
}

// ============================================
// INITIAL DATA LOAD (HTTP FALLBACK)
// ============================================

async function loadInitialData() {
    // Ini adalah fallback jika WebSocket gagal atau untuk data historis
    try {
        // Path API harus benar (menggunakan /api/ dan tim_X.php)
        const response = await fetch(`/detector-getaran/api/tim_${LAPTOP_ID}.php`);
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        const result = await response.json();
        
        if (result.status === 'success') {
            console.log('Memuat data historis via HTTP API');
            
            // Proses data historis (data per frekuensi)
            if (result.data) {
                Object.keys(result.data).forEach(freq => {
                    const freqData = result.data[freq];
                    if (dataByFreq[freq] && freqData.length > 0) {
                        dataByFreq[freq].dataA = freqData.map(d => ({
                            time: d.relative_time || 0,
                            value: d.dista
                        }));
                        
                        dataByFreq[freq].dataB = freqData.map(d => ({
                            time: d.relative_time || 0,
                            value: d.distb
                        }));
                    }
                });
            }
            
            // Proses statistik
            if (result.statistics) {
                Object.keys(result.statistics).forEach(freq => {
                    const stats = result.statistics[freq];
                    if (dataByFreq[freq]) {
                        dataByFreq[freq].maxA = stats.max_dista || 0;
                        dataByFreq[freq].maxB = stats.max_distb || 0;
                        dataByFreq[freq].avgA = stats.avg_dista || 0;
                        dataByFreq[freq].avgB = stats.avg_distb || 0;
                    }
                });
            }
            
            // Update semua chart dengan data historis
            Object.keys(dataByFreq).forEach(freq => {
                updateChart(chartsLantai3[freq], freq, 'A');
                updateChart(chartsLantai10[freq], freq, 'B');
            });
            
            // Periksa apakah ada sesi yang sedang berjalan saat memuat
            if (result.current_session && result.current_session.status === 'running') {
                const sessionData = {
                    ...result.current_session,
                    session_id: result.current_session.id,
                    relative_time: result.current_session.elapsed || 0
                };
                handleSessionStart(sessionData);
            }
        }
    } catch (error) {
        console.error('Error loading initial data via HTTP:', error);
    }
}