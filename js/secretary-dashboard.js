// Secretary Dashboard JavaScript

// State
let currentDocument = null;
let currentFilters = {
    docStatus: 'pending',
    docType: ''
};
let currentMemberId = null; // For editing

// Initialize dashboard
async function initDashboard() {
    try {
        await auth.requireAuth();
        await auth.requireRole('sekretaris');

        displayUserInfo();

        // Initial Load (Documents tab is active by default)
        await loadStats();
        await loadDocuments();

        // Setup all listeners
        setupEventListeners();
        setupRealtimeSubscription();

        // Set default date for attendance filter
        document.getElementById('attendance-date-filter').valueAsDate = new Date();

        // Set default date range for recap (current month)
        const today = new Date();
        const firstDay = new Date(today.getFullYear(), today.getMonth(), 1);
        document.getElementById('recap-date-from').valueAsDate = firstDay;
        document.getElementById('recap-date-to').valueAsDate = today;

    } catch (error) {
        console.error('Error initializing dashboard:', error);
        toast.error('Gagal memuat dashboard');
    }
}

// Display user information
function displayUserInfo() {
    const user = auth.getCurrentUser();
    if (user) {
        document.getElementById('user-name').textContent = user.full_name;
    }
}

// Setup event listeners
function setupEventListeners() {
    // Logout
    document.getElementById('logout-btn').addEventListener('click', async () => {
        if (await confirm('Apakah Anda yakin ingin keluar?')) {
            await auth.signOut();
        }
    });

    // --- Tab Navigation ---
    const tabBtns = document.querySelectorAll('.tab-btn');
    tabBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            // Remove active class from all
            document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
            document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));

            // Add active class to clicked
            btn.classList.add('active');
            const tabId = btn.getAttribute('data-tab');
            document.getElementById(`section-${tabId}`).classList.add('active');

            // Lazy load data
            if (tabId === 'attendance') loadAttendanceLogs();
            if (tabId === 'members') loadMembers();
        });
    });

    // --- Documents Tab ---
    document.getElementById('apply-filter-btn').addEventListener('click', () => {
        currentFilters.docStatus = document.getElementById('filter-status').value;
        currentFilters.docType = document.getElementById('filter-type').value;
        loadDocuments();
    });

    document.getElementById('refresh-btn').addEventListener('click', () => {
        loadStats();
        loadDocuments();
    });

    // Validations & Review
    document.getElementById('close-review-modal').addEventListener('click', closeReviewModal);
    document.getElementById('cancel-review-btn').addEventListener('click', closeReviewModal);
    document.getElementById('request-revision-btn').addEventListener('click', showRevisionNoteModal);
    document.getElementById('validate-btn').addEventListener('click', validateDocument);

    document.getElementById('close-revision-note-modal').addEventListener('click', closeRevisionNoteModal);
    document.getElementById('cancel-revision-note-btn').addEventListener('click', closeRevisionNoteModal);
    document.getElementById('submit-revision-btn').addEventListener('click', submitRevision);

    // --- Attendance Tab ---
    document.getElementById('attendance-filter-btn').addEventListener('click', loadAttendanceLogs);

    // --- Members Tab ---
    document.getElementById('btn-add-member').addEventListener('click', () => openMemberModal());
    document.getElementById('close-member-modal').addEventListener('click', closeMemberModal);
    document.getElementById('cancel-member-btn').addEventListener('click', closeMemberModal);
    document.getElementById('save-member-btn').addEventListener('click', saveMember);
    document.getElementById('btn-download-template').addEventListener('click', downloadMemberTemplate);
    document.getElementById('btn-import-members').addEventListener('click', () => {
        document.getElementById('csv-file-input').click();
    });
    document.getElementById('csv-file-input').addEventListener('change', handleCSVImport);

    // --- Recap Tab ---
    document.getElementById('recap-generate-btn').addEventListener('click', generateRecap);
    document.getElementById('recap-export-btn').addEventListener('click', exportRecapToCSV);
}

