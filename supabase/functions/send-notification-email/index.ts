// Edge Function Deno pour Supabase
// Placer ce fichier dans: supabase/functions/send-notification-email/index.ts

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.38.4';

const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY') || '';
const SUPABASE_URL = Deno.env.get('SUPABASE_URL') || '';
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';

interface NotificationRequest {
 userId: string;
 title: string;
 message: string;
 type: 'retard' | 'score_critique' | 'facture_echue' | 'avenant' | 'info';
}

function getEmailTemplate(title: string, message: string, type: string): string {
 const colors = {
 retard: '#f59e0b',
 score_critique: '#ef4444',
 facture_echue: '#8b5cf6',
 avenant: '#3b82f6',
 info: '#6b7280'
 };

 const icons = {
 retard: '⚠️',
 score_critique: '🚨',
 facture_echue: '💰',
 avenant: '📝',
 info: 'ℹ️'
 };

 const color = colors[type as keyof typeof colors] || colors.info;
 const icon = icons[type as keyof typeof icons] || icons.info;

 return `
<!DOCTYPE html>
<html lang="fr">
<head>
 <meta charset="UTF-8">
 <meta name="viewport" content="width=device-width, initial-scale=1.0">
 <title>${title}</title>
 <style>
 body {
 font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
 line-height: 1.6;
 color: #333;
 margin: 0;
 padding: 0;
 background-color: #f5f5f5;
 }
 .container {
 max-width: 600px;
 margin: 20px auto;
 background-color: #ffffff;
 border-radius: 8px;
 overflow: hidden;
 box-shadow: 0 2px 8px rgba(0,0,0,0.1);
 }
 .header {
 background-color: ${color};
 color: white;
 padding: 30px 20px;
 text-align: center;
 }
 .header h1 {
 margin: 0;
 font-size: 24px;
 font-weight: 600;
 }
 .icon {
 font-size: 48px;
 margin-bottom: 10px;
 }
 .content {
 padding: 30px 20px;
 }
 .message {
 background-color: #f9fafb;
 border-left: 4px solid ${color};
 padding: 15px 20px;
 margin: 20px 0;
 border-radius: 4px;
 }
 .button {
 display: inline-block;
 background-color: ${color};
 color: white;
 padding: 12px 30px;
 text-decoration: none;
 border-radius: 6px;
 margin: 20px 0;
 font-weight: 500;
 }
 .footer {
 background-color: #f9fafb;
 padding: 20px;
 text-align: center;
 font-size: 12px;
 color: #6b7280;
 border-top: 1px solid #e5e7eb;
 }
 </style>
</head>
<body>
 <div class="container">
 <div class="header">
 <div class="icon">${icon}</div>
 <h1>${title}</h1>
 </div>
 <div class="content">
 <p>Bonjour,</p>
 <div class="message">
 <p style="margin: 0; font-size: 16px;">${message}</p>
 </div>
 <p>Connectez-vous à votre tableau de bord pour plus de détails.</p>
 <center>
 <a href="${Deno.env.get('APP_URL') || 'https://votre-app.vercel.app'}" class="button">
 Accéder au tableau de bord
 </a>
 </center>
 </div>
 <div class="footer">
 <p>Ceci est un email automatique, merci de ne pas y répondre.</p>
 <p>© 2024 Suivi de Chantiers BE - Tous droits réservés</p>
 </div>
 </div>
</body>
</html>
 `;
}

serve(async (req: Request) => {
 // CORS headers
 if (req.method === 'OPTIONS') {
 return new Response('ok', {
 headers: {
 'Access-Control-Allow-Origin': '*',
 'Access-Control-Allow-Methods': 'POST, OPTIONS',
 'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
 }
 });
 }

 try {
 // Parse request body
 const { userId, title, message, type }: NotificationRequest = await req.json();

 // Initialize Supabase client
 const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

 // Get user email
 const { data: profile, error: profileError } = await supabase
 .from('profiles')
 .select('email, prenom, nom')
 .eq('id', userId)
 .single();

 if (profileError) {
 throw new Error(`Erreur récupération profil: ${profileError.message}`);
 }

 if (!profile || !profile.email) {
 throw new Error('Email utilisateur introuvable');
 }

 // Send email using Resend
 const emailHtml = getEmailTemplate(title, message, type);

 const resendResponse = await fetch('https://api.resend.com/emails', {
 method: 'POST',
 headers: {
 'Authorization': `Bearer ${RESEND_API_KEY}`,
 'Content-Type': 'application/json',
 },
 body: JSON.stringify({
 from: 'Suivi de Chantiers <notifications@votredomaine.com>',
 to: [profile.email],
 subject: title,
 html: emailHtml,
 }),
 });

 if (!resendResponse.ok) {
 const errorData = await resendResponse.text();
 throw new Error(`Erreur Resend: ${errorData}`);
 }

 const resendData = await resendResponse.json();

 // Log email sent
 console.log(`Email envoyé à ${profile.email} (${profile.prenom} ${profile.nom})`);

 return new Response(
 JSON.stringify({
 success: true,
 message: 'Email envoyé avec succès',
 emailId: resendData.id,
 recipient: profile.email
 }),
 {
 headers: {
 'Content-Type': 'application/json',
 'Access-Control-Allow-Origin': '*',
 },
 status: 200,
 }
 );
 } catch (error) {
 console.error('Erreur dans send-notification-email:', error);

 return new Response(
 JSON.stringify({
 success: false,
 error: error instanceof Error ? error.message : 'Erreur inconnue',
 }),
 {
 headers: {
 'Content-Type': 'application/json',
 'Access-Control-Allow-Origin': '*',
 },
 status: 500,
 }
 );
 }
});