# Fitur Download Surat Terverifikasi

## Deskripsi
Fitur baru untuk mendownload surat yang sudah diverifikasi dengan format nama file yang sesuai nomor surat.

## Perubahan File

### 1. `js/utils.js`
- **Fungsi Baru**: `downloadVerifiedDocument(fileUrl, documentNumber, title, documentType)`
- **Fungsi**: Mendownload file surat dengan nama yang diformat sesuai nomor surat
- **Format Nama File**: `[Nomor-Surat] - [Judul].extension`
  - Contoh: `0001-PSM-I-2026 - Surat Permohonan Izin Kegiatan.pdf`
- **Fitur**:
  - Menghapus karakter ilegal dari nama file
  - Menampilkan loading indicator
  - Menampilkan notifikasi sukses/error
  - Membatasi panjang judul maksimal 50 karakter

### 2. `js/secretary-dashboard.js`
- **Fungsi Baru**: `downloadDocument(documentId)`
- **Lokasi Tombol**:
  1. **Tabel Dokumen**: Tombol download (⬇️) muncul hanya untuk surat dengan status "validated"
  2. **Review Modal**: Tombol "Download Surat" muncul di modal review untuk surat tervalidasi
- **Validasi**: Hanya dokumen dengan status "validated" dan memiliki document_number yang dapat didownload

### 3. `js/member-dashboard.js`
- **Fungsi Baru**: `downloadDocument(documentId)`
- **Lokasi Tombol**: Tabel dokumen - Tombol download (⬇️) muncul untuk surat tervalidasi milik anggota
- **Manfaat**: Anggota dapat mendownload surat mereka yang sudah diverifikasi

## Cara Penggunaan

### Untuk Sekretaris:
1. Buka **Dashboard Sekretaris**
2. Cari surat dengan status "Tervalidasi" 
3. Klik tombol download (⬇️) di kolom Aksi atau di Review Modal
4. File akan otomatis terdownload dengan nama yang sesuai

### Untuk Anggota:
1. Buka **Dashboard Anggota**
2. Cari surat Anda dengan status "Tervalidasi"
3. Klik tombol download (⬇️) di kolom Aksi
4. File akan otomatis terdownload dengan nama yang sesuai

## Validasi
- Tombol download hanya muncul untuk dokumen dengan:
  - Status = "validated"
  - Memiliki document_number (nomor surat)
- Jika user mencoba download surat yang belum tervalidasi, akan muncul peringatan

## Format Nama File
Nama file hasil download akan otomatis diformat:
- Nomor surat dengan slash (/) diganti dengan dash (-)
- Judul dibersihkan dari karakter ilegal: `< > : " / \ | ? *`
- Maksimal panjang judul: 50 karakter
- Ekstensi file dipertahankan sesuai aslinya

Contoh:
- **Input**: 
  - Nomor: `0001/PSM/I/2026`
  - Judul: `Surat Permohonan Izin Kegiatan`
  - Extension: `pdf`
- **Output**: `0001-PSM-I-2026 - Surat Permohonan Izin Kegiatan.pdf`

## Teknologi
- Fetch API untuk mengunduh file
- Blob API untuk membuat file download
- URL.createObjectURL untuk membuat temporary download link
- Auto cleanup setelah download selesai
