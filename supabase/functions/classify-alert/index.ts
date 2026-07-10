// Classify an incoming alert with Lovable AI and persist an enriched alert row.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface ClassifyRequest {
  alert_type: string;
  message: string;
  source?: string;
  device?: string;
  location?: string;
  evidence?: unknown[];
}

interface AiClassification {
  title: string;
  category: string;
  severity: "critical" | "high" | "medium" | "low" | "safe";
  confidence: number;
  risk_score: number;
  ai_explanation: string;
  recommendations: string[];
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return json({ error: "Missing Authorization" }, 401);
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } },
    );

    const { data: userData, error: userErr } = await supabase.auth.getUser();
    if (userErr || !userData.user) return json({ error: "Unauthorized" }, 401);

    const body = (await req.json()) as ClassifyRequest;
    if (!body?.alert_type || !body?.message) {
      return json({ error: "alert_type and message are required" }, 400);
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) return json({ error: "LOVABLE_API_KEY missing" }, 500);

    // Ask the AI to classify.
    const aiResp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Lovable-API-Key": LOVABLE_API_KEY,
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          {
            role: "system",
            content:
              "You are CyberShield's threat analyst for Indian users (SMS scams, UPI fraud, phishing, grooming, deepfakes, etc.). " +
              "Return STRICT JSON only, no prose. Keys: title (short), category (snake_case), severity " +
              "(one of critical|high|medium|low|safe), confidence (0-100 int), risk_score (0-100 int), " +
              "ai_explanation (2-4 sentences, plain English), recommendations (array of 3-6 short imperative strings).",
          },
          {
            role: "user",
            content: `Alert type: ${body.alert_type}\nSource: ${body.source ?? "unknown"}\nMessage/Content:\n${body.message}`,
          },
        ],
        response_format: { type: "json_object" },
      }),
    });

    if (!aiResp.ok) {
      const text = await aiResp.text();
      console.error("[classify-alert] AI error", aiResp.status, text);
      if (aiResp.status === 429) return json({ error: "Rate limit exceeded" }, 429);
      if (aiResp.status === 402) return json({ error: "AI credits exhausted" }, 402);
      return json({ error: "AI classification failed", details: text }, 502);
    }

    const aiJson = await aiResp.json();
    const raw = aiJson.choices?.[0]?.message?.content ?? "{}";
    let cls: AiClassification;
    try {
      cls = JSON.parse(raw);
    } catch {
      console.error("[classify-alert] JSON parse failed:", raw);
      cls = {
        title: body.alert_type,
        category: body.alert_type,
        severity: "medium",
        confidence: 60,
        risk_score: 50,
        ai_explanation: "AI response could not be parsed. Manual review recommended.",
        recommendations: ["Review manually", "Do not click suspicious links"],
      };
    }

    const insertRow = {
      user_id: userData.user.id,
      alert_type: body.alert_type,
      title: cls.title ?? body.alert_type,
      category: cls.category ?? body.alert_type,
      severity: cls.severity ?? "medium",
      confidence: clampInt(cls.confidence, 0, 100, 70),
      risk_score: clampInt(cls.risk_score, 0, 100, 50),
      message: body.message.slice(0, 4000),
      ai_explanation: cls.ai_explanation ?? "",
      recommendations: Array.isArray(cls.recommendations) ? cls.recommendations : [],
      evidence: body.evidence ?? [],
      source: body.source ?? null,
      device: body.device ?? null,
      location: body.location ?? null,
      status: "new",
    };

    const { data: inserted, error: insertErr } = await supabase
      .from("alerts")
      .insert(insertRow)
      .select()
      .single();

    if (insertErr) {
      console.error("[classify-alert] insert error", insertErr);
      return json({ error: insertErr.message }, 500);
    }

    return json({ alert: inserted }, 200);
  } catch (err) {
    console.error("[classify-alert] fatal", err);
    return json({ error: String(err) }, 500);
  }
});

function clampInt(v: unknown, min: number, max: number, fallback: number): number {
  const n = typeof v === "number" ? v : parseInt(String(v ?? ""), 10);
  if (Number.isNaN(n)) return fallback;
  return Math.max(min, Math.min(max, Math.round(n)));
}

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
