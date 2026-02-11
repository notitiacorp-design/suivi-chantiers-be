import React, { useState } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { supabase } from '../../lib/supabaseClient';
import { X, Check, ArrowRight, ArrowLeft, Building, FileText, DollarSign, Users } from 'lucide-react';
import { v4 as uuidv4 } from 'uuid';

interface NewChantierFormProps {
 onClose: () => void;
}

interface FormData {
 // Étape 1: Infos générales
 nom: string;
 client_id: string;
 adresse: string;
 description: string;
 date_debut: string;
 date_fin_prevue: string;
 phase: string;
 statut: string;

 // Étape 2: Études
 type_etude: string;
 surface_shon: number;
 nombre_logements: number;
 heures_estimees: number;

 // Étape 3: Admin
 charge_affaire_id: string;
 nb_plans_estimes: number;
 delai_global_jours: number;

 // Étape 4: Budget
 budget_total: number;
 honoraires_be: number;
 taux_marge: number;
}

const TACHES_PROCESS = [
 { ordre: 1, nom: 'Réception commande client', phase: 'APS', duree_estimee: 1, obligatoire: true },
 { ordre: 2, nom: 'Analyse cahier des charges', phase: 'APS', duree_estimee: 2, obligatoire: true },
 { ordre: 3, nom: 'Visite site', phase: 'APS', duree_estimee: 0.5, obligatoire: true },
 { ordre: 4, nom: 'Collecte données techniques', phase: 'APS', duree_estimee: 3, obligatoire: true },
 { ordre: 5, nom: 'Esquisse structure', phase: 'APS', duree_estimee: 5, obligatoire: true },
 { ordre: 6, nom: 'Prédimensionnement', phase: 'APS', duree_estimee: 4, obligatoire: true },
 { ordre: 7, nom: 'Note de calcul préliminaire', phase: 'APS', duree_estimee: 6, obligatoire: true },
 { ordre: 8, nom: 'Validation APS client', phase: 'APS', duree_estimee: 1, obligatoire: true },
 { ordre: 9, nom: 'Plans structure APD', phase: 'APD', duree_estimee: 10, obligatoire: true },
 { ordre: 10, nom: 'Calculs détaillés fondations', phase: 'APD', duree_estimee: 8, obligatoire: true },
 { ordre: 11, nom: 'Calculs poteaux/poutres', phase: 'APD', duree_estimee: 8, obligatoire: true },
 { ordre: 12, nom: 'Dimensionnement planchers', phase: 'APD', duree_estimee: 6, obligatoire: true },
 { ordre: 13, nom: 'Note hypothèses sismiques', phase: 'APD', duree_estimee: 4, obligatoire: true },
 { ordre: 14, nom: 'Validation APD client', phase: 'APD', duree_estimee: 1, obligatoire: true },
 { ordre: 15, nom: 'Plans coffrage', phase: 'PRO', duree_estimee: 12, obligatoire: true },
 { ordre: 16, nom: 'Plans ferraillage', phase: 'PRO', duree_estimee: 15, obligatoire: true },
 { ordre: 17, nom: 'Nomenclature aciers', phase: 'PRO', duree_estimee: 5, obligatoire: true },
 { ordre: 18, nom: 'CCTP structure', phase: 'PRO', duree_estimee: 6, obligatoire: true },
 { ordre: 19, nom: 'Métrés quantitatifs', phase: 'PRO', duree_estimee: 4, obligatoire: true },
 { ordre: 20, nom: 'Validation PRO architecte', phase: 'PRO', duree_estimee: 1, obligatoire: true },
 { ordre: 21, nom: 'Réponses questions entreprises', phase: 'DCE', duree_estimee: 3, obligatoire: false },
 { ordre: 22, nom: 'Analyse variantes', phase: 'DCE', duree_estimee: 4, obligatoire: false },
 { ordre: 23, nom: 'Visa plans architecte', phase: 'VISA', duree_estimee: 2, obligatoire: false },
 { ordre: 24, nom: 'Visa plans électricité', phase: 'VISA', duree_estimee: 1, obligatoire: false },
 { ordre: 25, nom: 'Visa plans plomberie', phase: 'VISA', duree_estimee: 1, obligatoire: false },
 { ordre: 26, nom: 'Plans d\'exécution ouvrages', phase: 'DET', duree_estimee: 10, obligatoire: false },
 { ordre: 27, nom: 'Visite chantier fondations', phase: 'AOR', duree_estimee: 0.5, obligatoire: false },
 { ordre: 28, nom: 'Visite chantier structure', phase: 'AOR', duree_estimee: 0.5, obligatoire: false },
 { ordre: 29, nom: 'Validation réception travaux', phase: 'AOR', duree_estimee: 1, obligatoire: false },
 { ordre: 30, nom: 'DOE - Dossier Ouvrages Exécutés', phase: 'AOR', duree_estimee: 4, obligatoire: true },
];

