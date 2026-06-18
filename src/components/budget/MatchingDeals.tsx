import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Tag, ArrowLeft } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { BudgetResult, ILS } from "@/lib/budgetPricing";

type Deal = {
  id: string;
  title: string;
  original_price: number | null;
  discounted_price: number | null;
  discount_percentage: number | null;
  image_url: string | null;
  category_slug: string | null;
};

export function MatchingDeals({ result }: { result: BudgetResult }) {
  const [deals, setDeals] = useState<Deal[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const { data, error } = await supabase
          .from("deals")
          .select("id, title, original_price, discounted_price, discount_percentage, image_url, categories(slug)")
          .eq("status", "active")
          .eq("is_deleted", false)
          .limit(30);
        if (error) throw error;
        const slugs = new Set(result.matchedSlugs);
        const rows = (data ?? []) as unknown as Array<{
          id: string; title: string;
          original_price: number | null; discounted_price: number | null;
          discount_percentage: number | null; image_url: string | null;
          categories?: { slug?: string } | null;
        }>;
        const list: Deal[] = rows
          .map((d) => ({
            id: d.id,
            title: d.title,
            original_price: d.original_price,
            discounted_price: d.discounted_price,
            discount_percentage: d.discount_percentage,
            image_url: d.image_url,
            category_slug: d.categories?.slug ?? null,
          }))
          .filter((d) => !d.category_slug || slugs.has(d.category_slug))
          .slice(0, 6);
        if (!cancelled) setDeals(list);
      } catch {
        if (!cancelled) setDeals([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [result]);

  if (loading) return null;
  if (deals.length === 0) return null;

  return (
    <div className="bg-white rounded-3xl p-5 border border-[#E5E7EB] shadow-sm space-y-3" style={{ fontFamily: "'Epilogue', system-ui, sans-serif" }}>
      <div className="flex items-center gap-2">
        <div className="h-8 w-8 rounded-xl bg-[#FFFBEB] flex items-center justify-center">
          <Tag className="h-4 w-4 text-[#0E6B5A]" />
        </div>
        <h3 className="font-extrabold text-[#1F2937] text-[15px]" style={{ fontFamily: "'Urbanist'" }}>עסקאות שיכולות לחסוך לך כסף</h3>
      </div>
      <p className="text-[12px] text-[#6B7280]">עסקאות פעילות התואמות לחישוב שלך</p>

      <div className="space-y-2">
        {deals.map((d) => {
          const saving = d.original_price && d.discounted_price ? d.original_price - d.discounted_price : null;
          return (
            <Link
              key={d.id}
              to={`/resident/deals/${d.id}`}
              className="flex items-center gap-3 p-3 rounded-2xl bg-[#FCFBF8] border border-[#E5E7EB] hover:bg-white transition"
            >
              {d.image_url && (
                <img src={d.image_url} alt={d.title} className="h-12 w-12 rounded-xl object-cover" />
              )}
              <div className="flex-1 min-w-0">
                <div className="font-bold text-[13px] text-[#1F2937] truncate">{d.title}</div>
                {saving && saving > 0 && (
                  <div className="text-[11px] text-[#16A34A] font-bold">חיסכון פוטנציאלי: {ILS(saving)}</div>
                )}
              </div>
              <ArrowLeft className="h-4 w-4 text-[#9CA3AF]" />
            </Link>
          );
        })}
      </div>
    </div>
  );
}
