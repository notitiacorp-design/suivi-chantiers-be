import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { useAuthStore } from '../../stores/authStore';
import toast from 'react-hot-toast';
import { EnvelopeIcon, LockClosedIcon, ArrowRightIcon } from '@heroicons/react/24/outline';

const LoginPage: React.FC = () => {
  const navigate = useNavigate();
  const { setSession, setUser } = useAuthStore();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<{ email?: string; password?: string; general?: string }>({});

  const validateForm = () => {
    const newErrors: typeof errors = {};

    if (!email.trim()) {
      newErrors.email = "Lemail est requis";
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      newErrors.email = "Email invalide";
    }

    if (!password) {
      newErrors.password = 'Le mot de passe est requis';
    } else if (password.length < 6) {
      newErrors.password = 'Le mot de passe doit contenir au moins 6 caract√®res';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;

    setLoading(true);
    setErrors({});

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      });

      if (error) {
        throw error;
      }

      if (data.session && data.user) {
        // Mettre √† jour le store avec la session
        setSession(data.session);
        
        // Cr√©er un utilisateur minimal √† partir des donn√©es auth
        // NE PAS faire de requ√™te suppÈmentaire sur users/profiles
        const minimalUser = {
          id: data.user.id,
          email: data.user.email || '',
          nom: data.user.user_metadata?.nom || data.user.email?.split('@')[0] || 'Utilisateur',
          prenom: data.user.user_metadata?.prenom || '',
          role: data.user.user_metadata?.role || 'directeur',
          actif: true,
          created_at: data.user.created_at || new Date().toISOString(),
        };
        
        setUser(minimalUser as any);
        
        toast.success('Connexion r√©ussie !');
        navigate('/dashboard');
      } else {
        throw new Error('Session non cr√©ee');
      }
    } catch (error: any) {
      console.error('Login error:', error);
      if (error.message === 'Invalid login credentials') {
        setErrors({ general: 'Email ou mot de passe incorrect' });
      } else {
        setErrors({ general: error.message || 'Erreur de connexion' });
      }
    } finally {
      // TOUJOURS d√©sactiver le loading
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-50 to-gray-100 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y8 bg-white p-8 rounded-2xl shadow-xl">
        {/* Logo et titre */}
        <div className="text-center">
          <div className="mx-auto h-16 w-16 bg-gradient-to-br from-cyan-500 to-blue-600 rounded-xl flex items-center justify-center mb-4">
            <svg className="h-10 w-10 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
            </svg>
          </div>
          <h2 className="text-3xl font-bold text-gray-900">
            Suivi Chantiers BE
          </h2>
          <p className="mt-2 text-sm text-gray-600">
            Connectez-vous √† votre espace
          </p>
        </div>

        {/* Formulaire */}
        <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
          {errors.general &&(
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
              {errors.general}
            </div>
          ))}

          <div className="space-y-4">
            {/* Email */}
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
                Adresse email
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <EnvelopeIcon className="h-5 w-5 text-gray-400" />
                </div>
                <input
                  id="email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className={`appearance-none block w-full pl-10 pr-3 py-3 border ${ 
                    errors.email ? 'border-red-300' : 'border-gray-300'
                  } rounded-lg placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-transparent transition-all`}
                  placeholder="votre@email.com"
                />
              </div>
              {errors.email &&(
                <p className="mt-1 text-sm text-red-600">{errors.email}</p>
              )}
            </div>

            {/* Mot de passe */}
            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1">
                Mot de passe
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <LockClosedIcon className="h-5 w-5 text-gray-400" />
                </div>
                <input
                  id="password"
                  name="password"
                  type="password"
                  autoComplete="current-password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className={`appearance-none block w-full pl-10 pr-3 py-3 border ${ 
                    errors.password ? 'border-red-300' : 'border-gray-300'
                  } rounded-lg placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-transparent transition-all`}
                  placeholder="‚Ä¶‚Ä¶‚Ä¶‚Ä¶‚Ä¶‚Ä¶‚Ä¶‚Ä¶"Û‡¢¬ˆFóc‡¢∂W'&˜'2Á77v˜&BbbÄ¢«6∆74Ê÷S“&◊B”FWáB◊6“FWáB◊&VB”c#Á∂W'&˜'2Á77v˜&G”¬˜‡¢ó–¢¬ˆFóc‡¢¬ˆFóc‡†¢≤Ú¢&˜WFˆ‚FR6ˆÊÊWÜñˆ‚¢˜–¢∆'WGFˆ‡¢GóS“'7V&÷óB ¢Fó6&∆VC◊∂∆ˆFñÊw–¢6∆74Ê÷S“&w&˜W&V∆FófRr÷gV∆¬f∆WÇßW7Fñgí÷6VÁFW"í”2Ç”B&˜&FW"&˜&FW"◊G&Á7&VÁBFWáB◊6“fˆÁB÷÷VFóV“&˜VÊFVB÷∆rFWáB◊vÜóFR&r÷w&FñVÁB◊FÚ◊"g&ˆ“÷7ñ‚”SFÚ÷&«VR”cÜ˜fW#¶g&ˆ“÷7ñ‚”cÜ˜fW#ßFÚ÷&«VR”sfˆ7W3¶˜WF∆ñÊR÷ÊˆÊRfˆ7W3ß&ñÊr”"fˆ7W3ß&ñÊr÷ˆfg6WB”"fˆ7W3ß&ñÊr÷7ñ‚”SFó6&∆VC¶˜6óGí”SFó6&∆VC¶7W'6˜"÷Ê˜B÷∆∆˜vVBG&Á6óFñˆ‚÷∆¬6ÜF˜r÷∆rÜ˜fW#ß6ÜF˜r◊Ü∆ ¢‡¢∂∆ˆFñÊrÚÑ¢«7‚6∆74Ê÷S“&f∆WÇóFV◊2÷6VÁFW"#‡¢«7fr6∆74Ê÷S“&Êñ÷FR◊7ñ‚÷÷¬”◊"”2Ç”Rr”RFWáB◊vÜóFR"Ü÷∆Á3“&áGG¢Ú˜wwrÁs2Ê˜&rÛ#˜7fr"fñ∆√“&ÊˆÊR"fñWt&˜É“##B#B#‡¢∆6ó&6∆R6∆74Ê÷S“&˜6óGí”#R"7É“#""7ì“#""#“#"7G&ˆ∂S“&7W'&VÁD6ˆ∆˜""7G&ˆ∂UvñGFÉ“#B#„¬ˆ6ó&6∆S‡¢«FÇ6∆74Ê÷S“&˜6óGí”sR"fñ∆√“&7W'&VÁD6ˆ∆˜""C“$”B&ÇÇÇ”Öc3R„3s2R„3s2&ÉG¶”"R„#ìr„ìc"r„ìc"B$É32„C"„3RR„É#B2r„ì3Ü√2”"„cCw¢#„¬˜FÉ‡¢¬˜7fs‡¢6ˆÊÊWÜñˆ‚V‚6˜W'2‚‚‡¢¬˜7„‡¢í¢Ä¢«7‚6∆74Ê÷S“&f∆WÇóFV◊2÷6VÁFW"#‡¢6R6ˆÊÊV7FW ¢ƒ'&˜u&ñváDñ6ˆ‚6∆74Ê÷S“&÷¬”"Ç”Rr”Rw&˜W÷Ü˜fW#ßG&Á6∆FR◊Ç”G&Á6óFñˆ‚◊G&Á6f˜&“"Û‡¢¬˜7„‡¢ó–¢¬ˆ'WGFˆ„‡†¢≤Ú¢∆ñV‚÷˜BFR76R˜V&ÃYH
ãﬂBà]à€\‹”ò[YOHù^XŸ[ù\àèÇà[ö¬àœHãŸõ‹ô€›\\‹›€‹ôÇà€\‹”ò[YOHù^\€H^XﬁX[ãMå›ô\éù^cyan-500 font-medium"
            >
              Mot de passe oublie ?
            </Link>
          </div>
        </form>
      </div>
    </div>
  );
};

