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

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [profile, setProfile] = useState<Profile | null>(null)
  const [session, setSession] = useState<Session | null>(null)
  const [loading, setLoading] = useState(true)

  // Charger le profil utilisateur
  const loadProfile = useCallback(async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single()

      if (error) throw error

      if (!data.actif) {
        throw new Error('Votre compte a été désactivé. Contactez un administrateur.')
      }

      setProfile(data)
    } catch (error) {
      console.error('Erreur lors du chargement du profil:', error)
      toast.error('Erreur lors du chargement du profil')
      throw error
    }
  }, [])

  // Initialisation de la session
  useEffect(() => {
    let mounted = true

    async function initializeAuth() {
      try {
        setLoading(true)

        // Récupérer la session actuelle
        const { data: { session: currentSession }, error: sessionError } =
          await supabase.auth.getSession()

        if (sessionError) throw sessionError

        if (mounted) {
          setSession(currentSession)
          setUser(currentSession?.user ?? null)

          // Charger le profil si l'utilisateur est connecté
          if (currentSession?.user) {
            await loadProfile(currentSession.user.id)
          }
        }
      } catch (error) {
        console.error('Erreur d\'initialisation:', error)
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

    // Écouter les changements d'authentification
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, newSession) => {
        if (!mounted) return

        console.log('Auth event:', event)

        setSession(newSession)
        setUser(newSession?.user ?? null)

        if (newSession?.user) {
          await loadProfile(newSession.user.id)
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

  // Connexion
  const signIn = useCallback(async (email: string, password: string) => {
    try {
      setLoading(true)

      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      })

      if (error) throw error

      if (!data.user) {
        throw new Error('Aucun utilisateur retourné')
      }

      await loadProfile(data.user.id)

      toast.success('Connexion réussie')
    } catch (error) {
      const authError = error as AuthError
      console.error('Erreur de connexion:', authError)

      if (authError.message.includes('Invalid login credentials')) {
        toast.error('Email ou mot de passe incorrect')
      } else if (authError.message.includes('Email not confirmed')) {
        toast.error('Veuillez confirmer votre email')
      } else {
        toast.error('Erreur lors de la connexion')
      }

      throw error
    } finally {
      setLoading(false)
    }
  }, [loadProfile])

  // Inscription
  const signUp = useCallback(
    async (email: string, password: string, userData: Partial<Profile>) => {
      try {
        setLoading(true)

        // Créer le compte auth
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: {
              nom: userData.nom,
              prenom: userData.prenom,
            },
          },
        })

        if (error) throw error

        if (!data.user) {
          throw new Error('Aucun utilisateur créé')
        }

        // Créer le profil (géré par le trigger en base)
        // On attend un peu pour que le trigger s'exécute
        await new Promise((resolve) => setTimeout(resolve, 1000))

        // Mettre à jour le profil avec les données complètes
        const { error: updateError } = await supabase
          .from('profiles')
          .update({
            nom: userData.nom,
            prenom: userData.prenom,
            telephone: userData.telephone,
            role: userData.role || 'charge_affaires',
          })
          .eq('id', data.user.id)

        if (updateError) throw updateError

        toast.success('Compte créé avec succès')
      } catch (error) {
        const authError = error as AuthError
        console.error('Erreur d\'inscription:', authError)

        if (authError.message.includes('already registered')) {
          toast.error('Cet email est déjà utilisé')
        } else if (authError.message.includes('Password should be')) {
          toast.error('Le mot de passe doit contenir au moins 6 caractères')
        } else {
          toast.error('Erreur lors de l\'inscription')
        }

        throw error
      } finally {
        setLoading(false)
      }
    },
    []
  )

  // Déconnexion
  const signOut = useCallback(async () => {
    try {
      setLoading(true)
      const { error } = await supabase.auth.signOut()
      if (error) throw error

      setUser(null)
      setProfile(null)
      setSession(null)

      toast.success('Déconnexion réussie')
    } catch (error) {
      console.error('Erreur de déconnexion:', error)
      toast.error('Erreur lors de la déconnexion')
      throw error
    } finally {
      setLoading(false)
    }
  }, [])

  // Mettre à jour le profil
  const updateProfile = useCallback(
    async (updates: Partial<Profile>) => {
      if (!user) throw new Error('Utilisateur non connecté')

      try {
        const { error } = await supabase
          .from('profiles')
          .update(updates)
          .eq('id', user.id)

        if (error) throw error

        await loadProfile(user.id)

        toast.success('Profil mis à jour')
      } catch (error) {
        console.error('Erreur de mise à jour:', error)
        toast.error('Erreur lors de la mise à jour du profil')
        throw error
      }
    },
    [user, loadProfile]
  )

  // Rafraîchir le profil
  const refreshProfile = useCallback(async () => {
    if (!user) return
    await loadProfile(user.id)
  }, [user, loadProfile])

  // Helpers pour les rôles
  const isDirecteur = profile?.role === 'directeur'
  const isChargeAffaires = profile?.role === 'charge_affaires'

  const value: AuthContextType = {
    user,
    profile,
    session,
    loading,
    isDirecteur,
    isChargeAffaires,
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
    throw new Error('useAuth doit être utilisé dans un AuthProvider')
  }
  return context
}