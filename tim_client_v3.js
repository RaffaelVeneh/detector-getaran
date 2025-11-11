 // ============================================
// TIM CLIENT V3 - PERBAIKAN (SINKRON DENGAN WEBSOCKET_SERVER.PHP)
// ============================================

// Data structure for this team's 5 frequencies
// SIMPLE: Data akan di-reset ketika ganti category
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
let currentCategory = 'baja'; // Default category
let sessionActive = false;
let sessionId = null;
let timerInterval = null;
let elapsedSeconds = 0; // Timer naik dari 0 ke 60

// Freeze state - controlled by admin
let dataFrozen = false;
let frozenData = null;

// Color for this team (blue theme)
const teamColor = 'rgb(54, 162, 235)';

// ============================================
// INITIALIZATION
// ============================================

document.addEventListener('DOMContentLoaded', () => {
    console.log(`🔧 Initializing Team ${LAPTOP_ID} page...`);
    initCharts();
    setupExportButtons();
    // Set timer display ke 00:00 saat page load
    updateTimerDisplayDOM();
    // Load team name berdasarkan kategori default
    loadTeamName(LAPTOP_ID, currentCategory);
    
    // Connect WebSocket (will auto-check for active session after connected)
    connectWebSocket();
});

// ============================================
// CHART INITIALIZATION
// ============================================

