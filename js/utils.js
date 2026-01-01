// Utility Functions untuk Sistem Manajemen Surat

// Format tanggal ke format Indonesia
function formatDate(dateString) {
    if (!dateString) return '-';

    const date = new Date(dateString);
    const options = {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    };

    return new Intl.DateTimeFormat('id-ID', options).format(date);
}

// Format tanggal singkat (tanpa jam)
function formatDateShort(dateString) {
    if (!dateString) return '-';

    const date = new Date(dateString);
    const options = {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
    };

    return new Intl.DateTimeFormat('id-ID', options).format(date);
}

// Generate nomor surat otomatis
function generateDocumentNumber(documentType, sequence) {
    const year = new Date().getFullYear();
    const month = new Date().getMonth() + 1; // 1-12

    // Convert month to Roman numeral
    const monthRoman = convertToRoman(month);

    const typeCode = {
        'surat_masuk': 'PSM',     // PSM untuk Surat Masuk/Keluar
        'surat_keluar': 'PSM',    // PSM untuk Surat Masuk/Keluar
        'notulensi': 'NTL'        // NTL untuk Notulensi
    };

    const code = typeCode[documentType] || 'DOC';
    const seqNum = String(sequence).padStart(4, '0');

    // Format: 0001/PSM/I/2026 atau 0001/NTL/I/2026
    return `${seqNum}/${code}/${monthRoman}/${year}`;
}

// Convert number to Roman numeral (for months 1-12)
function convertToRoman(num) {
    const romanNumerals = {
        1: 'I',
        2: 'II',
        3: 'III',
        4: 'IV',
        5: 'V',
        6: 'VI',
        7: 'VII',
        8: 'VIII',
        9: 'IX',
        10: 'X',
        11: 'XI',
        12: 'XII'
    };

    return romanNumerals[num] || 'I';
}

// Render status badge HTML
function renderStatusBadge(status) {
    const statusConfig = {
        pending: {
            class: 'badge-pending',
            text: 'Menunggu Review',
            icon: '⏳'
        },
        revision: {
            class: 'badge-revision',
            text: 'Perlu Revisi',
            icon: '✏️'
        },
        validated: {
            class: 'badge-validated',
            text: 'Tervalidasi',
            icon: '✓'
        }
    };

    const config = statusConfig[status] || statusConfig.pending;
    return `<span class="badge ${config.class}">${config.icon} ${config.text}</span>`;
}

// Render document type label
function renderDocumentType(type) {
    const types = {
        'surat_masuk': 'Surat Masuk',
        'surat_keluar': 'Surat Keluar',
        'notulensi': 'Notulensi'
    };

    return types[type] || type;
}

// Toast notification system
class ToastNotification {
    constructor() {
        this.container = this.createContainer();
    }

    createContainer() {
        let container = document.querySelector('.toast-container');
        if (!container) {
            container = document.createElement('div');
            container.className = 'toast-container';
            document.body.appendChild(container);
        }
        return container;
    }

    show(message, type = 'info', duration = 3000) {
        const toast = document.createElement('div');
        toast.className = `toast toast-${type}`;

        const icon = {
            success: '✓',
            error: '✕',
            warning: '⚠',
            info: 'ℹ'
        }[type] || 'ℹ';

        toast.innerHTML = `
      <div style="font-size: 1.5rem;">${icon}</div>
      <div style="flex: 1;">
        <div style="font-weight: 600; margin-bottom: 0.25rem;">${this.getTitle(type)}</div>
        <div style="font-size: 0.875rem; color: var(--text-secondary);">${message}</div>
      </div>
      <button onclick="this.parentElement.remove()" style="background: none; border: none; cursor: pointer; font-size: 1.5rem; color: var(--text-secondary);">×</button>
    `;

        this.container.appendChild(toast);

        // Auto remove after duration
        setTimeout(() => {
            toast.style.animation = 'fadeOut 0.3s ease-in-out';
            setTimeout(() => toast.remove(), 300);
        }, duration);
    }

    getTitle(type) {
        const titles = {
            success: 'Berhasil',
            error: 'Kesalahan',
            warning: 'Peringatan',
            info: 'Informasi'
        };
        return titles[type] || 'Notifikasi';
    }

