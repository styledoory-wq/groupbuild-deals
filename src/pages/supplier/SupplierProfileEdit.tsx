import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { z } from "zod";
import { Save, ArrowRight, Briefcase, Phone, Mail, MapPin, Tag, User as UserIcon, FileText, Globe, Image as ImageIcon, Trash2, Plus, Link as LinkIcon, Instagram, Facebook } from "lucide-react";
import { MobileShell } from "@/components/layout/MobileShell";
import { PageHeader } from "@/components/layout/PageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { SupplierLogo } from "@/components/suppliers/SupplierLogo";
import { uploadSupplierLogo, uploadSupplierGalleryImage, uploadSupplierCatalog } from "@/lib/supplierUploads";
import { supabase } from "@/integrations/supabase/client";
import { useApp } from "@/store/AppStore";
import { useRegions } from "@/hooks/useRegions";
import { toast } from "sonner";

const supplierSchema = z.object({
  business_name: z.string().trim().min(2, "שם עסק קצר מדי").max(80),
  contact_name: z.string().trim().max(60).optional().or(z.literal("")),
  phone: z.string().trim().max(20).optional().or(z.literal("")),
  email: z.string().trim().email("אימייל לא תקין").max(255),
  description: z.string().trim().max(1000).optional().or(z.literal("")),
});

