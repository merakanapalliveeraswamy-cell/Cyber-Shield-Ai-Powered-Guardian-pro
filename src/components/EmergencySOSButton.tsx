import { useState } from "react";
import { Phone, MapPin, FileText, X, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { useLanguage } from "@/i18n/LanguageContext";

const EmergencySOSButton = () => {
  const [open, setOpen] = useState(false);
  const [confirmed, setConfirmed] = useState(false);
  const { t } = useLanguage();

  const handleSOS = () => {
    setOpen(true);
    setConfirmed(false);
  };

  const handleShareLocation = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const { latitude, longitude } = pos.coords;
          window.open(
            `https://www.google.com/maps?q=${latitude},${longitude}`,
            "_blank"
          );
        },
        () => alert("Location access denied. Please enable location services.")
      );
    } else {
      alert("Geolocation is not supported by this browser.");
    }
  };

  return (
    <>
      {/* Floating SOS Button */}
      <button
        onClick={handleSOS}
        className="fixed bottom-6 right-6 z-50 flex h-16 w-16 items-center justify-center rounded-full bg-destructive text-destructive-foreground shadow-lg transition-transform hover:scale-110 active:scale-95 animate-sos-pulse md:h-14 md:w-14"
        aria-label="Emergency SOS"
      >
        <span className="text-lg font-extrabold">SOS</span>
      </button>

      {/* Emergency Modal */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-md sm:max-w-lg max-h-[90vh] overflow-y-auto border-destructive/30">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-destructive text-xl">
              <AlertTriangle className="h-6 w-6" />
              {t("emergency.sos.title" as any) || "🆘 Emergency Help"}
            </DialogTitle>
            <DialogDescription>
              {t("emergency.sos.subtitle" as any) || "Get immediate assistance. All helplines are Government of India official numbers."}
            </DialogDescription>
          </DialogHeader>

          {!confirmed ? (
            <div className="flex flex-col items-center gap-6 py-6">
              <div className="flex h-20 w-20 items-center justify-center rounded-full bg-destructive/10 animate-sos-pulse">
                <AlertTriangle className="h-10 w-10 text-destructive" />
              </div>
              <p className="text-center text-lg font-semibold text-foreground">
                {t("emergency.sos.confirm" as any) || "Are you in danger?"}
              </p>
              <div className="flex gap-3 w-full">
                <Button
                  variant="destructive"
                  size="lg"
                  className="flex-1 h-14 text-lg font-bold"
                  onClick={() => setConfirmed(true)}
                >
                  {t("emergency.sos.yes" as any) || "Yes, I need help"}
                </Button>
                <Button
                  variant="outline"
                  size="lg"
                  className="flex-1 h-14"
                  onClick={() => setOpen(false)}
                >
                  {t("emergency.sos.no" as any) || "No, I'm safe"}
                </Button>
              </div>
            </div>
          ) : (
            <div className="space-y-4 py-4">
              {/* Call Helpline */}
              <a href="tel:1930" className="block">
                <div className="flex items-center gap-4 rounded-xl border border-destructive/30 bg-destructive/5 p-4 transition-colors hover:bg-destructive/10">
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-destructive text-destructive-foreground">
                    <Phone className="h-6 w-6" />
                  </div>
                  <div className="flex-1">
                    <p className="font-bold text-foreground text-lg">📞 Call 1930</p>
                    <p className="text-sm text-muted-foreground">Cyber Crime Helpline — Report fraud & scams</p>
                  </div>
                </div>
              </a>

              <a href="tel:181" className="block">
                <div className="flex items-center gap-4 rounded-xl border border-destructive/30 bg-destructive/5 p-4 transition-colors hover:bg-destructive/10">
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-destructive text-destructive-foreground">
                    <Phone className="h-6 w-6" />
                  </div>
                  <div className="flex-1">
                    <p className="font-bold text-foreground text-lg">👩 Call 181</p>
                    <p className="text-sm text-muted-foreground">Women Helpline — Safety & emergency support</p>
                  </div>
                </div>
              </a>

              <a href="tel:1098" className="block">
                <div className="flex items-center gap-4 rounded-xl border border-destructive/30 bg-destructive/5 p-4 transition-colors hover:bg-destructive/10">
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-destructive text-destructive-foreground">
                    <Phone className="h-6 w-6" />
                  </div>
                  <div className="flex-1">
                    <p className="font-bold text-foreground text-lg">🧒 Call 1098</p>
                    <p className="text-sm text-muted-foreground">Child Helpline — Abuse, grooming, exploitation</p>
                  </div>
                </div>
              </a>

              {/* Share Location */}
              <Button
                variant="outline"
                size="lg"
                className="w-full h-14 text-base"
                onClick={handleShareLocation}
              >
                <MapPin className="mr-2 h-5 w-5" />
                📍 Share My Location
              </Button>

              {/* Report Incident */}
              <a
                href="https://cybercrime.gov.in"
                target="_blank"
                rel="noopener noreferrer"
                className="block"
              >
                <Button variant="outline" size="lg" className="w-full h-14 text-base">
                  <FileText className="mr-2 h-5 w-5" />
                  📝 Report Incident Online
                </Button>
              </a>

              <p className="text-center text-xs text-muted-foreground pt-2">
                🏛️ Government of India Official Helplines · Available 24/7
              </p>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
};

export default EmergencySOSButton;
