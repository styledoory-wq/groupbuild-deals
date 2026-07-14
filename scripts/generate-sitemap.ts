// Runs before `vite build` (prebuild hook); writes public/sitemap.xml
// Pulls dynamic supplier + category slugs from Supabase so every public page
// is discoverable by search engines.

import { writeFileSync } from "fs";
import { resolve } from "path";
import { createClient } from "@supabase/supabase-js";

const BASE_URL = "https://groupbuild.co.il";

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const SUPABASE_ANON =
  process.env.VITE_SUPABASE_PUBLISHABLE_KEY ||
  process.env.VITE_SUPABASE_ANON_KEY ||
  process.env.SUPABASE_ANON_KEY;

interface SitemapEntry {
  path: string;
  lastmod?: string;
  changefreq?: "always" | "hourly" | "daily" | "weekly" | "monthly" | "yearly" | "never";
  priority?: string;
}

const staticEntries: SitemapEntry[] = [
  { path: "/", changefreq: "weekly", priority: "1.0" },
  { path: "/browse", changefreq: "daily", priority: "0.9" },
  { path: "/deals", changefreq: "daily", priority: "0.9" },
  { path: "/categories", changefreq: "weekly", priority: "0.8" },
  { path: "/suppliers", changefreq: "weekly", priority: "0.7" },
  { path: "/residents", changefreq: "weekly", priority: "0.7" },
  { path: "/support", changefreq: "monthly", priority: "0.5" },
  { path: "/privacy", changefreq: "yearly", priority: "0.3" },
  { path: "/terms/residents", changefreq: "yearly", priority: "0.3" },
  { path: "/terms/suppliers", changefreq: "yearly", priority: "0.3" },
];

async function fetchDynamicEntries(): Promise<SitemapEntry[]> {
  if (!SUPABASE_URL || !SUPABASE_ANON) {
    console.warn("[sitemap] Supabase env not set — skipping dynamic entries");
    return [];
  }
  const supabase = createClient(SUPABASE_URL, SUPABASE_ANON);
  const entries: SitemapEntry[] = [];

  const [{ data: suppliers }, { data: categories }, { data: combos, error: combosErr }] = await Promise.all([
    supabase
      .from("suppliers")
      .select("slug, updated_at")
      .eq("is_active", true)
      .in("approval_status", ["approved", "active"])
      .not("slug", "is", null),
    supabase
      .from("categories")
      .select("slug, updated_at")
      .eq("is_active", true)
      .eq("is_deleted", false)
      .not("slug", "is", null),
    supabase.rpc("sitemap_city_category_combos"),
  ]);

  (suppliers ?? []).forEach((s) => {
    if (s.slug) {
      entries.push({
        path: `/supplier/${s.slug}`,
        lastmod: s.updated_at?.slice(0, 10),
        changefreq: "weekly",
        priority: "0.8",
      });
    }
  });
  (categories ?? []).forEach((c) => {
    if (c.slug) {
      entries.push({
        path: `/category/${c.slug}`,
        lastmod: c.updated_at?.slice(0, 10),
        changefreq: "weekly",
        priority: "0.7",
      });
    }
  });

  // City × Category pages — ONLY combos that meet quality thresholds
  // (≥3 approved suppliers, ≥1 with full profile+image). Enforced by RPC.
  if (combosErr) {
    console.warn("[sitemap] sitemap_city_category_combos failed:", combosErr.message);
  }
  ((combos ?? []) as Array<{ city_slug: string; category_slug: string }>).forEach((c) => {
    entries.push({
      path: `/city/${c.city_slug}/${c.category_slug}`,
      changefreq: "weekly",
      priority: "0.6",
    });
  });

  return entries;
}

function renderSitemap(entries: SitemapEntry[]) {
  const urls = entries.map((e) =>
    [
      `  <url>`,
      `    <loc>${BASE_URL}${e.path}</loc>`,
      e.lastmod ? `    <lastmod>${e.lastmod}</lastmod>` : null,
      e.changefreq ? `    <changefreq>${e.changefreq}</changefreq>` : null,
      e.priority ? `    <priority>${e.priority}</priority>` : null,
      `  </url>`,
    ]
      .filter(Boolean)
      .join("\n"),
  );
  return [
    `<?xml version="1.0" encoding="UTF-8"?>`,
    `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">`,
    ...urls,
    `</urlset>`,
  ].join("\n");
}

async function main() {
  const dynamic = await fetchDynamicEntries();
  const entries = [...staticEntries, ...dynamic];
  writeFileSync(resolve("public/sitemap.xml"), renderSitemap(entries));
  console.log(`sitemap.xml written (${entries.length} entries)`);
}

main().catch((e) => {
  console.error("[sitemap] failed:", e);
  process.exitCode = 0; // never break the build
});
