import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { supabase } from '../lib/supabase';
import { supabaseService } from '../services/supabaseService';

interface UserProfile {
  id: string;
  email: string;
  full_name?: string;
  avatar_url?: string;
}

interface AuthState {
  user: UserProfile | null;
  session: any | null;
  isLoading: boolean;
  setUser: (user: UserProfile | null) => void;
  setSession: (session: any | null) => void;
  setLoading: (loading: boolean) => void;
  signOut: () => Promise<void>;
  initialize: () => Promise<void>;
  updateProfile: (profile: Partial<UserProfile>) => Promise<void>;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      session: null,
      isLoading: true,
      setUser: (user) => set({ user }),
      setSession: (session) => set({ session }),
      setLoading: (loading) => set({ isLoading: loading }),
      
      signOut: async () => {
        if (supabase) await supabase.auth.signOut();
        set({ user: null, session: null });
      },

      initialize: async () => {
        if (!supabase) {
          set({ isLoading: false });
          return;
        }

        const { data: { session } } = await supabase.auth.getSession();
        set({ session });

        if (session?.user) {
          try {
            const profile = await supabaseService.getProfile(session.user.id);
            set({ 
              user: {
                id: session.user.id,
                email: session.user.email!,
                ...profile
              }
            });
          } catch (error) {
            console.error('Error fetching profile:', error);
          }
        }

        supabase.auth.onAuthStateChange(async (_event, session) => {
          set({ session });
          if (session?.user) {
            const profile = await supabaseService.getProfile(session.user.id);
            set({ 
              user: {
                id: session.user.id,
                email: session.user.email!,
                ...profile
              }
            });
          } else {
            set({ user: null });
          }
          set({ isLoading: false });
        });

        set({ isLoading: false });
      },

      updateProfile: async (profileUpdate) => {
        const { user } = get();
        if (!user || !supabase) return;

        const updatedProfile = { ...user, ...profileUpdate };
        await supabaseService.updateProfile({
          id: user.id,
          full_name: updatedProfile.full_name,
          avatar_url: updatedProfile.avatar_url,
          updated_at: new Date().toISOString(),
        });

        set({ user: updatedProfile });
      }
    }),
    {
      name: 'orion-auth-storage',
      partialize: (state) => ({ user: state.user, session: state.session }),
    }
  )
);
