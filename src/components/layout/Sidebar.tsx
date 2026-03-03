import React, { useEffect, useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import {
  LayoutDashboard,
  Building2,
  Building,
  BarChart3,
  TrendingUp,
  ShoppingCart,
  FileText,
  FolderOpen,
  Bell,
  LogOut,
  X,
  DollarSign,
  Microscope,
  CalendarCheck,
} from 'lucide-react';

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

interface NavItem {
  to: string;
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  show: boolean;
  badge?: number;
}

interface NavSection {
  title: string;
  items: NavItem[];
}

export default function Sidebar({ isOpen, onClose }: SidebarProps) {
  const { profile, isDirecteur, signOut } = useAuth();
  const navigate = useNavigate();
  const [unreadCount, setUnreadCount] = useState(0);
  const displayName = profile?.full_name || [profile?.prenom, profile?.nom].filter(Boolean).join(' ') || 'Utilisateur';

  useEffect(() => {
    if (!profile?.id) return;

    const fetchUnreadCount = async () => {
      const { count, error } = await supabase
        .from('notifications')
        .select('id', { count: 'exact', head: true })
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
          filter: `user_id=eq.${profile.id}`,
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

  const navSections: NavSection[] = [
    {
      title: '',
      items: [{ to: '/', icon: LayoutDashboard, label: 'Tableau de bord', show: true }],
    },
    {
      title: 'CHANTIERS',
      items: [
        { to: '/mes-chantiers', icon: Building2, label: 'Mes Chantiers', show: true },
        { to: '/tous-chantiers', icon: Building, label: 'Tous les Chantiers', show: true },
      ],
    },
    {
      title: 'DIRECTION',
      items: [
        { to: '/tableau-charge', icon: BarChart3, label: 'Tableau de Charge', show: true },
        { to: '/dashboard-financier', icon: DollarSign, label: 'Dashboard Financier', show: true },
        { to: '/pipeline-commercial', icon: TrendingUp, label: 'Pipeline Commercial', show: isDirecteur },
      ],
    },
    {
      title: "BUREAU D'ÉTUDES",
      items: [
        { to: '/etudes-techniques', icon: Microscope, label: 'Études techniques', show: true },
        { to: '/rapports-hebdo', icon: CalendarCheck, label: 'Rapports hebdo', show: true },
      ],
    },
    {
      title: 'GESTION',
      items: [
        { to: '/achats', icon: ShoppingCart, label: 'Gestion Achats', show: true },
        { to: '/facturation', icon: FileText, label: 'Facturation', show: true },
        { to: '/documents', icon: FolderOpen, label: 'Documents', show: true },
      ],
    },
    {
      title: 'SYSTEME',
      items: [{ to: '/notifications', icon: Bell, label: 'Notifications', show: true, badge: unreadCount }],
    },
  ];

  const SidebarContent = ({ mobile = false }: { mobile?: boolean }) => (
    <>
      <div className="p-6 border-b border-stone-800 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="bg-blue-600 p-2 rounded">
            <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21h-6.173a2.285 2.285 0 01-.607-1.317l-.008-.083a5.5 5.5 0 00-4.459-5.445l-.083-.008a2.285 2.285 0 01-1.317-.607L12 18h-6a2 2 0 01-2-2v-6a2 2 0 012-2h6.173z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 13l4-4m4 0l4 4M7 13l-4 4m0 0l4 4" />
            </svg>
          </div>
          <div>
            <h1 className="text-xl loading font-bold text-white">BE Pilot</h1>
            <p className="text-stone-400 text-sm">Suivi de chantiers</p>
          </div>
        </div>
        {mobile && (
          <button onClick={onClose} className="text-stone-300 hover:text-white" aria-label="Fermer le menu">
            <X className="w-5 h-5" />
          </button>
        )}
      </div>

      <nav className="flex-1 px-4 py-6 overflow-y-auto">
        {navSections.map((section) => (
          <div key={section.title} className="mb-6">
            {section.title && <h3 className="text-xs font-semibold text-stone-400 uppercase tracking-wider mb-3">{section.title}</h3>}
            <ul className="space-y-1">
              {section.items.map((item) =>
                item.show ? (
                  <li key={item.label}>
                    <NavLink
                      to={item.to}
                      onClick={mobile ? onClose : undefined}
                      className={({ isActive }) =>
                        `flex items-center px-3 py-2 rounded transition-colors duration-200 ${
                          isActive ? 'bg-blue-600 text-white' : 'text-stone-300 hover:text-white hover:bg-stone-800'
                        }`
                      }
                    >
                      <item.icon className="w-5 h-5 mr-3" />
                      <span className="font-medium">{item.label}</span>
                    </NavLink>
                  </li>
                ) : null
              )}
            </ul>
          </div>
        ))}
      </nav>

      <div className="p-4 border-t border-stone-800">
        <div className="flex items-center mb-3">
          <div className="w-8 h-8 rounded-full bg-blue-500 flex items-center justify-center">
            <span className="text-sm font-medium text-white">{profile?.prenom?.slice(0, 1)}{profile?.nom?.slice(0, 1)}</span>
          </div>
          <div className="ml-3">
            <p className="text-sm font-medium text-white">{displayName}</p>
            <p className="text-xs text-stone-400">{isDirecteur ? 'Directeur' : "Chargé d'affaires"}</p>
          </div>
        </div>
        <button onClick={handleSignOut} className="flex items-center w-full px-4 py-2 text-stone-300 hover:text-white hover:bg-stone-800 rounded transition-colors duration-200">
          <LogOut className="w-5 h-5 mr-2" />
          <span>Déconnexion</span>
        </button>
      </div>
    </>
  );

  return (
    <>
      <aside className="hidden lg:flex lg:fixed lg:inset-y-0 lg:left-0 lg:z-30 w-64 min-h-screen bg-stone-900 border-r border-stone-800 flex-col">
        <SidebarContent />
      </aside>

      {isOpen && (
        <div className="lg:hidden fixed inset-0 z-40 flex">
          <button className="absolute inset-0 bg-black/50" onClick={onClose} aria-label="Fermer le menu" />
          <aside className="relative w-64 h-full bg-stone-900 border-r border-stone-800 flex flex-col">
            <SidebarContent mobile />
          </aside>
        </div>
      )}
    </>
  );
}
