import { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { CheckCircle2, Loader2 } from "lucide-react";
import { MobileShell } from "@/components/layout/MobileShell";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";

export default function PaymentSuccess() {
  const [params] = useSearchParams();
  const dealId = params.get("deal_id");
  const depositId = params.get("deposit_id");
  const [checking, setChecking] = useState(true);
  const [paid, setPaid] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        if (!depositId) {
          setPaid(true);
          return;
        }
        const { data } = await supabase
          .from("deposits")
          .select("status")
          .eq("id", depositId)
          .maybeSingle();
        if (!cancelled) setPaid(data?.status === "paid");
      } finally {
        if (!cancelled) setChecking(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [depositId]);

  return (
    <MobileShell>
      <div className="min-h-[70vh] flex flex-col items-center justify-center px-6 text-center" dir="rtl">
        {checking ? (
          <Loader2 className="h-8 w-8 animate-spin text-[#0E6B5A]" />
        ) : (
          <>
            <div className="h-16 w-16 rounded-full bg-[#E7F5F0] flex items-center justify-center mb-4">
              <CheckCircle2 className="h-8 w-8 text-[#0E6B5A]" />
            </div>
            <h1 className="text-xl font-extrabold text-[#0F172A]">
              {paid ? "התשלום התקבל" : "התשלום בעיבוד"}
            </h1>
            <p className="text-sm text-muted-foreground mt-2 max-w-sm leading-relaxed">
              {paid
                ? "דמי ההשתתפות שולמו בהצלחה והמקום שלך בעסקה נשמר."
                : "קיבלנו את הבקשה. אם החיוב עבר בהצלחה, ההצטרפות תתעדכן תוך רגעים."}
            </p>
            <div className="flex flex-col gap-2 w-full max-w-xs mt-6">
              {dealId && (
                <Button asChild className="h-12 rounded-2xl bg-[#0E6B5A] font-extrabold">
                  <Link to={`/deals/${dealId}`}>חזרה לעסקה</Link>
                </Button>
              )}
              <Button asChild variant="outline" className="h-12 rounded-2xl font-bold">
                <Link to="/resident/deposits">דמי ההשתתפות שלי</Link>
              </Button>
            </div>
          </>
        )}
      </div>
    </MobileShell>
  );
}
