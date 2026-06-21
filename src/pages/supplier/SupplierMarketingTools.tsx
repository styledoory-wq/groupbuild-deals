import { useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";

/**
 * ⚠️ נוטרל זמנית — פיתוח AI Marketing (4 וריאציות, שיפור תמונה, רקעים AI)
 * הקוד המלא של הזרימה החדשה נשמר ב-`SupplierMarketingTools.ai.tsx` והפונקציות
 * `ai-enhance-deal` + טבלת `deal_marketing_ai` נשארות במערכת ללא שינוי.
 * נחזיר את הפיצ'ר לאחר אישור סופי של השפה העיצובית.
 *
 * בינתיים — מפנים לעמוד עריכת השיווק היציב (SupplierOfferMarketingEdit).
 */
export default function SupplierMarketingTools() {
  const { dealId } = useParams<{ dealId: string }>();
  const navigate = useNavigate();

  useEffect(() => {
    if (dealId) {
      navigate(`/supplier/offers/${dealId}/marketing`, { replace: true });
    } else {
      navigate("/supplier/offers", { replace: true });
    }
  }, [dealId, navigate]);

  return null;
}
