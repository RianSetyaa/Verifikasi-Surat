// Attendance Page Logic

// Initialize Supabase client for public use
const supabaseClient = window.supabase.createClient(
    CONFIG.supabase.url,
    CONFIG.supabase.anonKey
);

document.addEventListener('DOMContentLoaded', async () => {
    // Initialize
    updateDateDisplay();
    await loadMembers();
    setupEventListeners();
});

function updateDateDisplay() {
    const options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
    const dateStr = new Date().toLocaleDateString('id-ID', options);
    document.getElementById('current-date-display').textContent = dateStr;
}

async function loadMembers() {
    try {
        // Fetch active members from ukm_members table
        const { data, error } = await supabaseClient
            .from('ukm_members')
            .select('id, full_name, nim')
            .eq('is_active', true)
            .order('full_name');

        if (error) throw error;

        const select = document.getElementById('member-select');
        select.innerHTML = '<option value="" disabled selected>Pilih nama Anda...</option>';

        if (data && data.length > 0) {
            data.forEach(member => {
                const option = document.createElement('option');
                option.value = member.id;
                option.textContent = `${member.full_name} ${member.nim ? `(${member.nim})` : ''}`;
                select.appendChild(option);
            });
        } else {
            const option = document.createElement('option');
            option.disabled = true;
            option.textContent = 'Belum ada data anggota';
            select.appendChild(option);
        }

    } catch (error) {
        console.error('Error loading members:', error);
        toast.error('Gagal memuat daftar anggota');
    }
}

function setupEventListeners() {
    const reasonSection = document.getElementById('absence-details');
    const radioButtons = document.querySelectorAll('input[name="status"]');
    const reasonInput = document.getElementById('reason');
    const proofInput = document.getElementById('proof');
    const filePlaceholder = document.querySelector('.file-upload-placeholder');
    const form = document.getElementById('attendance-form');

    // Handle status change
    radioButtons.forEach(radio => {
        radio.addEventListener('change', (e) => {
            if (e.target.value === 'hadir') {
                reasonSection.style.display = 'none';
                reasonInput.required = false;
                proofInput.required = false;
            } else {
                reasonSection.style.display = 'block';
                reasonInput.required = true;
                // Proof required for sick/permit
                proofInput.required = true;
            }
        });
    });

    // Handle file selection trigger
    filePlaceholder.addEventListener('click', () => {
        proofInput.click();
    });

    // Handle file change display
    proofInput.addEventListener('change', (e) => {
        const file = e.target.files[0];
        const fileNameDisplay = document.getElementById('file-name');

        if (file) {
            try {
                validateFile(file, { maxSize: 5 * 1024 * 1024 }); // 5MB limit
                fileNameDisplay.textContent = `📄 ${file.name} (${formatFileSize(file.size)})`;
                fileNameDisplay.style.color = 'var(--color-primary)';
            } catch (error) {
                toast.error(error.message);
                e.target.value = ''; // Reset
                fileNameDisplay.textContent = 'Klik untuk upload bukti';
                fileNameDisplay.style.color = 'var(--text-secondary)';
            }
        } else {
            fileNameDisplay.textContent = 'Klik untuk upload bukti';
            fileNameDisplay.style.color = 'var(--text-secondary)';
        }
    });

    // Handle form submit
    form.addEventListener('submit', async (e) => {
        e.preventDefault();

        if (!confirm('Pastikan data sudah benar. Kirim presensi?')) return;

        try {
            showLoading('Mengirim data presensi...');

            const formData = new FormData(e.target);
            const memberId = formData.get('member_id');
            const status = formData.get('status');
            const reason = formData.get('reason');
            const proofFile = formData.get('proof');

            let proofUrl = null;

            // Upload proof if exists and status is NOT hadir
            if (status !== 'hadir' && proofFile && proofFile.size > 0) {
                const fileExt = getFileExtension(proofFile.name);
                const fileName = `${memberId}_${Date.now()}.${fileExt}`;
                const filePath = `proofs/${fileName}`;

                const { error: uploadError } = await supabaseClient.storage
                    .from('attendance-proofs')
                    .upload(filePath, proofFile);

                if (uploadError) throw uploadError;

                const { data: { publicUrl } } = supabaseClient.storage
                    .from('attendance-proofs')
                    .getPublicUrl(filePath);

                proofUrl = publicUrl;
            }

            // Insert into attendance_logs
            const { error: insertError } = await supabaseClient
                .from('attendance_logs')
                .insert([{
                    member_id: memberId,
                    status: status,
                    reason: status === 'hadir' ? null : reason,
                    proof_url: proofUrl
                }]);

            if (insertError) throw insertError;

            hideLoading();
            toast.success('Presensi berhasil dikirim!');

            // Reset form
            form.reset();
            document.getElementById('file-name').textContent = 'Klik untuk upload bukti';
            document.querySelector('input[name="status"][value="hadir"]').click(); // Reset state

        } catch (error) {
            hideLoading();
            console.error('Error submitting attendance:', error);
            toast.error('Gagal mengirim presensi. Silakan coba lagi.');
        }
    });
}
