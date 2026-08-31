import postgres from "https://deno.land/x/postgresjs@v3.4.4/mod.js";
Deno.serve(async (req) => {
  const token = req.headers.get("x-qa-token");
  if (token !== "qa-2026-08-31-migrate") return new Response("nope", { status: 403 });
  const sql = await req.text();
  const url = Deno.env.get("SUPABASE_DB_URL");
  if (!url) return new Response(JSON.stringify({ error: "no db url" }), { status: 500 });
  const db = postgres(url, { prepare: false });
  try {
    await db.unsafe(sql);
    return new Response(JSON.stringify({ ok: true }), { headers: { "Content-Type": "application/json" } });
  } catch (e) {
    return new Response(JSON.stringify({ ok: false, error: String(e) }), { status: 200, headers: { "Content-Type": "application/json" } });
  } finally {
    await db.end();
  }
});
