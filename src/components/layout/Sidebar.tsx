import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { cn } from '@/lib/utils';
import {
  LayoutDashboard,
  Plus,
  ClipboardList,
  LogOut,
  Users,
  DollarSign
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import logoWhite from '@/assets/rr_logo_white.webp';

const Sidebar = () => {
  const { user, logout, isAdmin } = useAuth();
  const location = useLocation();

  const navItems = [
    { path: '/', label: 'Dashboard', icon: LayoutDashboard },
    { path: '/add-kpi', label: 'Add KPI Entry', icon: Plus },
    { path: '/history', label: 'View History', icon: ClipboardList },
    { path: '/job-costs', label: 'Job Costs', icon: DollarSign, adminOnly: true },
  ];

  return (
    <aside className="w-64 h-screen sticky top-0 gradient-sidebar flex flex-col shrink-0">
      {/* Logo */}
      <div className="p-6 border-b border-sidebar-border">
        <Link to="/" className="flex items-center gap-3">
          <img
            src={logoWhite}
            alt="Rent and Recruit"
            className="h-10 w-auto"
          />
          <div className="flex flex-col">
            <span className="text-2xl uppercase tracking-wider font-bold bg-clip-text text-transparent bg-gradient-to-r from-white to-gray-400">
              Hub
            </span>
          </div>
        </Link>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-4 space-y-1">
        {navItems.map((item) => {
          if (item.adminOnly && !isAdmin) return null;
          const isActive = location.pathname === item.path;
          return (
            <Link
              key={item.path}
              to={item.path}
              className={cn(
                'flex items-center gap-3 px-4 py-3 rounded-lg transition-all duration-200',
                isActive
                  ? 'bg-sidebar-primary text-sidebar-primary-foreground font-semibold shadow-lg'
                  : 'text-sidebar-foreground/80 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground'
              )}
            >
              <item.icon className="h-5 w-5" />
              <span>{item.label}</span>
            </Link>
          );
        })}
      </nav>

      {/* User & Logout */}
      <div className="p-4 border-t border-sidebar-border">
        <div className="flex items-center gap-3 px-4 py-2 mb-3">
          <div className="h-10 w-10 rounded-full bg-sidebar-primary flex items-center justify-center text-sidebar-primary-foreground font-semibold">
            {user?.name.charAt(0)}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sidebar-foreground font-medium truncate">
              {user?.name}
            </p>
            <p className="text-sidebar-foreground/60 text-sm capitalize">
              {user?.role}
            </p>
          </div>
        </div>
        <Button
          variant="ghost"
          className="w-full justify-start gap-3 text-sidebar-foreground/80 hover:text-sidebar-foreground hover:bg-sidebar-accent"
          onClick={logout}
        >
          <LogOut className="h-5 w-5" />
          Sign Out
        </Button>
      </div>
    </aside>
  );
};

export default Sidebar;