// ==========================================
// DOCUMENTS LOGIC
// ==========================================

async function loadStats() {
    try {
        const { data, error } = await auth.supabase.from('documents').select('status');
        if (error) throw error;

        const stats = { pending: 0, revision: 0, validated: 0 };
        data.forEach(doc => { if (stats[doc.status] !== undefined) stats[doc.status]++; });

        document.getElementById('pending-count').textContent = stats.pending;
        document.getElementById('revision-count').textContent = stats.revision;
        document.getElementById('validated-count').textContent = stats.validated;
    } catch (error) {
        console.error('Error stats:', error);
    }
}

async function loadDocuments() {
    try {
        showLoading('Memuat dokumen...');
        let query = auth.supabase.from('documents').select('*').order('created_at', { ascending: false });

        if (currentFilters.docStatus) query = query.eq('status', currentFilters.docStatus);
        if (currentFilters.docType) query = query.eq('document_type', currentFilters.docType);

        const { data, error } = await query;
        if (error) throw error;

        displayDocuments(data || []);
    } catch (error) {
        console.error('Error docs:', error);
        toast.error('Gagal memuat dokumen');
    } finally {
        hideLoading();
    }
}

function displayDocuments(documents) {
    const emptyState = document.getElementById('documents-empty');
    const tableContainer = document.getElementById('documents-table-container');
    const tbody = document.getElementById('documents-tbody');

    if (documents.length === 0) {
        emptyState.style.display = 'block';
        tableContainer.style.display = 'none';
        return;
    }

    emptyState.style.display = 'none';
    tableContainer.style.display = 'block';

    tbody.innerHTML = documents.map(doc => `
        <tr>
            <td>
                <div style="font-weight: 600;">${doc.title}</div>
                ${doc.description ? `<div class="text-secondary" style="font-size: 0.875rem;">${truncate(doc.description, 60)}</div>` : ''}
            </td>
            <td>${renderDocumentType(doc.document_type)}</td>
            <td><div style="font-weight: 500;">${doc.uploader_name || 'Tidak diketahui'}</div></td>
            <td>${renderStatusBadge(doc.status)}</td>
            <td>${formatDateShort(doc.submitted_at)}</td>
            <td>${doc.document_number || '-'}</td>
            <td>
                <div class="d-flex gap-1">
                    <a href="${doc.file_url}" target="_blank" class="btn btn-sm btn-secondary" title="Lihat">👁️</a>
                    <button class="btn btn-sm btn-primary" onclick="reviewDocument('${doc.id}')" title="Review">📝</button>
                    ${doc.status === 'validated' && doc.document_number ? `
                        <button class="btn btn-sm btn-success" onclick="downloadDocument('${doc.id}')" title="Download">⬇️</button>
                    ` : ''}
                </div>
            </td>
        </tr>
    `).join('');
}

