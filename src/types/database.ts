export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

// Enums
export enum Role {
  DIRECTEUR = 'directeur',
  CHARGE_AFFAIRES = 'charge_affaires',
}

export enum StatutChantier {
  EN_ATTENTE = 'en_attente',
  EN_COURS = 'en_cours',
  TERMINE = 'termine',
  SUSPENDU = 'suspendu',
  ANNULE = 'annule',
}

export enum Phase {
  ETUDE = 'etude',
  PREPARATION = 'preparation',
  EXECUTION = 'execution',
  RECEPTION = 'reception',
  GARANTIE = 'garantie',
}

export enum Priorite {
  BASSE = 'basse',
  MOYENNE = 'moyenne',
  HAUTE = 'haute',
  CRITIQUE = 'critique',
}

export enum StatutTache {
  A_FAIRE = 'a_faire',
  EN_COURS = 'en_cours',
  EN_ATTENTE = 'en_attente',
  TERMINEE = 'terminee',
  ANNULEE = 'annulee',
}

export enum TypeDocument {
  PLAN = 'plan',
  PHOTO = 'photo',
  FACTURE = 'facture',
  DEVIS = 'devis',
  CONTRAT = 'contrat',
  COURRIER = 'courrier',
  RAPPORT = 'rapport',
  AUTRE = 'autre',
}

export enum StatutAvenant {
  BROUILLON = 'brouillon',
  EN_ATTENTE = 'en_attente',
  APPROUVE = 'approuve',
  REFUSE = 'refuse',
}

export enum StatutCommande {
  BROUILLON = 'brouillon',
  ENVOYEE = 'envoyee',
  CONFIRMEE = 'confirmee',
  LIVREE = 'livree',
  ANNULEE = 'annulee',
}

export enum StatutFacture {
  BROUILLON = 'brouillon',
  ENVOYEE = 'envoyee',
  PAYEE = 'payee',
  EN_RETARD = 'en_retard',
  ANNULEE = 'annulee',
}

export enum TypeJournal {
  REUNION = 'reunion',
  INCIDENT = 'incident',
  AVANCEMENT = 'avancement',
  VISITE = 'visite',
  LIVRAISON = 'livraison',
  AUTRE = 'autre',
}

