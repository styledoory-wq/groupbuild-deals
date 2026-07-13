import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Loader2, Check, Briefcase, Phone, Mail, Tag, MapPin, FileText,
  Image as ImageIcon, ArrowLeft, Sparkles,
} from "lucide-react";
import { MobileShell } from "@/components/layout/MobileShell";
import { BottomNav } from "@/components/layout/BottomNav";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { SupplierLogo } from "@/components/suppliers/SupplierLogo";
import { AreasCombobox, type AreasComboboxValue } from "@/components/areas/AreasCombobox";
import { supabase } from "@/integrations/supabase/client";
import { useApp } from "@/store/AppStore";
import { resolveSupplierForUser } from "@/lib/supplierAuth";
import { uploadSupplierLogo } from "@/lib/supplierUploads";
import { computeCompleteness } from "@/lib/supplierCompleteness";
import {
  clearSupplierDraft,
  draftHasContent,
  loadSupplierDraft,
  saveSupplierDraft,
  type SupplierOnboardingStep,
} from "@/lib/supplierOnboardingDraft";
import { toast } from "sonner";


type StepKey = SupplierOnboardingStep;

export default function SupplierOnboarding() {
  const navigate = useNavigate();
  const { categories, setUser } = useApp();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [supplierId, setSupplierId] = useState<string | null>(null);
  const [userId, setUserId] = useState<string | null>(null);

  // Fields
  const [businessName, setBusinessName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [contactName, setContactName] = useState("");
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [areas, setAreas] = useState<AreasComboboxValue>({
    servesAllCountry: false, regionIds: [], cityIds: [],
  });
  const [shortDescription, setShortDescription] = useState("");
  const [logoUrl, setLogoUrl] = useState<string | null>(null);
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const logoInputRef = useRef<HTMLInputElement>(null);

  const [openStep, setOpenStep] = useState<StepKey>("business");

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const { data: session, error: sessErr } = await supabase.auth.getSession();
        if (sessErr) throw sessErr;
        const uid = session.session?.user?.id;
        const sessionEmail = session.session?.user?.email ?? "";
        if (!uid) {
          navigate("/auth", { replace: true });
          return;
        }
        if (cancelled) return;
        setUserId(uid);
        setEmail(sessionEmail);

        // Load DB state + local draft in parallel. Draft is our safety net
        // against network failures and lets the user resume mid-flow.
        const [{ data: profile, error: profErr }, existing] = await Promise.all([
          supabase.from("profiles").select("full_name,phone,business_name").eq("id", uid).maybeSingle(),
          resolveSupplierForUser(uid, sessionEmail, "*"),
        ]);
        if (profErr) console.warn("[onboarding] profile fetch failed:", profErr.message);

        const draft = loadSupplierDraft(uid);

        // Base values from DB (or empty for brand-new supplier).
        let baseBusinessName = existing?.business_name ?? profile?.business_name ?? "";
        let baseContactName = existing?.contact_name ?? profile?.full_name ?? "";
        let basePhone = existing?.phone ?? profile?.phone ?? "";
        let baseEmail = existing?.email ?? sessionEmail;
        let baseCategories: string[] = existing?.categories ?? [];
        let baseShort = existing?.short_description ?? "";
        let baseLogo: string | null = existing?.logo_url ?? null;
        let baseAreas = {
          servesAllCountry: false,
          regionIds: [] as string[],
          cityIds: [] as string[],
        };

        if (existing) {
          setSupplierId(existing.id);
          const [{ data: regs }, { data: cits }] = await Promise.all([
            supabase.from("supplier_regions").select("region_id").eq("supplier_id", existing.id),
            supabase.from("supplier_cities").select("city_id").eq("supplier_id", existing.id),
          ]);
          baseAreas = {
            servesAllCountry: !!existing.serves_all_country,
            regionIds: (regs ?? []).map((r) => r.region_id as string),
            cityIds: (cits ?? []).map((c) => c.city_id as string),
          };
        }

        // Draft overrides base for any field the user changed locally.
        // (Restored ONLY when draft actually has content — prevents wiping
        // a completed profile with an empty draft blob.)
        const useDraft = draftHasContent(draft);
        if (useDraft && draft) {
          baseBusinessName = draft.businessName || baseBusinessName;
          baseContactName = draft.contactName || baseContactName;
          basePhone = draft.phone || basePhone;
          baseEmail = draft.email || baseEmail;
          baseCategories = draft.selectedCategories.length ? draft.selectedCategories : baseCategories;
          baseShort = draft.shortDescription || baseShort;
          baseLogo = draft.logoUrl ?? baseLogo;
          if (
            draft.areas.servesAllCountry ||
            draft.areas.regionIds.length ||
            draft.areas.cityIds.length
          ) {
            baseAreas = draft.areas;
          }
        }

        if (cancelled) return;
        setBusinessName(baseBusinessName);
        setContactName(baseContactName);
        setPhone(basePhone);
        setEmail(baseEmail);
        setSelectedCategories(baseCategories);
        setShortDescription(baseShort);
        setLogoUrl(baseLogo);
        setAreas(baseAreas);
        if (useDraft && draft?.openStep) setOpenStep(draft.openStep);
        if (useDraft) {
          toast.info("שחזרנו את הטיוטה שלך — תוכל להמשיך מהמקום שבו עצרת");
        }
      } catch (err) {
        console.error("[onboarding] init failed:", err);
        toast.error("טעינת ההרשמה נכשלה", {
          description: err instanceof Error ? err.message : "נסה לרענן את הדף",
        });
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [navigate]);

  // Auto-save draft on every field change (debounced) so nothing is lost
  // on refresh, tab close, or network failure.
  useEffect(() => {
    if (!userId || loading) return;
    const handle = window.setTimeout(() => {
      saveSupplierDraft(userId, {
        businessName,
        contactName,
        phone,
        email,
        selectedCategories,
        areas,
        shortDescription,
        logoUrl,
        openStep,
      });
    }, 350);
    return () => window.clearTimeout(handle);
  }, [
    userId,
    loading,
    businessName,
    contactName,
    phone,
    email,
    selectedCategories,
    areas,
    shortDescription,
    logoUrl,
    openStep,
  ]);


  const completeness = useMemo(() =>
    computeCompleteness({
      business_name: businessName,
      phone,
      email,
      categories: selectedCategories,
      serves_all_country: areas.servesAllCountry,
      regionsCount: areas.regionIds.length,
      citiesCount: areas.cityIds.length,
      short_description: shortDescription,
    }),
  [businessName, phone, email, selectedCategories, areas, shortDescription]);

  const doneStep = (key: StepKey): boolean => {
    switch (key) {
      case "business": return !!businessName && businessName.trim().length >= 2;
      case "contact": return phone.replace(/\D/g, "").length >= 9 && !!email;
      case "category": return selectedCategories.length > 0;
      case "area": return areas.servesAllCountry || areas.regionIds.length > 0 || areas.cityIds.length > 0;
      case "description": return shortDescription.trim().length >= 10;
      case "logo": return !!logoUrl;
    }
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

  const save = async (opts: { silent?: boolean } = {}) => {
    if (!userId) {
      toast.error("החיבור למערכת אבד — התחבר מחדש כדי לשמור");
      return;
    }
    if (!businessName.trim() || businessName.trim().length < 2) {
      toast.error("חסר שם עסק — נא למלא לפני שמירה");
      return;
    }
    setSaving(true);
    try {
      // Re-verify session right before writing. Prevents RLS 401s from
      // silently wiping data if the token expired in the background.
      const { data: sess } = await supabase.auth.getSession();
      if (!sess.session) {
        throw new Error("החיבור פג — יש להתחבר מחדש. הנתונים נשמרו כטיוטה מקומית.");
      }

      const { data: sid, error } = await supabase.rpc("save_supplier_onboarding" as never, {
        _business_name: businessName.trim(),
        _contact_name: contactName.trim() || null,
        _phone: phone.trim() || null,
        _email: email.trim() || null,
        _short_description: shortDescription.trim() || null,
        _category_ids: selectedCategories,
        _serves_all_country: areas.servesAllCountry,
        _region_ids: areas.servesAllCountry ? [] : areas.regionIds,
        _city_ids: areas.servesAllCountry ? [] : areas.cityIds,
        _logo_url: logoUrl,
      } as never);
      if (error) throw new Error(`שמירת פרופיל הספק נכשלה: ${error.message}`);
      if (typeof sid === "string") setSupplierId(sid);
      setUser({
        id: userId,
        role: "supplier",
        name: contactName.trim() || businessName.trim(),
        phone: phone.trim(),
        email: email.trim(),
      });
      if (!opts.silent) toast.success("נשמר בהצלחה");
    } catch (err) {
      const msg = err instanceof Error ? err.message : "שמירה נכשלה";
      console.error("[onboarding] save failed:", err);
      toast.error(msg, {
        description: "הפרטים שמילאת נשמרו כטיוטה — לא תאבד אותם גם אם תרענן",
      });
      throw err;
    } finally {
      setSaving(false);
    }
  };

  const handleFinish = async () => {
    if (!completeness.complete) {
      toast.error(`חסרים פרטים: ${completeness.missing.join(", ")}`);
      return;
    }
    try {
      await save({ silent: true });
      if (userId) clearSupplierDraft(userId);
      toast.success("הפרופיל הושלם! ההרשמה בבדיקת אדמין");
      navigate("/supplier");
    } catch {
      /* toast handled in save() */
    }
  };


  if (loading) {
    return (
      <MobileShell>
        <div className="min-h-[60vh] flex items-center justify-center">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      </MobileShell>
    );
  }

  return (
    <MobileShell>
      {/* Sticky progress header */}
      <div className="sticky top-0 z-20 bg-background/95 backdrop-blur border-b border-border/60 px-4 pt-4 pb-3">
        <div className="flex items-center justify-between mb-1.5">
          <h1 className="text-fs-lg font-extrabold text-[#0B1220]">השלמת פרופיל העסק</h1>
          <span className="text-fs-sm font-bold text-[#0E6B5A]">{completeness.percent}%</span>
        </div>
        <div className="h-2 rounded-full bg-muted overflow-hidden">
          <div
            className="h-full rounded-full transition-all duration-500"
            style={{
              width: `${completeness.percent}%`,
              background: "linear-gradient(90deg, #0E6B5A 0%, #34A88E 100%)",
            }}
          />
        </div>
        {!completeness.complete && (
          <p className="text-fs-xs text-muted-foreground mt-2">
            כדי להתחיל לקבל פניות ולפרסם הצעות, השלם את פרופיל העסק.
          </p>
        )}
        {completeness.complete && (
          <p className="text-fs-xs text-emerald-700 font-semibold mt-2 inline-flex items-center gap-1">
            <Sparkles className="h-3 w-3" /> כל הפרטים מלאים — לחץ "סיים" בסוף המסך
          </p>
        )}
      </div>

      <div className="px-4 py-4 pb-32 space-y-3">
        <StepCard
          k="business" icon={Briefcase} title="פרטי עסק" done={doneStep("business")}
          openKey={openStep} onToggle={setOpenStep}
        >
          <Label>שם עסק *</Label>
          <Input value={businessName} onChange={(e) => setBusinessName(e.target.value)} placeholder="לדוגמה: אלקטרו-חן בע״מ" />
          <div className="mt-3">
            <Label>שם איש קשר</Label>
            <Input value={contactName} onChange={(e) => setContactName(e.target.value)} placeholder="השם המלא שלך" />
          </div>
          <StepSaveButton onSave={save} saving={saving} onNext={() => setOpenStep("contact")} />
        </StepCard>

        <StepCard
          k="contact" icon={Phone} title="פרטי קשר" done={doneStep("contact")}
          openKey={openStep} onToggle={setOpenStep}
        >
          <Label>טלפון *</Label>
          <Input type="tel" inputMode="tel" dir="ltr" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="050-0000000" />
          <div className="mt-3">
            <Label>אימייל *</Label>
            <Input type="email" dir="ltr" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@business.com" />
          </div>
          <StepSaveButton onSave={save} saving={saving} onNext={() => setOpenStep("category")} />
        </StepCard>

        <StepCard
          k="category" icon={Tag} title="תחום פעילות" done={doneStep("category")}
          openKey={openStep} onToggle={setOpenStep}
        >
          <p className="text-fs-xs text-muted-foreground mb-2">בחר תחום אחד או יותר שאתה מספק:</p>
          <div className="flex flex-wrap gap-1.5">
            {categories.map((c) => {
              const active = selectedCategories.includes(c.id);
              return (
                <button
                  key={c.id}
                  type="button"
                  onClick={() =>
                    setSelectedCategories((prev) =>
                      active ? prev.filter((x) => x !== c.id) : [...prev, c.id],
                    )
                  }
                  className={`text-xs px-3 py-1.5 rounded-full border transition-smooth ${
                    active
                      ? "bg-[#0E6B5A] text-white border-[#0E6B5A] font-bold"
                      : "bg-card border-border text-foreground hover:border-[#0E6B5A]/50"
                  }`}
                >
                  {c.icon} {c.name}
                </button>
              );
            })}
          </div>
          <StepSaveButton onSave={save} saving={saving} onNext={() => setOpenStep("area")} />
        </StepCard>

        <StepCard
          k="area" icon={MapPin} title="אזורי שירות" done={doneStep("area")}
          openKey={openStep} onToggle={setOpenStep}
        >
          <p className="text-fs-xs text-muted-foreground mb-2">איפה אתה נותן שירות?</p>
          <AreasCombobox value={areas} onChange={setAreas} />
          <StepSaveButton onSave={save} saving={saving} onNext={() => setOpenStep("description")} />
        </StepCard>

        <StepCard
          k="description" icon={FileText} title="תיאור עסק" done={doneStep("description")}
          openKey={openStep} onToggle={setOpenStep}
        >
          <Label>תיאור קצר (יופיע לדיירים)</Label>
          <Textarea
            rows={4}
            value={shortDescription}
            onChange={(e) => setShortDescription(e.target.value)}
            placeholder="ספר בקצרה על העסק, ניסיון, ומה מייחד אותך…"
            maxLength={400}
          />
          <p className="text-fs-xs text-muted-foreground mt-1">{shortDescription.length}/400</p>
          <StepSaveButton onSave={save} saving={saving} onNext={() => setOpenStep("logo")} />
        </StepCard>

        <StepCard
          k="logo" icon={ImageIcon} title="לוגו העסק (מומלץ)" done={doneStep("logo")}
          openKey={openStep} onToggle={setOpenStep}
        >
          <div className="flex items-center gap-3">
            <SupplierLogo name={businessName || "עסק"} logoUrl={logoUrl} size="lg" />
            <div className="flex-1 space-y-2">
              <input
                ref={logoInputRef}
                type="file"
                accept="image/*"
                onChange={handleLogoUpload}
                className="hidden"
              />
              <Button
                type="button"
                variant="outline"
                onClick={() => logoInputRef.current?.click()}
                disabled={uploadingLogo}
                className="w-full"
              >
                {uploadingLogo ? <Loader2 className="h-4 w-4 animate-spin" /> : logoUrl ? "החלף לוגו" : "העלה לוגו"}
              </Button>
              {logoUrl && (
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => setLogoUrl(null)}
                  className="w-full text-red-600"
                >
                  הסר לוגו
                </Button>
              )}
            </div>
          </div>
          <p className="text-fs-xs text-muted-foreground mt-2">
            💡 עסקים עם לוגו מקבלים יותר פניות מדיירים.
          </p>
          <StepSaveButton onSave={save} saving={saving} />
        </StepCard>
      </div>

      {/* Sticky footer CTA */}
      <div className="fixed bottom-16 inset-x-0 px-4 pb-3 pt-3 bg-gradient-to-t from-background via-background to-background/80 z-30">
        <Button
          onClick={handleFinish}
          disabled={saving || !completeness.complete}
          className="w-full h-12 rounded-xl text-fs-md font-extrabold bg-[#0E6B5A] hover:bg-[#0A5446] disabled:opacity-60 flex items-center justify-center gap-2"
        >
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : completeness.complete ? "סיים והמשך" : `חסרים ${completeness.missing.length} פרטים`}
          {completeness.complete && !saving && <ArrowLeft className="h-4 w-4" />}
        </Button>
      </div>

      <BottomNav role="supplier" />
    </MobileShell>
  );
}

