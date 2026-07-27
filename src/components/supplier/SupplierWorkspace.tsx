import { useNavigate } from "react-router-dom";
import {
  Check, Clock, Pencil, LifeBuoy, Tag, MapPin, FileText, Briefcase,
  Users, Wallet, Sparkles, ArrowLeft, ShieldCheck, Phone, Mail, type LucideIcon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import type { SupplierCompleteness } from "@/lib/supplierCompleteness";

export const SUPPLIER_PAGE_BG = "#E4EBE7";
export const SUPPLIER_BG = SUPPLIER_PAGE_BG; // backwards-compatible alias
export const SUPPLIER_GREEN = "#0E6B5A";

export type SupplierApproval = "pending" | "rejected" | "approved" | "active" | string;

export function isSupplierLocked(status?: string | null) {
  return status === "pending" || status === "rejected";
}

export function isSupplierLive(status?: string | null) {
  return status === "approved" || status === "active";
}

/** Compact strip for Leads / Offers / Revenue / Account while waiting for approval. */
export function SupplierPendingBanner({
  status,
  className = "",
}: {
  status?: string | null;
  className?: string;
}) {
  const navigate = useNavigate();
  if (!isSupplierLocked(status)) return null;
  const rejected = status === "rejected";

  return (
    <div
      className={`rounded-2xl border px-3.5 py-3 flex items-start gap-3 ${
        rejected
          ? "bg-[#FEF2F2] border-[#FECACA]"
          : "bg-[#E8F5F1] border-[#0E6B5A]/20"
      } ${className}`}
      role="status"
    >
      <div
        className={`h-9 w-9 rounded-xl flex items-center justify-center shrink-0 ${
          rejected ? "bg-white text-[#DC2626]" : "bg-white text-[#0E6B5A]"
        }`}
      >
        {rejected ? <LifeBuoy className="h-4 w-4" /> : <Clock className="h-4 w-4" />}
      </div>
      <div className="flex-1 min-w-0 text-right">
        <div className={`text-[13px] font-bold ${rejected ? "text-[#991B1B]" : "text-[#0F172A]"}`}>
          {rejected ? "ההרשמה נדחתה" : "החשבון בבדיקה — עוד רגע מתחילים"}
        </div>
        <p className={`text-[12px] mt-0.5 leading-snug ${rejected ? "text-[#B91C1C]/80" : "text-[#0E6B5A]/90"}`}>
          {rejected
            ? "אפשר לעדכן פרטים ולפנות לתמיכה."
            : "בינתיים אפשר להשלים את הפרופיל ולהכיר את הכלים."}
        </p>
      </div>
      <button
        type="button"
        onClick={() => navigate(rejected ? "/support" : "/supplier/profile/edit")}
        className={`shrink-0 text-[12px] font-bold px-2.5 py-1.5 rounded-xl ${
          rejected ? "bg-white text-[#DC2626]" : "bg-white text-[#0E6B5A]"
        }`}
      >
        {rejected ? "תמיכה" : "פרופיל"}
      </button>
    </div>
  );
}

const STEP_ICONS: Record<string, LucideIcon> = {
  business_name: Briefcase,
  phone: Phone,
  email: Mail,
  category: Tag,
  area: MapPin,
  description: FileText,
};

/** Full pending/rejected home — feels like a workspace, not a dead-end. */
export function SupplierPendingWorkspace({
  businessName,
  firstName,
  status,
  completeness,
}: {
  businessName: string;
  firstName: string;
  status?: string | null;
  completeness: SupplierCompleteness | null;
}) {
  const navigate = useNavigate();
  const rejected = status === "rejected";
  const percent = completeness?.percent ?? 0;
  const steps = completeness?.steps ?? [];
  const missing = completeness?.missing ?? [];

  return (
    <div className="px-5 space-y-4 pb-8" dir="rtl">
      {/* Status hero */}
      <section
        className={`rounded-3xl overflow-hidden border shadow-sm ${
          rejected ? "border-[#FECACA] bg-white" : "border-[#0E6B5A]/15 bg-white"
        }`}
      >
        <div
          className={`px-5 pt-5 pb-4 ${
            rejected
              ? "bg-gradient-to-l from-[#FEF2F2] to-white"
              : "bg-gradient-to-l from-[#E8F5F1] to-white"
          }`}
        >
          <div className="flex items-start gap-3">
            <div
              className={`h-12 w-12 rounded-2xl flex items-center justify-center shrink-0 ${
                rejected ? "bg-[#FEE2E2] text-[#DC2626]" : "bg-[#0E6B5A] text-white"
              }`}
            >
              {rejected ? <LifeBuoy className="h-5 w-5" /> : <ShieldCheck className="h-5 w-5" />}
            </div>
            <div className="flex-1 min-w-0 text-right">
              <span
                className={`inline-flex items-center gap-1.5 text-[11px] font-bold px-2.5 py-1 rounded-full mb-2 ${
                  rejected ? "bg-[#FEE2E2] text-[#991B1B]" : "bg-white/90 text-[#0E6B5A] border border-[#0E6B5A]/20"
                }`}
              >
                <span className={`h-1.5 w-1.5 rounded-full ${rejected ? "bg-[#DC2626]" : "bg-[#0E6B5A] animate-pulse"}`} />
                {rejected ? "נדחה" : "ממתין לאישור"}
              </span>
              <h2 className="text-[18px] font-bold text-[#0F172A] tracking-tight leading-snug">
                {rejected ? "ההרשמה לא אושרה" : `שלום ${firstName}, הפרופיל בבדיקה`}
              </h2>
              <p className="text-[13px] text-[#64748B] mt-1.5 leading-relaxed">
                {rejected
                  ? "אפשר לעדכן את הפרטים ולפנות לתמיכה — נשמח לעזור."
                  : "בדרך כלל האישור לוקח עד יום־יומיים. בינתיים כדאי לוודא שהפרופיל מלא ומדויק — כך תתחילו לקבל פניות מיד אחרי האישור."}
              </p>
            </div>
          </div>
        </div>

        <div className="px-5 py-4 space-y-2">
          <Button
            type="button"
            onClick={() => navigate("/supplier/profile/edit")}
            className="w-full h-12 rounded-2xl bg-[#0E6B5A] hover:bg-[#0A5446] text-white font-semibold"
          >
            <Pencil className="h-4 w-4 ml-2" />
            {missing.length > 0 ? "השלמת פרטי העסק" : "עדכון / סקירת פרופיל"}
          </Button>
          {rejected && (
            <Button
              type="button"
              variant="outline"
              onClick={() => navigate("/support")}
              className="w-full h-11 rounded-2xl border-[#FECACA] text-[#DC2626] font-semibold"
            >
              <LifeBuoy className="h-4 w-4 ml-2" /> פנייה לתמיכה
            </Button>
          )}
        </div>
      </section>

      {/* Profile readiness */}
      {completeness && (
        <section className="rounded-[24px] border border-[#D5DED9] bg-white p-5 shadow-[0_2px_14px_-6px_rgba(15,23,42,0.10)]">
          <div className="flex items-center justify-between gap-3 mb-3">
            <span className="text-[13px] font-bold text-[#0E6B5A] tabular-nums">{percent}%</span>
            <div className="text-right">
              <h3 className="text-[15px] font-bold text-[#0F172A]">מוכנות הפרופיל</h3>
              <p className="text-[12px] text-[#8E95A2] mt-0.5">
                {percent >= 100 ? "הכל מלא — מחכים רק לאישור" : `${missing.length} פריטים להשלמה`}
              </p>
            </div>
          </div>
          <div className="h-2 rounded-full bg-[#F1F5F9] overflow-hidden mb-4">
            <div
              className="h-full rounded-full transition-all duration-500"
              style={{
                width: `${percent}%`,
                background: "linear-gradient(90deg, #0E6B5A, #1A8870)",
              }}
            />
          </div>
          <ul className="space-y-2">
            {steps.map((step) => {
              const Icon = STEP_ICONS[step.key] ?? Check;
              return (
                <li key={step.key} className="flex items-center gap-3">
                  <div
                    className={`h-8 w-8 rounded-xl flex items-center justify-center shrink-0 ${
                      step.done ? "bg-[#E8F5F1] text-[#0E6B5A]" : "bg-[#F4F6F9] text-[#94A3B8]"
                    }`}
                  >
                    {step.done ? <Check className="h-4 w-4" strokeWidth={2.6} /> : <Icon className="h-3.5 w-3.5" />}
                  </div>
                  <span className={`flex-1 text-[13px] font-semibold text-right ${step.done ? "text-[#0F172A]" : "text-[#64748B]"}`}>
                    {step.label}
                  </span>
                  {!step.done && (
                    <button
                      type="button"
                      onClick={() => navigate("/supplier/profile/edit")}
                      className="text-[11px] font-bold text-[#0E6B5A]"
                    >
                      השלם
                    </button>
                  )}
                </li>
              );
            })}
          </ul>
        </section>
      )}

      {/* Tools preview — relevant even before approval */}
      <section>
        <div className="flex items-center gap-2 mb-3 px-1">
          <Sparkles className="h-4 w-4 text-[#0E6B5A]" />
          <h3 className="text-[15px] font-bold text-[#0F172A]">מה מחכה לך אחרי האישור</h3>
        </div>
        <div className="space-y-2.5">
          <ToolPreview
            icon={Briefcase}
            title="הצעות"
            body="פרסמו מבצע קבוצתי — דיירים בפרויקטים רלוונטיים יראו אתכם."
            to="/supplier/offers"
            cta="לסקירת ההצעות"
          />
          <ToolPreview
            icon={Users}
            title="לידים"
            body="פניות מדיירים מגיעות לכאן — עם טלפון, הערות ושלב טיפול."
            to="/supplier/leads"
            cta="למסך הלידים"
          />
          <ToolPreview
            icon={Wallet}
            title="הכנסות"
            body="מעקב אחרי מימושים, פיקדונות והכנסות חודשיות במקום אחד."
            to="/supplier/revenue"
            cta="להכנסות"
          />
        </div>
      </section>

      <p className="text-center text-[11px] text-[#94A3B8] pt-1">
        {businessName} · GroupBuild Supplier
      </p>
    </div>
  );
}

function ToolPreview({
  icon: Icon,
  title,
  body,
  to,
  cta,
}: {
  icon: LucideIcon;
  title: string;
  body: string;
  to: string;
  cta: string;
}) {
  const navigate = useNavigate();
  return (
    <button
      type="button"
      onClick={() => navigate(to)}
      className="w-full text-right rounded-2xl border border-[#D5DED9] bg-white p-4 shadow-[0_2px_14px_-6px_rgba(15,23,42,0.10)] active:scale-[0.99] transition flex items-start gap-3"
    >
      <div className="h-10 w-10 rounded-2xl bg-[#0E6B5A]/10 text-[#0E6B5A] flex items-center justify-center shrink-0">
        <Icon className="h-[18px] w-[18px]" strokeWidth={2.2} />
      </div>
      <div className="flex-1 min-w-0">
        <div className="text-[14px] font-bold text-[#0F172A]">{title}</div>
        <p className="text-[12px] text-[#8E95A2] mt-0.5 leading-snug">{body}</p>
        <span className="inline-flex items-center gap-0.5 text-[12px] font-bold text-[#0E6B5A] mt-2">
          {cta} <ArrowLeft className="h-3.5 w-3.5" />
        </span>
      </div>
    </button>
  );
}

/** Getting-started panel for approved suppliers with no offers yet. */
export function SupplierGettingStarted({ businessName }: { businessName: string }) {
  const navigate = useNavigate();
  return (
    <section className="px-5 mt-5">
      <div className="rounded-3xl border border-[#0E6B5A]/15 bg-white overflow-hidden shadow-sm">
        <div className="bg-gradient-to-l from-[#E8F5F1] to-white px-5 pt-5 pb-4">
          <div className="inline-flex items-center gap-1.5 text-[11px] font-bold px-2.5 py-1 rounded-full bg-white text-[#0E6B5A] border border-[#0E6B5A]/20 mb-2">
            <span className="h-1.5 w-1.5 rounded-full bg-[#0E6B5A]" /> מוכן להתחיל
          </div>
          <h2 className="text-[17px] font-bold text-[#0F172A] tracking-tight">
            {businessName} — צרו את ההצעה הראשונה
          </h2>
          <p className="text-[13px] text-[#64748B] mt-1.5 leading-relaxed">
            הצעה פעילה היא הדרך לקבל לידים מדיירים בפרויקטים. אפשר להתחיל ממבצע פשוט ולשפר בהמשך.
          </p>
        </div>
        <div className="px-5 py-4 space-y-2">
          <Button
            type="button"
            onClick={() => navigate("/supplier/offers/new")}
            className="w-full h-12 rounded-2xl bg-[#0E6B5A] hover:bg-[#0A5446] text-white font-semibold"
          >
            יצירת הצעה ראשונה
          </Button>
          <Button
            type="button"
            variant="outline"
            onClick={() => navigate("/supplier/profile/edit")}
            className="w-full h-11 rounded-2xl font-semibold"
          >
            סקירת פרופיל העסק
          </Button>
        </div>
      </div>
    </section>
  );
}
