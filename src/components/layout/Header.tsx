import React, { useState, useRef, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuthStore } from '../../stores/authStore';
import { supabase } from '../../lib/supabase';
import {
  MagnifyingGlassIcon,
  BellIcon,
  ChevronRightIcon,
  UserCircleIcon,
  ArrowRightOnRectangleIcon,
  Bars3Icon,
} from '@heroicons/react/24/outline';
import Badge from '../common/Badge';
import toast from 'react-hot-toast';

interface HeaderProps {
  setMobileOpen: (open: boolean) => void;
}

const Header: React.FC<HeaderProps> = ({ setMobileOpen }) => {
  const location = useLocation();
  const { user, setSession, setUser } = useAuthStore();
  const [searchQuery, setSearchQuery] = useState('');
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [notificationCount, setNotificationCount] = useState(3); // TODO: Charger depuis Supabase
  const userMenuRef = useRef<HTMLDivElement>(null);

  // Fermer le menu au clic extérieur
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (userMenuRef.current && !userMenuRef.current.contains(event.target as Node)) {
        setUserMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Génération du breadcrumb
  const getBreadcrumbs = () => {
    const paths = location.pathname.split('/').filter(Boolean);
    const breadcrumbMap: Record<string, string> = {
      dashboard: 'Tableau de bord',
      'mes-chantiers': 'Mes Chantiers',
      'tous-chantiers': 'Tous les Chantiers',
      'tableau-charge': 'Tableau de Charge',
      facturation: 'Facturation',
      documents: 'Documents',
      notifications: 'Notifications',
    };

    return paths.map((path, index) => ({
      name: breadcrumbMap[path] || path,
      href: '/' + paths.slice(0, index + 1).join('/'),
      current: index === paths.length - 1,
    }));
  };

  const breadcrumbs = getBreadcrumbs();

  const handleLogout = async () => {
    try {
      await supabase.auth.signOut();
      setSession(null);
      setUser(null);
      toast.success('Déconnexion réussie');
    } catch (error) {
      console.error('Erreur déconnexion:', error);
      toast.error('Erreur lors de la déconnexion');
    }
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      toast.success(`Recherche: ${searchQuery}`);
      // TODO: Implémenter la recherche globale
    }
  };

  return (
    <header className="bg-white border-b border-slate-200 sticky top-0 z-40">
      <div className="flex items-center justify-between px-4 py-4 lg:px-8">
        {/* Left - Hamburger + Breadcrumb */}
        <div className="flex items-center space-x-4 flex-1">
          <button
            onClick={() => setMobileOpen(true)}
            className="lg:hidden text-slate-600 hover:text-slate-900 transition-colors"
          >
            <Bars3Icon className="w-6 h-6" />
          </button>

          <nav className="hidden md:flex items-center space-x-2 text-sm">
            {breadcrumbs.map((breadcrumb, index) => (
              <div key={breadcrumb.href} className="flex items-center space-x-2">
                {index > 0 && <ChevronRightIcon className="w-4 h-4 text-slate-400" />}
                <Link
                  to={breadcrumb.href}
                  className={`
                    transition-colors
                    ${breadcrumb.current
                      ? 'text-blue-600 font-semibold'
                      : 'text-slate-600 hover:text-slate-900'
                    }
                  `}
                >
                  {breadcrumb.name}
                </Link>
              </div>
            ))}
          </nav>
        </div>

        {/* Center - Search Bar */}
        <div className="hidden lg:flex flex-1 max-w-md mx-8">
          <form onSubmit={handleSearch} className="w-full">
            <div className="relative">
              <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Rechercher un chantier, document..."
                className="w-full pl-10 pr-4 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
              />
            </div>
          </form>
        </div>

        {/* Right - Notifications + User Menu */}
        <div className="flex items-center space-x-4">
          {/* Notifications */}
          <Link
            to="/notifications"
            className="relative p-2 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-all"
          >
            <BellIcon className="w-6 h-6" />
            {notificationCount > 0 && (
              <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-xs font-bold rounded-full flex items-center justify-center">
                {notificationCount > 9 ? '9+' : notificationCount}
              </span>
            )}
          </Link>

          {/* User Menu */}
          <div className="relative" ref={userMenuRef}>
            <button
              onClick={() => setUserMenuOpen(!userMenuOpen)}
              className="flex items-center space-x-3 p-2 rounded-lg hover:bg-slate-100 transition-all"
            >
              <div className="w-9 h-9 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center text-white font-semibold text-sm">
                {user?.nom?.charAt(0)}{user?.prenom?.charAt(0)}
              </div>
              <div className="hidden md:block text-left">
                <p className="text-sm font-medium text-slate-900">
                  {user?.prenom} {user?.nom}
                </p>
                <p className="text-xs text-slate-500">
                  {user?.role === 'directeur' ? 'Directeur' : "Chef d'Atelier"}
                </p>
              </div>
            </button>

            {/* Dropdown */}
            {userMenuOpen && (
              <div className="absolute right-0 mt-2 w-56 bg-white rounded-lg shadow-xl border border-slate-200 py-2 animate-fade-in">
                <div className="px-4 py-3 border-b border-slate-200">
                  <p className="text-sm font-medium text-slate-900">
                    {user?.prenom} {user?.nom}
                  </p>
                  <p className="text-xs text-slate-500 truncate">{user?.email}</p>
                </div>
                <Link
                  to="/profil"
                  onClick={() => setUserMenuOpen(false)}
                  className="flex items-center space-x-3 px-4 py-2 text-sm text-slate-700 hover:bg-slate-50 transition-colors"
                >
                  <UserCircleIcon className="w-5 h-5" />
                  <span>Mon profil</span>
                </Link>
                <button
                  onClick={handleLogout}
                  className="w-full flex items-center space-x-3 px-4 py-2 text-sm text-red-600 hover:bg-red-50 transition-colors"
                >
                  <ArrowRightOnRectangleIcon className="w-5 h-5" />
                  <span>Se déconnecter</span>
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
};

export default Header;