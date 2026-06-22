import { useNavigate, useSearchParams } from "react-router-dom";
import { lazy, Suspense } from "react";
import { MobileShell } from "@/components/layout/MobileShell";
import { BottomNav } from "@/components/layout/BottomNav";
import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { LoadingState } from "@/components/ds";
import { cn } from "@/lib/utils";

const DepositsPage = lazy(() => import("./AdminDeposits"));
const PaymentSettingsPage = lazy(() => import("./AdminPaymentSettings"));

const TABS = [
  { key: "deposits", label: "פיקדונות" },
  { key: "settings", label: "הגדרות סליקה" },
] as const;

type TabKey = typeof TABS[number]["key"];

export default function AdminPayments() {
  const [params, setParams] = useSearchParams();
  const navigate = useNavigate();
  const tab = (params.get("tab") as TabKey) || "deposits";

  return (
    <MobileShell>
      <AdminPageHeader title="תשלומים" description="פיקדונות, יומן ניסיונות והגדרות סליקה" />

      <div dir="rtl" className="px-5 lg:px-8 pt-4 bg-white border-b border-[#ECEEF2]">
        <div className="inline-flex gap-1 p-1 bg-[#F4F6FA] rounded-[10px]">
          {TABS.map((t) => {
            const active = tab === t.key;
            return (
              <button
                key={t.key}
                onClick={() => setParams({ tab: t.key })}
                className={cn(
                  "px-4 h-9 rounded-[8px] text-[13px] font-extrabold transition-colors",
                  active ? "bg-white text-[#0F172A] shadow-sm" : "text-[#6B7280] hover:text-[#0F172A]",
                )}
              >
                {t.label}
              </button>
            );
          })}
        </div>
      </div>

      <Suspense fallback={<LoadingState fullHeight={false} />}>
        <div className="admin-tab-mount">
          {tab === "deposits" ? <DepositsPage /> : <PaymentSettingsPage />}
        </div>
      </Suspense>

      <BottomNav role="admin" />
    </MobileShell>
  );
}
