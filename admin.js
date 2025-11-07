// ===== ADMIN.JS - Halaman Admin (Kelola Tim) =====

document.addEventListener('DOMContentLoaded', () => {
    loadTeams();
    setupEventListeners();
});

// Setup event listeners
function setupEventListeners() {
    document.getElementById('teamForm').addEventListener('submit', saveTeam);
    document.getElementById('cancelBtn').addEventListener('click', cancelEdit);
}

// Load daftar tim
async function loadTeams() {
    try {
        const response = await fetch('api_teams.php?action=get_all');
        const teams = await response.json();
        
        const tbody = document.getElementById('teamsTableBody');
        
        if (teams.length === 0) {
            tbody.innerHTML = '<tr><td colspan="4" class="loading">Belum ada tim terdaftar.</td></tr>';
            return;
        }
        
        tbody.innerHTML = teams.map((team, index) => `
            <tr>
                <td>${index + 1}</td>
                <td>${escapeHtml(team.nama_tim)}</td>
                <td>${formatDate(team.created_at)}</td>
                <td class="table-actions">
                    <button class="btn btn-edit" onclick="editTeam(${team.id}, '${escapeHtml(team.nama_tim)}')">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
                            <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
                        </svg>
                        Edit
                    </button>
                    <button class="btn btn-delete" onclick="deleteTeam(${team.id}, '${escapeHtml(team.nama_tim)}')">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <polyline points="3 6 5 6 21 6"></polyline>
                            <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                        </svg>
                        Hapus
                    </button>
                </td>
            </tr>
        `).join('');
        
    } catch (error) {
        console.error('Error loading teams:', error);
        document.getElementById('teamsTableBody').innerHTML = 
            '<tr><td colspan="4" class="loading">Gagal memuat data tim.</td></tr>';
    }
}

// Simpan tim (tambah atau edit)
async function saveTeam(e) {
    e.preventDefault();
    
    const teamId = document.getElementById('teamId').value;
    const teamName = document.getElementById('teamName').value.trim();
    
    if (!teamName) {
        alert('Nama tim harus diisi!');
        return;
    }
    
    try {
        const formData = new FormData();
        formData.append('action', teamId ? 'update' : 'add');
        formData.append('nama_tim', teamName);
        if (teamId) {
            formData.append('id', teamId);
        }
        
        const response = await fetch('api_teams.php', {
            method: 'POST',
            body: formData
        });
        
        const result = await response.json();
        
        if (result.status === 'success') {
            alert(teamId ? 'Tim berhasil diperbarui!' : 'Tim berhasil ditambahkan!');
            document.getElementById('teamForm').reset();
            document.getElementById('teamId').value = '';
            document.getElementById('cancelBtn').style.display = 'none';
            document.getElementById('saveBtn').innerHTML = `
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"></path>
                    <polyline points="17 21 17 13 7 13 7 21"></polyline>
                    <polyline points="7 3 7 8 15 8"></polyline>
                </svg>
                Simpan Tim
            `;
            loadTeams();
        } else {
            alert('Gagal menyimpan tim: ' + (result.message || 'Unknown error'));
        }
        
    } catch (error) {
        console.error('Error saving team:', error);
        alert('Terjadi kesalahan saat menyimpan tim.');
    }
}

// Edit tim
function editTeam(id, name) {
    document.getElementById('teamId').value = id;
    document.getElementById('teamName').value = name;
    document.getElementById('cancelBtn').style.display = 'inline-flex';
    document.getElementById('saveBtn').innerHTML = `
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
            <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
        </svg>
        Update Tim
    `;
    
    // Scroll ke form
    document.getElementById('teamForm').scrollIntoView({ behavior: 'smooth' });
}

// Batal edit
function cancelEdit() {
    document.getElementById('teamForm').reset();
    document.getElementById('teamId').value = '';
    document.getElementById('cancelBtn').style.display = 'none';
    document.getElementById('saveBtn').innerHTML = `
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"></path>
            <polyline points="17 21 17 13 7 13 7 21"></polyline>
            <polyline points="7 3 7 8 15 8"></polyline>
        </svg>
        Simpan Tim
    `;
}

// Hapus tim
async function deleteTeam(id, name) {
    if (!confirm(`Apakah Anda yakin ingin menghapus tim "${name}"?\n\nSemua data pengujian tim ini juga akan terhapus!`)) {
        return;
    }
    
    try {
        const formData = new FormData();
        formData.append('action', 'delete');
        formData.append('id', id);
        
        const response = await fetch('api_teams.php', {
            method: 'POST',
            body: formData
        });
        
        const result = await response.json();
        
        if (result.status === 'success') {
            alert('Tim berhasil dihapus!');
            loadTeams();
        } else {
            alert('Gagal menghapus tim: ' + (result.message || 'Unknown error'));
        }
        
    } catch (error) {
        console.error('Error deleting team:', error);
        alert('Terjadi kesalahan saat menghapus tim.');
    }
}

// Format tanggal
function formatDate(dateString) {
    if (!dateString) return '-';
    const date = new Date(dateString);
    return date.toLocaleDateString('id-ID', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    });
}

// Escape HTML untuk keamanan
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}
