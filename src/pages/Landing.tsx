import { Link } from "react-router-dom";
import { Shield, Search, Baby, Users, Heart, Lock, ChevronRight, Sun, Moon, Globe } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useLanguage } from "@/i18n/LanguageContext";
import { useTheme } from "@/contexts/ThemeContext";
import EmergencySOSButton from "@/components/EmergencySOSButton";

const Landing = () => {
  const { t, language, setLanguage } = useLanguage();
  const { theme, toggleTheme } = useTheme();

  const features = [
    { icon: Search, titleKey: "landing.features.scam.title" as const, descKey: "landing.features.scam.desc" as const, color: "text-primary" },
    { icon: Baby, titleKey: "landing.features.child.title" as const, descKey: "landing.features.child.desc" as const, color: "text-secondary" },
    { icon: Users, titleKey: "landing.features.elderly.title" as const, descKey: "landing.features.elderly.desc" as const, color: "text-warning" },
    { icon: Heart, titleKey: "landing.features.women.title" as const, descKey: "landing.features.women.desc" as const, color: "text-destructive" },
    { icon: Shield, titleKey: "landing.features.dashboard.title" as const, descKey: "landing.features.dashboard.desc" as const, color: "text-primary" },
    { icon: Lock, titleKey: "landing.features.privacy.title" as const, descKey: "landing.features.privacy.desc" as const, color: "text-secondary" },
  ];

  const impactStats = [
    { value: "50,000+", labelKey: "landing.impact.threats" as const },
    { value: "12,000+", labelKey: "landing.impact.scams" as const },
    { value: "8,000+", labelKey: "landing.impact.children" as const },
    { value: "₹2.5Cr+", labelKey: "landing.impact.saved" as const },
  ];

  return (
    <div className="min-h-screen bg-background">
      {/* Navbar */}
      <nav className="sticky top-0 z-50 border-b border-border bg-background/80 backdrop-blur-lg">
        <div className="container mx-auto flex h-16 items-center justify-between px-4">
          <Link to="/" className="flex items-center gap-2">
            <Shield className="h-8 w-8 text-primary" />
            <span className="text-xl font-bold text-foreground">CyberShield</span>
          </Link>
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setLanguage(language === "en" ? "hi" : "en")}
              title={t("common.language")}
            >
              <Globe className="h-5 w-5" />
            </Button>
            <Button variant="ghost" size="icon" onClick={toggleTheme}>
              {theme === "dark" ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
            </Button>
            <Link to="/login">
              <Button variant="ghost">{t("nav.login")}</Button>
            </Link>
            <Link to="/signup">
              <Button>{t("nav.signup")}</Button>
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="gradient-hero relative overflow-hidden">
        <div className="container mx-auto px-4 py-20 md:py-32">
          <div className="mx-auto max-w-3xl text-center">
            <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/5 px-4 py-2 text-sm font-medium text-primary">
              <Shield className="h-4 w-4" />
              🇮🇳 Made for India
            </div>
            <h1 className="mb-6 text-4xl font-extrabold tracking-tight text-foreground md:text-6xl lg:text-7xl">
              {t("landing.hero.title")}{" "}
              <span className="text-gradient-shield">{t("landing.hero.titleHighlight")}</span>
            </h1>
            <p className="mb-10 text-lg text-muted-foreground md:text-xl">
              {t("landing.hero.subtitle")}
            </p>
            <div className="flex flex-col items-center gap-4 sm:flex-row sm:justify-center">
              <Link to="/signup">
                <Button size="lg" className="gradient-shield h-14 px-8 text-lg font-semibold text-primary-foreground shadow-elevated">
                  {t("landing.hero.cta")}
                  <ChevronRight className="ml-1 h-5 w-5" />
                </Button>
              </Link>
              <a href="#features">
                <Button variant="outline" size="lg" className="h-14 px-8 text-lg">
                  {t("landing.hero.ctaSecondary")}
                </Button>
              </a>
            </div>
          </div>
        </div>
        <div className="absolute -bottom-1 left-0 right-0 h-24 bg-gradient-to-t from-background to-transparent" />
      </section>

      {/* Features */}
      <section id="features" className="py-20 md:py-28">
        <div className="container mx-auto px-4">
          <div className="mb-16 text-center">
            <h2 className="mb-4 text-3xl font-bold text-foreground md:text-4xl">
              {t("landing.features.title")}
            </h2>
            <p className="text-lg text-muted-foreground">{t("landing.features.subtitle")}</p>
          </div>
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {features.map((f, i) => (
              <div
                key={i}
                className="group rounded-xl border border-border bg-card p-6 shadow-card transition-all hover:-translate-y-1 hover:shadow-elevated"
              >
                <div className={`mb-4 inline-flex rounded-lg bg-muted p-3 ${f.color}`}>
                  <f.icon className="h-6 w-6" />
                </div>
                <h3 className="mb-2 text-lg font-semibold text-card-foreground">{t(f.titleKey)}</h3>
                <p className="text-sm text-muted-foreground">{t(f.descKey)}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Impact Stats */}
      <section className="border-y border-border bg-muted/50 py-16">
        <div className="container mx-auto px-4">
          <h2 className="mb-12 text-center text-3xl font-bold text-foreground">
            {t("landing.impact.title")}
          </h2>
          <div className="grid grid-cols-2 gap-8 md:grid-cols-4">
            {impactStats.map((stat, i) => (
              <div key={i} className="text-center">
                <div className="mb-2 text-3xl font-extrabold text-gradient-shield md:text-4xl">
                  {stat.value}
                </div>
                <div className="text-sm font-medium text-muted-foreground">{t(stat.labelKey)}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-20">
        <div className="container mx-auto px-4">
          <div className="mx-auto max-w-2xl rounded-2xl gradient-shield p-10 text-center shadow-elevated">
            <h2 className="mb-4 text-3xl font-bold text-primary-foreground">{t("landing.cta.title")}</h2>
            <p className="mb-8 text-primary-foreground/80">{t("landing.cta.subtitle")}</p>
            <Link to="/signup">
              <Button size="lg" variant="secondary" className="h-14 px-8 text-lg font-semibold">
                {t("landing.cta.button")}
                <ChevronRight className="ml-1 h-5 w-5" />
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border bg-muted/30 py-8">
        <div className="container mx-auto px-4 text-center text-sm text-muted-foreground">
          <div className="mb-2 flex items-center justify-center gap-2">
            <Shield className="h-5 w-5 text-primary" />
            <span className="font-semibold text-foreground">CyberShield</span>
          </div>
          <p>© 2026 CyberShield. India's AI Guardian for Digital Safety.</p>
        </div>
      </footer>
      <EmergencySOSButton />
    </div>
  );
};

export default Landing;
