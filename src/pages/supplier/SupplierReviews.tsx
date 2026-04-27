import { Star } from "lucide-react";
import { MobileShell } from "@/components/layout/MobileShell";
import { PageHeader } from "@/components/layout/PageHeader";
import { BottomNav } from "@/components/layout/BottomNav";
import { useApp } from "@/store/AppStore";

export default function SupplierReviews() {
  const { reviews, suppliers, user } = useApp();
  const supplier = suppliers.find((s) => s.ownerName === user?.name) || suppliers[0];
  const mine = reviews.filter((r) => r.supplierId === supplier.id);

  const dist = [5, 4, 3, 2, 1].map((star) => ({
    star,
    count: mine.filter((r) => r.rating === star).length,
  }));
  const total = mine.length || 1;

  return (
    <MobileShell>
      <PageHeader title="ביקורות ומוניטין" subtitle="המוניטין שלך בעיני הדיירים" back={false} />

      <div className="px-5 -mt-4 relative z-10 mb-4">
        <div className="gb-card p-5 bg-gradient-card text-center">
          <div className="text-5xl font-extrabold text-primary">{supplier.rating}</div>
          <div className="flex items-center justify-center gap-0.5 mt-1">
            {[1, 2, 3, 4, 5].map((i) => (
              <Star key={i} className={"h-5 w-5 " + (i <= Math.round(supplier.rating) ? "fill-gold text-gold" : "text-muted")} />
            ))}
          </div>
          <p className="text-xs text-muted-foreground mt-1">{supplier.reviewsCount} ביקורות סך הכל</p>

          <div className="mt-4 space-y-1.5">
            {dist.map((d) => (
              <div key={d.star} className="flex items-center gap-2 text-[11px]">
                <span className="w-4 text-muted-foreground">{d.star}</span>
                <Star className="h-3 w-3 fill-gold text-gold" />
                <div className="flex-1 h-2 rounded-full bg-muted overflow-hidden">
                  <div className="h-full bg-gradient-gold" style={{ width: `${(d.count / total) * 100}%` }} />
                </div>
                <span className="w-6 text-left text-muted-foreground">{d.count}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="px-5 space-y-3">
        <h2 className="text-sm font-bold">ביקורות אחרונות</h2>
        {mine.map((r) => (
          <div key={r.id} className="gb-card p-4">
            <div className="flex items-center justify-between mb-1">
              <h3 className="font-bold text-sm">{r.userName}</h3>
              <div className="flex items-center gap-0.5">
                {[1, 2, 3, 4, 5].map((i) => (
                  <Star key={i} className={"h-3 w-3 " + (i <= r.rating ? "fill-gold text-gold" : "text-muted")} />
                ))}
              </div>
            </div>
            <p className="text-xs text-muted-foreground leading-relaxed">{r.text}</p>
            <p className="text-[10px] text-muted-foreground mt-2">{new Date(r.createdAt).toLocaleDateString("he-IL")}</p>
          </div>
        ))}
        {mine.length === 0 && (
          <div className="gb-card p-8 text-center text-sm text-muted-foreground">אין עדיין ביקורות</div>
        )}
      </div>

      <BottomNav role="supplier" />
    </MobileShell>
  );
}
