import { differenceInDays, addDays, parseISO, isAfter, isBefore } from 'date-fns';

export interface Tache {
 id: string;
 nom: string;
 statut: 'non_commence' | 'en_cours' | 'termine' | 'en_retard';
 date_debut_prevue: string;
 date_fin_prevue: string;
 date_debut_reelle?: string;
 date_fin_reelle?: string;
 pourcentage_completion: number;
}

export interface Chantier {
 id: string;
 nom: string;
 date_debut: string;
 date_fin_prevue: string;
 budget_initial: number;
 montant_facture: number;
 pourcentage_avancement: number;
}

/**
 * Calcule le score de sant\u00e9 d'un chantier (0-100)
 * Bas\u00e9 sur 30 crit\u00e8res avec un poids de 0.0333 chacun
 */
export function calculScoreSante(taches: Tache[]): number {
 if (!taches || taches.length === 0) return 100;

 const POIDS_PAR_TACHE = 0.0333; // 1/30
 const MAX_TACHES = 30;

 let scoreTotal = 100;
 const nombreTaches = Math.min(taches.length, MAX_TACHES);

 for (let i = 0; i < nombreTaches; i++) {
 const tache = taches[i];
 let penalite = 0;

 // Calculer la p\u00e9nalit\u00e9 pour cette t\u00e2che
 if (tache.statut === 'en_retard') {
 const dateFinPrevue = parseISO(tache.date_fin_prevue);
 const aujourdHui = new Date();
 const joursRetard = differenceInDays(aujourdHui, dateFinPrevue);

 if (joursRetard > 30) {
 penalite = 100; // P\u00e9nalit\u00e9 maximale
 } else if (joursRetard > 14) {
 penalite = 75;
 } else if (joursRetard > 7) {
 penalite = 50;
 } else {
 penalite = 25;
 }
 } else if (tache.statut === 'en_cours') {
 const dateFinPrevue = parseISO(tache.date_fin_prevue);
 const aujourdHui = new Date();
 
 // Si la date de fin pr\u00e9vue est d\u00e9pass\u00e9e mais statut encore "en_cours"
 if (isAfter(aujourdHui, dateFinPrevue)) {
 const joursRetard = differenceInDays(aujourdHui, dateFinPrevue);
 penalite = Math.min(joursRetard * 2, 80);
 } else if (tache.pourcentage_completion < 50) {
 // T\u00e2che en cours mais faible avancement
 const joursRestants = differenceInDays(dateFinPrevue, aujourdHui);
 const dateDebut = tache.date_debut_reelle 
 ? parseISO(tache.date_debut_reelle) 
 : parseISO(tache.date_debut_prevue);
 const dureeTotal = differenceInDays(dateFinPrevue, dateDebut);
 const tempsEcoule = differenceInDays(aujourdHui, dateDebut);
 const avancementAttendu = dureeTotal > 0 ? (tempsEcoule / dureeTotal) * 100 : 0;

 if (tache.pourcentage_completion < avancementAttendu - 20) {
 penalite = 30;
 }
 }
 } else if (tache.statut === 'non_commence') {
 const dateDebutPrevue = parseISO(tache.date_debut_prevue);
 const aujourdHui = new Date();

 // Si la t\u00e2che aurait d\u00fb commencer
 if (isAfter(aujourdHui, dateDebutPrevue)) {
 const joursRetard = differenceInDays(aujourdHui, dateDebutPrevue);
 penalite = Math.min(joursRetard * 3, 90);
 }
 }

 // Appliquer la p\u00e9nalit\u00e9 pond\u00e9r\u00e9e
 scoreTotal -= penalite * POIDS_PAR_TACHE;
 }

 // S'assurer que le score reste entre 0 et 100
 return Math.max(0, Math.min(100, Math.round(scoreTotal)));
}

/
 * Pr\u00e9dit la date de fin r\u00e9elle bas\u00e9e sur la v\u00e9locit\u00e9 actuelle
 */
