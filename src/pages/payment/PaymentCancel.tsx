import { useNavigate } from "react-router-dom";
import { XCircle } from "lucide-react";
import { MobileShell } from "@/components/layout/MobileShell";
import { Button } from "@/components/ui/button";

export default function PaymentCancel() {
  const navigate = useNavigate();
  return (
    <MobileShell>
      <div className="min-h-screen flex flex-col items-center justify-center px-6 text-center">
        <div className="h-20 w-20 rounded-full bg-destructive/15 flex items-center justify-center mb-4">
          <XCircle className="h-12 w-12 text-destructive" />
        </div>
        <h1 className="text-2xl font-extrabold mb-2">התשלום בוטל</h1>
        <p className="text-sm text-muted-foreground mb-6">לא חויבתם. תוכלו לנסות שוב בכל זמן.</p>
        <Button onClick={() => navigate(-1)} className="h-12 rounded-2xl px-8 bg-primary text-primary-foreground font-bold">
          חזרה לעסקה
        </Button>
      </div>
    </MobileShell>
  );
}
