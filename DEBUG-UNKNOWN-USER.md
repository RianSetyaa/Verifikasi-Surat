# 🔍 Debugging: Unknown User Name Issue

## Kemungkinan Penyebab:

### 1. **User Profile Belum Dibuat di Tabel `users`**
   Saat register, profil user mungkin gagal dibuat di tabel `users`.

### 2. **Foreign Key Join Gagal**
   Join antara `documents.uploaded_by` dan `users.id` tidak match.

---

## 📋 Cara Debug:

### **Step 1: Cek Data di Supabase Dashboard**

1. **Buka Supabase Dashboard** → Table Editor
2. **Cek tabel `users`**:
   ```sql
   SELECT * FROM users;
   ```
   - Pastikan ada data user yang sudah register
   - Lihat apakah `id`, `email`, `full_name` terisi

3. **Cek tabel `documents`**:
   ```sql
   SELECT id, title, uploaded_by FROM documents;
   ```
   - Lihat nilai `uploaded_by` (harus UUID yang sama dengan `users.id`)

4. **Test Join Manual**:
   ```sql
   SELECT 
     d.title,
     d.uploaded_by,
     u.full_name,
     u.email
   FROM documents d
   LEFT JOIN users u ON d.uploaded_by = u.id;
   ```
   - Jika `full_name` NULL → User profile tidak ada di tabel `users`

---

## 🔧 Solusi Berdasarkan Hasil:

### **Jika User Profile TIDAK ADA di tabel `users`:**

**Penyebab**: Registrasi gagal membuat profile

**Solusi**: Buat profile manual di SQL Editor:

```sql
-- Ambil user ID dari auth.users
SELECT id, email FROM auth.users;

-- Insert ke tabel users (ganti dengan data asli)
INSERT INTO users (id, email, full_name, role)
VALUES 
  ('user-id-dari-auth-users', 'email@example.com', 'Nama Lengkap', 'anggota');
```

**Test lagi:**
1. Refresh dashboard sekretaris
2. Nama harus muncul

---

### **Jika User Profile SUDAH ADA tapi masih Unknown:**

**Penyebab**: Issue dengan query atau RLS policy

**Solusi Alternatif**: Query langsung tanpa join

Update `js/secretary-dashboard.js`:

```javascript
// Load documents tanpa join
async function loadDocuments() {
    try {
        const { data: docs, error } = await auth.supabase
            .from('documents')
            .select('*')
            .order('created_at', { ascending: false });

        if (error) throw error;

        // Fetch user data untuk setiap dokumen
        const docsWithUsers = await Promise.all(
            (docs || []).map(async (doc) => {
                const { data: user } = await auth.supabase
                    .from('users')
                    .select('full_name, email')
                    .eq('id', doc.uploaded_by)
                    .single();

                return {
                    ...doc,
                    uploaded_by: user || { 
                        full_name: 'User tidak ditemukan', 
                        email: '' 
                    }
                };
            })
        );

        displayDocuments(docsWithUsers);
    } catch (error) {
        console.error('Error loading documents:', error);
        toast.error('Gagal memuat dokumen');
    }
}
```

---

## 🎯 Quick Fix (Paling Mudah):

### **1. Buka Browser Console (F12)**

Lihat error message lengkapnya. Screenshot dan kirim ke saya.

### **2. Test Query Langsung di Console:**

Paste ini di browser console (saat di dashboard sekretaris):

```javascript
// Test fetch documents
const { data: docs, error: docError } = await auth.supabase
    .from('documents')
    .select('id, title, uploaded_by')
    .limit(1);

console.log('Documents:', docs);
console.log('Error:', docError);

// Test fetch users
const { data: users, error: userError } = await auth.supabase
    .from('users')
    .select('*');

console.log('Users:', users);
console.log('Error:', userError);

// Test join
const { data: joined, error: joinError } = await auth.supabase
    .from('documents')
    .select('*, uploader:users!documents_uploaded_by_fkey(full_name, email)')
    .limit(1);

console.log('Joined:', joined);
console.log('Join Error:', joinError);
```

Screenshot hasil console dan kirim ke saya!

---

## ✅ Temporary Fix:

Saya sudah update code untuk **fallback** jika join gagal:
- Jika user data tidak ditemukan → Tampilkan "User [ID]..."
- Jika sama sekali gagal → Tampilkan "Profil tidak ditemukan"

**Refresh browser** dan lihat apa yang muncul sekarang.

---

**Beri tahu saya hasil debug di atas agar saya bisa bantu lebih spesifik!** 🔍
