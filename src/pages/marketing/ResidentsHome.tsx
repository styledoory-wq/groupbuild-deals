import { useQueryClient } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { ChevronLeft, Sparkles, Tag } from "lucide-react";
import { Seo } from "@/components/seo/Seo";
import { useApp } from "@/store/AppStore";
import { usePublicDeals, type PublicDeal } from "@/hooks/usePublicDeals";
import { usePullToRefresh } from "@/hooks/usePullToRefresh";
import { PullToRefreshIndicator } from "@/components/ui/PullToRefreshIndicator";
import { HomeDealSkeletonList } from "@/components/ui/HomeDealSkeleton";
import { ResidentHomeHero } from "@/components/resident-home/ResidentHomeHero";
import { WhatIsSection } from "@/components/resident-home/WhatIsSection";
import { HowItWorksSection } from "@/components/resident-home/HowItWorksSection";
import { BenefitsSection } from "@/components/resident-home/BenefitsSection";
import { ResidentHomeCta } from "@/components/resident-home/ResidentHomeCta";
import { Reveal } from "@/components/resident-home/Reveal";
import { cn } from "@/lib/utils";

/**
 * Residents Home — premium discovery entry point at "/".
 * Hero + search first; scroll-reveal marketing sections; live featured deals.
 * Guests and signed-in residents share this screen.
 */
export default function ResidentsHome() {
  const { user } = useApp();
  const signedIn = !!user;
  const { data: deals, isLoading, isError, refetch } = usePublicDeals(4);
  const qc = useQueryClient();
  const ptr = usePullToRefresh(async () => {
    await Promise.all([refetch(), qc.invalidateQueries({ queryKey: ["public-deals"] })]);
  });

  return (
    <div
      dir="rtl"
      className="min-h-[100dvh] w-full flex justify-center text-[#0B1220] overflow-x-hidden"
      style={{ background: "#F7F5F0" }}
    >
      <Seo
        title="GroupBuild — כוח קנייה קבוצתי לדיירים"
        description="התאגדות דיירים לרכישה קבוצתית — חיפוש ספקים, הצעות משתלמות וחיסכון בבית ובבניין."
        path="/"
      />
      <PullToRefreshIndicator {...ptr} />

      {/* Status-bar scrim — keeps scrolling content from appearing under the iOS clock */}
      <div
        aria-hidden
        className="fixed top-0 inset-x-0 z-[100] pointer-events-none bg-[#F7F5F0]/85 backdrop-blur-md"
        style={{ height: "env(safe-area-inset-top)" }}
      />

      <div
        className="relative w-full max-w-screen-sm flex flex-col"
        style={{ paddingBottom: "max(env(safe-area-inset-bottom), 28px)" }}
      >
        <ResidentHomeHero signedIn={signedIn} />

        <WhatIsSection />
        <HowItWorksSection />
        <BenefitsSection />
        <ResidentHomeCta signedIn={signedIn} />

        {/* Featured deals — real data */}
        <Reveal className="px-6 mt-10 pb-4">
          <div className="flex justify-between items-end mb-4">
            <h2 className="text-lg font-bold text-[#0B1220]">מבצעים לחברי הקהילה</h2>
            {deals && deals.length > 0 && (
              <Link
                to="/deals"
                className="text-[#0E6B5A] text-[11px] font-bold uppercase tracking-wider flex items-center gap-0.5"
              >
                צפה בהכל
                <ChevronLeft className="h-3.5 w-3.5" />
              </Link>
            )}
          </div>

          {isLoading && <HomeDealSkeletonList count={2} />}
          {!isLoading && isError && <DealsErrorState />}
          {!isLoading && !isError && (!deals || deals.length === 0) && <DealsEmptyState />}
          {!isLoading && !isError && deals && deals.length > 0 && (
            <div className="space-y-3">
              {deals.map((d) => (
                <DealCard key={d.id} deal={d} />
              ))}
            </div>
          )}
        </Reveal>
      </div>
    </div>
  );
}

function DealCard({ deal }: { deal: PublicDeal }) {
  const region = deal.service_areas?.[0];
  return (
    <Link
      to={`/deals/${deal.id}`}
      className="block bg-white rounded-2xl overflow-hidden border border-[#E4DFD4] shadow-[0_10px_30px_-16px_rgba(11,18,32,0.12)] hover:shadow-md transition-shadow"
    >
      <div
        className={cn(
          "h-40 relative bg-cover bg-center",
          !deal.cover_image_url && "bg-gradient-to-br from-[#E8EFEB] via-[#D8E7DF] to-[#C8DDCF]",
        )}
        style={deal.cover_image_url ? { backgroundImage: `url("${deal.cover_image_url}")` } : undefined}
      >
        {typeof deal.discount_percentage === "number" && deal.discount_percentage > 0 && (
          <div className="absolute top-3 left-3 bg-[#B24A3A] text-white text-[10px] font-bold px-2.5 py-1 rounded-md">
            {Math.round(deal.discount_percentage)}% הנחה
          </div>
        )}
        {region && (
          <div className="absolute bottom-3 right-3 bg-white/90 backdrop-blur-sm text-[#0E6B5A] text-[10.5px] font-semibold px-2.5 py-1 rounded-md">
            {region}
          </div>
        )}
      </div>
      <div className="p-4 flex justify-between items-start gap-3">
        <div className="min-w-0 flex-1">
          <h3 className="font-bold text-[#0B1220] truncate text-[14.5px]">{deal.title}</h3>
          <p className="text-xs text-stone-500 mt-0.5 truncate">{deal.supplier.business_name}</p>
        </div>
        <div className="text-[#0E6B5A] bg-[#0E6B5A]/10 p-2 rounded-xl shrink-0">
          <ChevronLeft className="h-5 w-5" />
        </div>
      </div>
    </Link>
  );
}

function DealsEmptyState() {
  return (
    <div className="bg-white rounded-2xl border border-[#E4DFD4] p-8 text-center">
      <div className="inline-flex items-center justify-center h-12 w-12 rounded-2xl bg-[#0E6B5A]/10 text-[#0E6B5A] mb-3">
        <Sparkles className="h-6 w-6" />
      </div>
      <h3 className="font-bold text-[#0B1220] text-[15px] mb-1">אין דילים פעילים כרגע</h3>
      <p className="text-[12.5px] text-stone-500 leading-relaxed max-w-xs mx-auto mb-4">
        אנחנו מוסיפים דילים קבוצתיים חדשים כל הזמן. בינתיים אפשר לעיין בקטגוריות ובספקים שלנו.
      </p>
      <Link
        to="/categories"
        className="inline-flex items-center gap-1.5 bg-[#0E6B5A] text-white font-bold text-[12.5px] px-5 py-2 rounded-xl hover:opacity-95"
      >
        עיינו בקטגוריות
        <ChevronLeft className="h-4 w-4" />
      </Link>
    </div>
  );
}

function DealsErrorState() {
  return (
    <div className="bg-white rounded-2xl border border-[#E4DFD4] p-6 text-center">
      <div className="inline-flex items-center justify-center h-10 w-10 rounded-xl bg-stone-100 text-stone-500 mb-2">
        <Tag className="h-5 w-5" />
      </div>
      <p className="text-[13px] text-stone-600 font-semibold">לא הצלחנו לטעון את הדילים</p>
      <p className="text-[11.5px] text-stone-400 mt-1">נסו לרענן את המסך.</p>
    </div>
  );
}
