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
      newErrors.email = "L'email est requis";
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      newErrors.email = "Email invalide";
    }

    if (!password) {
      newErrors.password = 'Le mot de passe est requis';
    } else if (password.length < 6) {
      newErrors.password = 'Le mot de passe doit contenir au moins 6 caract\u00e8res';
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

      if (error) throw error;

      if (data.session) {
        setSession(data.session);

        try {
          const { data: userData, error: userError } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', data.user.id)
            .single();

          if (!userError && userData) {
            setUser({
              id: data.user.id,
              email: data.user.email || '',
              full_name: userData.full_name || '',
              role: userData.role || 'ingenieur',
              avatar_url: userData.avatar_url,
            });
          } else {
            setUser({
              id: data.user.id,
              email: data.user.email || '',
              full_name: data.user.email || '',
              role: 'charge_affaires',
              avatar_url: null,
            });
          }
        } catch (profileError) {
          console.warn('Profile fetch failed:', profileError);
          setUser({
            id: data.user.id,
            email: data.user.email || '',
            full_name: data.user.email || '',
            role: 'charge_affaires',
            avatar_url: null,
          });
        }

        toast.success('Connexion r\u00e9ussie !');
        navigate('/dashboard');
      }
    } catch (error: any) {
      console.error('Login error:', error);
      if (error.message === 'Invalid login credentials') {
        setErrors({ general: 'Email ou mot de passe incorrect' });
      } else {
        setErrors({ general: error.message || 'Erreur de connexion' });
      }
      toast.error('\u00c9chec de la connexion');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 via-white to-blue-50 px-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-blue-600 rounded-2xl mb-4 shadow-lg">
            <span className="text-white text-2xl font-bold">BE</span>
          </div>
          <h1 className="text-2xl font-bold text-slate-900">Suivi Chantiers BE</h1>
          <p className="text-slate-500 mt-2">{'Connectez-vous \u00e0 votre espace'}</p>
        </div>

        <div className="bg-white rounded-2xl shadow-xl border border-slate-200 p-8">
          <form onSubmit={handleSubmit} className="space-y-5">
            {errors.general && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
                {errors.general}
              </div>
            )}

            <div>
              <label htmlFor="email" className="block text-sm font-medium text-slate-700 mb-1.5">
                Adresse email
              </label>
              <div className="relative">
                <EnvelopeIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                <input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="votre@email.fr"
                  className={`w-full pl-10 pr-4 py-2.5 rounded-lg border ${
                    errors.email ? 'border-red-300 focus:ring-red-500' : 'border-slate-300 focus:ring-blue-500'
                  } focus:outline-none focus:ring-2 focus:border-transparent text-sm transition`}
                  autoComplete="email"
                  autoFocus
                />
              </div>
              {errors.email && (
                <p className="mt-1 text-xs text-red-600">{errors.email}</p>
              )}
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium text-slate-700 mb-1.5">
                Mot de passe
              </label>
              <div className="relative">
                <LockClosedIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                <input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="........"
                  className={`w-full pl-10 pr-4 py-2.5 rounded-lg border ${
                    errors.password ? 'border-red-300 focus:ring-red-500' : 'border-slate-300 focus:ring-blue-500'
                  } focus:outline-none focus:ring-2 focus:border-transparent text-sm transition`}
                  autoComplete="current-password"
                />
              </div>
              {errors.password && (
                <p className="mt-1 text-xs text-red-600">{errors.password}</p>
              )}
            </div>

            <div className="flex justify-end">
              <Link
                to="/forgot-password"
                className="text-sm text-blue-600 hover:text-blue-800 transition"
              >
                {'Mot de passe oubli\u00e9 ?'}
              </Link>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white font-medium py-2.5 px-4 rounded-lg transition duration-200 flex items-center justify-center gap-2 shadow-sm"
            >
              {loading ? (
                <>
                  <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  <span>Connexion en cours...</span>
                </>
              ) : (
                <>
                  <span>Se connecter</span>
                  <ArrowRightIcon className="w-5 h-5" />
                </>
              )}
            </button>
          </form>
        </div>

        <p className="text-center text-xs text-slate-400 mt-6">
          {'\u00a9 2024 Notitia Corp \u2014 Bureau d\u0027\u00e9tudes'}
        </p>
      </div>
    </div>
  );
};

export default LoginPage;
