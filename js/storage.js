// Supabase Storage module for file uploads

class StorageManager {
    constructor() {
        this.bucket = CONFIG.app.storage.bucket;
    }

    /**
     * Upload file to Supabase Storage
     * @param {File} file - File object to upload
     * @param {Object} metadata - Document metadata
     * @returns {Promise<Object>} Upload result with file URL and path
     */
    async uploadFile(file, metadata = {}) {
        try {
            // Validate file
            this.validateFile(file);

            const user = auth.getCurrentUser();
            if (!user) {
                throw new Error('User not authenticated');
            }

            // Generate unique filename
            const timestamp = Date.now();
            const sanitizedFileName = this.sanitizeFilename(file.name);
            const filePath = `${user.id}/${timestamp}_${sanitizedFileName}`;

            // Upload to Supabase Storage
            const { data, error } = await auth.supabase.storage
                .from(this.bucket)
                .upload(filePath, file, {
                    cacheControl: '3600',
                    upsert: false,
                    contentType: file.type
                });

            if (error) {
                console.error('Upload error:', error);
                throw error;
            }

            // Get public URL
            const { data: urlData } = auth.supabase.storage
                .from(this.bucket)
                .getPublicUrl(filePath);

            return {
                path: data.path,
                fullPath: data.fullPath,
                fileUrl: urlData.publicUrl,
                fileName: file.name,
                fileSize: file.size,
                fileType: file.type
            };
        } catch (error) {
            console.error('Error uploading file:', error);
            throw error;
        }
    }

    /**
     * Delete file from Supabase Storage
     * @param {string} filePath - Path to file in storage
     * @returns {Promise<boolean>}
     */
    async deleteFile(filePath) {
        try {
            const { error } = await auth.supabase.storage
                .from(this.bucket)
                .remove([filePath]);

            if (error) throw error;

            return true;
        } catch (error) {
            console.error('Error deleting file:', error);
            throw error;
        }
    }

    /**
     * Get file URL from storage path
     * @param {string} filePath - Path to file in storage
     * @returns {string} Public URL
     */
    getFileUrl(filePath) {
        const { data } = auth.supabase.storage
            .from(this.bucket)
            .getPublicUrl(filePath);

        return data.publicUrl;
    }

    /**
     * Validate file before upload
     * @param {File} file - File to validate
     * @throws {Error} If file is invalid
     */
    validateFile(file) {
        const { maxFileSize, allowedFileTypes } = CONFIG.app.storage;

        // Check file size
        if (file.size > maxFileSize) {
            throw new Error(`Ukuran file terlalu besar. Maksimal ${maxFileSize / 1024 / 1024}MB`);
        }

        // Check file type
        if (!allowedFileTypes.includes(file.type)) {
            throw new Error('Tipe file tidak didukung. Gunakan PDF, DOC, DOCX, JPG, atau PNG');
        }

        return true;
    }

    /**
     * Sanitize filename to remove special characters
     * @param {string} filename - Original filename
     * @returns {string} Sanitized filename
     */
    sanitizeFilename(filename) {
        // Remove special characters except dots, hyphens, and underscores
        return filename.replace(/[^a-zA-Z0-9._-]/g, '_');
    }

    /**
     * Format file size to human readable
     * @param {number} bytes - File size in bytes
     * @returns {string} Formatted size
     */
    formatFileSize(bytes) {
        if (bytes === 0) return '0 Bytes';

        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));

        return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
    }
}

// Create global storage instance
const storage = new StorageManager();

// Export for use in other modules
window.storage = storage;
