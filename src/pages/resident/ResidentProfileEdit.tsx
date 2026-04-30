import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { z } from "zod";
import { Save, ArrowRight, Mail, Phone, User as UserIcon, MapPin, Building2, Bell } from "lucide-react";
import { MobileShell } from "@/components/layout/MobileShell";
import { PageHeader } from "@/components/layout/PageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { supabase } from "@/integrations/supabase/client";
import { useApp } from "@/store/AppStore";
import { useRegions } from "@/hooks/useRegions";
import { toast } from "sonner";

const profileSchema = z.object({
  full_name: z.string().trim().min(2, "שם קצר מדי").max(60),
  phone: z.string().trim().max(20).optional().or(z.literal("")),
  email: z.string().trim().email("אימייל לא תקין").max(255),
  city: z.string().trim().max(60).optional().or(z.literal("")),
  region: z.string().trim().max(60).optional().or(z.literal("")),
  address: z.string().trim().max(120).optional().or(z.literal("")),
});

export default function ResidentProfileEdit() {
  const navigate = useNavigate();
  const { user, setUser, projects } = useApp();
  const { regions, citiesByRegion } = useRegions();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [originalEmail, setOriginalEmail] = useState("");
  const [regionSlug, setRegionSlug] = useState("");
  const [city, setCity] = useState("");
  const [address, setAddress] = useState("");
  const [projectId, setProjectId] = useState("");
  const [notifEmail, setNotifEmail] = useState(true);
  const [notifPush, setNotifPush] = useState(true);
  const [notifSms, setNotifSms] = useState(false);

  useEffect(() => {
    (async () => {
      const { data: session } = await supabase.auth.getSession();
      const uid = session.session?.user?.id;
      const sessionEmail = session.session?.user?.email ?? "";
      if (!uid) {
        navigate("/", { replace: true });
        return;
      }
      const { data } = await supabase.from("profiles").select("*").eq("id", uid).maybeSingle();
      if (data) {
        setFullName(data.full_name ?? "");
        setPhone(data.phone ?? "");
        setEmail(sessionEmail);
        setOriginalEmail(sessionEmail);
        setRegionSlug(data.region ?? "");
        setCity(data.city ?? "");
        setAddress(data.address ?? "");
        setProjectId(data.project_id ?? "");
        const np = (data.notification_prefs as { email?: boolean; push?: boolean; sms?: boolean } | null) ?? {};
        setNotifEmail(np.email ?? true);
        setNotifPush(np.push ?? true);
        setNotifSms(np.sms ?? false);
      }
      setLoading(false);
    })();
  }, [navigate]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    const parsed = profileSchema.safeParse({
      full_name: fullName,
      phone,
      email,
      city,
      region: regionSlug,
      address,
    });
    if (!parsed.success) {
      toast.error(parsed.error.issues[0].message);
      return;
    }
    setSaving(true);
    try {
      const { data: session } = await supabase.auth.getSession();
      const uid = session.session?.user?.id;
      if (!uid) throw new Error("לא מחובר");

      const { error: profErr } = await supabase
        .from("profiles")
        .update({
          full_name: fullName.trim(),
          phone: phone.trim() || null,
          city: city.trim() || null,
          region: regionSlug || null,
          address: address.trim() || null,
          project_id: projectId || null,
          notification_prefs: { email: notifEmail, push: notifPush, sms: notifSms },
        })
        .eq("id", uid);
      if (profErr) throw profErr;

      // Optional email change — Supabase will send a verification mail
      if (email.trim().toLowerCase() !== originalEmail.toLowerCase()) {
        const { error: emailErr } = await supabase.auth.updateUser({ email: email.trim() });
        if (emailErr) throw emailErr;
        toast.success("נשלח מייל אימות לכתובת החדשה — אשרו אותו כדי להחליף אימייל");
      } else {
        toast.success("הפרופיל נשמר");
      }

      if (user) {
        setUser({
          ...user,
          name: fullName.trim(),
          phone: phone.trim(),
          email: originalEmail,
          projectId: projectId || undefined,
        });
      }
      navigate("/resident/profile");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "שמירה נכשלה");
    } finally {
      setSaving(false);
    }
  };

  const currentRegion = regions.find((r) => r.slug === regionSlug);
  const cityOptions = currentRegion ? citiesByRegion(currentRegion.id) : [];

  if (loading) {
    return (
      <MobileShell>
        <div className="min-h-[60vh] flex items-center justify-center text-muted-foreground text-sm">טוען…</div>
      </MobileShell>
    );
  }

  return (
    <MobileShell>
      <PageHeader title="עריכת פרופיל" subtitle="עדכנו את הפרטים שלכם" />

      <form onSubmit={handleSave} className="px-5 space-y-5 pb-8">
        {/* Personal */}
        <section className="gb-card p-4 space-y-3">
          <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-wider">פרטים אישיים</h3>
          <Field label="שם מלא" icon={UserIcon}>
            <Input value={fullName} onChange={(e) => setFullName(e.target.value)} maxLength={60} required className="h-11 rounded-xl" />
          </Field>
          <Field label="טלפון" icon={Phone}>
            <Input value={phone} onChange={(e) => setPhone(e.target.value)} maxLength={20} dir="ltr" className="h-11 rounded-xl" />
          </Field>
          <Field label="אימייל" icon={Mail}>
            <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} maxLength={255} dir="ltr" required className="h-11 rounded-xl" />
            {email.trim().toLowerCase() !== originalEmail.toLowerCase() && (
              <p className="text-[11px] text-gold mt-1">בלחיצה על שמירה יישלח מייל אימות לכתובת החדשה</p>
            )}
          </Field>
        </section>

        {/* Location */}
        <section className="gb-card p-4 space-y-3">
          <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-wider">מיקום</h3>
          <Field label="אזור" icon={MapPin}>
            <select
              value={regionSlug}
              onChange={(e) => {
                setRegionSlug(e.target.value);
                setCity("");
              }}
              className="flex h-11 w-full rounded-xl border border-border bg-card px-3 text-sm"
            >
              <option value="">בחרו אזור</option>
              {regions.map((r) => (
                <option key={r.id} value={r.slug}>{r.name_he}</option>
              ))}
            </select>
          </Field>
          <Field label="עיר / יישוב" icon={MapPin}>
            <select
              value={city}
              onChange={(e) => setCity(e.target.value)}
              className="flex h-11 w-full rounded-xl border border-border bg-card px-3 text-sm"
              disabled={!regionSlug}
            >
              <option value="">{regionSlug ? "בחרו עיר" : "בחרו אזור קודם"}</option>
              {cityOptions.map((c) => (
                <option key={c.id} value={c.name_he}>{c.name_he}</option>
              ))}
            </select>
          </Field>
          <Field label="כתובת (אופציונלי)" icon={MapPin}>
            <Input value={address} onChange={(e) => setAddress(e.target.value)} maxLength={120} className="h-11 rounded-xl" />
          </Field>
          <Field label="פרויקט מגורים" icon={Building2}>
            <select value={projectId} onChange={(e) => setProjectId(e.target.value)} className="flex h-11 w-full rounded-xl border border-border bg-card px-3 text-sm">
              <option value="">ללא פרויקט</option>
              {projects.map((p) => (
                <option key={p.id} value={p.id}>{p.name} — {p.city}</option>
              ))}
            </select>
          </Field>
        </section>

        {/* Notifications */}
        <section className="gb-card p-4 space-y-3">
          <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
            <Bell className="h-3.5 w-3.5 text-gold" /> העדפות התראה
          </h3>
          <ToggleRow label="התראות במייל" value={notifEmail} onChange={setNotifEmail} />
          <ToggleRow label="התראות פוש" value={notifPush} onChange={setNotifPush} />
          <ToggleRow label="התראות SMS" value={notifSms} onChange={setNotifSms} />
        </section>

        <div className="flex gap-2">
          <Button type="button" variant="outline" onClick={() => navigate(-1)} className="flex-1 h-12 rounded-xl">
            <ArrowRight className="h-4 w-4 ml-2" /> ביטול
          </Button>
          <Button type="submit" disabled={saving} className="flex-1 h-12 rounded-xl bg-primary text-primary-foreground">
            <Save className="h-4 w-4 ml-2" /> {saving ? "שומר…" : "שמירה"}
          </Button>
        </div>
      </form>
    </MobileShell>
  );
}

function Field({ label, icon: Icon, children }: { label: string; icon: React.ComponentType<{ className?: string }>; children: React.ReactNode }) {
  return (
    <div>
      <Label className="text-xs font-bold flex items-center gap-1.5 mb-1.5">
        <Icon className="h-3.5 w-3.5 text-gold" /> {label}
      </Label>
      {children}
    </div>
  );
}

function ToggleRow({ label, value, onChange }: { label: string; value: boolean; onChange: (v: boolean) => void }) {
  return (
    <div className="flex items-center justify-between py-1">
      <span className="text-sm">{label}</span>
      <Switch checked={value} onCheckedChange={onChange} />
    </div>
  );
}
