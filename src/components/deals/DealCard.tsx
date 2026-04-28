import { Link } from "react-router-dom";
import { Users, Clock, Tag as TagIcon } from "lucide-react";
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
      <article className="gb-card p-5 transition-smooth hover:border-gold/40">
        <div className="flex items-start gap-4 mb-4">
          <div className="h-11 w-11 shrink-0 rounded-xl bg-muted/60 border border-border flex items-center justify-center text-primary">
            <TagIcon className="h-4 w-4" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1.5">
              <span className="text-[11px] uppercase tracking-wider text-muted-foreground">{category?.name}</span>
              {deal.status === "closing-soon" && (
                <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-destructive/10 text-destructive">
                  נסגר בקרוב
                </span>
              )}
            </div>
            <h3 className="font-semibold text-base text-foreground leading-snug truncate">{deal.title}</h3>
            <p className="text-xs text-muted-foreground mt-1">{supplier?.businessName}</p>
          </div>
          <div className="text-left shrink-0">
            <div className="text-[10px] text-muted-foreground line-through">{formatILS(deal.originalPrice)}</div>
            <div className="text-lg font-bold text-primary leading-tight mt-0.5">{formatILS(tier.price)}</div>
            <div className="text-[10px] font-medium text-success mt-0.5">
              {savings}%- הנחה
            </div>
          </div>
        </div>

        {!compact && (
          <>
            <div className="flex items-center justify-between text-[11px] text-muted-foreground mb-2">
              <span className="inline-flex items-center gap-1.5">
                <Users className="h-3 w-3" />
                {deal.paidParticipants} שילמו פיקדון
              </span>
              {next ? (
                <span className="text-primary">
                  עוד {next.minParticipants - deal.paidParticipants} למחיר {formatILS(next.price)}
                </span>
              ) : (
                <span className="font-medium gb-gold-text">המחיר הטוב ביותר</span>
              )}
            </div>
            <ProgressBar value={progressVal} max={progressMax} />

            <div className="mt-4 flex items-center justify-between pt-4 border-t border-border">
              <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
                <Clock className="h-3 w-3" />
                נסגר ב-{new Date(deal.endsAt).toLocaleDateString("he-IL")}
              </div>
              <span className={cn(
                "text-[11px] font-medium px-2.5 py-1 rounded-full",
                "bg-muted/60 text-foreground border border-border"
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
