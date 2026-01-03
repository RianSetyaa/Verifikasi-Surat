// Attendance Page Logic

// Initialize Supabase client for public use
const supabaseClient = window.supabase.createClient(
    CONFIG.supabase.url,
    CONFIG.supabase.anonKey
);

document.addEventListener('DOMContentLoaded', async () => {
    // Initialize form (show by default, let user choose status first)
    updateDateDisplay();
    await loadMembers();
    setupEventListeners();

    // Check if today is practice day to show/hide "Hadir" option
    await checkAndToggleHadirOption();

    // Validate when status changes
    document.querySelectorAll('input[name="status"]').forEach(radio => {
        radio.addEventListener('change', async (e) => {
            await checkScheduleAndShowForm(e.target.value);
        });
    });
});

async function checkAndToggleHadirOption() {
    const hadirOption = document.querySelector('input[name="status"][value="hadir"]');
    const hadirLabel = hadirOption?.closest('.radio-card');

    if (!hadirOption || !hadirLabel) return;

    // Check if today has a practice schedule
    const today = new Date().toISOString().split('T')[0];

    try {
        const { data: schedules, error } = await supabaseClient
            .from('attendance_schedule')
            .select('*')
            .eq('practice_date', today)
            .eq('is_active', true);

        if (schedules && schedules.length > 0) {
            // Today is practice day - show Hadir option
            hadirLabel.style.display = 'block';
        } else {
            // Not practice day - hide Hadir option and default to Izin
            hadirLabel.style.display = 'none';
            document.querySelector('input[name="status"][value="izin"]').checked = true;

            // Trigger change event to show izin details if needed
            document.querySelector('input[name="status"][value="izin"]').dispatchEvent(new Event('change'));
        }
    } catch (error) {
        console.error('Error checking schedule:', error);
        // On error, show Hadir option (safe default)
        hadirLabel.style.display = 'block';
    }
}

async function checkScheduleAndShowForm(status) {
    // Check if attendance validation library is available
    if (typeof AttendanceValidation !== 'undefined') {
        try {
            const scheduleStatus = await AttendanceValidation.isAttendanceOpen(status);

            if (!scheduleStatus.isOpen) {
                // Hide form, show notice
                document.getElementById('attendance-form').parentElement.parentElement.style.display = 'none';
                const notice = document.getElementById('schedule-notice');
                notice.style.display = 'block';

                document.getElementById('schedule-message').textContent = scheduleStatus.reason;

                if (scheduleStatus.nextDate) {
                    document.getElementById('next-schedule').textContent =
                        'Absensi berikutnya: ' + AttendanceValidation.formatNextDate(scheduleStatus.nextDate);
                } else {
                    document.getElementById('next-schedule').textContent = '';
                }

                return false; // Form is closed
            } else {
                // Show form, hide notice
                document.getElementById('attendance-form').parentElement.parentElement.style.display = 'block';
                document.getElementById('schedule-notice').style.display = 'none';
                return true; // Form is open
            }
        } catch (error) {
            console.warn('Schedule validation error, continuing anyway:', error);
            // On error, show form
            document.getElementById('attendance-form').parentElement.parentElement.style.display = 'block';
            document.getElementById('schedule-notice').style.display = 'none';
            return true;
        }
    }
    return true; // Default: allow if validation not available
}

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

async function loadPracticeDates() {
    try {
        const today = new Date().toISOString().split('T')[0];
        const futureDate = new Date();
        futureDate.setDate(futureDate.getDate() + 14); // Next 2 weeks
        const futureDateStr = futureDate.toISOString().split('T')[0];

        const { data, error } = await supabaseClient
            .from('attendance_schedule')
            .select('*')
            .gte('practice_date', today)
            .lte('practice_date', futureDateStr)
            .eq('is_active', true)
            .order('practice_date');

        if (error) throw error;

        const select = document.getElementById('practice-date-select');
        select.innerHTML = '<option value="">Pilih tanggal latihan...</option>';

        if (data && data.length > 0) {
            const dayNames = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];

            data.forEach(schedule => {
                const date = new Date(schedule.practice_date);
                const dayName = dayNames[date.getDay()];
                const formattedDate = formatDate(date);

                const option = document.createElement('option');
                option.value = schedule.practice_date;
                option.textContent = `${formattedDate} (${dayName})`;
                select.appendChild(option);
            });
        } else {
            const option = document.createElement('option');
            option.disabled = true;
            option.textContent = 'Tidak ada jadwal latihan dalam 2 minggu';
            select.appendChild(option);
        }

    } catch (error) {
        console.error('Error loading practice dates:', error);
        // toast.error('Gagal memuat jadwal latihan');
    }
}

function setupEventListeners() {
    const reasonSection = document.getElementById('absence-details');
    const radioButtons = document.querySelectorAll('input[name="status"]');
    const reasonInput = document.getElementById('reason');
    const proofInput = document.getElementById('proof');
    const practiceDateSelect = document.getElementById('practice-date-select');
    const filePlaceholder = document.querySelector('.file-upload-placeholder');
    const form = document.getElementById('attendance-form');

    // Handle status change
    radioButtons.forEach(radio => {
        radio.addEventListener('change', (e) => {
            if (e.target.value === 'hadir') {
                reasonSection.style.display = 'none';
                reasonInput.required = false;
                proofInput.required = false;
                practiceDateSelect.required = false;
            } else {
                reasonSection.style.display = 'block';
                reasonInput.required = true;
                proofInput.required = true;
                practiceDateSelect.required = true;

                // Load practice dates when izin/sakit selected
                loadPracticeDates();
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

        // Show confirmation FIRST, before any loading
        if (!confirm('Pastikan data sudah benar. Kirim presensi?')) return;

        try {
            showLoading('Mengirim data presensi...');

            const formData = new FormData(e.target);
            const memberId = formData.get('member_id');
            const status = formData.get('status');
            const reason = formData.get('reason');
            const proofFile = formData.get('proof');
            const practiceDate = formData.get('practice_date'); // For izin/sakit

            // Determine attendance_date
            let attendanceDate;
            if (status === 'hadir') {
                // For hadir, use today
                attendanceDate = new Date().toISOString().split('T')[0];
            } else {
                // For izin/sakit, use selected practice date
                if (!practiceDate) {
                    hideLoading();
                    return toast.error('Pilih tanggal latihan yang akan di-izin/sakit');
                }
                attendanceDate = practiceDate;
            }

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
                .insert({
                    member_id: memberId,
                    attendance_date: attendanceDate, // Use calculated date
                    status: status,
                    notes: status === 'hadir' ? null : reason,
                    proof_url: proofUrl
                });

            if (insertError) throw insertError;

            hideLoading();

            // Show approval status message
            if (status === 'hadir') {
                toast.success('Presensi berhasil dikirim!');
            } else {
                toast.success('Presensi berhasil dikirim! Menunggu approval sekretaris.');
            }

            // Reset form
            form.reset();
            document.getElementById('file-name').textContent = 'Klik untuk upload bukti';
            document.querySelector('input[name="status"][value="hadir"]').click(); // Reset state

        } catch (error) {
            hideLoading();
            console.error('Error submitting attendance:', error);
            console.error('Error details:', error.message, error.details, error.hint);
            toast.error('Gagal mengirim presensi: ' + (error.message || 'Silakan coba lagi'));
        }
    });
}
