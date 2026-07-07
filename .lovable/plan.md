
# Plan: Security Hardening + SEO Overhaul

Two sequential phases. Phase 1 must be green before Phase 2 starts.

---

## Phase 1 — Critical Security Fixes

### 1A. Edge function auth (critical/error level)
Add auth guards to unauthenticated edge functions. All checks: parse `Authorization`, call `supabase.auth.getUser()`, verify role via `user_roles`.

- **`migrate-storage-image`** (ERROR): admin-only guard.
- **`notify-admin`** (ERROR): admin-only guard; remove `recipient` from response body.
- **`ai-enhance-deal`, `generate-marketing-card`, `generate-offer-ai`, `budget-assistant`, `budget-planner`**: require authenticated user (prevents AI credit abuse).
- **`send-deal-reminders`, `send-supplier-profile-reminders`, `dispatch-fallback`**: require service-role JWT (cron-only).
- **`dispatch-notification`**: require admin or service-role.
- **`send-email`** unguarded types (`new_offer`, `deal_status_changed`, `welcome`, `tier_unlocked`): restrict to admin/service-role.
- **`enhance-uploaded-image`** SSRF: validate `sourceUrl` starts with Supabase storage public URL; reject private IPs / non-https.

### 1B. Database / RLS (migrations)
- **`suppliers` bank/payment columns** (ERROR): revoke public `SELECT` on `bank_account_number`, `bank_branch`, `bank_name`, `bank_account_holder`, `bit_phone`, `payment_instructions_note`. Keep visible to supplier owner + admin via existing policies.
- **`system_settings`**: restrict `SELECT` to authenticated; expose only client-needed fields via a view/RPC if needed.
- **`avatars` bucket**: replace blanket public-read with owner-scoped policy (folder path = `auth.uid()`); or accept as public if intentional (I'll enforce owner-scoped).
- **Function `search_path` mutable warnings**: add `SET search_path = public` to affected `SECURITY DEFINER` functions.

### 1C. Dependencies
- Upgrade `react-router-dom` to a patched version.
- Upgrade `recharts` to a version pulling patched lodash (or patch lodash directly).

Verification: re-run `security--run_security_scan`; mark findings fixed.

---

## Phase 2 — SEO Overhaul

### 2A. Infrastructure
- Install `react-helmet-async`; add `<HelmetProvider>` in `src/main.tsx`.
- Create `<Seo>` helper component (title, description, canonical, og:*, twitter:*, optional JSON-LD).
- Remove per-route canonical from `index.html` (Helmet owns it), keep sitewide og:* fallback.
- Add sitewide `Organization` + `WebSite` JSON-LD to `index.html`.

### 2B. Per-page metadata (public routes)
Add `<Seo>` to: `Landing`, `SiteLanding`, `ResidentsLanding`, `SuppliersLanding`, `Gateway`, `Browse`, `CategoriesList`, `DealsList`, `DealDetail` (dynamic), `SharedDeal`, `Search`, `Support`, `Privacy`, `TermsResidents`, `TermsSuppliers`, `Auth`, `NotFound`.

Each page: unique title <60ch, description <160ch, canonical, og:title/description/url/type, twitter card.

### 2C. Structured data
- `Organization` + `WebSite` sitewide.
- `LocalBusiness` on `SiteLanding` / `ResidentsLanding`.
- `FAQPage` on `Support`.
- `BreadcrumbList` on category/deal pages.
- `Product`/`Offer` on `DealDetail` and `SharedDeal`.

### 2D. Heading hierarchy audit
Ensure every public page has exactly one `<h1>`; demote extras to `<h2>`/`<h3>`. Sweep listed pages.

### 2E. Images / alt text
Sweep `<img>` in public pages and marketing components; add descriptive `alt`. Decorative → `alt=""`.

### 2F. sitemap.xml / robots.txt
- Current `public/sitemap.xml` is static and current. Extend to include marketing routes (`/residents`, `/suppliers`, `/gateway`) if present.
- Consider adding a `predev`/`prebuild` generator script for dynamic deal URLs — **skip for now** unless user requests; keep static file.
- `robots.txt` is already correct — no change.

### 2G. Performance / Core Web Vitals
- Verify LCP image preload on landing pages.
- Ensure heavy admin/supplier routes are lazy-loaded in `App.tsx` (audit and add `React.lazy` where missing).
- Add `loading="lazy"` and `decoding="async"` to non-LCP images.

### 2H. Verify
- Run `seo_chat--trigger_scan`.

---

## Notes / Non-goals
- Not touching internal admin/resident/supplier authenticated routes for SEO (already `Disallow`ed in robots.txt).
- Not migrating sitemap to a generator unless you ask.
- Not changing visual design — SEO work is head-tag + semantic HTML only.

Confirm and I'll start with Phase 1A (edge function auth guards) and Phase 1B (RLS migration) in parallel.
