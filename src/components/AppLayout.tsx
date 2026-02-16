import { Outlet, Link, useLocation, useNavigate } from "react-router-dom";
import {
  Shield, Search, Baby, LayoutDashboard, Bell, Users, Heart,
  Sun, Moon, Globe, LogOut, Menu, X, Siren,
} from "lucide-react";
import EmergencySOSButton from "@/components/EmergencySOSButton";
import ChatbotAlert from "@/components/ChatbotAlert";
import NotificationBell from "@/components/NotificationBell";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { useTheme } from "@/contexts/ThemeContext";
import { useLanguage } from "@/i18n/LanguageContext";
import LanguageSwitcher from "@/components/LanguageSwitcher";

const AppLayout = () => {
  const { profile, signOut } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const { t } = useLanguage();
  const location = useLocation();
  const navigate = useNavigate();
  const [mobileOpen, setMobileOpen] = useState(false);

  const navItems = [
    { path: "/app", icon: LayoutDashboard, label: t("nav.dashboard") },
    { path: "/app/scanner", icon: Search, label: t("nav.scanner") },
    { path: "/app/child-safety", icon: Baby, label: t("nav.childSafety") },
    { path: "/app/alerts", icon: Bell, label: t("nav.alerts") },
    { path: "/app/family", icon: Users, label: t("nav.family") },
    { path: "/app/women-safety", icon: Heart, label: t("nav.womenSafety") },
    { path: "/app/emergency", icon: Siren, label: t("nav.emergency" as any), highlight: true },
  ];

  const isActive = (path: string) => location.pathname === path;

  const handleSignOut = async () => {
    await signOut();
    navigate("/");
  };

  return (
    <div className="flex min-h-screen bg-background">
      {/* Desktop Sidebar */}
      <aside className="hidden w-64 flex-shrink-0 border-r border-sidebar-border bg-sidebar md:flex md:flex-col">
        <div className="flex h-16 items-center gap-2 border-b border-sidebar-border px-6">
          <Shield className="h-7 w-7 text-sidebar-primary" />
          <span className="text-lg font-bold text-sidebar-foreground">CyberShield</span>
        </div>
        <nav className="flex-1 space-y-1 p-3">
          {navItems.map((item) => (
            <Link
              key={item.path}
              to={item.path}
              className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors ${
                isActive(item.path)
                  ? "bg-sidebar-accent text-sidebar-accent-foreground"
                  : (item as any).highlight
                  ? "text-destructive hover:bg-destructive/10"
                  : "text-sidebar-foreground hover:bg-sidebar-accent/50"
              }`}
            >
              <item.icon className="h-5 w-5" />
              {item.label}
            </Link>
          ))}
        </nav>
        <div className="border-t border-sidebar-border p-3">
          <div className="mb-2 rounded-lg bg-sidebar-accent/50 px-3 py-2 text-sm">
            <p className="font-medium text-sidebar-foreground">{profile?.name || "User"}</p>
            <p className="text-xs capitalize text-sidebar-foreground/60">{profile?.profile_type || "parent"}</p>
          </div>
          <Button variant="ghost" size="sm" className="w-full justify-start text-sidebar-foreground" onClick={handleSignOut}>
            <LogOut className="mr-2 h-4 w-4" />
            {t("nav.logout")}
          </Button>
        </div>
      </aside>

      {/* Main */}
      <div className="flex flex-1 flex-col">
        {/* Header */}
        <header className="sticky top-0 z-40 flex h-16 items-center justify-between border-b border-border bg-background/80 px-4 backdrop-blur-lg md:px-6">
          <Button variant="ghost" size="icon" className="md:hidden" onClick={() => setMobileOpen(!mobileOpen)}>
            {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </Button>
          <div className="flex items-center gap-2 md:hidden">
            <Shield className="h-6 w-6 text-primary" />
            <span className="font-bold">CyberShield</span>
          </div>
          <div className="hidden md:block" />
          <div className="flex items-center gap-1">
            <NotificationBell />
            <LanguageSwitcher />
            <Button variant="ghost" size="icon" onClick={toggleTheme}>
              {theme === "dark" ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
            </Button>
          </div>
        </header>

        {/* Mobile Nav */}
        {mobileOpen && (
          <div className="fixed inset-0 z-30 bg-background/95 backdrop-blur-sm md:hidden">
            <div className="pt-20 px-4 space-y-2">
              {navItems.map((item) => (
                <Link
                  key={item.path}
                  to={item.path}
                  onClick={() => setMobileOpen(false)}
                  className={`flex items-center gap-3 rounded-lg px-4 py-3 text-base font-medium transition-colors ${
                    isActive(item.path) ? "bg-accent text-accent-foreground" : "text-foreground hover:bg-muted"
                  }`}
                >
                  <item.icon className="h-5 w-5" />
                  {item.label}
                </Link>
              ))}
              <Button variant="ghost" className="w-full justify-start text-destructive mt-4" onClick={handleSignOut}>
                <LogOut className="mr-2 h-4 w-4" />
                {t("nav.logout")}
              </Button>
            </div>
          </div>
        )}

        {/* Content */}
        <main className="flex-1 p-4 md:p-6">
          <Outlet />
        </main>
        <ChatbotAlert />
        <EmergencySOSButton />
      </div>
    </div>
  );
};

export default AppLayout;
