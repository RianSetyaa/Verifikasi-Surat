// Configuration file for Supabase and Google Drive
// IMPORTANT: Ganti placeholder ini dengan credentials Anda yang sebenarnya

const CONFIG = {
  // Supabase Configuration
  // Dapatkan dari: https://app.supabase.com/project/YOUR_PROJECT/settings/api
  supabase: {
    url: 'https://fwtcvytfkmwzgkarcwxw.supabase.co', // contoh: https://xxxxx.supabase.co
    anonKey: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZ3dGN2eXRma213emdrYXJjd3h3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjcyMDk3MjIsImV4cCI6MjA4Mjc4NTcyMn0.7fCZLKElb2eidshRqgO2r5ERbeEIBC_oNPtXuY-TfFo' // Public anon key
  },

  // Application Settings
  app: {
    name: 'Sistem Manajemen Surat',
    version: '1.0.0',
    storage: {
      maxFileSize: 10 * 1024 * 1024, // 10MB
      allowedFileTypes: [
        'application/pdf',
        'application/msword',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'image/jpeg',
        'image/png'
      ],
      bucket: 'documents' // Supabase Storage bucket name
    },
    documentTypes: {
      surat_masuk: 'Surat Masuk',
      surat_keluar: 'Surat Keluar',
      notulensi: 'Notulensi'
    },
    statusTypes: {
      pending: 'Menunggu Review',
      revision: 'Perlu Revisi',
      validated: 'Tervalidasi'
    }
  }
};

// Validate configuration on load
function validateConfig() {
  const errors = [];

  if (CONFIG.supabase.url === 'YOUR_SUPABASE_URL') {
    errors.push('Supabase URL belum dikonfigurasi');
  }

  if (CONFIG.supabase.anonKey === 'YOUR_SUPABASE_ANON_KEY') {
    errors.push('Supabase Anon Key belum dikonfigurasi');
  }

  if (errors.length > 0 && window.location.pathname !== '/setup.html') {
    console.warn('⚠️ Konfigurasi belum lengkap:', errors);
  }
}

// Run validation
validateConfig();
