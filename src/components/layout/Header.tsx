import React, { useState, useRef, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { MagnifyingGlassIcon, BellIcon, ChevronRightIcon, UserCircleIcon, ArrowRightOnRectangleIcon, Bars3Icon } from '@heroicons/react/24/outline';
import Badge from '../common/Badge';
import toast from 'react-hot-toast';

interface HeaderProps {
  onMenuClick: () => void;
}

const breadcrumbMapping: Record<string, string> = {
  dashboard: 'Tableau de bord',
  'mes-chantiers': 'Mes Chantiers',
  'tous-chantiers': 'Tous les Chantiers',
  'tableau-charge': 'Tableau de Charge',
  facturation: 'Facturation',
  documents: 'Documents',
  notifications: 'Notifications',
};

const Header: React.FC<HeaderProps> = ({ onMenuClick }) => {
  const { user, profile, signOut, isDirecteur, isChargeAffaires } = useAuth();
  const location = useLocation();
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [searchValue, setSearchValue] = useState('');
  const [notificationCount] = useState(3);
  const userMenuRef = useRef<HTMLDivElement>(null);

  const pathSegments = location.pathname.split('/').filter(Boolean);
  const breadcrumbs = pathSegments.map((segment, index) => {
    const path = '/' + pathSegments.slice(0, index + 1).join('/');
    const label = breadcrumbMapping[segment] || segment.charAt(0).toUpperCase() + segment.slice(1);
    return { path, label, isLast: index === pathSegments.length - 1 };
  });

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (userMenuRef.current && !userMenuRef.current.contains(event.target as Node)) {
        setUserMenuOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSignOut = async () => {
    try {
      await signOut();
      toast.success('Déconnexion réussie');
    } catch (error) {
      toast.error('Erreur lors de la déconnexion');
    }
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchValue.trim()) {
      toast.success(`Recherche : ${searchValue}`);
    }
  };

  const getRoleLabel = () => {
    if (isDirecteur) return 'Directeur';
    if (isChargeAffaires) return 'Chargé d\'Affaires';
    return 'Utilisateur';
  };

  return (
    <header className="sticky top-0 z-40 bg-white border-b border-slate-200 shadow-sm">
      <div className="flex items-center justify-between h-16 px-4 sm:px-6 lg:px-8">
        {/* Left side: Hamburger + Breadcrumb */}
        <div className="flex items-center space-x-4 flex-1 min-w-0">
          <button
            onClick={() => onMenuClick()}
            className="lg:hidden p-2 -ml-2 rounded-lg hover:bg-slate-50 text-slate-600 transition-colors"
            aria-label="Ouvrir le menu"
          >
            <Bars3Icon className="h-6 w-6" />
          </button>

          <nav className="hidden sm:flex items-center space-x-2 text-sm min-w-0" aria-label="Fil d'ariane">
            <Link
              to="/dashboard"
              className="text-slate-600 hover:text-slate-900 transition-colors whitespace-nowrap"
            >
              Accueil
            </Link>
            {breadcrumbs.map((crumb, index) => (
              <React.Fragment key={crumb.path}>
                <ChevronRightIcon className="h-4 w-4 text-slate-400 flex-shrink-0" />
                {crumb.isLast ? (
                  <span className="font-medium text-slate-900 truncate">{crumb.label}</span>
                ) : (
                  <Link
                    to={crumb.path}
                    className="text-slate-600 hover:text-slate-900 transition-colors truncate"
                  >
                    {crumb.label}
                  </Link>
                )}
              </React.Fragment>
            ))}
          </nav>

          <div className="sm:hidden text-sm font-medium text-slate-900 truncate">
            {breadcrumbs.length > 0 ? breadcrumbs[breadcrumbs.length - 1].label : 'Tableau de bord'}
          </div>
        </div>

        {/* Right side: Search + Notifications + User Menu */}
        <div className="flex items-center space-x-3 ml-4">
          {/* Search Bar */}
          <form onSubmit={handleSearch} className="hidden md:block">
            <div className="relative">
              <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" />
              <input
                type="text"
                value={searchValue}
                onChange={(e) => setSearchValue(e.target.value)}
                placeholder="Rechercher un chantier, numéro..."
                className="w-64 pl-10 pr-4 py-2 text-sm bg-slate-100 border-0 rounded-full focus:outline-none focus:ring-2 focus:ring-slate-300 focus:bg-white transition-all placeholder:text-slate-500"
              />
            </div>
          </form>

          {/* Notifications */}
          <Link
            to="/notifications"
            className="relative p-2 rounded-lg hover:bg-slate-50 text-slate-600 transition-colors"
            aria-label="Notifications"
          >
            <BellIcon className="h-6 w-6" />
            {notificationCount > 0 && (
              <span className="absolute top-1 right-1 flex h-5 w-5 items-center justify-center">
                <Badge variant="danger" size="sm">
                  {notificationCount}
                </Badge>
              </span>
            )}
          </Link>

          {/* User Menu */}
          <div className="relative" ref={userMenuRef}>
            <button
              onClick={() => setUserMenuOpen(!userMenuOpen)}
              className="flex items-center space-x-3 p-2 rounded-lg hover:bg-slate-50 transition-colors"
              aria-expanded={userMenuOpen}
              aria-haspopup="true"
            >
              {profile?.avatar_url ? (
                <img
                  src={profile.avatar_url}
                  alt={profile.full_name || 'Avatar'}
                  className="h-8 w-8 rounded-full object-cover ring-2 ring-slate-200"
                />
              ) : (
                <div className="h-8 w-8 rounded-full bg-gradient-to-br from-amber-500 to-amber-600 flex items-center justify-center text-white font-semibold text-sm ring-2 ring-slate-200">
                  {profile?.full_name ? profile.full_name.charAt(0).toUpperCase() : user?.email?.charAt(0).toUpperCase() || 'U'}
                </div>
              )}
              <div className="hidden lg:block text-left">
                <div className="text-sm font-medium text-slate-900">
                  {profile?.full_name || 'Utilisateur'}
                </div>
                <div className="text-xs text-slate-500">{getRoleLabel()}</div>
              </div>
            </button>

            {/* Dropdown Menu */}
            {userMenuOpen && (
              <div className="absolute right-0 mt-2 w-72 bg-white rounded-xl shadow-lg border border-slate-200 py-2 animate-in fade-in slide-in-from-top-2 duration-200">
                <div className="px-4 py-3 border-b border-slate-100">
                  <div className="flex items-center space-x-3">
                    {profile?.avatar_url ? (
                      <img
                        src={profile.avatar_url}
                        alt={profile.full_name || 'Avatar'}
                        className="h-12 w-12 rounded-full object-cover ring-2 ring-slate-200"
                      />
                    ) : (
                      <div className="h-12 w-12 rounded-full bg-gradient-to-br from-amber-500 to-amber-600 flex items-center justify-center text-white font-semibold text-lg ring-2 ring-slate-200">
                        {profile?.full_name ? profile.full_name.charAt(0).toUpperCase() : user?.email?.charAt(0).toUpperCase() || 'U'}
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-slate-900 truncate">
                        {profile?.full_name || 'Utilisateur'}
                      </div>
                      <div className="text-sm text-slate-500 truncate">{user?.email}</div>
                      <div className="mt-1">
                        <Badge variant={isDirecteur ? 'primary' : 'success'} size="sm">
                          {getRoleLabel()}
                        </Badge>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="py-2">
                  <Link
                    to="/profil"
                    className="flex items-center space-x-3 px-4 py-2.5 text-sm text-slate-700 hover:bg-slate-50 transition-colors"
                    onClick={() => setUserMenuOpen(false)}
                  >
                    <UserCircleIcon className="h-5 w-5 text-slate-400" />
                    <span>Mon Profil</span>
                  </Link>
                </div>

                <div className="border-t border-slate-100 pt-2">
                  <button
                    onClick={handleSignOut}
                    className="flex items-center space-x-3 px-4 py-2.5 text-sm text-red-600 hover:bg-red-50 transition-colors w-full text-left"
                  >
                    <ArrowRightOnRectangleIcon className="h-5 w-5" />
                    <span>Se Déconnecter</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
};

export default Header;