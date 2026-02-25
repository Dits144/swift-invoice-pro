import { Link, useLocation, useNavigate } from 'react-router-dom';
import { LayoutDashboard, Building2, FileText, Crown, Settings, LogOut, Shield, Menu, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/lib/auth';
import { useState } from 'react';

const navItems = [
  { to: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/institutions', icon: Building2, label: 'Instansi' },
  { to: '/invoices', icon: FileText, label: 'Invoice' },
  { to: '/upgrade', icon: Crown, label: 'Upgrade' },
];

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { pathname } = useLocation();
  const { user, profile, isAdmin, signOut, isPremium } = useAuth();
  const navigate = useNavigate();
  const [mobileOpen, setMobileOpen] = useState(false);

  const handleSignOut = async () => {
    await signOut();
    navigate('/');
  };

  return (
    <div className="flex min-h-screen">
      {/* Sidebar Desktop */}
      <aside className="hidden w-64 flex-col border-r gradient-sidebar lg:flex">
        <div className="flex h-16 items-center gap-2 border-b border-sidebar-border px-6">
          <img src="/images/logo.png" alt="Logo" className="h-8 w-8" />
          <span className="font-bold text-sidebar-foreground">DitsGenInvoice</span>
        </div>
        <nav className="flex-1 space-y-1 p-4">
          {navItems.map((item) => {
            const active = pathname === item.to || pathname.startsWith(item.to + '/');
            return (
              <Link key={item.to} to={item.to}
                className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors ${
                  active ? 'bg-sidebar-accent text-sidebar-primary' : 'text-sidebar-foreground hover:bg-sidebar-accent/50'
                }`}>
                <item.icon className="h-4 w-4" />
                {item.label}
                {item.to === '/upgrade' && isPremium && (
                  <span className="ml-auto text-xs rounded bg-accent px-1.5 py-0.5 text-accent-foreground">Aktif</span>
                )}
              </Link>
            );
          })}
          {isAdmin && (
            <Link to="/admin"
              className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors ${
                pathname.startsWith('/admin') ? 'bg-sidebar-accent text-sidebar-primary' : 'text-sidebar-foreground hover:bg-sidebar-accent/50'
              }`}>
              <Shield className="h-4 w-4" /> Admin
            </Link>
          )}
        </nav>
        <div className="border-t border-sidebar-border p-4">
          <div className="mb-3 truncate text-xs text-sidebar-foreground/60">{user?.email}</div>
          <div className="mb-3 flex items-center gap-2">
            <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-semibold ${isPremium ? 'bg-accent text-accent-foreground' : 'bg-secondary text-secondary-foreground'}`}>
              {isPremium ? 'Premium' : 'Free'}
            </span>
            {!isPremium && profile && (
              <span className="text-xs text-sidebar-foreground/60">{profile.invoice_quota_used}/3 invoice</span>
            )}
          </div>
          <Button variant="ghost" size="sm" className="w-full justify-start gap-2 text-sidebar-foreground hover:bg-sidebar-accent" onClick={handleSignOut}>
            <LogOut className="h-4 w-4" /> Keluar
          </Button>
        </div>
      </aside>

      {/* Mobile Header */}
      <div className="flex flex-1 flex-col">
        <header className="flex h-16 items-center justify-between border-b bg-card px-4 lg:hidden">
          <div className="flex items-center gap-2">
            <img src="/images/logo.png" alt="Logo" className="h-8 w-8" />
            <span className="font-bold text-gradient">DitsGenInvoice</span>
          </div>
          <Button variant="ghost" size="icon" onClick={() => setMobileOpen(!mobileOpen)}>
            {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </Button>
        </header>

        {/* Mobile Nav */}
        {mobileOpen && (
          <div className="border-b bg-card p-4 lg:hidden">
            <nav className="space-y-1">
              {navItems.map((item) => {
                const active = pathname === item.to;
                return (
                  <Link key={item.to} to={item.to} onClick={() => setMobileOpen(false)}
                    className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium ${active ? 'bg-primary/10 text-primary' : 'text-foreground'}`}>
                    <item.icon className="h-4 w-4" /> {item.label}
                  </Link>
                );
              })}
              {isAdmin && (
                <Link to="/admin" onClick={() => setMobileOpen(false)}
                  className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-foreground">
                  <Shield className="h-4 w-4" /> Admin
                </Link>
              )}
              <button onClick={handleSignOut} className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-destructive">
                <LogOut className="h-4 w-4" /> Keluar
              </button>
            </nav>
          </div>
        )}

        <main className="flex-1 overflow-auto bg-background p-4 md:p-6 lg:p-8">
          {children}
        </main>
      </div>
    </div>
  );
}
