import { useEffect, useState } from "react";
import { Ticket } from "lucide-react";
import { MobileShell } from "@/components/layout/MobileShell";
import { BottomNav } from "@/components/layout/BottomNav";
import { PageHeader } from "@/components/layout/PageHeader";
import { supabase } from "@/integrations/supabase/client";
import { VoucherCard } from "@/components/vouchers/VoucherCard";

type Row = {
  id: string; code: string; reference_number: string; status: string;
  expires_at: string | null; redeemed_at: string | null; rotation_secret: string;
  deal_id: string; supplier_id: string;
  deals?: { title: string | null; discounted_price: number | null; original_price: number | null } | null;
  suppliers?: { business_name: string | null } | null;
};

export default function MyVouchers() {
  const [vouchers, setVouchers] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const { data: s } = await supabase.auth.getSession();
      if (!s.session) { setLoading(false); return; }
      const { data } = await supabase
        .from("vouchers")
        .select("id, code, reference_number, status, expires_at, redeemed_at, rotation_secret, deal_id, supplier_id, deals(title, discounted_price, original_price), suppliers(business_name)")
        .eq("user_id", s.session.user.id)
        .order("created_at", { ascending: false });
      setVouchers((data ?? []) as unknown as Row[]);
      setLoading(false);
    })();
  }, []);

  return (
    <MobileShell>
      <PageHeader title="ההטבה שלי" subtitle="השוברים הזכאים שלך" />
      <div className="px-5 pb-28 space-y-5">
        {loading ? (
          <div className="h-72 gb-skeleton rounded-3xl" />
        ) : vouchers.length === 0 ? (
          <div className="ios-card p-10 text-center">
            <div
              className="h-16 w-16 rounded-2xl mx-auto flex items-center justify-center mb-4"
              style={{
                background: "linear-gradient(145deg, rgba(212,180,106,0.18) 0%, rgba(201,169,97,0.10) 100%)",
                border: "1px solid rgba(201,169,97,0.30)",
                boxShadow: "inset 0 1px 0 rgba(255,255,255,0.6), 0 4px 16px -8px rgba(201,169,97,0.30)",
              }}
            >
              <Ticket className="h-7 w-7 text-[#C9A961]" strokeWidth={1.75} />
            </div>
            <h3 className="font-extrabold text-[17px] text-[#0A1F3D]">אין עדיין הטבות זמינות</h3>
            <p className="text-[13px] text-[#475569] mt-2 leading-relaxed max-w-[280px] mx-auto">
              ברגע שעסקה שהצטרפת אליה תיסגר, יופיע כאן שובר ההטבה האישי שלך עם קוד מימוש ו-QR.
            </p>
          </div>

        ) : (
          vouchers.map(v => (
            <VoucherCard
              key={v.id}
              voucher={{
                id: v.id, code: v.code, reference_number: v.reference_number,
                status: v.status, expires_at: v.expires_at, redeemed_at: v.redeemed_at,
                rotation_secret: v.rotation_secret,
                deal_id: v.deal_id, supplier_id: v.supplier_id,
                deal_title: v.deals?.title ?? undefined,
                supplier_name: v.suppliers?.business_name ?? undefined,
                price: v.deals?.discounted_price ?? v.deals?.original_price ?? null,
              }}
            />

          ))
        )}
      </div>
      <BottomNav role="resident" />
    </MobileShell>
  );
}
