import { supabase } from './supabase';

export interface NotificationPayload {
 userId: string;
 title: string;
 message: string;
 type: 'retard' | 'score_critique' | 'facture_echue' | 'avenant' | 'info';
 metadata?: Record<string, any>;
}

export async function sendNotification(payload: NotificationPayload) {
 try {
 // Insérer dans la table notifications
 const { data, error } = await supabase
 .from('notifications')
 .insert({
 user_id: payload.userId,
 titre: payload.title,
 message: payload.message,
 type: payload.type,
 metadata: payload.metadata || {},
 lu: false,
 created_at: new Date().toISOString()
 })
 .select()
 .single();

 if (error) throw error;

 // Appeler l'Edge Function pour envoyer l'email
 await supabase.functions.invoke('send-notification-email', {
 body: {
 userId: payload.userId,
 title: payload.title,
 message: payload.message,
 type: payload.type
 }
 });

 return { success: true, data };
 } catch (error) {
 console.error('Erreur envoi notification:', error);
 return { success: false, error };
 }
}

export async function notifyRetard(chantierId: string, tacheNom: string, joursRetard: number) {
 try {
 // Récupérer le chantier et le chef de chantier
 const { data: chantier, error: chantierError } = await supabase
 .from('chantiers')
 .select('nom, chef_chantier_id')
 .eq('id', chantierId)
 .single();

 if (chantierError) throw chantierError;

 // Récupérer le directeur général
 const { data: users, error: usersError } = await supabase
 .from('profiles')
 .select('id, role')
 .in('role', ['directeur', 'chef_chantier']);

 if (usersError) throw usersError;

 const recipients = users.filter(
 u => u.role === 'directeur' || u.id === chantier.chef_chantier_id
 );

 // Envoyer notification à chaque destinataire
 for (const recipient of recipients) {
 await sendNotification({
 userId: recipient.id,
 title: `⚠️ Retard détecté: ${chantier.nom}`,
 message: `La tâche "${tacheNom}" accuse un retard de ${joursRetard} jour(s).`,
 type: 'retard',
 metadata: {
 chantier_id: chantierId,
 tache_nom: tacheNom,
 jours_retard: joursRetard
 }
 });
 }

 return { success: true };
 } catch (error) {
 console.error('Erreur notifyRetard:', error);
 return { success: false, error };
 }
}

export async function notifyScoreCritique(chantierId: string, score: number) {
 try {
 const { data: chantier, error: chantierError } = await supabase
 .from('chantiers')
 .select('nom, chef_chantier_id')
 .eq('id', chantierId)
 .single();

 if (chantierError) throw chantierError;

 const { data: directeurs, error: directeursError } = await supabase
 .from('profiles')
 .select('id')
 .eq('role', 'directeur');

 if (directeursError) throw directeursError;

 const recipients = [
 ...directeurs.map(d => d.id),
 chantier.chef_chantier_id
 ].filter(Boolean);

 for (const recipientId of recipients) {
 await sendNotification({
 userId: recipientId,
 title: `🚨 Score santé critique: ${chantier.nom}`,
 message: `Le score santé du chantier est tombé à ${score}/100. Action immédiate requise.`,
 type: 'score_critique',
 metadata: {
 chantier_id: chantierId,
 score
 }
 });
 }

 return { success: true };
 } catch (error) {
 console.error('Erreur notifyScoreCritique:', error);
 return { success: false, error };
 }
}

export async function notifyFactureEchue(factureId: string) {
 try {
 const { data: facture, error: factureError } = await supabase
 .from('factures')
 .select(`
 id,
 numero,
 montant_ht,
 date_echeance,
 chantier:chantiers(
 id,
 nom,
 chef_chantier_id
 )
 `)
 .eq('id', factureId)
 .single();

 if (factureError) throw factureError;

 const { data: directeurs, error: directeursError } = await supabase
 .from('profiles')
 .select('id')
 .eq('role', 'directeur');

 if (directeursError) throw directeursError;

 const recipients = directeurs.map(d => d.id);

 const montantFormate = new Intl.NumberFormat('fr-FR', {
 style: 'currency',
 currency: 'EUR'
 }).format(facture.montant_ht);

 for (const recipientId of recipients) {
 await sendNotification({
 userId: recipientId,
 title: `💰 Facture échue: ${facture.numero}`,
 message: `La facture ${facture.numero} (${montantFormate}) du chantier "${facture.chantier.nom}" est échue depuis le ${new Date(facture.date_echeance).toLocaleDateString('fr-FR')}.`,
 type: 'facture_echue',
 metadata: {
 facture_id: factureId,
 chantier_id: facture.chantier.id,
 montant: facture.montant_ht
 }
 });
 }

 return { success: true };
 } catch (error) {
 console.error('Erreur notifyFactureEchue:', error);
 return { success: false, error };
 }
}

export async function notifyNouvelAvenant(avenantId: string) {
 try {
 const { data: avenant, error: avenantError } = await supabase
 .from('avenants')
 .select(`
 id,
 numero,
 montant_supplementaire,
 chantier:chantiers(
 id,
 nom,
 chef_chantier_id
 )
 `)
 .eq('id', avenantId)
 .single();

 if (avenantError) throw avenantError;

 const { data: directeurs, error: directeursError } = await supabase
 .from('profiles')
 .select('id')
 .eq('role', 'directeur');

 if (directeursError) throw directeursError;

 const recipients = [
 ...directeurs.map(d => d.id),
 avenant.chantier.chef_chantier_id
 ].filter(Boolean);

 const montantFormate = new Intl.NumberFormat('fr-FR', {
 style: 'currency',
 currency: 'EUR'
 }).format(avenant.montant_supplementaire);

 for (const recipientId of recipients) {
 await sendNotification({
 userId: recipientId,
 title: `📝 Nouvel avenant: ${avenant.numero}`,
 message: `L'avenant ${avenant.numero} (${montantFormate}) a été créé pour le chantier "${avenant.chantier.nom}".`,
 type: 'avenant',
 metadata: {
 avenant_id: avenantId,
 chantier_id: avenant.chantier.id,
 montant: avenant.montant_supplementaire
 }
 });
 }

 return { success: true };
 } catch (error) {
 console.error('Erreur notifyNouvelAvenant:', error);
 return { success: false, error };
 }
}

export async function markNotificationAsRead(notificationId: string) {
 try {
 const { error } = await supabase
 .from('notifications')
 .update({ lu: true, date_lecture: new Date().toISOString() })
 .eq('id', notificationId);

 if (error) throw error;
 return { success: true };
 } catch (error) {
 console.error('Erreur markNotificationAsRead:', error);
 return { success: false, error };
 }
}

export async function getUserNotifications(userId: string, limit = 50) {
 try {
 const { data, error } = await supabase
 .from('notifications')
 .select('*')
 .eq('user_id', userId)
 .order('created_at', { ascending: false })
 .limit(limit);

 if (error) throw error;
 return { success: true, data };
 } catch (error) {
 console.error('Erreur getUserNotifications:', error);
 return { success: false, error, data: [] };
 }
}

export async function getUnreadNotificationsCount(userId: string) {
 try {
 const { count, error } = await supabase
 .from('notifications')
 .select('*', { count: 'exact', head: true })
 .eq('user_id', userId)
 .eq('lu', false);

 if (error) throw error;
 return { success: true, count: count || 0 };
 } catch (error) {
 console.error('Erreur getUnreadNotificationsCount:', error);
 return { success: false, count: 0 };
 }
}