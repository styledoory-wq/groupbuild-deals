/**
 * Platform participation fees (דמי השתתפות).
 *
 * Fee amounts are NEVER hard-coded for charging — they come from the
 * `platform_fees` table (admin-managed). This module provides:
 *  - labels / copy
 *  - deal-price extraction
 *  - pure rule matching (for UI + tests)
 *  - thin helpers over Supabase RPC / table reads
 */

import { describeOffer, type OfferPricing } from "@/lib/offerPricing";
import { supabase } from "@/integrations/supabase/client";

export const PARTICIPATION_FEE_LABEL = "דמי השתתפות";

export const PARTICIPATION_FEE_DESCRIPTION =
  "דמי השתתפות חד-פעמיים לפלטפורמה עבור ניהול הקבוצה, שמירת המקום ותמיכה. משולמים בעת ההצטרפות ואינם חלק מהתשלום לספק.";

/** @deprecated Use PARTICIPATION_FEE_LABEL — kept for transitional imports */
export const JOINING_FEE_LABEL = PARTICIPATION_FEE_LABEL;
/** @deprecated */
export const JOINING_FEE_DESCRIPTION = PARTICIPATION_FEE_DESCRIPTION;
/** @deprecated Hard-coded fallback removed — fees come from platform_fees */
export const JOINING_FEE_ILS = 0;

export type PlatformFeeRule = {
  id: string;
  name: string | null;
  fee_type: string;
  min_deal_price: number;
  max_deal_price: number | null;
  fee_amount: number;
  currency: string;
  is_active: boolean;
  category_id?: string | null;
  offer_type?: string | null;
  listing_type?: string | null;
  priority?: number;
  sort_order?: number;
  conditions?: Record<string, unknown> | null;
};

export type FeeMatchContext = {
  dealPrice: number;
  feeType?: string;
  categoryId?: string | null;
  offerType?: string | null;
  listingType?: string | null;
};

export type ResolvedParticipationFee = {
  dealPrice: number;
  feeAmount: number;
  totalDueNow: number;
  rule: PlatformFeeRule | null;
  currency: string;
};

/** Extract the numeric deal price used for fee-band matching. */
export function getDealPriceForFee(
  deal: Partial<OfferPricing> & {
    original_price?: number | null;
    discounted_price?: number | null;
    base_price?: number | null;
  },
  participants = 0,
): number {
  const display = describeOffer(deal, participants);
  if (display.effectivePrice != null && Number.isFinite(display.effectivePrice) && display.effectivePrice > 0) {
    return Number(display.effectivePrice);
  }
  const fallbacks = [
    deal.discounted_price,
    deal.base_price,
    deal.original_price,
    display.referencePrice,
  ];
  for (const v of fallbacks) {
    const n = Number(v);
    if (Number.isFinite(n) && n > 0) return n;
  }
  return 0;
}

/**
 * Pure matcher — pick the best active rule for a context.
 * Specificity (category/offer/listing) > priority > sort_order.
 */
export function matchPlatformFeeRule(
  rules: PlatformFeeRule[],
  ctx: FeeMatchContext,
): PlatformFeeRule | null {
  const feeType = ctx.feeType ?? "participation";
  const price = Math.max(0, Number(ctx.dealPrice) || 0);

  const candidates = rules
    .filter((r) => r.is_active && (r.fee_type || "participation") === feeType)
    .filter((r) => price >= Number(r.min_deal_price))
    .filter((r) => r.max_deal_price == null || price <= Number(r.max_deal_price))
    .filter((r) => r.category_id == null || r.category_id === ctx.categoryId)
    .filter((r) => r.offer_type == null || r.offer_type === ctx.offerType)
    .filter((r) => r.listing_type == null || r.listing_type === ctx.listingType);

  if (!candidates.length) return null;

  candidates.sort((a, b) => {
    const spec = (r: PlatformFeeRule) =>
      (r.category_id ? 0 : 1) + (r.offer_type ? 0 : 1) + (r.listing_type ? 0 : 1);
    const bySpec = spec(a) - spec(b);
    if (bySpec !== 0) return bySpec;
    const byPri = (a.priority ?? 100) - (b.priority ?? 100);
    if (byPri !== 0) return byPri;
    return (a.sort_order ?? 0) - (b.sort_order ?? 0);
  });

  return candidates[0];
}

