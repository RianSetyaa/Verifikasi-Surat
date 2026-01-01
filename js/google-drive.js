// Google Drive Integration Module

class GoogleDriveManager {
    constructor() {
        this.accessToken = null;
        this.tokenClient = null;
        this.gapiInited = false;
        this.gisInited = false;
    }

    // Initialize Google API
    async initGoogleAPI() {
        return new Promise((resolve) => {
            gapi.load('client', async () => {
                await gapi.client.init({
                    apiKey: CONFIG.googleDrive.apiKey,
                    discoveryDocs: ['https://www.googleapis.com/discovery/v1/apis/drive/v3/rest']
                });
                this.gapiInited = true;
                resolve();
            });
        });
    }

    // Initialize Google Identity Services
    initGoogleIdentity() {
        return new Promise((resolve) => {
            this.tokenClient = google.accounts.oauth2.initTokenClient({
                client_id: CONFIG.googleDrive.clientId,
                scope: CONFIG.googleDrive.scopes,
                callback: (response) => {
                    if (response.error) {
                        console.error('Error getting token:', response);
                        toast.error('Gagal login ke Google Drive');
                        return;
                    }
                    this.accessToken = response.access_token;
                }
            });
            this.gisInited = true;
            resolve();
        });
    }

    // Request access token
    async requestAccessToken() {
        return new Promise((resolve, reject) => {
            if (!this.tokenClient) {
                reject(new Error('Google Identity Services not initialized'));
                return;
            }

            this.tokenClient.callback = (response) => {
                if (response.error) {
                    reject(response);
                    return;
                }
                this.accessToken = response.access_token;
                resolve(response.access_token);
            };

            // Check if already have token
            if (gapi.client.getToken() === null) {
                this.tokenClient.requestAccessToken({ prompt: 'consent' });
            } else {
                this.tokenClient.requestAccessToken({ prompt: '' });
            }
        });
    }

    // Upload file to Google Drive
    async uploadFile(file, metadata = {}) {
        try {
            // Ensure we have access token
            if (!this.accessToken && !gapi.client.getToken()) {
                await this.requestAccessToken();
            }

            const { title = file.name, description = '', documentType = '' } = metadata;

            // Create file metadata
            const fileMetadata = {
                name: title,
                description: `${documentType} - ${description}`,
                parents: [CONFIG.googleDrive.folderId]
            };

            // Create form data for multipart upload
            const form = new FormData();
            form.append('metadata', new Blob([JSON.stringify(fileMetadata)], { type: 'application/json' }));
            form.append('file', file);

            // Upload to Google Drive
            const response = await fetch('https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id,name,webViewLink,webContentLink', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${this.accessToken || gapi.client.getToken().access_token}`
                },
                body: form
            });

            if (!response.ok) {
                throw new Error('Upload failed');
            }

            const result = await response.json();

            // Make file publicly accessible (optional - adjust based on your security needs)
            await this.makeFilePublic(result.id);

            return {
                fileId: result.id,
                fileName: result.name,
                webViewLink: result.webViewLink,
                webContentLink: result.webContentLink
            };
        } catch (error) {
            console.error('Error uploading to Google Drive:', error);
            throw error;
        }
    }

    // Make file publicly accessible (optional)
    async makeFilePublic(fileId) {
        try {
            const permission = {
                type: 'anyone',
                role: 'reader'
            };

            await gapi.client.drive.permissions.create({
                fileId: fileId,
                resource: permission
            });
        } catch (error) {
            console.warn('Could not make file public:', error);
            // Non-critical error, file is still uploaded
        }
    }

    // Delete file from Google Drive
    async deleteFile(fileId) {
        try {
            if (!this.accessToken && !gapi.client.getToken()) {
                await this.requestAccessToken();
            }

            await gapi.client.drive.files.delete({
                fileId: fileId
            });

            return true;
        } catch (error) {
            console.error('Error deleting file from Google Drive:', error);
            throw error;
        }
    }

    // Get file info
    async getFileInfo(fileId) {
        try {
            if (!this.accessToken && !gapi.client.getToken()) {
                await this.requestAccessToken();
            }

            const response = await gapi.client.drive.files.get({
                fileId: fileId,
                fields: 'id,name,mimeType,size,createdTime,modifiedTime,webViewLink,webContentLink'
            });

            return response.result;
        } catch (error) {
            console.error('Error getting file info:', error);
            throw error;
        }
    }

    // Check if initialized
    isReady() {
        return this.gapiInited && this.gisInited;
    }

    // Initialize both Google APIs
    async initialize() {
        try {
            if (this.isReady()) return;

            showLoading('Menginisialisasi Google Drive...');

            // Wait for Google API scripts to load
            await this.waitForGoogleScripts();

            // Initialize both APIs
            await Promise.all([
                this.initGoogleAPI(),
                this.initGoogleIdentity()
            ]);

            hideLoading();
            console.log('Google Drive initialized successfully');
        } catch (error) {
            hideLoading();
            console.error('Error initializing Google Drive:', error);
            throw error;
        }
    }

    // Wait for Google scripts to load
    waitForGoogleScripts() {
        return new Promise((resolve) => {
            const checkInterval = setInterval(() => {
                if (typeof gapi !== 'undefined' && typeof google !== 'undefined') {
                    clearInterval(checkInterval);
                    resolve();
                }
            }, 100);
        });
    }
}

// Create global Google Drive instance
const googleDrive = new GoogleDriveManager();

// Auto-initialize when scripts are loaded
if (typeof gapi !== 'undefined' && typeof google !== 'undefined') {
    googleDrive.initialize().catch(console.error);
}
