import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { z } from "https://esm.sh/zod@3.23.8";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    // Authenticate user
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );
    const token = authHeader.replace("Bearer ", "");
    const { data: claimsData, error: claimsError } = await supabaseClient.auth.getClaims(token);
    if (claimsError || !claimsData?.claims) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = await req.json();

    const SafetyAdvisorSchema = z.object({
      content: z.string().trim().min(1, "Content is required").max(10000, "Content too long (max 10000 characters)"),
      context: z.enum(["women_safety"]).optional(),
    });

    const parsed = SafetyAdvisorSchema.safeParse(body);
    if (!parsed.success) {
      return new Response(JSON.stringify({ error: parsed.error.issues[0]?.message || "Invalid input" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const { content, context } = parsed.data;

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");

    const contextPrompts: Record<string, string> = {
      women_safety: `You are CyberShield's Women's Safety AI advisor. Analyze the provided content for:
1. Fake profile indicators
2. Sextortion language or threats
3. Blackmail attempts
4. Harassment patterns
5. Stalking indicators

Provide a calm, non-panic, advisory response with:
- Risk assessment
- Clear explanation of detected threats
- Actionable next steps for the user
- Relevant Indian reporting resources (cybercrime.gov.in, NCW, Women helpline 181)

Respond using the tool.`,
    };

    const systemPrompt = contextPrompts[context] || contextPrompts.women_safety;

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
              name: "safety_advisory",
              description: "Return the safety advisory result",
              parameters: {
                type: "object",
                properties: {
                  risk_level: { type: "string", enum: ["low", "medium", "high"] },
                  explanation: { type: "string" },
                  guidance: { type: "string" },
                  threat_type: { type: "string" },
                },
                required: ["risk_level", "explanation", "guidance"],
                additionalProperties: false,
              },
            },
          },
        ],
        tool_choice: { type: "function", function: { name: "safety_advisory" } },
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
      result = { risk_level: "low", explanation: data.choices?.[0]?.message?.content || "Analysis complete", guidance: "" };
    }

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("safety-advisor error:", e);
    return new Response(JSON.stringify({ error: "Internal server error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
