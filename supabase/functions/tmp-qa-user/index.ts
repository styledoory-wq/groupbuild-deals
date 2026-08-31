import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
Deno.serve(async (req) => {
  const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
  const { email, password, del } = await req.json();
  if (del) {
    const { data } = await admin.auth.admin.listUsers({ page: 1, perPage: 1000 });
    const u = data.users.find((x) => x.email === email);
    if (u) await admin.auth.admin.deleteUser(u.id);
    return new Response(JSON.stringify({ deleted: !!u }), { headers: { "Content-Type": "application/json" } });
  }
  const { data, error } = await admin.auth.admin.createUser({ email, password, email_confirm: true, user_metadata: { full_name: "QA Resident", user_type: "resident" } });
  return new Response(JSON.stringify({ id: data?.user?.id ?? null, error: error?.message ?? null }), { headers: { "Content-Type": "application/json" } });
});
