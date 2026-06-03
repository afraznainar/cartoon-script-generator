// Supabase Edge Function: generate-script
// Securely proxies Anthropic API calls and saves script history to Supabase DB

import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

interface ScriptData {
  title: string;
  tagline: string;
  runtime: string;
  theme: string;
  bpm: number;
  key: string;
  style_note: string;
  char_name: string;
  char_emoji: string;
  char_look: string;
  setting: string;
  sig_move: string;
  actions: string[];
  verse1: string;
  chorus: string;
  verse2: string;
  verse3: string;
  bridge: string;
  outro: string;
  thumbnail: string;
}

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
};

serve(async (req: Request) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  try {
    const { topic } = await req.json();
    if (!topic || typeof topic !== "string" || topic.trim().length === 0) {
      return new Response(JSON.stringify({ error: "Topic is required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const apiKey = Deno.env.get("ANTHROPIC_API_KEY");
    if (!apiKey) {
      return new Response(JSON.stringify({ error: "Server misconfigured: missing API key" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ── Call Anthropic API ──────────────────────────────────────────────
    const systemPrompt = `You write compact children's cartoon video scripts. Reply ONLY with a single JSON object — no markdown fences, no extra text.

Required fields (keep every string SHORT):
{
  "title": "Catchy title + 1 emoji (max 7 words)",
  "tagline": "One sentence",
  "runtime": "2:10",
  "theme": "2-3 words",
  "bpm": 95,
  "key": "C major",
  "style_note": "4 words",
  "char_name": "Character first name",
  "char_emoji": "One emoji",
  "char_look": "Age, skin tone, eyes, hair, outfit. Max 20 words.",
  "setting": "Where action happens. Max 10 words.",
  "sig_move": "Simple physical move kids copy. Max 8 words.",
  "actions": [
    "action A — 8 words max",
    "action B — 8 words max",
    "action C — 8 words max",
    "action D — 8 words max"
  ],
  "verse1": "Line 1\\nLine 2\\nLine 3\\nLine 4",
  "chorus": "Line 1\\nLine 2\\nLine 3\\nLine 4",
  "verse2": "Line 1\\nLine 2\\nLine 3\\nLine 4",
  "verse3": "Line 1\\nLine 2\\nLine 3\\nLine 4",
  "bridge": "Line 1\\nLine 2\\nLine 3\\nLine 4",
  "outro": "Bye line 1\\nBye line 2",
  "thumbnail": "Midjourney prompt: cartoon toddler close-up, huge eyes, bright background, bold text area. 25 words max."
}`;

    const anthropicResponse = await fetch(
      "https://api.anthropic.com/v1/messages",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-api-key": apiKey,
          "anthropic-version": "2023-06-01",
        },
        body: JSON.stringify({
          model: "claude-sonnet-4-20250514",
          max_tokens: 1000,
          system: systemPrompt,
          messages: [
            {
              role: "user",
              content: `Topic: "${topic}". Make the chorus catchy with a simple physical move kids can copy.`,
            },
          ],
        }),
      }
    );

    if (!anthropicResponse.ok) {
      const errorText = await anthropicResponse.text();
      throw new Error(`Anthropic API error ${anthropicResponse.status}: ${errorText}`);
    }

    const anthropicData = await anthropicResponse.json();
    const rawContent = anthropicData.content?.find((b: any) => b.type === "text")?.text || "{}";
    const cleaned = rawContent
      .replace(/^```[a-z]*\n?/, "")
      .replace(/\n?```\s*$/, "")
      .trim();

    let scriptData: ScriptData;
    try {
      scriptData = JSON.parse(cleaned);
    } catch {
      // Attempt repair for truncated JSON
      const repaired = repairJson(cleaned);
      scriptData = JSON.parse(repaired);
    }

    // ── Save to Supabase DB ─────────────────────────────────────────────
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseKey = Deno.env.get("SUPABASE_ANON_KEY");

    if (supabaseUrl && supabaseKey) {
      const supabase = createClient(supabaseUrl, supabaseKey);

      const { error: insertError } = await supabase.from("scripts").insert({
        keyword: topic.trim(),
        title: scriptData.title,
        tagline: scriptData.tagline,
        runtime: scriptData.runtime,
        theme: scriptData.theme,
        bpm: scriptData.bpm,
        key: scriptData.key,
        style_note: scriptData.style_note,
        char_name: scriptData.char_name,
        char_emoji: scriptData.char_emoji,
        char_look: scriptData.char_look,
        setting: scriptData.setting,
        sig_move: scriptData.sig_move,
        actions: scriptData.actions,
        verse1: scriptData.verse1,
        chorus: scriptData.chorus,
        verse2: scriptData.verse2,
        verse3: scriptData.verse3,
        bridge: scriptData.bridge,
        outro: scriptData.outro,
        thumbnail: scriptData.thumbnail,
      });

      if (insertError) {
        console.error("Failed to save script:", insertError.message);
        // Don't fail the request — still return the script
      }
    }

    return new Response(JSON.stringify({ success: true, data: scriptData }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    console.error("generate-script error:", message);
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

// ── Repair truncated JSON ─────────────────────────────────────────────
function repairJson(s: string): string {
  let t = s.trim();
  let br = 0;
  let sq = 0;
  let ins = false;
  let es = false;

  for (let i = 0; i < t.length; i++) {
    const c = t[i];
    if (es) { es = false; continue; }
    if (c === "\\" && ins) { es = true; continue; }
    if (c === '"') { ins = !ins; continue; }
    if (!ins) {
      if (c === "{") br++;
      else if (c === "}") br--;
      else if (c === "[") sq++;
      else if (c === "]") sq--;
    }
  }
  t = t.replace(/,\s*$/, "");
  if (ins) t += '"';
  while (sq > 0) { t += "]"; sq--; }
  while (br > 0) { t += "}"; br--; }
  return t;
}
