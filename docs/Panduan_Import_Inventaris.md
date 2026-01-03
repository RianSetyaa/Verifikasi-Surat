# Cara Import Inventaris dari CSV

## Quick Start

1. **Download Template**
   - Login sebagai sekretaris
   - Buka tab "📦 Inventaris"
   - Click tombol "📥 Download Template"

2. **Isi Template CSV**
   ```csv
   Nama Barang,Kuantitas,Kondisi,Lokasi,Deskripsi
   Microphone Wireless,5,Baik,Ruang Musik,Shure SM58
   Stand Mic,10,Baik,Gudang,Adjustable height
   Mixer Audio,1,Rusak Ringan,Studio,Channel 3 rusak
   ```

3. **Import Data**
   - Click tombol "📤 Import CSV"
   - Pilih file CSV yang sudah diisi
   - Konfirmasi import
   - Selesai! ✅

## Format CSV

### Kolom Wajib:
- **Nama Barang** - Nama item inventaris
- **Kuantitas** - Jumlah item (angka)
- **Kondisi** - Harus salah satu: `Baik`, `Rusak Ringan`, `Rusak Berat`, `Hilang`

### Kolom Opsional:
- **Lokasi** - Lokasi penyimpanan
- **Deskripsi** - Deskripsi tambahan

## Kondisi Valid
- ✅ `Baik`
- ⚠️ `Rusak Ringan`
- ❌ `Rusak Berat`
- 🚫 `Hilang`

## Tips
- Pastikan ejaan kondisi PERSIS sama
- Baris dengan data tidak lengkap akan diskip
- Baris dengan kondisi invalid akan diskip
- System akan konfirmasi jumlah data yang berhasil diimport

## Excel to CSV
Jika Anda punya data di Excel (.xlsx):
1. Buka file Excel
2. File → Save As
3. Pilih format "CSV (Comma delimited) (*.csv)"
4. Save
5. Import file CSV tersebut

> **Note**: CSV lebih sederhana dan kompatibel. Jika benar-benar butuh support langsung file Excel (.xlsx), saya bisa tambahkan library SheetJS.
