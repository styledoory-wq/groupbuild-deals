import { useCallback, useEffect, useState } from "react";
import { Gift, Loader2, ScrollText, XCircle } from "lucide-react";
import { toast } from "sonner";
import { MobileShell } from "@/components/layout/MobileShell";
import { BottomNav } from "@/components/layout/BottomNav";
import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { LoadingState } from "@/components/ds";
import { supabase } from "@/integrations/supabase/client";
import { statusLabel, type ReferralStatus } from "@/lib/supplierReferral";

type ReferralRow = {
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
  duplicate_suspicion: boolean;
  duplicate_reason: string | null;
  fraud_flag: boolean;
  cancelled_reason: string | null;
  created_at: string;
  updated_at: string;
};

type AuditRow = {
  id: string;
  referral_id: string | null;
  actor_id: string | null;
  action: string;
  from_status: string | null;
  to_status: string | null;
  metadata: Record<string, unknown> | null;
  created_at: string;
};

export default function AdminReferrals() {
  const [rows, setRows] = useState<ReferralRow[]>([]);
  const [profiles, setProfiles] = useState<Record<string, { full_name: string | null; email: string | null }>>({});
  const [suppliers, setSuppliers] = useState<Record<string, string>>({});
  const [audit, setAudit] = useState<AuditRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [{ data: refs }, { data: logs }] = await Promise.all([
        supabase
          .from("supplier_referrals" as never)
          .select("*")
          .order("created_at", { ascending: false })
          .limit(200),
        supabase
          .from("supplier_referral_audit_log" as never)
          .select("*")
          .order("created_at", { ascending: false })
          .limit(50),
      ]);

      const list = (refs ?? []) as ReferralRow[];
      setRows(list);
      setAudit((logs ?? []) as AuditRow[]);

      const referrerIds = Array.from(new Set(list.map((r) => r.referrer_user_id).filter(Boolean)));
      const supplierIds = Array.from(
        new Set(list.map((r) => r.invitee_supplier_id).filter(Boolean) as string[]),
      );

      const [{ data: profs }, { data: sups }] = await Promise.all([
        referrerIds.length
          ? supabase.from("profiles").select("id,full_name,email").in("id", referrerIds)
          : Promise.resolve({ data: [] as { id: string; full_name: string | null; email: string | null }[] }),
        supplierIds.length
          ? supabase.from("suppliers").select("id,business_name").in("id", supplierIds)
          : Promise.resolve({ data: [] as { id: string; business_name: string }[] }),
      ]);

      const pmap: Record<string, { full_name: string | null; email: string | null }> = {};
      (profs ?? []).forEach((p) => {
        pmap[p.id] = { full_name: p.full_name, email: p.email };
      });
      setProfiles(pmap);

      const smap: Record<string, string> = {};
      (sups ?? []).forEach((s: { id: string; business_name: string }) => {
        smap[s.id] = s.business_name;
      });
      setSuppliers(smap);
    } catch (e) {
      console.error("[AdminReferrals] load", e);
      toast.error("טעינת הפניות נכשלה");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const cancelReferral = async (id: string) => {
    const reason = window.prompt("סיבת ביטול ההפניה:");
    if (reason === null) return;
    setBusy(id);
    try {
      const { data, error } = await supabase.rpc("admin_cancel_referral" as never, {
        _referral_id: id,
        _reason: reason || "admin_cancel",
        _reverse_unused_credit: true,
        _allow_negative: false,
      } as never);
      if (error) throw error;
      const result = data as { ok?: boolean; error?: string } | null;
      if (result && result.ok === false) throw new Error(result.error ?? "cancel_failed");
      toast.success("ההפניה בוטלה");
      await load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "ביטול נכשל");
    } finally {
      setBusy(null);
    }
  };

  const grantReward = async (id: string) => {
    if (!window.confirm("להעניק קרדיט ידנית להפניה זו?")) return;
    setBusy(id);
    try {
      const { data, error } = await supabase.rpc("admin_manual_grant_referral_reward" as never, {
        _referral_id: id,
      } as never);
      if (error) throw error;
      const result = data as { ok?: boolean; error?: string } | null;
      if (result && result.ok === false) throw new Error(result.error ?? "grant_failed");
      toast.success("הקרדיט הוענק");
      await load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "הענקה נכשלה");
    } finally {
      setBusy(null);
    }
  };

  return (
    <MobileShell>
      <div className="bg-[#F7F8FA] min-h-screen" dir="rtl">
        <AdminPageHeader
          title="הפניות ספקים"
          description="מעקב אחרי הזמנות, סטטוסים ותגמולי קרדיט"
        />

        <div className="px-5 lg:px-8 pb-24 max-w-6xl space-y-6">
          {loading ? (
            <LoadingState fullHeight={false} />
          ) : rows.length === 0 ? (
            <div className="bg-white border border-[#EEF0F4] rounded-2xl p-10 text-center text-[#8B94A3] text-sm">
              אין הפניות עדיין
            </div>
          ) : (
            <div className="space-y-3">
              {rows.map((r) => {
                const referrer = profiles[r.referrer_user_id];
                const supplierName = r.invitee_supplier_id
                  ? suppliers[r.invitee_supplier_id]
                  : null;
                const canCancel = r.status !== "cancelled";
                const canGrant = r.status !== "reward_granted" && r.status !== "cancelled";
                return (
                  <div
                    key={r.id}
                    className="bg-white border border-[#EEF0F4] rounded-2xl p-4 space-y-2"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0 text-right">
                        <div className="text-[14px] font-semibold text-[#0F172A]">
                          {referrer?.full_name || "מפנה לא ידוע"}
                        </div>
                        <div className="text-[12px] text-[#8B94A3] truncate">
                          {referrer?.email || r.referrer_user_id}
                        </div>
                      </div>
                      <span className="shrink-0 text-[11px] font-semibold px-2.5 py-1 rounded-full bg-[#E8F1EE] text-[#0E6B5A]">
                        {statusLabel(r.status)}
                      </span>
                    </div>

                    <div className="text-[12px] text-[#4B5563] space-y-0.5">
                      <div>
                        ספק:{" "}
                        <span className="font-medium text-[#0F172A]">
                          {supplierName ||
                            r.invitee_email ||
                            r.invitee_phone ||
                            "טרם שויך"}
                        </span>
                      </div>
                      <div>
                        קוד: <span className="font-mono tracking-wide">{r.referral_code}</span>
                      </div>
                      <div>
                        נוצר: {formatDate(r.created_at)}
                        {r.reward_granted_at
                          ? ` · קרדיט ב־${formatDate(r.reward_granted_at)} (${r.reward_amount ?? 0} ₪)`
                          : r.reward_granted_at === null && r.status === "reward_granted"
                            ? ""
                            : ""}
                      </div>
                      {(r.duplicate_suspicion || r.fraud_flag) && (
                        <div className="text-[#C73E3E] font-medium">
                          {r.duplicate_suspicion
                            ? `חשד לכפילות${r.duplicate_reason ? `: ${r.duplicate_reason}` : ""}`
                            : "דגל הונאה"}
                        </div>
                      )}
                    </div>

                    <div className="flex gap-2 pt-1">
                      {canGrant && (
                        <button
                          type="button"
                          disabled={busy === r.id}
                          onClick={() => grantReward(r.id)}
                          className="flex-1 h-10 rounded-xl bg-[#0E6B5A] text-white text-[12px] font-semibold inline-flex items-center justify-center gap-1.5 disabled:opacity-50"
                        >
                          {busy === r.id ? (
                            <Loader2 className="h-3.5 w-3.5 animate-spin" />
                          ) : (
                            <Gift className="h-3.5 w-3.5" />
                          )}
                          הענק קרדיט
                        </button>
                      )}
                      {canCancel && (
                        <button
                          type="button"
                          disabled={busy === r.id}
                          onClick={() => cancelReferral(r.id)}
                          className="flex-1 h-10 rounded-xl border border-[#E5E7EB] text-[#C73E3E] text-[12px] font-semibold inline-flex items-center justify-center gap-1.5 disabled:opacity-50"
                        >
                          <XCircle className="h-3.5 w-3.5" />
                          ביטול
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          <section>
            <h2 className="text-[11px] font-bold uppercase tracking-[0.08em] text-[#8B94A3] mb-3 px-1 flex items-center gap-1.5">
              <ScrollText className="h-3 w-3" strokeWidth={1.75} />
              יומן ביקורת (50 אחרונים)
            </h2>
            <div className="bg-white border border-[#EEF0F4] rounded-2xl divide-y divide-[#F3F5F8] overflow-hidden">
              {audit.length === 0 ? (
                <div className="px-4 py-8 text-center text-[13px] text-[#8B94A3]">אין רשומות</div>
              ) : (
                audit.map((a) => (
                  <div key={a.id} className="px-4 py-3 text-right">
                    <div className="text-[13px] font-semibold text-[#0F172A]">{a.action}</div>
                    <div className="text-[11px] text-[#8B94A3] mt-0.5">
                      {formatDate(a.created_at)}
                      {a.from_status || a.to_status
                        ? ` · ${a.from_status ?? "—"} → ${a.to_status ?? "—"}`
                        : ""}
                      {a.referral_id ? ` · ${a.referral_id.slice(0, 8)}…` : ""}
                    </div>
                  </div>
                ))
              )}
            </div>
          </section>
        </div>
      </div>
      <BottomNav role="admin" />
    </MobileShell>
  );
}

function formatDate(iso: string): string {
  try {
    return new Date(iso).toLocaleString("he-IL", {
      day: "numeric",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return iso;
  }
}
