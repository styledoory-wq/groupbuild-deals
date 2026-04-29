/**
 * Normalize an Israeli phone number or wa.me-style input to a valid wa.me URL.
 * Accepts: "0526247941", "052-624-7941", "+972 52 624 7941",
 * "wa.me/972526247941", "https://wa.me/972526247941", "972526247941".
 * Returns null if no valid number is found.
 */
export function normalizeWhatsappUrl(input: string | null | undefined): string | null {
  if (!input) return null;
  let raw = String(input).trim();
  if (!raw) return null;

  // If a WhatsApp URL was given, extract the phone portion first.
  const waMatch = raw.match(/wa\.me\/(\+?\d[\d\s\-]*)/i);
  const sendMatch = raw.match(/[?&]phone=(\+?\d[\d\s\-]*)/i);
  if (waMatch) raw = waMatch[1];
  else if (sendMatch) raw = sendMatch[1];

  // Keep digits only (drop +, spaces, dashes, parens, etc.)
  let digits = raw.replace(/\D+/g, "");
  if (!digits) return null;

  // Israeli normalization
  if (digits.startsWith("00972")) digits = digits.slice(5);
  else if (digits.startsWith("972")) digits = digits.slice(3);
  if (digits.startsWith("0")) digits = digits.slice(1);

  // Israeli mobile/landline must be a plausible length after stripping leading 0.
  if (digits.length < 8 || digits.length > 10) return null;

  return `https://wa.me/972${digits}`;
}
