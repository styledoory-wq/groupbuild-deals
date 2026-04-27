import { MobileShell } from "@/components/layout/MobileShell";
import { PageHeader } from "@/components/layout/PageHeader";
import { BottomNav } from "@/components/layout/BottomNav";
import { useApp } from "@/store/AppStore";
import { ShieldCheck, Star, Check, X } from "lucide-react";
import { toast } from "sonner";

export default function AdminSuppliers() {
  const { suppliers, setSuppliers, categories } = useApp();

  const setStatus = (id: string, approvalStatus: "approved" | "rejected") => {
    setSuppliers(suppliers.map((s) => s.id === id ? { ...s, approvalStatus, verified: approvalStatus === "approved" } : s));
    toast.success(approvalStatus === "approved" ? "הספק אושר" : "הספק נדחה");
  };

  return (
    <MobileShell>
      <PageHeader title="ניהול ספקים" subtitle={`${suppliers.length} ספקים רשומים`} back={false} />
      <div className="px-5 -mt-4 relative z-10 space-y-3">
        {suppliers.map((s) => (
          <div key={s.id} className="gb-card p-4">
            <div className="flex items-start gap-3">
              <div className="h-12 w-12 rounded-2xl bg-gradient-hero flex items-center justify-center text-2xl shrink-0">{s.logoEmoji}</div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1 mb-0.5">
                  <h3 className="font-bold truncate">{s.businessName}</h3>
                  {s.verified && <ShieldCheck className="h-4 w-4 text-gold shrink-0" />}
                </div>
                <p className="text-[11px] text-muted-foreground">{s.ownerName} · {s.serviceArea}</p>
                <div className="flex items-center gap-2 mt-1.5 text-[11px]">
                  <span className="inline-flex items-center gap-0.5 text-muted-foreground">
                    <Star className="h-3 w-3 fill-gold text-gold" /> <b className="text-foreground">{s.rating}</b>
                  </span>
                  <span className="text-muted-foreground">עמלה: <b className="text-primary">{s.commissionPercent}%</b></span>
                  <span className="text-muted-foreground">{s.categoryIds.map(id => categories.find(c => c.id === id)?.name).filter(Boolean).join(", ")}</span>
                </div>
              </div>
            </div>

            {s.approvalStatus === "pending" ? (
              <div className="grid grid-cols-2 gap-2 mt-3 pt-3 border-t border-border">
                <button onClick={() => setStatus(s.id, "approved")} className="h-9 rounded-xl bg-success text-success-foreground text-xs font-bold flex items-center justify-center gap-1">
                  <Check className="h-4 w-4" /> אישור
                </button>
                <button onClick={() => setStatus(s.id, "rejected")} className="h-9 rounded-xl bg-muted text-foreground text-xs font-bold flex items-center justify-center gap-1">
                  <X className="h-4 w-4" /> דחייה
                </button>
              </div>
            ) : (
              <div className="mt-3 pt-3 border-t border-border flex items-center justify-between text-[11px]">
                <span className={"font-bold px-2 py-1 rounded-full " + (s.approvalStatus === "approved" ? "bg-success/10 text-success" : "bg-destructive/10 text-destructive")}>
                  {s.approvalStatus === "approved" ? "מאושר" : "נדחה"}
                </span>
                {s.featured && <span className="font-bold gb-gold-text">★ מובלט</span>}
              </div>
            )}
          </div>
        ))}
      </div>
      <BottomNav role="admin" />
    </MobileShell>
  );
}