// Review functions (mostly same as before)
async function reviewDocument(documentId) {
    try {
        showLoading('Memuat detail...');
        const { data, error } = await auth.supabase
            .from('documents')
            .select(`*, uploaded_by:users!documents_uploaded_by_fkey(full_name, email), revisions:document_revisions(*, created_by:users!document_revisions_created_by_fkey(full_name))`)
            .eq('id', documentId).single();

        if (error) throw error;
        currentDocument = data;
        hideLoading();

        // Build Modal HTML (Condensed)
        const modalContent = document.getElementById('review-content');
        modalContent.innerHTML = `
            <div style="padding: 1rem; background: var(--color-gray-50); border-radius: var(--radius-md); margin-bottom: 1.5rem;">
                <h4 style="margin-bottom: 1rem;">${data.title}</h4>
                <div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 1rem; margin-bottom: 1rem;">
                    <div><div class="text-secondary small">Jenis</div><div>${renderDocumentType(data.document_type)}</div></div>
                    <div><div class="text-secondary small">Status</div><div>${renderStatusBadge(data.status)}</div></div>
                    <div><div class="text-secondary small">Pengunggah</div><div>${data.uploaded_by?.full_name || 'Unknown'}</div></div>
                    <div><div class="text-secondary small">Tanggal</div><div>${formatDate(data.submitted_at)}</div></div>
                </div>
                ${data.description ? `<div style="margin-bottom: 1rem;"><div class="text-secondary small">Deskripsi</div><div>${data.description}</div></div>` : ''}
                <div class="d-flex gap-1">
                    <a href="${data.file_url}" target="_blank" class="btn btn-primary btn-sm">📄 Buka File</a>
                </div>
            </div>
            ${data.revisions?.length > 0 ? `
                <div style="margin-bottom: 1.5rem;"><h4>Riwayat Revisi</h4>
                ${data.revisions.map(rev => `<div style="padding:0.5rem; background:#fff; border-left:3px solid orange; margin-bottom:0.5rem;"><small>${formatDate(rev.created_at)}</small><p class="m-0">${rev.revision_note}</p></div>`).join('')}
                </div>` : ''}
        `;

        // Toggle buttons
        const isVal = data.status === 'validated';
        document.getElementById('validate-btn').style.display = isVal ? 'none' : 'inline-flex';
        document.getElementById('request-revision-btn').style.display = isVal ? 'none' : 'inline-flex';

        document.getElementById('review-modal').classList.add('show');
    } catch (e) {
        console.error(e);
        toast.error('Gagal memuat dokumen');
        hideLoading();
    }
}

function closeReviewModal() {
    document.getElementById('review-modal').classList.remove('show');
    currentDocument = null;
}

function showRevisionNoteModal() {
    document.getElementById('review-modal').classList.remove('show');
    document.getElementById('revision-note').value = '';
    document.getElementById('revision-note-modal').classList.add('show');
}

function closeRevisionNoteModal() {
    document.getElementById('revision-note-modal').classList.remove('show');
    document.getElementById('review-modal').classList.add('show');
}

async function submitRevision() {
    if (!currentDocument) return;
    const note = document.getElementById('revision-note').value.trim();
    if (!note) return toast.warning('Isi catatan revisi');

    try {
        showLoading('Mengirim revisi...');
        const user = auth.getCurrentUser();

        await auth.supabase.from('document_revisions').insert([{
            document_id: currentDocument.id,
            revision_note: note,
            created_by: user.id
        }]);

        await auth.supabase.from('documents').update({
            status: 'revision',
            reviewed_at: new Date().toISOString(),
            reviewed_by: user.id
        }).eq('id', currentDocument.id);

        hideLoading();
        toast.success('Revisi terkirim');
        closeRevisionNoteModal();
        closeReviewModal();
        loadStats();
        loadDocuments();
    } catch (e) {
        console.error(e);
        hideLoading();
        toast.error('Gagal mengirim revisi');
    }
}

async function validateDocument() {
    if (!currentDocument) return;
    if (!await confirm('Validasi dokumen ini?')) return;

    try {
        showLoading('Memvalidasi...');
        const user = auth.getCurrentUser();

        // Count for number
        const { count } = await auth.supabase.from('documents')
            .select('*', { count: 'exact', head: true })
            .eq('document_type', currentDocument.document_type)
            .eq('status', 'validated');

        const docNum = generateDocumentNumber(currentDocument.document_type, (count || 0) + 1);

        await auth.supabase.from('documents').update({
            status: 'validated',
            document_number: docNum,
            reviewed_at: new Date().toISOString(),
            reviewed_by: user.id
        }).eq('id', currentDocument.id);

        hideLoading();
        toast.success('Dokumen divalidasi!');
        closeReviewModal();
        loadStats();
        loadDocuments();
    } catch (e) {
        console.error(e);
        hideLoading();
        toast.error('Gagal validasi');
    }
}

async function downloadDocument(docId) {
    try {
        const { data } = await auth.supabase.from('documents').select('*').eq('id', docId).single();
        if (data) await utils.downloadVerifiedDocument(data.file_url, data.document_number, data.title, data.document_type);
    } catch (e) { console.error(e); toast.error('Gagal download'); }
}


