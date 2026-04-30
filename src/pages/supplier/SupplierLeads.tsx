import { useEffect, useState } from "react";
import { Inbox, Loader2, Users, BadgeCheck, Phone, Mail, MessageCircle, MapPin, Building2 } from "lucide-react";
import { MobileShell } from "@/components/layout/MobileShell";
import { PageHeader } from "@/components/layout/PageHeader";
import { BottomNav } from "@/components/layout/BottomNav";
import { supabase } from "@/integrations/supabase/client";
import { ils } from "@/lib/offerPricing";
import { normalizeWhatsappUrl } from "@/lib/whatsapp";

type DealLite = { id: string; title: string };
type InterestRow = {
  id: string;
  user_id: string;
  deal_id: string;
  status: string;
  deposit_required: boolean;
  deposit_amount: number;
  deposit_status: string;
  created_at: string;
  full_name: string | null;
  phone: string | null;
  city: string | null;
  project_name: string | null;
  estimated_quantity: number | null;
  lead_status: string | null;
  notes: string | null;
};
type ProfileLite = { id: string; full_name: string | null; phone: string | null; email: string | null };

export default function SupplierLeads() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [deals, setDeals] = useState<DealLite[]>([]);
  const [interests, setInterests] = useState<InterestRow[]>([]);
  const [profiles, setProfiles] = useState<Record<string, ProfileLite>>({});

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const { data: session } = await supabase.auth.getSession();
        if (!session.session) {
          if (!cancelled) {
            setError("יש להתחבר כספק כדי לראות לידים.");
            setLoading(false);
          }
          return;
        }
        const userId = session.session.user.id;
        const email = session.session.user.email ?? "";

        // Find supplier id
        let { data: sup } = await supabase
          .from("suppliers")
          .select("id")
          .eq("user_id", userId)
          .maybeSingle();
        if (!sup && email) {
          const r = await supabase.from("suppliers").select("id").ilike("email", email).maybeSingle();
          sup = r.data;
        }
        if (!sup) {
          if (!cancelled) {
            setError("לא נמצא פרופיל ספק. השלם את הפרטים תחילה.");
            setLoading(false);
          }
          return;
        }

        // Get supplier deals
        const { data: dealsData } = await supabase
          .from("deals")
          .select("id,title")
          .eq("supplier_id", sup.id)
          .eq("is_deleted", false);
        const ds = (dealsData ?? []) as DealLite[];
        if (!cancelled) setDeals(ds);

        if (!ds.length) {
          if (!cancelled) setLoading(false);
          return;
        }

        const dealIds = ds.map((d) => d.id);
        const { data: ints, error: iErr } = await supabase
          .from("deal_interests")
          .select("id,user_id,deal_id,status,deposit_required,deposit_amount,deposit_status,created_at,is_demo,full_name,phone,city,project_name,estimated_quantity,lead_status,notes")
          .in("deal_id", dealIds)
          .eq("is_demo", false)
          .eq("is_deleted", false)
          .order("created_at", { ascending: false });
        if (iErr) throw iErr;
        const list = (ints ?? []) as InterestRow[];
        if (!cancelled) setInterests(list);

        const userIds = Array.from(new Set(list.map((i) => i.user_id)));
        if (userIds.length) {
          const { data: profs } = await supabase
            .from("profiles")
            .select("id,full_name,phone,email")
            .in("id", userIds);
          const map: Record<string, ProfileLite> = {};
          (profs ?? []).forEach((p) => { map[(p as ProfileLite).id] = p as ProfileLite; });
          if (!cancelled) setProfiles(map);
        }
      } catch (e) {
        console.error("[SupplierLeads] load error", e);
        if (!cancelled) setError(e instanceof Error ? e.message : "שגיאה בטעינה");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  const dealTitle = (id: string) => deals.find((d) => d.id === id)?.title ?? "הצעה";

  return (
    <MobileShell>
      <PageHeader title="לידים ופניות" subtitle="כל הדיירים שהצטרפו להצעות שלך" back={false} />

      <div className="px-5 -mt-4 relative z-10 pb-24">
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
          </div>
        ) : error ? (
          <div className="gb-card p-6 text-center">
            <p className="text-sm text-destructive font-bold">{error}</p>
          </div>
        ) : interests.length === 0 ? (
          <div className="gb-card p-8 flex flex-col items-center text-center">
            <div className="h-14 w-14 rounded-full bg-muted flex items-center justify-center mb-3">
              <Inbox className="h-7 w-7 text-muted-foreground" />
            </div>
            <h3 className="font-bold text-base mb-1">אין לידים עדיין</h3>
            <p className="text-xs text-muted-foreground max-w-xs">
              כשדיירים יביעו עניין בהצעות שלך — הם יופיעו כאן עם פרטי ההתחייבות לפיקדון.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Users className="h-4 w-4 text-gold" />
              סה"כ {interests.length} מתעניינים ב-{deals.length} הצעות
            </div>
            {interests.map((i) => {
              const p = profiles[i.user_id];
              const name = i.full_name?.trim() || p?.full_name?.trim() || "דייר";
              const phone = i.phone?.trim() || p?.phone?.trim() || null;
              const email = p?.email ?? null;
              const wa = normalizeWhatsappUrl(phone);
              const committed = i.deposit_required && i.deposit_status === "committed";
              return (
                <div key={i.id} className="gb-card p-4">
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <div className="min-w-0">
                      <h4 className="font-bold text-sm text-foreground truncate">{name}</h4>
                      <p className="text-[11px] text-muted-foreground truncate">{dealTitle(i.deal_id)}</p>
                    </div>
                    {committed && (
                      <span className="text-[10px] font-bold inline-flex items-center gap-1 px-2 py-1 rounded-full bg-gold/10 text-primary border border-gold/30 shrink-0">
                        <BadgeCheck className="h-3 w-3" />
                        התחייב {ils(Number(i.deposit_amount))}
                      </span>
                    )}
                  </div>
                  <div className="flex flex-wrap gap-x-4 gap-y-1 text-[11px] text-muted-foreground mb-2">
                    {phone && (
                      <span className="inline-flex items-center gap-1">
                        <Phone className="h-3 w-3" /> {phone}
                      </span>
                    )}
                    {email && (
                      <span className="inline-flex items-center gap-1 truncate">
                        <Mail className="h-3 w-3" /> {email}
                      </span>
                    )}
                    {i.city && (
                      <span className="inline-flex items-center gap-1">
                        <MapPin className="h-3 w-3" /> {i.city}
                      </span>
                    )}
                    {i.project_name && (
                      <span className="inline-flex items-center gap-1">
                        <Building2 className="h-3 w-3" /> {i.project_name}
                      </span>
                    )}
                    <span>נרשם: {new Date(i.created_at).toLocaleDateString("he-IL")}</span>
                  </div>
                  {i.notes && (
                    <p className="text-[11px] text-foreground/80 bg-muted/40 rounded-lg px-2 py-1.5 mb-2 whitespace-pre-line">
                      {i.notes}
                    </p>
                  )}
                  {(phone || wa) && (
                    <div className="flex gap-2">
                      {phone && (
                        <a
                          href={`tel:${phone}`}
                          className="flex-1 text-center text-[11px] font-bold py-2 rounded-lg bg-primary text-primary-foreground"
                        >
                          חיוג
                        </a>
                      )}
                      {wa && (
                        <a
                          href={wa}
                          target="_blank"
                          rel="noreferrer"
                          className="flex-1 text-center text-[11px] font-bold py-2 rounded-lg bg-success/10 text-success border border-success/30 inline-flex items-center justify-center gap-1"
                        >
                          <MessageCircle className="h-3 w-3" /> וואטסאפ
                        </a>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      <BottomNav role="supplier" />
    </MobileShell>
  );
}
