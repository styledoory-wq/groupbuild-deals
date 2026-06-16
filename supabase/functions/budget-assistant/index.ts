import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";

const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");

type Category = { name: string; slug: string; min: number; avg: number; max: number; note?: string };
type Budget = {
  track: string;
  total: { min: number; avg: number; max: number };
  categories: Category[];
  inputsSummary: string;
};
type Msg = { role: "user" | "assistant"; content: string };

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    if (!LOVABLE_API_KEY) {
      return new Response(JSON.stringify({ error: "AI not configured" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const { budget, messages } = (await req.json()) as { budget: Budget; messages: Msg[] };
    if (!budget?.total || !Array.isArray(messages)) {
      return new Response(JSON.stringify({ error: "Invalid input" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const ils = (n: number) => `${Math.round(n).toLocaleString("he-IL")} ₪`;
    const breakdown = budget.categories
      .map((c) => `- ${c.name}: ${ils(c.min)} – ${ils(c.max)} (ממוצע ${ils(c.avg)})`)
      .join("\n");

    const system = `אתה יועץ תקציב שיפוצים ובנייה מקצועי לישראל, מדבר עברית.
כללי ברזל:
1. **אסור לך להמציא מחירים**. השתמש אך ורק במספרים שמופיעים בהערכה הבאה.
2. תפקידך: להסביר את החישוב, לזהות חריגות, להציע דרכי חיסכון, ולהמליץ לפנות לקטגוריות המתאימות בעסקאות GroupBuild באפליקציה.
3. ענה תמיד בעברית, קצר וממוקד (עד 5-6 שורות). השתמש ב-bullet points כשמתאים.
4. אם חסר מידע — שאל שאלה ממוקדת אחת.

הערכת התקציב הנוכחית:
מסלול: ${budget.track}
פרטים: ${budget.inputsSummary}
סה"כ: ${ils(budget.total.min)} – ${ils(budget.total.max)} (ממוצע ${ils(budget.total.avg)})

פירוט קטגוריות:
${breakdown}`;

    const aiRes = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${LOVABLE_API_KEY}` },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: system },
          ...messages.slice(-10).map((m) => ({ role: m.role, content: m.content })),
        ],
      }),
    });

    if (!aiRes.ok) {
      const text = await aiRes.text();
      console.error("AI error", aiRes.status, text);
      return new Response(JSON.stringify({ error: `AI error ${aiRes.status}` }), {
        status: aiRes.status, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const data = await aiRes.json();
    const reply = data?.choices?.[0]?.message?.content ?? "";
    return new Response(JSON.stringify({ reply }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error(e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
