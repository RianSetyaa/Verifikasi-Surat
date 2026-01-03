// Attendance Validation and Schedule Management
// Handles schedule checking and attendance eligibility

const AttendanceValidation = {
    /**
     * Check if attendance is currently open
     * @param {string} status - Optional status (hadir/izin/sakit) for flexible validation
     * @returns {Object} { isOpen: boolean, reason: string, nextDate: Date }
     */
    async isAttendanceOpen(status = 'hadir') {
        try {
            const now = new Date();
            const dayOfWeek = now.getDay(); // 0=Sunday, 1=Monday, etc
            const currentTime = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;

            // For izin/sakit, allow submission H-2 (2 days before)
            if (status === 'izin' || status === 'sakit') {
                // Check if there's a practice schedule within next 7 days
                const upcomingSchedules = await this.getUpcomingSchedules(7);

                // ALWAYS ALLOW izin/sakit submission (more lenient)
                // If there are upcoming schedules, great. If not, still allow.
                return {
                    isOpen: true,
                    reason: upcomingSchedules.length > 0
                        ? 'Izin/sakit dapat diisi untuk jadwal latihan mendatang'
                        : 'Izin/sakit dapat diisi kapan saja',
                    allowEarly: true
                };
            }

            // For 'hadir', strict validation (must be today and within time)
            const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD

            // Fetch schedule for today
            const { data: schedules, error } = await auth.supabase
                .from('attendance_schedule')
                .select('*')
                .eq('practice_date', today)
                .eq('is_active', true);

            if (error) throw error;

            // If no schedule for today
            if (!schedules || schedules.length === 0) {
                const nextDate = await this.getNextAttendanceDate();
                return {
                    isOpen: false,
                    reason: 'Tidak ada jadwal latihan hari ini',
                    nextDate: nextDate
                };
            }

            // Check if within time range
            const schedule = schedules[0];
            const isWithinTime = currentTime >= schedule.start_time && currentTime <= schedule.end_time;

            if (!isWithinTime) {
                return {
                    isOpen: false,
                    reason: `Absensi hanya dibuka ${schedule.start_time} - ${schedule.end_time}`,
                    nextDate: currentTime > schedule.end_time ? await this.getNextAttendanceDate() : null
                };
            }

            return {
                isOpen: true,
                reason: 'Absensi dibuka',
                schedule: schedule
            };

        } catch (error) {
            console.error('Error checking attendance schedule:', error);
            // Fallback to config if database fails
            return this.isAttendanceOpenFallback();
        }
    },

    /**
     * Fallback schedule check using config
     */
    isAttendanceOpenFallback() {
        const now = new Date();
        const dayOfWeek = now.getDay();
        const hour = now.getHours();

        // Default: Senin(1), Rabu(3), Jumat(5), 13:00-22:00
        const practiceDays = CONFIG.app.attendance?.schedule?.practiceDays || [1, 3, 5];
        const openHour = parseInt(CONFIG.app.attendance?.schedule?.openTime?.split(':')[0] || '13');
        const closeHour = parseInt(CONFIG.app.attendance?.schedule?.closeTime?.split(':')[0] || '22');

        const isPracticeDay = practiceDays.includes(dayOfWeek);
        const isOpenHour = hour >= openHour && hour < closeHour;

        if (!isPracticeDay) {
            return {
                isOpen: false,
                reason: 'Bukan hari latihan',
                nextDate: this.getNextAttendanceDateFallback()
            };
        }

        if (!isOpenHour) {
            return {
                isOpen: false,
                reason: `Absensi hanya dibuka ${openHour}:00 - ${closeHour}:00`,
                nextDate: hour >= closeHour ? this.getNextAttendanceDateFallback() : null
            };
        }

        return { isOpen: true, reason: 'Absensi dibuka' };
    },

    /**
     * Get next attendance date
     */
    async getNextAttendanceDate() {
        try {
            const today = new Date().toISOString().split('T')[0];

            const { data: schedules, error } = await auth.supabase
                .from('attendance_schedule')
                .select('*')
                .gte('practice_date', today)
                .eq('is_active', true)
                .order('practice_date', { ascending: true })
                .limit(1);

            if (error || !schedules || schedules.length === 0) {
                return null;
            }

            return new Date(schedules[0].practice_date);

        } catch (error) {
            console.error('Error getting next attendance date:', error);
            return null;
        }
    },

    /**
     * Fallback next date calculation
     */
    getNextAttendanceDateFallback() {
        const practiceDays = [1, 3, 5]; // Mon, Wed, Fri
        const today = new Date();
        const currentDay = today.getDay();

        for (let day of practiceDays) {
            if (day > currentDay) {
                const daysUntil = day - currentDay;
                const nextDate = new Date(today);
                nextDate.setDate(today.getDate() + daysUntil);
                return nextDate;
            }
        }

        // Next week's first practice day
        const daysUntil = (7 - currentDay) + practiceDays[0];
        const nextDate = new Date(today);
        nextDate.setDate(today.getDate() + daysUntil);
        return nextDate;
    },

    /**
     * Get upcoming schedules within N days
     * @param {number} days - Number of days to look ahead
     * @returns {Promise<Array>} Array of upcoming practice dates
     */
    async getUpcomingSchedules(days = 3) {
        try {
            const today = new Date().toISOString().split('T')[0];
            const futureDate = new Date();
            futureDate.setDate(futureDate.getDate() + days);
            const futureDateStr = futureDate.toISOString().split('T')[0];

            const { data: schedules, error } = await auth.supabase
                .from('attendance_schedule')
                .select('*')
                .gte('practice_date', today)
                .lte('practice_date', futureDateStr)
                .eq('is_active', true)
                .order('practice_date');

            if (error || !schedules || schedules.length === 0) {
                return [];
            }

            return schedules.map(s => new Date(s.practice_date));
        } catch (error) {
            console.error('Error getting upcoming schedules:', error);
            return [];
        }
    },

    /**
     * Format date for display
     */
    formatNextDate(date) {
        if (!date) return '';

        const days = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];
        const months = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
            'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];

        return `${days[date.getDay()]}, ${date.getDate()} ${months[date.getMonth()]} ${date.getFullYear()}`;
    }
};
