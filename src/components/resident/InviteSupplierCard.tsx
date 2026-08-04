import { Gift } from "lucide-react";
import { cn } from "@/lib/utils";

type Props = {
  rewardAmount?: number;
  onInvite: () => void;
  className?: string;
};

/**
 * Marketing tile inviting residents to refer a professional supplier.
 * Matches ResidentDashboard emerald / white-space language.
 */
export function InviteSupplierCard({
  rewardAmount = 100,
  onInvite,
  className,
}: Props) {
  const amount = Math.round(Number(rewardAmount) || 100);

  return (
    <section className={cn("px-5 mt-5", className)}>
      <div
        className="rounded-3xl p-5 border border-[#0E6B5A]/15 shadow-sm relative overflow-hidden"
        style={{ background: "linear-gradient(135deg,#FFFFFF 0%,#E8F1EE 100%)" }}
      >
        <div className="absolute -top-8 -left-8 w-32 h-32 rounded-full bg-[#0E6B5A]/5 blur-2xl pointer-events-none" />
        <div className="relative z-10 text-right">
          <div className="flex items-start gap-3 mb-3">
            <div className="h-10 w-10 rounded-2xl bg-[#0E6B5A] flex items-center justify-center shrink-0">
              <Gift className="h-4 w-4 text-white" strokeWidth={2.2} />
            </div>
            <div className="min-w-0 flex-1">
              <h2 className="text-[17px] font-bold text-[#1C1C1E] tracking-tight leading-tight">
                מכירים בעל מקצוע?
              </h2>
              <p className="text-[13px] text-[#3D4A45] mt-1 leading-snug">
                הזמינו אותו ל־GroupBuild וקבלו {amount} ₪ קרדיט.
              </p>
            </div>
          </div>
          <p className="text-[11px] text-[#8E8E93] leading-snug mb-4">
            הקרדיט יינתן לאחר שהספק ישלים הרשמה ויאושר למערכת.
          </p>
          <button
            type="button"
            onClick={onInvite}
            className="w-full h-11 rounded-2xl bg-[#0E6B5A] text-white text-[13px] font-semibold inline-flex items-center justify-center active:scale-[0.98] transition-transform"
          >
            הזמן בעל מקצוע
          </button>
        </div>
      </div>
    </section>
  );
}