export function predictionRetard(
 taches: Tache[],
 dateDebut: string
): { dateFinPredite: Date; joursRetard: number; velocite: number } {
 const tachesTerminees = taches.filter(t => t.statut === 'termine');
 const tachesRestantes = taches.filter(t => t.statut !== 'termine');

 if (taches.length === 0) {
 return {
 dateFinPredite: parseISO(dateDebut),
 joursRetard: 0,
 velocite: 1
 };
 }

 // Calculer la v\u00e9locit\u00e9 (t\u00e2ches par jour)
 let velocite = 1;
 if (tachesTerminees.length > 0) {
 const debut = parseISO(dateDebut);
 const aujourdHui = new Date();
 const joursEcoules = differenceInDays(aujourdHui, debut);
 
 if (joursEcoules > 0) {
 velocite = tachesTerminees.length / joursEcoules;
 }
 }

 // Pr\u00e9dire les jours n\u00e9cessaires pour finir
 const joursRestantsEstimes = velocite > 0 
 ? Math.ceil(tachesRestantes.length / velocite) 
 : tachesRestantes.length * 7; // Si pas de v\u00e9locit\u00e9, estimer 7j par t\u00e2che

 const dateFinPredite = addDays(new Date(), joursRestantsEstimes);

 // Calculer le retard par rapport \u00e0 la date de fin pr\u00e9vue la plus tardive
 const dateFinPrevueMax = taches.reduce((max, tache) => {
 const dateFin = parseISO(tache.date_fin_prevue);
 return isAfter(dateFin, max) ? dateFin : max;
 }, parseISO(taches[0].date_fin_prevue));

 const joursRetard = differenceInDays(dateFinPredite, dateFinPrevueMax);

 return {
 dateFinPredite,
 joursRetard: Math.max(0, joursRetard),
 velocite
 };
}

/
 * Calcule la charge de travail par chef de chantier (heures/semaine)
 */
export function calculChargeCA(
 chantiers: Chantier[],
 affectations: { chantier_id: string; chef_chantier_id: string }[]
): Record<string, { heuresParSemaine: number; nombreChantiers: number }> {
 const HEURES_PAR_CHANTIER_PAR_SEMAINE = 10; // Estimation

 const chargeParCA: Record<string, { heuresParSemaine: number; nombreChantiers: number }> = {};

 for (const affectation of affectations) {
 const chantier = chantiers.find(c => c.id === affectation.chantier_id);
 
 if (!chantier) continue;

 // Ne compter que les chantiers en cours (non termin\u00e9s)
 const aujourdHui = new Date();
 const dateFin = parseISO(chantier.date_fin_prevue);
 
 if (isAfter(aujourdHui, dateFin)) continue; // Chantier termin\u00e9

 const caId = affectation.chef_chantier_id;

 if (!chargeParCA[caId]) {
 chargeParCA[caId] = {
 heuresParSemaine: 0,
 nombreChantiers: 0
 };
 }

 // Ajuster les heures en fonction de l'avancement
 const facteurAvancement = chantier.pourcentage_avancement < 80 ? 1 : 0.5;
 chargeParCA[caId].heuresParSemaine += HEURES_PAR_CHANTIER_PAR_SEMAINE * facteurAvancement;
 chargeParCA[caId].nombreChantiers += 1;
 }

 return chargeParCA;
}

/
 * Calcule et g\u00e9n\u00e8re une alerte tr\u00e9sorerie
 */
export function calculAlerteTresorerie(
 chantiers: Chantier[]
): { alerte: boolean; niveau: 'critique' | 'attention' | 'ok'; message: string; details: any } {
 let budgetTotalPrevu = 0;
 let montantTotalFacture = 0;
 let avancementMoyenPondere = 0;
 let budgetTotalPondere = 0;

 for (const chantier of chantiers) {
 const aujourdHui = new Date();
 const dateFin = parseISO(chantier.date_fin_prevue);

 // Ne consid\u00e9rer que les chantiers en cours
 if (isAfter(aujourdHui, dateFin)) continue;

 budgetTotalPrevu += chantier.budget_initial;
 montantTotalFacture += chantier.montant_facture;
 avancementMoyenPondere += chantier.pourcentage_avancement * chantier.budget_initial;
 budgetTotalPondere += chantier.budget_initial;
 }

 const avancementMoyen = budgetTotalPondere > 0 
 ? avancementMoyenPondere / budgetTotalPondere 
 : 0;

 const facturationAttendue = (avancementMoyen / 100) * budgetTotalPrevu;
 const ecartFacturation = montantTotalFacture - facturationAttendue;
 const tauxFacturation = facturationAttendue > 0 
 ? (montantTotalFacture / facturationAttendue) * 100 
 : 100;

 let niveau: 'critique' | 'attention' | 'ok' = 'ok';
 let alerte = false;
 let message = 'Tr\u00e9sorerie saine';

 if (tauxFacturation < 60) {
 niveau = 'critique';
 alerte = true;
 message = `Alerte critique: seulement ${tauxFacturation.toFixed(0)}% de la facturation attendue`;
 } else if (tauxFacturation < 80) {
 niveau = 'attention';
 alerte = true;
 message = `Attention: facturation \u00e0 ${tauxFacturation.toFixed(0)}% de l'attendu`;
 }

 return {
 alerte,
 niveau,
 message,
 details: {
 budgetTotalPrevu,
 montantTotalFacture,
 facturationAttendue,
 ecartFacturation,
 tauxFacturation: parseFloat(tauxFacturation.toFixed(2)),
 avancementMoyen: parseFloat(avancementMoyen.toFixed(2))
 }
 };
}

