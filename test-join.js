// Test query join documents dengan users
const { data: docs, error } = await auth.supabase
    .from('documents')
    .select(`
        *,
        uploader:users!documents_uploaded_by_fkey(full_name, email)
    `);

console.log('Documents with uploader:', docs);
console.log('Error:', error);

// Lihat struktur data document pertama
if (docs && docs.length > 0) {
    console.log('First document:', docs[0]);
    console.log('Uploader data:', docs[0].uploader);
    console.log('uploaded_by UUID:', docs[0].uploaded_by);
}
