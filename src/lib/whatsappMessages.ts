import { normalizeWhatsappUrl } from "./whatsapp";

const DEFAULT_SUPPORT_PHONE = "0526247941";

export function openWhatsAppTo(phone: string, message: string): boolean {
  const url = normalizeWhatsappUrl(phone);
  if (!url) return false;
  const wa = `${url}?text=${encodeURIComponent(message)}`;
  window.open(wa, "_blank", "noopener");
  return true;
}

export function supplierWelcomeMessage(
  name: string,
  onboardingUrl: string,
  supportPhone = DEFAULT_SUPPORT_PHONE,
): string {
  return [
    `שלום ${name} 👋`,
    `ברוך הבא ל-GroupBuild — הפלטפורמה שמחברת אותך לדיירי פרויקטים חדשים בכל הארץ.`,
    "",
    `כאן תוכל:`,
    `• לפרסם הצעות מיוחדות לדיירים`,
    `• לקבל לידים איכותיים מפרויקטים באזורי השירות שלך`,
    `• לנהל את הפרופיל, קטלוג ומדיה בקלות`,
    "",
    `להשלמת הפרופיל וההתחלה:`,
    `${onboardingUrl}`,
    "",
    `לכל שאלה — פשוט תענה כאן בהודעה, או ווטסאפ ל-${supportPhone}. נשמח לעזור! 🙌`,
  ].join("\n");
}

export function supplierCompletionReminderMessage(
  name: string,
  onboardingUrl: string,
  supportPhone = DEFAULT_SUPPORT_PHONE,
): string {
  return [
    `שלום ${name} 👋`,
    `התחלת את ההרשמה ל-GroupBuild אבל טרם השלמת את פרטי העסק.`,
    "",
    `כדי שתוכל להתחיל לקבל לידים ולהופיע לדיירים, נשאר רק:`,
    `• להשלים את פרטי העסק`,
    `• לבחור תחומי פעילות ואזורי שירות`,
    `• להעלות לוגו ותיאור`,
    "",
    `להשלמת הפרופיל:`,
    `${onboardingUrl}`,
    "",
    `לכל שאלה — אנחנו כאן בוואטסאפ ${supportPhone} 📞`,
  ].join("\n");
}

export function residentWelcomeMessage(
  name: string,
  dashboardUrl: string,
  supportPhone = DEFAULT_SUPPORT_PHONE,
): string {
  return [
    `שלום ${name} 👋`,
    `ברוך הבא ל-GroupBuild — הפלטפורמה שמלווה אותך בפרויקט הבנייה שלך.`,
    "",
    `כאן תוכל:`,
    `• לקבל הצעות מחיר מספקים מובילים`,
    `• לנהל את התקציב והתשלומים של הפרויקט`,
    `• לשמור מועדפים ולהשוות מחירים`,
    "",
    `להתחלה:`,
    `${dashboardUrl}`,
    "",
    `לכל שאלה — פשוט תענה כאן בהודעה, או ווטסאפ ל-${supportPhone}. נשמח לעזור! 🙌`,
  ].join("\n");
}

export function residentCompletionReminderMessage(
  name: string,
  profileEditUrl: string,
  supportPhone = DEFAULT_SUPPORT_PHONE,
): string {
  return [
    `שלום ${name} 👋`,
    `התחלת את ההרשמה ל-GroupBuild אבל טרם השלמת את פרטי הפרופיל.`,
    "",
    `כדי שנוכל להתאים לך ספקים ומבצעים מדויקים, נשאר רק להשלים:`,
    `• פרטים אישיים`,
    `• עיר ופרטי הפרויקט`,
    "",
    `להשלמת הפרופיל:`,
    `${profileEditUrl}`,
    "",
    `לכל שאלה — אנחנו כאן בוואטסאפ ${supportPhone} 📞`,
  ].join("\n");
}
