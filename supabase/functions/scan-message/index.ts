import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { content, type } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");

    const systemPrompt = `You are CyberShield, India's AI-powered scam and phishing detection engine. Analyze the following ${type === "url" ? "URL/link" : "text message"} for potential scams, phishing, or fraud.

Focus on India-specific scam patterns:
- UPI payment fraud (fake UPI IDs, payment requests)
- Fake job/loan offers
- Fake government scheme messages (PM schemes, Aadhaar/PAN)
- Courier delivery scams (fake tracking, customs fees)
- Bank/KYC impersonation (RBI, SBI, ICICI etc.)
- Gaming/giveaway scams
- Lottery/prize scams
- Investment/crypto fraud

You MUST respond with a valid JSON object with these exact fields:
{
  "verdict": "safe" | "suspicious" | "dangerous",
  "risk_level": "low" | "medium" | "high",
  "category": "<scam category or 'none'>",
  "explanation": "<2-3 sentence explanation of why this is safe/suspicious/dangerous, highlighting specific indicators>"
}

Be thorough but concise. If a message looks like a genuine scam, mark it dangerous. If there are some red flags but not conclusive, mark suspicious.`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: content },
        ],
        tools: [
          {
            type: "function",
            function: {
              name: "scan_result",
              description: "Return the scan analysis result",
              parameters: {
                type: "object",
                properties: {
                  verdict: { type: "string", enum: ["safe", "suspicious", "dangerous"] },
                  risk_level: { type: "string", enum: ["low", "medium", "high"] },
                  category: { type: "string" },
                  explanation: { type: "string" },
                },
                required: ["verdict", "risk_level", "category", "explanation"],
                additionalProperties: false,
              },
            },
          },
        ],
        tool_choice: { type: "function", function: { name: "scan_result" } },
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limit exceeded. Please try again later." }), {
          status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "AI credits exhausted. Please add credits." }), {
          status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const t = await response.text();
      console.error("AI error:", response.status, t);
      throw new Error("AI analysis failed");
    }

    const data = await response.json();
    const toolCall = data.choices?.[0]?.message?.tool_calls?.[0];
    
    let result;
    if (toolCall?.function?.arguments) {
      result = JSON.parse(toolCall.function.arguments);
    } else {
      // Fallback: try to parse from content
      const content_text = data.choices?.[0]?.message?.content || "";
      try {
        result = JSON.parse(content_text);
      } catch {
        result = { verdict: "safe", risk_level: "low", category: "unknown", explanation: content_text };
      }
    }

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("scan-message error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
