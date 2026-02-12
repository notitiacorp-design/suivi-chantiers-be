import React, { useEffect, useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import {
  HomeIcon,
  BuildingOfficeIcon,
  BuildingOffice2Icon,
  ChartBarIcon,
  DocumentTextIcon,
  FolderIcon,
  BellIcon,
  ArrowRightOnRectangleIcon,
  XMarkIcon,
} from '@heroicons/react/24/outline';

interface SidebarProps {
  mobileOpen: boolean;
  setMobileOpen: (open: boolean) => void;
}

const Sidebar: React.FC<SidebarProps> = ({ mobileOpen, setMobileOpen }) => {
  const { profile, isDirecteur, signOut } = useAuth();
  const navigate = useNavigate();
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    const fetchUnreadCount = async () => {
      if (!profile) return;
      
      const { count } = await supabase
        .from('notifications')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', profile.id)
        .eq('lu', false);
      
      setUnreadCount(count || 0);
    };

    fetchUnreadCount();

    const channel = supabase
      .channel('notifications-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${profile?.id}`,
        },
        () => {
          fetchUnreadCount();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [profile]);

  const navigationItems = [
    { name: 'Tableau de bord', to: '/', icon: HomeIcon, show: true },
    { name: 'Mes chantiers', to: '/mes-chantiers', icon: BuildingOfficeIcon, show: true },
    { name: 'Tous les chantiers', to: '/chantiers', icon: BuildingOffice2Icon, show: isDirecteur },
    { name: 'Tableau de charge', to: '/tableau-charge', icon: ChartBarIcon, show: true },
    { name: 'Facturation', to: '/facturation', icon: DocumentTextIcon, show: true },
    { name: 'Documents', to: '/documents', icon: FolderIcon, show: true },
    { name: 'Notifications', to: '/notifications', icon: BellIcon, show: true, badge: unreadCount },
    { name: 'Dashboard Financier', to: '/dashboard-financier', icon: ChartBarIcon, show: isDirecteur },
  ];

  const handleSignOut = async () => {
    await signOut();
    navigate('/login');
  };

  const sidebarContent = (
    <div className="flex h-full flex-col bg-gray-900">
      <div className="flex h-16 items-center justify-between px-4">
        <h1 className="text-xl font-bold text-white">Suivi Chantiers BE</h1>
        {mobileOpen && (
          <button
            onClick={() => setMobileOpen(false)}
            className="text-gray-400 hover:text-white lg:hidden"
          >
            <XMarkIcon className="h-6 w-6" />
          </button>
        )}
      </div>

      <nav className="flex-1 space-y-1 px-2 py-4">
        {navigationItems
          .filter((item) => item.show)
          .map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              onClick={() => setMobileOpen(false)}
              className={({ isActive }) =>
                `group flex items-center px-3 py-2 text-sm font-medium rounded-md ${
                  isActive
                    ? 'bg-gray-800 text-white'
                    : 'text-gray-300 hover:bg-gray-700 hover:text-white'
                }`
              }
            >
              <item.icon className="mr-3 h-6 w-6 flex-shrink-0" />
              <span className="flex-1">{item.name}</span>
              {item.badge !== undefined && item.badge > 0 && (
                <span className="ml-auto inline-flex items-center justify-center rounded-full bg-red-600 px-2 py-1 text-xs font-bold text-white">
                  {item.badge}
                </span>
              )}
            </NavLink>
          ))}
      </nav>

      <div className="border-t border-gray-700 p-4">
        <div className="mb-3 text-sm text-gray-400">
          <p className="font-medium text-white">
            {profile?.prenom} {profile?.nom}
          </p>
          <p className="text-xs">{profile?.role}</p>
        </div>
        <button
          onClick={handleSignOut}
          className="flex w-full items-center rounded-md px-3 py-2 text-sm font-medium text-gray-300 hover:bg-gray-700 hover:text-white"
        >
          <ArrowRightOnRectangleIcon className="mr-3 h-6 w-6" />
          DÃ©connexion
        </button>
      </div>
    </div>
  );

  return (
    <>
      {mobileOpen && (
        <div
          className="fixed inset-0 z-40 bg-gray-600 bg-opacity-75 lg:hidden"
          onClick={() => setMobileOpen(false)}
        />
      )}

      <div
        className={`fixed inset-y-0 left-0 z-50 w-72 transform transition-transform duration-300 ease-in-out lg:translate-x-0 ${
          mobileOpen ? 'translate-x-0' : '-translate-x-full'
        } lg:static lg:z-auto`}
      >
        {sidebarContent}
      </div>
    </>
  );
};

export default Sidebar;