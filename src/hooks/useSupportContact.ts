import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

const DEFAULT_WHATSAPP = "052-624-7941";
let cached: string | null = null;
let inflight: Promise<string> | null = null;

async function fetchWhatsapp(): Promise<string> {
  if (cached) return cached;
  if (inflight) return inflight;
  inflight = (async () => {
    try {
      const { data } = await supabase
        .from("system_settings")
        .select("support_whatsapp")
        .limit(1)
        .maybeSingle();
      const val = (data?.support_whatsapp ?? "").toString().trim() || DEFAULT_WHATSAPP;
      cached = val;
      return val;
    } catch {
      cached = DEFAULT_WHATSAPP;
      return DEFAULT_WHATSAPP;
    } finally {
      inflight = null;
    }
  })();
  return inflight;
}

/** Reactive hook — returns the configured support WhatsApp number. */
export function useSupportWhatsapp(): string {
  const [num, setNum] = useState<string>(cached ?? DEFAULT_WHATSAPP);
  useEffect(() => {
    let alive = true;
    void fetchWhatsapp().then((v) => { if (alive) setNum(v); });
    return () => { alive = false; };
  }, []);
  return num;
}

/** Invalidate the cache after an admin update. */
export function invalidateSupportWhatsapp() {
  cached = null;
}

export const DEFAULT_SUPPORT_WHATSAPP = DEFAULT_WHATSAPP;