export default function SupplierProfileEdit() {
  const navigate = useNavigate();
  const { categories } = useApp();
  const { regions, cities } = useRegions();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [supplierId, setSupplierId] = useState<string | null>(null);

  const [businessName, setBusinessName] = useState("");
  const [contactName, setContactName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [originalEmail, setOriginalEmail] = useState("");
  const [description, setDescription] = useState("");
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [servesAll, setServesAll] = useState(false);
  const [isActive, setIsActive] = useState(true);
  const [selectedRegions, setSelectedRegions] = useState<string[]>([]);
  const [selectedCities, setSelectedCities] = useState<string[]>([]);

  useEffect(() => {
    (async () => {
      const { data: session } = await supabase.auth.getSession();
      const uid = session.session?.user?.id;
      const sessionEmail = session.session?.user?.email ?? "";
      if (!uid) {
        navigate("/", { replace: true });
        return;
      }
      setEmail(sessionEmail);
      setOriginalEmail(sessionEmail);

      const [{ data: profile }, { data: existing }] = await Promise.all([
        supabase.from("profiles").select("*").eq("id", uid).maybeSingle(),
        supabase.from("suppliers").select("*").eq("user_id", uid).maybeSingle(),
      ]);

      if (existing) {
        setSupplierId(existing.id);
        setBusinessName(existing.business_name ?? "");
        setContactName(existing.contact_name ?? "");
        setPhone(existing.phone ?? "");
        setDescription(existing.description ?? "");
        setSelectedCategories(existing.categories ?? []);
        setServesAll(existing.serves_all_country);
        setIsActive(existing.is_active);

        const [{ data: regs }, { data: cits }] = await Promise.all([
          supabase.from("supplier_regions").select("region_id").eq("supplier_id", existing.id),
          supabase.from("supplier_cities").select("city_id").eq("supplier_id", existing.id),
        ]);
        setSelectedRegions((regs ?? []).map((r) => r.region_id));
        setSelectedCities((cits ?? []).map((c) => c.city_id));
      } else {
        setBusinessName(profile?.business_name ?? "");
        setContactName(profile?.full_name ?? "");
        setPhone(profile?.phone ?? "");
      }
      setLoading(false);
    })();
  }, [navigate]);

  const toggle = (list: string[], setList: (v: string[]) => void, id: string) => {
    setList(list.includes(id) ? list.filter((x) => x !== id) : [...list, id]);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    const parsed = supplierSchema.safeParse({
      business_name: businessName,
      contact_name: contactName,
      phone,
      email,
      description,
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

      const payload = {
        user_id: uid,
        business_name: businessName.trim(),
        contact_name: contactName.trim() || null,
        phone: phone.trim() || null,
        email: originalEmail,
        description: description.trim() || null,
        categories: selectedCategories,
        serves_all_country: servesAll,
        is_active: isActive,
      };

      let sid = supplierId;
      if (sid) {
        const { error } = await supabase.from("suppliers").update(payload).eq("id", sid);
        if (error) throw error;
      } else {
        const { data: ins, error } = await supabase.from("suppliers").insert(payload).select("id").single();
        if (error) throw error;
        sid = ins.id;
        setSupplierId(sid);
      }

      // Replace regions and cities
      await supabase.from("supplier_regions").delete().eq("supplier_id", sid);
      await supabase.from("supplier_cities").delete().eq("supplier_id", sid);

      if (!servesAll) {
        if (selectedRegions.length) {
          const { error } = await supabase.from("supplier_regions").insert(
            selectedRegions.map((rid) => ({ supplier_id: sid!, region_id: rid }))
          );
          if (error) throw error;
        }
        if (selectedCities.length) {
          const { error } = await supabase.from("supplier_cities").insert(
            selectedCities.map((cid) => ({ supplier_id: sid!, city_id: cid }))
          );
          if (error) throw error;
        }
      }

      // Profile mirror (business_name + phone)
      await supabase.from("profiles").update({
        business_name: businessName.trim(),
        full_name: contactName.trim() || null,
        phone: phone.trim() || null,
      }).eq("id", uid);

      // Email change
      if (email.trim().toLowerCase() !== originalEmail.toLowerCase()) {
        const { error: emailErr } = await supabase.auth.updateUser({ email: email.trim() });
        if (emailErr) throw emailErr;
        toast.success("נשלח מייל אימות לכתובת החדשה");
      } else {
        toast.success("הפרופיל נשמר");
      }
      navigate("/supplier");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "שמירה נכשלה");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <MobileShell>
        <div className="min-h-[60vh] flex items-center justify-center text-muted-foreground text-sm">טוען…</div>
      </MobileShell>
    );
  }

  return (
    <MobileShell>
      <PageHeader title="עריכת פרופיל ספק" subtitle="עדכנו את פרטי העסק" />

      <form onSubmit={handleSave} className="px-5 space-y-5 pb-8">
        <section className="gb-card p-4 space-y-3">
          <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-wider">פרטי העסק</h3>
          <Field label="שם העסק" icon={Briefcase}>
            <Input value={businessName} onChange={(e) => setBusinessName(e.target.value)} maxLength={80} required className="h-11 rounded-xl" />
          </Field>
          <Field label="שם איש קשר" icon={UserIcon}>
            <Input value={contactName} onChange={(e) => setContactName(e.target.value)} maxLength={60} className="h-11 rounded-xl" />
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
          <Field label="תיאור עסק" icon={FileText}>
            <Textarea value={description} onChange={(e) => setDescription(e.target.value)} maxLength={1000} rows={4} className="rounded-xl" />
          </Field>
          <div className="flex items-center justify-between py-1 pt-2 border-t border-border">
            <span className="text-sm">סטטוס פעילות</span>
            <Switch checked={isActive} onCheckedChange={setIsActive} />
          </div>
        </section>

        <section className="gb-card p-4 space-y-3">
          <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
            <Tag className="h-3.5 w-3.5 text-gold" /> קטגוריות שירות
          </h3>
          <div className="flex flex-wrap gap-2">
            {categories.map((c) => {
              const on = selectedCategories.includes(c.id);
              return (
                <button
                  type="button"
                  key={c.id}
                  onClick={() => toggle(selectedCategories, setSelectedCategories, c.id)}
                  className={`px-3 py-1.5 rounded-full text-xs border transition-smooth ${
                    on ? "bg-primary text-primary-foreground border-primary" : "bg-card text-foreground border-border"
                  }`}
                >
                  <span className="ml-1">{c.icon}</span>
                  {c.name}
                </button>
              );
            })}
          </div>
        </section>

        <section className="gb-card p-4 space-y-3">
          <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
            <Globe className="h-3.5 w-3.5 text-gold" /> אזורי שירות
          </h3>
          <div className="flex items-center justify-between py-1">
            <span className="text-sm font-semibold">נותן שירות בכל הארץ</span>
            <Switch checked={servesAll} onCheckedChange={setServesAll} />
          </div>

          {!servesAll && (
            <>
              <div>
                <Label className="text-xs font-bold mb-2 block">אזורים שאני משרת</Label>
                <div className="flex flex-wrap gap-2">
                  {regions.map((r) => {
                    const on = selectedRegions.includes(r.id);
                    return (
                      <button
                        type="button"
                        key={r.id}
                        onClick={() => toggle(selectedRegions, setSelectedRegions, r.id)}
                        className={`px-3 py-1.5 rounded-full text-xs border transition-smooth ${
                          on ? "bg-gradient-gold text-primary border-gold" : "bg-card text-foreground border-border"
                        }`}
                      >
                        <MapPin className="h-3 w-3 inline ml-1" />
                        {r.name_he}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div>
                <Label className="text-xs font-bold mb-2 block">ערים ספציפיות (אופציונלי)</Label>
                <div className="max-h-56 overflow-y-auto border border-border rounded-xl p-2 space-y-1">
                  {cities.map((c) => {
                    const on = selectedCities.includes(c.id);
                    return (
                      <label key={c.id} className="flex items-center gap-2 text-sm py-1 px-2 rounded hover:bg-muted/40 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={on}
                          onChange={() => toggle(selectedCities, setSelectedCities, c.id)}
                          className="accent-primary"
                        />
                        {c.name_he}
                      </label>
                    );
                  })}
                </div>
              </div>
            </>
          )}
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
