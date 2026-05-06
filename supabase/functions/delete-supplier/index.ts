// Edge function: delete-supplier
// Admin-only. Performs a full, hard delete of a supplier:
//   - removes storage files (logos, gallery, catalogs)
//   - deletes supplier_catalogs, supplier_gallery, supplier_regions, supplier_cities rows
//   - soft-deletes the supplier's deals (audit-safe; deposits remain untouched)
//   - deletes the supplier row, the profile, the user_role, and the auth user
// This frees the email so it can be reused for signup.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

async function removeBucketFolder(
  admin: ReturnType<typeof createClient>,
  bucket: string,
  folder: string,
) {
  try {
    const { data, error } = await admin.storage.from(bucket).list(folder, {
      limit: 1000,
    });
    if (error) {
      console.warn(`[delete-supplier] list ${bucket}/${folder}`, error.message);
      return;
    }
    if (!data || data.length === 0) return;
    const paths = data.map((f) => `${folder}/${f.name}`);
    const { error: delErr } = await admin.storage.from(bucket).remove(paths);
    if (delErr) console.warn(`[delete-supplier] remove ${bucket}`, delErr.message);
  } catch (e) {
    console.warn(`[delete-supplier] bucket ${bucket} cleanup failed`, e);
  }
}

function extractStoragePath(publicUrl: string, bucket: string): string | null {
  try {
    const marker = `/object/public/${bucket}/`;
    const i = publicUrl.indexOf(marker);
    if (i === -1) return null;
    return decodeURIComponent(publicUrl.slice(i + marker.length));
  } catch {
    return null;
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

    const authHeader = req.headers.get("Authorization") ?? "";
    const token = authHeader.replace(/^Bearer\s+/i, "");
    if (!token) return json({ error: "Missing authorization" }, 401);

    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;

    // Verify caller is an admin via their JWT
    const userClient = createClient(SUPABASE_URL, ANON_KEY, {
      global: { headers: { Authorization: `Bearer ${token}` } },
    });
    const { data: userRes, error: userErr } = await userClient.auth.getUser();
    if (userErr || !userRes.user) return json({ error: "Unauthorized" }, 401);

    const callerId = userRes.user.id;
    const admin = createClient(SUPABASE_URL, SERVICE_KEY);

    const { data: roleRow } = await admin
      .from("user_roles")
      .select("role")
      .eq("user_id", callerId)
      .eq("role", "admin")
      .maybeSingle();
    if (!roleRow) return json({ error: "Forbidden — admin only" }, 403);

    const body = await req.json().catch(() => ({}));
    const supplierId: string | undefined = body?.supplier_id;
    if (!supplierId || typeof supplierId !== "string") {
      return json({ error: "supplier_id required" }, 400);
    }

    // Load the supplier so we know which auth user / files to remove
    const { data: supplier, error: supErr } = await admin
      .from("suppliers")
      .select("id, user_id, email, logo_url")
      .eq("id", supplierId)
      .maybeSingle();
    if (supErr) return json({ error: supErr.message }, 500);
    if (!supplier) return json({ error: "Supplier not found" }, 404);

    const targetUserId: string | null = supplier.user_id ?? null;

    // 1) Delete storage files we know about by folder (uploads use uid/{file})
    if (targetUserId) {
      await Promise.all([
        removeBucketFolder(admin, "supplier-logos", targetUserId),
        removeBucketFolder(admin, "supplier-gallery", targetUserId),
        removeBucketFolder(admin, "supplier-catalogs", targetUserId),
      ]);
    }

    // 2) Best-effort: also remove any catalog/gallery/logo files that may be
    //    stored under different folders (e.g. uploaded by an admin)
    try {
      const [{ data: cats }, { data: gal }] = await Promise.all([
        admin.from("supplier_catalogs").select("file_url").eq("supplier_id", supplierId),
        admin.from("supplier_gallery").select("image_url").eq("supplier_id", supplierId),
      ]);
      const catPaths = (cats ?? [])
        .map((r: { file_url: string }) => extractStoragePath(r.file_url, "supplier-catalogs"))
        .filter((p): p is string => !!p);
      const galPaths = (gal ?? [])
        .map((r: { image_url: string }) => extractStoragePath(r.image_url, "supplier-gallery"))
        .filter((p): p is string => !!p);
      const logoPath = supplier.logo_url
        ? extractStoragePath(String(supplier.logo_url), "supplier-logos")
        : null;
      if (catPaths.length) await admin.storage.from("supplier-catalogs").remove(catPaths);
      if (galPaths.length) await admin.storage.from("supplier-gallery").remove(galPaths);
      if (logoPath) await admin.storage.from("supplier-logos").remove([logoPath]);
    } catch (e) {
      console.warn("[delete-supplier] file cleanup", e);
    }

    // 3) Delete child rows
    await admin.from("supplier_catalogs").delete().eq("supplier_id", supplierId);
    await admin.from("supplier_gallery").delete().eq("supplier_id", supplierId);
    await admin.from("supplier_regions").delete().eq("supplier_id", supplierId);
    await admin.from("supplier_cities").delete().eq("supplier_id", supplierId);

    // 4) Audit-safe handling for deals: soft-delete + deactivate.
    //    Deposits are NOT touched — they keep their deal_id text and
    //    paid_at/refunded_at history for accounting.
    await admin
      .from("deals")
      .update({
        is_deleted: true,
        deleted_at: new Date().toISOString(),
        status: "inactive",
      })
      .eq("supplier_id", supplierId);

    // 5) Delete the supplier row itself
    {
      const { error } = await admin.from("suppliers").delete().eq("id", supplierId);
      if (error) return json({ error: `supplier delete: ${error.message}` }, 500);
    }

    // 6) Free the auth account so the email becomes reusable
    if (targetUserId) {
      await admin.from("user_roles").delete().eq("user_id", targetUserId);
      await admin.from("profiles").delete().eq("id", targetUserId);
      const { error: authErr } = await admin.auth.admin.deleteUser(targetUserId);
      if (authErr) {
        console.warn("[delete-supplier] auth delete failed", authErr.message);
        // do not fail the whole operation; the supplier record is gone already
      }
    }

    return json({ ok: true, supplier_id: supplierId, auth_user_deleted: !!targetUserId });
  } catch (e) {
    console.error("[delete-supplier] error", e);
    return json(
      { error: e instanceof Error ? e.message : "Unknown error" },
      500,
    );
  }
});
