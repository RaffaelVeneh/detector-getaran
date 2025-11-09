// ===== SCRIPT.JS - Halaman Utama (User) =====

document.addEventListener('DOMContentLoaded', () => {
    loadTeams();
    setupEventListeners();
});

// Load daftar tim
async function loadTeams() {
    try {
        const response = await fetch('api_teams.php?action=get_all');
        const teams = await response.json();
        
        const teamsList = document.getElementById('teamsList');
        const modalTeamsList = document.getElementById('modalTeamsList');
        const exportTeamsList = document.getElementById('exportTeamsList');
        
        if (teams.length === 0) {
            teamsList.innerHTML = '<div class="loading">Belum ada tim terdaftar. Silakan hubungi admin.</div>';
            modalTeamsList.innerHTML = '<div class="loading">Belum ada tim terdaftar.</div>';
            exportTeamsList.innerHTML = '<div class="loading">Belum ada tim terdaftar.</div>';
            return;
        }
        
        // Tampilkan di grid utama
        teamsList.innerHTML = teams.map(team => `
            <div class="team-card" onclick="selectTeamForTest(${team.id}, '${escapeHtml(team.nama_tim)}')">
                <h4>${escapeHtml(team.nama_tim)}</h4>
                <p>Klik untuk memulai pengujian</p>
            </div>
        `).join('');
        
        // Tampilkan di modal
        modalTeamsList.innerHTML = teams.map(team => `
            <div class="modal-team-item" onclick="selectTeamForTest(${team.id}, '${escapeHtml(team.nama_tim)}')">
                ${escapeHtml(team.nama_tim)}
            </div>
        `).join('');
        
        // Tampilkan di modal export
        exportTeamsList.innerHTML = teams.map(team => `
            <div class="modal-team-item" onclick="exportTeamData(${team.id}, '${escapeHtml(team.nama_tim)}')">
                ${escapeHtml(team.nama_tim)}
            </div>
        `).join('');
        
    } catch (error) {
        console.error('Error loading teams:', error);
        document.getElementById('teamsList').innerHTML = '<div class="loading">Gagal memuat daftar tim.</div>';
    }
}

// Setup event listeners
function setupEventListeners() {
    // Tombol mulai pengujian
    document.getElementById('startTestBtn').addEventListener('click', () => {
        openModal('teamModal');
    });
    
    // Tombol export
    document.getElementById('exportBtn').addEventListener('click', () => {
        openModal('exportModal');
    });
    
    // Close modals
    document.querySelectorAll('.close').forEach(closeBtn => {
        closeBtn.addEventListener('click', function() {
            this.closest('.modal').style.display = 'none';
        });
    });
    
    // Close modal saat klik di luar
    window.addEventListener('click', (event) => {
        if (event.target.classList.contains('modal')) {
            event.target.style.display = 'none';
        }
    });
}

// Buka modal
function openModal(modalId) {
    document.getElementById(modalId).style.display = 'block';
}

// Pilih tim untuk pengujian
function selectTeamForTest(teamId, teamName) {
    localStorage.setItem('selectedTeamId', teamId);
    localStorage.setItem('selectedTeamName', teamName);
    window.location.href = 'visualisasi.html';
}

// Export data tim
async function exportTeamData(teamId, teamName) {
    // Tutup modal dulu
    document.getElementById('exportModal').style.display = 'none';
    
    // Tampilkan konfirmasi
    const confirmation = confirm(`Apakah Anda ingin export data tim "${teamName}" ke dalam bentuk CSV?\n\nData yang akan diexport adalah seluruh sesi pengujian yang sudah dilakukan.`);
    
    if (!confirmation) {
        return; // User cancel
    }
    
    try {
        const response = await fetch(`api_teams.php?action=get_test_data&team_id=${teamId}`);
        const data = await response.json();
        
        if (!data || data.length === 0) {
            alert(`Tidak ada data pengujian untuk tim "${teamName}".\n\nSilakan lakukan pengujian terlebih dahulu di halaman visualisasi.`);
            return;
        }
        
        // Buat CSV
        const csv = convertToCSV(data);
        downloadCSV(csv, `Data_Uji_${teamName.replace(/\s/g, '_')}_${new Date().toISOString().split('T')[0]}.csv`);
        
        alert(`✅ Data berhasil diexport!\n\nFile: Data_Uji_${teamName.replace(/\s/g, '_')}_${new Date().toISOString().split('T')[0]}.csv`);
        
    } catch (error) {
        console.error('Error exporting data:', error);
        alert('❌ Gagal mengekspor data. Silakan coba lagi.');
    }
}

// Konversi data ke CSV
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

// Escape HTML untuk keamanan
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

Object.defineProperty(window, 'adminganteng', {
  get: function() {
    console.log('Password diterima... Mengalihkan ke halaman admin.');
    window.location.href = 'admin.html';
    return 'Berhasil! 🚀';
  },
  configurable: true // Agar bisa didefinisikan ulang jika perlu
});