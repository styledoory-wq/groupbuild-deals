import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { z } from "zod";
import {
  Save, Plus, Trash2,
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
import { SUPPLIER } from "@/lib/supplierUi";

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
  const [activeSection, setActiveSection] = useState<"details" | "categories" | "areas" | "branding" | "payment">("details");

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
      <MobileShell className="bg-[#E4EBE7]">
        <LoadingState />
      </MobileShell>
    );
  }

  return (
    <MobileShell className="bg-[#E4EBE7]">
      <BackHeader title="פרופיל העסק" subtitle="הפרטים שדיירים רואים עליכם" />

      <form onSubmit={handleSave} className="pb-36" dir="rtl" style={{ background: SUPPLIER.pageBg }}>
        {/* Section switcher — keeps the form comfortable */}
        <div className="px-4 sticky top-0 z-30 bg-[#E4EBE7]/95 backdrop-blur pt-1 pb-3">
          <div className="flex gap-1.5 overflow-x-auto no-scrollbar pb-0.5">
            {([
              { k: "details" as const, label: "פרטים" },
              { k: "categories" as const, label: "תחומים", badge: selectableCategories.length || undefined },
              { k: "areas" as const, label: "אזורים" },
              { k: "branding" as const, label: "מיתוג" },
              { k: "payment" as const, label: "תשלום" },
            ]).map((t) => {
              const on = activeSection === t.k;
              return (
                <button
                  key={t.k}
                  type="button"
                  onClick={() => setActiveSection(t.k)}
                  className={
                    "shrink-0 h-9 px-3.5 rounded-full text-[13px] font-semibold inline-flex items-center gap-1.5 transition-colors " +
                    (on
                      ? "bg-[#0E6B5A] text-white shadow-[0_4px_12px_-6px_rgba(14,107,90,0.55)]"
                      : "bg-white text-[#475569] border border-[#D5DED9]")
                  }
                >
                  {t.label}
                  {t.badge != null && (
                    <span className={"text-[10px] font-bold px-1.5 py-0.5 rounded-full " + (on ? "bg-white/20" : "bg-[#F1F5F9] text-[#64748B]")}>
                      {t.badge}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        <div className="px-5 space-y-4">
          {/* Live preview — how residents see you */}
          <div className="rounded-[28px] border border-[#0E6B5A]/15 bg-gradient-to-l from-[#E8F5F1] to-white p-4 flex items-center gap-3.5 shadow-sm">
            <SupplierLogo name={businessName || "ספק"} logoUrl={logoUrl} size="md" />
            <div className="flex-1 min-w-0 text-right">
              <div className="text-[11px] font-bold text-[#0E6B5A] mb-0.5">כך זה נראה לדיירים</div>
              <div className="text-[15px] font-bold text-[#0F172A] truncate">{businessName || "שם העסק"}</div>
              <div className="text-[12px] text-[#64748B] mt-0.5 line-clamp-2">
                {shortDescription.trim() || "הוסיפו תיאור קצר — הוא יופיע בכרטיס שלכם"}
              </div>
            </div>
          </div>

          {activeSection === "details" && (
            <Section title="פרטי העסק" subtitle="שם, קשר ותיאור שיופיעו בכרטיס">
              <Field label="שם העסק">
                <Input value={businessName} onChange={(e) => setBusinessName(e.target.value)} maxLength={80} autoComplete="organization" enterKeyHint="next" required className="h-12 rounded-2xl bg-white border-[#D5DED9]" />
              </Field>

              <div className="space-y-1.5">
                <Label className="text-[12px] font-semibold text-[#334155]">סוג הספק</Label>
                <div className="grid grid-cols-2 gap-2">
                  {[
                    { value: "service" as const, label: "בעל מקצוע", sub: "שירות / קבלן", checked: offersServices, set: setOffersServices },
                    { value: "product" as const, label: "ספק מוצרים", sub: "חנות / יבואן", checked: offersProducts, set: setOffersProducts },
                  ].map((opt) => (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => opt.set(!opt.checked)}
                      aria-pressed={opt.checked}
                      className={
                        "rounded-2xl p-3.5 text-right transition-all relative border " +
                        (opt.checked
                          ? "bg-[#F1FAF7] border-[#0E6B5A]/40 text-[#0F172A]"
                          : "bg-white border-[#D5DED9] text-[#1F2937]")
                      }
                    >
                      <div className={"text-[14px] font-bold " + (opt.checked ? "text-[#0E6B5A]" : "text-foreground")}>{opt.label}</div>
                      <div className="text-[11px] text-[#8E95A2] mt-0.5 leading-tight">{opt.sub}</div>
                      <span className={"absolute top-2.5 left-2.5 h-5 w-5 rounded-md flex items-center justify-center text-[11px] font-bold " + (opt.checked ? "bg-[#0E6B5A] text-white" : "bg-[#F4F6FA] text-transparent")}>
                        ✓
                      </span>
                    </button>
                  ))}
                </div>
                {!offersServices && !offersProducts && (
                  <p className="text-[12px] text-[#B45309]">בחרו לפחות אפשרות אחת כדי להופיע לדיירים.</p>
                )}
              </div>

              <div className="grid grid-cols-1 gap-4">
                <Field label="שם איש קשר">
                  <Input value={contactName} onChange={(e) => setContactName(e.target.value)} maxLength={60} autoComplete="name" enterKeyHint="next" className="h-12 rounded-2xl bg-white border-[#D5DED9]" />
                </Field>
                <Field label="טלפון">
                  <Input type="tel" inputMode="tel" autoComplete="tel" enterKeyHint="next" value={phone} onChange={(e) => setPhone(e.target.value)} maxLength={20} dir="ltr" className="h-12 rounded-2xl bg-white border-[#D5DED9]" />
                </Field>
                <Field label="אימייל">
                  <Input type="email" inputMode="email" autoComplete="email" enterKeyHint="next" value={email} onChange={(e) => setEmail(e.target.value)} maxLength={255} dir="ltr" required className="h-12 rounded-2xl bg-white border-[#D5DED9]" />
                  {email.trim().toLowerCase() !== originalEmail.toLowerCase() && (
                    <p className="text-[12px] text-[#0A5446] mt-1">בלחיצה על שמירה יישלח מייל אימות לכתובת החדשה</p>
                  )}
                </Field>
                <Field label="תיאור קצר לכרטיס">
                  <Input value={shortDescription} onChange={(e) => setShortDescription(e.target.value)} maxLength={140} className="h-12 rounded-2xl bg-white border-[#D5DED9]" placeholder="משפט אחד שמושך דיירים (עד 140 תווים)" />
                </Field>
                <Field label="תיאור עסק מלא">
                  <Textarea value={description} onChange={(e) => setDescription(e.target.value)} maxLength={1000} rows={4} className="rounded-2xl bg-white border-[#D5DED9]" placeholder="ספרו על הניסיון, סוגי עבודות, ומה מייחד אתכם" />
                </Field>
              </div>

              <div className="flex items-center justify-between py-3 px-4 rounded-2xl bg-[#F1FAF7] border border-[#0E6B5A]/15">
                <div>
                  <div className="text-[14px] font-semibold text-[#0F172A]">מוצג לדיירים</div>
                  <p className="text-[12px] text-[#64748B] mt-0.5">{isActive ? "הפרופיל גלוי בחיפוש" : "כבוי — לא יוצג לדיירים"}</p>
                </div>
                <Switch checked={isActive} onCheckedChange={setIsActive} />
              </div>
            </Section>
          )}

          {activeSection === "categories" && (
            <Section title="תחומי פעילות" subtitle="בחרו רק את מה שאתם באמת מספקים">
              <CategoryMultiPicker
                categories={categories}
                value={selectableCategories}
                onChange={setSelectedCategories}
                placeholder="חיפוש תחום…"
              />
            </Section>
          )}

          {activeSection === "areas" && (
            <Section title="אזורי שירות" subtitle="ערים ואזורים שבהם אתם מגיעים">
              <AreasCombobox value={areas} onChange={setAreas} />
            </Section>
          )}

          {activeSection === "branding" && (
            <Section title="מיתוג ומדיה" subtitle="לוגו, קישורים וגלריה">
              <div className="flex items-center gap-4">
                <SupplierLogo name={businessName} logoUrl={logoUrl} size="lg" />
                <div className="flex-1 space-y-2">
                  <input ref={logoInputRef} type="file" accept="image/jpeg,image/png,image/webp" className="hidden" onChange={handleLogoUpload} />
                  <Button type="button" variant="outline" onClick={() => logoInputRef.current?.click()} disabled={uploadingLogo} className="h-10 rounded-xl text-[13px] w-full font-semibold">
                    {uploadingLogo ? "מעלה..." : logoUrl ? "החלפת לוגו" : "העלאת לוגו"}
                  </Button>
                  {logoUrl && (
                    <Button type="button" variant="ghost" onClick={() => setLogoUrl(null)} className="h-8 rounded-xl text-[12px] w-full text-destructive">
                      הסרת לוגו
                    </Button>
                  )}
                </div>
              </div>

              <div className="space-y-2 pt-3 border-t border-[#F1F5F9]">
                <Label className="text-[12px] font-semibold text-[#334155]">קישורים</Label>
                <Input type="url" inputMode="url" autoComplete="url" dir="ltr" value={websiteUrl} onChange={(e) => setWebsiteUrl(e.target.value)} placeholder="אתר — https://..." className="h-10 rounded-xl text-sm" maxLength={500} />
                <Input type="url" inputMode="url" dir="ltr" value={whatsappUrl} onChange={(e) => setWhatsappUrl(e.target.value)} placeholder="WhatsApp — https://wa.me/..." className="h-10 rounded-xl text-sm" maxLength={500} />
                <Input type="url" inputMode="url" dir="ltr" value={instagramUrl} onChange={(e) => setInstagramUrl(e.target.value)} placeholder="Instagram" className="h-10 rounded-xl text-sm" maxLength={500} />
                <Input type="url" inputMode="url" dir="ltr" value={facebookUrl} onChange={(e) => setFacebookUrl(e.target.value)} placeholder="Facebook" className="h-10 rounded-xl text-sm" maxLength={500} />
              </div>

              <div className="space-y-2 pt-3 border-t border-[#F1F5F9]">
                <Label className="text-[12px] font-semibold text-[#334155]">קטלוגים</Label>
                {supplierId ? (
                  <SupplierCatalogsManager supplierId={supplierId} />
                ) : (
                  <p className="text-[12px] text-[#8E95A2]">שמרו את הפרופיל כדי להוסיף קטלוגים.</p>
                )}
              </div>

              <div className="space-y-2 pt-3 border-t border-[#F1F5F9]">
                <div className="flex items-center justify-between">
                  <Label className="text-[12px] font-semibold text-[#334155]">גלריית עבודות</Label>
                  <span className="text-[11px] text-[#8E95A2]">{gallery.length}/{MAX_GALLERY_IMAGES}</span>
                </div>
                <input ref={galleryInputRef} type="file" accept="image/jpeg,image/png,image/webp" multiple className="hidden" onChange={handleGalleryUpload} />
                <Button type="button" variant="outline" onClick={() => galleryInputRef.current?.click()} disabled={uploadingGallery || gallery.length >= MAX_GALLERY_IMAGES} className="h-10 rounded-xl text-[13px] w-full font-semibold">
                  <Plus className="h-3.5 w-3.5 ml-1" /> {uploadingGallery ? "מעלה..." : gallery.length >= MAX_GALLERY_IMAGES ? "הגעתם למקסימום" : "הוספת תמונות"}
                </Button>
                {gallery.length > 0 && (
                  <div className="grid grid-cols-3 gap-2 mt-1">
                    {gallery.map((g, idx) => (
                      <div key={idx} className="relative aspect-square rounded-2xl overflow-hidden group border border-[#D5DED9]">
                        <img src={g.image_url} alt="" className="h-full w-full object-cover" />
                        <button
                          type="button"
                          onClick={() => removeGalleryItem(idx)}
                          className="absolute top-1.5 left-1.5 h-7 w-7 rounded-full bg-black/55 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 focus:opacity-100 transition-opacity"
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
          )}

          {activeSection === "payment" && (
            <Section title="פרטי תשלום" subtitle="יוצגו לדיירים להעברת תשלום">
              <Field label="טלפון לביט">
                <Input type="tel" inputMode="tel" autoComplete="tel" dir="ltr" value={bitPhone} onChange={(e) => setBitPhone(e.target.value)} maxLength={20} placeholder="050-0000000" className="h-11 rounded-xl" />
              </Field>

              <div className="pt-1 space-y-3">
                <p className="text-[12px] font-semibold text-[#334155]">חשבון בנק</p>
                <Field label="שם בעל החשבון">
                  <Input value={bankAccountHolder} onChange={(e) => setBankAccountHolder(e.target.value)} maxLength={80} autoComplete="name" className="h-11 rounded-xl" />
                </Field>
                <div className="grid grid-cols-2 gap-2">
                  <Field label="בנק">
                    <Input value={bankName} onChange={(e) => setBankName(e.target.value)} maxLength={40} className="h-11 rounded-xl" />
                  </Field>
                  <Field label="סניף">
                    <Input inputMode="numeric" dir="ltr" value={bankBranch} onChange={(e) => setBankBranch(e.target.value)} maxLength={10} className="h-11 rounded-xl" />
                  </Field>
                </div>
                <Field label="מספר חשבון">
                  <Input inputMode="numeric" dir="ltr" value={bankAccountNumber} onChange={(e) => setBankAccountNumber(e.target.value)} maxLength={20} className="h-11 rounded-xl" />
                </Field>
              </div>

              <Field label="הערות לדייר (אופציונלי)">
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
          )}

          <button
            type="button"
            onClick={() => navigate("/supplier/delete-account")}
            className="w-full h-10 flex items-center justify-center text-[#94A3B8] text-[12px] font-medium"
          >
            מחיקת חשבון
          </button>
        </div>

        {/* Sticky save — single primary action */}
        <div className="fixed bottom-0 inset-x-0 z-40 pointer-events-none">
          <div className="mx-auto max-w-[var(--app-max-w)] px-5 pb-[max(14px,env(safe-area-inset-bottom))] pt-2 pointer-events-auto">
            <div className="space-y-2">
              <Button
                type="submit"
                disabled={saving}
                className="w-full h-13 h-[52px] rounded-2xl bg-[#0E6B5A] hover:bg-[#0A5446] text-white text-[15px] font-bold shadow-[0_10px_28px_-12px_rgba(14,107,90,0.55)]"
              >
                <Save className="h-4 w-4 ml-2" /> {saving ? "שומר…" : "שמירה"}
              </Button>
              <button
                type="button"
                onClick={() => navigate(-1)}
                className="w-full h-9 text-[13px] font-semibold text-[#64748B]"
              >
                ביטול
              </button>
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
  children,
}: {
  title: string;
  subtitle: string;
  children: React.ReactNode;
}) {
  return (
    <section className={SUPPLIER.cardPad + " space-y-4"}>
      <header>
        <h3 className="text-[16px] font-bold text-[#0F172A] leading-tight">{title}</h3>
        <p className="text-[13px] text-[#8E95A2] mt-1 leading-snug">{subtitle}</p>
      </header>
      {children}
    </section>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <Label className="text-[12px] font-semibold text-[#334155] mb-1.5 block">{label}</Label>
      {children}
    </div>
  );
}
