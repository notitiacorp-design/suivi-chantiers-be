import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase, handleSupabaseError } from '@/lib/supabase'
import type {
  Chantier,
  ChantierWithRelations,
  Tache,
  TacheWithRelations,
  Notification,
  NotificationWithRelations,
  Alerte,
  DashboardStats,
  ChargeAffairesStats,
  HistoriqueScore,
  ChantierFilters,
  TacheFilters,
  AlerteFilters,
} from '@/types/database'
import { useAuth } from '@/contexts/AuthContext'
import { useEffect } from 'react'
import toast from 'react-hot-toast'

// Hook pour les chantiers avec filtres
export function useChantiers(filters?: ChantierFilters) {
  const { profile } = useAuth()

  return useQuery({
    queryKey: ['chantiers', filters, profile?.id],
    queryFn: async () => {
      try {
        let query = supabase
          .from('chantiers')
          .select(`
            *,
            charge_affaires:profiles!chantiers_charge_affaires_id_fkey(*)
          `)
          .eq('actif', true)
          .order('created_at', { ascending: false })

        // Si chargé d'affaires, filtrer ses chantiers
        if (profile?.role === 'charge_affaires') {
          query = query.eq('charge_affaires_id', profile.id)
        }

        // Appliquer les filtres
        if (filters?.statut?.length) {
          query = query.in('statut', filters.statut)
        }

        if (filters?.phase?.length) {
          query = query.in('phase', filters.phase)
        }

        if (filters?.charge_affaires_id) {
          query = query.eq('charge_affaires_id', filters.charge_affaires_id)
        }

        if (filters?.health_score_min !== undefined) {
          query = query.gte('health_score', filters.health_score_min)
        }

        if (filters?.health_score_max !== undefined) {
          query = query.lte('health_score', filters.health_score_max)
        }

        if (filters?.search) {
          query = query.or(
            `nom.ilike.%${filters.search}%,numero.ilike.%${filters.search}%,client.ilike.%${filters.search}%`
          )
        }

        const { data, error } = await query

        if (error) throw error

        return data as ChantierWithRelations[]
      } catch (error) {
        throw handleSupabaseError(error)
      }
    },
    enabled: !!profile,
  })
}

// Hook pour un chantier spécifique
export function useChantier(id: string | undefined) {
  return useQuery({
    queryKey: ['chantier', id],
    queryFn: async () => {
      if (!id) throw new Error('ID du chantier requis')

      try {
        const { data, error } = await supabase
          .from('chantiers')
          .select(`
            *,
            charge_affaires:profiles!chantiers_charge_affaires_id_fkey(*),
            taches(*),
            documents(*),
            avenants(*),
            commandes(*),
            factures(*),
            journal:journal_chantier(*),
            alertes(*)
          `)
          .eq('id', id)
          .single()

        if (error) throw error

        return data as ChantierWithRelations
      } catch (error) {
        throw handleSupabaseError(error)
      }
    },
    enabled: !!id,
  })
}

// Hook pour les tâches d'un chantier
export function useTaches(chantierId?: string, filters?: TacheFilters) {
  return useQuery({
    queryKey: ['taches', chantierId, filters],
    queryFn: async () => {
      try {
        let query = supabase
          .from('taches')
          .select(`
            *,
            chantier:chantiers(*),
            responsable:profiles!taches_responsable_id_fkey(*)
          `)
          .order('ordre', { ascending: true })

        if (chantierId) {
          query = query.eq('chantier_id', chantierId)
        }

        if (filters?.statut?.length) {
          query = query.in('statut', filters.statut)
        }

        if (filters?.priorite?.length) {
          query = query.in('priorite', filters.priorite)
        }

        if (filters?.responsable_id) {
          query = query.eq('responsable_id', filters.responsable_id)
        }

        if (filters?.bloquante !== undefined) {
          query = query.eq('bloquante', filters.bloquante)
        }

        if (filters?.en_retard) {
          const today = new Date().toISOString()
          query = query
            .lt('date_echeance', today)
            .neq('statut', 'terminee')
        }

        if (filters?.search) {
          query = query.or(
            `titre.ilike.%${filters.search}%,description.ilike.%${filters.search}%`
          )
        }

        const { data, error } = await query

        if (error) throw error

        return data as TacheWithRelations[]
      } catch (error) {
        throw handleSupabaseError(error)
      }
    },
  })
}

// Hook pour les notifications
export function useNotifications() {
  const { profile } = useAuth()
  const queryClient = useQueryClient()

  const query = useQuery({
    queryKey: ['notifications', profile?.id],
    queryFn: async () => {
      if (!profile) return []

      try {
        const { data, error } = await supabase
          .from('notifications')
          .select(`
            *,
            chantier:chantiers(*),
            tache:taches(*)
          `)
          .eq('destinataire_id', profile.id)
          .order('created_at', { ascending: false })
          .limit(50)

        if (error) throw error

        return data as NotificationWithRelations[]
      } catch (error) {
        throw handleSupabaseError(error)
      }
    },
    enabled: !!profile,
  })

  // Abonnement temps réel
  useEffect(() => {
    if (!profile) return

    const channel = supabase
      .channel('notifications')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'notifications',
          filter: `destinataire_id=eq.${profile.id}`,
        },
        (payload) => {
          queryClient.invalidateQueries({ queryKey: ['notifications'] })
          toast.success('Nouvelle notification')
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [profile, queryClient])

  const markAsRead = useMutation({
    mutationFn: async (notificationId: string) => {
      const { error } = await supabase
        .from('notifications')
        .update({ lue: true })
        .eq('id', notificationId)

      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] })
    },
  })

  const markAllAsRead = useMutation({
    mutationFn: async () => {
      if (!profile) throw new Error('Profil non chargé')

      const { error } = await supabase
        .from('notifications')
        .update({ lue: true })
        .eq('destinataire_id', profile.id)
        .eq('lue', false)

      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] })
      toast.success('Toutes les notifications ont été marquées comme lues')
    },
  })

  return {
    ...query,
    markAsRead,
    markAllAsRead,
  }
}