    success(message, duration) {
        this.show(message, 'success', duration);
    }

    error(message, duration) {
        this.show(message, 'error', duration);
    }

    warning(message, duration) {
        this.show(message, 'warning', duration);
    }

    info(message, duration) {
        this.show(message, 'info', duration);
    }
}

// Create global toast instance
const toast = new ToastNotification();

// Loading overlay
function showLoading(message = 'Memuat...') {
    let overlay = document.getElementById('loading-overlay');

    if (!overlay) {
        overlay = document.createElement('div');
        overlay.id = 'loading-overlay';
        overlay.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background: hsla(0, 0%, 0%, 0.7);
      backdrop-filter: blur(4px);
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 9999;
    `;

        overlay.innerHTML = `
      <div style="background: var(--bg-primary); padding: 2rem; border-radius: 1rem; text-align: center; min-width: 200px;">
        <div class="spinner" style="width: 48px; height: 48px; border: 4px solid var(--color-gray-200); border-top-color: var(--color-primary); border-radius: 50%; animation: spin 1s linear infinite; margin: 0 auto 1rem;"></div>
        <div id="loading-message" style="font-weight: 500;">${message}</div>
      </div>
    `;

        document.body.appendChild(overlay);

        // Add spin animation
        if (!document.getElementById('spin-animation')) {
            const style = document.createElement('style');
            style.id = 'spin-animation';
            style.textContent = `
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
      `;
            document.head.appendChild(style);
        }
    } else {
        overlay.style.display = 'flex';
        const messageEl = overlay.querySelector('#loading-message');
        if (messageEl) messageEl.textContent = message;
    }
}

function hideLoading() {
    const overlay = document.getElementById('loading-overlay');
    if (overlay) {
        overlay.style.display = 'none';
    }
}

// Confirm dialog
function confirm(message, title = 'Konfirmasi') {
    return new Promise((resolve) => {
        const modal = document.createElement('div');
        modal.className = 'modal show';
        modal.innerHTML = `
      <div class="modal-dialog">
        <div class="modal-header">
          <h3 class="modal-title">${title}</h3>
        </div>
        <div class="modal-body">
          <p>${message}</p>
        </div>
        <div class="modal-footer">
          <button class="btn btn-secondary" id="cancel-btn">Batal</button>
          <button class="btn btn-primary" id="confirm-btn">Ya</button>
        </div>
      </div>
    `;

        document.body.appendChild(modal);

        modal.querySelector('#confirm-btn').onclick = () => {
            modal.remove();
            resolve(true);
        };

        modal.querySelector('#cancel-btn').onclick = () => {
            modal.remove();
            resolve(false);
        };

        modal.onclick = (e) => {
            if (e.target === modal) {
                modal.remove();
                resolve(false);
            }
        };
    });
}

// Validate file upload
function validateFile(file, options = {}) {
    const {
        maxSize = 10 * 1024 * 1024, // 10MB default
        allowedTypes = [
            'application/pdf',
            'application/msword',
            'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
            'image/jpeg',
            'image/png'
        ]
    } = options;

    if (file.size > maxSize) {
        throw new Error(`Ukuran file terlalu besar. Maksimal ${maxSize / 1024 / 1024}MB`);
    }

    if (!allowedTypes.includes(file.type)) {
        throw new Error('Tipe file tidak didukung. Gunakan PDF, DOC, DOCX, JPG, atau PNG');
    }

    return true;
}

// Format file size
function formatFileSize(bytes) {
    if (bytes === 0) return '0 Bytes';

    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));

    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
}

// Debounce function
function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

// Get file extension
function getFileExtension(filename) {
    return filename.slice((filename.lastIndexOf('.') - 1 >>> 0) + 2);
}

// Truncate text
function truncate(text, length = 50) {
    if (!text || text.length <= length) return text;
    return text.substring(0, length) + '...';
}

// Export utilities
window.utils = {
    formatDate,
    formatDateShort,
    generateDocumentNumber,
    renderStatusBadge,
    renderDocumentType,
    showLoading,
    hideLoading,
    confirm,
    validateFile,
    formatFileSize,
    debounce,
    getFileExtension,
    truncate,
    toast
};