function initCharts() {
    const frequencies = ['1.5', '2.5', '3.5', '4.5', '5.5'];
    
    // Opsi umum untuk semua chart
    const commonOptions = {
        responsive: true,
        maintainAspectRatio: false,  // Chart akan mengikuti tinggi container
        animation: false,
        aspectRatio: 1,  // Override aspect ratio
        scales: {
            y: {
                type: 'linear',
                // FIXED SCALE: -100mm sampai +100mm (sesuai requirements)
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
                    color: 'rgba(0, 0, 0, 0.1)',
                    drawBorder: true,
                    borderColor: 'rgba(0, 0, 0, 0.3)',
                    borderWidth: 2
                },
                beginAtZero: true,
                grace: '5%'  // 5% padding untuk visibility
            },
            x: {
                min: 0,
                max: 60,
                ticks: {
                    stepSize: 5,
                    callback: function(value) {
                        return value + 's';
                    }
                },
                title: {
                    display: true,
                    text: 'Waktu (detik)',
                    font: { size: 12 }
                },
                grid: {
                    display: true,
                    color: 'rgba(0, 0, 0, 0.05)'
                }
            }
        },
        plugins: {
            legend: {
                display: false, // Sembunyikan legenda default
            },
            tooltip: {
                callbacks: {
                    title: function(context) {
                        return `Waktu: ${context[0].parsed.x.toFixed(1)}s`;
                    },
                    label: function(context) {
                        const value = context.parsed.y;
                        const sign = value >= 0 ? '+' : '';
                        return `Displacement: ${sign}${value.toFixed(2)} mm`;
                    }
                }
            }
        },
        layout: {
            padding: {
                left: 10,   // Extra padding untuk Y-axis labels
                right: 10,
                top: 10,
                bottom: 10
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
                            if (!context.parsed) return 'rgba(54, 162, 235, 0.7)';
                            const value = context.parsed.y;
                            // Biru untuk positif (naik), Merah untuk negatif (turun)
                            return value >= 0 
                                ? 'rgba(54, 162, 235, 0.7)'  // Biru
                                : 'rgba(255, 99, 132, 0.7)';  // Merah
                        },
                        borderColor: context => {
                            if (!context.parsed) return 'rgb(54, 162, 235)';
                            const value = context.parsed.y;
                            return value >= 0 
                                ? 'rgb(54, 162, 235)'       // Biru
                                : 'rgb(255, 99, 132)';       // Merah
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
    
    // Initialize Lantai 10 charts
    frequencies.forEach(freq => {
        const canvasId = `chartPuncak_Freq${freq.replace('.', '')}`;
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
                            if (!context.parsed) return 'rgba(54, 162, 235, 0.7)';
                            const value = context.parsed.y;
                            // Biru untuk positif (naik), Merah untuk negatif (turun)
                            return value >= 0 
                                ? 'rgba(54, 162, 235, 0.7)'  // Biru
                                : 'rgba(255, 99, 132, 0.7)';  // Merah
                        },
                        borderColor: context => {
                            if (!context.parsed) return 'rgb(54, 162, 235)';
                            const value = context.parsed.y;
                            return value >= 0 
                                ? 'rgb(54, 162, 235)'       // Biru
                                : 'rgb(255, 99, 132)';       // Merah
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
    statusEl.innerHTML = '<span class="status-dot connecting"></span> Connecting...';
    statusEl.className = 'connection-status connecting';
    
    // Gunakan hostname dari URL saat ini (support localhost, IP, dan mDNS)
    const wsHost = window.location.hostname || 'localhost';
    const wsUrl = `ws://${wsHost}:8080`;
    console.log(`🔌 Connecting to WebSocket: ${wsUrl}`);
    
    ws = new WebSocket(wsUrl);
    
    ws.onopen = () => {
        console.log('✅ WebSocket Connected');
        statusEl.innerHTML = '<span class="status-dot connected"></span> Connected';
        statusEl.className = 'connection-status connected';
        
        if (reconnectInterval) {
            clearInterval(reconnectInterval);
            reconnectInterval = null;
        }
        
        // Setelah connect, cek apakah ada active session yang sedang berjalan
        // (untuk case user buka page SETELAH admin start)
        setTimeout(() => {
            console.log('🔍 Checking for active session after WebSocket connected...');
            checkActiveSession();
        }, 500);
    };
    
    ws.onmessage = (event) => {
        try {
            const message = JSON.parse(event.data);
            console.log('📨 WebSocket message received:', message.type, message);
            
            // Handle category_change event (dari admin)
            if (message.type === 'category_change') {
                console.log('Category changed:', message.category);
                currentCategory = message.category;
                updateCategoryDisplay(message.category);
                loadTeamName(LAPTOP_ID, message.category);
                return;
            }
            
            // Handle session_started event (broadcast dari server)
            if (message.type === 'session_started') {
                console.log('🎬 Session started event received:', message);
                console.log(`   - Frequency: ${message.frequency} Hz`);
                console.log(`   - Category: ${message.category}`);
                console.log(`   - Elapsed: ${message.elapsed_seconds}s`);
                
                const sessionData = {
                    session_id: message.session_id,
                    frequency: message.frequency,
                    category: message.category || 'baja',
                    session_status: 'running',
                    elapsed_seconds: message.elapsed_seconds || 0,
                    relative_time: message.elapsed_seconds || 0
                };
                handleSessionStart(sessionData);
                return;
            }
            
            // Handle session_stopped event
            if (message.type === 'session_stopped') {
                console.log('Session stopped event received');
                handleSessionStop({});
                return;
            }
            
            // Handle freeze_data event (dari admin)
            if (message.type === 'freeze_data') {
                dataFrozen = message.frozen;
                console.log(`🔔 Data ${dataFrozen ? 'FROZEN' : 'UNFROZEN'} by admin`);
                
                if (dataFrozen) {
                    // Save snapshot of current data
                    frozenData = JSON.parse(JSON.stringify(dataByFreq));
                    console.log('📸 Data snapshot saved');
                } else {
                    // Clear snapshot
                    frozenData = null;
                    
                    // Refresh all charts with live data
                    ['1.5', '2.5', '3.5', '4.5', '5.5'].forEach(freq => {
                        // Lantai 3 removed
                        updateChart(chartsLantai10[freq], freq, 'B');
                    });
                    console.log('🔄 Charts refreshed with live data');
                }
                return;
            }
            
            // Logika baru untuk mem-parsing siaran 'new_data' dari server
            if (message.type === 'new_data' && Array.isArray(message.data)) {
                
                // 1. Loop melalui setiap item data dalam array siaran
                message.data.forEach(item => {
                    
                    // 2. Filter hanya data untuk LAPTOP_ID tim ini
                    if (item.laptop_id === LAPTOP_ID) {
                        
                        // 3. Jika sesi aktif, perbarui timer berdasarkan relative_time (naik 0→60)
                        if (sessionActive && item.relative_time !== null && item.relative_time !== undefined) {
                            const serverTime = Math.min(60, Math.floor(item.relative_time));
                            // Sinkronkan timer dengan server (update setiap data baru)
                            if (elapsedSeconds !== serverTime) {
                                elapsedSeconds = serverTime;
                                updateTimerDisplayDOM();
                                console.log(`⏱️ Timer sync: ${elapsedSeconds}s (from server data)`);
                            }
                        }
                        
                        // 4. Kirim data ke fungsi handler grafik
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
        statusEl.innerHTML = '<span class="status-dot error"></span> Error';
        statusEl.className = 'connection-status error';
    };
    
    ws.onclose = () => {
        console.log('WebSocket Disconnected');
        statusEl.innerHTML = '<span class="status-dot disconnected"></span> Disconnected';
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
    if (sessionActive) {
        console.log('⚠️ Session already active, skipping duplicate start');
        return; // Already running
    }
    
    console.log('🚀 Starting session...', data);
    sessionActive = true;
    sessionId = data.session_id;
    currentFrequency = String(data.frequency);
    
    // Update category dan load team name yang sesuai
    if (data.category) {
        console.log(`📋 Session started - Category: ${data.category}, Frequency: ${currentFrequency} Hz`);
        currentCategory = data.category;
        updateCategoryDisplay(data.category);
        loadTeamName(LAPTOP_ID, data.category); // Load nama tim sesuai category
    }
    
    // --- TIMER SINKRON DENGAN ADMIN (0 KE 60) ---
    // Gunakan elapsed_seconds dari broadcast admin
    elapsedSeconds = Math.floor(data.elapsed_seconds || data.relative_time || 0);
    console.log(`⏱️ Timer tersinkronisasi: ${elapsedSeconds}s`);
    
    // Update timer display segera
    updateTimerDisplayDOM();
    
    // Update UI - Set frekuensi aktif dengan benar
    const freqEl = document.getElementById('currentFrequency');
    if (freqEl) {
        freqEl.textContent = `${currentFrequency} Hz`;
        console.log(`✅ Frekuensi aktif UI updated: ${currentFrequency} Hz`);
    } else {
        console.error('❌ Element currentFrequency not found!');
    }
    
    const statusEl = document.getElementById('sessionStatus');
    if (statusEl) {
        statusEl.textContent = 'Recording';
        statusEl.className = 'status-recording';
        console.log(`✅ Status UI updated: Recording`);
    } else {
        console.error('❌ Element sessionStatus not found!');
    }
    
    // Hapus data frekuensi sebelumnya (opsional - bisa dikomentari jika ingin keep history)
    if (dataByFreq[currentFrequency]) {
        dataByFreq[currentFrequency].dataA = [];
        dataByFreq[currentFrequency].dataB = [];
        dataByFreq[currentFrequency].maxA = 0;
        dataByFreq[currentFrequency].maxB = 0;
        dataByFreq[currentFrequency].avgA = 0;
        dataByFreq[currentFrequency].avgB = 0;
    }
    
    // Mulai timer display (lokal increment, akan di-sync oleh WebSocket data)
    startTimerDisplay();
    
    console.log(`✅ Sesi dimulai: ${sessionId}, Frekuensi: ${currentFrequency} Hz, Category: ${currentCategory}, Timer: ${elapsedSeconds}s`);
}

function handleSessionStop(data) {
    if (!sessionActive) return; // Already stopped
    
    sessionActive = false;
    
    // Update UI - Reset frekuensi aktif ke strip
    const freqEl = document.getElementById('currentFrequency');
    if (freqEl) {
        freqEl.textContent = '-';
    }
    
    const statusEl = document.getElementById('sessionStatus');
    if (statusEl) {
        statusEl.textContent = 'Stopped';
        statusEl.className = 'status-stopped';
    }
    
    // Hentikan timer
    stopTimerDisplay();
    
    // Reset timer ke 00:00 saat berhenti (siap untuk sesi berikutnya)
    elapsedSeconds = 0;
    updateTimerDisplayDOM();
    
    console.log('Sesi berhenti');
}

// Timer naik dari 0 ke 60 detik (sinkron dengan WebSocket)
function startTimerDisplay() {
    if (timerInterval) clearInterval(timerInterval);
    
    // Update tampilan timer segera dengan waktu yang disinkronkan
    updateTimerDisplayDOM(); 
    
    // Timer increment lokal setiap detik, tapi akan disinkronkan oleh data dari WebSocket
    timerInterval = setInterval(() => {
        if (sessionActive) {
            elapsedSeconds++;
            // Batas maksimal 60 detik
            if (elapsedSeconds > 60) {
                elapsedSeconds = 60;
            }
            updateTimerDisplayDOM();
        }
    }, 1000); // Update setiap 1 detik
}

// Update display timer (format MM:SS)
function updateTimerDisplayDOM() {
    const minutes = Math.floor(elapsedSeconds / 60);
    const seconds = elapsedSeconds % 60;
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
    const frequencies = ['1.5', '2.5', '3.5', '4.5', '5.5'];
    frequencies.forEach(freq => {
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
    frequencies.forEach(freq => {
        // Lantai 3 removed
        updateChart(chartsLantai10[freq], freq, 'B');
    });
}

function handleNewData(data) {
    // data = 1 item dari array 'new_data'
    if (!data) return;
    
    // If data is frozen by admin, ignore new data
    if (dataFrozen) {
        console.log('❄️ Data frozen - ignoring new data');
        return;
    }
    
    const freq = String(data.frequency);
    
    // Validasi: pastikan frekuensi dari data sesuai dengan session aktif
    if (sessionActive && freq !== currentFrequency) {
        console.warn(`⚠️ Data frequency mismatch: received ${freq} Hz, expected ${currentFrequency} Hz`);
        // Masih simpan data untuk frekuensi tersebut, tapi ini indikasi ada masalah sync
    }
    
    // Tambahkan ke struktur data (simple structure)
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
        
        // Update chart langsung
        // Lantai 3 removed
        updateChart(chartsLantai10[freq], freq, 'B');
    }
}

// ============================================
// CHART UPDATE (DIPERBAIKI)

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
    
    // Batasi jumlah data di chart (misal 600 poin agar capture semua 60s @ ~10Hz)
    const maxDataPoints = 600;
    const startIndex = Math.max(0, dataPoints.length - maxDataPoints);
    const chartDataPoints = dataPoints.slice(startIndex);
    
    // Siapkan data chart - JANGAN abs() untuk grafik (biarkan positif-negatif)
    const labels = chartDataPoints.map(d => {
        const timeVal = parseFloat(d.time || 0);
        return timeVal.toFixed(1);
    });
    const values = chartDataPoints.map(d => parseFloat(d.value || 0)); // TIDAK di-abs!
    
    // Hitung statistik dari SEMUA data (pakai abs untuk Max/Avg)
    const allValues = dataPoints.map(d => parseFloat(d.value || 0));
    const allAbsValues = allValues.map(v => Math.abs(v)); // Abs untuk statistik
    
    const maxValue = allAbsValues.length > 0 ? Math.max(...allAbsValues) : 0;
    
    // Logika AVG yang DISEDERHANAKAN:
    // Average dari SEMUA nilai absolute (bukan hanya > 2mm)
    const sumAllAbsValues = allAbsValues.reduce((sum, v) => sum + v, 0);
    const avgValue = allAbsValues.length > 0 ? (sumAllAbsValues / allAbsValues.length) : 0;
    
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
    
    // Ambil nilai mentah dari data terbaru
    const rawLatestValue = dataPoints.length > 0 ? dataPoints[dataPoints.length - 1].value : 0;
    
    // Statistik: Pakai Math.abs (magnitude getaran, selalu positif)
    const latestValue = Math.abs(parseFloat(rawLatestValue || 0));
    
    // Update elemen DOM
    const realtimeEl = document.getElementById(`realtime${buildingKey}_${freqKey}`);
    const maxEl = document.getElementById(`max${buildingKey}_${freqKey}`);
    const avgEl = document.getElementById(`avg${buildingKey}_${freqKey}`);
    
    // Statistik Realtime (pakai abs)
    if (realtimeEl) realtimeEl.textContent = `${latestValue.toFixed(2)} mm`;
    
    // Statistik Max dan Average (sudah abs dari chart)
    const maxVal = parseFloat(building === 'A' ? freqData.maxA : freqData.maxB || 0);
    const avgVal = parseFloat(building === 'A' ? freqData.avgA : freqData.avgB || 0);

    if (maxEl) maxEl.textContent = `${maxVal.toFixed(2)} mm`;
    if (avgEl) avgEl.textContent = `${avgVal.toFixed(2)} mm/s`;
}

// ============================================
// EXPORT FUNCTIONS (Path API diperbaiki)
// ============================================

function setupExportButtons() {
    document.getElementById('exportRealtimeBtn').addEventListener('click', exportRealtime);
    document.getElementById('exportSessionBtn').addEventListener('click', exportSession);
}

function setupFreezeButton() {
    const freezeBtn = document.getElementById('freezeBtn');
    if (!freezeBtn) return;
    
    freezeBtn.addEventListener('click', () => {
        dataFrozen = !dataFrozen;
        
        if (dataFrozen) {
            // FREEZE: Simpan snapshot data saat ini
            frozenData = JSON.parse(JSON.stringify(dataByFreq));
            freezeBtn.innerHTML = `
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <polygon points="5 3 19 12 5 21 5 3"></polygon>
                </svg>
                Unfreeze Data
            `;
            freezeBtn.classList.remove('btn-warning');
            freezeBtn.classList.add('btn-danger');
            console.log('Data FROZEN - Ignoring new updates');
        } else {
            // UNFREEZE: Kembali ke live data
            frozenData = null;
            freezeBtn.innerHTML = `
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M2 7l10 5 10-5-10-5-10 5z"></path>
                    <path d="M2 12l10 5 10-5"></path>
                    <path d="M2 17l10 5 10-5"></path>
                </svg>
                Freeze Data
            `;
            freezeBtn.classList.remove('btn-danger');
            freezeBtn.classList.add('btn-warning');
            
            // Refresh charts dengan live data
            const frequencies = ['1.5', '2.5', '3.5', '4.5', '5.5'];
            frequencies.forEach(freq => {
                // Lantai 3 removed
                updateChart(chartsLantai10[freq], freq, 'B');
            });
            console.log('Data UNFROZEN - Receiving live updates');
        }
    });
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
    console.log('🔍 loadInitialData() called for Team', LAPTOP_ID);
    try {
        // Path API harus benar (menggunakan /api/ dan tim_X.php)
        const url = `/detector-getaran/api/tim_${LAPTOP_ID}.php`;
        console.log('📡 Fetching from:', url);
        
        const response = await fetch(url);
        console.log('📡 Response status:', response.status);
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        const result = await response.json();
        console.log('📦 API Response:', result);
        
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
            
            // Update semua chart dengan data historis - only for current category
            const frequencies = ['1.5', '2.5', '3.5', '4.5', '5.5'];
            frequencies.forEach(freq => {
                // Lantai 3 removed
                updateChart(chartsLantai10[freq], freq, 'B');
            });
            
            // Periksa apakah ada sesi yang sedang berjalan saat memuat
            if (result.current_session) {
                console.log('✅ Found current_session:', result.current_session);
                if (result.current_session.status === 'running') {
                    console.log('🔄 Catching up to running session...');
                    console.log('   - Session ID:', result.current_session.id);
                    console.log('   - Frequency:', result.current_session.frequency, 'Hz');
                    console.log('   - Category:', result.current_session.category);
                    console.log('   - Elapsed:', result.current_session.elapsed, 'seconds');
                    
                    const sessionData = {
                        session_id: result.current_session.id,
                        frequency: result.current_session.frequency,
                        category: result.current_session.category || 'baja',
                        session_status: 'running',
                        elapsed_seconds: result.current_session.elapsed || 0,
                        relative_time: result.current_session.elapsed || 0
                    };
                    
                    console.log('📞 Calling handleSessionStart with:', sessionData);
                    handleSessionStart(sessionData);
                } else {
                    console.log('ℹ️ Session exists but status is:', result.current_session.status);
                }
            } else {
                console.log('ℹ️ No active session found');
            }
        }
    } catch (error) {
        console.error('Error loading initial data:', error);
    }
}

// ============================================
// CATEGORY FUNCTIONS
// ============================================

function updateCategoryDisplay(category) {
    const categoryLabel = document.getElementById('categoryLabel');
    if (categoryLabel) {
        categoryLabel.textContent = category === 'baja' ? 'Baja' : 'Beton';
    }
    
    // CLEAR DATA jika ganti category dan update charts
    ['1.5', '2.5', '3.5', '4.5', '5.5'].forEach(freq => {
        dataByFreq[freq].dataA = [];
        dataByFreq[freq].dataB = [];
        dataByFreq[freq].maxA = 0;
        dataByFreq[freq].maxB = 0;
        dataByFreq[freq].avgA = 0;
        dataByFreq[freq].avgB = 0;
        
        // Update charts
        // Lantai 3 removed
        updateChart(chartsLantai10[freq], freq, 'B');
    });
}

// Check if there's an active session (called after WebSocket connects or manually)
// You can call this from console: checkActiveSession()
async function checkActiveSession() {
    console.log('🔍 checkActiveSession() called...');
    try {
        const url = `/detector-getaran/api/tim_${LAPTOP_ID}.php`;
        console.log('📡 Fetching:', url);
        
        const response = await fetch(url);
        const result = await response.json();
        
        console.log('📦 API Response:', result);
        
        if (result.status === 'success' && result.current_session) {
            console.log('✅ Found active session!', result.current_session);
            const sessionData = {
                session_id: result.current_session.id,
                frequency: result.current_session.frequency,
                category: result.current_session.category || 'baja',
                session_status: 'running',
                elapsed_seconds: result.current_session.elapsed || 0,
                relative_time: result.current_session.elapsed || 0
            };
            console.log('📞 Calling handleSessionStart...');
            handleSessionStart(sessionData);
        } else {
            console.log('ℹ️ No active session found');
        }
    } catch (error) {
        console.error('❌ Error checking active session:', error);
    }
}

// Make function available globally for console testing
window.checkActiveSession = checkActiveSession;

async function loadTeamName(laptopId, category) {
    try {
        const response = await fetch(`/detector-getaran/api/get_team_info.php?laptop_id=${laptopId}&category=${category}`);
        const data = await response.json();
        
        if (data.error) {
            console.error('Error loading team name:', data.error);
            return;
        }
        
        const teamNameEl = document.getElementById('teamName');
        if (teamNameEl && data.nama_tim) {
            teamNameEl.textContent = data.nama_tim;
        }
    } catch (error) {
        console.error('Error loading team name:', error);
    }
}