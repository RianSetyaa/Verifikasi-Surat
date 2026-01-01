// Authentication module using Supabase Auth

class AuthManager {
    constructor() {
        this.supabase = null;
        this.currentUser = null;
        this.initialized = false;
        this.authListenerSetup = false;
    }

    async init() {
        if (this.initialized) return;

        try {
            // Initialize Supabase client only if not already created
            if (!this.supabase) {
                this.supabase = window.supabase.createClient(
                    CONFIG.supabase.url,
                    CONFIG.supabase.anonKey
                );
            }

            // Check for existing session
            const { data: { session } } = await this.supabase.auth.getSession();

            if (session) {
                await this.loadUserProfile(session.user.id);
            }

            // Listen for auth state changes (only once)
            if (!this.authListenerSetup) {
                this.supabase.auth.onAuthStateChange((event, session) => {
                    if (event === 'SIGNED_IN' && session) {
                        this.loadUserProfile(session.user.id);
                    } else if (event === 'SIGNED_OUT') {
                        this.currentUser = null;
                    }
                });
                this.authListenerSetup = true;
            }

            this.initialized = true;
        } catch (error) {
            console.error('Error initializing auth:', error);
            throw error;
        }
    }

    async loadUserProfile(userId) {
        try {
            const { data, error } = await this.supabase
                .from('users')
                .select('id, email, full_name, role, created_at')
                .eq('id', userId)
                .maybeSingle();

            if (error) {
                console.error('Error loading user profile:', error);
                throw error;
            }

            if (!data) {
                console.warn('User profile not found for:', userId);
                return null;
            }

            this.currentUser = data;
            return data;
        } catch (error) {
            console.error('Error loading user profile:', error);
            return null;
        }
    }

    async signUp(email, password, fullName, role = 'anggota') {
        try {
            // Sign up with Supabase Auth
            const { data: authData, error: authError } = await this.supabase.auth.signUp({
                email,
                password,
                options: {
                    data: {
                        full_name: fullName,
                        role: role
                    }
                }
            });

            if (authError) throw authError;

            if (!authData.user) {
                throw new Error('User creation failed');
            }

            // Wait a bit for auth user to be created
            await new Promise(resolve => setTimeout(resolve, 500));

            // Create user profile
            const { data: profileData, error: profileError } = await this.supabase
                .from('users')
                .insert([
                    {
                        id: authData.user.id,
                        email,
                        full_name: fullName,
                        role
                    }
                ])
                .select('id, email, full_name, role, created_at')
                .single();

            if (profileError) {
                console.error('Profile creation error:', profileError);
                // Profile might already exist or RLS issue
                // Try to fetch existing profile
                const { data: existingProfile } = await this.supabase
                    .from('users')
                    .select('id, email, full_name, role, created_at')
                    .eq('id', authData.user.id)
                    .maybeSingle();

                if (existingProfile) {
                    this.currentUser = existingProfile;
                    return { user: authData.user, profile: existingProfile };
                }

                throw profileError;
            }

            this.currentUser = profileData;

            return { user: authData.user, profile: profileData };
        } catch (error) {
            console.error('Error signing up:', error);
            throw error;
        }
    }

    async signIn(email, password) {
        try {
            const { data, error } = await this.supabase.auth.signInWithPassword({
                email,
                password
            });

            if (error) throw error;

            // Load user profile
            await this.loadUserProfile(data.user.id);

            return data;
        } catch (error) {
            console.error('Error signing in:', error);
            throw error;
        }
    }

    async signOut() {
        try {
            const { error } = await this.supabase.auth.signOut();
            if (error) throw error;

            this.currentUser = null;

            // Redirect to login
            window.location.href = '/index.html';
        } catch (error) {
            console.error('Error signing out:', error);
            throw error;
        }
    }

    async getSession() {
        try {
            const { data: { session }, error } = await this.supabase.auth.getSession();
            if (error) throw error;
            return session;
        } catch (error) {
            console.error('Error getting session:', error);
            return null;
        }
    }

    getCurrentUser() {
        return this.currentUser;
    }

    isAuthenticated() {
        return this.currentUser !== null;
    }

    hasRole(role) {
        return this.currentUser?.role === role;
    }

    isAnggota() {
        return this.hasRole('anggota');
    }

    isSekretaris() {
        return this.hasRole('sekretaris');
    }

    async requireAuth() {
        if (!this.initialized) {
            await this.init();
        }

        const session = await this.getSession();

        if (!session) {
            // Redirect to login
            window.location.href = '/index.html';
            throw new Error('Authentication required');
        }

        return session;
    }

    async requireRole(role) {
        await this.requireAuth();

        if (!this.hasRole(role)) {
            toast.error('Anda tidak memiliki akses ke halaman ini');

            // Redirect based on role
            if (this.isAnggota()) {
                window.location.href = '/member-dashboard.html';
            } else if (this.isSekretaris()) {
                window.location.href = '/secretary-dashboard.html';
            } else {
                window.location.href = '/index.html';
            }

            throw new Error('Insufficient permissions');
        }
    }

    async updatePassword(newPassword) {
        try {
            const { error } = await this.supabase.auth.updateUser({
                password: newPassword
            });

            if (error) throw error;

            return true;
        } catch (error) {
            console.error('Error updating password:', error);
            throw error;
        }
    }

    async updateProfile(updates) {
        try {
            if (!this.currentUser) throw new Error('No user logged in');

            const { data, error } = await this.supabase
                .from('users')
                .update(updates)
                .eq('id', this.currentUser.id)
                .select()
                .single();

            if (error) throw error;

            this.currentUser = data;
            return data;
        } catch (error) {
            console.error('Error updating profile:', error);
            throw error;
        }
    }
}

// Create global auth instance
const auth = new AuthManager();

// Initialize on page load (only once)
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', async () => {
        try {
            await auth.init();
        } catch (error) {
            console.error('Failed to initialize auth:', error);
        }
    }, { once: true });
} else {
    // DOM already loaded, init immediately
    auth.init().catch(error => {
        console.error('Failed to initialize auth:', error);
    });
}
