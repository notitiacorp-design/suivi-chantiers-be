import React, { useEffect, useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { HomeIcon, BuildingOfficeIcon, BuildingOffice2Icon, ChartBarIcon, DocumentTextIcon, FolderIcon, BellIcon, ArrowRightOnRectangleIcon, XMarkIcon } from '@heroicons/react/24/outline';

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function Sidebar({ isOpen, onClose }: SidebarProps) {
  const { user, profile, isDirecteur, signOut } = useAuth();
  const navigate = useNavigate();
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    if (!profile?.id) return;

    const fetchUnreadCount = async () => {
      const { count, error } = await supabase
        .from('notifications')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', profile.id)
        .eq('lu', false);

      if (!error && count !== null) {
        setUnreadCount(count);
      }
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
          filter: `user_id=eq.${profile.id}`
        },
        () => {
          fetchUnreadCount();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [profile?.id]);

  const handleSignOut = async () => {
    await signOut();
    navigate('/login');
  };

  const navItems = [
    { to: '/dashboard', icon: HomeIcon, label: 'Tableau de bord', show: true },
    { to: '/mes-chantiers', icon: BuildingOfficeIcon, label: 'Mes Chantiers', show: true },
    { to: '/tous-chantiers', icon: BuildingOffice2Icon, label: 'Tous les Chantiers', show: isDirecteur },
    { to: '/tableau-charge', icon: ChartBarIcon, label: 'Tableau de Charge', show: true },
    { to: '/facturation', icon: DocumentTextIcon, label: 'Facturation', show: isDirecteur },
    { to: '/documents', icon: FolderIcon, label: 'Documents', show: true },
    { to: '/notifications', icon: BellIcon, label: 'Notifications', show: true, badge: unreadCount }
  ];

  const sidebarContent = (
    <div className="flex h-full flex-col bg-[#0f172a]">
      <div className="flex items-center justify-between border-b border-white/10 px-6 py-6">
        <div>
          <h1 className="text-2xl font-bold text-white">BE Pilot</h1>
          <p className="text-sm text-gray-400 mt-1">Suivi de Chantiers</p>
        </div>
        <button
          onClick={onClose}
          className="lg:hidden rounded-lg p-2 text-gray-400 hover:bg-white/10 hover:text-white transition-colors"
          aria-label="Fermer le menu"
        >
          <XMarkIcon className="h-6 w-6" />
        </button>
      </div>

      <nav className="flex-1 space-y-1 px-4 py-6">
        {navItems.map((item) =>
          item.show ? (
            <NavLink
              key={item.to}
              to={item.to}
              onClick={() => onClose()}
              className={({ isActive }) =>
                `flex items-center gap-3 rounded-lg px-4 py-3 text-sm font-medium transition-all ${isActive ? 'bg-white/10 text-white' : 'text-gray-400 hover:bg-white/5 hover:text-white'}`
              }
            >
              {({ isActive }) => (
                <>
                  <item.icon className="h-5 w-5" />
                  <span className="flex-1">{item.label}</span>
                  {item.badge !== undefined && item.badge > 0 && (
                    <span className="flex h-5 min-w-[1.25rem] items-center justify-center rounded-full bg-blue-500 px-2 text-xs font-semibold text-white">
                      {item.badge > 99 ? '99+' : item.badge}
                    </span>
                  )}
                </>
              )}
            </NavLink>
          ) : null
        )}
      </nav>

      <div className="border-t border-white/10 px-4 py-4">
        <div className="mb-3 rounded-lg bg-white/5 px-4 py-3">
          <p className="text-sm font-semibold text-white">
            {profile?.prenom} {profile?.nom}
          </p>
          <p className="text-xs text-gray-400 mt-1">
            <span className="inline-block rounded-md bg-blue-500/20 px-2 py-0.5 text-blue-300 font-medium">
              {profile?.role}
            </span>
          </p>
        </div>
        <button
          onClick={handleSignOut}
          className="flex w-full items-center gap-3 rounded-lg px-4 py-3 text-sm font-medium text-gray-400 transition-all hover:bg-white/5 hover:text-white"
        >
          <ArrowRightOnRectangleIcon className="h-5 w-5" />
          <span>DÃ©connexion</span>
        </button>
      </div>
    </div>
  );

  return (
    <>
      <div className="fixed left-0 top-0 z-40 hidden h-screen w-72 lg:block">
        {sidebarContent}
      </div>

      {isOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50 lg:hidden"
          onClick={onClose}
          aria-hidden="true"
        />
      )}

      <div
        className={`fixed left-0 top-0 z-40 h-screen w-72 transform transition-transform duration-300 ease-in-out lg:hidden ${isOpen ? 'translate-x-0' : '-translate-x-full'}`}
      >
        {sidebarContent}
      </div>
    </>
  );
}