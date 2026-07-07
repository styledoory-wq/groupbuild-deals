/**
 * Translates Supabase auth error messages (and general API errors) into
 * user-friendly Hebrew. Never returns an English or technical message.
 */
export function translateAuthError(error: unknown): string {
  const raw =
    error instanceof Error
      ? error.message
      : typeof error === "string"
        ? error
        : (() => {
            try {
              const anyErr = error as { message?: string; error_description?: string; msg?: string } | null;
              return anyErr?.message ?? anyErr?.error_description ?? anyErr?.msg ?? "";
            } catch {
              return "";
            }
          })();
  const m = (raw || "").toLowerCase();
  if (!m) return "אירעה שגיאה, נסה שנית";

  // Credentials
  if (
    m.includes("invalid login") ||
    m.includes("invalid credentials") ||
    m.includes("invalid email or password") ||
    m.includes("wrong password") ||
    m.includes("incorrect password")
  ) {
    return "אימייל או סיסמה שגויים";
  }
  if (m.includes("user not found") || m.includes("no user found")) {
    return "המשתמש לא נמצא במערכת";
  }
  if (m.includes("invalid email") || m.includes("email address is invalid") || m.includes("email format")) {
    return "כתובת מייל לא תקינה";
  }

  // Signup / duplicates
  if (
    m.includes("already registered") ||
    m.includes("already in use") ||
    m.includes("already exists") ||
    m.includes("user already") ||
    m.includes("email exists") ||
    m.includes("duplicate key") ||
    m.includes("email address already")
  ) {
    return "כתובת המייל כבר רשומה במערכת. אפשר להתחבר או לאפס סיסמה.";
  }

  // Passwords — length / strength / HIBP (leaked passwords)
  if (
    m.includes("known to be weak") ||
    m.includes("easy to guess") ||
    m.includes("pwned") ||
    m.includes("compromised password") ||
    m.includes("data breach")
  ) {
    return "הסיסמה הזו נחשפה בעבר בדליפות מידע ונחשבת לא בטוחה. בחרו סיסמה אחרת, ייחודית יותר.";
  }
  if (m.includes("weak password") || m.includes("password is weak") || m.includes("password strength")) {
    return "הסיסמה חלשה מדי. בחרו סיסמה חזקה יותר (לפחות 8 תווים, עדיף שילוב של אותיות ומספרים).";
  }
  if (
    m.includes("password should be") ||
    m.includes("password is too short") ||
    m.includes("password must be") ||
    m.includes("at least 6") ||
    m.includes("at least 8") ||
    m.includes("minimum length")
  ) {
    return "הסיסמה קצרה מדי. יש להזין סיסמה באורך של 6 תווים לפחות.";
  }
  if (m.includes("password") && (m.includes("match") || m.includes("mismatch") || m.includes("do not match"))) {
    return "הסיסמאות אינן תואמות";
  }
  if (m.includes("same password") || m.includes("new password should be different")) {
    return "הסיסמה החדשה חייבת להיות שונה מהסיסמה הקודמת";
  }

  // Rate limiting
  if (m.includes("rate limit") || m.includes("too many") || m.includes("over_request_rate_limit")) {
    return "יותר מדי ניסיונות. נסו שוב בעוד כמה דקות.";
  }

  // Email confirmation / OTP / expired links
  if (m.includes("email not confirmed") || m.includes("not confirmed") || m.includes("confirm your email")) {
    return "יש לאשר את כתובת המייל לפני ההתחברות — שלחנו לך קישור אישור לתיבת הדואר.";
  }
  if (
    m.includes("token has expired") ||
    m.includes("expired") ||
    m.includes("otp_expired") ||
    m.includes("link is invalid") ||
    m.includes("invalid token") ||
    m.includes("invalid or expired")
  ) {
    return "הקישור פג תוקף או אינו תקין. בקשו קישור חדש ונסו שוב.";
  }
  if (m.includes("invalid otp") || m.includes("otp") ) {
    return "קוד האימות שהוזן שגוי או פג תוקף. בקשו קוד חדש ונסו שוב.";
  }

  // Session / auth state
  if (m.includes("jwt") || m.includes("session") || m.includes("not authenticated") || m.includes("auth session")) {
    return "פג תוקף החיבור. יש להתחבר מחדש.";
  }
  if (m.includes("forbidden") || m.includes("not allowed") || m.includes("unauthorized") || m.includes("permission")) {
    return "אין לך הרשאה לבצע פעולה זו";
  }

  // Provider / OAuth
  if (m.includes("provider") && (m.includes("not enabled") || m.includes("unsupported"))) {
    return "אמצעי ההתחברות אינו זמין כרגע. נסו שיטת התחברות אחרת.";
  }
  if (m.includes("popup") && m.includes("closed")) {
    return "חלון ההתחברות נסגר לפני השלמת התהליך. נסו שוב.";
  }

  // Signup disabled
  if (m.includes("signup") && m.includes("disabled")) {
    return "ההרשמה סגורה כרגע. נסו שוב מאוחר יותר.";
  }

  // Network / server
  if (m.includes("network") || m.includes("failed to fetch") || m.includes("networkerror")) {
    return "אין חיבור לאינטרנט. בדקו את החיבור ונסו שוב.";
  }
  if (m.includes("timeout") || m.includes("timed out")) {
    return "השרת לא הגיב בזמן. נסו שוב בעוד רגע.";
  }
  if (
    m.includes("500") ||
    m.includes("502") ||
    m.includes("503") ||
    m.includes("504") ||
    m.includes("internal server") ||
    m.includes("server error")
  ) {
    return "אירעה תקלה בשרת. נסו שוב בעוד רגע.";
  }

  // Already Hebrew? pass through
  if (/[\u0590-\u05FF]/.test(raw)) return raw;

  return "אירעה שגיאה, נסה שנית";
}