// ==========================================
// ATTENDANCE LOGIC
// ==========================================

async function loadAttendanceLogs() {
    const dateInput = document.getElementById('attendance-date-filter');
    const date = dateInput.value; // YYYY-MM-DD

    if (!date) return;

    try {
        showLoading('Memuat absensi...');

        // Date range for query
        const startOfDay = new Date(date);
        startOfDay.setHours(0, 0, 0, 0);
        const endOfDay = new Date(date);
        endOfDay.setHours(23, 59, 59, 999);

        const { data, error } = await auth.supabase
            .from('attendance_logs')
            .select(`
                *,
                member:ukm_members(full_name)
            `)
            .gte('created_at', startOfDay.toISOString())
            .lte('created_at', endOfDay.toISOString())
            .order('created_at', { ascending: false });

        if (error) throw error;

        // Calculate Summary
        const summary = { hadir: 0, sakit: 0, izin: 0, alpha: 0 };
        data.forEach(log => {
            if (summary[log.status] !== undefined) summary[log.status]++;
        });
        document.getElementById('attendance-summary-text').textContent =
            `Total: ${data.length} | Hadir: ${summary.hadir} | Izin: ${summary.izin} | Sakit: ${summary.sakit}`;

        // Render Table
        const tbody = document.getElementById('attendance-tbody');
        const emptyState = document.getElementById('attendance-empty');

        if (data.length === 0) {
            tbody.innerHTML = '';
            emptyState.style.display = 'block';
        } else {
            emptyState.style.display = 'none';
            tbody.innerHTML = data.map(log => `
                <tr>
                    <td><div style="font-weight: 500;">${log.member?.full_name || 'Unknown'}</div></td>
                    <td>${new Date(log.created_at).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}</td>
                    <td>
                        <span class="badge" style="background: ${getStatusColor(log.status)}; color: white;">
                            ${log.status.toUpperCase()}
                        </span>
                    </td>
                    <td>${log.reason || '-'}</td>
                    <td>
                        ${log.proof_url ? `<a href="${log.proof_url}" target="_blank" class="btn btn-sm btn-secondary">Bukti</a>` : '-'}
                    </td>
                </tr>
            `).join('');
        }

    } catch (error) {
        console.error('Error loading attendance:', error);
        toast.error('Gagal memuat absensi');
    } finally {
        hideLoading();
    }
}

function getStatusColor(status) {
    switch (status) {
        case 'hadir': return 'var(--color-success)';
        case 'sakit': return 'var(--color-danger)';
        case 'izin': return 'var(--color-warning)';
        default: return 'var(--color-gray-400)';
    }
}

// ==========================================
// MEMBERS MANGEMENT LOGIC
// ==========================================

async function loadMembers() {
    try {
        showLoading('Memuat anggota...');
        const { data, error } = await auth.supabase
            .from('ukm_members')
            .select('*')
            .order('full_name');

        if (error) throw error;

        const tbody = document.getElementById('members-tbody');
        tbody.innerHTML = data.map(member => `
            <tr>
                <td><div style="font-weight: 500;">${member.full_name}</div></td>
                <td>${member.nim || '-'}</td>
                <td>${member.prodi || '-'}</td>
                <td>
                    ${member.voice_type ? `<span class="badge" style="background: ${getVoiceColor(member.voice_type)}; color: white;">${member.voice_type}</span>` : '-'}
                </td>
                <td>${member.position}</td>
                <td>
                    <span class="badge" style="background: ${member.is_active ? 'var(--color-success)' : 'var(--color-gray-400)'}; color: white;">
                        ${member.is_active ? 'Aktif' : 'Non-Aktif'}
                    </span>
                </td>
                <td>
                    <button class="btn btn-sm btn-primary" onclick="editMember('${member.id}')">✏️ Edit</button>
                    <button class="btn btn-sm btn-danger" onclick="toggleMemberStatus('${member.id}', ${member.is_active})">
                        ${member.is_active ? '🚫 Nonaktifkan' : '✅ Aktifkan'}
                    </button>
                </td>
            </tr>
        `).join('');

    } catch (error) {
        console.error('Error loading members:', error);
        toast.error('Gagal memuat daftar anggota');
    } finally {
        hideLoading();
    }
}

