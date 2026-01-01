// Secretary Dashboard JavaScript

let currentDocument = null;
let currentFilters = {
    status: 'pending',
    type: ''
};

// Initialize dashboard
async function initDashboard() {
    try {
        // Check authentication
        await auth.requireAuth();
        await auth.requireRole('sekretaris');

        // Display user info
        displayUserInfo();

        // Load initial data
        await loadStats();
        await loadDocuments();

        // Setup event listeners
        setupEventListeners();

        // Setup real-time subscriptions
        setupRealtimeSubscription();
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

    // Filter buttons
    document.getElementById('apply-filter-btn').addEventListener('click', applyFilters);
    document.getElementById('refresh-btn').addEventListener('click', () => {
        loadStats();
        loadDocuments();
    });

    // Review modal
    document.getElementById('close-review-modal').addEventListener('click', closeReviewModal);
    document.getElementById('cancel-review-btn').addEventListener('click', closeReviewModal);
    document.getElementById('request-revision-btn').addEventListener('click', showRevisionNoteModal);
    document.getElementById('validate-btn').addEventListener('click', validateDocument);

    // Revision note modal
    document.getElementById('close-revision-note-modal').addEventListener('click', closeRevisionNoteModal);
    document.getElementById('cancel-revision-note-btn').addEventListener('click', closeRevisionNoteModal);
    document.getElementById('submit-revision-btn').addEventListener('click', submitRevision);

    // Modal click outside
    document.getElementById('review-modal').addEventListener('click', (e) => {
        if (e.target.id === 'review-modal') closeReviewModal();
    });

    document.getElementById('revision-note-modal').addEventListener('click', (e) => {
        if (e.target.id === 'revision-note-modal') closeRevisionNoteModal();
    });
}

// Apply filters
function applyFilters() {
    currentFilters.status = document.getElementById('filter-status').value;
    currentFilters.type = document.getElementById('filter-type').value;
    loadDocuments();
}

// Load statistics
async function loadStats() {
    try {
        const { data, error } = await auth.supabase
            .from('documents')
            .select('status');

        if (error) throw error;

        const stats = {
            pending: 0,
            revision: 0,
            validated: 0
        };

        data.forEach(doc => {
            stats[doc.status]++;
        });

        document.getElementById('pending-count').textContent = stats.pending;
        document.getElementById('revision-count').textContent = stats.revision;
        document.getElementById('validated-count').textContent = stats.validated;
    } catch (error) {
        console.error('Error loading stats:', error);
    }
}

// Load documents
async function loadDocuments() {
    try {
        let query = auth.supabase
            .from('documents')
            .select('*')
            .order('created_at', { ascending: false });

        // Apply filters
        if (currentFilters.status) {
            query = query.eq('status', currentFilters.status);
        }

        if (currentFilters.type) {
            query = query.eq('document_type', currentFilters.type);
        }

        const { data: documents, error } = await query;

        if (error) {
            console.error('Error loading documents:', error);
            throw error;
        }

        displayDocuments(documents || []);
    } catch (error) {
        console.error('Error loading documents:', error);
        toast.error('Gagal memuat dokumen');
    }
}

// Display documents in table
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
      <td>
        <div style="font-weight: 500;">${doc.uploader_name || 'Tidak diketahui'}</div>
      </td>
      <td>${renderStatusBadge(doc.status)}</td>
      <td>${formatDateShort(doc.submitted_at)}</td>
      <td>${doc.document_number || '-'}</td>
      <td>
        <div class="d-flex gap-1">
          <a href="${doc.file_url}" target="_blank" class="btn btn-sm btn-secondary" title="Lihat File">👁️</a>
          <button class="btn btn-sm btn-primary" onclick="reviewDocument('${doc.id}')" title="Review">📝</button>
        </div>
      </td>
    </tr>
  `).join('');
}

// Review document
async function reviewDocument(documentId) {
    try {
        showLoading('Memuat dokumen...');

        const { data, error } = await auth.supabase
            .from('documents')
            .select(`
                *,
                uploaded_by:users!documents_uploaded_by_fkey(full_name, email),
                revisions:document_revisions(
                    *,
                    created_by:users!document_revisions_created_by_fkey(full_name)
                )
            `)
            .eq('id', documentId)
            .single();

        if (error) throw error;

        currentDocument = data;

        hideLoading();

        // Display document details
        const modalContent = document.getElementById('review-content');
        modalContent.innerHTML = `
      <div style="padding: 1rem; background: var(--color-gray-50); border-radius: var(--radius-md); margin-bottom: 1.5rem;">
        <h4 style="margin-bottom: 1rem;">${data.title}</h4>
        
        <div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 1rem; margin-bottom: 1rem;">
          <div>
            <div class="text-secondary" style="font-size: 0.875rem;">Jenis Dokumen</div>
            <div style="font-weight: 500;">${renderDocumentType(data.document_type)}</div>
          </div>
          
          <div>
            <div class="text-secondary" style="font-size: 0.875rem;">Status</div>
            <div>${renderStatusBadge(data.status)}</div>
          </div>
          
          <div>
            <div class="text-secondary" style="font-size: 0.875rem;">Pengunggah</div>
            <div style="font-weight: 500;">${data.uploaded_by?.full_name || 'Unknown'}</div>
            <div style="font-size: 0.75rem;">${data.uploaded_by?.email || ''}</div>
          </div>
          
          <div>
            <div class="text-secondary" style="font-size: 0.875rem;">Tanggal Upload</div>
            <div style="font-weight: 500;">${formatDate(data.submitted_at)}</div>
          </div>
        </div>

        ${data.description ? `
          <div style="margin-bottom: 1rem;">
            <div class="text-secondary" style="font-size: 0.875rem; margin-bottom: 0.5rem;">Deskripsi</div>
            <div style="white-space: pre-wrap;">${data.description}</div>
          </div>
        ` : ''}

        <div>
          <a href="${data.file_url}" target="_blank" class="btn btn-primary btn-sm">
            📄 Buka File Dokumen
          </a>
        </div>
      </div>

      ${data.revisions && data.revisions.length > 0 ? `
        <div style="margin-bottom: 1.5rem;">
          <h4 style="margin-bottom: 0.75rem;">Riwayat Revisi</h4>
          ${data.revisions.map(rev => `
            <div style="padding: 1rem; background: var(--color-gray-50); border-radius: var(--radius-md); margin-bottom: 0.75rem; border-left: 4px solid var(--color-warning);">
              <div style="display: flex; justify-content: space-between; margin-bottom: 0.5rem;">
                <strong>${rev.created_by?.full_name || 'Sekretaris'}</strong>
                <span class="text-secondary" style="font-size: 0.875rem;">${formatDate(rev.created_at)}</span>
              </div>
              <p style="margin: 0; white-space: pre-wrap;">${rev.revision_note}</p>
            </div>
          `).join('')}
        </div>
      ` : ''}

      ${data.document_number ? `
        <div style="padding: 1rem; background: var(--color-success); color: white; border-radius: var(--radius-md); text-align: center;">
          <div style="font-size: 0.875rem; opacity: 0.9;">Nomor Surat</div>
          <div style="font-size: 1.5rem; font-weight: 700; margin-top: 0.25rem;">${data.document_number}</div>
        </div>
      ` : ''}
    `;

        // Show/hide action buttons based on status
        const validateBtn = document.getElementById('validate-btn');
        const revisionBtn = document.getElementById('request-revision-btn');

        if (data.status === 'validated') {
            validateBtn.style.display = 'none';
            revisionBtn.style.display = 'none';
        } else {
            validateBtn.style.display = 'inline-flex';
            revisionBtn.style.display = 'inline-flex';
        }

        document.getElementById('review-modal').classList.add('show');
    } catch (error) {
        hideLoading();
        console.error('Error loading document:', error);
        toast.error('Gagal memuat dokumen');
    }
}

// Close review modal
function closeReviewModal() {
    document.getElementById('review-modal').classList.remove('show');
    currentDocument = null;
}

// Show revision note modal
function showRevisionNoteModal() {
    document.getElementById('review-modal').classList.remove('show');
    document.getElementById('revision-note').value = '';
    document.getElementById('revision-note-modal').classList.add('show');
}

// Close revision note modal
function closeRevisionNoteModal() {
    document.getElementById('revision-note-modal').classList.remove('show');
    document.getElementById('review-modal').classList.add('show');
}

// Submit revision
async function submitRevision() {
    if (!currentDocument) return;

    const revisionNote = document.getElementById('revision-note').value.trim();

    if (!revisionNote) {
        toast.warning('Masukkan catatan revisi');
        return;
    }

    try {
        showLoading('Mengirim catatan revisi...');

        const user = auth.getCurrentUser();

        // Insert revision note
        const { error: revisionError } = await auth.supabase
            .from('document_revisions')
            .insert([
                {
                    document_id: currentDocument.id,
                    revision_note: revisionNote,
                    created_by: user.id
                }
            ]);

        if (revisionError) throw revisionError;

        // Update document status
        const { error: updateError } = await auth.supabase
            .from('documents')
            .update({
                status: 'revision',
                reviewed_at: new Date().toISOString(),
                reviewed_by: user.id
            })
            .eq('id', currentDocument.id);

        if (updateError) throw updateError;

        hideLoading();
        toast.success('Catatan revisi berhasil dikirim');

        closeRevisionNoteModal();
        closeReviewModal();

        // Reload data
        await loadStats();
        await loadDocuments();
    } catch (error) {
        hideLoading();
        console.error('Error submitting revision:', error);
        toast.error('Gagal mengirim catatan revisi');
    }
}

// Validate document
async function validateDocument() {
    if (!currentDocument) return;

    const confirmed = await confirm(
        'Validasi dokumen ini? Nomor surat akan digenerate otomatis.',
        'Konfirmasi Validasi'
    );

    if (!confirmed) return;

    try {
        showLoading('Memvalidasi dokumen...');

        const user = auth.getCurrentUser();

        // Get document count for numbering
        const { count } = await auth.supabase
            .from('documents')
            .select('*', { count: 'exact', head: true })
            .eq('document_type', currentDocument.document_type)
            .eq('status', 'validated');

        // Generate document number
        const documentNumber = generateDocumentNumber(
            currentDocument.document_type,
            (count || 0) + 1
        );

        // Update document
        const { error } = await auth.supabase
            .from('documents')
            .update({
                status: 'validated',
                document_number: documentNumber,
                reviewed_at: new Date().toISOString(),
                reviewed_by: user.id
            })
            .eq('id', currentDocument.id);

        if (error) throw error;

        hideLoading();
        toast.success(`Dokumen berhasil divalidasi! Nomor: ${documentNumber}`);

        closeReviewModal();

        // Reload data
        await loadStats();
        await loadDocuments();
    } catch (error) {
        hideLoading();
        console.error('Error validating document:', error);
        toast.error('Gagal memvalidasi dokumen');
    }
}

// Setup real-time subscription for live updates
function setupRealtimeSubscription() {
    const channel = auth.supabase
        .channel('documents-changes')
        .on(
            'postgres_changes',
            {
                event: '*',
                schema: 'public',
                table: 'documents'
            },
            (payload) => {
                console.log('Document change detected:', payload);
                // Reload data when changes occur
                loadStats();
                loadDocuments();
            }
        )
        .subscribe();
}

// Make reviewDocument global
window.reviewDocument = reviewDocument;

// Initialize on page load
document.addEventListener('DOMContentLoaded', initDashboard);
