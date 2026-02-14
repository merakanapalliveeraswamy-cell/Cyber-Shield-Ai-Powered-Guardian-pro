import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Shield, Users, Baby, UserCheck, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useAuth } from "@/contexts/AuthContext";
import { useLanguage } from "@/i18n/LanguageContext";

type ProfileType = "parent" | "child" | "elderly" | "individual";

const focusAreas: Record<ProfileType, string[]> = {
  parent: ["Child monitoring", "Cyberbullying detection", "Screen-time insights", "Emergency alerts"],
  child: ["Safe browsing AI", "Cyberbullying detection", "SOS help", "Educational safety tips"],
  elderly: ["Scam & fraud detection", "Fake call alerts", "Large text UI", "Voice-based warnings"],
  individual: ["Phishing detection", "Privacy monitoring", "Account breach alerts", "Safe browsing"],
};

const Onboarding = () => {
  const [selected, setSelected] = useState<ProfileType | null>(null);
  const [loading, setLoading] = useState(false);
  const { updateProfile } = useAuth();
  const { t } = useLanguage();
  const navigate = useNavigate();

  const options: { type: ProfileType; icon: typeof Users; titleKey: string; descKey: string }[] = [
    { type: "parent", icon: Users, titleKey: "onboarding.parent", descKey: "onboarding.parentDesc" },
    { type: "child", icon: Baby, titleKey: "onboarding.child", descKey: "onboarding.childDesc" },
    { type: "elderly", icon: UserCheck, titleKey: "onboarding.elderly", descKey: "onboarding.elderlyDesc" },
    { type: "individual", icon: User, titleKey: "onboarding.individual", descKey: "onboarding.individualDesc" },
  ];

  const handleContinue = async () => {
    if (!selected) return;
    setLoading(true);
    await updateProfile({ profile_type: selected });
    setLoading(false);
    navigate("/app");
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="w-full max-w-lg">
        <div className="mb-8 text-center">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full gradient-shield">
            <Shield className="h-7 w-7 text-primary-foreground" />
          </div>
          <h1 className="text-2xl font-bold text-foreground">{t("onboarding.title" as any)}</h1>
          <p className="text-muted-foreground">{t("onboarding.subtitle" as any)}</p>
        </div>
        <div className="space-y-3">
          {options.map((opt) => (
            <Card
              key={opt.type}
              className={`cursor-pointer p-5 transition-all ${
                selected === opt.type
                  ? "border-primary ring-2 ring-primary/30 shadow-elevated"
                  : "hover:border-primary/50 hover:shadow-card"
              }`}
              onClick={() => setSelected(opt.type)}
            >
              <div className="flex items-center gap-4">
                <div className={`rounded-lg p-3 ${selected === opt.type ? "gradient-shield" : "bg-muted"}`}>
                  <opt.icon className={`h-6 w-6 ${selected === opt.type ? "text-primary-foreground" : "text-muted-foreground"}`} />
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold text-card-foreground">{t(opt.titleKey as any)}</h3>
                  <p className="text-sm text-muted-foreground">{t(opt.descKey as any)}</p>
                </div>
              </div>
              {selected === opt.type && (
                <div className="mt-3 flex flex-wrap gap-1.5 pl-16">
                  {focusAreas[opt.type].map((area) => (
                    <span key={area} className="rounded-full bg-primary/10 px-2.5 py-1 text-xs font-medium text-primary">
                      {area}
                    </span>
                  ))}
                </div>
              )}
            </Card>
          ))}
        </div>
        <Button
          className="mt-6 w-full gradient-shield h-12 text-lg"
          disabled={!selected || loading}
          onClick={handleContinue}
        >
          {loading ? t("common.loading") : t("onboarding.continue" as any)}
        </Button>
      </div>
    </div>
  );
};

export default Onboarding;