export function resolveParticipationFeeFromRules(
  rules: PlatformFeeRule[],
  ctx: FeeMatchContext,
): ResolvedParticipationFee {
  const dealPrice = Math.max(0, Number(ctx.dealPrice) || 0);
  const rule = matchPlatformFeeRule(rules, { ...ctx, dealPrice });
  const feeAmount = rule ? Number(rule.fee_amount) : 0;
  return {
    dealPrice,
    feeAmount,
    totalDueNow: feeAmount,
    rule,
    currency: rule?.currency ?? "ILS",
  };
}

/** Load active rules from DB (anon/authenticated can read active; admin sees all). */
export async function fetchPlatformFeeRules(opts?: {
  includeInactive?: boolean;
  feeType?: string;
}): Promise<PlatformFeeRule[]> {
  let q = supabase
    .from("platform_fees" as never)
    .select(
      "id,name,fee_type,min_deal_price,max_deal_price,fee_amount,currency,is_active,category_id,offer_type,listing_type,priority,sort_order,conditions",
    )
    .order("sort_order", { ascending: true });

  if (opts?.feeType) q = q.eq("fee_type" as never, opts.feeType as never);
  if (!opts?.includeInactive) q = q.eq("is_active" as never, true as never);

  const { data, error } = await q;
  if (error) throw error;
  return ((data ?? []) as unknown as PlatformFeeRule[]).map((r) => ({
    ...r,
    min_deal_price: Number(r.min_deal_price),
    max_deal_price: r.max_deal_price == null ? null : Number(r.max_deal_price),
    fee_amount: Number(r.fee_amount),
  }));
}

/** Server-side resolver via RPC (preferred for charging). */
export async function resolvePlatformFeeRpc(ctx: FeeMatchContext): Promise<ResolvedParticipationFee> {
  const dealPrice = Math.max(0, Number(ctx.dealPrice) || 0);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (supabase.rpc as any)("resolve_platform_fee", {
    _deal_price: dealPrice,
    _fee_type: ctx.feeType ?? "participation",
    _category_id: ctx.categoryId ?? null,
    _offer_type: ctx.offerType ?? null,
    _listing_type: ctx.listingType ?? null,
  });
  if (error) throw error;
  const row = Array.isArray(data) && data.length > 0 ? data[0] : null;
  if (!row) {
    return { dealPrice, feeAmount: 0, totalDueNow: 0, rule: null, currency: "ILS" };
  }
  const feeAmount = Number(row.fee_amount ?? 0);
  return {
    dealPrice,
    feeAmount,
    totalDueNow: feeAmount,
    currency: row.currency ?? "ILS",
    rule: {
      id: row.rule_id,
      name: row.name ?? null,
      fee_type: ctx.feeType ?? "participation",
      min_deal_price: Number(row.min_deal_price),
      max_deal_price: row.max_deal_price == null ? null : Number(row.max_deal_price),
      fee_amount: feeAmount,
      currency: row.currency ?? "ILS",
      is_active: true,
    },
  };
}

export function formatFeeBandLabel(rule: Pick<PlatformFeeRule, "min_deal_price" | "max_deal_price" | "name">): string {
  if (rule.name) return rule.name;
  const min = Number(rule.min_deal_price);
  const max = rule.max_deal_price == null ? null : Number(rule.max_deal_price);
  const fmt = (n: number) =>
    new Intl.NumberFormat("he-IL", { style: "currency", currency: "ILS", maximumFractionDigits: 0 }).format(n);
  if (max == null) return `מעל ${fmt(Math.max(0, min - 1))}`;
  if (min <= 0) return `עד ${fmt(max)}`;
  return `${fmt(min)}–${fmt(max)}`;
}
