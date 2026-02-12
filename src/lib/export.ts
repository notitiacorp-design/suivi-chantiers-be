import * as XLSX from 'xlsx';
import { jsPDF } from 'jspdf';
import 'jspdf-autotable';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { calculStatistiquesChantier } from './calculations';

/**
 * Exporte des donn\u00e9es vers Excel
 */
export function exportToExcel(data: any[], filename: string, sheetName: string = 'Donn\u00e9es') {
 try {
 // Cr\u00e9er un workbook
 const wb = XLSX.utils.book_new();

 // Convertir les donn\u00e9es en worksheet
 const ws = XLSX.utils.json_to_sheet(data);

 // Ajuster la largeur des colonnes
 const colWidths = Object.keys(data[0] || {}).map(key => ({
 wch: Math.max(key.length, 15)
 }));
 ws['!cols'] = colWidths;

 // Ajouter le worksheet au workbook
 XLSX.utils.book_append_sheet(wb, ws, sheetName);

 // G\u00e9n\u00e9rer le fichier
 XLSX.writeFile(wb, `${filename}.xlsx`);

 return { success: true };
 } catch (error) {
 console.error('Erreur export Excel:', error);
 return { success: false, error };
 }
}

/**
 * Exporte un chantier complet vers Excel avec plusieurs onglets
 */
export function exportChantierToExcel(chantierData: {
 chantier: any;
 taches: any[];
 factures: any[];
 avenants: any[];
 documents: any[];
}) {
 try {
 const wb = XLSX.utils.book_new();

 // Onglet 1: Informations g\u00e9n\u00e9rales
 const infoGenerales = [{
 'Nom du chantier': chantierData.chantier.nom,
 'R\u00e9f\u00e9rence': chantierData.chantier.reference,
 'Client': chantierData.chantier.client_nom,
 'Date d\u00e9but': format(new Date(chantierData.chantier.date_debut), 'dd/MM/yyyy'),
 'Date fin pr\u00e9vue': format(new Date(chantierData.chantier.date_fin_prevue), 'dd/MM/yyyy'),
 'Budget initial (\u20ac)': chantierData.chantier.budget_initial,
 'Montant factur\u00e9 (\u20ac)': chantierData.chantier.montant_facture,
 'Avancement (%)': chantierData.chantier.pourcentage_avancement,
 'Statut': chantierData.chantier.statut
 }];
 const wsInfo = XLSX.utils.json_to_sheet(infoGenerales);
 XLSX.utils.book_append_sheet(wb, wsInfo, 'Informations');

 // Onglet 2: T\u00e2ches
 const tachesExport = chantierData.taches.map(t => ({
 'Nom': t.nom,
 'Statut': t.statut,
 'D\u00e9but pr\u00e9vu': format(new Date(t.date_debut_prevue), 'dd/MM/yyyy'),
 'Fin pr\u00e9vue': format(new Date(t.date_fin_prevue), 'dd/MM/yyyy'),
 'D\u00e9but r\u00e9el': t.date_debut_reelle ? format(new Date(t.date_debut_reelle), 'dd/MM/yyyy') : '-',
 'Fin r\u00e9elle': t.date_fin_reelle ? format(new Date(t.date_fin_reelle), 'dd/MM/yyyy') : '-',
 'Completion (%)': t.pourcentage_completion,
 'Responsable': t.responsable_nom || '-'
 }));
 const wsTaches = XLSX.utils.json_to_sheet(tachesExport);
 XLSX.utils.book_append_sheet(wb, wsTaches, 'T\u00e2ches');

 // Onglet 3: Factures
 const facturesExport = chantierData.factures.map(f => ({
 'Num\u00e9ro': f.numero,
 'Date \u00e9mission': format(new Date(f.date_emission), 'dd/MM/yyyy'),
 'Date \u00e9ch\u00e9ance': format(new Date(f.date_echeance), 'dd/MM/yyyy'),
 'Montant HT (\u20ac)': f.montant_ht,
 'Montant TTC (\u20ac)': f.montant_ttc,
 'Statut': f.statut,
 'Date paiement': f.date_paiement ? format(new Date(f.date_paiement), 'dd/MM/yyyy') : '-'
 }));
 const wsFactures = XLSX.utils.json_to_sheet(facturesExport);
 XLSX.utils.book_append_sheet(wb, wsFactures, 'Factures');

 // Onglet 4: Avenants
 const avenantsExport = chantierData.avenants.map(a => ({
 'Num\u00e9ro': a.numero,
 'Date': format(new Date(a.date_avenant), 'dd/MM/yyyy'),
 'Montant (\u20ac)': a.montant_supplementaire,
 'D\u00e9lai suppl\u00e9mentaire (j)': a.delai_supplementaire_jours,
 'Statut': a.statut,
 'Description': a.description
 }));
 const wsAvenants = XLSX.utils.json_to_sheet(avenantsExport);
 XLSX.utils.book_append_sheet(wb, wsAvenants, 'Avenants');

 // G\u00e9n\u00e9rer le fichier
 const filename = `chantier_${chantierData.chantier.reference}_${format(new Date(), 'yyyyMMdd')}`;
 XLSX.writeFile(wb, `${filename}.xlsx`);

 return { success: true, filename };
 } catch (error) {
 console.error('Erreur export chantier Excel:', error);
 return { success: false, error };
 }
}

