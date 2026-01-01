-- QUICK FIX: Buat User Profile untuk Semua Auth Users
-- Copy paste di Supabase SQL Editor

-- Step 1: Lihat siapa saja yang belum punya profile
SELECT 
  au.id,
  au.email,
  au.created_at,
  CASE WHEN u.id IS NULL THEN '❌ Tidak ada profile' ELSE '✅ Ada profile' END as status
FROM auth.users au
LEFT JOIN users u ON au.id = u.id
ORDER BY au.created_at DESC;

-- Step 2: Insert profile untuk SEMUA auth users yang belum punya
-- Ini akan otomatis buat profile dengan nama dari email
INSERT INTO users (id, email, full_name, role)
SELECT 
  au.id,
  au.email,
  COALESCE(
    au.raw_user_meta_data->>'full_name',  -- Ambil dari metadata jika ada
    SPLIT_PART(au.email, '@', 1)           -- Atau gunakan bagian depan email
  ) as full_name,
  'anggota' as role  -- Default role anggota
FROM auth.users au
LEFT JOIN users u ON au.id = u.id
WHERE u.id IS NULL;  -- Hanya yang belum ada profile

-- Step 3: Verifikasi semua user sudah punya profile
SELECT * FROM users ORDER BY created_at DESC;