function openMemberModal(member = null) {
    const modal = document.getElementById('member-modal');
    const title = document.getElementById('member-modal-title');
    currentMemberId = member ? member.id : null;

    if (member) {
        title.textContent = 'Edit Anggota';
        document.getElementById('member-name').value = member.full_name;
        document.getElementById('member-nim').value = member.nim || '';
        document.getElementById('member-prodi').value = member.prodi || '';
        document.getElementById('member-jurusan').value = member.jurusan || '';
        document.getElementById('member-voice-type').value = member.voice_type || '';
        document.getElementById('member-position').value = member.position || 'Anggota';
        // Radio logic
        const radios = document.getElementsByName('member-active');
        if (member.is_active) radios[0].checked = true;
        else radios[1].checked = true;
    } else {
        title.textContent = 'Tambah Anggota';
        document.getElementById('member-form').reset();
        document.getElementsByName('member-active')[0].checked = true;
    }

    modal.classList.add('show');
}

function closeMemberModal() {
    document.getElementById('member-modal').classList.remove('show');
    currentMemberId = null;
}

async function editMember(id) {
    try {
        const { data, error } = await auth.supabase.from('ukm_members').select('*').eq('id', id).single();
        if (data) openMemberModal(data);
    } catch (e) { console.error(e); }
}

function getVoiceColor(voiceType) {
    switch (voiceType) {
        case 'Soprano': return 'hsl(280, 70%, 60%)';
        case 'Alto': return 'hsl(340, 70%, 60%)';
        case 'Tenor': return 'hsl(200, 70%, 50%)';
        case 'Bass': return 'hsl(20, 70%, 50%)';
        default: return 'var(--color-gray-400)';
    }
}

async function saveMember() {
    const name = document.getElementById('member-name').value.trim();
    const nim = document.getElementById('member-nim').value.trim();
    const prodi = document.getElementById('member-prodi').value.trim();
    const jurusan = document.getElementById('member-jurusan').value.trim();
    const voiceType = document.getElementById('member-voice-type').value;
    const position = document.getElementById('member-position').value;
    const isActive = document.querySelector('input[name="member-active"]:checked').value === 'true';

    if (!name) return toast.warning('Nama wajib diisi');

    try {
        showLoading('Menyimpan...');

        const payload = {
            full_name: name,
            nim: nim || null,
            prodi: prodi || null,
            jurusan: jurusan || null,
            voice_type: voiceType || null,
            position: position,
            is_active: isActive
        };

        let error;
        if (currentMemberId) {
            // Update
            const res = await auth.supabase.from('ukm_members').update(payload).eq('id', currentMemberId);
            error = res.error;
        } else {
            // Insert
            const res = await auth.supabase.from('ukm_members').insert([payload]);
            error = res.error;
        }

        if (error) throw error;

        hideLoading();
        toast.success('Data anggota berhasil disimpan');
        closeMemberModal();
        loadMembers();

    } catch (error) {
        hideLoading();
        console.error('Error save member:', error);
        toast.error('Gagal menyimpan data');
    }
}

async function toggleMemberStatus(id, currentStatus) {
    if (!await confirm(`Yakin ingin mengubah status anggota ini?`)) return;

    try {
        const { error } = await auth.supabase
            .from('ukm_members')
            .update({ is_active: !currentStatus })
            .eq('id', id);

        if (error) throw error;
        toast.success('Status berhasil diubah');
        loadMembers();
    } catch (e) {
        console.error(e);
        toast.error('Gagal update status');
    }
}

// Download CSV Template
function downloadMemberTemplate() {
    const headers = ['Nama Lengkap', 'NIM', 'Prodi', 'Jurusan', 'Tipe Suara', 'Jabatan'];
    const exampleRow = ['Budi Santoso', '123456789', 'Teknik Informatika', 'Fakultas Teknik', 'Tenor', 'Anggota'];

    const csvContent = headers.join(',') + '\n' + exampleRow.join(',');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'Template_Anggota_UKM.csv';
    link.click();
    URL.revokeObjectURL(url);

    toast.success('Template berhasil diunduh');
}

