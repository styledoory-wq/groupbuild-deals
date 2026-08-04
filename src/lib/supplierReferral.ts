import { supabase } from "@/integrations/supabase/client";

export type ReferralStatus =
  | "invited"
  | "registered"
  | "onboarding_completed"
  | "pending_approval"
  | "approved"
  | "reward_granted"
  | "rejected"
  | "cancelled";

export const REFERRAL_STATUS_LABELS: Record<ReferralStatus, string> = {
  invited: "נשלחה הזמנה",
  registered: "הספק נרשם",
  onboarding_completed: "השלים הרשמה",
  pending_approval: "ממתין לאישור",
  approved: "הספק אושר",
  reward_granted: "קיבלת קרדיט",
  rejected: "ההפניה נדחתה",
  cancelled: "בוטלה",
};

export type ReferralInfo = {
  referral_code: string;
  referral_link: string;
  program_enabled: boolean;
  reward_amount: number;
};

export type CreditSummary = {
  available_balance: number;
  used_balance: number;
  total_earned: number;
  allow_negative: boolean;
  updated_at: string | null;
  program_enabled: boolean;
  reward_amount: number;
};

export type CreditTransaction = {
  id: string;
  user_id: string;
  amount: number;
  type: "referral_reward" | "deal_join_payment" | "admin_adjustment" | "reversal" | "expired";
  source: string;
  referral_id: string | null;
  deal_id: string | null;
  deposit_id: string | null;
  status: "posted" | "reversed" | "pending_reserve";
  description: string | null;
  idempotency_key: string | null;
  created_by: string | null;
  created_at: string;
};

export type SupplierReferral = {
  id: string;
  referrer_user_id: string;
  referral_code: string;
  invitee_supplier_id: string | null;
  invitee_user_id: string | null;
  invitee_email: string | null;
  invitee_phone: string | null;
  status: ReferralStatus;
  reward_amount: number | null;
  reward_granted_at: string | null;
  reward_transaction_id: string | null;
  reward_notified_at: string | null;
  duplicate_suspicion: boolean;
  duplicate_reason: string | null;
  fraud_flag: boolean;
  cancelled_reason: string | null;
  metadata: Record<string, unknown>;
  created_at: string;
  updated_at: string;
};

export const REFERRAL_STORAGE_KEY = "gb_supplier_ref";

export function saveReferralCodeFromUrl(code: string | null | undefined): void {
  const trimmed = (code ?? "").trim().toUpperCase();
  if (!trimmed) return;
  try {
    sessionStorage.setItem(REFERRAL_STORAGE_KEY, trimmed);
  } catch {
    /* ignore */
  }
}

export function readStoredReferralCode(): string | null {
  try {
    const v = sessionStorage.getItem(REFERRAL_STORAGE_KEY);
    return v && v.trim() ? v.trim().toUpperCase() : null;
  } catch {
    return null;
  }
}

export function clearStoredReferralCode(): void {
  try {
    sessionStorage.removeItem(REFERRAL_STORAGE_KEY);
  } catch {
    /* ignore */
  }
}

/** Exact Hebrew WhatsApp share copy for supplier referral invites. */
export function buildShareText(referralLink: string): string {
  return [
    "היי, אני משתמש ב־GroupBuild — פלטפורמה שמחברת ספקים לפרויקטים וקבוצות רכישה בתחום הבנייה והשיפוצים.",
    "חשבתי שזה יכול להתאים לך.",
    "להרשמה דרך הקישור:",
    referralLink,
  ].join("\n");
}

export function computeCreditSplit(
  feeAmount: number,
  availableBalance: number,
): { creditApplied: number; cardAmount: number; fullyCovered: boolean } {
  const fee = Math.max(0, Number(feeAmount) || 0);
  const available = Math.max(0, Number(availableBalance) || 0);
  const creditApplied = Math.round(Math.min(fee, available) * 100) / 100;
  const cardAmount = Math.round((fee - creditApplied) * 100) / 100;
  return {
    creditApplied,
    cardAmount,
    fullyCovered: cardAmount <= 0,
  };
}

async function rpcJson<T>(fn: string, args?: Record<string, unknown>): Promise<T> {
  const { data, error } = await supabase.rpc(
    fn as never,
    (args && Object.keys(args).length ? args : undefined) as never,
  );
  if (error) throw error;
  // Some PostgREST setups return jsonb as a parsed object; others as a string.
  if (typeof data === "string") {
    try {
      return JSON.parse(data) as T;
    } catch {
      return data as T;
    }
  }
  return data as T;
}

/** Stable provisional code derived from user id — works even before migration. */
export function provisionalReferralCode(userId: string): string {
  const hex = userId.replace(/-/g, "").toUpperCase();
  return `GB${hex.slice(0, 8)}`;
}

function siteOrigin(): string {
  if (typeof window !== "undefined" && window.location?.origin) {
    // Prefer production domain for share links when running on app hosts
    const host = window.location.hostname;
    if (host.includes("groupbuild.co.il") || host === "localhost" || host.endsWith(".lovable.app") || host.endsWith(".lovableproject.com")) {
      return "https://groupbuild.co.il";
    }
  }
  return "https://groupbuild.co.il";
}

export function buildReferralLink(code: string): string {
  return `${siteOrigin()}/auth/supplier?mode=signup&ref=${encodeURIComponent(code)}`;
}

