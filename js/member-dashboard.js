// Member Dashboard JavaScript

let selectedFile = null;

// Initialize dashboard
async function initDashboard() {
    try {
        // Check authentication
        await auth.requireAuth();
        await auth.requireRole('anggota');

        // Display user info
        displayUserInfo();

        // Load documents
        await loadDocuments();

        // Setup event listeners
        setupEventListeners();
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

    // Upload zone click
    const uploadZone = document.getElementById('upload-zone');
    const fileInput = document.getElementById('file-input');

    uploadZone.addEventListener('click', () => {
        fileInput.click();
    });

    // Drag and drop
    uploadZone.addEventListener('dragover', (e) => {
        e.preventDefault();
        uploadZone.classList.add('drag-over');
    });

    uploadZone.addEventListener('dragleave', () => {
        uploadZone.classList.remove('drag-over');
    });

    uploadZone.addEventListener('drop', (e) => {
        e.preventDefault();
        uploadZone.classList.remove('drag-over');

        const files = e.dataTransfer.files;
        if (files.length > 0) {
            handleFileSelect(files[0]);
        }
    });

    // File input change
    fileInput.addEventListener('change', (e) => {
        if (e.target.files.length > 0) {
            handleFileSelect(e.target.files[0]);
        }
    });

    // Remove file
    document.getElementById('remove-file').addEventListener('click', () => {
        clearFileSelection();
    });

    // Form submission
    document.getElementById('upload-form').addEventListener('submit', handleFormSubmit);

    // Refresh button
    document.getElementById('refresh-btn').addEventListener('click', loadDocuments);

    // Revision modal close
    document.getElementById('close-revision-modal').addEventListener('click', closeRevisionModal);
    document.getElementById('close-revision-btn').addEventListener('click', closeRevisionModal);
    document.getElementById('revision-modal').addEventListener('click', (e) => {
        if (e.target.id === 'revision-modal') {
            closeRevisionModal();
        }
    });
}

// Handle file selection
function handleFileSelect(file) {
    try {
        // Validate file
        validateFile(file);

        selectedFile = file;

        // Display file info
        document.getElementById('file-name').textContent = file.name;
        document.getElementById('file-size').textContent = formatFileSize(file.size);
        document.getElementById('file-info').style.display = 'block';
        document.getElementById('upload-zone').style.display = 'none';
    } catch (error) {
        toast.error(error.message);
        clearFileSelection();
    }
}

// Clear file selection
function clearFileSelection() {
    selectedFile = null;
    document.getElementById('file-input').value = '';
    document.getElementById('file-info').style.display = 'none';
    document.getElementById('upload-zone').style.display = 'flex';
}

// Handle form submission
async function handleFormSubmit(e) {
    e.preventDefault();

    if (!selectedFile) {
        toast.error('Pilih file terlebih dahulu');
        return;
    }

    const formData = new FormData(e.target);
    const uploaderName = formData.get('uploaderName');
    const title = formData.get('title');
    const documentType = formData.get('documentType');
    const description = formData.get('description');

    try {
        showLoading('Mengupload dokumen...');

        // Upload to Supabase Storage
        const uploadResult = await storage.uploadFile(selectedFile, {
            title,
            description,
            documentType: renderDocumentType(documentType)
        });

        // Save to Supabase database
        const user = auth.getCurrentUser();
        const { data, error } = await auth.supabase
            .from('documents')
            .insert([
                {
                    title,
                    document_type: documentType,
                    description,
                    uploaded_by: user.id,
                    uploader_name: uploaderName,  // Simpan nama langsung dari form
                    file_url: uploadResult.fileUrl,
                    file_path: uploadResult.path,
                    file_name: uploadResult.fileName,
                    file_size: uploadResult.fileSize,
                    status: 'pending'
                }
            ])
            .select()
            .single();

        if (error) throw error;

        hideLoading();
        toast.success('Dokumen berhasil diupload!');

        // Reset form
        e.target.reset();
        clearFileSelection();

        // Reload documents
        await loadDocuments();
    } catch (error) {
        hideLoading();
        console.error('Error uploading document:', error);
        toast.error(error.message || 'Gagal mengupload dokumen. Coba lagi.');
    }
}

// Load documents
async function loadDocuments() {
    try {
        const user = auth.getCurrentUser();

        const { data, error } = await auth.supabase
            .from('documents')
            .select('*')
            .eq('uploaded_by', user.id)
            .order('created_at', { ascending: false });

        if (error) throw error;

        displayDocuments(data || []);
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
      <td>${renderStatusBadge(doc.status)}</td>
      <td>${formatDateShort(doc.submitted_at)}</td>
      <td>${doc.document_number || '-'}</td>
      <td>
        <div class="d-flex gap-1">
          <a href="${doc.file_url}" target="_blank" class="btn btn-sm btn-secondary" title="Lihat File">👁️</a>
          ${doc.status === 'revision' ? `
            <button class="btn btn-sm btn-warning" onclick="viewRevisions('${doc.id}')" title="Lihat Revisi">✏️</button>
            <button class="btn btn-sm btn-primary" onclick="showReuploadModal('${doc.id}')" title="Upload Ulang">🔄</button>
          ` : ''}
          ${doc.status === 'validated' && doc.document_number ? `
            <button class="btn btn-sm btn-success" onclick="downloadDocument('${doc.id}')" title="Download Surat">⬇️</button>
          ` : ''}
        </div>
      </td>
    </tr>
  `).join('');
}

// View revisions
async function viewRevisions(documentId) {
    try {
        showLoading('Memuat catatan revisi...');

        const { data, error } = await auth.supabase
            .from('document_revisions')
            .select(`
        *,
        created_by:users!document_revisions_created_by_fkey(full_name)
      `)
            .eq('document_id', documentId)
            .order('created_at', { ascending: false });

        if (error) throw error;

        hideLoading();

        const modalContent = document.getElementById('revision-content');

        if (!data || data.length === 0) {
            modalContent.innerHTML = '<p class="text-secondary">Tidak ada catatan revisi</p>';
        } else {
            modalContent.innerHTML = data.map(revision => `
        <div style="padding: 1rem; background: var(--color-gray-50); border-radius: var(--radius-md); margin-bottom: 1rem; border-left: 4px solid var(--color-warning);">
          <div style="display: flex; justify-content: space-between; margin-bottom: 0.5rem;">
            <strong>${revision.created_by?.full_name || 'Sekretaris'}</strong>
            <span class="text-secondary" style="font-size: 0.875rem;">${formatDate(revision.created_at)}</span>
          </div>
          <p style="margin: 0; white-space: pre-wrap;">${revision.revision_note}</p>
        </div>
      `).join('');
        }

        document.getElementById('revision-modal').classList.add('show');
    } catch (error) {
        hideLoading();
        console.error('Error loading revisions:', error);
        toast.error('Gagal memuat catatan revisi');
    }
}

// Close revision modal
function closeRevisionModal() {
    document.getElementById('revision-modal').classList.remove('show');
}

// Re-upload functionality for revised documents
let reuploadDocumentId = null;
let reuploadFile = null;

function showReuploadModal(documentId) {
    reuploadDocumentId = documentId;
    reuploadFile = null;

    // Show modal
    const modal = document.createElement('div');
    modal.id = 'reupload-modal';
    modal.className = 'modal show';
    modal.innerHTML = `
        <div class="modal-dialog">
            <div class="modal-header">
                <h3 class="modal-title">Upload Ulang Dokumen</h3>
                <button class="modal-close" onclick="closeReuploadModal()">×</button>
            </div>
            <div class="modal-body">
                <p class="text-secondary" style="margin-bottom: 1rem;">
                    File lama akan dihapus dan diganti dengan file baru. Status akan kembali ke "Menunggu Review".
                </p>
                <div class="form-group">
                    <label class="form-label">Pilih File Baru</label>
                    <input type="file" id="reupload-file-input" class="form-control" 
                           accept=".pdf,.doc,.docx,.jpg,.jpeg,.png" required>
                    <small class="text-secondary">Mendukung PDF, DOC, DOCX, JPG, PNG (Maks. 10MB)</small>
                </div>
                <div id="reupload-file-info" style="display: none; margin-top: 1rem; padding: 1rem; background: var(--color-gray-50); border-radius: var(--radius-md);">
                    <div style="display: flex; align-items: center; gap: 1rem;">
                        <div style="font-size: 2rem;">📎</div>
                        <div style="flex: 1;">
                            <div id="reupload-file-name" style="font-weight: 600;"></div>
                            <div id="reupload-file-size" class="text-secondary" style="font-size: 0.875rem;"></div>
                        </div>
                    </div>
                </div>
            </div>
            <div class="modal-footer">
                <button class="btn btn-secondary" onclick="closeReuploadModal()">Batal</button>
                <button class="btn btn-primary" id="reupload-submit-btn">Upload Ulang</button>
            </div>
        </div>
    `;

    document.body.appendChild(modal);

    // File input change handler
    document.getElementById('reupload-file-input').addEventListener('change', (e) => {
        if (e.target.files.length > 0) {
            const file = e.target.files[0];
            try {
                validateFile(file);
                reuploadFile = file;

                document.getElementById('reupload-file-name').textContent = file.name;
                document.getElementById('reupload-file-size').textContent = formatFileSize(file.size);
                document.getElementById('reupload-file-info').style.display = 'block';
            } catch (error) {
                toast.error(error.message);
                e.target.value = '';
            }
        }
    });

    // Submit handler
    document.getElementById('reupload-submit-btn').addEventListener('click', handleReupload);

    // Click outside to close
    modal.addEventListener('click', (e) => {
        if (e.target.id === 'reupload-modal') {
            closeReuploadModal();
        }
    });
}

function closeReuploadModal() {
    const modal = document.getElementById('reupload-modal');
    if (modal) {
        modal.remove();
    }
    reuploadDocumentId = null;
    reuploadFile = null;
}

async function handleReupload() {
    if (!reuploadDocumentId || !reuploadFile) {
        toast.error('Pilih file terlebih dahulu');
        return;
    }

    try {
        showLoading('Mengupload ulang dokumen...');

        // Get current document data
        const { data: currentDoc, error: fetchError } = await auth.supabase
            .from('documents')
            .select('file_path')
            .eq('id', reuploadDocumentId)
            .single();

        if (fetchError) throw fetchError;

        // Delete old file from storage if exists
        if (currentDoc.file_path) {
            try {
                await storage.deleteFile(currentDoc.file_path);
            } catch (deleteError) {
                console.warn('Could not delete old file:', deleteError);
                // Continue anyway, non-critical
            }
        }

        // Upload new file
        const uploadResult = await storage.uploadFile(reuploadFile);

        // Update document in database
        const { error: updateError } = await auth.supabase
            .from('documents')
            .update({
                file_url: uploadResult.fileUrl,
                file_path: uploadResult.path,
                file_name: uploadResult.fileName,
                file_size: uploadResult.fileSize,
                status: 'pending', // Reset to pending for re-review
                reviewed_at: null,
                reviewed_by: null
            })
            .eq('id', reuploadDocumentId);

        if (updateError) throw updateError;

        hideLoading();
        toast.success('Dokumen berhasil diupload ulang! Menunggu review.');

        closeReuploadModal();

        // Reload documents
        await loadDocuments();
    } catch (error) {
        hideLoading();
        console.error('Error reuploading document:', error);
        toast.error(error.message || 'Gagal upload ulang. Coba lagi.');
    }
}

// Download verified document
async function downloadDocument(documentId) {
    try {
        showLoading('Memuat dokumen...');

        const { data, error } = await auth.supabase
            .from('documents')
            .select('file_url, document_number, title, document_type, status')
            .eq('id', documentId)
            .single();

        if (error) throw error;

        // Check if document is validated
        if (data.status !== 'validated' || !data.document_number) {
            hideLoading();
            toast.warning('Hanya dokumen yang sudah tervalidasi yang dapat diunduh');
            return;
        }

        hideLoading();

        // Use utility function to download
        await downloadVerifiedDocument(
            data.file_url,
            data.document_number,
            data.title,
            data.document_type
        );
    } catch (error) {
        hideLoading();
        console.error('Error downloading document:', error);
        toast.error('Gagal mengunduh dokumen');
    }
}

// Make viewRevisions and showReuploadModal global
window.viewRevisions = viewRevisions;
window.showReuploadModal = showReuploadModal;
window.downloadDocument = downloadDocument;

// Initialize on page load
document.addEventListener('DOMContentLoaded', initDashboard);