// Types des tables
export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string
          email: string
          nom: string
          prenom: string
          role: Role
          telephone: string | null
          actif: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id: string
          email: string
          nom: string
          prenom: string
          role: Role
          telephone?: string | null
          actif?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          email?: string
          nom?: string
          prenom?: string
          role?: Role
          telephone?: string | null
          actif?: boolean
          created_at?: string
          updated_at?: string
        }
      }
      chantiers: {
        Row: {
          id: string
          numero: string
          nom: string
          client: string
          adresse: string
          ville: string
          code_postal: string
          charge_affaires_id: string
          statut: StatutChantier
          phase: Phase
          date_debut: string
          date_fin_prevue: string
          date_fin_reelle: string | null
          budget_initial: number
          budget_actuel: number
          depenses_actuelles: number
          avancement_physique: number
          health_score: number
          derniere_alerte: string | null
          notes: string | null
          actif: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          numero: string
          nom: string
          client: string
          adresse: string
          ville: string
          code_postal: string
          charge_affaires_id: string
          statut?: StatutChantier
          phase?: Phase
          date_debut: string
          date_fin_prevue: string
          date_fin_reelle?: string | null
          budget_initial: number
          budget_actuel?: number
          depenses_actuelles?: number
          avancement_physique?: number
          health_score?: number
          derniere_alerte?: string | null
          notes?: string | null
          actif?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          numero?: string
          nom?: string
          client?: string
          adresse?: string
          ville?: string
          code_postal?: string
          charge_affaires_id?: string
          statut?: StatutChantier
          phase?: Phase
          date_debut?: string
          date_fin_prevue?: string
          date_fin_reelle?: string | null
          budget_initial?: number
          budget_actuel?: number
          depenses_actuelles?: number
          avancement_physique?: number
          health_score?: number
          derniere_alerte?: string | null
          notes?: string | null
          actif?: boolean
          created_at?: string
          updated_at?: string
        }
      }
      taches: {
        Row: {
          id: string
          chantier_id: string
          titre: string
          description: string | null
          responsable_id: string
          statut: StatutTache
          priorite: Priorite
          date_debut: string | null
          date_echeance: string
          date_completion: string | null
          ordre: number
          temps_estime: number | null
          temps_reel: number | null
          pourcentage_avancement: number
          bloquante: boolean
          tags: string[] | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          chantier_id: string
          titre: string
          description?: string | null
          responsable_id: string
          statut?: StatutTache
          priorite?: Priorite
          date_debut?: string | null
          date_echeance: string
          date_completion?: string | null
          ordre?: number
          temps_estime?: number | null
          temps_reel?: number | null
          pourcentage_avancement?: number
          bloquante?: boolean
          tags?: string[] | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          chantier_id?: string
          titre?: string
          description?: string | null
          responsable_id?: string
          statut?: StatutTache
          priorite?: Priorite
          date_debut?: string | null
          date_echeance?: string
          date_completion?: string | null
          ordre?: number
          temps_estime?: number | null
          temps_reel?: number | null
          pourcentage_avancement?: number
          bloquante?: boolean
          tags?: string[] | null
          created_at?: string
          updated_at?: string
        }
      }
      documents: {
        Row: {
          id: string
          chantier_id: string
          nom: string
          type: TypeDocument
          chemin_fichier: string
          url_public: string
          taille: number
          mime_type: string
          description: string | null
          uploade_par: string
          tags: string[] | null
          version: number
          created_at: string
        }
        Insert: {
          id?: string
          chantier_id: string
          nom: string
          type: TypeDocument
          chemin_fichier: string
          url_public: string
          taille: number
          mime_type: string
          description?: string | null
          uploade_par: string
          tags?: string[] | null
          version?: number
          created_at?: string
        }
        Update: {
          id?: string
          chantier_id?: string
          nom?: string
          type?: TypeDocument
          chemin_fichier?: string
          url_public?: string
          taille?: number
          mime_type?: string
          description?: string | null
          uploade_par?: string
          tags?: string[] | null
          version?: number
          created_at?: string
        }
      }
      avenants: {
        Row: {
          id: string
          chantier_id: string
          numero: string
          description: string
          montant: number
          delai_supplementaire: number | null
          statut: StatutAvenant
          date_demande: string
          date_approbation: string | null
          approuve_par: string | null
          justification: string | null
          impact_budget: number
          impact_delai: number
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          chantier_id: string
          numero: string
          description: string
          montant: number
          delai_supplementaire?: number | null
          statut?: StatutAvenant
          date_demande?: string
          date_approbation?: string | null
          approuve_par?: string | null
          justification?: string | null
          impact_budget?: number
          impact_delai?: number
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          chantier_id?: string
          numero?: string
          description?: string
          montant?: number
          delai_supplementaire?: number | null
          statut?: StatutAvenant
          date_demande?: string
          date_approbation?: string | null
          approuve_par?: string | null
          justification?: string | null
          impact_budget?: number
          impact_delai?: number
          created_at?: string
          updated_at?: string
        }
      }
      commandes: {
        Row: {
          id: string
          chantier_id: string
          numero: string
          fournisseur: string
          description: string
          montant: number
          statut: StatutCommande
          date_commande: string
          date_livraison_prevue: string | null
          date_livraison_reelle: string | null
          bon_commande_url: string | null
          notes: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          chantier_id: string
          numero: string
          fournisseur: string
          description: string
          montant: number
          statut?: StatutCommande
          date_commande?: string
          date_livraison_prevue?: string | null
          date_livraison_reelle?: string | null
          bon_commande_url?: string | null
          notes?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          chantier_id?: string
          numero?: string
          fournisseur?: string
          description?: string
          montant?: number
          statut?: StatutCommande
          date_commande?: string
          date_livraison_prevue?: string | null
          date_livraison_reelle?: string | null
          bon_commande_url?: string | null
          notes?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      factures: {
        Row: {
          id: string
          chantier_id: string
          numero: string
          type: 'client' | 'fournisseur'
          emetteur: string
          destinataire: string
          montant_ht: number
          montant_tva: number
          montant_ttc: number
          statut: StatutFacture
          date_emission: string
          date_echeance: string
          date_paiement: string | null
          facture_url: string | null
          notes: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          chantier_id: string
          numero: string
          type: 'client' | 'fournisseur'
          emetteur: string
          destinataire: string
          montant_ht: number
          montant_tva: number
          montant_ttc: number
          statut?: StatutFacture
          date_emission?: string
          date_echeance: string
          date_paiement?: string | null
          facture_url?: string | null
          notes?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          chantier_id?: string
          numero?: string
          type?: 'client' | 'fournisseur'
          emetteur?: string
          destinataire?: string
          montant_ht?: number
          montant_tva?: number
          montant_ttc?: number
          statut?: StatutFacture
          date_emission?: string
          date_echeance?: string
          date_paiement?: string | null
          facture_url?: string | null
          notes?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      journal_chantier: {
        Row: {
          id: string
          chantier_id: string
          type: TypeJournal
          titre: string
          contenu: string
          auteur_id: string
          date_evenement: string
          meteo: string | null
          participants: string[] | null
          photos: string[] | null
          created_at: string
        }
        Insert: {
          id?: string
          chantier_id: string
          type: TypeJournal
          titre: string
          contenu: string
          auteur_id: string
          date_evenement?: string
          meteo?: string | null
          participants?: string[] | null
          photos?: string[] | null
          created_at?: string
        }
        Update: {
          id?: string
          chantier_id?: string
          type?: TypeJournal
          titre?: string
          contenu?: string
          auteur_id?: string
          date_evenement?: string
          meteo?: string | null
          participants?: string[] | null
          photos?: string[] | null
          created_at?: string
        }
      }
      notifications: {
        Row: {
          id: string
          destinataire_id: string
          titre: string
          message: string
          type: 'info' | 'alerte' | 'warning' | 'success'
          lue: boolean
          chantier_id: string | null
          tache_id: string | null
          url: string | null
          created_at: string
        }
        Insert: {
          id?: string
          destinataire_id: string
          titre: string
          message: string
          type?: 'info' | 'alerte' | 'warning' | 'success'
          lue?: boolean
          chantier_id?: string | null
          tache_id?: string | null
          url?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          destinataire_id?: string
          titre?: string
          message?: string
          type?: 'info' | 'alerte' | 'warning' | 'success'
          lue?: boolean
          chantier_id?: string | null
          tache_id?: string | null
          url?: string | null
          created_at?: string
        }
      }
      historique_scores: {
        Row: {
          id: string
          chantier_id: string
          health_score: number
          score_budget: number
          score_delai: number
          score_qualite: number
          score_securite: number
          avancement_physique: number
          budget_utilise: number
          jours_ecoules: number
          alertes_actives: number
          created_at: string
        }
        Insert: {
          id?: string
          chantier_id: string
          health_score: number
          score_budget: number
          score_delai: number
          score_qualite: number
          score_securite: number
          avancement_physique: number
          budget_utilise: number
          jours_ecoules: number
          alertes_actives: number
          created_at?: string
        }
        Update: {
          id?: string
          chantier_id?: string
          health_score?: number
          score_budget?: number
          score_delai?: number
          score_qualite?: number
          score_securite?: number
          avancement_physique?: number
          budget_utilise?: number
          jours_ecoules?: number
          alertes_actives?: number
          created_at?: string
        }
      }
      alertes: {
        Row: {
          id: string
          chantier_id: string
          type: 'budget' | 'delai' | 'qualite' | 'securite' | 'autre'
          severite: 'basse' | 'moyenne' | 'haute' | 'critique'
          titre: string
          description: string
          declenchee_par: string
          resolue: boolean
          resolue_par: string | null
          date_resolution: string | null
          actions_correctives: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          chantier_id: string
          type: 'budget' | 'delai' | 'qualite' | 'securite' | 'autre'
          severite: 'basse' | 'moyenne' | 'haute' | 'critique'
          titre: string
          description: string
          declenchee_par: string
          resolue?: boolean
          resolue_par?: string | null
          date_resolution?: string | null
          actions_correctives?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          chantier_id?: string
          type?: 'budget' | 'delai' | 'qualite' | 'securite' | 'autre'
          severite?: 'basse' | 'moyenne' | 'haute' | 'critique'
          titre?: string
          description?: string
          declenchee_par?: string
          resolue?: boolean
          resolue_par?: string | null
          date_resolution?: string | null
          actions_correctives?: string | null
          created_at?: string
          updated_at?: string
        }
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      calculer_health_score: {
        Args: { chantier_id_param: string }
        Returns: number
      }
      get_dashboard_stats: {
        Args: { user_id_param: string }
        Returns: {
          total_chantiers: number
          chantiers_actifs: number
          chantiers_alerte: number
          budget_total: number
          budget_utilise: number
          taux_utilisation_budget: number
          taches_totales: number
          taches_terminees: number
          taches_en_retard: number
          alertes_critiques: number
          score_moyen: number
        }[]
      }
      get_charge_affaires_stats: {
        Args: { charge_id_param: string }
        Returns: {
          total_chantiers: number
          chantiers_en_cours: number
          budget_total: number
          depenses_totales: number
          taches_en_cours: number
          taches_en_retard: number
          score_moyen: number
          chantiers_details: Json
        }[]
      }
    }
    Enums: {
      role: Role
      statut_chantier: StatutChantier
      phase: Phase
      priorite: Priorite
      statut_tache: StatutTache
      type_document: TypeDocument
      statut_avenant: StatutAvenant
      statut_commande: StatutCommande
      statut_facture: StatutFacture
      type_journal: TypeJournal
    }
  }
}

// Types utilitaires
export type Tables<T extends keyof Database['public']['Tables']> =
  Database['public']['Tables'][T]['Row']

export type Inserts<T extends keyof Database['public']['Tables']> =
  Database['public']['Tables'][T]['Insert']

export type Updates<T extends keyof Database['public']['Tables']> =
  Database['public']['Tables'][T]['Update']

export type Enums<T extends keyof Database['public']['Enums']> =
  Database['public']['Enums'][T]

// Types sp\u00e9cifiques
export type Profile = Tables<'profiles'>
export type Chantier = Tables<'chantiers'>
export type Tache = Tables<'taches'>
export type Document = Tables<'documents'>
export type Avenant = Tables<'avenants'>
export type Commande = Tables<'commandes'>
export type Facture = Tables<'factures'>
export type JournalEntry = Tables<'journal_chantier'>
export type Notification = Tables<'notifications'>
export type HistoriqueScore = Tables<'historique_scores'>
export type Alerte = Tables<'alertes'>

// Types pour les relations
export interface ChantierWithRelations extends Chantier {
  charge_affaires?: Profile
  taches?: Tache[]
  documents?: Document[]
  avenants?: Avenant[]
  commandes?: Commande[]
  factures?: Facture[]
  journal?: JournalEntry[]
  alertes?: Alerte[]
}

export interface TacheWithRelations extends Tache {
  chantier?: Chantier
  responsable?: Profile
}

export interface NotificationWithRelations extends Notification {
  destinataire?: Profile
  chantier?: Chantier
  tache?: Tache
}

// Types pour les statistiques
export interface DashboardStats {
  total_chantiers: number
  chantiers_actifs: number
  chantiers_alerte: number
  budget_total: number
  budget_utilise: number
  taux_utilisation_budget: number
  taches_totales: number
  taches_terminees: number
  taches_en_retard: number
  alertes_critiques: number
  score_moyen: number
}

export interface ChargeAffairesStats {
  total_chantiers: number
  chantiers_en_cours: number
  budget_total: number
  depenses_totales: number
  taches_en_cours: number
  taches_en_retard: number
  score_moyen: number
  chantiers_details: ChantierDetail[]
}

export interface ChantierDetail {
  id: string
  nom: string
  numero: string
  statut: StatutChantier
  health_score: number
  avancement_physique: number
  budget_utilise_pct: number
  delai_ecoule_pct: number
}

export interface HealthScore {
  global: number
  budget: number
  delai: number
  qualite: number
  securite: number
}

// Types pour les filtres
export interface ChantierFilters {
  statut?: StatutChantier[]
  phase?: Phase[]
  charge_affaires_id?: string
  search?: string
  health_score_min?: number
  health_score_max?: number
  date_debut_min?: string
  date_debut_max?: string
}

export interface TacheFilters {
  statut?: StatutTache[]
  priorite?: Priorite[]
  responsable_id?: string
  en_retard?: boolean
  bloquante?: boolean
  search?: string
}

export interface AlerteFilters {
  type?: ('budget' | 'delai' | 'qualite' | 'securite' | 'autre')[]
  severite?: ('basse' | 'moyenne' | 'haute' | 'critique')[]
  resolue?: boolean
  chantier_id?: string
}