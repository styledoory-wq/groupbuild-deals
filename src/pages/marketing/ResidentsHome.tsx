import { Link } from "react-router-dom";
import { Search, ChevronLeft, Wallet, Users, ListChecks, Tag, Sparkles } from "lucide-react";
import { BrandMark } from "@/components/BrandLogo";
import { Seo } from "@/components/seo/Seo";
import { usePublicDeals, type PublicDeal } from "@/hooks/usePublicDeals";
import { cn } from "@/lib/utils";

/**
 * Residents Home — premium discovery entry for guests.
 * All content is live: featured deals are pulled from public, approved deals only.
 * Never shows demo/placeholder cards.
 */
export default function ResidentsHome() {
  const { data: deals, isLoading, isError } = usePublicDeals(4);

  return (
    <div
      dir="rtl"
      className="min-h-[100dvh] w-full flex justify-center text-[#0B1220]"
      style={{ background: "#F7F5F0" }}
    >
      <Seo
        title="GroupBuild — מצאו ספקים איכותיים לבית שלכם"
        description="חיפוש ספקים, קטגוריות ודילים קבוצתיים לדיירי פרויקטים חדשים. שימוש חופשי, ללא הרשמה."
        path="/"
      />

      <div
        className="relative w-full max-w-screen-sm flex flex-col"
        style={{
          paddingTop: "max(env(safe-area-inset-top), 24px)",
          paddingBottom: "max(env(safe-area-inset-bottom), 24px)",
        }}
      >
        {/* Header */}
        <header className="px-6 pt-2 pb-3 flex justify-between items-center animate-fade-up">
          <BrandMark className="h-10 w-auto" />
          <Link
            to="/auth/resident"
            className="text-[#0E6B5A] font-semibold text-sm border border-[#0E6B5A]/25 px-4 py-1.5 rounded-full hover:bg-[#0E6B5A]/5 transition-colors"
          >
            התחברות
          </Link>
        </header>

        {/* Hero + Search */}
        <section className="px-6 pt-3 pb-2 animate-fade-up">
          <h1 className="text-[26px] font-extrabold text-[#0B1220] leading-tight tracking-tight">
            מצאו את הספק
            <br />
            <span className="text-[#0E6B5A]">המתאים ביותר</span> עבורכם
          </h1>

          <Link
            to="/search"
            className="mt-5 relative block bg-white border border-stone-100 rounded-2xl shadow-[0_4px_16px_-8px_rgba(10,31,61,0.12)] py-4 pr-12 pl-4 text-right hover:shadow-[0_8px_20px_-8px_rgba(10,31,61,0.18)] transition-shadow"
          >
            <span className="text-stone-400 text-sm">חיפוש ספקים או שירותים...</span>
            <Search className="absolute right-4 top-1/2 -translate-y-1/2 h-5 w-5 text-stone-400" />
          </Link>

          <p className="mt-2 text-center text-[11.5px] text-[#6B7280]">
            מנוע חיפוש חופשי — קטגוריות, ספקים וערים. אין צורך בהרשמה.
          </p>
        </section>

        {/* Categories chips */}
        <section className="py-3 animate-fade-up">
          <div className="flex gap-3 px-6 overflow-x-auto no-scrollbar">
            <Link
              to="/categories"
              className="flex-shrink-0 px-5 py-2.5 bg-[#0E6B5A] text-white rounded-full text-sm font-medium shadow-[0_4px_12px_-4px_rgba(14,107,90,0.35)]"
            >
              כל הקטגוריות
            </Link>
            {["חשמלאים", "אינסטלטורים", "מיזוג אוויר", "מטבחים", "ריצוף"].map((label) => (
              <Link
                key={label}
                to="/categories"
                className="flex-shrink-0 px-5 py-2.5 bg-white text-stone-600 rounded-full text-sm font-medium border border-stone-100 shadow-sm hover:border-[#0E6B5A]/30 transition-colors"
              >
                {label}
              </Link>
            ))}
          </div>
        </section>

        {/* Featured deals — real data only */}
        <section className="px-6 py-3 animate-fade-up pb-24">
          <div className="flex justify-between items-end mb-4">
            <h2 className="text-lg font-bold text-[#0B1220]">מבצעים לחברי הקהילה</h2>
            {(deals && deals.length > 0) && (
              <Link
                to="/deals"
                className="text-[#0E6B5A] text-[11px] font-bold uppercase tracking-wider flex items-center gap-0.5"
              >
                צפה בהכל
                <ChevronLeft className="h-3.5 w-3.5" />
              </Link>
            )}
          </div>

          {isLoading && <DealSkeleton />}
          {!isLoading && isError && <DealsErrorState />}
          {!isLoading && !isError && (!deals || deals.length === 0) && <DealsEmptyState />}
          {!isLoading && !isError && deals && deals.length > 0 && (
            <div className="space-y-3">
              {deals.map((d) => (
                <DealCard key={d.id} deal={d} />
              ))}
            </div>
          )}
        </section>

        {/* Personal features teaser */}
        <section className="px-6 pt-2 pb-6 animate-fade-up">
          <div
            className="relative rounded-2xl p-6 text-white overflow-hidden shadow-[0_16px_40px_-16px_rgba(14,107,90,0.5)]"
            style={{ background: "linear-gradient(135deg, #0E6B5A 0%, #0a4f42 100%)" }}
          >
            <div className="relative z-10">
              <h3 className="text-lg font-bold mb-2">נהלו את הפרויקט שלכם</h3>
              <p className="text-[12.5px] text-white/85 leading-relaxed mb-5 max-w-[26rem]">
                תקציב, משימות, עסקאות קבוצתיות והצעות מותאמות — הכל במקום אחד.
              </p>
              <div className="flex flex-wrap gap-2 mb-5">
                <Chip icon={<Wallet className="h-3.5 w-3.5" />} label="תקציב" />
                <Chip icon={<Users className="h-3.5 w-3.5" />} label="עסקאות קבוצתיות" />
                <Chip icon={<ListChecks className="h-3.5 w-3.5" />} label="משימות" />
              </div>
              <Link
                to="/auth/resident?mode=signup"
                className="inline-flex items-center gap-1.5 bg-white text-[#0E6B5A] font-bold text-sm px-6 py-2.5 rounded-xl shadow-sm hover:shadow-md active:scale-[0.98] transition-all"
              >
                הצטרפות לקהילה
                <ChevronLeft className="h-4 w-4" />
              </Link>
            </div>
            <div aria-hidden className="absolute -bottom-10 -left-10 w-32 h-32 rounded-full blur-2xl" style={{ background: "rgba(255,255,255,0.10)" }} />
            <div aria-hidden className="absolute -top-10 -right-10 w-24 h-24 rounded-full blur-xl" style={{ background: "rgba(255,255,255,0.06)" }} />
          </div>
        </section>
      </div>
    </div>
  );
}

