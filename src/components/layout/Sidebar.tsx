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
  ClipboardList,
  ShoppingCart,
  FileText,
  FolderOpen,
  Bell,
  LogOut,
  X,
  DollarSign,
  ChevronRight,
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

  const navSections: NavSection[] = [
    {
      title: 'G\u00e9n\u00e9ral',
      items: [
        { to: '/dashboard', icon: LayoutDashboard, label: 'Tableau de bord', show: true },
      ],
    },
    {
      title: 'Chantiers',
      items: [
        { to: '/mes-chantiers', icon: Building, label: 'Mes Chantiers', show: true },
        { to: '/tous-chantiers', icon: Building2, label: 'Tous les Chantiers', show: true },
        { to: '/journal-chantier', icon: ClipboardList, label: 'Journal de Chantier', show: true },
      ],
    },
    {
      title: 'Direction',
      items: [
        { to: '/tableau-charge', icon: BarChart3, label: 'Tableau de Charge', show: isDirecteur },
        { to: '/dashboard-financier', icon: DollarSign, label: 'Dashboard Financier', show: isDirecteur },
        { to: '/pipeline', icon: TrendingUp, label: 'Pipeline Commercial', show: true },
      ],
    },
    {
        title: "Bureau d'Ã©tudes",
        items: [
          { to: '/etudes-techniques', icon: Microscope, label: 'Ãtudes techniques', show: true },
          { to: '/rapports-hebdo', icon: CalendarCheck, label: 'Rapports hebdo', show: true },
        ],
      },
      {
      title: 'Gestion',
      items: [
        { to: '/achats', icon: ShoppingCart, label: 'Gestion Achats', show: true },
        { to: '/facturation', icon: FileText, label: 'Facturation', show: true },
        { to: '/documents', icon: FolderOpen, label: 'Documents', show: true },
      ],
    },
    {
      title: 'Syst\u00e8me',
      items: [
        { to: '/notifications', icon: Bell, label: 'Notifications', show: true, badge: unreadCount },
      ],
    },
  ];

  const linkClasses = ({ isActive }: { isActive: boolean }) =>
    `flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 ${
      isActive
        ? 'bg-white/20 text-white shadow-sm'
        : 'text-blue-100 hover:bg-white/10 hover:text-white'
    }`;

  return (
    <>
      {/* Overlay mobile */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={onClose}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed top-0 left-0 h-screen w-64 bg-[#1e3a5f] z-50 transform transition-transform duration-300 ease-in-out ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        } lg:translate-x-0 flex flex-col`}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-5 border-b border-white/10">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-white/20 rounded-lg flex items-center justify-center">
              <Building2 className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-lg font-bold text-white tracking-tight">BE Pilot</h1>
              <p className="text-xs text-blue-200/60">Suivi de chantiers</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="lg:hidden text-blue-200 hover:text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-1">
          {navSections.map((section) => {
            const visibleItems = section.items.filter((item) => item.show);
            if (visibleItems.length === 0) return null;

            return (
              <div key={section.title} className="mb-4">
                <p className="text-xs uppercase tracking-wider text-blue-300/50 font-semibold px-4 mb-2 mt-3">
                  {section.title}
                </p>
                {visibleItems.map((item) => (
                  <NavLink
                    key={item.to}
                    to={item.to}
                    className={linkClasses}
                    onClick={onClose}
                  >
                    <item.icon className="w-5 h-5 flex-shrink-0" />
                    <span className="flex-1">{item.label}</span>
                    {item.badge && item.badge > 0 ? (
                      <span className="bg-red-500 text-white text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center">
                        {item.badge > 9 ? '9+' : item.badge}
                      </span>
                    ) : null}
                  </NavLink>
                ))}
              </div>
            );
          })}
        </nav>

        {/* User info + Logout */}
        <div className="border-t border-white/10 px-4 py-4">
          {profile && (
            <div className="flex items-center gap-3 mb-3">
              <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center text-white text-sm font-bold">
                {profile.prenom?.[0]}{profile.nom?.[0]}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-white truncate">
                  {profile.prenom} {profile.nom}
                </p>
                <p className="text-xs text-blue-200/60 truncate capitalize">
                  {profile.role}
                </p>
              </div>
            </div>
          )}
          <button
            onClick={handleSignOut}
            className="flex items-center gap-3 w-full px-4 py-2.5 text-sm text-blue-100 hover:bg-white/10 hover:text-white rounded-lg transition-colors"
          >
            <LogOut className="w-5 h-5" />
            <span>D\u00e9connexion</span>
          </button>
        </div>
      </aside>
    </>
  );
}
