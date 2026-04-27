import { Link } from "react-router-dom";
import { TrendingDown, Users, Clock } from "lucide-react";
import { Deal } from "@/types";
import { formatILS, getActiveTier, getNextTier, useApp } from "@/store/AppStore";
import { ProgressBar } from "@/components/ui/progress-bar";
import { cn } from "@/lib/utils";

export function DealCard({ deal, compact = false }: { deal: Deal; compact?: boolean }) {
  const { suppliers, categories } = useApp();
  const supplier = suppliers.find((s) => s.id === deal.supplierId);
  const category = categories.find((c) => c.id === deal.categoryId);
  const tier = getActiveTier(deal);
  const next = getNextTier(deal);
  const savings = Math.round(((deal.originalPrice - tier.price) / deal.originalPrice) * 100);

  const progressMax = next ? next.minParticipants : deal.paidParticipants;
  const progressVal = deal.paidParticipants;

  return (
    <Link to={`/resident/deals/${deal.id}`} className="block group">
      <article className="gb-card p-4 transition-smooth hover:shadow-elevated hover:-translate-y-0.5">
        <div className="flex items-start gap-3 mb-3">
          <div className="h-12 w-12 shrink-0 rounded-2xl bg-gradient-hero flex items-center justify-center text-2xl shadow-soft">
            {category?.icon || "🏷️"}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <span className="text-[11px] font-medium text-muted-foreground">{category?.name}</span>
              {deal.status === "closing-soon" && (
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-destructive/10 text-destructive">
                  נסגר בקרוב
                </span>
              )}
            </div>
            <h3 className="font-bold text-foreground leading-snug truncate">{deal.title}</h3>
            <p className="text-xs text-muted-foreground mt-0.5">{supplier?.businessName}</p>
          </div>
          <div className="text-left shrink-0">
            <div className="text-[10px] text-muted-foreground line-through">{formatILS(deal.originalPrice)}</div>
            <div className="text-lg font-extrabold text-primary leading-tight">{formatILS(tier.price)}</div>
            <div className="inline-flex items-center gap-1 text-[10px] font-bold text-success">
              <TrendingDown className="h-3 w-3" />
              {savings}% הנחה
            </div>
          </div>
        </div>

        {!compact && (
          <>
            <div className="flex items-center justify-between text-[11px] text-muted-foreground mb-1.5">
              <span className="inline-flex items-center gap-1">
                <Users className="h-3 w-3" />
                {deal.paidParticipants} שילמו פיקדון
              </span>
              {next ? (
                <span className="font-medium text-primary">
                  עוד {next.minParticipants - deal.paidParticipants} למחיר {formatILS(next.price)}
                </span>
              ) : (
                <span className="font-bold gb-gold-text">המחיר הטוב ביותר!</span>
              )}
            </div>
            <ProgressBar value={progressVal} max={progressMax} />

            <div className="mt-3 flex items-center justify-between">
              <div className="flex items-center gap-1 text-[11px] text-muted-foreground">
                <Clock className="h-3 w-3" />
                נסגר ב-{new Date(deal.endsAt).toLocaleDateString("he-IL")}
              </div>
              <span className={cn(
                "text-[11px] font-bold px-3 py-1 rounded-full",
                "bg-primary/5 text-primary"
              )}>
                {tier.label}
              </span>
            </div>
          </>
        )}
      </article>
    </Link>
  );
}