// Handle CSV Import
async function handleCSVImport(event) {
    const file = event.target.files[0];
    if (!file) return;

    event.target.value = '';

    if (!file.name.endsWith('.csv')) {
        return toast.error('File harus berformat CSV');
    }

    try {
        // Parse CSV first (no loading yet)

        const text = await file.text();
        const lines = text.split('\n').filter(line => line.trim());

        if (lines.length < 2) {
            return toast.error('File CSV kosong atau tidak valid');
        }

        const headers = lines[0].split(',').map(h => h.trim());
        const rows = lines.slice(1);

        const expectedHeaders = ['Nama Lengkap', 'NIM', 'Prodi', 'Jurusan', 'Tipe Suara', 'Jabatan'];

        const headersMatch = expectedHeaders.every((eh, i) => headers[i] && headers[i].includes(eh));
        if (!headersMatch) {
            return toast.error('Format CSV tidak sesuai template. Gunakan template yang sudah disediakan.');
        }

        const members = [];
        for (let i = 0; i < rows.length; i++) {
            const row = rows[i].split(',').map(cell => cell.trim());

            if (!row[0]) continue;

            members.push({
                full_name: row[0] || null,
                nim: row[1] || null,
                prodi: row[2] || null,
                jurusan: row[3] || null,
                voice_type: row[4] || null,
                position: row[5] || 'Anggota',
                is_active: true
            });
        }

        if (members.length === 0) {
            return toast.error('Tidak ada data valid untuk diimport');
        }

        const confirmed = await confirm(
            `Import ${members.length} anggota ke database?`
        );

        if (!confirmed) {
            return;
        }

        showLoading(`Mengimport ${members.length} anggota...`);

        const { data, error } = await auth.supabase
            .from('ukm_members')
            .insert(members)
            .select();

        if (error) throw error;

        hideLoading();
        toast.success(`Berhasil mengimport ${data.length} anggota!`);

        loadMembers();

    } catch (error) {
        hideLoading();
        console.error('Error importing CSV:', error);
        toast.error('Gagal mengimport data. Periksa format file CSV.');
    }
}

// ==========================================
// ATTENDANCE RECAP LOGIC
// ==========================================

async function generateRecap() {
    const dateFrom = document.getElementById('recap-date-from').value;
    const dateTo = document.getElementById('recap-date-to').value;

    if (!dateFrom || !dateTo) {
        return toast.warning('Pilih periode tanggal terlebih dahulu');
    }

    if (new Date(dateFrom) > new Date(dateTo)) {
        return toast.error('Tanggal awal tidak boleh lebih besar dari tanggal akhir');
    }

    try {
        showLoading('Membuat rekap...');

        // Fetch all active members
        const { data: members, error: membersError } = await auth.supabase
            .from('ukm_members')
            .select('id, full_name, nim')
            .eq('is_active', true)
            .order('full_name');

        if (membersError) throw membersError;

        // Fetch attendance logs in period
        const startDate = new Date(dateFrom);
        startDate.setHours(0, 0, 0, 0);
        const endDate = new Date(dateTo);
        endDate.setHours(23, 59, 59, 999);

        const { data: logs, error: logsError } = await auth.supabase
            .from('attendance_logs')
            .select('member_id, status, created_at')
            .gte('created_at', startDate.toISOString())
            .lte('created_at', endDate.toISOString());

        if (logsError) throw logsError;

        // Calculate statistics per member
        const recapData = members.map((member, index) => {
            const memberLogs = logs.filter(log => log.member_id === member.id);

            const stats = {
                hadir: memberLogs.filter(l => l.status === 'hadir').length,
                sakit: memberLogs.filter(l => l.status === 'sakit').length,
                izin: memberLogs.filter(l => l.status === 'izin').length
            };

            const total = stats.hadir + stats.sakit + stats.izin;
            const percentage = total > 0 ? ((stats.hadir / total) * 100).toFixed(1) : 0;

            return {
                no: index + 1,
                id: member.id,
                name: member.full_name,
                nim: member.nim || '-',
                hadir: stats.hadir,
                sakit: stats.sakit,
                izin: stats.izin,
                total: total,
                percentage: percentage
            };
        });

        displayRecap(recapData);

        // Show export button
        document.getElementById('recap-export-btn').style.display = 'inline-flex';

        hideLoading();
        toast.success('Rekap berhasil dibuat');

    } catch (error) {
        hideLoading();
        console.error('Error generating recap:', error);
        toast.error('Gagal membuat rekap');
    }
}

