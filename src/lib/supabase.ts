import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://placeholder.supabase.co';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'placeholder-key';

// Mode démo/mock si les variables d'environnement ne sont pas configurées
export const isMockMode = !import.meta.env.VITE_SUPABASE_URL || !import.meta.env.VITE_SUPABASE_ANON_KEY;

if (isMockMode) {
  console.warn('⚀ Mode démo activoé - Supabase non configuré. Utilisez admin@notitiacorp.fr / Admin2024!Beziers');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Utilisateur admin mock pour le mode démo
export const MOCK_ADMIN_USER = {
  id: 'mock-admin-id',
  email: 'admin@notitiacorp.fr',
  nom: 'Admin',
  prenom: 'System',
  role: 'directeur',
  actif: true,
  created_at: new Date().toISOString(),
};

// Fonction d'authentification mock
export async function mockSignIn(email: string, password: string) {
  // Simuler un délai réseau
  await new Promise(resolve => setTimeout(resolve, 800));
  
  if (email === 'admin@notitiacorp.fr' && password === 'Admin2024!Beziers') {
    return {
      data: {
        user: {
          id: MOCK_ADMIN_USER.id,
          email: MOCK_ADMIN_USER.email,
        },
        session: {
          access_token: 'mock-token-' + Date.now(),
          refresh_token: 'mock-refresh-' + Date.now(),
          expires_at: Date.now() + 3600000,
          user: {
            id: MOCK_ADMIN_USER.id,
            email: MOCK_ADMIN_USER.email,
          },
        },
      },
      error: null,
    };
  }
  
  return {
    data: { user: null, session: null },
    error: { message: 'Invalid login credentials' },
  };
}