async function fallbackReferralInfo(): Promise<ReferralInfo> {
  const { data: session } = await supabase.auth.getSession();
  const userId = session.session?.user?.id;
  if (!userId) throw new Error("not_authenticated");

  // Prefer an already-persisted code if the column exists.
  try {
    const { data: prof } = await supabase
      .from("profiles")
      .select("referral_code")
      .eq("id", userId)
      .maybeSingle();
    const existing = (prof as { referral_code?: string | null } | null)?.referral_code;
    if (existing && existing.trim()) {
      const code = existing.trim().toUpperCase();
      return {
        referral_code: code,
        referral_link: buildReferralLink(code),
        program_enabled: true,
        reward_amount: 100,
      };
    }
  } catch {
    /* column may not exist yet */
  }

  const code = provisionalReferralCode(userId);
  return {
    referral_code: code,
    referral_link: buildReferralLink(code),
    program_enabled: true,
    reward_amount: 100,
  };
}

export async function getOrCreateReferralCode(): Promise<ReferralInfo> {
  try {
    const data = await rpcJson<ReferralInfo>("get_or_create_referral_code");
    const code = String(data?.referral_code ?? "").trim().toUpperCase();
    if (code) {
      return {
        referral_code: code,
        referral_link: String(data?.referral_link ?? buildReferralLink(code)),
        program_enabled: data?.program_enabled !== false,
        reward_amount: Number(data?.reward_amount ?? 100),
      };
    }
  } catch (e) {
    console.warn("[referral] get_or_create_referral_code failed, using fallback", e);
  }
  return fallbackReferralInfo();
}

export async function getCreditSummary(): Promise<CreditSummary> {
  const data = await rpcJson<CreditSummary>("get_resident_credit_summary");
  return {
    available_balance: Number(data?.available_balance ?? 0),
    used_balance: Number(data?.used_balance ?? 0),
    total_earned: Number(data?.total_earned ?? 0),
    allow_negative: !!data?.allow_negative,
    updated_at: data?.updated_at ?? null,
    program_enabled: data?.program_enabled !== false,
    reward_amount: Number(data?.reward_amount ?? 100),
  };
}

export async function listMyReferrals(): Promise<SupplierReferral[]> {
  const { data, error } = await supabase.rpc("list_my_referrals" as never);
  if (error) throw error;
  return (data ?? []) as SupplierReferral[];
}

export async function listMyCreditTransactions(limit = 50): Promise<CreditTransaction[]> {
  const { data, error } = await supabase.rpc("list_my_credit_transactions" as never, {
    _limit: limit,
  } as never);
  if (error) throw error;
  return (data ?? []) as CreditTransaction[];
}

export async function attachReferralCode(code: string): Promise<{ ok: boolean; error?: string }> {
  const trimmed = code.trim();
  if (!trimmed) return { ok: false, error: "missing_code" };
  try {
    const data = await rpcJson<{ ok?: boolean; error?: string }>("attach_referral_on_supplier_signup", {
      _code: trimmed,
    });
    return { ok: data?.ok !== false, error: data?.error };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "attach_failed" };
  }
}

export function statusLabel(status: string): string {
  return REFERRAL_STATUS_LABELS[status as ReferralStatus] ?? status;
}

export async function notifyReferralRewardIfNeeded(referralId: string): Promise<void> {
  const { data: claimed, error } = await supabase.rpc(
    "claim_referral_reward_notification" as never,
    { _referral_id: referralId } as never,
  );
  if (error || !claimed) return;

  const { data: ref } = await supabase
    .from("supplier_referrals" as never)
    .select("referrer_user_id,reward_amount")
    .eq("id", referralId)
    .maybeSingle();

  const row = ref as { referrer_user_id?: string; reward_amount?: number } | null;
  if (!row?.referrer_user_id) return;

  const amount = Number(row.reward_amount ?? 100);
  const title = "קיבלת קרדיט!";
  const body =
    `הספק שהזמנת אושר ל־GroupBuild.\nקיבלת ${amount} ₪ קרדיט להצטרפות לעסקאות קבוצתיות.`;

  await supabase.rpc("notify_user" as never, {
    _user_id: row.referrer_user_id,
    _title: title,
    _body: body,
    _type: "system",
    _link: "/resident/credits",
    _metadata: { kind: "referral_reward", referral_id: referralId, amount },
  } as never);

  supabase.functions
    .invoke("send-push", {
      body: {
        user_id: row.referrer_user_id,
        event: "system",
        title,
        body,
        url: "/resident/credits",
        data: { kind: "referral_reward", referral_id: referralId },
      },
    })
    .catch(() => {});

  const { data: profile } = await supabase
    .from("profiles")
    .select("email,full_name")
    .eq("id", row.referrer_user_id)
    .maybeSingle();

  if (profile?.email) {
    supabase.functions
      .invoke("send-transactional-email", {
        body: {
          templateName: "referral-reward",
          recipientEmail: profile.email,
          idempotencyKey: `referral-reward-${referralId}`,
          templateData: {
            name: profile.full_name ?? undefined,
            amount,
            currency: "₪",
            creditsUrl: "https://groupbuild.co.il/resident/credits",
          },
        },
      })
      .catch(() => {});
  }
}

export async function adminApproveSupplier(
  supplierId: string,
  approve = true,
): Promise<{
  ok: boolean;
  grant?: { ok?: boolean; amount?: number; already_granted?: boolean };
  referral_id?: string;
}> {
  const { data, error } = await supabase.rpc("admin_approve_supplier" as never, {
    _supplier_id: supplierId,
    _approve: approve,
  } as never);
  if (error) throw error;
  const result = (data ?? { ok: true }) as {
    ok?: boolean;
    grant?: { ok?: boolean; amount?: number; already_granted?: boolean };
    referral_id?: string;
  };
  if (approve && result?.referral_id && result?.grant?.ok) {
    void notifyReferralRewardIfNeeded(result.referral_id);
  }
  return { ok: result.ok !== false, grant: result.grant, referral_id: result.referral_id };
}