function StepCard({
  k, icon: Icon, title, done, openKey, onToggle, children,
}: {
  k: StepKey;
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  done: boolean;
  openKey: StepKey;
  onToggle: (k: StepKey) => void;
  children: React.ReactNode;
}) {
  const isOpen = openKey === k;
  return (
    <div className="gb-card overflow-hidden">
      <button
        type="button"
        onClick={() => onToggle(isOpen ? ("" as StepKey) : k)}
        className="w-full flex items-center gap-3 p-3 text-right"
      >
        <span
          className={`h-8 w-8 shrink-0 rounded-full flex items-center justify-center text-white text-fs-sm font-bold ${
            done ? "bg-emerald-500" : "bg-muted text-muted-foreground"
          }`}
        >
          {done ? <Check className="h-4 w-4" /> : <Icon className="h-4 w-4" />}
        </span>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="font-bold text-fs-sm">{title}</span>
            {done && <span className="text-fs-xs text-emerald-700 font-semibold">✓ הושלם</span>}
          </div>
        </div>
        <span className="text-muted-foreground text-fs-xs">{isOpen ? "סגור" : "פתח"}</span>
      </button>
      {isOpen && <div className="px-3 pb-3 pt-1 border-t border-border/60">{children}</div>}
    </div>
  );
}

function StepSaveButton({
  onSave, saving, onNext,
}: {
  onSave: () => Promise<void>;
  saving: boolean;
  onNext?: () => void;
}) {
  return (
    <div className="mt-3 flex gap-2">
      <Button
        type="button"
        onClick={async () => {
          try {
            await onSave();
            onNext?.();
          } catch { /* toast handled */ }
        }}
        disabled={saving}
        className="flex-1 bg-[#0E6B5A] hover:bg-[#0A5446] text-white font-bold"
      >
        {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : onNext ? "שמור והמשך" : "שמור"}
      </Button>
    </div>
  );
}
