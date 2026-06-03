import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Search as SearchIcon, Store } from "lucide-react";
import { MobileShell } from "@/components/layout/MobileShell";
import { BottomNav } from "@/components/layout/BottomNav";
import { PageHeader } from "@/components/layout/PageHeader";
import { supabase } from "@/integrations/supabase/client";
import { SupplierLogo } from "@/components/suppliers/SupplierLogo";

type SupplierRow = {
  id: string;
  business_name: string;
  short_description: string | null;
  logo_url: string | null;
};

export default function SearchPage() {
  const [q, setQ] = useState("");
  const [suppliers, setSuppliers] = useState<SupplierRow[]>([]);
  const [loading, setLoading] = useState(false);

  const term = q.trim();

  useEffect(() => {
    if (!term) {
      setSuppliers([]);
      return;
    }
    let cancelled = false;
    const t = setTimeout(async () => {
      setLoading(true);
      try {
        const { data } = await supabase
          .from("suppliers")
          .select("id,business_name,short_description,logo_url,is_active,approval_status")
          .eq("is_active", true)
          .in("approval_status", ["approved", "active"])
          .or(`business_name.ilike.%${term}%,short_description.ilike.%${term}%`)
          .limit(40);
        if (cancelled) return;
        setSuppliers((data ?? []) as SupplierRow[]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }, 250);
    return () => {
      cancelled = true;
      clearTimeout(t);
    };
  }, [term]);

  const showEmpty = !term;

  return (
    <MobileShell>
      <PageHeader title="חיפוש ספקים" subtitle="מצא ספקים ובעלי מקצוע" />
      <div className="px-5 pb-28 space-y-4">
        <div className="relative">
          <SearchIcon className="absolute right-4 top-1/2 -translate-y-1/2 h-5 w-5 text-[#94A3B8]" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="חפש ספקים, בעלי מקצוע..."
            className="w-full h-12 rounded-2xl bg-white border border-[#E2E8F0] pr-11 pl-4 text-fs-base text-[#0D1B2E] placeholder:text-[#94A3B8] focus:outline-none focus:border-[#C9A84C] focus:ring-[3px] focus:ring-[#C9A84C]/15 transition"
            dir="rtl"
          />
        </div>

        {showEmpty ? (
          <div className="flex flex-col items-center justify-center text-center py-20 text-[#94A3B8]">
            <div className="h-16 w-16 rounded-2xl bg-white border border-[#E2E8F0] flex items-center justify-center mb-4">
              <SearchIcon className="h-7 w-7 text-[#C9A84C]" />
            </div>
            <p className="text-fs-base font-semibold text-[#475569]">התחל לחפש ספקים...</p>
          </div>
        ) : loading ? (
          <div className="space-y-3">
            <div className="h-20 gb-skeleton rounded-2xl" />
            <div className="h-20 gb-skeleton rounded-2xl" />
          </div>
        ) : suppliers.length === 0 ? (
          <p className="text-center text-[#94A3B8] py-12 text-fs-sm">לא נמצאו ספקים</p>
        ) : (
          <div className="space-y-3">
            {suppliers.map((s) => (
              <Link
                key={s.id}
                to={`/suppliers/${s.id}`}
                className="flex items-center gap-3 bg-white rounded-2xl p-3 border border-[#E2E8F0] shadow-[0_4px_14px_-8px_rgba(15,30,60,0.08)] hover:border-[#C9A84C]/40 transition"
              >
                <SupplierLogo logoUrl={s.logo_url} name={s.business_name} size="md" />
                <div className="flex-1 min-w-0">
                  <p className="font-bold text-fs-base text-[#0D1B2E] truncate">{s.business_name}</p>
                  {s.short_description && (
                    <p className="text-fs-xs text-[#64748B] truncate">{s.short_description}</p>
                  )}
                </div>
                <Store className="h-5 w-5 text-[#C9A84C]" />
              </Link>
            ))}
          </div>
        )}
      </div>
      <BottomNav role="resident" />
    </MobileShell>
  );
}
