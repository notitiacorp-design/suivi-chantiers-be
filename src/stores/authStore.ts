import { create } from 'zustand';
import { Session } from '@supabase/supabase-js';

interface User {
  id: string;
  email: string;
  nom: string;
  prenom: string;
  role: 'directeur' | 'charge_affaires';
  actif: boolean;
  created_at: string;
}

interface AuthState {
  user: User | null;
  session: Session | null | undefined;
  initialized: boolean;
  setUser: (user: User | null) => void;
  setSession: (session: Session | null) => void;
  setInitialized: (initialized: boolean) => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  session: undefined,
  initialized: false,
  setUser: (user) => set({ user }),
  setSession: (session) => set({ session, initialized: true }),
  setInitialized: (initialized) => set({ initialized }),
}));
