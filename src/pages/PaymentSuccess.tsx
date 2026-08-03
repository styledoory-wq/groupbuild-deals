import { useCallback, useEffect, useRef, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { AlertTriangle, CheckCircle2, Clock, Loader2, RefreshCw } from "lucide-react";
import { MobileShell } from "@/components/layout/MobileShell";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";

/** Server-confirmed states. Success is NEVER shown before the server says "paid". */
type Phase = "checking" | "paid" | "pending" | "failed" | "unknown";

const FAILED_STATUSES = new Set(["failed", "canceled", "cancelled", "expired", "refunded"]);
/** Poll every 2s, give up (→ "pending") after 45s and let the user retry manually. */
const POLL_MS = 2000;
const TIMEOUT_MS = 45000;

export default function PaymentSuccess() {
  const [params] = useSearchParams();
  const dealId = params.get("deal_id");
  const depositId = params.get("deposit_id");

  const [phase, setPhase] = useState<Phase>(depositId ? "checking" : "unknown");
  const [rechecking, setRechecking] = useState(false);
  const startedAt = useRef(Date.now());

  /** Reads the authoritative deposit status. Returns true when settled. */
  const readStatus = useCallback(async (): Promise<boolean> => {
    if (!depositId) return true;
    const { data, error } = await supabase
      .from("deposits")
      .select("status")
      .eq("id", depositId)
      .maybeSingle();
    if (error) return false;
    const status = (data?.status ?? "").toLowerCase();
    if (status === "paid") {
      setPhase("paid");
      return true;
    }
    if (FAILED_STATUSES.has(status)) {
      setPhase("failed");
      return true;
    }
    return false;
  }, [depositId]);

  useEffect(() => {
    if (!depositId) return;
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout> | undefined;

    // Realtime: the Cardcom webhook flips the row the moment it lands.
    const channel = supabase
      .channel(`deposit-${depositId}`)
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "deposits", filter: `id=eq.${depositId}` },
        () => {
          if (!cancelled) void readStatus();
        },
      )
      .subscribe();

    // Polling fallback with a hard timeout — never spins forever.
    const tick = async () => {
      if (cancelled) return;
      const settled = await readStatus();
      if (cancelled || settled) return;
      if (Date.now() - startedAt.current > TIMEOUT_MS) {
        setPhase("pending");
        return;
      }
      timer = setTimeout(tick, POLL_MS);
    };
    void tick();

    return () => {
      cancelled = true;
      if (timer) clearTimeout(timer);
      void supabase.removeChannel(channel);
    };
  }, [depositId, readStatus]);

  const recheck = async () => {
    setRechecking(true);
    const settled = await readStatus();
    if (!settled) setPhase("pending");
    setRechecking(false);
  };

  const view = {
    checking: {
      icon: <Loader2 className="h-8 w-8 animate-spin text-primary" />,
      wrap: "bg-muted",
      title: "מאמתים את התשלום",
      body: "רגע אחד, אנחנו מקבלים אישור מחברת הסליקה.",
    },
    paid: {
      icon: <CheckCircle2 className="h-8 w-8 text-primary" />,
      wrap: "bg-primary/10",
      title: "התשלום התקבל",
      body: "דמי ההשתתפות שולמו בהצלחה והמקום שלך בעסקה נשמר.",
    },
    pending: {
      icon: <Clock className="h-8 w-8 text-amber-600" />,
      wrap: "bg-amber-100",
      title: "התשלום עדיין ממתין לאישור",
      body: "לא קיבלנו עדיין אישור סופי מחברת הסליקה. אפשר לבדוק שוב או לחזור מאוחר יותר — לא תחויב פעמיים.",
    },
    failed: {
      icon: <AlertTriangle className="h-8 w-8 text-destructive" />,
      wrap: "bg-destructive/10",
      title: "התשלום לא הושלם",
      body: "החיוב לא בוצע ולא נשמר לך מקום בעסקה. אפשר לנסות שוב מדף העסקה.",
    },
    unknown: {
      icon: <Clock className="h-8 w-8 text-amber-600" />,
      wrap: "bg-amber-100",
      title: "לא נמצאו פרטי תשלום",
      body: "לא הצלחנו לזהות את התשלום. בדוק את הסטטוס במסך דמי ההשתתפות שלי.",
    },
  }[phase];

  return (
    <MobileShell>
      <div className="min-h-[70dvh] flex flex-col items-center justify-center px-6 text-center" dir="rtl">
        <div className={`h-16 w-16 rounded-full flex items-center justify-center mb-4 ${view.wrap}`}>
          {view.icon}
        </div>
        <h1 className="text-xl font-extrabold text-foreground">{view.title}</h1>
        <p className="text-sm text-muted-foreground mt-2 max-w-sm leading-relaxed">{view.body}</p>

        {phase !== "checking" && (
          <div className="flex flex-col gap-2 w-full max-w-xs mt-6">
            {(phase === "pending" || phase === "unknown") && depositId && (
              <Button onClick={recheck} disabled={rechecking} className="h-12 rounded-2xl font-extrabold">
                {rechecking ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <RefreshCw className="h-4 w-4" />
                )}
                בדוק שוב
              </Button>
            )}
            {dealId && (
              <Button
                asChild
                variant={phase === "paid" ? "default" : "outline"}
                className="h-12 rounded-2xl font-extrabold"
              >
                <Link to={`/deals/${dealId}`}>
                  {phase === "failed" ? "חזרה לעסקה ונסה שוב" : "חזרה לעסקה"}
                </Link>
              </Button>
            )}
            <Button asChild variant="outline" className="h-12 rounded-2xl font-bold">
              <Link to="/resident/deposits">דמי ההשתתפות שלי</Link>
            </Button>
          </div>
        )}
      </div>
    </MobileShell>
  );
}
