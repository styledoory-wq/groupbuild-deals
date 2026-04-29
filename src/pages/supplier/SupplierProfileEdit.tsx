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

  // Media + links
  const [shortDescription, setShortDescription] = useState("");
  const [logoUrl, setLogoUrl] = useState<string | null>(null);
  const [websiteUrl, setWebsiteUrl] = useState("");
  const [whatsappUrl, setWhatsappUrl] = useState("");
  const [instagramUrl, setInstagramUrl] = useState("");
  const [facebookUrl, setFacebookUrl] = useState("");
  const [catalogUrl, setCatalogUrl] = useState<string | null>(null);
  const [gallery, setGallery] = useState<{ id?: string; image_url: string; caption: string | null }[]>([]);
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [uploadingGallery, setUploadingGallery] = useState(false);
  const [uploadingCatalog, setUploadingCatalog] = useState(false);
  const logoInputRef = useRef<HTMLInputElement>(null);
  const galleryInputRef = useRef<HTMLInputElement>(null);
  const catalogInputRef = useRef<HTMLInputElement>(null);

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
        setShortDescription(existing.short_description ?? "");
        setLogoUrl(existing.logo_url ?? null);
        setWebsiteUrl(existing.website_url ?? "");
        setWhatsappUrl(existing.whatsapp_url ?? "");
        setInstagramUrl(existing.instagram_url ?? "");
        setFacebookUrl(existing.facebook_url ?? "");
        setCatalogUrl(existing.catalog_url ?? null);

        const [{ data: regs }, { data: cits }, { data: gal }] = await Promise.all([
          supabase.from("supplier_regions").select("region_id").eq("supplier_id", existing.id),
          supabase.from("supplier_cities").select("city_id").eq("supplier_id", existing.id),
          supabase.from("supplier_gallery").select("id,image_url,caption,display_order").eq("supplier_id", existing.id).order("display_order"),
        ]);
        setSelectedRegions((regs ?? []).map((r) => r.region_id));
        setSelectedCities((cits ?? []).map((c) => c.city_id));
        setGallery((gal ?? []).map((g) => ({ id: g.id, image_url: g.image_url, caption: g.caption })));
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

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingLogo(true);
    try {
      const url = await uploadSupplierLogo(file);
      setLogoUrl(url);
      toast.success("הלוגו הועלה");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "העלאה נכשלה");
    } finally {
      setUploadingLogo(false);
      if (logoInputRef.current) logoInputRef.current.value = "";
    }
  };

  const handleGalleryUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? []);
    if (!files.length) return;
    setUploadingGallery(true);
    try {
      for (const file of files) {
        const url = await uploadSupplierGalleryImage(file);
        setGallery((g) => [...g, { image_url: url, caption: null }]);
      }
      toast.success("התמונות הועלו");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "העלאה נכשלה");
    } finally {
      setUploadingGallery(false);
      if (galleryInputRef.current) galleryInputRef.current.value = "";
    }
  };

  const handleCatalogUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingCatalog(true);
    try {
      const url = await uploadSupplierCatalog(file);
      setCatalogUrl(url);
      toast.success("הקטלוג הועלה");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "העלאה נכשלה");
    } finally {
      setUploadingCatalog(false);
      if (catalogInputRef.current) catalogInputRef.current.value = "";
    }
  };

  const removeGalleryItem = (idx: number) => setGallery((g) => g.filter((_, i) => i !== idx));

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
        short_description: shortDescription.trim() || null,
        logo_url: logoUrl,
        website_url: websiteUrl.trim() || null,
        whatsapp_url: whatsappUrl.trim() || null,
        instagram_url: instagramUrl.trim() || null,
        facebook_url: facebookUrl.trim() || null,
        catalog_url: catalogUrl,
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

      // Sync gallery: replace all
      await supabase.from("supplier_gallery").delete().eq("supplier_id", sid);
      if (gallery.length) {
        const { error: galErr } = await supabase.from("supplier_gallery").insert(
          gallery.map((g, idx) => ({
            supplier_id: sid!,
            image_url: g.image_url,
            caption: g.caption,
            display_order: idx,
          }))
        );
        if (galErr) throw galErr;
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
          <Field label="תיאור קצר (יוצג בכרטיס)" icon={FileText}>
            <Input value={shortDescription} onChange={(e) => setShortDescription(e.target.value)} maxLength={140} className="h-11 rounded-xl" placeholder="עד 140 תווים" />
          </Field>
          <Field label="תיאור עסק מלא" icon={FileText}>
            <Textarea value={description} onChange={(e) => setDescription(e.target.value)} maxLength={1000} rows={4} className="rounded-xl" />
          </Field>
          <div className="flex items-center justify-between py-1 pt-2 border-t border-border">
            <span className="text-sm">סטטוס פעילות</span>
            <Switch checked={isActive} onCheckedChange={setIsActive} />
          </div>
        </section>

        {/* Branding & Media */}
        <section className="gb-card p-4 space-y-4">
          <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
            <ImageIcon className="h-3.5 w-3.5 text-gold" /> מיתוג ומדיה
          </h3>

          {/* Logo */}
          <div className="flex items-center gap-4">
            <SupplierLogo name={businessName} logoUrl={logoUrl} size="lg" />
            <div className="flex-1 space-y-2">
              <input ref={logoInputRef} type="file" accept="image/jpeg,image/png,image/webp" className="hidden" onChange={handleLogoUpload} />
              <Button type="button" variant="outline" onClick={() => logoInputRef.current?.click()} disabled={uploadingLogo} className="h-9 rounded-xl text-xs w-full">
                {uploadingLogo ? "מעלה..." : logoUrl ? "החלפת לוגו" : "העלאת לוגו"}
              </Button>
              {logoUrl && (
                <Button type="button" variant="ghost" onClick={() => setLogoUrl(null)} className="h-8 rounded-xl text-xs w-full text-destructive">
                  הסרת לוגו
                </Button>
              )}
            </div>
          </div>

          {/* Links */}
          <div className="space-y-2 pt-2 border-t border-border">
            <Label className="text-xs font-bold flex items-center gap-1.5">
              <LinkIcon className="h-3.5 w-3.5 text-gold" /> קישורים
            </Label>
            <Input dir="ltr" value={websiteUrl} onChange={(e) => setWebsiteUrl(e.target.value)} placeholder="https://example.com (אתר)" className="h-10 rounded-xl text-sm" maxLength={500} />
            <Input dir="ltr" value={whatsappUrl} onChange={(e) => setWhatsappUrl(e.target.value)} placeholder="https://wa.me/972500000000" className="h-10 rounded-xl text-sm" maxLength={500} />
            <Input dir="ltr" value={instagramUrl} onChange={(e) => setInstagramUrl(e.target.value)} placeholder="https://instagram.com/..." className="h-10 rounded-xl text-sm" maxLength={500} />
            <Input dir="ltr" value={facebookUrl} onChange={(e) => setFacebookUrl(e.target.value)} placeholder="https://facebook.com/..." className="h-10 rounded-xl text-sm" maxLength={500} />
          </div>

          {/* Catalog */}
          <div className="space-y-2 pt-2 border-t border-border">
            <Label className="text-xs font-bold flex items-center gap-1.5">
              <FileText className="h-3.5 w-3.5 text-gold" /> קטלוג
            </Label>
            <Input dir="ltr" value={catalogUrl ?? ""} onChange={(e) => setCatalogUrl(e.target.value || null)} placeholder="קישור לקטלוג חיצוני" className="h-10 rounded-xl text-sm" maxLength={500} />
            <input ref={catalogInputRef} type="file" accept="application/pdf" className="hidden" onChange={handleCatalogUpload} />
            <Button type="button" variant="outline" onClick={() => catalogInputRef.current?.click()} disabled={uploadingCatalog} className="h-9 rounded-xl text-xs w-full">
              {uploadingCatalog ? "מעלה..." : "או העלאת PDF"}
            </Button>
            {catalogUrl && (
              <a href={catalogUrl} target="_blank" rel="noreferrer" className="block text-[11px] text-gold underline truncate" dir="ltr">
                {catalogUrl}
              </a>
            )}
          </div>

          {/* Gallery */}
          <div className="space-y-2 pt-2 border-t border-border">
            <Label className="text-xs font-bold flex items-center gap-1.5">
              <ImageIcon className="h-3.5 w-3.5 text-gold" /> גלריית עבודות
            </Label>
            <input ref={galleryInputRef} type="file" accept="image/jpeg,image/png,image/webp" multiple className="hidden" onChange={handleGalleryUpload} />
            <Button type="button" variant="outline" onClick={() => galleryInputRef.current?.click()} disabled={uploadingGallery} className="h-9 rounded-xl text-xs w-full">
              <Plus className="h-3.5 w-3.5 ml-1" /> {uploadingGallery ? "מעלה..." : "הוספת תמונות"}
            </Button>
            {gallery.length > 0 && (
              <div className="grid grid-cols-3 gap-2 mt-2">
                {gallery.map((g, idx) => (
                  <div key={idx} className="relative aspect-square rounded-xl overflow-hidden border border-border group">
                    <img src={g.image_url} alt="" className="h-full w-full object-cover" />
                    <button
                      type="button"
                      onClick={() => removeGalleryItem(idx)}
                      className="absolute top-1 left-1 h-7 w-7 rounded-full bg-destructive text-destructive-foreground flex items-center justify-center opacity-0 group-hover:opacity-100 focus:opacity-100 transition-opacity"
                      aria-label="מחיקה"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            )}
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