const NewChantierForm: React.FC<NewChantierFormProps> = ({ onClose }) => {
 const [currentStep, setCurrentStep] = useState(1);
 const [formData, setFormData] = useState<FormData>({
 nom: '',
 client_id: '',
 adresse: '',
 description: '',
 date_debut: new Date().toISOString().split('T')[0],
 date_fin_prevue: '',
 phase: 'APS',
 statut: 'actif',
 type_etude: 'neuf',
 surface_shon: 0,
 nombre_logements: 0,
 heures_estimees: 0,
 charge_affaire_id: '',
 nb_plans_estimes: 0,
 delai_global_jours: 0,
 budget_total: 0,
 honoraires_be: 0,
 taux_marge: 25,
 });

 const [errors, setErrors] = useState<Partial<Record<keyof FormData, string>>>({});

 // Récupération des clients
 const { data: clients = [] } = useQuery({
 queryKey: ['clients'],
 queryFn: async () => {
 const { data, error } = await supabase.from('clients').select('id, nom').order('nom');
 if (error) throw error;
 return data;
 },
 });

 // Récupération des chargés d'affaires
 const { data: chargesAffaires = [] } = useQuery({
 queryKey: ['charges-affaires-form'],
 queryFn: async () => {
 const { data, error } = await supabase
 .from('users')
 .select('id, nom, prenom')
 .eq('role', 'charge_affaire')
 .order('nom');
 if (error) throw error;
 return data;
 },
 });

 // Mutation de création
 const createChantierMutation = useMutation({
 mutationFn: async (data: FormData) => {
 const chantierId = uuidv4();

 // 1. Créer le chantier
 const { error: chantierError } = await supabase.from('chantiers').insert({
 id: chantierId,
 nom: data.nom,
 client_id: data.client_id,
 adresse: data.adresse,
 description: data.description,
 date_debut: data.date_debut,
 date_fin_prevue: data.date_fin_prevue,
 phase: data.phase,
 statut: data.statut,
 type_etude: data.type_etude,
 surface_shon: data.surface_shon,
 nombre_logements: data.nombre_logements,
 heures_estimees: data.heures_estimees,
 charge_affaire_id: data.charge_affaire_id,
 nb_plans_estimes: data.nb_plans_estimes,
 delai_global_jours: data.delai_global_jours,
 budget_total: data.budget_total,
 honoraires_be: data.honoraires_be,
 taux_marge: data.taux_marge,
 score_sante: 100,
 avancement: 0,
 created_at: new Date().toISOString(),
 updated_at: new Date().toISOString(),
 });

 if (chantierError) throw chantierError;

 // 2. Créer les 30 tâches process
 const taches = TACHES_PROCESS.map((t) => ({
 id: uuidv4(),
 chantier_id: chantierId,
 nom: t.nom,
 ordre: t.ordre,
 phase: t.phase,
 duree_estimee: t.duree_estimee,
 statut: 'a_faire',
 obligatoire: t.obligatoire,
 created_at: new Date().toISOString(),
 }));

 const { error: tachesError } = await supabase.from('taches').insert(taches);
 if (tachesError) throw tachesError;

 // 3. Créer événement timeline
 const { error: timelineError } = await supabase.from('timeline_events').insert({
 id: uuidv4(),
 chantier_id: chantierId,
 type: 'creation',
 titre: 'Chantier créé',
 description: `Le chantier ${data.nom} a été créé avec succès`,
 date: new Date().toISOString(),
 user_id: data.charge_affaire_id,
 });

 if (timelineError) throw timelineError;

 return chantierId;
 },
 onSuccess: () => {
 alert('Chantier créé avec succès !');
 onClose();
 },
 onError: (error) => {
 console.error('Erreur création chantier:', error);
 alert('Erreur lors de la création du chantier');
 },
 });

 const validateStep = (step: number): boolean => {
 const newErrors: Partial<Record<keyof FormData, string>> = {};

 if (step === 1) {
 if (!formData.nom.trim()) newErrors.nom = 'Le nom est requis';
 if (!formData.client_id) newErrors.client_id = 'Le client est requis';
 if (!formData.date_debut) newErrors.date_debut = 'La date de début est requise';
 if (!formData.date_fin_prevue) newErrors.date_fin_prevue = 'La date de fin prévue est requise';
 }

 if (step === 2) {
 if (formData.surface_shon <= 0) newErrors.surface_shon = 'La surface doit être positive';
 if (formData.heures_estimees <= 0) newErrors.heures_estimees = 'Les heures estimées doivent être positives';
 }

 if (step === 3) {
 if (!formData.charge_affaire_id) newErrors.charge_affaire_id = 'Le chargé d\'affaires est requis';
 if (formData.nb_plans_estimes <= 0) newErrors.nb_plans_estimes = 'Le nombre de plans doit être positif';
 if (formData.delai_global_jours <= 0) newErrors.delai_global_jours = 'Le délai doit être positif';
 }

 if (step === 4) {
 if (formData.budget_total <= 0) newErrors.budget_total = 'Le budget doit être positif';
 if (formData.honoraires_be <= 0) newErrors.honoraires_be = 'Les honoraires doivent être positifs';
 }

 setErrors(newErrors);
 return Object.keys(newErrors).length === 0;
 };

 const handleNext = () => {
 if (validateStep(currentStep)) {
 setCurrentStep(currentStep + 1);
 }
 };

 const handlePrevious = () => {
 setCurrentStep(currentStep - 1);
 };

 const handleSubmit = () => {
 if (validateStep(4)) {
 createChantierMutation.mutate(formData);
 }
 };

 const updateFormData = (field: keyof FormData, value: any) => {
 setFormData({ ...formData, [field]: value });
 if (errors[field]) {
 setErrors({ ...errors, [field]: undefined });
 }
 };

 const steps = [
 { number: 1, title: 'Infos générales', icon: Building },
 { number: 2, title: 'Études', icon: FileText },
 { number: 3, title: 'Administration', icon: Users },
 { number: 4, title: 'Budget', icon: DollarSign },
 ];

 return (
 <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4 overflow-y-auto">
 <div className="bg-white rounded-lg shadow-2xl max-w-4xl w-full my-8">
 {/* En-tête */}
 <div className="bg-gradient-to-r from-blue-600 to-blue-700 text-white px-6 py-4 flex items-center justify-between rounded-t-lg">
 <h2 className="text-2xl font-bold">Nouveau Chantier</h2>
 <button
 onClick={onClose}
 className="text-white hover:bg-blue-800 rounded-full p-2 transition-colors"
 >
 <X className="w-6 h-6" />
 </button>
 </div>

 {/* Indicateur d'étapes */}
 <div className="px-6 py-4 bg-gray-50 border-b">
 <div className="flex items-center justify-between">
 {steps.map((step, idx) => (
 <React.Fragment key={step.number}>
 <div className="flex flex-col items-center">
 <div
 className={`w-12 h-12 rounded-full flex items-center justify-center font-bold transition-all ${
 currentStep >= step.number
 ? 'bg-blue-600 text-white'
 : 'bg-gray-300 text-gray-600'
 }`}
 >
 {currentStep > step.number ? (
 <Check className="w-6 h-6" />
 ) : (
 <step.icon className="w-6 h-6" />
 )}
 </div>
 <p
 className={`text-xs mt-2 font-medium ${
 currentStep >= step.number ? 'text-blue-600' : 'text-gray-500'
 }`}
 >
 {step.title}
 </p>
 </div>
 {idx < steps.length - 1 && (
 <div
 className={`flex-1 h-1 mx-2 rounded ${
 currentStep > step.number ? 'bg-blue-600' : 'bg-gray-300'
 }`}
 ></div>
 )}
 </React.Fragment>
 ))}
 </div>
 </div>

 {/* Contenu du formulaire */}
 <div className="px-6 py-6 max-h-[60vh] overflow-y-auto">
 {/* Étape 1: Infos générales */}
 {currentStep === 1 && (
 <div className="space-y-4">
 <div>
 <label className="block text-sm font-medium text-gray-700 mb-1">
 Nom du chantier *
 </label>
 <input
 type="text"
 value={formData.nom}
 onChange={(e) => updateFormData('nom', e.target.value)}
 className={`w-full border rounded-lg px-4 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
 errors.nom ? 'border-red-500' : 'border-gray-300'
 }`}
 placeholder="Ex: Résidence Les Jardins"
 />
 {errors.nom && <p className="text-red-500 text-xs mt-1">{errors.nom}</p>}
 </div>

 <div>
 <label className="block text-sm font-medium text-gray-700 mb-1">Client *</label>
 <select
 value={formData.client_id}
 onChange={(e) => updateFormData('client_id', e.target.value)}
 className={`w-full border rounded-lg px-4 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
 errors.client_id ? 'border-red-500' : 'border-gray-300'
 }`}
 >
 <option value="">Sélectionner un client</option>
 {clients.map((client) => (
 <option key={client.id} value={client.id}>
 {client.nom}
 </option>
 ))}
 </select>
 {errors.client_id && <p className="text-red-500 text-xs mt-1">{errors.client_id}</p>}
 </div>

 <div>
 <label className="block text-sm font-medium text-gray-700 mb-1">Adresse</label>
 <input
 type="text"
 value={formData.adresse}
 onChange={(e) => updateFormData('adresse', e.target.value)}
 className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
 placeholder="Adresse complète du chantier"
 />
 </div>

 <div>
 <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
 <textarea
 value={formData.description}
 onChange={(e) => updateFormData('description', e.target.value)}
 rows={4}
 className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
 placeholder="Description détaillée du projet"
 />
 </div>

 <div className="grid grid-cols-2 gap-4">
 <div>
 <label className="block text-sm font-medium text-gray-700 mb-1">
 Date de début *
 </label>
 <input
 type="date"
 value={formData.date_debut}
 onChange={(e) => updateFormData('date_debut', e.target.value)}
 className={`w-full border rounded-lg px-4 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
 errors.date_debut ? 'border-red-500' : 'border-gray-300'
 }`}
 />
 {errors.date_debut && <p className="text-red-500 text-xs mt-1">{errors.date_debut}</p>}
 </div>

 <div>
 <label className="block text-sm font-medium text-gray-700 mb-1">
 Date de fin prévue *
 </label>
 <input
 type="date"
 value={formData.date_fin_prevue}
 onChange={(e) => updateFormData('date_fin_prevue', e.target.value)}
 className={`w-full border rounded-lg px-4 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
 errors.date_fin_prevue ? 'border-red-500' : 'border-gray-300'
 }`}
 />
 {errors.date_fin_prevue && (
 <p className="text-red-500 text-xs mt-1">{errors.date_fin_prevue}</p>
 )}
 </div>
 </div>

 <div className="grid grid-cols-2 gap-4">
 <div>
 <label className="block text-sm font-medium text-gray-700 mb-1">Phase initiale</label>
 <select
 value={formData.phase}
 onChange={(e) => updateFormData('phase', e.target.value)}
 className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
 >
 <option value="APS">APS</option>
 <option value="APD">APD</option>
 <option value="PRO">PRO</option>
 <option value="DCE">DCE</option>
 <option value="ACT">ACT</option>
 <option value="VISA">VISA</option>
 <option value="DET">DET</option>
 <option value="AOR">AOR</option>
 </select>
 </div>

 <div>
 <label className="block text-sm font-medium text-gray-700 mb-1">Statut</label>
 <select
 value={formData.statut}
 onChange={(e) => updateFormData('statut', e.target.value)}
 className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
 >
 <option value="actif">Actif</option>
 <option value="en_pause">En pause</option>
 <option value="termine">Terminé</option>
 </select>
 </div>
 </div>
 </div>
 )}

 {/* Étape 2: Études */}
 {currentStep === 2 && (
 <div className="space-y-4">
 <div>
 <label className="block text-sm font-medium text-gray-700 mb-1">Type d'étude</label>
 <select
 value={formData.type_etude}
 onChange={(e) => updateFormData('type_etude', e.target.value)}
 className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
 >
 <option value="neuf">Neuf</option>
 <option value="renovation">Rénovation</option>
 <option value="restructuration">Restructuration</option>
 <option value="extension">Extension</option>
 </select>
 </div>

 <div className="grid grid-cols-2 gap-4">
 <div>
 <label className="block text-sm font-medium text-gray-700 mb-1">
 Surface SHON (m²) *
 </label>
 <input
 type="number"
 value={formData.surface_shon}
 onChange={(e) => updateFormData('surface_shon', parseFloat(e.target.value) || 0)}
 className={`w-full border rounded-lg px-4 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
 errors.surface_shon ? 'border-red-500' : 'border-gray-300'
 }`}
 min="0"
 step="0.01"
 />
 {errors.surface_shon && (
 <p className="text-red-500 text-xs mt-1">{errors.surface_shon}</p>
 )}
 </div>

 <div>
 <label className="block text-sm font-medium text-gray-700 mb-1">
 Nombre de logements
 </label>
 <input
 type="number"
 value={formData.nombre_logements}
 onChange={(e) => updateFormData('nombre_logements', parseInt(e.target.value) || 0)}
 className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
 min="0"
 />
 </div>
 </div>

 <div>
 <label className="block text-sm font-medium text-gray-700 mb-1">
 Heures estimées totales *
 </label>
 <input
 type="number"
 value={formData.heures_estimees}
 onChange={(e) => updateFormData('heures_estimees', parseFloat(e.target.value) || 0)}
 className={`w-full border rounded-lg px-4 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
 errors.heures_estimees ? 'border-red-500' : 'border-gray-300'
 }`}
 min="0"
 step="0.5"
 />
 {errors.heures_estimees && (
 <p className="text-red-500 text-xs mt-1">{errors.heures_estimees}</p>
 )}
 <p className="text-xs text-gray-500 mt-1">
 Estimation du nombre total d'heures pour l'ensemble du projet
 </p>
 </div>

 <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
 <h4 className="text-sm font-semibold text-blue-900 mb-2">Informations calculées</h4>
 <div className="space-y-1 text-sm text-blue-800">
 <p>
 Ratio heures/m²:{' '}
 <span className="font-bold">
 {formData.surface_shon > 0
 ? (formData.heures_estimees / formData.surface_shon).toFixed(2)
 : '0.00'}
 h/m²
 </span>
 </p>
 {formData.nombre_logements > 0 && (
 <p>
 Heures par logement:{' '}
 <span className="font-bold">
 {(formData.heures_estimees / formData.nombre_logements).toFixed(2)} h
 </span>
 </p>
 )}
 </div>
 </div>
 </div>
 )}

 {/* Étape 3: Administration */}
 {currentStep === 3 && (
 <div className="space-y-4">
 <div>
 <label className="block text-sm font-medium text-gray-700 mb-1">
 Chargé d'affaires responsable *
 </label>
 <select
 value={formData.charge_affaire_id}
 onChange={(e) => updateFormData('charge_affaire_id', e.target.value)}
 className={`w-full border rounded-lg px-4 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
 errors.charge_affaire_id ? 'border-red-500' : 'border-gray-300'
 }`}
 >
 <option value="">Sélectionner un chargé d'affaires</option>
 {chargesAffaires.map((ca) => (
 <option key={ca.id} value={ca.id}>
 {ca.prenom} {ca.nom}
 </option>
 ))}
 </select>
 {errors.charge_affaire_id && (
 <p className="text-red-500 text-xs mt-1">{errors.charge_affaire_id}</p>
 )}
 </div>

 <div className="grid grid-cols-2 gap-4">
 <div>
 <label className="block text-sm font-medium text-gray-700 mb-1">
 Nombre de plans estimés *
 </label>
 <input
 type="number"
 value={formData.nb_plans_estimes}
 onChange={(e) => updateFormData('nb_plans_estimes', parseInt(e.target.value) || 0)}
 className={`w-full border rounded-lg px-4 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
 errors.nb_plans_estimes ? 'border-red-500' : 'border-gray-300'
 }`}
 min="0"
 />
 {errors.nb_plans_estimes && (
 <p className="text-red-500 text-xs mt-1">{errors.nb_plans_estimes}</p>
 )}
 </div>

 <div>
 <label className="block text-sm font-medium text-gray-700 mb-1">
 Délai global (jours) *
 </label>
 <input
 type="number"
 value={formData.delai_global_jours}
 onChange={(e) => updateFormData('delai_global_jours', parseInt(e.target.value) || 0)}
 className={`w-full border rounded-lg px-4 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
 errors.delai_global_jours ? 'border-red-500' : 'border-gray-300'
 }`}
 min="0"
 />
 {errors.delai_global_jours && (
 <p className="text-red-500 text-xs mt-1">{errors.delai_global_jours}</p>
 )}
 </div>
 </div>

 <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
 <h4 className="text-sm font-semibold text-purple-900 mb-2">
 Tâches qui seront créées automatiquement
 </h4>
 <p className="text-sm text-purple-800 mb-2">
 {TACHES_PROCESS.length} tâches process seront créées pour ce chantier
 </p>
 <div className="grid grid-cols-2 gap-2 text-xs text-purple-700">
 {['APS', 'APD', 'PRO', 'DCE', 'VISA', 'DET', 'AOR'].map((phase) => {
 const count = TACHES_PROCESS.filter((t) => t.phase === phase).length;
 return (
 <div key={phase} className="flex justify-between">
 <span className="font-medium">{phase}:</span>
 <span>{count} tâches</span>
 </div>
 );
 })}
 </div>
 </div>
 </div>
 )}

 {/* Étape 4: Budget */}
 {currentStep === 4 && (
 <div className="space-y-4">
 <div className="grid grid-cols-2 gap-4">
 <div>
 <label className="block text-sm font-medium text-gray-700 mb-1">
 Budget total (€) *
 </label>
 <input
 type="number"
 value={formData.budget_total}
 onChange={(e) => updateFormData('budget_total', parseFloat(e.target.value) || 0)}
 className={`w-full border rounded-lg px-4 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
 errors.budget_total ? 'border-red-500' : 'border-gray-300'
 }`}
 min="0"
 step="0.01"
 />
 {errors.budget_total && (
 <p className="text-red-500 text-xs mt-1">{errors.budget_total}</p>
 )}
 </div>

 <div>
 <label className="block text-sm font-medium text-gray-700 mb-1">
 Honoraires BE (€) *
 </label>
 <input
 type="number"
 value={formData.honoraires_be}
 onChange={(e) => updateFormData('honoraires_be', parseFloat(e.target.value) || 0)}
 className={`w-full border rounded-lg px-4 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
 errors.honoraires_be ? 'border-red-500' : 'border-gray-300'
 }`}
 min="0"
 step="0.01"
 />
 {errors.honoraires_be && (
 <p className="text-red-500 text-xs mt-1">{errors.honoraires_be}</p>
 )}
 </div>
 </div>

 <div>
 <label className="block text-sm font-medium text-gray-700 mb-1">
 Taux de marge (%) *
 </label>
 <input
 type="number"
 value={formData.taux_marge}
 onChange={(e) => updateFormData('taux_marge', parseFloat(e.target.value) || 0)}
 className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
 min="0"
 max="100"
 step="0.1"
 />
 </div>

 <div className="bg-green-50 border border-green-200 rounded-lg p-4 space-y-3">
 <h4 className="text-sm font-semibold text-green-900">Résumé financier</h4>
 <div className="grid grid-cols-2 gap-4">
 <div className="bg-white rounded p-3 border border-green-300">
 <p className="text-xs text-green-600 mb-1">Budget total</p>
 <p className="text-xl font-bold text-green-900">
 {formData.budget_total.toLocaleString('fr-FR', {
 style: 'currency',
 currency: 'EUR',
 })}
 </p>
 </div>
 <div className="bg-white rounded p-3 border border-green-300">
 <p className="text-xs text-green-600 mb-1">Honoraires BE</p>
 <p className="text-xl font-bold text-green-900">
 {formData.honoraires_be.toLocaleString('fr-FR', {
 style: 'currency',
 currency: 'EUR',
 })}
 </p>
 </div>
 <div className="bg-white rounded p-3 border border-green-300">
 <p className="text-xs text-green-600 mb-1">Marge prévue</p>
 <p className="text-xl font-bold text-green-900">
 {((formData.honoraires_be * formData.taux_marge) / 100).toLocaleString('fr-FR', {
 style: 'currency',
 currency: 'EUR',
 })}
 </p>
 </div>
 <div className="bg-white rounded p-3 border border-green-300">
 <p className="text-xs text-green-600 mb-1">Coût horaire estimé</p>
 <p className="text-xl font-bold text-green-900">
 {formData.heures_estimees > 0
 ? (formData.honoraires_be / formData.heures_estimees).toLocaleString('fr-FR', {
 style: 'currency',
 currency: 'EUR',
 })
 : '0,00 €'}
 /h
 </p>
 </div>
 </div>
 </div>

 <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
 <h4 className="text-sm font-semibold text-yellow-900 mb-2">
 Récapitulatif du projet
 </h4>
 <div className="space-y-1 text-sm text-yellow-800">
 <p>
 <span className="font-medium">Nom:</span> {formData.nom || 'Non renseigné'}
 </p>
 <p>
 <span className="font-medium">Phase:</span> {formData.phase}
 </p>
 <p>
 <span className="font-medium">Surface:</span> {formData.surface_shon} m² SHON
 </p>
 <p>
 <span className="font-medium">Durée estimée:</span> {formData.delai_global_jours} jours
 </p>
 <p>
 <span className="font-medium">Volume horaire:</span> {formData.heures_estimees} heures
 </p>
 <p>
 <span className="font-medium">Nombre de plans:</span> {formData.nb_plans_estimes}
 </p>
 </div>
 </div>
 </div>
 )}
 </div>

 {/* Boutons de navigation */}
 <div className="px-6 py-4 bg-gray-50 border-t flex items-center justify-between rounded-b-lg">
 <button
 onClick={handlePrevious}
 disabled={currentStep === 1}
 className="px-6 py-2 border border-gray-300 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-100 transition-colors flex items-center gap-2"
 >
 <ArrowLeft className="w-4 h-4" />
 Précédent
 </button>

 <div className="text-sm text-gray-600">
 Étape {currentStep} sur {steps.length}
 </div>

 {currentStep < steps.length ? (
 <button
 onClick={handleNext}
 className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors flex items-center gap-2"
 >
 Suivant
 <ArrowRight className="w-4 h-4" />
 </button>
 ) : (
 <button
 onClick={handleSubmit}
 disabled={createChantierMutation.isPending}
 className="px-6 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors flex items-center gap-2 disabled:opacity-50"
 >
 {createChantierMutation.isPending ? (
 <>
 <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
 Création...
 </>
 ) : (
 <>
 <Check className="w-4 h-4" />
 Créer le chantier
 </>
 )}
 </button>
 )}
 </div>
 </div>
 </div>
 );
};

export default NewChantierForm;