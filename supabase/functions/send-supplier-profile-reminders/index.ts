// Sends supplier profile-completion reminders to suppliers who registered
// more than 7 days ago but haven't completed their profile yet.
// Invoked by pg_cron daily; also callable manually per-supplier (?supplier_id=...).

import { createClient } from 'npm:@supabase/supabase-js@2'
import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors'

const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000
const APP_URL = 'https://groupbuild.co.il'

interface SupplierRow {
  id: string
  business_name: string | null
  phone: string | null
  email: string | null
  categories: string[] | null
  serves_all_country: boolean | null
  short_description: string | null
  description: string | null
  created_at: string | null
  profile_reminder_sent_at: string | null
}

function missingFields(
  s: SupplierRow,
  regionsCount: number,
  citiesCount: number,
): string[] {
  const missing: string[] = []
  if (!s.business_name || s.business_name.trim().length < 2) missing.push('שם עסק')
  if (!s.phone || s.phone.replace(/\D/g, '').length < 9) missing.push('טלפון')
  if (!s.email || !/.+@.+\..+/.test(s.email)) missing.push('אימייל')
  if (!Array.isArray(s.categories) || s.categories.length === 0) missing.push('תחום פעילות')
  if (!s.serves_all_country && regionsCount === 0 && citiesCount === 0) missing.push('אזור/עיר שירות')
  const desc = (s.short_description ?? '').trim() || (s.description ?? '').trim()
  if (desc.length < 10) missing.push('תיאור עסק')
  return missing
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders })

  const url = Deno.env.get('SUPABASE_URL')!
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  const supabase = createClient(url, serviceKey)

  // Optional: force sending for a single supplier (manual "send reminder" button).
  let forceSupplierId: string | null = null
  try {
    if (req.method === 'POST') {
      const body = await req.json().catch(() => ({}))
      forceSupplierId = body?.supplier_id ?? null
    } else {
      const u = new URL(req.url)
      forceSupplierId = u.searchParams.get('supplier_id')
    }
  } catch { /* noop */ }

  const cutoff = new Date(Date.now() - SEVEN_DAYS_MS).toISOString()

  let query = supabase
    .from('suppliers')
    .select('id,business_name,phone,email,categories,serves_all_country,short_description,description,created_at,profile_reminder_sent_at')
    .eq('is_deleted', false)

  if (forceSupplierId) {
    query = query.eq('id', forceSupplierId)
  } else {
    query = query
      .is('profile_reminder_sent_at', null)
      .lte('created_at', cutoff)
  }

  const { data: suppliers, error } = await query.returns<SupplierRow[]>()
  if (error) {
    console.error('[reminder] load suppliers failed', error)
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }

  const results: Array<{ supplier_id: string; status: string; reason?: string }> = []

  for (const s of suppliers ?? []) {
    if (!s.email) {
      results.push({ supplier_id: s.id, status: 'skipped', reason: 'no_email' })
      continue
    }
    const [{ count: rc }, { count: cc }] = await Promise.all([
      supabase.from('supplier_regions').select('region_id', { count: 'exact', head: true }).eq('supplier_id', s.id),
      supabase.from('supplier_cities').select('city_id', { count: 'exact', head: true }).eq('supplier_id', s.id),
    ])
    const missing = missingFields(s, rc ?? 0, cc ?? 0)
    if (missing.length === 0) {
      results.push({ supplier_id: s.id, status: 'skipped', reason: 'complete' })
      continue
    }
    const totalSteps = 6
    const percent = Math.round(((totalSteps - missing.length) / totalSteps) * 100)

    const { error: sendErr } = await supabase.functions.invoke('send-transactional-email', {
      body: {
        templateName: 'supplier-profile-reminder',
        recipientEmail: s.email,
        idempotencyKey: `supplier-profile-reminder-${s.id}-${new Date().toISOString().slice(0, 10)}`,
        templateData: {
          businessName: s.business_name ?? '',
          missing,
          percent,
          onboardingUrl: `${APP_URL}/supplier/onboarding`,
        },
      },
    })

    if (sendErr) {
      console.error('[reminder] send failed', s.id, sendErr)
      results.push({ supplier_id: s.id, status: 'error', reason: sendErr.message })
      continue
    }

    await supabase
      .from('suppliers')
      .update({ profile_reminder_sent_at: new Date().toISOString() })
      .eq('id', s.id)

    results.push({ supplier_id: s.id, status: 'sent' })
  }

  return new Response(
    JSON.stringify({ processed: results.length, results }),
    { headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
  )
})
