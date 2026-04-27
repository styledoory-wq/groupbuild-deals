import { Link, useNavigate } from "react-router-dom";
import { Sparkles, TrendingDown, Wallet, ArrowLeft, MapPin, Home as HomeIcon, ChevronLeft } from "lucide-react";
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
      <header className="bg-gradient-hero text-primary-foreground px-5 pt-8 pb-12 rounded-b-[32px] relative overflow-hidden">
        <div className="absolute -top-20 -left-10 h-48 w-48 rounded-full bg-gold/10 blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 -right-12 h-36 w-36 rounded-full bg-gold/5 blur-2xl pointer-events-none" />

        <div className="flex items-center justify-between mb-6 relative">
          <div>
            <p className="text-primary-foreground/60 text-xs">שלום,</p>
            <h1 className="text-2xl font-bold">{user?.name || "דייר"} 👋</h1>
          </div>
          <button
            onClick={() => navigate("/resident/profile")}
            className="h-11 w-11 rounded-full bg-gradient-gold flex items-center justify-center text-primary font-bold shadow-gold"
          >
            {user?.name?.charAt(0) || "ד"}
          </button>
        </div>

        <button
          onClick={() => navigate("/resident/projects")}
          className="w-full bg-white/10 backdrop-blur border border-white/15 rounded-2xl p-4 text-right hover:bg-white/15 transition-smooth relative"
        >
          <div className="flex items-center justify-between">
            <div>
              <div className="flex items-center gap-1.5 text-[11px] text-gold mb-1">
                <MapPin className="h-3 w-3" />
                <span>הפרויקט שלך</span>
              </div>
              <div className="font-bold text-base">{project.name}</div>
              <div className="text-[11px] text-primary-foreground/60 mt-0.5">
                {project.city} · דירה {user?.apartment || "-"}
              </div>
            </div>
            <ChevronLeft className="h-5 w-5 text-gold" />
          </div>
        </button>
      </header>

      {/* Savings card */}
      <div className="px-5 -mt-6 relative z-10 mb-6">
        <div className="gb-card p-5 bg-gradient-card">
          <div className="flex items-center justify-between mb-3">
            <div>
              <p className="text-xs text-muted-foreground">סך החיסכון שלך</p>
              <p className="text-3xl font-extrabold text-primary mt-1">{formatILS(totalSavings)}</p>
            </div>
            <div className="h-14 w-14 rounded-2xl bg-gradient-gold flex items-center justify-center shadow-gold">
              <TrendingDown className="h-7 w-7 text-primary" />
            </div>
          </div>
          <div className="grid grid-cols-3 gap-2 pt-3 border-t border-border">
            <div className="text-center">
              <div className="text-lg font-bold text-primary">{myDeposits.length}</div>
              <div className="text-[10px] text-muted-foreground">עסקאות פעילות</div>
            </div>
            <div className="text-center border-x border-border">
              <div className="text-lg font-bold text-primary">{projectDeals.length}</div>
              <div className="text-[10px] text-muted-foreground">בפרויקט שלך</div>
            </div>
            <div className="text-center">
              <div className="text-lg font-bold gb-gold-text">{categories.length}</div>
              <div className="text-[10px] text-muted-foreground">קטגוריות</div>
            </div>
          </div>
        </div>
      </div>

      {/* Quick categories */}
      <section className="px-5 mb-6">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-base font-bold text-foreground">קטגוריות פופולריות</h2>
          <Link to="/resident/categories" className="text-xs gb-gold-text font-bold flex items-center gap-1">
            הכל <ArrowLeft className="h-3 w-3" />
          </Link>
        </div>
        <div className="flex gap-2 overflow-x-auto no-scrollbar -mx-5 px-5">
          {categories.slice(0, 8).map((c) => (
            <Link
              key={c.id}
              to={`/resident/categories/${c.id}`}
              className="shrink-0 w-20 flex flex-col items-center gap-1.5 group"
            >
              <div className="h-16 w-16 rounded-2xl bg-card border border-border shadow-soft flex items-center justify-center text-2xl group-hover:border-gold group-hover:shadow-card transition-smooth">
                {c.icon}
              </div>
              <span className="text-[10px] text-center text-foreground font-medium leading-tight">{c.name}</span>
            </Link>
          ))}
        </div>
      </section>

      {/* Active deals */}
      <section className="px-5 space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-bold text-foreground flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-gold" />
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
