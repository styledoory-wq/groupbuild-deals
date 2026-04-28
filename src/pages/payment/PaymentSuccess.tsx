import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { CheckCircle2, Loader2 } from "lucide-react";
import { MobileShell } from "@/components/layout/MobileShell";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";

export default function PaymentSuccess() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const depositId = params.get("dep");
  const [status, setStatus] = useState<"checking" | "paid" | "pending">("checking");

  useEffect(() => {
    if (!depositId) return;
    let attempts = 0;
    const poll = async () => {
      attempts++;
      const { data } = await supabase.from("deposits").select("status").eq("id", depositId).maybeSingle();
      if (data?.status === "paid") setStatus("paid");
      else if (attempts < 8) setTimeout(poll, 1500);
      else setStatus("pending");
    };
    poll();
  }, [depositId]);

  return (
    <MobileShell>
      <div className="min-h-screen flex flex-col items-center justify-center px-6 text-center">
        {status === "checking" && (
          <>
            <Loader2 className="h-12 w-12 animate-spin text-gold mb-4" />
            <h1 className="text-xl font-bold mb-2">מאמתים את התשלום…</h1>
            <p className="text-sm text-muted-foreground">רגע אחד</p>
          </>
        )}
        {status === "paid" && (
          <>
            <div className="h-20 w-20 rounded-full bg-success/15 flex items-center justify-center mb-4">
              <CheckCircle2 className="h-12 w-12 text-success" />
            </div>
            <h1 className="text-2xl font-extrabold mb-2">הפיקדון התקבל ✨</h1>
            <p className="text-sm text-muted-foreground mb-6">המקום שלכם בעסקה מובטח.</p>
          </>
        )}
        {status === "pending" && (
          <>
            <h1 className="text-xl font-bold mb-2">התשלום ממתין לאישור</h1>
            <p className="text-sm text-muted-foreground mb-6">נעדכן ברגע שספק הסליקה יסיים את העיבוד.</p>
          </>
        )}
        <Button onClick={() => navigate("/resident")} className="h-12 rounded-2xl px-8 bg-primary text-primary-foreground font-bold">
          חזרה לעסקאות
        </Button>
      </div>
    </MobileShell>
  );
}
