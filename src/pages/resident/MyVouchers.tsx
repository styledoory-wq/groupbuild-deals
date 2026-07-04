import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Ticket, Users, Share2, Clock, Hourglass, Trash2 } from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { MobileShell } from "@/components/layout/MobileShell";
import { BottomNav } from "@/components/layout/BottomNav";
import { BackHeader, LoadingState, EmptyState } from "@/components/ds";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { VoucherCard } from "@/components/vouchers/VoucherCard";
import { toast } from "sonner";

type VoucherRow = {
  id: string; code: string; reference_number: string; status: string;
  expires_at: string | null; redeemed_at: string | null; rotation_secret: string;
  deal_id: string; supplier_id: string;
  deals?: { title: string | null; category_id: string | null; discounted_price: number | null; original_price: number | null; base_price: number | null; discount_percentage: number | null; offer_type: string | null; tiers: unknown; status: string | null } | null;
  suppliers?: { business_name: string | null } | null;
  category_name?: string | null;
};

type PendingRow = {
  interest_id: string;
  deal_id: string;
  title: string;
  supplier_name: string | null;
  target_participants: number | null;
  join_deadline: string | null;
  paid_count: number;
  discounted_price: number | null;
  original_price: number | null;
};

export default function MyVouchers() {
  const [vouchers, setVouchers] = useState<VoucherRow[]>([]);
  const [pending, setPending] = useState<PendingRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [pendingDelete, setPendingDelete] = useState<
    | { kind: "voucher"; id: string }
    | { kind: "interest"; id: string }
    | null
  >(null);
  const [deleting, setDeleting] = useState(false);

  const confirmDelete = async () => {
    if (!pendingDelete) return;
    setDeleting(true);
    const { error } =
      pendingDelete.kind === "voucher"
        ? await supabase.from("vouchers").delete().eq("id", pendingDelete.id)
        : await supabase.from("deal_interests").delete().eq("id", pendingDelete.id);
    setDeleting(false);
    if (error) {
      toast.error("המחיקה נכשלה");
      return;
    }
    if (pendingDelete.kind === "voucher") {
      setVouchers((prev) => prev.filter((v) => v.id !== pendingDelete.id));
    } else {
      setPending((prev) => prev.filter((p) => p.interest_id !== pendingDelete.id));
    }
    setPendingDelete(null);
    toast.success("הפריט נמחק בהצלחה");
  };

  useEffect(() => {
    (async () => {
      const { data: s } = await supabase.auth.getSession();
      if (!s.session) { setLoading(false); return; }
      const uid = s.session.user.id;
      const { resolveMyProjectId } = await import("@/lib/projectClient");
      const pid = await resolveMyProjectId(uid);

      // Only show vouchers for deals that have actually closed
      const vQ = supabase
        .from("vouchers")
        .select("id, code, reference_number, status, expires_at, redeemed_at, rotation_secret, deal_id, supplier_id")
        .order("created_at", { ascending: false });
      const { data: vData } = await (pid ? vQ.eq("project_id", pid) : vQ.eq("user_id", uid));
      const rawVouchers = ((vData ?? []) as unknown as VoucherRow[]);
      const voucherDealIds = Array.from(new Set(rawVouchers.map((v) => v.deal_id).filter(Boolean)));
      const voucherSupplierIds = Array.from(new Set(rawVouchers.map((v) => v.supplier_id).filter(Boolean)));
      const [{ data: voucherDeals }, { data: voucherSuppliers }] = await Promise.all([
        voucherDealIds.length
          ? supabase.from("deals").select("id, title, category_id, discounted_price, original_price, base_price, discount_percentage, offer_type, tiers, status").in("id", voucherDealIds)
          : Promise.resolve({ data: [] }),
        voucherSupplierIds.length
          ? supabase.from("suppliers").select("id, business_name").in("id", voucherSupplierIds)
          : Promise.resolve({ data: [] }),
      ]);
      const dealsById = new Map((voucherDeals ?? []).map((d) => [String(d.id), d]));
      const suppliersById = new Map((voucherSuppliers ?? []).map((sp) => [String(sp.id), sp]));
      const categoryIds = Array.from(new Set((voucherDeals ?? []).map((d) => String((d as { category_id?: string | null }).category_id ?? "")).filter(Boolean)));
      const { data: cats } = categoryIds.length
        ? await supabase.from("categories").select("id, name").in("id", categoryIds)
        : { data: [] };
      const categoriesById = new Map((cats ?? []).map((c) => [String(c.id), c.name]));
      const vs = rawVouchers
        .map((v) => ({
          ...v,
          deals: dealsById.get(v.deal_id) ?? null,
          suppliers: suppliersById.get(v.supplier_id) ?? null,
          category_name: categoriesById.get(String((dealsById.get(v.deal_id) as { category_id?: string | null } | undefined)?.category_id ?? "")) ?? null,
        }))
        .filter((v) => v.deals?.status !== "active");
      setVouchers(vs);

      // Pending: user joined an active deal — waiting for group close
      const intsQ = supabase
        .from("deal_interests")
        .select("id, deal_id")
        .eq("is_deleted", false);
      const { data: ints } = await (pid ? intsQ.eq("project_id", pid) : intsQ.eq("user_id", uid));
      const dealIds = Array.from(new Set((ints ?? []).map((i) => i.deal_id)));
      const voucheredDealIds = new Set(vs.map((v) => v.deal_id));
      const dealsNeedingFetch = dealIds.filter((id) => !voucheredDealIds.has(id));

      if (dealsNeedingFetch.length) {
        const { data: deals } = await supabase
          .from("deals")
          .select("id, title, status, target_participants, tiers, join_deadline, discounted_price, original_price, supplier_id")
          .in("id", dealsNeedingFetch);
        const supplierIds = Array.from(new Set((deals ?? []).map((d) => String((d as { supplier_id?: string }).supplier_id ?? "")).filter(Boolean)));
        const { data: pendingSuppliers } = supplierIds.length
          ? await supabase.from("suppliers").select("id, business_name").in("id", supplierIds)
          : { data: [] };
        const pendingSuppliersById = new Map((pendingSuppliers ?? []).map((sp) => [String(sp.id), sp.business_name ?? null]));

        const interestByDeal: Record<string, string> = {};
        (ints ?? []).forEach((i) => { interestByDeal[i.deal_id] = i.id; });

        const activeDeals = (deals ?? []).filter((d) => (d as { status: string }).status === "active");

        // Use the canonical paid-count RPC so deposit-free approved interests are counted too
        const counts: Record<string, number> = {};
        await Promise.all(activeDeals.map(async (d) => {
          const id = (d as { id: string }).id;
          const { data: c } = await supabase.rpc("get_deal_paid_count", { _deal_id: id });
          counts[id] = (c as number | null) ?? 0;
        }));

        const pendingRows: PendingRow[] = activeDeals.map((d) => {
          const dd = d as {
            id: string; title: string; target_participants: number | null;
            tiers: Array<{ maxParticipants?: number | string | null }> | null;
            join_deadline: string | null; discounted_price: number | null;
            original_price: number | null;
            supplier_id: string;
          };
          // Effective target: explicit target_participants, else max tier maxParticipants
          let target = dd.target_participants ?? null;
          if (!target && Array.isArray(dd.tiers)) {
            const maxes = dd.tiers
              .map((t) => Number(t?.maxParticipants))
              .filter((n) => Number.isFinite(n) && n > 0);
            if (maxes.length) target = Math.max(...maxes);
          }
          return {
            interest_id: interestByDeal[dd.id] ?? dd.id,
            deal_id: dd.id,
            title: dd.title,
            supplier_name: pendingSuppliersById.get(dd.supplier_id) ?? null,
            target_participants: target,
            join_deadline: dd.join_deadline,
            paid_count: counts[dd.id] ?? 0,
            discounted_price: dd.discounted_price,
            original_price: dd.original_price,
          };
        });
        setPending(pendingRows);
      }

      setLoading(false);
    })();
  }, []);

  const handleShare = async (p: PendingRow) => {
    const url = `${window.location.origin}/deals/${p.deal_id}`;
    const text = `הצטרפו אליי להצעה הקבוצתית "${p.title}" — ככל שיש יותר שכנים, ההנחה גדלה!`;
    try {
      if (navigator.share) {
        await navigator.share({ title: p.title, text, url });
      } else {
        await navigator.clipboard.writeText(`${text}\n${url}`);
        toast.success("הקישור הועתק — שלחו לשכנים");
      }
    } catch { /* user cancelled */ }
  };

  return (
    <MobileShell>
      <BackHeader title="ההטבה שלי" subtitle="ההצעות שהצטרפת אליהן והשוברים שלך" />
      <div className="px-5 pb-28 space-y-5">
        {loading ? (
          <LoadingState label="טוען הטבות…" />
        ) : vouchers.length === 0 && pending.length === 0 ? (
          <EmptyState
            icon={<Ticket className="h-7 w-7 text-[#C9A961]" />}
            title="אין עדיין הטבות זמינות"
            description="ברגע שעסקה שהצטרפת אליה תיסגר, יופיע כאן שובר ההטבה האישי שלך עם קוד מימוש ו-QR."
          />
        ) : (
          <>
            {/* Pending — joined but group hasn't closed yet */}
            {pending.map((p) => {
              const target = p.target_participants ?? 0;
              const pct = target > 0 ? Math.min(100, Math.round((p.paid_count / target) * 100)) : 0;
              const remaining = Math.max(0, target - p.paid_count);
              const price = p.discounted_price ?? p.original_price;
              return (
                <div key={p.interest_id} className="rounded-3xl bg-card border border-border/60 p-6 space-y-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="text-fs-xs uppercase tracking-wider text-muted-foreground">{p.supplier_name ?? "ספק"}</div>
                      <h3 className="text-lg font-bold text-foreground mt-1 leading-tight">{p.title}</h3>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <span className="text-fs-xs font-semibold px-2.5 py-1 rounded-full whitespace-nowrap bg-gold/15 text-amber-700 border border-gold/30 inline-flex items-center gap-1">
                        <Hourglass className="h-3 w-3" />
                        ממתין לסגירת הקבוצה
                      </span>
                      <button
                        onClick={() => setPendingDelete({ kind: "interest", id: p.interest_id })}
                        className="h-8 w-8 rounded-xl flex items-center justify-center bg-[#FEE2E2] text-[#DC2626]"
                        aria-label="מחיקה"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>

                  <div className="rounded-2xl bg-muted/30 border border-border p-4 space-y-3">
                    <div className="flex items-end justify-between">
                      <div>
                        <div className="text-fs-xs text-muted-foreground">מחיר צפוי</div>
                        <div className="text-fs-xl font-extrabold text-primary leading-none">
                          {price != null ? `${Number(price).toLocaleString("he-IL")} ₪` : "—"}
                        </div>
                      </div>
                      <div className="text-fs-xs text-muted-foreground inline-flex items-center gap-1">
                        <Users className="h-3.5 w-3.5" />
                        {p.paid_count}{target > 0 ? ` / ${target}` : ""} מצטרפים
                      </div>
                    </div>
                    {target > 0 && (
                      <>
                        <div className="h-2 rounded-full bg-border overflow-hidden">
                          <div
                            className="h-full bg-gradient-to-r from-gold to-amber-500 transition-all"
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                        <div className="text-fs-xs text-muted-foreground">
                          {remaining > 0 ? `עוד ${remaining} מצטרפים לסגירת ההצעה` : "היעד הושג — השובר ייפתח בקרוב"}
                        </div>
                      </>
                    )}
                    {p.join_deadline && (
                      <div className="text-fs-xs text-muted-foreground inline-flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        מועד סגירה: {new Date(p.join_deadline).toLocaleDateString("he-IL")}
                      </div>
                    )}
                  </div>

                  <div className="flex flex-col gap-2">
                    <Button
                      onClick={() => handleShare(p)}
                      className="w-full h-auto min-h-11 rounded-xl bg-[#0E6B5A] text-white font-bold shadow-[0_8px_20px_-10px_rgba(10,31,61,0.45)] whitespace-normal text-center leading-tight py-2.5 px-3"
                    >
                      <Share2 className="h-4 w-4 ml-1.5 shrink-0" />
                      <span className="text-fs-sm">שתפו עם שכנים כדי לסגור את ההצעה</span>
                    </Button>
                    <Link to={`/resident/deals/${p.deal_id}`} className="w-full">
                      <Button variant="outline" className="w-full rounded-xl">לפרטים</Button>
                    </Link>
                  </div>

                </div>
              );
            })}

            {/* Active vouchers — deal closed */}
            {vouchers.map((v) => (
              <div key={v.id} className="relative">
                <button
                  onClick={() => setPendingDelete({ kind: "voucher", id: v.id })}
                  className="absolute top-3 left-3 z-10 h-8 w-8 rounded-xl flex items-center justify-center bg-[#FEE2E2] text-[#DC2626] shadow-sm"
                  aria-label="מחיקה"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
                <VoucherCard
                  voucher={{
                    id: v.id, code: v.code, reference_number: v.reference_number,
                    status: v.status, expires_at: v.expires_at, redeemed_at: v.redeemed_at,
                    rotation_secret: v.rotation_secret,
                    deal_id: v.deal_id, supplier_id: v.supplier_id,
                    deal_title: v.deals?.title ?? undefined,
                    supplier_name: v.suppliers?.business_name ?? undefined,
                    category_name: v.category_name ?? undefined,
                    price: v.deals?.discounted_price ?? v.deals?.original_price ?? null,
                    original_price: v.deals?.original_price ?? v.deals?.base_price ?? null,
                    benefit_price: v.deals?.discounted_price ?? null,
                    savings: v.deals?.original_price != null && v.deals?.discounted_price != null
                      ? Math.max(0, Number(v.deals.original_price) - Number(v.deals.discounted_price))
                      : null,
                  }}
                />
              </div>
            ))}
          </>
        )}
      </div>

      <AlertDialog open={pendingDelete !== null} onOpenChange={(o) => !o && setPendingDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>האם למחוק פריט זה?</AlertDialogTitle>
            <AlertDialogDescription>פעולה זו אינה ניתנת לביטול</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>ביטול</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete} disabled={deleting} className="bg-[#DC2626] hover:bg-[#B91C1C]">
              {deleting ? "מוחק..." : "מחיקה"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <BottomNav role="resident" />
    </MobileShell>
  );
}
