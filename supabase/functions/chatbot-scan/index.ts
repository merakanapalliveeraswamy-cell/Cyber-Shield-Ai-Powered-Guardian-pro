import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
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
    const userId = claimsData.claims.sub as string;

    const body = await req.json();
    const { message, profile_type, language } = body;

    if (!message || typeof message !== "string" || message.trim().length === 0) {
      return new Response(JSON.stringify({ error: "Message is required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (message.length > 5000) {
      return new Response(JSON.stringify({ error: "Message too long (max 5000 chars)" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");

    const modeInstructions: Record<string, string> = {
      parent: `You are in PARENT MODE. Focus on:
- Detecting threats to children (cyberbullying, predator contact, inappropriate content)
- Generating parent-friendly summaries with recommended actions
- If child receives suspicious message, flag it for parental review
- Suggest blocking sender if threat detected
- Include "strict filter" recommendations when appropriate`,
      child: `You are in CHILD MODE. Use simple, reassuring language appropriate for young users.
- If a message is suspicious, say: "This message may not be safe. Please check with your parent."
- Never use scary language. Keep warnings gentle but clear.
- Focus on safe browsing tips and educational safety advice`,
      elderly: `You are in SENIOR CITIZEN MODE. Use extra-clear, simple language.
- Focus on UPI scams, fake calls, lottery fraud, bank impersonation
- Use large-text-friendly short sentences
- Emphasize: "Do NOT share OTP, PIN, or bank details with anyone"`,
      individual: `You are in INDIVIDUAL USER MODE. Focus on:
- Phishing and fraud detection
- Privacy monitoring alerts
- Account breach warnings
- Professional, detailed analysis`,
    };

    const langInstruction = language && language !== "en"
      ? `\nIMPORTANT: Respond in the language code "${language}". Use the native script of that language.`
      : "";

    const systemPrompt = `You are CyberShield AI Safety Chatbot — India's real-time digital safety assistant.

${modeInstructions[profile_type] || modeInstructions.individual}
${langInstruction}

Analyze the user's message for ALL of these threat categories:
1. PHISHING: urgency words ("immediately", "account blocked", "verify now", "KYC expired"), fake sender names
2. FRAUD LINKS: shortened URLs (bit.ly, tinyurl, goo.gl, etc.), unknown/suspicious domains
3. UPI SCAM: fake UPI IDs, payment requests, cashback fraud
4. STRANGER CONTACT: unknown sender patterns, social engineering
5. INAPPROPRIATE CONTENT: explicit, violent, or misleading content
6. HARASSMENT: threatening language, sextortion, blackmail (especially for women safety)
7. LATE NIGHT ACTIVITY: if context suggests unusual timing patterns

You MUST respond using the scan_result tool with your analysis.`;

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
          { role: "user", content: message },
        ],
        tools: [
          {
            type: "function",
            function: {
              name: "scan_result",
              description: "Return the chatbot safety scan result",
              parameters: {
                type: "object",
                properties: {
                  alert_type: {
                    type: "string",
                    enum: ["phishing", "fraud_link", "stranger_contact", "upi_scam", "inappropriate_content", "harassment", "late_night_activity", "safe"],
                  },
                  severity: { type: "string", enum: ["safe", "caution", "danger"] },
                  title: { type: "string", description: "Short alert title (e.g. 'Phishing Alert', 'Safe Message')" },
                  message: { type: "string", description: "Explanation for the user, adapted to their profile mode" },
                  action_suggestion: { type: "string", description: "What the user should do next" },
                  should_notify_parent: { type: "boolean", description: "True if parent should be notified (child mode)" },
                  show_emergency_button: { type: "boolean", description: "True if emergency action button should be shown (harassment/threat)" },
                },
                required: ["alert_type", "severity", "title", "message", "action_suggestion", "should_notify_parent", "show_emergency_button"],
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
      const content_text = data.choices?.[0]?.message?.content || "";
      try {
        result = JSON.parse(content_text);
      } catch {
        result = {
          alert_type: "safe",
          severity: "safe",
          title: "Analysis Complete",
          message: content_text,
          action_suggestion: "No action needed.",
          should_notify_parent: false,
          show_emergency_button: false,
        };
      }
    }

    // Save alert to DB if not safe
    if (result.severity !== "safe") {
      await supabaseClient.from("alerts").insert({
        user_id: userId,
        alert_type: result.alert_type,
        severity: result.severity === "danger" ? "high" : "medium",
        message: `${result.title}: ${result.message}`,
        is_read: false,
      });
    }

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("chatbot-scan error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
