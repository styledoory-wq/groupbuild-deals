import { Link, useSearchParams } from "react-router-dom";
import { XCircle } from "lucide-react";
import { MobileShell } from "@/components/layout/MobileShell";
import { Button } from "@/components/ui/button";

export default function PaymentCancel() {
  const [params] = useSearchParams();
  const dealId = params.get("deal_id");

  return (
    <MobileShell>
      <div className="min-h-[70vh] flex flex-col items-center justify-center px-6 text-center" dir="rtl">
        <div className="h-16 w-16 rounded-full bg-muted flex items-center justify-center mb-4">
          <XCircle className="h-8 w-8 text-muted-foreground" />
        </div>
        <h1 className="text-xl font-extrabold text-[#0F172A]">התשלום בוטל</h1>
        <p className="text-sm text-muted-foreground mt-2 max-w-sm leading-relaxed">
          לא חויבת. אפשר לחזור לעסקה ולהשלים את דמי ההשתתפות בכל רגע.
        </p>
        <div className="flex flex-col gap-2 w-full max-w-xs mt-6">
          {dealId && (
            <Button asChild className="h-12 rounded-2xl bg-[#0E6B5A] font-extrabold">
              <Link to={`/deals/${dealId}`}>חזרה לעסקה</Link>
            </Button>
          )}
          <Button asChild variant="outline" className="h-12 rounded-2xl font-bold">
            <Link to="/deals">לעסקאות</Link>
          </Button>
        </div>
      </div>
    </MobileShell>
  );
}
