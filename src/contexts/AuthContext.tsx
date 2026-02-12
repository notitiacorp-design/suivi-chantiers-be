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

// Timeout wrapper pour les requ\u00eates Supabase
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

  // Charger le profil utilisateur - VERSION NON-BLOQUANTE avec timeout
  const loadProfile = useCallback(async (userId: string, currentUser?: User | null) => {
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
        // Cr\u00e9er un profil minimal \u00e0 partir des user_metadata
        const minimalProfile: Profile = {
          id: userId,
          email: currentUser?.email || '',
          nom: currentUser?.user_metadata?.nom || currentUser?.email?.split('@')[0] || 'Utilisateur',
          prenom: currentUser?.user_metadata?.prenom || '',
          role: currentUser?.user_metadata?.role || 'directeur',
          actif: true,
          created_at: currentUser?.created_at || new Date().toISOString(),
          updated_at: new Date().toISOString(),
        };
        setProfile(minimalProfile);
        return;
      }

      if (data && !data.actif) {
        throw new Error('Votre compte a \u00e9t\u00e9 d\u00e9sactiv\u00e9. Contactez un administrateur.')
      }

      setProfile(data)
    } catch (error: any) {
      console.error('Erreur lors du chargement du profil:', error)
      // Ne pas bloquer - cr\u00e9er un profil minimal
      const minimalProfile: Profile = {
        id: userId,
        email: currentUser?.email || '',
        nom: currentUser?.user_metadata?.nom || currentUser?.email?.split('@')[0] || 'Utilisateur',
        prenom: currentUser?.user_metadata?.prenom || '',
        role: currentUser?.user_metadata?.role || 'directeur',
        actif: true,
        created_at: currentUser?.created_at || new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
      setProfile(minimalProfile);
    }
  }, [])

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

        // R\u00e9cup\u00e9rer la session actuelle
        const { data: { session: currentSession }, error: sessionError } =
          await supabase.auth.getSession()

        clearTimeout(initTimeout);

        if (sessionError) throw sessionError

        if (mounted) {
          setSession(currentSession)
          setUser(currentSession?.user ?? null)

          // Charger le profil si l'utilisateur est connect\u00e9 - NON BLOQUANT
          if (currentSession?.user) {
            // Ne pas await - laisser charger en arri\u00e8re-plan
            loadProfile(currentSession.user.id, currentSession.user).catch(err => {
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

    // \u00c9couter les changements d'authentification
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, newSession) => {
        if (!mounted) return

        console.log('Auth event:', event)

        setSession(newSession)
        setUser(newSession?.user ?? null)

        if (newSession?.user) {
          // NON BLOQUANT - charger le profil en arri\u00e8re-plan
          loadProfile(newSession.user.id, newSession.user).catch(err => {
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

  // Connexion - VERSION AVEC REDIRECTION IMM\u00c9DIATE
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
        
        // Charger le profil en arri\u00e8re-plan (non-bloquant)
        loadProfile(data.user.id, data.user).catch(err => {
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
        
        // Cr\u00e9er le profil en arri\u00e8re-plan
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
            if (error) console.warn('Erreur cr\u00e9ation profil (non bloquant):', error);
          });
          
          setProfile(newProfile)
        }
      }
    } catch (error) {
      console.error("Erreur d'inscription:", error)
      throw error
    }
  }, [])

  // d\u00e9connexion
  const signOut = useCallback(async () => {
    try {
      const { error } = await supabase.auth.signOut()
      if (error) throw error

      setSession(null)
      setUser(null)
      setProfile(null)
    } catch (error) {
      console.error('Erreur de d\u00e9connexion:', error)
      throw error
    }
  }, [])

  // Mettre \u00e0 jour le profil
  const updateProfile = useCallback(async (updates: Partial<Profile>) => {
    try {
      if (!user) throw new Error('Non authentifi\u00e9')

      const { data, error } = await supabase
        .from('profiles')
        .update(updates)
        .eq('id', user.id)
        .select()
        .single()

      if (error) throw error

      setProfile(data)
      toast.success('Profil mis \u00e0 jour')
    } catch (error) {
      console.error('Erreur mise \u00e0 jour profil:', error)
      toast.error('Erreur lors de la mise \u00e0 jour')
      throw error
    }
  }, [user])

  // Rafra\u00eechir le profil
  const refreshProfile = useCallback(async () => {
    if (user) {
      await loadProfile(user.id, user)
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