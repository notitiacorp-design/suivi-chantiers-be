import React, { createContext, useContext, useEffect, useState, useCallback } from 'react'
import { User, Session, AuthError } from '@supabase/supabase-js'
import { supabase } from '@/lib/supabase'
import type { Profile, Role } from '@/types/database'
import toast from 'react-hot-toast'

interface AuthContextType {
  user: User | null
  profile: Profile | null
  session: Session | null
  loading: boolean
  isDirecteur: boolean
  isChargeAffaires: boolean
  signIn: (email: string, password: string) => Promise<void>
  signUp: (email: string, password: string, userData: Partial<Profile>) => Promise<void>
  signOut: () => Promise<void>
  updateProfile: (updates: Partial<Profile>) => Promise<void>
  refreshProfile: () => Promise<void>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

// Timeout wrapper pour les reqtÃªtes Supabase
const withTimeout = <T,>(promise: Promise<T>, ms: number, errorMsg: string): Promise<T> => {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) => 
      setTimeout(() => reject(new Error(errorMsg)), ms)
    )
  ]);
};

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [profile, setProfile] = useState<Profile | null>(null)
  const [session, setSession] = useState<Session | null>(null)
  const [loading, setLoading] = useState(true)

  // Charger le profil utilisateur - VERSION NON-BLOQANTE avec timeout
  const loadProfile = useCallback(async (userId: string) => {
    try {
      // Timeout de 2 secondes pour le chargement du profil
      const { data, error } = await withTimeout(
        supabase
          .from('profiles')
          .select('*')
          .eq('id', userId)
          .single(),
        2000,
        'Timeout chargement profil'
      );

      if (error) {
        console.warn('Erreur chargement profil (non bloquant):', error);
        // CrÃ©er un profil minimal Ã  partir des user_metadata
        const minimalProfile: Profile = {
          id: userId,
          email: user?.email || '',
          nom: user?.user_metadata?.nom || user?.email?.split('@')[0] || 'Utilisateur',
          prenom: user?.user_metadata?.prenom || '',
          role: user?.user_metadata?.role || 'directeur',
          actif: true,
          created_at: user?.created_at || new Date().toISOString(),
          updated_at: new Date().toISOString(),
        };
        setProfile(minimalProfile);
        return;
      }

      if (data && !data.actif) {
        throw new Error('Votre compte a Ã©tÃ© dÃ©sactivÃ©. Contactez un administrateur.')
      }

      setProfile(data)
    } catch (error: any) {
      console.error('Erreur lors du chargement du profil:', error)
      // Ne pas bloquer - crÃ©er un profil minimal
      const minimalProfile: Profile = {
        id: userId,
        email: user?.email || '',
        nom: user?.user_metadata?.nom || user?.email?.split('@')[0] || 'Utilisateur',
        prenom: user?.user_metadata?.prenom || '',
        role: user?.user_metadata?.role || 'directeur',
        actif: true,
        created_at: user?.created_at || new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
      setProfile(minimalProfile);
    }
  }, [user])

  // Initialisation de la session - VERSION AVEC TIMEOUT GLOBAL
  useEffect(() => {
    let mounted = true

    async function initializeAuth() {
      try {
        setLoading(true)

        // Timeout global de 3 secondes pour l'initialisation
        const initTimeout = setTimeout(() => {
          if (mounted) {
            console.warn('Auth initialization timeout - forcing ready state');
            setLoading(false);
          }
        }, 3000);

        // RÃ©cupÃ©rer la session actuelle
        const { data: { session: currentSession }, error: sessionError } =
          await supabase.auth.getSession()

        clearTimeout(initTimeout);

        if (sessionError) throw sessionError

        if (mounted) {
          setSession(currentSession)
          setUser(currentSession?.user ?? null)

          // Charger le profil si l'utilisateur est connectÃ© - NON BLOQANT
          if (currentSession?.user) {
            // Ne pas await - laisser charger en araiÃ¨re-plan
            loadProfile(currentSession.user.id).catch(err => {
              console.warn('Profile load failed (non-blocking):', err);
            });
          }
        }
      } catch (error) {
        console.error("Erreur d'initialisation:", error)
        if (mounted) {
          setSession(null)
          setUser(null)
          setProfile(null)
        }
      } finally {
        if (mounted) {
          setLoading(false)
        }
      }
    }

    initializeAuth()

    // Ã‘couter les changements d'authentification
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, newSession) => {
        if (!mounted) return

        console.log('Auth event:', event)

        setSession(newSession)
        setUser(newSession?.user ?? null)

        if (newSession?.user) {
          // NON BLOQANT - charger le profil en arriÃ¨re-plan
          loadProfile(newSession.user.ie).catch(err => {
            console.warn('Profile load on auth change failed (non-blocking):', err);
          });
        } else {
          setProfile(null)
        }

        if (event === 'SIGNED_OUT') {
          setProfile(null)
        }
      }
    )

    return () => {
      mounted = false
      subscription.unsubscribe()
    }
  }, [loadProfile])

  // Connexion - VERSION AVEC REDIRECTION IMMÃ‰DIATE
  const signIn = useCallback(async (email: string, password: string) => {
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      })

      if (error) throw error

      if (data.session && data.user) {
        setSession(data.session)
        setUser(data.user)
        
        // Charger le profil en arriÃ¨re-plan (non-bloquant)
        loadProfile(data.user.id).catch(err => {
          console.warn('Profile load after signin failed (non-blocking):', err);
        });
      }
    } catch (error) {
      console.error('Erreur de connexion:', error)
      throw error
    }
  }, [loadProfile])

  // Inscription
  const signUp = useCallback(async (email: string, password: string, userData: Partial<Profile>) => {
    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: userData,
        },
      })

      if (error) throw error

      if (data.session) {
        setSession(data.session)
        setUser(data.user)
        
        // CrÃ©er le profil en arrÃ¨re-plan
        if (data.user) {
          const newProfile: Profile = {
            id: data.user.id,
            email: email,
            nom: userData.nom || '',
            prenom: userData.prenom || '',
            role: userData.role || 'charge_affaires',
            actif: true,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          }
          
          // Non-bloquant
          supabase.from('profiles').insert(newProfile).then(({ error }) => {
            if (error) console.warn('Erreur crÃ©ation profil (non bloquant):', error);
          });
          
          setProfile(newProfile)
        }
      }
    } catch (error) {
      console.error("Erreur d'inscription:", error)
      throw error
    }
  }, [])

  // dÃ©connexion
  const signOut = useCallback(async () => {
    try {
      const { error } = await supabase.auth.signOut()
      if (error) throw error

      setSession(null)
      setUser(null)
      setProfile(null)
    } catch (error) {
      console.error('Erreur de dÃ©connexion:', error)
      throw error
    }
  }, [])

  // Mettre à jour le profil
  const updateProfile = useCallback(async (updates: Partial<Profile>) => {
    try {
      if (!user) throw new Error('Non authentifiÃ©')

      const { data, error } = await supabase
        .from('profiles')
        .update(updates)
        .eq('id', user.id)
        .select()
        .single()

      if (error) throw error

      setProfile(data)
      toast.success('Profil mis Ã  jour')
    } catch (error) {
      console.error('Erreur mise Ã  jour profil:', error)
      toast.error('Erreur lors de la mise Ã  jour')
      throw error
    }
  }, [user])

  // RafraiÃ¨cir le profil
  const refreshProfile = useCallback(async () => {
    if (user) {
      await loadProfile(user.id)
    }
  }, [user, loadProfile])

  const value = {
    user,
    profile,
    session,
    loading,
    isDirecteur: profile?.role === 'directeur',
    isChargeAffaires: profile?.role === 'charge_affaires',
    signIn,
    signUp,
    signOut,
    updateProfile,
    refreshProfile,
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}