// Hook pour les alertes
export function useAlerts(filters?: AlerteFilters) {
  const { profile } = useAuth()

  return useQuery({
    queryKey: ['alertes', filters, profile?.id],
    queryFn: async () => {
      try {
        let query = supabase
          .from('alertes')
          .select(`
            *,
            chantier:chantiers(*)
          `)
          .order('created_at', { ascending: false })

        if (filters?.type?.length) {
          query = query.in('type', filters.type)
        }

        if (filters?.severite?.length) {
          query = query.in('severite', filters.severite)
        }

        if (filters?.resolue !== undefined) {
          query = query.eq('resolue', filters.resolue)
        }

        if (filters?.chantier_id) {
          query = query.eq('chantier_id', filters.chantier_id)
        }

        const { data, error } = await query

        if (error) throw error

        return data as Alerte[]
      } catch (error) {
        throw handleSupabaseError(error)
      }
    },
  })
}

// Hook pour les statistiques du dashboard
export function useDashboardStats() {
  const { profile } = useAuth()

  return useQuery({
    queryKey: ['dashboard-stats', profile?.id],
    queryFn: async () => {
      if (!profile) throw new Error('Profil non chargé')

      try {
        const { data, error } = await supabase.rpc('get_dashboard_stats', {
          user_id_param: profile.id,
        })

        if (error) throw error

        return data[0] as DashboardStats
      } catch (error) {
        throw handleSupabaseError(error)
      }
    },
    enabled: !!profile,
  })
}

// Hook pour les stats d'un chargé d'affaires
export function useChargeAffairesStats(chargeId?: string) {
  const { profile } = useAuth()
  const targetId = chargeId || profile?.id

  return useQuery({
    queryKey: ['charge-stats', targetId],
    queryFn: async () => {
      if (!targetId) throw new Error('ID du chargé d\'affaires requis')

      try {
        const { data, error } = await supabase.rpc('get_charge_affaires_stats', {
          charge_id_param: targetId,
        })

        if (error) throw error

        return data[0] as ChargeAffairesStats
      } catch (error) {
        throw handleSupabaseError(error)
      }
    },
    enabled: !!targetId,
  })
}

// Hook pour l'historique des scores
export function useHistoriqueScores(chantierId: string, days: number = 30) {
  return useQuery({
    queryKey: ['historique-scores', chantierId, days],
    queryFn: async () => {
      try {
        const startDate = new Date()
        startDate.setDate(startDate.getDate() - days)

        const { data, error } = await supabase
          .from('historique_scores')
          .select('*')
          .eq('chantier_id', chantierId)
          .gte('created_at', startDate.toISOString())
          .order('created_at', { ascending: true })

        if (error) throw error

        return data as HistoriqueScore[]
      } catch (error) {
        throw handleSupabaseError(error)
      }
    },
    enabled: !!chantierId,
  })
}

// Hook pour la charge de travail
export function useChargesTravail() {
  const { profile } = useAuth()

  return useQuery({
    queryKey: ['charges-travail', profile?.id],
    queryFn: async () => {
      if (!profile) throw new Error('Profil non chargé')

      try {
        // Récupérer toutes les tâches en cours ou à faire
        const { data: taches, error: tachesError } = await supabase
          .from('taches')
          .select(`
            *,
            chantier:chantiers(nom, numero)
          `)
          .eq('responsable_id', profile.id)
          .in('statut', ['a_faire', 'en_cours'])
          .order('date_echeance', { ascending: true })

        if (tachesError) throw tachesError

        // Grouper par chantier
        const groupedByChantier = taches.reduce((acc, tache) => {
          const chantierId = tache.chantier_id
          if (!acc[chantierId]) {
            acc[chantierId] = {
              chantier: tache.chantier,
              taches: [],
              total_temps_estime: 0,
            }
          }
          acc[chantierId].taches.push(tache)
          acc[chantierId].total_temps_estime +=
            tache.temps_estime || 0
          return acc
        }, {} as Record<string, any>)

        return {
          taches,
          by_chantier: Object.values(groupedByChantier),
          total_taches: taches.length,
          total_temps: taches.reduce((sum, t) => sum + (t.temps_estime || 0), 0),
        }
      } catch (error) {
        throw handleSupabaseError(error)
      }
    },
    enabled: !!profile,
  })
}

// Hook pour rafraîchir le health score
export function useRefreshHealthScore() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (chantierId: string) => {
      const { data, error } = await supabase.rpc('calculer_health_score', {
        chantier_id_param: chantierId,
      })

      if (error) throw error

      return data
    },
    onSuccess: (_, chantierId) => {
      queryClient.invalidateQueries({ queryKey: ['chantier', chantierId] })
      queryClient.invalidateQueries({ queryKey: ['chantiers'] })
      queryClient.invalidateQueries({ queryKey: ['historique-scores', chantierId] })
      toast.success('Score actualisé')
    },
  })
}