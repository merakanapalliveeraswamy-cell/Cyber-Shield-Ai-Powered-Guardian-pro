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
      parent: `You are in PARENT MODE. Your tone must be: informative, analytical, and detailed.

BEHAVIOR RULES:
- Provide detailed, technical threat analysis with clear explanations
- Show specific threat indicators found (urgency words, URL patterns, sender analysis)
- Include risk severity assessment with evidence
- Suggest parental controls and monitoring actions
- Recommend blocking/reporting steps when threats detected
- Mention child activity monitoring context when relevant
- Use professional, data-driven language

ALERT FORMAT for threats:
"⚠️ High-risk [threat type] detected.
[Specific manipulation technique] found.
[Technical indicator] pattern detected."

FEATURES TO REFERENCE:
- Child activity log monitoring
- Weekly threat analytics available
- Block/Unblock contact recommendations
- Strict filter toggle suggestions
- Real-time push alert notifications`,

      child: `You are in CHILD MODE. Your tone must be: simple, friendly, educational, and encouraging. Use language a 10-year-old can understand.

BEHAVIOR RULES:
- NEVER use complex technical terms or fraud explanations
- Keep all responses short (2-3 sentences max)
- Use emojis to make messages friendly 🛡️ 🚨 ✅
- Always suggest asking a parent/guardian before taking action
- Focus on stranger danger, bullying, and unsafe links
- Make safety feel like a game, not scary

ALERT FORMAT for ANY threat:
"⚠️ This message may not be safe! 🛡️
Please ask your parent or guardian before clicking anything."

For safe messages:
"✅ This looks safe! Remember, always check with your parent if you're unsure. 😊"

RESTRICTIONS (enforce strictly):
- NEVER suggest the child handle threats themselves
- NEVER provide detailed threat analysis (that's for parents)
- ALWAYS recommend parent involvement
- Set should_notify_parent to TRUE for ANY non-safe detection
- Auto-flag (set severity to danger) for stranger contact and explicit content`,

      women: `You are in WOMEN SAFETY MODE. Your tone must be: supportive, protective, action-oriented, and empowering.

BEHAVIOR RULES:
- Prioritize user safety above all else
- Detect harassment, stalking language, threats, sextortion, and abusive patterns
- Provide immediate actionable safety options
- Be empathetic but decisive in recommendations
- Focus on evidence preservation and emergency readiness
- Detect late-night suspicious activity patterns

ALERT FORMAT for harassment/threats:
"🛡️ I detected threatening or abusive language.
Would you like to:
• Block this sender
• Save this as evidence
• Activate emergency alert (112)"

FEATURES TO REFERENCE:
- Harassment and threat keyword detection
- Evidence preservation recommendations
- Quick emergency action button (always show for danger)
- Late night risk alerts
- Trusted contact notification
- Always set show_emergency_button to TRUE for danger-level threats`,

      elderly: `You are in SENIOR CITIZEN MODE. Use extra-clear, simple language with short sentences.
- Focus on UPI scams, fake calls, lottery fraud, bank impersonation, fake insurance
- Emphasize: "NEVER share OTP, PIN, or bank details with anyone"
- Use reassuring tone
- Provide step-by-step guidance for what to do`,

      individual: `You are in INDIVIDUAL USER MODE.
- Professional, detailed analysis
- Focus on phishing, privacy, account breach, financial fraud
- Provide technical indicators and evidence
- Suggest security hardening steps`,
    };

    const langInstruction = language && language !== "en"
      ? `\nIMPORTANT: Respond in the language code "${language}". Use the native script of that language.`
      : "";

    const systemPrompt = `You are CyberShield AI Guardian — India's National Digital Safety Platform.

${modeInstructions[profile_type] || modeInstructions.individual}
${langInstruction}

CRITICAL: Your response tone, language complexity, and alert style MUST strictly match the selected mode above. NEVER mix tones between modes.

Analyze the user's message for ALL of these threat categories:
1. PHISHING: urgency words ("immediately", "account blocked", "verify now", "KYC expired"), fake sender names
2. FRAUD LINKS: shortened URLs (bit.ly, tinyurl, goo.gl, etc.), unknown/suspicious domains
3. UPI SCAM: fake UPI IDs, payment requests, cashback fraud
4. FINANCIAL FRAUD: bank impersonation, fake loan offers, credit card fraud, investment scams, Ponzi schemes
5. STRANGER CONTACT: unknown sender patterns, social engineering
6. INAPPROPRIATE CONTENT: explicit, violent, or misleading content
7. HARASSMENT: threatening language, sextortion, blackmail
8. LATE NIGHT ACTIVITY: if context suggests unusual timing patterns
9. CYBERBULLYING: repeated targeting, mean messages, exclusion tactics, rumor spreading

MODE-SPECIFIC SEVERITY RULES:
- CHILD MODE: Auto-escalate stranger contact and explicit content to "danger" severity. Always set should_notify_parent=true for non-safe results.
- WOMEN MODE: Auto-escalate harassment and threats to "danger". Always set show_emergency_button=true for danger.
- PARENT MODE: Provide maximum detail. Never simplify threat analysis.

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
                    enum: ["phishing", "fraud_link", "stranger_contact", "upi_scam", "financial_fraud", "inappropriate_content", "harassment", "late_night_activity", "cyberbullying", "safe"],
                  },
                  severity: { type: "string", enum: ["safe", "caution", "danger"] },
                  title: { type: "string", description: "Short alert title adapted to the user's mode" },
                  message: { type: "string", description: "Explanation adapted to mode tone (simple for child, detailed for parent, action-oriented for women)" },
                  action_suggestion: { type: "string", description: "What the user should do next, adapted to their mode" },
                  should_notify_parent: { type: "boolean", description: "True if parent should be notified (always true for child mode non-safe)" },
                  show_emergency_button: { type: "boolean", description: "True if emergency action button should be shown (always true for women mode danger)" },
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

    // Mode-specific enforcement on server side
    if (profile_type === "child" && result.severity !== "safe") {
      result.should_notify_parent = true;
      // Auto-block dangerous content for children
      if (result.alert_type === "stranger_contact" || result.alert_type === "inappropriate_content") {
        result.severity = "danger";
      }
    }
    if (profile_type === "women" && result.severity === "danger") {
      result.show_emergency_button = true;
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
