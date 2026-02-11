import { create } from 'zustand';
import { Session } from '@supabase/supabase-js';

interface User {
  id: string;
  email: string;
  nom: string;
  prenom: string;
  role: 'chef_atelier' | 'directeur';
  actif: boolean;
  created_at: string;
}

interface AuthState {
  user: User | null;
  session: Session | null | undefined;
  setUser: (user: User | null) => void;
  setSession: (session: Session | null) => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  session: undefined,
  setUser: (user) => set({ user }),
  setSession: (session) => set({ session }),
}));