/**
 * Exporte un chantier vers PDF
 */
export function exportToPDF(chantierData: {
 chantier: any;
 taches: any[];
 factures: any[];
 statistiques: any;
}) {
 try {
 const doc = new jsPDF();
 let yPos = 20;

 // En-t\u00eate
 doc.setFontSize(20);
 doc.setFont('helvetica', 'bold');
 doc.text('RAPPORT DE CHANTIER', 105, yPos, { align: 'center' });
 yPos += 15;

 // Informations g\u00e9n\u00e9rales
 doc.setFontSize(12);
 doc.setFont('helvetica', 'bold');
 doc.text('Informations g\u00e9n\u00e9rales', 20, yPos);
 yPos += 8;

 doc.setFontSize(10);
 doc.setFont('helvetica', 'normal');
 const infos = [
 `Nom: ${chantierData.chantier.nom}`,
 `R\u00e9f\u00e9rence: ${chantierData.chantier.reference}`,
 `Client: ${chantierData.chantier.client_nom}`,
 `Date d\u00e9but: ${format(new Date(chantierData.chantier.date_debut), 'dd/MM/yyyy', { locale: fr })}`,
 `Date fin pr\u00e9vue: ${format(new Date(chantierData.chantier.date_fin_prevue), 'dd/MM/yyyy', { locale: fr })}`,
 `Budget initial: ${new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(chantierData.chantier.budget_initial)}`,
 `Montant factur\u00e9: ${new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(chantierData.chantier.montant_facture)}`,
 `Avancement: ${chantierData.chantier.pourcentage_avancement}%`,
 `Score sant\u00e9: ${chantierData.statistiques.score}/100 (${chantierData.statistiques.label})`
 ];

 infos.forEach(info => {
 doc.text(info, 20, yPos);
 yPos += 6;
 });

 yPos += 10;

 // Statistiques
 doc.setFontSize(12);
 doc.setFont('helvetica', 'bold');
 doc.text('Statistiques', 20, yPos);
 yPos += 8;

 doc.setFontSize(10);
 doc.setFont('helvetica', 'normal');
 const stats = [
 `T\u00e2ches termin\u00e9es: ${chantierData.statistiques.taches.terminees}/${chantierData.statistiques.taches.total}`,
 `T\u00e2ches en retard: ${chantierData.statistiques.taches.enRetard}`,
 `Taux de compl\u00e9tion: ${chantierData.statistiques.taches.tauxCompletion.toFixed(1)}%`,
 `Temps \u00e9coul\u00e9: ${chantierData.statistiques.planning.tempsEcoule} jours / ${chantierData.statistiques.planning.dureeTotal} jours`,
 `\u00c9cart avancement/temps: ${chantierData.statistiques.planning.ecartAvancement.toFixed(1)}%`,
 `Taux facturation: ${chantierData.statistiques.budget.tauxFacturation.toFixed(1)}%`
 ];

 stats.forEach(stat => {
 doc.text(stat, 20, yPos);
 yPos += 6;
 });

 yPos += 10;

 // Tableau des t\u00e2ches
 if (yPos > 250) {
 doc.addPage();
 yPos = 20;
 }

 doc.setFontSize(12);
 doc.setFont('helvetica', 'bold');
 doc.text('T\u00e2ches', 20, yPos);
 yPos += 5;

 const tachesRows = chantierData.taches.slice(0, 20).map(t => [
 t.nom.substring(0, 30),
 t.statut,
 format(new Date(t.date_debut_prevue), 'dd/MM/yy'),
 format(new Date(t.date_fin_prevue), 'dd/MM/yy'),
 `${t.pourcentage_completion}%`
 ]);

 (doc as any).autoTable({
 startY: yPos,
 head: [['Nom', 'Statut', 'D\u00e9but', 'Fin', '%']],
 body: tachesRows,
 styles: { fontSize: 8 },
 headStyles: { fillColor: [59, 130, 246] },
 margin: { left: 20, right: 20 }
 });

 yPos = (doc as any).lastAutoTable.finalY + 10;

 // Tableau des factures
 if (yPos > 230) {
 doc.addPage();
 yPos = 20;
 }

 doc.setFontSize(12);
 doc.setFont('helvetica', 'bold');
 doc.text('Factures', 20, yPos);
 yPos += 5;

 const facturesRows = chantierData.factures.map(f => [
 f.numero,
 format(new Date(f.date_emission), 'dd/MM/yy'),
 new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(f.montant_ttc),
 f.statut
 ]);

 (doc as any).autoTable({
 startY: yPos,
 head: [['Num\u00e9ro', 'Date', 'Montant TTC', 'Statut']],
 body: facturesRows,
 styles: { fontSize: 8 },
 headStyles: { fillColor: [59, 130, 246] },
 margin: { left: 20, right: 20 }
 });

 // Pied de page
 const pageCount = (doc as any).internal.getNumberOfPages();
 for (let i = 1; i <= pageCount; i++) {
 doc.setPage(i);
 doc.setFontSize(8);
 doc.setFont('helvetica', 'normal');
 doc.text(
 `Page ${i} / ${pageCount} - G\u00e9n\u00e9r\u00e9 le ${format(new Date(), 'dd/MM/yyyy \u00e0 HH:mm', { locale: fr })}`,
 105,
 290,
 { align: 'center' }
 );
 }

 // Sauvegarder
 const filename = `chantier_${chantierData.chantier.reference}_${format(new Date(), 'yyyyMMdd')}.pdf`;
 doc.save(filename);

 return { success: true, filename };
 } catch (error) {
 console.error('Erreur export PDF:', error);
 return { success: false, error };
 }
}