function displayRecap(recapData) {
    const emptyState = document.getElementById('recap-empty');
    const tableContainer = document.getElementById('recap-table-container');
    const tbody = document.getElementById('recap-tbody');

    if (recapData.length === 0) {
        emptyState.style.display = 'block';
        tableContainer.style.display = 'none';
        return;
    }

    emptyState.style.display = 'none';
    tableContainer.style.display = 'block';

    tbody.innerHTML = recapData.map(row => `
        <tr>
            <td>${row.no}</td>
            <td><div style="font-weight: 500;">${row.name}</div></td>
            <td>${row.nim}</td>
            <td><span class="badge" style="background: var(--color-success); color: white;">${row.hadir}</span></td>
            <td><span class="badge" style="background: var(--color-danger); color: white;">${row.sakit}</span></td>
            <td><span class="badge" style="background: var(--color-warning); color: white;">${row.izin}</span></td>
            <td><strong>${row.total}</strong></td>
            <td>
                <div style="display: flex; align-items: center; gap: 0.5rem;">
                    <div style="flex: 1; background: var(--color-gray-200); height: 8px; border-radius: 4px; overflow: hidden;">
                        <div style="width: ${row.percentage}%; background: ${row.percentage >= 75 ? 'var(--color-success)' : row.percentage >= 50 ? 'var(--color-warning)' : 'var(--color-danger)'}; height: 100%;"></div>
                    </div>
                    <span style="font-weight: 600; min-width: 45px;">${row.percentage}%</span>
                </div>
            </td>
        </tr>
    `).join('');

    // Store for export
    window.currentRecapData = recapData;
}

function exportRecapToCSV() {
    if (!window.currentRecapData || window.currentRecapData.length === 0) {
        return toast.warning('Tidak ada data untuk diekspor');
    }

    const dateFrom = document.getElementById('recap-date-from').value;
    const dateTo = document.getElementById('recap-date-to').value;

    // Create CSV content
    const headers = ['No', 'Nama', 'NIM', 'Hadir', 'Sakit', 'Izin', 'Total', 'Persentase'];
    const rows = window.currentRecapData.map(row => [
        row.no,
        row.name,
        row.nim,
        row.hadir,
        row.sakit,
        row.izin,
        row.total,
        `${row.percentage}%`
    ]);

    const csvContent = [
        `Rekap Absensi UKM Paduan Suara`,
        `Periode: ${dateFrom} s/d ${dateTo}`,
        '',
        headers.join(','),
        ...rows.map(r => r.join(','))
    ].join('\n');

    // Download
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `Rekap_Absensi_${dateFrom}_${dateTo}.csv`;
    link.click();
    URL.revokeObjectURL(url);

    toast.success('File CSV berhasil diunduh');
}

function setupRealtimeSubscription() {
    auth.supabase.channel('public-updates')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'documents' }, () => { loadStats(); loadDocuments(); })
        .subscribe();
}

// Global scope
window.reviewDocument = reviewDocument;
window.downloadDocument = downloadDocument;
window.editMember = editMember;
window.toggleMemberStatus = toggleMemberStatus;
window.loadAttendanceLogs = loadAttendanceLogs;

document.addEventListener('DOMContentLoaded', initDashboard);
