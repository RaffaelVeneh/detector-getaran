let chart3t, chart10t;
let currentFrequency = 1;
let isRunning = false;
let startTime = null;
let timerInterval = null;
let dataFetchInterval = null;
let teamId = null;
let teamName = '';
let sessionId = 0; // Track session ID dari MySQL
let firstDataReceived = false; // Flag untuk auto-start timer

// Data storage untuk setiap gedung
let data3t = {
    times: [],
    displacements: [],
    maxDisp: 0,
    avgDisp: 0,
    realtimeDisp: 0,
    totalLargeDisp: 0,
    largeDispCount: 0
};

let data10t = {
    times: [],
    displacements: [],
    maxDisp: 0,
    avgDisp: 0,
    realtimeDisp: 0,
    totalLargeDisp: 0,
    largeDispCount: 0
};

// Threshold untuk "simpangan besar" (dalam mm)
const LARGE_DISP_THRESHOLD = 2;

document.addEventListener('DOMContentLoaded', () => {
    initPage();
    initCharts();
    setupEventListeners();
});

// Inisialisasi halaman
function initPage() {
    teamId = localStorage.getItem('selectedTeamId');
    teamName = localStorage.getItem('selectedTeamName');
    
    if (!teamId || !teamName) {
        alert('Silakan pilih tim terlebih dahulu!');
        window.location.href = 'index.html';
        return;
    }
    
    document.getElementById('teamName').textContent = teamName;
    updateFrequencyDisplay();
}

// Inisialisasi grafik
function initCharts() {
    // Chart Gedung 3 Tingkat
    const ctx3t = document.getElementById('chart3t').getContext('2d');
    chart3t = new Chart(ctx3t, {
        type: 'bar',
        data: {
            labels: [],
            datasets: [{
                label: 'Displacement (mm)',
                data: [],
                backgroundColor: function(context) {
                    const value = context.parsed.y;
                    return value >= 0 ? 'rgba(75, 192, 192, 0.8)' : 'rgba(255, 99, 132, 0.8)';
                },
                borderColor: function(context) {
                    const value = context.parsed.y;
                    return value >= 0 ? 'rgb(75, 192, 192)' : 'rgb(255, 99, 132)';
                },
                borderWidth: 1,
                barThickness: 2,
                maxBarThickness: 4,
                categoryPercentage: 0.18,
                barPercentage: 1.0
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            animation: false,
            scales: {
                x: {
                    title: {
                        display: true,
                        text: 'Waktu (detik)',
                        font: { size: 12, weight: 'bold' }
                    },
                    ticks: {
                        maxRotation: 0,
                        autoSkip: true,
                        maxTicksLimit: 20
                    }
                },
                y: {
                    title: {
                        display: true,
                        text: 'Displacement (mm)',
                        font: { size: 12, weight: 'bold' }
                    },
                    beginAtZero: false
                }
            },
            plugins: {
                legend: {
                    display: false
                },
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            return 'Displacement: ' + context.parsed.y.toFixed(2) + ' mm';
                        }
                    }
                }
            }
        }
    });

    // Chart Gedung 10 Tingkat (sama seperti di atas)
    const ctx10t = document.getElementById('chart10t').getContext('2d');
    chart10t = new Chart(ctx10t, {
        type: 'bar',
        data: {
            labels: [],
            datasets: [{
                label: 'Displacement (mm)',
                data: [],
                backgroundColor: function(context) {
                    const value = context.parsed.y;
                    return value >= 0 ? 'rgba(54, 162, 235, 0.8)' : 'rgba(255, 159, 64, 0.8)';
                },
                borderColor: function(context) {
                    const value = context.parsed.y;
                    return value >= 0 ? 'rgb(54, 162, 235)' : 'rgb(255, 159, 64)';
                },
                borderWidth: 1,
                barThickness: 2,
                maxBarThickness: 4,
                categoryPercentage: 0.18,
                barPercentage: 1.0
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            animation: false,
            scales: {
                x: {
                    title: {
                        display: true,
                        text: 'Waktu (detik)',
                        font: { size: 12, weight: 'bold' }
                    },
                    ticks: {
                        maxRotation: 0,
                        autoSkip: true,
                        maxTicksLimit: 20
                    }
                },
                y: {
                    title: {
                        display: true,
                        text: 'Displacement (mm)',
                        font: { size: 12, weight: 'bold' }
                    },
                    beginAtZero: false
                }
            },
            plugins: {
                legend: {
                    display: false
                },
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            return 'Displacement: ' + context.parsed.y.toFixed(2) + ' mm';
                        }
                    }
                }
            }
        }
    });
}

