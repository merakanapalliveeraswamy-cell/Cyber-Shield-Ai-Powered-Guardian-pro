import {
  Phone,
  Shield,
  Baby,
  Heart,
  FileText,
  ExternalLink,
  CheckCircle2,
  Clock,
  Search,
  Camera,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useLanguage } from "@/i18n/LanguageContext";

const helplines = [
  {
    icon: Shield,
    emoji: "🚨",
    name: "Cyber Crime Helpline",
    number: "1930",
    description: "Report online fraud, scams, UPI fraud, phishing & cybercrime",
    howToReport: "https://cybercrime.gov.in",
    color: "text-primary",
    bg: "bg-primary/10",
  },
  {
    icon: Heart,
    emoji: "👩",
    name: "Women Safety Helpline",
    number: "181",
    description: "Women emergency & safety support, harassment, stalking",
    howToReport: "https://ncw.nic.in",
    color: "text-destructive",
    bg: "bg-destructive/10",
  },
  {
    icon: Baby,
    emoji: "🧒",
    name: "Child Helpline",
    number: "1098",
    description: "Child abuse, online grooming, exploitation, POCSO cases",
    howToReport: null,
    color: "text-secondary",
    bg: "bg-secondary/10",
  },
  {
    icon: Phone,
    emoji: "🚔",
    name: "Police Emergency",
    number: "112",
    description: "National emergency number for immediate police assistance",
    howToReport: null,
    color: "text-warning",
    bg: "bg-warning/10",
  },
];

const reportSteps = [
  {
    step: 1,
    icon: Search,
    title: "Identify the Issue",
    description:
      "Determine the type: Scam / Cyber Crime / Child Safety / Women Safety / Online Harassment",
  },
  {
    step: 2,
    icon: Camera,
    title: "Collect Evidence",
    description:
      "Take screenshots of messages, save URLs, note phone numbers, record transaction IDs",
  },
  {
    step: 3,
    icon: Phone,
    title: "Call 1930 or Visit Portal",
    description:
      "Call the Cyber Crime Helpline at 1930 OR file an online complaint at cybercrime.gov.in",
  },
  {
    step: 4,
    icon: CheckCircle2,
    title: "Track Your Complaint",
    description:
      "Save your complaint reference number. Track status on the cybercrime portal dashboard",
  },
];

const Emergency = () => {
  const { t } = useLanguage();

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-foreground md:text-3xl">
          {t("nav.emergency" as any) || "🆘 Emergency & Helpline Support"}
        </h1>
        <p className="text-muted-foreground">
          Instant access to Indian emergency helplines, guided reporting & trusted resources.
        </p>
      </div>

      {/* Helpline Directory */}
      <section>
        <h2 className="mb-4 text-xl font-semibold text-foreground">Indian Emergency Helplines</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          {helplines.map((h, i) => (
            <Card key={i} className="shadow-card overflow-hidden">
              <CardHeader className="flex flex-row items-start gap-4 pb-3">
                <div className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-xl ${h.bg}`}>
                  <h.icon className={`h-6 w-6 ${h.color}`} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <CardTitle className="text-base">{h.emoji} {h.name}</CardTitle>
                    <Badge variant="outline" className="text-xs gap-1 shrink-0">
                      <Clock className="h-3 w-3" /> 24/7
                    </Badge>
                  </div>
                  <p className="mt-1 text-sm text-muted-foreground">{h.description}</p>
                </div>
              </CardHeader>
              <CardContent className="flex flex-wrap items-center gap-2 pt-0">
                <a href={`tel:${h.number}`}>
                  <Button variant="destructive" size="sm" className="gap-2">
                    <Phone className="h-4 w-4" />
                    Call {h.number}
                  </Button>
                </a>
                {h.howToReport && (
                  <a href={h.howToReport} target="_blank" rel="noopener noreferrer">
                    <Button variant="outline" size="sm" className="gap-2">
                      <ExternalLink className="h-4 w-4" />
                      How to Report
                    </Button>
                  </a>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      {/* Report Filing Guide */}
      <section>
        <h2 className="mb-4 text-xl font-semibold text-foreground">
          <FileText className="mr-2 inline h-5 w-5" />
          How to File a Complaint
        </h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {reportSteps.map((s) => (
            <Card key={s.step} className="shadow-card relative overflow-hidden">
              <div className="absolute left-0 top-0 h-full w-1 gradient-shield" />
              <CardContent className="py-5 pl-5">
                <div className="mb-3 flex items-center gap-3">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/10">
                    <span className="text-sm font-bold text-primary">{s.step}</span>
                  </div>
                  <s.icon className="h-5 w-5 text-primary" />
                </div>
                <h3 className="mb-1 font-semibold text-card-foreground">{s.title}</h3>
                <p className="text-sm text-muted-foreground">{s.description}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      {/* Quick Action Bar */}
      <section>
        <Card className="border-2 border-destructive/20 bg-destructive/5 shadow-card">
          <CardContent className="flex flex-col gap-4 py-6 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h3 className="text-lg font-bold text-foreground">Need Immediate Help?</h3>
              <p className="text-sm text-muted-foreground">
                Don't wait — call the helpline or file a complaint now.
              </p>
            </div>
            <div className="flex flex-wrap gap-3">
              <a href="tel:1930">
                <Button variant="destructive" size="lg" className="gap-2">
                  <Phone className="h-5 w-5" />
                  Call 1930
                </Button>
              </a>
              <a href="https://cybercrime.gov.in" target="_blank" rel="noopener noreferrer">
                <Button variant="outline" size="lg" className="gap-2">
                  <ExternalLink className="h-5 w-5" />
                  File Online Complaint
                </Button>
              </a>
            </div>
          </CardContent>
        </Card>
      </section>

      {/* Disclaimer */}
      <div className="rounded-lg border border-border bg-muted/50 p-4 text-center">
        <p className="text-xs text-muted-foreground">
          🏛️ All helpline numbers listed are <strong>Government of India official helplines</strong>.
          No personal data is stored without your consent. CyberShield is a privacy-first platform.
        </p>
      </div>
    </div>
  );
};

export default Emergency;
