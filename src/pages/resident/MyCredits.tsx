import { useCallback, useEffect, useState } from "react";
import { Gift, History, Users, Wallet } from "lucide-react";
import { MobileShell } from "@/components/layout/MobileShell";
import { BackHeader, LoadingState } from "@/components/ds";
import { BottomNav } from "@/components/layout/BottomNav";
import { InviteSupplierSheet } from "@/components/resident/InviteSupplierSheet";
import { formatCreditILS } from "@/lib/residentCredits";
import {
  getCreditSummary,
  listMyCreditTransactions,
  listMyReferrals,
  statusLabel,
  type CreditSummary,
  type CreditTransaction,
  type SupplierReferral,
} from "@/lib/supplierReferral";

const TX_TYPE_LABELS: Record<string, string> = {
  referral_reward: "תגמול הפניה",
  deal_join_payment: "תשלום הצטרפות",
  admin_adjustment: "התאמת מנהל",
  reversal: "ביטול / החזרה",
  expired: "פג תוקף",
};

export default function MyCredits() {
  const [summary, setSummary] = useState<CreditSummary | null>(null);
  const [txs, setTxs] = useState<CreditTransaction[]>([]);
  const [referrals, setReferrals] = useState<SupplierReferral[]>([]);
  const [loading, setLoading] = useState(true);
  const [inviteOpen, setInviteOpen] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [s, t, r] = await Promise.all([
        getCreditSummary(),
        listMyCreditTransactions(50),
        listMyReferrals(),
      ]);
      setSummary(s);
      setTxs(t);
      setReferrals(r);
    } catch (e) {
      console.warn("[MyCredits] load failed", e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <MobileShell>
      <div dir="rtl" className="min-h-screen min-h-[100dvh] w-full bg-[#F7F5F0]">
        <BackHeader title="הקרדיטים שלי" backTo="/resident/profile" />

        <div
          className="mx-auto w-full max-w-[var(--app-max-w)] px-5 pt-4"
          style={{ paddingBottom: "calc(env(safe-area-inset-bottom) + var(--nav-h) + 24px)" }}
        >
          {loading ? (
            <LoadingState fullHeight={false} label="טוען קרדיטים..." />
          ) : (
            <>
              <section
                className="rounded-3xl p-5 text-white relative overflow-hidden border border-[#0E6B5A]"
                style={{ background: "linear-gradient(135deg,#0E6B5A 0%,#0A5547 60%,#063C33 100%)" }}
              >
                <div className="absolute -top-10 -left-10 w-40 h-40 rounded-full bg-white/10 blur-3xl pointer-events-none" />
                <div className="relative z-10">
                  <div className="flex items-center gap-2 text-white/80 text-[12px] font-medium mb-2">
                    <Wallet className="h-3.5 w-3.5" strokeWidth={2.4} />
                    יתרה זמינה
                  </div>
                  <div className="text-[34px] font-bold leading-none tabular-nums tracking-[-0.03em]">
                    {formatCreditILS(summary?.available_balance ?? 0)}
                  </div>
                  <div className="mt-4 grid grid-cols-2 gap-3">
                    <MiniStat label="סה״כ נצבר" value={formatCreditILS(summary?.total_earned ?? 0)} />
                    <MiniStat label="נוצל" value={formatCreditILS(summary?.used_balance ?? 0)} />
                  </div>
                </div>
              </section>

              {summary?.program_enabled !== false && (
                <button
                  type="button"
                  onClick={() => setInviteOpen(true)}
                  className="mt-4 w-full h-12 rounded-2xl bg-white border border-[#0E6B5A]/25 text-[#0E6B5A] text-[13px] font-semibold inline-flex items-center justify-center gap-2 shadow-sm active:scale-[0.99] transition"
                >
                  <Gift className="h-4 w-4" strokeWidth={2.2} />
                  הזמן בעל מקצוע
                </button>
              )}

              <SectionTitle icon={History} title="היסטוריית תנועות" />
              {txs.length === 0 ? (
                <EmptyBlock text="עדיין אין תנועות קרדיט." />
              ) : (
                <div className="space-y-2">
                  {txs.map((tx) => (
                    <div
                      key={tx.id}
                      className="bg-white rounded-2xl border border-[#E5E5EA] shadow-sm px-4 py-3 flex items-center justify-between gap-3"
                    >
                      <div className="min-w-0 text-right">
                        <div className="text-[13px] font-semibold text-[#1C1C1E] truncate">
                          {tx.description || TX_TYPE_LABELS[tx.type] || tx.type}
                        </div>
                        <div className="text-[11px] text-[#8E8E93] mt-0.5">
                          {formatDate(tx.created_at)}
                          {tx.status !== "posted" ? ` · ${tx.status}` : ""}
                        </div>
                      </div>
                      <div
                        className={`text-[15px] font-bold tabular-nums shrink-0 ${
                          tx.amount >= 0 ? "text-[#0E6B5A]" : "text-[#C73E3E]"
                        }`}
                      >
                        {tx.amount >= 0 ? "+" : ""}
                        {formatCreditILS(tx.amount)}
                      </div>
                    </div>
                  ))}
                </div>
              )}

              <SectionTitle icon={Users} title="בעלי מקצוע שהזמנתי" />
              {referrals.length === 0 ? (
                <EmptyBlock text="עדיין לא הזמנתם בעלי מקצוע." />
              ) : (
                <div className="space-y-2">
                  {referrals.map((ref) => (
                    <div
                      key={ref.id}
                      className="bg-white rounded-2xl border border-[#E5E5EA] shadow-sm px-4 py-3 text-right"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <div className="text-[13px] font-semibold text-[#1C1C1E] truncate">
                            {ref.invitee_email || ref.invitee_phone || "ספק מוזמן"}
                          </div>
                          <div className="text-[11px] text-[#8E8E93] mt-0.5">
                            {formatDate(ref.created_at)}
                            {ref.reward_granted_at
                              ? ` · קרדיט ${formatCreditILS(Number(ref.reward_amount ?? 0))}`
                              : ""}
                          </div>
                        </div>
                        <span className="shrink-0 text-[11px] font-semibold px-2 py-1 rounded-full bg-[#0E6B5A]/10 text-[#0E6B5A]">
                          {statusLabel(ref.status)}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </>
          )}
        </div>

        <BottomNav role="resident" />
        <InviteSupplierSheet open={inviteOpen} onOpenChange={setInviteOpen} />
      </div>
    </MobileShell>
  );
}

function MiniStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-white/15 backdrop-blur-sm rounded-xl px-3 py-2.5 border border-white/20">
      <div className="text-[10px] text-white/75 font-medium">{label}</div>
      <div className="text-[15px] font-bold tabular-nums mt-0.5">{value}</div>
    </div>
  );
}

function SectionTitle({
  icon: Icon,
  title,
}: {
  icon: typeof History;
  title: string;
}) {
  return (
    <div className="mt-7 mb-3 flex items-center gap-2 text-right">
      <Icon className="h-4 w-4 text-[#0E6B5A]" strokeWidth={2.2} />
      <h2 className="text-[16px] font-bold text-[#1C1C1E] tracking-tight">{title}</h2>
    </div>
  );
}

function EmptyBlock({ text }: { text: string }) {
  return (
    <div className="bg-white rounded-2xl border border-[#E5E5EA] px-4 py-8 text-center">
      <p className="text-[13px] text-[#8E8E93] font-medium">{text}</p>
    </div>
  );
}

function formatDate(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString("he-IL", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  } catch {
    return iso;
  }
}