// Setup event listeners
function setupEventListeners() {
    document.getElementById('stopBtn').addEventListener('click', stopTest);
    document.getElementById('resetBtn').addEventListener('click', resetTest);
    document.getElementById('exportCsvBtn').addEventListener('click', exportData);
    document.getElementById('prevFreqBtn').addEventListener('click', previousFrequency);
    document.getElementById('nextFreqBtn').addEventListener('click', nextFrequency);
}

// Mulai pengujian
function startTest() {
    if (isRunning) return;
    
    isRunning = true;
    firstDataReceived = false; // Reset flag
    
    document.getElementById('startBtn').disabled = true;
    document.getElementById('stopBtn').disabled = false;
    
    // Mulai fetch data (timer akan auto-start saat data pertama masuk)
    dataFetchInterval = setInterval(fetchRealtimeData, 100); // Setiap 100ms
    
    console.log('Menunggu data dari alat...');
}

// Berhenti pengujian
function stopTest() {
    if (!isRunning) return;
    
    isRunning = false;
    
    document.getElementById('startBtn').disabled = false;
    document.getElementById('stopBtn').disabled = true;
    
    clearInterval(timerInterval);
    clearInterval(dataFetchInterval);
    
    // Simpan data ke database
    saveTestData();
}

// Reset pengujian
function resetTest() {
    if (isRunning) {
        stopTest();
    }
    
    // Reset data
    data3t = {
        times: [],
        displacements: [],
        maxDisp: 0,
        avgDisp: 0,
        realtimeDisp: 0,
        totalLargeDisp: 0,
        largeDispCount: 0
    };
    
    data10t = {
        times: [],
        displacements: [],
        maxDisp: 0,
        avgDisp: 0,
        realtimeDisp: 0,
        totalLargeDisp: 0,
        largeDispCount: 0
    };
    
    startTime = null;
    firstDataReceived = false; // Reset flag auto-start
    
    // Reset UI
    updateDataDisplay('3t');
    updateDataDisplay('10t');
    updateChart(chart3t, data3t);
    updateChart(chart10t, data10t);
    
    document.getElementById('timer3t').textContent = '00:00';
    document.getElementById('timer10t').textContent = '00:00';
}