function DealCard({ deal }: { deal: PublicDeal }) {
  const region = deal.service_areas?.[0];
  return (
    <Link
      to={`/deals/${deal.id}`}
      className="block bg-white rounded-2xl overflow-hidden border border-stone-100 shadow-sm hover:shadow-md transition-shadow"
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

function DealSkeleton() {
  return (
    <div className="bg-white rounded-2xl overflow-hidden border border-stone-100">
      <div className="h-40 bg-stone-100 animate-pulse" />
      <div className="p-4 space-y-2">
        <div className="h-4 w-1/2 bg-stone-100 animate-pulse rounded" />
        <div className="h-3 w-1/3 bg-stone-100 animate-pulse rounded" />
      </div>
    </div>
  );
}

function DealsEmptyState() {
  return (
    <div className="bg-white rounded-2xl border border-stone-100 p-8 text-center">
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
    <div className="bg-white rounded-2xl border border-stone-100 p-6 text-center">
      <div className="inline-flex items-center justify-center h-10 w-10 rounded-xl bg-stone-100 text-stone-500 mb-2">
        <Tag className="h-5 w-5" />
      </div>
      <p className="text-[13px] text-stone-600 font-semibold">לא הצלחנו לטעון את הדילים</p>
      <p className="text-[11.5px] text-stone-400 mt-1">נסו לרענן את המסך.</p>
    </div>
  );
}

function Chip({ icon, label }: { icon: React.ReactNode; label: string }) {
  return (
    <span className="inline-flex items-center gap-1.5 bg-white/15 backdrop-blur-sm text-white text-[11.5px] font-medium px-2.5 py-1 rounded-full">
      {icon}
      {label}
    </span>
  );
}
