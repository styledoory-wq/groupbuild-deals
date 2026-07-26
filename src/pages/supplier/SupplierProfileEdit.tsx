import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { z } from "zod";
import {
  Save, ArrowRight, Briefcase, Phone, Mail, Tag, User as UserIcon, FileText,
  Image as ImageIcon, Trash2, Plus, Link as LinkIcon, Wallet, Smartphone,
  Building2, MapPin, Sparkles,
} from "lucide-react";
import { MobileShell } from "@/components/layout/MobileShell";
import { BackHeader, LoadingState } from "@/components/ds";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { SupplierLogo } from "@/components/suppliers/SupplierLogo";
import { SupplierCatalogsManager } from "@/components/suppliers/SupplierCatalogsManager";
import { CategoryMultiPicker } from "@/components/categories/CategoryMultiPicker";
import { AreasCombobox, type AreasComboboxValue } from "@/components/areas/AreasCombobox";
import { uploadSupplierLogo, uploadSupplierGalleryImage } from "@/lib/supplierUploads";
import { supabase } from "@/integrations/supabase/client";
import { useApp } from "@/store/AppStore";
import { resolveSupplierForUser } from "@/lib/supplierAuth";
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

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [supplierId, setSupplierId] = useState<string | null>(null);

  const [businessName, setBusinessName] = useState("");
  const [offersServices, setOffersServices] = useState(false);
  const [offersProducts, setOffersProducts] = useState(false);
  const [contactName, setContactName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [originalEmail, setOriginalEmail] = useState("");
  const [description, setDescription] = useState("");
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [areas, setAreas] = useState<AreasComboboxValue>({
    servesAllCountry: false,
    regionIds: [],
    cityIds: [],
  });
  const [isActive, setIsActive] = useState(true);

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
  const logoInputRef = useRef<HTMLInputElement>(null);
  const galleryInputRef = useRef<HTMLInputElement>(null);

  // Payment details (manual: Bit / bank transfer)
  const [bitPhone, setBitPhone] = useState("");
  const [bankAccountHolder, setBankAccountHolder] = useState("");
  const [bankName, setBankName] = useState("");
  const [bankBranch, setBankBranch] = useState("");
  const [bankAccountNumber, setBankAccountNumber] = useState("");
  const [paymentInstructionsNote, setPaymentInstructionsNote] = useState("");

  // Only leaf categories are selectable in the hierarchical picker.
  // Drop legacy parent-ids so the UI and saved payload stay consistent.
  const leafCategoryIds = useMemo(() => {
    const parentIds = new Set(
      categories.map((c) => c.parentId).filter((id): id is string => Boolean(id)),
    );
    return new Set(categories.filter((c) => !parentIds.has(c.id)).map((c) => c.id));
  }, [categories]);

  const selectableCategories = useMemo(
    () => selectedCategories.filter((id) => leafCategoryIds.has(id)),
    [selectedCategories, leafCategoryIds],
  );

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

      const [{ data: profile }, existing] = await Promise.all([
        supabase.from("profiles").select("*").eq("id", uid).maybeSingle(),
        resolveSupplierForUser(uid, sessionEmail, "*"),
      ]);

      if (existing) {
        setSupplierId(existing.id);
        setBusinessName(existing.business_name ?? "");
        const ex = existing as { supplier_kind?: string | null; offers_services?: boolean | null; offers_products?: boolean | null };
        setOffersServices(Boolean(ex.offers_services) || ex.supplier_kind === "service");
        setOffersProducts(Boolean(ex.offers_products) || ex.supplier_kind === "product");
        setContactName(existing.contact_name ?? "");
        setPhone(existing.phone ?? "");
        setDescription(existing.description ?? "");
        setSelectedCategories(existing.categories ?? []);
        setIsActive(existing.is_active);
        setShortDescription(existing.short_description ?? "");
        setLogoUrl(existing.logo_url ?? null);
        setWebsiteUrl(existing.website_url ?? "");
        setWhatsappUrl(existing.whatsapp_url ?? "");
        setInstagramUrl(existing.instagram_url ?? "");
        setFacebookUrl(existing.facebook_url ?? "");
        setCatalogUrl(existing.catalog_url ?? null);
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const { data: payRows } = await (supabase as any).rpc("get_own_supplier_payment_info");
        const pay = Array.isArray(payRows) && payRows.length > 0 ? payRows[0] : null;
        setBitPhone(pay?.bit_phone ?? "");
        setBankAccountHolder(pay?.bank_account_holder ?? "");
        setBankName(pay?.bank_name ?? "");
        setBankBranch(pay?.bank_branch ?? "");
        setBankAccountNumber(pay?.bank_account_number ?? "");
        setPaymentInstructionsNote(pay?.payment_instructions_note ?? "");

        const [{ data: regs }, { data: cits }, { data: gal }] = await Promise.all([
          supabase.from("supplier_regions").select("region_id").eq("supplier_id", existing.id),
          supabase.from("supplier_cities").select("city_id").eq("supplier_id", existing.id),
          supabase.from("supplier_gallery").select("id,image_url,caption,display_order").eq("supplier_id", existing.id).order("display_order"),
        ]);
        setAreas({
          servesAllCountry: existing.serves_all_country,
          regionIds: (regs ?? []).map((r) => r.region_id),
          cityIds: (cits ?? []).map((c) => c.city_id),
        });
        setGallery((gal ?? []).map((g) => ({ id: g.id, image_url: g.image_url, caption: g.caption })));
      } else {
        setBusinessName(profile?.business_name ?? "");
        setContactName(profile?.full_name ?? "");
        setPhone(profile?.phone ?? "");
      }
      setLoading(false);
    })();
  }, [navigate]);

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

  const MAX_GALLERY_IMAGES = 6;

  const handleGalleryUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? []);
    if (!files.length) return;
    const remaining = MAX_GALLERY_IMAGES - gallery.length;
    if (remaining <= 0) {
      toast.error(`ניתן להעלות עד ${MAX_GALLERY_IMAGES} תמונות בלבד`);
      if (galleryInputRef.current) galleryInputRef.current.value = "";
      return;
    }
    const toUpload = files.slice(0, remaining);
    if (files.length > remaining) {
      toast.message(`הועלו ${remaining} תמונות בלבד (מקסימום ${MAX_GALLERY_IMAGES})`);
    }
    setUploadingGallery(true);
    try {
      for (const file of toUpload) {
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
    if (selectableCategories.length === 0) {
      toast.error("בחרו לפחות תחום שירות אחד");
      return;
    }
    if (!areas.servesAllCountry && areas.regionIds.length === 0 && areas.cityIds.length === 0) {
      toast.error("בחרו אזור שירות, ערים, או סמנו \"כל הארץ\"");
      return;
    }
    setSaving(true);
    try {
      const { data: session } = await supabase.auth.getSession();
      const uid = session.session?.user?.id;
      if (!uid) throw new Error("לא מחובר");

      const { data: savedSupplierId, error: saveErr } = await supabase.rpc("save_supplier_onboarding" as never, {
        _business_name: businessName.trim(),
        _contact_name: contactName.trim() || null,
        _phone: phone.trim() || null,
        _email: originalEmail || email.trim() || null,
        _short_description: shortDescription.trim() || null,
        _category_ids: selectableCategories,
        _serves_all_country: areas.servesAllCountry,
        _region_ids: areas.servesAllCountry ? [] : areas.regionIds,
        _city_ids: areas.servesAllCountry ? [] : areas.cityIds,
        _logo_url: logoUrl,
      } as never);
      if (saveErr) throw saveErr;

      const sid = typeof savedSupplierId === "string" ? savedSupplierId : supplierId;
      if (!sid) throw new Error("לא הצלחנו לזהות את פרופיל הספק לאחר השמירה");
      setSupplierId(sid);

      const extraPayload = {
        description: description.trim() || null,
        website_url: websiteUrl.trim() || null,
        whatsapp_url: whatsappUrl.trim() || null,
        instagram_url: instagramUrl.trim() || null,
        facebook_url: facebookUrl.trim() || null,
        catalog_url: catalogUrl,
        is_active: isActive,
        supplier_kind: offersServices && !offersProducts ? "service" : !offersServices && offersProducts ? "product" : null,
        offers_services: offersServices,
        offers_products: offersProducts,
        bit_phone: bitPhone.trim() || null,
        bank_account_holder: bankAccountHolder.trim() || null,
        bank_name: bankName.trim() || null,
        bank_branch: bankBranch.trim() || null,
        bank_account_number: bankAccountNumber.trim() || null,
        payment_instructions_note: paymentInstructionsNote.trim() || null,
      };
      const { error: extraErr } = await supabase.from("suppliers").update(extraPayload as never).eq("id", sid);
      if (extraErr) throw extraErr;

      // Sync gallery: replace all
      const { error: galDeleteErr } = await supabase.from("supplier_gallery").delete().eq("supplier_id", sid);
      if (galDeleteErr) throw galDeleteErr;
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
      const { error: profileErr } = await supabase.from("profiles").update({
        business_name: businessName.trim(),
        full_name: contactName.trim() || null,
        phone: phone.trim() || null,
      }).eq("id", uid);
      if (profileErr) throw profileErr;

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
      console.error("[supplier-profile-edit] save failed", err);
      toast.error("שמירה נכשלה", {
        description: err instanceof Error ? err.message : "נסה שוב בעוד רגע",
      });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <MobileShell>
        <LoadingState />
      </MobileShell>
    );
  }

  return (
    <MobileShell>
      <BackHeader title="פרופיל העסק" subtitle="ניהול מקצועי של הפרטים שדיירים רואים" />

      <form onSubmit={handleSave} className="px-5 space-y-4 pb-28" dir="rtl">
        {/* Business details */}
        <Section
          title="פרטי העסק"
          subtitle="השם והתיאור שיופיעו בכרטיס שלכם"
          icon={Briefcase}
        >
          <Field label="שם העסק" icon={Briefcase}>
            <Input value={businessName} onChange={(e) => setBusinessName(e.target.value)} maxLength={80} required className="h-11 rounded-xl" />
          </Field>

          <div className="space-y-1.5">
            <Label className="text-xs font-bold flex items-center gap-1.5">
              <Tag className="h-3.5 w-3.5 text-[#0E6B5A]" /> סוג הספק
            </Label>
            <div className="grid grid-cols-2 gap-2">
              {[
                { value: "service" as const, label: "בעל מקצוע", sub: "שירות / קבלן / מתקין", checked: offersServices, set: setOffersServices },
                { value: "product" as const, label: "ספק מוצרים", sub: "חנות / יבואן / משווק", checked: offersProducts, set: setOffersProducts },
              ].map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => opt.set(!opt.checked)}
                  aria-pressed={opt.checked}
                  className={
                    "rounded-[16px] p-3 text-right transition-all relative border " +
                    (opt.checked
                      ? "bg-[#0E6B5A]/8 border-[#0E6B5A]/35 text-[#1F2937] ring-1 ring-[#0E6B5A]/20"
                      : "bg-white border-[#EEF0F3] text-[#1F2937]")
                  }
                >
                  <div className={"text-sm font-bold " + (opt.checked ? "text-[#0E6B5A]" : "text-foreground")}>{opt.label}</div>
                  <div className="text-fs-xs text-muted-foreground mt-0.5 leading-tight">{opt.sub}</div>
                  <span className={"absolute top-2 left-2 h-4 w-4 rounded-md flex items-center justify-center text-fs-xs " + (opt.checked ? "bg-[#0E6B5A] text-white" : "bg-[#F4F6FA] text-transparent")}>
                    ✓
                  </span>
                </button>
              ))}
            </div>
            <p className="text-fs-xs text-muted-foreground">
              {offersServices && offersProducts
                ? "ספק 'גם וגם' — תופיע בשני הסינונים"
                : !offersServices && !offersProducts
                  ? "בחרו לפחות אפשרות אחת כדי להופיע לדיירים."
                  : "ניתן לסמן את שתי האפשרויות אם אתם גם נותני שירות וגם מוכרי מוצרים."}
            </p>
          </div>

          <Field label="שם איש קשר" icon={UserIcon}>
            <Input value={contactName} onChange={(e) => setContactName(e.target.value)} maxLength={60} className="h-11 rounded-xl" />
          </Field>
          <Field label="טלפון" icon={Phone}>
            <Input value={phone} onChange={(e) => setPhone(e.target.value)} maxLength={20} dir="ltr" className="h-11 rounded-xl" />
          </Field>
          <Field label="אימייל" icon={Mail}>
            <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} maxLength={255} dir="ltr" required className="h-11 rounded-xl" />
            {email.trim().toLowerCase() !== originalEmail.toLowerCase() && (
              <p className="text-fs-xs text-[#0A5446] mt-1">בלחיצה על שמירה יישלח מייל אימות לכתובת החדשה</p>
            )}
          </Field>
          <Field label="תיאור קצר (יוצג בכרטיס)" icon={FileText}>
            <Input value={shortDescription} onChange={(e) => setShortDescription(e.target.value)} maxLength={140} className="h-11 rounded-xl" placeholder="עד 140 תווים" />
          </Field>
          <Field label="תיאור עסק מלא" icon={FileText}>
            <Textarea value={description} onChange={(e) => setDescription(e.target.value)} maxLength={1000} rows={4} className="rounded-xl" />
          </Field>
          <div className="flex items-center justify-between py-1 pt-2 border-t border-border">
            <div>
              <div className="text-sm font-semibold">סטטוס פעילות</div>
              <p className="text-fs-xs text-muted-foreground mt-0.5">כבוי — הפרופיל לא יוצג לדיירים</p>
            </div>
            <Switch checked={isActive} onCheckedChange={setIsActive} />
          </div>
        </Section>

        {/* Service categories — hierarchical picker */}
        <Section
          title="תחומי פעילות"
          subtitle="חפשו או פתחו קטגוריה ובחרו את התחומים שאתם מספקים"
          icon={Tag}
        >
          <div className="rounded-2xl bg-[#0E6B5A]/8 border border-[#0E6B5A]/15 px-3.5 py-3 flex gap-2.5">
            <Sparkles className="h-4 w-4 text-[#0E6B5A] shrink-0 mt-0.5" />
            <p className="text-[13px] text-[#0B1220] leading-relaxed">
              <span className="font-bold">טיפ: </span>
              סמנו את כל התחומים שאתם עושים בפועל — כך דיירים רלוונטיים ימצאו אתכם.
            </p>
          </div>
          <CategoryMultiPicker
            categories={categories}
            value={selectableCategories}
            onChange={setSelectedCategories}
            placeholder="חפשו תחום — למשל נגרות, מיזוג, צבע…"
          />
        </Section>

        {/* Service areas */}
        <Section
          title="אזורי שירות"
          subtitle="היכן אתם באמת מגיעים — ערים, אזורים או כל הארץ"
          icon={MapPin}
        >
          <div className="rounded-2xl bg-[#F4F6FA] border border-[#E5E9EC] px-3.5 py-3 flex gap-2.5">
            <MapPin className="h-4 w-4 text-[#0E6B5A] shrink-0 mt-0.5" />
            <p className="text-[13px] text-[#5B6472] leading-relaxed">
              בחרו אזורים מדויקים כדי לקבל פניות מהמקומות שאתם משרתים.
            </p>
          </div>
          <AreasCombobox value={areas} onChange={setAreas} />
        </Section>

        {/* Branding & Media */}
        <Section title="מיתוג ומדיה" subtitle="לוגו, קישורים וגלריה שמחזקים את האמון" icon={ImageIcon}>
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

          <div className="space-y-2 pt-2 border-t border-border">
            <Label className="text-xs font-bold flex items-center gap-1.5">
              <LinkIcon className="h-3.5 w-3.5 text-[#0E6B5A]" /> קישורים
            </Label>
            <Input dir="ltr" value={websiteUrl} onChange={(e) => setWebsiteUrl(e.target.value)} placeholder="https://example.com (אתר)" className="h-10 rounded-xl text-sm" maxLength={500} />
            <Input dir="ltr" value={whatsappUrl} onChange={(e) => setWhatsappUrl(e.target.value)} placeholder="https://wa.me/972500000000" className="h-10 rounded-xl text-sm" maxLength={500} />
            <Input dir="ltr" value={instagramUrl} onChange={(e) => setInstagramUrl(e.target.value)} placeholder="https://instagram.com/..." className="h-10 rounded-xl text-sm" maxLength={500} />
            <Input dir="ltr" value={facebookUrl} onChange={(e) => setFacebookUrl(e.target.value)} placeholder="https://facebook.com/..." className="h-10 rounded-xl text-sm" maxLength={500} />
          </div>

          <div className="space-y-2 pt-2 border-t border-border">
            <Label className="text-xs font-bold flex items-center gap-1.5">
              <FileText className="h-3.5 w-3.5 text-[#0E6B5A]" /> קטלוגים
            </Label>
            {supplierId ? (
              <SupplierCatalogsManager supplierId={supplierId} />
            ) : (
              <p className="text-fs-xs text-muted-foreground">שמור את הפרופיל כדי להוסיף קטלוגים.</p>
            )}
          </div>

          <div className="space-y-2 pt-2 border-t border-border">
            <Label className="text-xs font-bold flex items-center gap-1.5">
              <ImageIcon className="h-3.5 w-3.5 text-[#0E6B5A]" /> גלריית עבודות
              <span className="text-[10px] font-normal text-muted-foreground mr-auto">{gallery.length}/{MAX_GALLERY_IMAGES}</span>
            </Label>
            <input ref={galleryInputRef} type="file" accept="image/jpeg,image/png,image/webp" multiple className="hidden" onChange={handleGalleryUpload} />
            <Button type="button" variant="outline" onClick={() => galleryInputRef.current?.click()} disabled={uploadingGallery || gallery.length >= MAX_GALLERY_IMAGES} className="h-9 rounded-xl text-xs w-full">
              <Plus className="h-3.5 w-3.5 ml-1" /> {uploadingGallery ? "מעלה..." : gallery.length >= MAX_GALLERY_IMAGES ? "הגעת למקסימום" : "הוספת תמונות"}
            </Button>

            {gallery.length > 0 && (
              <div className="grid grid-cols-3 gap-2 mt-2">
                {gallery.map((g, idx) => (
                  <div key={idx} className="relative aspect-square rounded-[16px] overflow-hidden shadow-[0_2px_10px_-4px_rgba(10,31,61,0.10)] group">
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
        </Section>

        {/* Payment details */}
        <Section
          title="פרטי תשלום"
          subtitle="ביט או העברה בנקאית — יוצג לדיירים לפיקדון"
          icon={Wallet}
        >
          <Field label="טלפון לביט" icon={Smartphone}>
            <Input dir="ltr" value={bitPhone} onChange={(e) => setBitPhone(e.target.value)} maxLength={20} placeholder="050-0000000" className="h-11 rounded-xl" />
          </Field>

          <div className="pt-2 border-t border-border space-y-3">
            <Label className="text-xs font-bold flex items-center gap-1.5">
              <Building2 className="h-3.5 w-3.5 text-[#0E6B5A]" /> חשבון בנק
            </Label>
            <Field label="שם בעל החשבון" icon={UserIcon}>
              <Input value={bankAccountHolder} onChange={(e) => setBankAccountHolder(e.target.value)} maxLength={80} className="h-11 rounded-xl" />
            </Field>
            <div className="grid grid-cols-2 gap-2">
              <Field label="בנק" icon={Building2}>
                <Input value={bankName} onChange={(e) => setBankName(e.target.value)} maxLength={40} className="h-11 rounded-xl" />
              </Field>
              <Field label="סניף" icon={Building2}>
                <Input dir="ltr" value={bankBranch} onChange={(e) => setBankBranch(e.target.value)} maxLength={10} className="h-11 rounded-xl" />
              </Field>
            </div>
            <Field label="מספר חשבון" icon={Building2}>
              <Input dir="ltr" value={bankAccountNumber} onChange={(e) => setBankAccountNumber(e.target.value)} maxLength={20} className="h-11 rounded-xl" />
            </Field>
          </div>

          <Field label="הערות תשלום לדייר (אופציונלי)" icon={FileText}>
            <Textarea
              value={paymentInstructionsNote}
              onChange={(e) => setPaymentInstructionsNote(e.target.value)}
              maxLength={400}
              rows={3}
              className="rounded-xl"
              placeholder="לדוגמה: נא לציין בהעברה את שם הפרויקט"
            />
          </Field>
        </Section>

        <button
          type="button"
          onClick={() => navigate("/supplier/delete-account")}
          className="w-full h-[44px] rounded-[14px] flex items-center justify-center gap-2 text-[#DC2626] text-[13px] font-semibold"
        >
          מחיקת חשבון
        </button>

        {/* Sticky save bar */}
        <div className="fixed bottom-0 inset-x-0 z-40 pointer-events-none">
          <div className="mx-auto max-w-[var(--app-max-w)] px-4 pb-[max(12px,env(safe-area-inset-bottom))] pt-2 pointer-events-auto">
            <div className="rounded-2xl bg-white/95 backdrop-blur border border-[#EEF0F3] shadow-[0_8px_28px_-12px_rgba(11,18,32,0.28)] p-2 flex gap-2">
              <Button type="button" variant="outline" onClick={() => navigate(-1)} className="flex-1 h-12 rounded-xl">
                <ArrowRight className="h-4 w-4 ml-2" /> ביטול
              </Button>
              <Button
                type="submit"
                disabled={saving}
                className="flex-[1.4] h-12 rounded-[16px] bg-[#0E6B5A] hover:bg-[#0A5446] text-white"
              >
                <Save className="h-4 w-4 ml-2" /> {saving ? "שומר…" : "שמירת שינויים"}
              </Button>
            </div>
          </div>
        </div>
      </form>
    </MobileShell>
  );
}

function Section({
  title,
  subtitle,
  icon: Icon,
  children,
}: {
  title: string;
  subtitle: string;
  icon: React.ComponentType<{ className?: string }>;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-3xl border border-[#EEF0F3] bg-white p-4 space-y-3 shadow-[0_1px_2px_rgba(11,18,32,0.04),0_8px_24px_-12px_rgba(11,18,32,0.08)]">
      <header className="flex items-start gap-3 pb-1">
        <div className="h-10 w-10 rounded-2xl bg-[#0E6B5A]/10 flex items-center justify-center shrink-0">
          <Icon className="h-[18px] w-[18px] text-[#0E6B5A]" strokeWidth={2.2} />
        </div>
        <div className="min-w-0 pt-0.5">
          <h3 className="text-[15px] font-bold text-[#0F172A] leading-tight">{title}</h3>
          <p className="text-[12px] text-[#8E95A2] mt-0.5 leading-snug">{subtitle}</p>
        </div>
      </header>
      {children}
    </section>
  );
}

function Field({ label, icon: Icon, children }: { label: string; icon: React.ComponentType<{ className?: string }>; children: React.ReactNode }) {
  return (
    <div>
      <Label className="text-xs font-bold flex items-center gap-1.5 mb-1.5">
        <Icon className="h-3.5 w-3.5 text-[#0E6B5A]" /> {label}
      </Label>
      {children}
    </div>
  );
}
