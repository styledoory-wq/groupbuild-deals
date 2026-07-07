// Image migration worker.
//
// Strategy: use Supabase's own `/render/image` endpoint as the resize engine.
// It already produces WebP at the target width — we fetch that, then re-upload
// it under a new `.webp` filename with `cacheControl: 1 year, immutable` and
// update the DB row that referenced the old file.
//
// The original file is NEVER deleted. Rollback = flip the DB column back to
// `old_url` (kept in `image_migration_log`).
//
// Invocation: POST { bucket, limit? }  →  { processed, ok, failed, samples }
// One call = one small batch (default 5) for a specific bucket.

import { createClient } from "npm:@supabase/supabase-js@2";
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";

interface BucketPreset {
  width: number;
  quality: number;
}

// Match the client-side presets so the DB & re-uploads stay consistent with
// what the app uploads today.
const PRESETS: Record<string, BucketPreset> = {
  "deal-images": { width: 1200, quality: 82 },
  "supplier-gallery": { width: 1200, quality: 82 },
  "supplier-logos": { width: 400, quality: 85 },
  "avatars": { width: 400, quality: 85 },
};

interface Target {
  table: string;
  column: string;
  rowId: string;
  oldUrl: string;
  oldPath: string; // key inside the bucket
  arrayIndex?: number; // for jsonb array columns
}

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const admin = createClient(SUPABASE_URL, SERVICE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

function ensureExt(path: string): string {
  // Replace the trailing extension with .webp. If no extension, append.
  return path.replace(/\.[^./]+$/, "") + ".webp";
}

function toPathFromUrl(bucket: string, url: string): string | null {
  const marker = `/storage/v1/object/public/${bucket}/`;
  const i = url.indexOf(marker);
  if (i < 0) return null;
  return url.slice(i + marker.length).split("?")[0];
}

function publicUrl(bucket: string, path: string): string {
  return `${SUPABASE_URL}/storage/v1/object/public/${bucket}/${path}`;
}

async function loadTargets(bucket: string, limit: number): Promise<Target[]> {
  const out: Target[] = [];

  // Already-migrated rows we should skip: any (table,column,row) with an OK log.
  const { data: doneRows } = await admin
    .from("image_migration_log")
    .select("table_name, column_name, row_id")
    .eq("status", "ok")
    .eq("bucket", bucket);
  const done = new Set(
    (doneRows ?? []).map((r) => `${r.table_name}|${r.column_name}|${r.row_id}`),
  );
  const isDone = (t: string, c: string, id: string) => done.has(`${t}|${c}|${id}`);

  if (bucket === "deal-images") {
    const { data: deals } = await admin
      .from("deals")
      .select("id, cover_image_url, gallery_images");
    for (const d of deals ?? []) {
      if (out.length >= limit) break;
      if (d.cover_image_url && !isDone("deals", "cover_image_url", d.id)) {
        const p = toPathFromUrl("deal-images", d.cover_image_url);
        if (p) out.push({ table: "deals", column: "cover_image_url", rowId: d.id, oldUrl: d.cover_image_url, oldPath: p });
      }
      const gallery = Array.isArray(d.gallery_images) ? d.gallery_images : [];
      for (let i = 0; i < gallery.length; i++) {
        if (out.length >= limit) break;
        const u = gallery[i];
        const rowKey = `${d.id}#g${i}`;
        if (typeof u === "string" && u.includes("/deal-images/") && !isDone("deals", "gallery_images", rowKey)) {
          const p = toPathFromUrl("deal-images", u);
          if (p) out.push({ table: "deals", column: "gallery_images", rowId: rowKey, oldUrl: u, oldPath: p, arrayIndex: i });
        }
      }
    }
  } else if (bucket === "supplier-logos") {
    const { data } = await admin.from("suppliers").select("id, logo_url");
    for (const s of data ?? []) {
      if (out.length >= limit) break;
      if (s.logo_url && !isDone("suppliers", "logo_url", s.id)) {
        const p = toPathFromUrl("supplier-logos", s.logo_url);
        if (p) out.push({ table: "suppliers", column: "logo_url", rowId: s.id, oldUrl: s.logo_url, oldPath: p });
      }
    }
  } else if (bucket === "supplier-gallery") {
    const { data } = await admin.from("supplier_gallery").select("id, image_url");
    for (const g of data ?? []) {
      if (out.length >= limit) break;
      if (g.image_url && !isDone("supplier_gallery", "image_url", g.id)) {
        const p = toPathFromUrl("supplier-gallery", g.image_url);
        if (p) out.push({ table: "supplier_gallery", column: "image_url", rowId: g.id, oldUrl: g.image_url, oldPath: p });
      }
    }
  } else if (bucket === "avatars") {
    const { data } = await admin.from("profiles").select("id, avatar_url");
    for (const p of data ?? []) {
      if (out.length >= limit) break;
      if (p.avatar_url && p.avatar_url.includes("/avatars/") && !isDone("profiles", "avatar_url", p.id)) {
        const path = toPathFromUrl("avatars", p.avatar_url);
        if (path) out.push({ table: "profiles", column: "avatar_url", rowId: p.id, oldUrl: p.avatar_url, oldPath: path });
      }
    }
  }
  return out;
}

async function processOne(bucket: string, t: Target, runId: string): Promise<{ ok: boolean; error?: string; oldBytes?: number; newBytes?: number; newUrl?: string; newPath?: string }> {
  const preset = PRESETS[bucket];
  if (!preset) return { ok: false, error: `no preset for bucket ${bucket}` };

  // 1. Fetch original just to record its size (HEAD would work but not all
  //    storage responses expose Content-Length reliably).
  const originalPublic = publicUrl(bucket, t.oldPath);
  const origResp = await fetch(originalPublic);
  if (!origResp.ok) return { ok: false, error: `original fetch ${origResp.status}` };
  const origBuf = new Uint8Array(await origResp.arrayBuffer());
  const oldBytes = origBuf.length;

  // 2. Use Supabase render/image to produce a resized WebP.
  // NOTE: don't set format=origin — that pins the output to the source mime,
  // which prevents WebP even with Accept: image/webp. Omitting `format` lets
  // Supabase honour the Accept header and return WebP.
  const renderUrl = `${SUPABASE_URL}/storage/v1/render/image/public/${bucket}/${t.oldPath}?width=${preset.width}&quality=${preset.quality}&resize=contain`;
  const rResp = await fetch(renderUrl, { headers: { Accept: "image/webp" } });
  if (!rResp.ok) return { ok: false, error: `render ${rResp.status}` };
  const ct = rResp.headers.get("content-type") || "";
  if (!ct.includes("webp")) return { ok: false, error: `render returned ${ct}` };
  const webpBuf = new Uint8Array(await rResp.arrayBuffer());
  const newBytes = webpBuf.length;

  // 3. Upload under a new `.webp` filename. Original stays intact.
  const newPath = ensureExt(t.oldPath);
  const { error: upErr } = await admin.storage.from(bucket).upload(newPath, webpBuf, {
    contentType: "image/webp",
    cacheControl: "31536000",
    upsert: true,
  });
  if (upErr) return { ok: false, error: `upload ${upErr.message}` };
  const newUrl = publicUrl(bucket, newPath);

  // 4. Update the DB row that referenced the old URL.
  if (t.column === "gallery_images" && t.arrayIndex !== undefined) {
    const dealId = t.rowId.split("#")[0];
    const { data: cur } = await admin.from("deals").select("gallery_images").eq("id", dealId).single();
    const arr = Array.isArray(cur?.gallery_images) ? [...cur!.gallery_images] : [];
    if (arr[t.arrayIndex] === t.oldUrl) {
      arr[t.arrayIndex] = newUrl;
      const { error: updErr } = await admin.from("deals").update({ gallery_images: arr }).eq("id", dealId);
      if (updErr) return { ok: false, error: `db update ${updErr.message}` };
    } else {
      return { ok: false, error: `gallery drift at index ${t.arrayIndex}` };
    }
  } else {
    const { error: updErr } = await admin.from(t.table).update({ [t.column]: newUrl }).eq("id", t.rowId);
    if (updErr) return { ok: false, error: `db update ${updErr.message}` };
  }

  // 5. Audit log.
  await admin.from("image_migration_log").insert({
    run_id: runId,
    bucket,
    old_path: t.oldPath,
    old_url: t.oldUrl,
    new_path: newPath,
    new_url: newUrl,
    old_bytes: oldBytes,
    new_bytes: newBytes,
    table_name: t.table,
    column_name: t.column,
    row_id: t.rowId,
    status: "ok",
  });

  return { ok: true, oldBytes, newBytes, newUrl, newPath };
}

import { requireAdmin } from "../_shared/auth.ts";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  const auth = await requireAdmin(req);
  if (!auth.ok) return auth.response;
  try {
    const body = await req.json().catch(() => ({}));
    const bucket: string = body.bucket;
    const limit: number = Math.min(Number(body.limit) || 5, 20);
    if (!bucket || !PRESETS[bucket]) {
      return new Response(JSON.stringify({ error: `bad bucket: ${bucket}` }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const runId = body.run_id || `run_${new Date().toISOString().replace(/[:.]/g, "-")}`;
    const targets = await loadTargets(bucket, limit);
    const samples: Array<Record<string, unknown>> = [];
    let ok = 0, failed = 0;
    let totalOld = 0, totalNew = 0;

    for (const t of targets) {
      const res = await processOne(bucket, t, runId);
      if (res.ok) {
        ok++;
        totalOld += res.oldBytes ?? 0;
        totalNew += res.newBytes ?? 0;
        if (samples.length < 3) samples.push({ table: t.table, column: t.column, row: t.rowId, old_bytes: res.oldBytes, new_bytes: res.newBytes, new_url: res.newUrl });
      } else {
        failed++;
        await admin.from("image_migration_log").insert({
          run_id: runId,
          bucket,
          old_path: t.oldPath,
          old_url: t.oldUrl,
          table_name: t.table,
          column_name: t.column,
          row_id: t.rowId,
          status: "failed",
          error: res.error,
        });
        // Stop-on-error as requested.
        break;
      }
    }

    return new Response(JSON.stringify({
      run_id: runId,
      bucket,
      candidates: targets.length,
      processed: ok + failed,
      ok, failed,
      total_old_bytes: totalOld,
      total_new_bytes: totalNew,
      samples,
    }, null, 2), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e) {
    return new Response(JSON.stringify({ error: (e as Error).message }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
