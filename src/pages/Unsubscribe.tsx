import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Loader2, CheckCircle2, XCircle } from "lucide-react";

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL as string;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string;

type State = "loading" | "ready" | "already" | "invalid" | "submitting" | "success" | "error";

export default function Unsubscribe() {
  const [params] = useSearchParams();
  const token = params.get("token") || "";
  const [state, setState] = useState<State>("loading");
  const [email, setEmail] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string>("");

  useEffect(() => {
    if (!token) {
      setState("invalid");
      return;
    }
    (async () => {
      try {
        const res = await fetch(
          `${SUPABASE_URL}/functions/v1/handle-email-unsubscribe?token=${encodeURIComponent(token)}`,
          { headers: { apikey: SUPABASE_ANON_KEY } }
        );
        const data = await res.json().catch(() => ({}));
        if (!res.ok) {
          setState("invalid");
          setErrorMsg(data?.error || "טוקן לא תקין");
          return;
        }
        if (data?.alreadyUnsubscribed) {
          setEmail(data?.email ?? null);
          setState("already");
        } else {
          setEmail(data?.email ?? null);
          setState("ready");
        }
      } catch {
        setState("invalid");
      }
    })();
  }, [token]);

  async function confirm() {
    setState("submitting");
    try {
      const res = await fetch(`${SUPABASE_URL}/functions/v1/handle-email-unsubscribe`, {
        method: "POST",
        headers: { "Content-Type": "application/json", apikey: SUPABASE_ANON_KEY },
        body: JSON.stringify({ token }),
      });
      if (!res.ok) throw new Error("failed");
      setState("success");
    } catch {
      setState("error");
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4 bg-background" dir="rtl">
      <Card className="w-full max-w-md p-8 text-center space-y-4">
        <h1 className="text-2xl font-bold text-foreground">ביטול הרשמה לדיוור</h1>
        {state === "loading" && (
          <div className="flex flex-col items-center gap-2 text-muted-foreground">
            <Loader2 className="w-6 h-6 animate-spin" />
            <p>בודק את הקישור…</p>
          </div>
        )}
        {state === "ready" && (
          <>
            <p className="text-muted-foreground">
              האם להסיר את הכתובת{email ? ` ${email}` : ""} מרשימת הדיוור?
            </p>
            <Button onClick={confirm} className="w-full bg-secondary hover:bg-secondary/90">
              אישור ביטול הרשמה
            </Button>
          </>
        )}
        {state === "submitting" && (
          <div className="flex flex-col items-center gap-2 text-muted-foreground">
            <Loader2 className="w-6 h-6 animate-spin" />
            <p>מבטל הרשמה…</p>
          </div>
        )}
        {state === "success" && (
          <div className="flex flex-col items-center gap-2 text-foreground">
            <CheckCircle2 className="w-10 h-10 text-secondary" />
            <p>הוסרת בהצלחה מרשימת הדיוור.</p>
          </div>
        )}
        {state === "already" && (
          <div className="flex flex-col items-center gap-2 text-foreground">
            <CheckCircle2 className="w-10 h-10 text-secondary" />
            <p>הכתובת{email ? ` ${email}` : ""} כבר מוסרת מרשימת הדיוור.</p>
          </div>
        )}
        {(state === "invalid" || state === "error") && (
          <div className="flex flex-col items-center gap-2 text-destructive">
            <XCircle className="w-10 h-10" />
            <p>{errorMsg || "הקישור אינו תקין או שפג תוקפו."}</p>
          </div>
        )}
      </Card>
    </div>
  );
}
