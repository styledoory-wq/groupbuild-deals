/**
 * Translates Supabase auth error messages into user-friendly Hebrew.
 * Use this anywhere auth errors surface to the user.
 */
export function translateAuthError(error: unknown): string {
  const raw = error instanceof Error ? error.message : typeof error === "string" ? error : "";
  const m = raw.toLowerCase();
  if (!m) return "אירעה שגיאה, נסה שנית";

  if (m.includes("invalid login") || m.includes("invalid credentials") || m.includes("wrong password")) {
    return "אימייל או סיסמה שגויים";
  }
  if (m.includes("user not found")) return "המשתמש לא נמצא";
  if (m.includes("invalid email")) return "כתובת מייל לא תקינה";
  if (m.includes("already registered") || m.includes("already in use") || m.includes("user already")) {
    return "משתמש כבר רשום במערכת";
  }
  if (m.includes("password should be") || m.includes("password is too short") || m.includes("at least 6")) {
    return "הסיסמה קצרה מדי — אפשר להשתמש באותיות בלבד, מספרים בלבד או שילוב שלהם";
  }
  if (m.includes("weak password") || m.includes("password is weak")) {
    return "אפשר להשתמש באותיות בלבד, מספרים בלבד או שילוב שלהם";
  }
  if (m.includes("rate limit") || m.includes("too many")) {
    return "יותר מדי ניסיונות, נסה שוב בעוד כמה דקות";
  }
  if (m.includes("email not confirmed") || m.includes("not confirmed") || m.includes("confirm your email")) {
    return "יש לאשר את כתובת המייל לפני ההתחברות — שלחנו לך קישור אישור לתיבת הדואר";
  }
  if (m.includes("network") || m.includes("failed to fetch")) return "אין חיבור לאינטרנט, נסה שוב";

  // Already Hebrew? pass through
  if (/[\u0590-\u05FF]/.test(raw)) return raw;

  return "אירעה שגיאה, נסה שנית";
}