/**
 * G\u00e9n\u00e8re un rapport complet d'un chantier
 */
export async function generateReport(chantier: any, taches: any[], factures: any[], avenants: any[]) {
 try {
 // Calculer les statistiques
 const statistiques = calculStatistiquesChantier(chantier, taches);

 // Pr\u00e9parer les donn\u00e9es
 const reportData = {
 chantier,
 taches,
 factures,
 avenants,
 statistiques,
 documents: [],
 dateGeneration: new Date().toISOString()
 };

 return { success: true, data: reportData };
 } catch (error) {
 console.error('Erreur g\u00e9n\u00e9ration rapport:', error);
 return { success: false, error };
 }
}

/**
 * Exporte le tableau de bord global vers Excel
 */
export function exportDashboardToExcel(chantiers: any[], statistiquesGlobales: any) {
 try {
 const wb = XLSX.utils.book_new();

 // Onglet 1: Vue d'ensemble
 const vueEnsemble = [{
 'Total chantiers': statistiquesGlobales.totalChantiers,
 'Chantiers actifs': statistiquesGlobales.chantiersActifs,
 'Chantiers en retard': statistiquesGlobales.chantiersEnRetard,
 'Budget total (\u20ac)': statistiquesGlobales.budgetTotal,
 'Montant factur\u00e9 (\u20ac)': statistiquesGlobales.montantFacture,
 'Taux facturation (%)': statistiquesGlobales.tauxFacturation,
 'Score sant\u00e9 moyen': statistiquesGlobales.scoreMoyen
 }];
 const wsVue = XLSX.utils.json_to_sheet(vueEnsemble);
 XLSX.utils.book_append_sheet(wb, wsVue, 'Vue d\'ensemble');

 // Onglet 2: Liste des chantiers
 const chantiersExport = chantiers.map(c => ({
 'R\u00e9f\u00e9rence': c.reference,
 'Nom': c.nom,
 'Client': c.client_nom,
 'Chef de chantier': c.chef_chantier_nom,
 'Date d\u00e9but': format(new Date(c.date_debut), 'dd/MM/yyyy'),
 'Date fin': format(new Date(c.date_fin_prevue), 'dd/MM/yyyy'),
 'Budget (\u20ac)': c.budget_initial,
 'Factur\u00e9 (\u20ac)': c.montant_facture,
 'Avancement (%)': c.pourcentage_avancement,
 'Score sant\u00e9': c.score_sante || '-',
 'Statut': c.statut
 }));
 const wsChantiers = XLSX.utils.json_to_sheet(chantiersExport);
 XLSX.utils.book_append_sheet(wb, wsChantiers, 'Chantiers');

 // Onglet 3: Alertes
 const alertesChantiers = chantiers.filter(c => {
 const score = c.score_sante || 100;
 return score < 60 || c.statut === 'en_retard';
 }).map(c => ({
 'R\u00e9f\u00e9rence': c.reference,
 'Nom': c.nom,
 'Score sant\u00e9': c.score_sante || '-',
 'Statut': c.statut,
 'Alerte': c.score_sante < 40 ? 'CRITIQUE' : c.score_sante < 60 ? 'ATTENTION' : 'RETARD'
 }));
 const wsAlertes = XLSX.utils.json_to_sheet(alertesChantiers);
 XLSX.utils.book_append_sheet(wb, wsAlertes, 'Alertes');

 // G\u00e9n\u00e9rer le fichier
 const filename = `dashboard_${format(new Date(), 'yyyyMMdd_HHmmss')}`;
 XLSX.writeFile(wb, `${filename}.xlsx`);

 return { success: true, filename };
 } catch (error) {
 console.error('Erreur export dashboard:', error);
 return { success: false, error };
 }
}