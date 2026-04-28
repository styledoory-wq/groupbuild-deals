import { Link, useNavigate } from "react-router-dom";
import { Sparkles, TrendingDown, ArrowLeft, MapPin, ChevronLeft } from "lucide-react";
import { MobileShell } from "@/components/layout/MobileShell";
import { BottomNav } from "@/components/layout/BottomNav";
import { DealCard } from "@/components/deals/DealCard";
import { ProgressBar } from "@/components/ui/progress-bar";
import { formatILS, getActiveTier, useApp } from "@/store/AppStore";

export default function ResidentDashboard() {
  const navigate = useNavigate();
  const { user, projects, deals, categories, deposits } = useApp();
  const project = projects.find((p) => p.id === user?.projectId) || projects[0];
  const projectDeals = deals.filter((d) => d.projectId === project.id);
  const myDeposits = deposits.filter((d) => d.userId === user?.id);

  const totalSavings = myDeposits.reduce((sum, dep) => {
    const deal = deals.find((d) => d.id === dep.dealId);
    if (!deal) return sum;
    const tier = getActiveTier(deal);
    return sum + (deal.originalPrice - tier.price);
  }, 0);

  return (
    <MobileShell>
      {/* Hero Header */}
      <header className="bg-gradient-hero text-primary-foreground px-5 pt-9 pb-14 rounded-b-[24px] relative overflow-hidden">
        <div className="flex items-center justify-between mb-7 relative">
          <div>
            <p className="text-primary-foreground/55 text-[11px] uppercase tracking-wider">שלום</p>
            <h1 className="text-[26px] font-semibold mt-1 tracking-tight">{user?.name || "דייר"}</h1>
          </div>
          <button
            onClick={() => navigate("/resident/profile")}
            className="h-11 w-11 rounded-full bg-white/10 border border-white/15 flex items-center justify-center text-primary-foreground font-semibold transition-smooth hover:bg-white/15"
            aria-label="פרופיל"
          >
            {user?.name?.charAt(0) || "ד"}
          </button>
        </div>

        <button
          onClick={() => navigate("/resident/projects")}
          className="w-full bg-white/[0.06] backdrop-blur border border-white/10 rounded-2xl p-4 text-right hover:bg-white/[0.10] transition-smooth"
        >
          <div className="flex items-center justify-between">
            <div>
              <div className="flex items-center gap-1.5 text-[10px] text-gold uppercase tracking-wider mb-1.5">
                <MapPin className="h-3 w-3" strokeWidth={1.75} />
                <span>הפרויקט שלך</span>
              </div>
              <div className="font-semibold text-base">{project.name}</div>
              <div className="text-[11px] text-primary-foreground/55 mt-0.5">
                {project.city} · דירה {user?.apartment || "-"}
              </div>
            </div>
            <ChevronLeft className="h-5 w-5 text-gold" strokeWidth={1.75} />
          </div>
        </button>
      </header>

      {/* Savings card */}
      <div className="px-5 -mt-8 relative z-10 mb-7">
        <div className="gb-card p-5">
          <div className="flex items-center justify-between mb-4">
            <div>
              <p className="text-[11px] text-muted-foreground uppercase tracking-wider">סך החיסכון שלך</p>
              <p className="text-[28px] font-semibold text-primary mt-1.5 tracking-tight">{formatILS(totalSavings)}</p>
            </div>
            <div className="h-11 w-11 rounded-xl bg-muted/60 border border-border flex items-center justify-center">
              <TrendingDown className="h-[18px] w-[18px] text-gold" strokeWidth={1.75} />
            </div>
          </div>
          <div className="grid grid-cols-3 gap-2 pt-4 border-t border-border">
            <div className="text-center">
              <div className="text-base font-semibold text-primary">{myDeposits.length}</div>
              <div className="text-[10px] text-muted-foreground mt-1">עסקאות פעילות</div>
            </div>
            <div className="text-center border-x border-border">
              <div className="text-base font-semibold text-primary">{projectDeals.length}</div>
              <div className="text-[10px] text-muted-foreground mt-1">בפרויקט שלך</div>
            </div>
            <div className="text-center">
              <div className="text-base font-semibold gb-gold-text">{categories.length}</div>
              <div className="text-[10px] text-muted-foreground mt-1">קטגוריות</div>
            </div>
          </div>
        </div>
      </div>

      {/* Quick categories */}
      <section className="px-5 mb-7">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-[11px] uppercase tracking-wider text-muted-foreground">קטגוריות פופולריות</h2>
          <Link to="/resident/categories" className="text-xs gb-gold-text font-medium flex items-center gap-1">
            הכל <ArrowLeft className="h-3 w-3" strokeWidth={1.75} />
          </Link>
        </div>
        <div className="flex gap-3 overflow-x-auto no-scrollbar -mx-5 px-5">
          {categories.slice(0, 8).map((c) => (
            <Link
              key={c.id}
              to={`/resident/categories/${c.id}`}
              className="shrink-0 w-20 flex flex-col items-center gap-2 group"
            >
              <div className="h-16 w-16 rounded-2xl bg-card border border-border flex items-center justify-center text-xl group-hover:border-gold/50 transition-smooth">
                {c.icon}
              </div>
              <span className="text-[10px] text-center text-foreground leading-tight">{c.name}</span>
            </Link>
          ))}
        </div>
      </section>

      {/* Active deals */}
      <section className="px-5 space-y-3">
        <div className="flex items-center justify-between mb-1">
          <h2 className="text-[11px] uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
            <Sparkles className="h-3 w-3 text-gold" strokeWidth={1.75} />
            עסקאות פעילות בפרויקט שלך
          </h2>
        </div>
        {projectDeals.slice(0, 4).map((d) => (
          <DealCard key={d.id} deal={d} />
        ))}
      </section>

      <BottomNav role="resident" />
    </MobileShell>
  );
}