// Update timer
function updateTimer() {
    if (!startTime) return;
    
    const elapsed = Date.now() - startTime;
    const seconds = Math.floor(elapsed / 1000);
    const minutes = Math.floor(seconds / 60);
    const secs = seconds % 60;
    
    const timeStr = `${String(minutes).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
    document.getElementById('timer3t').textContent = timeStr;
    document.getElementById('timer10t').textContent = timeStr;
    
    // Auto stop setelah 1 menit
    if (seconds >= 60) {
        stopTest();
        alert('Sesi pengujian frekuensi ' + currentFrequency + ' selesai!');
    }
}

// Fetch data real-time dari data.json
async function fetchRealtimeData() {
    try {
        // Fetch data dari file data.json yang dihasilkan oleh mikrokontroller
        const response = await fetch('data.json?t=' + Date.now()); // Cache busting
        
        if (!response.ok) {
            console.warn('data.json tidak tersedia');
            return;
        }
        
        const jsonData = await response.json();
        
        // Format data.json yang diharapkan dari mikrokontroller:
        // {
        //   "g3t_displacement": 2.5,
        //   "g10t_displacement": 3.2,
        //   "timestamp": 1234567890
        // }
        
        // AUTO-START: Mulai timer saat data pertama diterima
        if (!firstDataReceived && (jsonData.g3t_displacement !== undefined || jsonData.g10t_displacement !== undefined)) {
            firstDataReceived = true;
            startTime = Date.now();
            
            // Mulai timer otomatis
            timerInterval = setInterval(updateTimer, 100);
            
            console.log('Timer dimulai otomatis! Data pertama diterima.');
        }
        
        if (!startTime) return; // Jangan proses jika belum ada startTime
        
        const currentTime = (Date.now() - startTime) / 1000; // dalam detik
        
        // Update data Gedung 3 Tingkat
        if (jsonData.g3t_displacement !== undefined) {
            updateBuildingData(data3t, currentTime, jsonData.g3t_displacement);
            updateDataDisplay('3t');
            updateChart(chart3t, data3t);
        }
        
        // Update data Gedung 10 Tingkat
        if (jsonData.g10t_displacement !== undefined) {
            updateBuildingData(data10t, currentTime, jsonData.g10t_displacement);
            updateDataDisplay('10t');
            updateChart(chart10t, data10t);
        }
        
    } catch (error) {
        console.error('Error fetching data.json:', error);
    }
}

// Generate data simulasi (untuk testing)
function generateSimulatedData() {
    const currentTime = (Date.now() - startTime) / 1000;
    
    // Simulasi data acak
    const disp3t = (Math.random() - 0.5) * 10; // -5 sampai +5 mm
    const disp10t = (Math.random() - 0.5) * 15; // -7.5 sampai +7.5 mm
    
    updateBuildingData(data3t, currentTime, disp3t);
    updateBuildingData(data10t, currentTime, disp10t);
    
    updateDataDisplay('3t');
    updateDataDisplay('10t');
    updateChart(chart3t, data3t);
    updateChart(chart10t, data10t);
}

// Update data gedung
function updateBuildingData(dataObj, time, displacement) {
    dataObj.times.push(time);
    dataObj.displacements.push(displacement);
    dataObj.realtimeDisp = displacement;
    
    // Update max displacement
    const absDisp = Math.abs(displacement);
    if (absDisp > Math.abs(dataObj.maxDisp)) {
        dataObj.maxDisp = displacement;
    }
    
    // Update average displacement (hanya simpangan besar)
    if (absDisp > LARGE_DISP_THRESHOLD) {
        dataObj.totalLargeDisp += absDisp;
        dataObj.largeDispCount++;
        dataObj.avgDisp = dataObj.totalLargeDisp / time; // mm/s
    }
    
    // Batasi jumlah data point (max 600 = 60 detik * 10 data/detik)
    if (dataObj.times.length > 600) {
        dataObj.times.shift();
        dataObj.displacements.shift();
    }
}

// Update tampilan data
function updateDataDisplay(building) {
    const dataObj = building === '3t' ? data3t : data10t;
    
    document.getElementById(`maxDisp${building}`).textContent = dataObj.maxDisp.toFixed(2);
    document.getElementById(`realtimeDisp${building}`).textContent = dataObj.realtimeDisp.toFixed(2);
    document.getElementById(`avgDisp${building}`).textContent = dataObj.avgDisp.toFixed(2);
}

// Update chart
function updateChart(chart, dataObj) {
    // Ambil hanya setiap data ke-3 untuk mengurangi kepadatan (lebih clean)
    const skipFactor = 3;
    const labels = dataObj.times.filter((_, i) => i % skipFactor === 0).map(t => t.toFixed(1));
    const data = dataObj.displacements.filter((_, i) => i % skipFactor === 0);
    
    chart.data.labels = labels;
    chart.data.datasets[0].data = data;
    chart.update('none'); // Update tanpa animasi
}

// Simpan data ke database
async function saveTestData() {
    try {
        const testData = {
            team_id: teamId,
            frequency: currentFrequency,
            session_id: sessionId,
            g3t_data: data3t,
            g10t_data: data10t
        };
        
        const response = await fetch('api_save_test.php', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(testData)
        });
        
        const result = await response.json();
        
        if (result.status === 'success') {
            console.log('Data berhasil disimpan ke MySQL');
            // Simpan session_id untuk sesi berikutnya
            if (result.session_id) {
                sessionId = result.session_id;
            }
        } else {
            console.error('Gagal menyimpan data:', result.message);
        }
        
    } catch (error) {
        console.error('Error saving test data:', error);
    }
}

// Export data ke CSV
async function exportData() {
    // Konfirmasi dulu
    const confirmMsg = `Apakah Anda ingin export data tim "${teamName}" Sesi Frekuensi ${currentFrequency}?\n\n` +
                       `Data yang akan diexport:\n` +
                       `- Frekuensi: ${currentFrequency} Hz\n` +
                       `- Total data points: ${data3t.times.length}\n` +
                       `- Status: ${isRunning ? 'Sedang berjalan' : 'Selesai'}\n\n` +
                       `Catatan: Hanya data sesi ini yang akan diexport.`;
    
    if (!confirm(confirmMsg)) {
        return;
    }
    
    try {
        const response = await fetch(`api_teams.php?action=get_test_data&team_id=${teamId}&frequency=${currentFrequency}`);
        const data = await response.json();
        
        if (!data || data.length === 0) {
            alert(`Tidak ada data tersimpan untuk Sesi ${currentFrequency}.\n\nPastikan Anda sudah:\n1. Klik "Mulai Pengujian"\n2. Menunggu data dari alat\n3. Timer berjalan hingga selesai atau klik "Berhenti"`);
            return;
        }
        
        const csv = convertToCSV(data);
        const filename = `${teamName.replace(/\s/g, '_')}_Frekuensi${currentFrequency}_${new Date().toISOString().split('T')[0]}.csv`;
        downloadCSV(csv, filename);
        
        alert(`✅ Data berhasil diexport!\n\nFile: ${filename}\nTotal baris: ${data.length}`);
        
    } catch (error) {
        console.error('Error exporting data:', error);
        alert('❌ Gagal mengekspor data. Silakan coba lagi.');
    }
}

// Konversi ke CSV
function convertToCSV(data) {
    const headers = [
        'Timestamp',
        'Waktu_Detik',
        'G3T_Displacement_mm',
        'G3T_MaxDisp_mm',
        'G3T_AvgDisp_mm/s',
        'G10T_Displacement_mm',
        'G10T_MaxDisp_mm',
        'G10T_AvgDisp_mm/s',
        'Frekuensi_Sesi_Ke'
    ];
    
    let csv = headers.join(',') + '\n';
    
    data.forEach(row => {
        const values = [
            row.timestamp || '',
            row.waktu_detik || '0',
            row.g3t_displacement || '0',
            row.g3t_max_disp || '0',
            row.g3t_avg_disp || '0',
            row.g10t_displacement || '0',
            row.g10t_max_disp || '0',
            row.g10t_avg_disp || '0',
            row.frekuensi_ke || '1'
        ];
        csv += values.join(',') + '\n';
    });
    
    return csv;
}

// Download CSV
function downloadCSV(csv, filename) {
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    
    link.setAttribute('href', url);
    link.setAttribute('download', filename);
    link.style.visibility = 'hidden';
    
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}

// Navigasi frekuensi
function previousFrequency() {
    if (currentFrequency > 1) {
        if (isRunning) {
            alert('Hentikan pengujian terlebih dahulu!');
            return;
        }
        currentFrequency--;
        updateFrequencyDisplay();
        resetTest();
    }
}

function nextFrequency() {
    if (currentFrequency < 5) {
        if (isRunning) {
            alert('Hentikan pengujian terlebih dahulu!');
            return;
        }
        currentFrequency++;
        updateFrequencyDisplay();
        resetTest();
    }
}

function updateFrequencyDisplay() {
    document.getElementById('frequencyNumber').textContent = currentFrequency;
    document.getElementById('frequencyStatus').textContent = `Sesi ${currentFrequency} dari 5`;
    
    document.getElementById('prevFreqBtn').disabled = currentFrequency === 1;
    document.getElementById('nextFreqBtn').disabled = currentFrequency === 5;
    
    // Reset session ID saat ganti frekuensi
    sessionId = 0;
}
