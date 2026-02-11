import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuthStore } from '../../stores/authStore';
import {
  HomeIcon,
  BuildingOffice2Icon,
  RectangleStackIcon,
  CalendarDaysIcon,
  BanknotesIcon,
  DocumentTextIcon,
  BellIcon,
  XMarkIcon,
  Bars3Icon,
} from '@heroicons/react/24/outline';
import Badge from '../common/Badge';

interface SidebarProps {
  mobileOpen: boolean;
  setMobileOpen: (open: boolean) => void;
}

const Sidebar: React.FC<SidebarProps> = ({ mobileOpen, setMobileOpen }) => {
  const location = useLocation();
  const { user } = useAuthStore();
  const [unreadNotifications, setUnreadNotifications] = useState(3); // TODO: Charger depuis Supabase

  const navigation = [
    { name: 'Tableau de bord', href: '/dashboard', icon: HomeIcon, roles: ['charge_affaires', 'directeur'] },
    { name: 'Mes Chantiers', href: '/mes-chantiers', icon: BuildingOffice2Icon, roles: ['charge_affaires', 'directeur'] },
    { name: 'Tous les Chantiers', href: '/tous-chantiers', icon: RectangleStackIcon, roles: ['directeur'] },
    { name: 'Tableau de Charge', href: '/tableau-charge', icon: CalendarDaysIcon, roles: ['charge_affaires', 'directeur'] },
    { name: 'Facturation', href: '/facturation', icon: BanknotesIcon, roles: ['charge_affaires', 'directeur'] },
    { name: 'Documents', href: '/documents', icon: DocumentTextIcon, roles: ['charge_affaires', 'directeur'] },
    { name: 'Notifications', href: '/notifications', icon: BellIcon, roles: ['charge_affaires', 'directeur'], badge: unreadNotifications },
  ];

  const filteredNavigation = navigation.filter((item) =>
    item.roles.includes(user?.role || '')
  );

  const SidebarContent = () => (
    <div className="flex flex-col h-full bg-slate-900 text-white">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-5 border-b border-slate-800">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 bg-blue-600 rounded-lg flex items-center justify-center font-bold text-xl">
            BE
          </div>
          <span className="text-xl font-semibold">Suivi BE</span>
        </div>
        {mobileOpen && (
          <button
            onClick={() => setMobileOpen(false)}
            className="lg:hidden text-slate-400 hover:text-white transition-colors"
          >
            <XMarkIcon className="w-6 h-6" />
          </button>
        )}
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-4 py-6 space-y-1 overflow-y-auto">
        {filteredNavigation.map((item) => {
          const isActive = location.pathname === item.href;
          const Icon = item.icon;
          return (
            <Link
              key={item.name}
              to={item.href}
              onClick={() => setMobileOpen(false)}
              className={`
                flex items-center justify-between px-4 py-3 rounded-lg text-sm font-medium transition-all duration-200
                ${isActive
                  ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/50'
                  : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                }
              `}
            >
              <div className="flex items-center space-x-3">
                <Icon className="w-5 h-5" />
                <span>{item.name}</span>
              </div>
              {item.badge && item.badge > 0 && (
                <Badge variant="error" size="sm">
                  {item.badge}
                </Badge>
              )}
            </Link>
          );
        })}
      </nav>

      {/* User Profile */}
      <div className="px-4 py-4 border-t border-slate-800">
        <div className="flex items-center space-x-3 px-4 py-3 rounded-lg bg-slate-800">
          <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center font-semibold text-sm">
            {user?.nom?.charAt(0)}{user?.prenom?.charAt(0)}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-white truncate">
              {user?.prenom} {user?.nom}
            </p>
            <p className="text-xs text-slate-400 truncate">
              {user?.role === 'directeur' ? 'Directeur' : "Chef d'Atelier"}
            </p>
          </div>
          <Badge variant={user?.role === 'directeur' ? 'success' : 'primary'} size="sm">
            {user?.role === 'directeur' ? 'DIR' : 'CA'}
          </Badge>
        </div>
      </div>
    </div>
  );

  return (
    <>
      {/* Sidebar Desktop */}
      <div className="hidden lg:flex lg:flex-col lg:w-72 lg:fixed lg:inset-y-0 lg:z-50">
        <SidebarContent />
      </div>

      {/* Sidebar Mobile - Overlay */}
      {mobileOpen && (
        <div className="lg:hidden fixed inset-0 z-50 flex">
          {/* Backdrop */}
          <div
            className="fixed inset-0 bg-black/50 backdrop-blur-sm transition-opacity"
            onClick={() => setMobileOpen(false)}
          />
          {/* Drawer */}
          <div className="relative flex flex-col w-80 max-w-full animate-slide-in-left">
            <SidebarContent />
          </div>
        </div>
      )}
    </>
  );
};

export default Sidebar;