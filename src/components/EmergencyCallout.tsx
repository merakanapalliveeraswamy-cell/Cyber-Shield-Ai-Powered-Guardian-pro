import { Phone } from "lucide-react";
import { Button } from "@/components/ui/button";

interface EmergencyCalloutProps {
  type: "scam" | "child" | "women";
}

const config = {
  scam: {
    emoji: "⚠️",
    message: "This looks dangerous. Call 1930 now?",
    number: "1930",
    label: "Cyber Crime Helpline",
  },
  child: {
    emoji: "🧒",
    message: "Immediate help available – Call 1098",
    number: "1098",
    label: "Child Helpline",
  },
  women: {
    emoji: "🚨",
    message: "Emergency support – Call 181",
    number: "181",
    label: "Women Helpline",
  },
};

const EmergencyCallout = ({ type }: EmergencyCalloutProps) => {
  const c = config[type];

  return (
    <div className="flex flex-col gap-3 rounded-xl border-2 border-destructive/40 bg-destructive/5 p-4 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex items-center gap-3">
        <span className="text-2xl">{c.emoji}</span>
        <div>
          <p className="font-semibold text-foreground">{c.message}</p>
          <p className="text-xs text-muted-foreground">{c.label} · Available 24/7</p>
        </div>
      </div>
      <a href={`tel:${c.number}`}>
        <Button variant="destructive" size="sm" className="gap-2">
          <Phone className="h-4 w-4" />
          Call {c.number}
        </Button>
      </a>
    </div>
  );
};

export default EmergencyCallout;