/
 * Retourne la classe Tailwind CSS pour la couleur selon le score
 */
export function getHealthColor(score: number): string {
 if (score >= 80) {
 return 'text-green-600 bg-green-50 border-green-200';
 } else if (score >= 60) {
 return 'text-yellow-600 bg-yellow-50 border-yellow-200';
 } else if (score >= 40) {
 return 'text-orange-600 bg-orange-50 border-orange-200';
 } else {
 return 'text-red-600 bg-red-50 border-red-200';
 }
}

/
 * Retourne le label textuel selon le score
 */
export function getHealthLabel(score: number): string {
 if (score >= 90) {
 return 'Excellent';
 } else if (score >= 75) {
 return 'Bon';
 } else if (score >= 50) {
 return 'Attention';
 } else {
 return 'Critique';
 }
}

/
 * Retourne l'ic\u00f4ne appropri\u00e9e selon le score
 */
export function getHealthIcon(score: number): string {
 if (score >= 80) {
 return '\u2705';
 } else if (score >= 60) {
 return '\u26a0\ufe0f';
 } else if (score >= 40) {
 return '\ud83d\udd36';
 } else {
 return '\ud83d\udea8';
 }
}

/
 * Calcule les statistiques globales d'un chantier
 */
export function calculStatistiquesChantier(chantier: Chantier, taches: Tache[]) {
 const score = calculScoreSante(taches);
 const prediction = predictionRetard(taches, chantier.date_debut);
 
 const tachesTerminees = taches.filter(t => t.statut === 'termine').length;
 const tachesEnCours = taches.filter(t => t.statut === 'en_cours').length;
 const tachesEnRetard = taches.filter(t => t.statut === 'en_retard').length;
 const tachesNonCommencees = taches.filter(t => t.statut === 'non_commence').length;

 const aujourdHui = new Date();
 const dateDebut = parseISO(chantier.date_debut);
 const dateFinPrevue = parseISO(chantier.date_fin_prevue);
 const dureeTotal = differenceInDays(dateFinPrevue, dateDebut);
 const tempsEcoule = differenceInDays(aujourdHui, dateDebut);
 const pourcentageTempsEcoule = dureeTotal > 0 ? (tempsEcoule / dureeTotal) * 100 : 0;

 const ecartAvancement = chantier.pourcentage_avancement - pourcentageTempsEcoule;

 return {
 score,
 label: getHealthLabel(score),
 color: getHealthColor(score),
 icon: getHealthIcon(score),
 prediction,
 taches: {
 total: taches.length,
 terminees: tachesTerminees,
 enCours: tachesEnCours,
 enRetard: tachesEnRetard,
 nonCommencees: tachesNonCommencees,
 tauxCompletion: taches.length > 0 ? (tachesTerminees / taches.length) * 100 : 0
 },
 planning: {
 dureeTotal,
 tempsEcoule,
 tempsRestant: dureeTotal - tempsEcoule,
 pourcentageTempsEcoule,
 ecartAvancement,
 enAvance: ecartAvancement > 10,
 enRetard: ecartAvancement < -10
 },
 budget: {
 initial: chantier.budget_initial,
 facture: chantier.montant_facture,
 reste: chantier.budget_initial - chantier.montant_facture,
 tauxFacturation: chantier.budget_initial > 0 
 ? (chantier.montant_facture / chantier.budget_initial) * 100 
 : 0
 }
 };
}