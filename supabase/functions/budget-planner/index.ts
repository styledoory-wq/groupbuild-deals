import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";

const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");

type FormData = {
  apartmentSize: number;
  renovationType: "basic" | "standard" | "luxury";
  rooms: number;
  flooringType: string;
  newKitchen: boolean;
  bathrooms: number;
  city: string;
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    if (!LOVABLE_API_KEY) {
      return new Response(JSON.stringify({ error: "AI gateway not configured" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const body = (await req.json()) as FormData;
    if (!body || typeof body.apartmentSize !== "number" || body.apartmentSize <= 0) {
      return new Response(JSON.stringify({ error: "Invalid input" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const renovationLabel =
      body.renovationType === "basic" ? "בסיסי" : body.renovationType === "luxury" ? "יוקרתי" : "סטנדרטי";

    const prompt = `אתה יועץ שיפוצים ישראלי. המשתמש רוצה לשפץ דירה.
הנתונים:
- גודל דירה: ${body.apartmentSize} מ"ר
- סוג שיפוץ: ${renovationLabel}
- מספר חדרים: ${body.rooms}
- סוג ריצוף: ${body.flooringType}
- מטבח חדש: ${body.newKitchen ? "כן" : "לא"}
- מספר חדרי רחצה: ${body.bathrooms}
- עיר: ${body.city}

תן הערכת עלות בשקלים עם פירוט לפי קטגוריות (ריצוף, מטבח, חדרי רחצה, צבע, חשמל, אינסטלציה, גבס, דלתות), ואת ההנחה המשוערת דרך GroupBuild (15-25%).
החזר JSON בלבד בפורמט מדויק:
{ "total_min": number, "total_max": number, "discount_min": number, "discount_max": number, "categories": [{ "name": string, "min": number, "max": number }] }`;

    const aiRes = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: "You return JSON only. No markdown, no prose." },
          { role: "user", content: prompt },
        ],
        response_format: { type: "json_object" },
      }),
    });

    if (!aiRes.ok) {
      const text = await aiRes.text();
      console.error("AI error", aiRes.status, text);
      if (aiRes.status === 429) {
        return new Response(JSON.stringify({ error: "מערכת ה-AI עמוסה כרגע, נסה שוב בעוד רגע" }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (aiRes.status === 402) {
        return new Response(JSON.stringify({ error: "נגמרו הקרדיטים לשירות ה-AI" }), {
          status: 402,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      return new Response(JSON.stringify({ error: "שגיאה בחישוב התקציב" }), {
        status: 502,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const data = await aiRes.json();
    const content = data?.choices?.[0]?.message?.content ?? "{}";
    let parsed: unknown;
    try {
      parsed = JSON.parse(content);
    } catch {
      // Try to extract JSON block
      const match = String(content).match(/\{[\s\S]*\}/);
      parsed = match ? JSON.parse(match[0]) : {};
    }

    return new Response(JSON.stringify(parsed), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error(e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
