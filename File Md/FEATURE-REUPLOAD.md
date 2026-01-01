# ✅ Fitur Baru: Upload Ulang untuk Dokumen Revisi

## 🎯 Fitur yang Ditambahkan:

Sekarang anggota bisa **upload ulang file** untuk dokumen yang di-revisi oleh sekretaris!

### Workflow:

1. **Sekretaris minta revisi** ✏️
   - Dokumen status → "Perlu Revisi"
   - Catatan revisi dikirim ke anggota

2. **Anggota lihat revisi** 👁️
   - Baca catatan revisi
   - Perbaiki dokumen

3. **Anggota upload ulang** 🔄 (NEW!)
   - Klik tombol "Upload Ulang" (🔄)
   - Pilih file baru
   - File lama **otomatis dihapus**
   - Status kembali ke "Menunggu Review"

4. **Sekretaris review lagi** 📝
   - Dokumen masuk queue review lagi
   - Proses seperti biasa

---

## 📋 Yang Diubah:

### 1. **Member Dashboard JS**
File: `js/member-dashboard.js`

✅ **Added Functions:**
- `showReuploadModal(documentId)` - Show upload modal
- `handleReupload()` - Process re-upload:
  - Delete old file from storage
  - Upload new file
  - Update database
  - Reset status to "pending"

### 2. **Display Table**
File: `js/member-dashboard.js`

✅ **Added Button:**
```html
<!-- For documents with status = 'revision' -->
<button onclick="showReuploadModal('doc-id')">🔄</button>
```

### 3. **Database Policy**
File: `database/supabase-schema.sql`

✅ **Updated RLS:**
```sql
-- Before: Hanya bisa update pending
USING (uploaded_by = auth.uid() AND status = 'pending')

-- After: Bisa update pending DAN revision
USING (uploaded_by = auth.uid() AND status IN ('pending', 'revision'))
```

---

## 🔄 User Flow Example:

### Scenario: Dokumen Perlu Revisi

**Anggota:**
1. Upload "Surat Permohonan.pdf"
2. Status: "Menunggu Review" ⏳

**Sekretaris:**
1. Review dokumen
2. "Tanggal salah, tolong perbaiki"
3. Klik "Minta Revisi"
4. Status: "Perlu Revisi" ✏️

**Anggota (Sekarang bisa upload ulang!):**
1. Lihat dokumen → status "Perlu Revisi"
2. Klik button Revisi (✏️) → baca catatan
3. **Klik button Upload Ulang (🔄)** ← NEW!
4. Pilih file yang sudah diperbaiki
5. Klik "Upload Ulang"
6. ✅ File lama dihapus
7. ✅ File baru terupload
8. ✅ Status kembali "Menunggu Review"

**Sekretaris:**
1. Lihat dokumen baru di queue
2. Review ulang
3. Validate atau minta revisi lagi

---

## 🎨 UI Changes:

### Document List - Status Revision:

| Judul | Jenis | Status | Aksi |
|-------|-------|--------|------|
| Surat Permohonan | Surat Masuk | 🔴 Perlu Revisi | 👁️ ✏️ **🔄** |

**Buttons:**
- 👁️ = Lihat File
- ✏️ = Lihat Catatan Revisi
- 🔄 = **Upload Ulang** (NEW!)

### Re-upload Modal:

```
┌─────────────────────────────────┐
│ Upload Ulang Dokumen        × │
├─────────────────────────────────┤
│ File lama akan dihapus dan      │
│ diganti dengan file baru.       │
│ Status akan kembali ke          │
│ "Menunggu Review".              │
│                                 │
│ Pilih File Baru:                │
│ [Choose file...]                │
│                                 │
│ 📎 Surat_Fixed.pdf              │
│    2.5 MB                       │
├─────────────────────────────────┤
│         [Batal] [Upload Ulang]  │
└─────────────────────────────────┘
```

---

## ✅ Testing Checklist:

- [ ] Upload document sebagai Anggota
- [ ] Sekretaris minta revisi dengan catatan
- [ ] Anggota lihat button "Upload Ulang" (🔄)
- [ ] Klik Upload Ulang
- [ ] Pilih file baru
- [ ] Submit
- [ ] Verify:
  - ✅ File lama terhapus dari Supabase Storage
  - ✅ File baru terupload
  - ✅ Status kembali "Menunggu Review"
  - ✅ reviewed_at dan reviewed_by = null
- [ ] Sekretaris bisa review ulang

---

## 🔒 Security:

✅ **RLS Policy Updated:**
- Anggota hanya bisa update dokumen **milik mereka sendiri**
- Hanya bisa update jika status **pending** atau **revision**
- Tidak bisa update jika sudah **validated**

✅ **File Management:**
- Old file deleted from storage (cleanup)
- New file uploaded with proper permissions
- File path updated in database

---

## 📝 Notes:

- **File lama otomatis dihapus** untuk menghemat storage
- **Status reset** memastikan sekretaris review lagi
- **Reviewed data cleared** untuk tracking yang akurat
- **Anggota tidak bisa upload ulang** jika status validated

---

**Status**: ✅ Feature COMPLETE! Ready to test!
