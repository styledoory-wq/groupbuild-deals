import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { MapPin, ImageIcon, ShieldCheck, Loader2, ExternalLink } from "lucide-react";
import { MobileShell } from "@/components/layout/MobileShell";
import { PageHeader } from "@/components/layout/PageHeader";
import { SupplierLogo } from "@/components/suppliers/SupplierLogo";
import { supabase } from "@/integrations/supabase/client";

interface Row {
  id: string;
  business_name: string;
  approval_status: string;
  is_active: boolean;
  logo_url: string | null;
  serves_all_country: boolean;
}

export default function AdminDbSuppliers() {
  const navigate = useNavigate();
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from("suppliers")
        .select("id,business_name,approval_status,is_active,logo_url,serves_all_country")
        .order("business_name");
      setRows((data as Row[]) ?? []);
      setLoading(false);
    })();
  }, []);

  if (loading) {
    return (
      <MobileShell>
        <div className="min-h-[60vh] flex items-center justify-center">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      </MobileShell>
    );
  }

  return (
    <MobileShell>
      <PageHeader title="ספקים (מסד נתונים)" subtitle={`${rows.length} ספקים רשומים`} back />
      <div className="px-5 -mt-2 space-y-3 pb-8">
        {rows.length === 0 && (
          <div className="gb-card p-6 text-center text-sm text-muted-foreground">אין ספקים רשומים עדיין</div>
        )}
        {rows.map((r) => (
          <div key={r.id} className="gb-card p-4 space-y-3">
            <div className="flex items-start gap-3">
              <SupplierLogo name={r.business_name} logoUrl={r.logo_url} size="md" />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5">
                  <h3 className="font-bold truncate">{r.business_name}</h3>
                  {r.approval_status === "approved" && <ShieldCheck className="h-4 w-4 text-gold shrink-0" />}
                </div>
                <p className="text-[11px] text-muted-foreground mt-0.5">
                  {r.serves_all_country ? "כל הארץ" : "אזורים נבחרים"} · {r.is_active ? "פעיל" : "לא פעיל"}
                </p>
              </div>
            </div>
            <div className="grid grid-cols-3 gap-2">
              <button
                onClick={() => navigate(`/admin/suppliers/${r.id}/media`)}
                className="h-9 rounded-xl bg-secondary text-secondary-foreground text-xs font-bold flex items-center justify-center gap-1"
              >
                <ImageIcon className="h-3.5 w-3.5" /> מדיה
              </button>
              <button
                onClick={() => navigate(`/admin/suppliers/${r.id}/areas`)}
                className="h-9 rounded-xl bg-gold/10 text-primary border border-gold/30 text-xs font-bold flex items-center justify-center gap-1"
              >
                <MapPin className="h-3.5 w-3.5" /> אזורים
              </button>
              <button
                onClick={() => navigate(`/suppliers/${r.id}`)}
                className="h-9 rounded-xl bg-primary text-primary-foreground text-xs font-bold flex items-center justify-center gap-1"
              >
                <ExternalLink className="h-3.5 w-3.5" /> תצוגה
              </button>
            </div>
          </div>
        ))}
      </div>
    </MobileShell>
  );
}
