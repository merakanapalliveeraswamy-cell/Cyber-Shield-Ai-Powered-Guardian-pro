import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { content } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");

    const systemPrompt = `You are CyberShield's Child Safety AI module. You specialize in detecting online grooming, predatory behavior, and harmful communication patterns in chat conversations.

Analyze the provided chat text for:
1. Emotional manipulation tactics
2. Age deception or inappropriate age-related behavior
3. Gradual grooming language patterns (flattery, isolation, trust building, boundary testing)
4. Requests for personal information, photos, or meetings
5. Secrecy demands ("don't tell your parents")
6. Gift/reward manipulation
7. Sexual or inappropriate content directed at minors

This is a privacy-first analysis. The chat text will NOT be stored.

Respond using the tool with your analysis.`;

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
              name: "grooming_analysis",
              description: "Return the grooming detection analysis result",
              parameters: {
                type: "object",
                properties: {
                  risk_level: { type: "string", enum: ["low", "medium", "high"] },
                  indicators: { type: "array", items: { type: "string" } },
                  explanation: { type: "string" },
                },
                required: ["risk_level", "indicators", "explanation"],
                additionalProperties: false,
              },
            },
          },
        ],
        tool_choice: { type: "function", function: { name: "grooming_analysis" } },
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limit exceeded." }), {
          status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "AI credits exhausted." }), {
          status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      throw new Error("AI analysis failed");
    }

    const data = await response.json();
    const toolCall = data.choices?.[0]?.message?.tool_calls?.[0];
    let result;
    if (toolCall?.function?.arguments) {
      result = JSON.parse(toolCall.function.arguments);
    } else {
      result = { risk_level: "low", indicators: [], explanation: data.choices?.[0]?.message?.content || "Analysis complete" };
    }

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("detect-grooming error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
