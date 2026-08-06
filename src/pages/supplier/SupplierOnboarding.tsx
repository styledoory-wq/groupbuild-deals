import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Loader2, Check, Briefcase, Phone, Tag, MapPin, FileText,
  Image as ImageIcon, ArrowLeft, ArrowRight, Sparkles, AlertCircle,
  ClipboardCheck, UserRound, Mail,
} from "lucide-react";
import { MobileShell } from "@/components/layout/MobileShell";
import { BottomNav } from "@/components/layout/BottomNav";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { SupplierLogo } from "@/components/suppliers/SupplierLogo";
import { AreasCombobox, type AreasComboboxValue } from "@/components/areas/AreasCombobox";
import { CategoryMultiPicker } from "@/components/categories/CategoryMultiPicker";
import { supabase } from "@/integrations/supabase/client";
import { acceptSupplierTerms } from "@/lib/supplierTerms";
import { useApp } from "@/store/AppStore";
import { resolveSupplierForUser } from "@/lib/supplierAuth";
import { uploadSupplierLogo } from "@/lib/supplierUploads";
import { computeCompleteness } from "@/lib/supplierCompleteness";
import {
  clearSupplierDraft,
  draftHasContent,
  loadSupplierDraft,
  saveSupplierDraft,
  SUPPLIER_ONBOARDING_STEPS,
  type SupplierOnboardingStep,
} from "@/lib/supplierOnboardingDraft";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { consumePendingReturnUrl } from "@/lib/returnUrl";

type StepKey = SupplierOnboardingStep;

const STEP_META: Record<
  Exclude<StepKey, "review">,
  { title: string; short: string; subtitle: string; icon: React.ComponentType<{ className?: string }> }
> = {
  business: {
    title: "פרטי העסק",
    short: "עסק",
    subtitle: "איך העסק יופיע לדיירים בפרויקטים",
    icon: Briefcase,
  },
  contact: {
    title: "פרטי קשר",
    short: "קשר",
    subtitle: "טלפון ואימייל כדי שדיירים יוכלו להגיע אליכם",
    icon: Phone,
  },
  category: {
    title: "תחומי פעילות",
    short: "תחומים",
    subtitle: "סמנו את כל התחומים שאתם מספקים — כך לא תפספסו פניות",
    icon: Tag,
  },
  area: {
    title: "אזורי שירות",
    short: "מיקום",
    subtitle: "היכן אתם נותנים שירות — ערים, אזורים או כל הארץ",
    icon: MapPin,
  },
  description: {
    title: "על העסק",
    short: "תיאור",
    subtitle: "תיאור קצר שעוזר לדיירים להבין למה לבחור בכם",
    icon: FileText,
  },
  logo: {
    title: "לוגו העסק",
    short: "לוגו",
    subtitle: "מומלץ מאוד — עסקים עם לוגו מקבלים יותר פניות",
    icon: ImageIcon,
  },
};

const WIZARD_STEPS = SUPPLIER_ONBOARDING_STEPS;

function isValidEmail(v: string) {
  return /.+@.+\..+/.test(v.trim());
}

function phoneDigits(v: string) {
  return v.replace(/\D/g, "");
}

export default function SupplierOnboarding() {
  const navigate = useNavigate();
  const { categories, setUser } = useApp();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [supplierId, setSupplierId] = useState<string | null>(null);
  const [userId, setUserId] = useState<string | null>(null);

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
  const [aiLoading, setAiLoading] = useState<null | "generate" | "improve">(null);

  const runAiDescription = async (mode: "generate" | "improve") => {
    if (aiLoading) return;
    setAiLoading(mode);
    try {
      const catNames = selectedCategories
        .map((id) => categories.find((c) => c.id === id)?.name)
        .filter(Boolean) as string[];
      const { data, error } = await supabase.functions.invoke("ai-supplier-description", {
        body: {
          businessName,
          categories: catNames,
          current: shortDescription,
          mode,
        },
      });
      if (error) throw error;
      const text = (data as { text?: string } | null)?.text?.trim();
      if (!text) throw new Error("empty");
      setShortDescription(text);
      toast.success(mode === "improve" ? "התיאור שופר" : "נוצר תיאור חדש");
    } catch (e) {
      const msg = e instanceof Error ? e.message : "";
      if (msg.includes("429") || msg.includes("rate_limited")) {
        toast.error("יותר מדי בקשות — נסו שוב בעוד רגע");
      } else if (msg.includes("402") || msg.includes("credits")) {
        toast.error("חרגתם ממכסת ה-AI — פנו לתמיכה");
      } else {
        toast.error("לא הצלחנו להפעיל את ה-AI", { description: "נסו שוב בעוד רגע" });
      }
    } finally {
      setAiLoading(null);
    }
  };

  const [step, setStep] = useState<StepKey>("business");
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [attemptedContinue, setAttemptedContinue] = useState(false);

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

        const [{ data: profile, error: profErr }, existing] = await Promise.all([
          supabase.from("profiles").select("full_name,phone,business_name").eq("id", uid).maybeSingle(),
          resolveSupplierForUser(uid, sessionEmail, "*"),
        ]);
        if (profErr) console.warn("[onboarding] profile fetch failed:", profErr.message);

        const draft = loadSupplierDraft(uid);

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
        if (useDraft && draft?.openStep) setStep(draft.openStep);
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
        openStep: step,
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
    step,
  ]);

  const completeness = useMemo(() =>
    computeCompleteness({
      business_name: businessName,
      contact_name: contactName,
      phone,
      email,
      categories: selectedCategories,
      serves_all_country: areas.servesAllCountry,
      regionsCount: areas.regionIds.length,
      citiesCount: areas.cityIds.length,
      short_description: shortDescription,
      logo_url: logoUrl,
    }),
  [businessName, contactName, phone, email, selectedCategories, areas, shortDescription, logoUrl]);

  const categoryNames = useMemo(() => {
    const byId = new Map(categories.map((c) => [c.id, c.name]));
    return selectedCategories.map((id) => byId.get(id)).filter(Boolean) as string[];
  }, [categories, selectedCategories]);

  const stepIndex = WIZARD_STEPS.indexOf(step);
  const progressPercent = Math.round(((stepIndex + 1) / WIZARD_STEPS.length) * 100);

  const validateStep = (key: StepKey): Record<string, string> => {
    const errors: Record<string, string> = {};
    switch (key) {
      case "business":
        if (businessName.trim().length < 2) errors.businessName = "הזינו שם עסק (לפחות 2 תווים)";
        if (contactName.trim().length < 2) errors.contactName = "הזינו שם איש קשר";
        break;
      case "contact":
        if (phoneDigits(phone).length < 9) errors.phone = "הזינו מספר טלפון תקין (לפחות 9 ספרות)";
        if (!isValidEmail(email)) errors.email = "הזינו כתובת אימייל תקינה";
        break;
      case "category":
        if (selectedCategories.length === 0) {
          errors.categories = "בחרו לפחות תחום אחד — אחרת דיירים לא ימצאו אתכם";
        }
        break;
      case "area":
        if (!areas.servesAllCountry && areas.regionIds.length === 0 && areas.cityIds.length === 0) {
          errors.areas = "בחרו אזור שירות, ערים, או סמנו \"כל הארץ\"";
        }
        break;
      case "description":
        if (shortDescription.trim().length < 10) {
          errors.shortDescription = "כתבו תיאור קצר של לפחות 10 תווים";
        }
        break;
      case "logo":
      case "review":
        break;
    }
    return errors;
  };

  const goToStep = (next: StepKey) => {
    setFieldErrors({});
    setAttemptedContinue(false);
    setStep(next);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleContinue = async () => {
    setAttemptedContinue(true);
    const errors = validateStep(step);
    setFieldErrors(errors);
    if (Object.keys(errors).length > 0) {
      const first = Object.values(errors)[0];
      toast.error(first);
      return;
    }

    // Soft nudge: only one category — don't block, but warn once.
    if (step === "category" && selectedCategories.length === 1) {
      toast.message("רק תחום אחד נבחר", {
        description: "אם אתם מספקים עוד תחומים — כדאי לסמן אותם עכשיו כדי לא לפספס פניות",
      });
    }

    try {
      await save({ silent: true });
    } catch {
      /* toast in save — still allow navigation if draft exists */
    }

    const idx = WIZARD_STEPS.indexOf(step);
    if (idx < WIZARD_STEPS.length - 1) {
      goToStep(WIZARD_STEPS[idx + 1]);
    }
  };

  const handleBack = () => {
    const idx = WIZARD_STEPS.indexOf(step);
    if (idx > 0) goToStep(WIZARD_STEPS[idx - 1]);
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

  const save = async (opts: { silent?: boolean; completed?: boolean } = {}) => {
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
        _completed: opts.completed === true,
      } as never);
      if (error) throw new Error(`שמירת פרופיל הספק נכשלה: ${error.message}`);
      if (typeof sid === "string") setSupplierId(sid);
      // New suppliers are recorded as accepting the current agreement version (v4).
      try { await acceptSupplierTerms(); } catch (e) { console.warn("[onboarding] terms record failed", e); }
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
    // Re-validate all required steps before submit.
    for (const key of ["business", "contact", "category", "area", "description"] as const) {
      const errors = validateStep(key);
      if (Object.keys(errors).length > 0) {
        goToStep(key);
        setAttemptedContinue(true);
        setFieldErrors(errors);
        toast.error(`חסרים פרטים ב"${STEP_META[key].title}"`);
        return;
      }
    }
    if (!completeness.complete) {
      toast.error(`חסרים פרטים: ${completeness.missing.join(", ")}`);
      return;
    }
    try {
      await save({ silent: true, completed: true });
      if (userId) clearSupplierDraft(userId);
      toast.success("הפרופיל הושלם! ההרשמה בבדיקת אדמין");
      navigate(consumePendingReturnUrl() ?? "/supplier");
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

  const meta = step === "review" ? null : STEP_META[step];
  const StepIcon = meta?.icon ?? ClipboardCheck;

  return (
    <MobileShell>
      <div
        dir="rtl"
        className="relative min-h-[70vh]"
        style={{ background: "linear-gradient(180deg, #F3F7F5 0%, #F7F5F0 42%, #F7F5F0 100%)" }}
      >
        {/* Sticky wizard header */}
        <div className="sticky top-0 z-20 border-b border-[#0E6B5A]/10 bg-[#F7F5F0]/92 backdrop-blur-md px-4 pt-4 pb-3">
          <div className="flex items-start justify-between gap-3 mb-3">
            <div className="min-w-0">
              <p className="text-[11px] font-bold tracking-wide text-[#0E6B5A] uppercase">
                הרשמת ספק · שלב {stepIndex + 1} מתוך {WIZARD_STEPS.length}
              </p>
              <h1 className="text-[1.35rem] font-extrabold text-[#0B1220] leading-tight mt-0.5">
                {step === "review" ? "סיכום ובדיקה" : meta?.title}
              </h1>
            </div>
            <div className="shrink-0 rounded-2xl bg-white border border-[#E5E9EC] px-3 py-2 text-center shadow-[0_2px_10px_-6px_rgba(11,18,32,0.12)]">
              <div className="text-[15px] font-extrabold text-[#0E6B5A] leading-none">{completeness.percent}%</div>
              <div className="text-[10px] font-semibold text-muted-foreground mt-0.5">הושלם</div>
            </div>
          </div>

          <div className="h-2 rounded-full bg-[#E4EBE8] overflow-hidden mb-3">
            <div
              className="h-full rounded-full transition-all duration-500 ease-out"
              style={{
                width: `${Math.max(progressPercent, completeness.percent)}%`,
                background: "linear-gradient(90deg, #0E6B5A 0%, #34A88E 100%)",
              }}
            />
          </div>

          <div className="flex gap-1 overflow-x-auto pb-0.5 -mx-0.5 px-0.5 scrollbar-none">
            {WIZARD_STEPS.map((key, i) => {
              const done =
                key === "review"
                  ? completeness.complete
                  : key === "logo"
                    ? !!logoUrl
                    : Object.keys(validateStep(key)).length === 0;
              const active = key === step;
              const label = key === "review" ? "סיכום" : STEP_META[key].short;
              return (
                <button
                  key={key}
                  type="button"
                  onClick={() => {
                    // Allow jumping back freely; forward only if previous steps ok
                    if (i <= stepIndex || done) goToStep(key);
                    else toast.message("השלימו את השלב הנוכחי לפני המעבר");
                  }}
                  className={cn(
                    "shrink-0 inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-bold transition-all",
                    active && "bg-[#0E6B5A] text-white shadow-[0_6px_14px_-8px_rgba(14,107,90,0.55)]",
                    !active && done && "bg-[#0E6B5A]/12 text-[#0E6B5A]",
                    !active && !done && "bg-white text-[#6B7280] border border-[#E5E9EC]",
                  )}
                >
                  {done && !active ? <Check className="h-3 w-3" /> : <span>{i + 1}</span>}
                  {label}
                </button>
              );
            })}
          </div>
        </div>

        <div className="px-4 py-5 pb-44">
          <div
            key={step}
            className="rounded-[22px] bg-white border border-[#E8ECEF] shadow-[0_8px_28px_-18px_rgba(11,18,32,0.18)] overflow-hidden animate-fade-up"
          >
            <div className="px-4 pt-4 pb-3 border-b border-[#F0F2F4] flex items-start gap-3">
              <span className="h-11 w-11 rounded-2xl bg-[#0E6B5A]/10 text-[#0E6B5A] flex items-center justify-center shrink-0">
                <StepIcon className="h-5 w-5" />
              </span>
              <div className="min-w-0 pt-0.5">
                <h2 className="font-extrabold text-[#0B1220] text-[1.05rem] leading-tight">
                  {step === "review" ? "בדקו שהכל מלא לפני שליחה" : meta?.title}
                </h2>
                <p className="text-[13px] text-[#5B6472] mt-1 leading-relaxed">
                  {step === "review"
                    ? "זה הרגע לתקן טלפון, מיקום או תחומים שפספסתם"
                    : meta?.subtitle}
                </p>
              </div>
            </div>

            <div className="p-4 space-y-4">
              {step === "business" && (
                <>
                  <Field
                    label="שם העסק *"
                    error={attemptedContinue ? fieldErrors.businessName : undefined}
                    hint="השם שיופיע לדיירים בכרטיס הספק"
                  >
                    <Input
                      value={businessName}
                      onChange={(e) => setBusinessName(e.target.value)}
                      placeholder="לדוגמה: אלקטרו-חן בע״מ"
                      className={fieldClass(!!fieldErrors.businessName && attemptedContinue)}
                      autoFocus
                    />
                  </Field>
                  <Field
                    label="שם איש קשר *"
                    error={attemptedContinue ? fieldErrors.contactName : undefined}
                    hint="מי שאיתו דיירים ואדמין יכולים לדבר"
                  >
                    <Input
                      value={contactName}
                      onChange={(e) => setContactName(e.target.value)}
                      placeholder="השם המלא שלך"
                      className={fieldClass(!!fieldErrors.contactName && attemptedContinue)}
                    />
                  </Field>
                </>
              )}

              {step === "contact" && (
                <>
                  <Field
                    label="טלפון נייד *"
                    error={attemptedContinue ? fieldErrors.phone : undefined}
                    hint="מספר ישראלי עם קידומת — לדוגמה 050-1234567"
                  >
                    <div className="relative">
                      <Phone className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[#0E6B5A] pointer-events-none" />
                      <Input
                        type="tel"
                        inputMode="tel"
                        dir="ltr"
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                        placeholder="050-0000000"
                        className={cn(fieldClass(!!fieldErrors.phone && attemptedContinue), "pr-10 text-left")}
                        autoFocus
                      />
                    </div>
                  </Field>
                  <Field
                    label="אימייל עסקי *"
                    error={attemptedContinue ? fieldErrors.email : undefined}
                    hint="לעדכונים על פניות ואישור החשבון"
                  >
                    <div className="relative">
                      <Mail className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[#0E6B5A] pointer-events-none" />
                      <Input
                        type="email"
                        dir="ltr"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="you@business.com"
                        className={cn(fieldClass(!!fieldErrors.email && attemptedContinue), "pr-10 text-left")}
                      />
                    </div>
                  </Field>
                </>
              )}

              {step === "category" && (
                <>
                  <div className="rounded-2xl bg-[#0E6B5A]/8 border border-[#0E6B5A]/15 px-3.5 py-3 flex gap-2.5">
                    <Sparkles className="h-4 w-4 text-[#0E6B5A] shrink-0 mt-0.5" />
                    <p className="text-[13px] text-[#0B1220] leading-relaxed">
                      <span className="font-bold">טיפ חשוב: </span>
                      סמנו את <span className="font-bold">כל</span> התחומים שאתם עושים בפועל.
                      אם תפספסו תחום — דיירים שמחפשים אותו לא יראו אתכם.
                    </p>
                  </div>
                  {attemptedContinue && fieldErrors.categories && (
                    <ErrorBanner message={fieldErrors.categories} />
                  )}
                  <CategoryMultiPicker
                    categories={categories}
                    value={selectedCategories}
                    onChange={setSelectedCategories}
                    placeholder="חפשו תחום — למשל נגרות, מיזוג, צבע…"
                  />
                  {selectedCategories.length > 0 && (
                    <p className="text-[12px] font-semibold text-[#0E6B5A]">
                      נבחרו {selectedCategories.length} תחומים
                      {selectedCategories.length === 1 ? " · כדאי לבדוק אם יש עוד" : ""}
                    </p>
                  )}
                </>
              )}

              {step === "area" && (
                <>
                  <div className="rounded-2xl bg-[#F4F6FA] border border-[#E5E9EC] px-3.5 py-3 flex gap-2.5">
                    <MapPin className="h-4 w-4 text-[#0E6B5A] shrink-0 mt-0.5" />
                    <p className="text-[13px] text-[#5B6472] leading-relaxed">
                      בחרו ערים או אזורים שבהם אתם באמת מגיעים. אפשר גם לסמן ״כל הארץ״ אם אתם עובדים בכל הארץ.
                    </p>
                  </div>
                  {attemptedContinue && fieldErrors.areas && (
                    <ErrorBanner message={fieldErrors.areas} />
                  )}
                  <AreasCombobox value={areas} onChange={setAreas} />
                </>
              )}

              {step === "description" && (
                <>
                  <Field
                    label="תיאור קצר לעסק *"
                    error={attemptedContinue ? fieldErrors.shortDescription : undefined}
                    hint="יופיע לדיירים בכרטיס שלכם — כתבו מה אתם מציעים ומה מייחד אתכם"
                  >
                    <Textarea
                      rows={5}
                      value={shortDescription}
                      onChange={(e) => setShortDescription(e.target.value)}
                      placeholder="לדוגמה: מתקינים מערכות מיזוג לפרויקטי מגורים כבר 12 שנה, עם אחריות מלאה ושירות מהיר…"
                      maxLength={400}
                      className={cn(
                        "rounded-2xl text-[15px] min-h-[140px] resize-none",
                        attemptedContinue && fieldErrors.shortDescription && "border-red-400 focus-visible:ring-red-200",
                      )}
                      autoFocus
                    />
                  </Field>
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-[12px] text-muted-foreground" dir="ltr">
                      {shortDescription.length}/400
                    </p>
                    <div className="flex items-center gap-2">
                      {shortDescription.trim().length >= 5 ? (
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          disabled={aiLoading !== null}
                          onClick={() => runAiDescription("improve")}
                          className="h-9 rounded-xl text-[13px] font-bold border-[#0E6B5A]/30 text-[#0E6B5A] hover:bg-[#0E6B5A]/5"
                        >
                          {aiLoading === "improve" ? (
                            <Loader2 className="h-3.5 w-3.5 animate-spin ml-1.5" />
                          ) : (
                            <Sparkles className="h-3.5 w-3.5 ml-1.5" />
                          )}
                          שפר עם AI
                        </Button>
                      ) : (
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          disabled={aiLoading !== null || !businessName.trim()}
                          onClick={() => runAiDescription("generate")}
                          className="h-9 rounded-xl text-[13px] font-bold border-[#0E6B5A]/30 text-[#0E6B5A] hover:bg-[#0E6B5A]/5"
                        >
                          {aiLoading === "generate" ? (
                            <Loader2 className="h-3.5 w-3.5 animate-spin ml-1.5" />
                          ) : (
                            <Sparkles className="h-3.5 w-3.5 ml-1.5" />
                          )}
                          כתוב לי עם AI
                        </Button>
                      )}
                    </div>
                  </div>
                  <p className="text-[11px] text-muted-foreground leading-relaxed">
                    ה-AI מסתמך על שם העסק והתחומים שסימנתם. תמיד אפשר לערוך את הטקסט לאחר מכן.
                  </p>
                </>
              )}

              {step === "logo" && (
                <>
                  <div className="flex items-center gap-4">
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
                        className="w-full h-11 rounded-xl font-bold"
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
                  <p className="text-[13px] text-[#5B6472] leading-relaxed">
                    אפשר לדלג ולהמשיך בלי לוגו — אבל כדאי להוסיף אותו. זה מגביר אמון ומקבל יותר פניות.
                  </p>
                </>
              )}

              {step === "review" && (
                <ReviewPanel
                  businessName={businessName}
                  contactName={contactName}
                  phone={phone}
                  email={email}
                  categoryNames={categoryNames}
                  areas={areas}
                  shortDescription={shortDescription}
                  logoUrl={logoUrl}
                  missing={completeness.missing}
                  onEdit={(k) => goToStep(k)}
                />
              )}
            </div>
          </div>

          <p className="text-center text-[11px] text-muted-foreground mt-3">
            הטיוטה נשמרת אוטומטית — אפשר לסגור ולחזור מאוחר יותר
          </p>
        </div>

        {/* Sticky footer */}
        <div
          className="fixed inset-x-0 z-30 px-4 pb-3 pt-3 bg-gradient-to-t from-[#F7F5F0] via-[#F7F5F0] to-transparent"
          style={{ bottom: "calc(env(safe-area-inset-bottom) + var(--nav-h) + 8px)" }}
        >
          <div className="flex gap-2 max-w-lg mx-auto">
            {stepIndex > 0 && (
              <Button
                type="button"
                variant="outline"
                onClick={handleBack}
                disabled={saving}
                className="h-12 px-4 rounded-xl font-bold border-[#D7DEE3]"
              >
                <ArrowRight className="h-4 w-4 ml-1" />
                חזרה
              </Button>
            )}

            {step !== "review" ? (
              <Button
                type="button"
                onClick={handleContinue}
                disabled={saving}
                className="flex-1 h-12 rounded-xl text-[15px] font-extrabold bg-[#0E6B5A] hover:bg-[#0A5446] text-white flex items-center justify-center gap-2"
              >
                {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : (
                  <>
                    {step === "logo" ? "המשך לסיכום" : "שמור והמשך"}
                    <ArrowLeft className="h-4 w-4" />
                  </>
                )}
              </Button>
            ) : (
              <Button
                type="button"
                onClick={handleFinish}
                disabled={saving || !completeness.complete}
                className="flex-1 h-12 rounded-xl text-[15px] font-extrabold bg-[#0E6B5A] hover:bg-[#0A5446] disabled:opacity-60 text-white flex items-center justify-center gap-2"
              >
                {saving ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : completeness.complete ? (
                  <>
                    סיים ושלח לאישור
                    <Sparkles className="h-4 w-4" />
                  </>
                ) : (
                  `חסרים ${completeness.missing.length} פרטים`
                )}
              </Button>
            )}
          </div>
        </div>
      </div>

      <BottomNav role="supplier" />
    </MobileShell>
  );
}

function fieldClass(hasError: boolean) {
  return cn(
    "h-12 rounded-xl text-[15px] bg-[#FBFCFD] border-[#E5E9EC]",
    hasError && "border-red-400 focus-visible:ring-red-200",
  );
}

function Field({
  label,
  hint,
  error,
  children,
}: {
  label: string;
  hint?: string;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <Label className="text-[13px] font-bold text-[#0B1220]">{label}</Label>
      {children}
      {error ? (
        <p className="text-[12px] font-semibold text-red-600 flex items-center gap-1">
          <AlertCircle className="h-3.5 w-3.5" />
          {error}
        </p>
      ) : hint ? (
        <p className="text-[12px] text-muted-foreground">{hint}</p>
      ) : null}
    </div>
  );
}

function ErrorBanner({ message }: { message: string }) {
  return (
    <div className="rounded-xl bg-red-50 border border-red-200 px-3 py-2.5 text-[13px] font-semibold text-red-700 flex items-start gap-2">
      <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
      <span>{message}</span>
    </div>
  );
}

function ReviewPanel({
  businessName,
  contactName,
  phone,
  email,
  categoryNames,
  areas,
  shortDescription,
  logoUrl,
  missing,
  onEdit,
}: {
  businessName: string;
  contactName: string;
  phone: string;
  email: string;
  categoryNames: string[];
  areas: AreasComboboxValue;
  shortDescription: string;
  logoUrl: string | null;
  missing: string[];
  onEdit: (k: Exclude<StepKey, "review">) => void;
}) {
  const areaLabel = areas.servesAllCountry
    ? "כל הארץ"
    : [
        areas.regionIds.length ? `${areas.regionIds.length} אזורים` : null,
        areas.cityIds.length ? `${areas.cityIds.length} ערים` : null,
      ].filter(Boolean).join(" · ") || "לא נבחר";

  return (
    <div className="space-y-3">
      {missing.length > 0 && (
        <div className="rounded-2xl bg-amber-50 border border-amber-200 px-3.5 py-3">
          <p className="text-[13px] font-bold text-amber-900 mb-1">עדיין חסרים פרטים:</p>
          <ul className="text-[13px] text-amber-800 space-y-0.5 list-disc pr-4">
            {missing.map((m) => (
              <li key={m}>{m}</li>
            ))}
          </ul>
        </div>
      )}

      <ReviewRow
        icon={Briefcase}
        title="פרטי עסק"
        ok={businessName.trim().length >= 2 && contactName.trim().length >= 2}
        onEdit={() => onEdit("business")}
        lines={[businessName || "—", contactName ? `איש קשר: ${contactName}` : "חסר איש קשר"]}
      />
      <ReviewRow
        icon={Phone}
        title="פרטי קשר"
        ok={phoneDigits(phone).length >= 9 && isValidEmail(email)}
        onEdit={() => onEdit("contact")}
        lines={[phone || "חסר טלפון", email || "חסר אימייל"]}
      />
      <ReviewRow
        icon={Tag}
        title="תחומי פעילות"
        ok={categoryNames.length > 0}
        onEdit={() => onEdit("category")}
        lines={
          categoryNames.length
            ? [`${categoryNames.length} תחומים: ${categoryNames.slice(0, 4).join(" · ")}${categoryNames.length > 4 ? "…" : ""}`]
            : ["לא נבחרו תחומים"]
        }
      />
      <ReviewRow
        icon={MapPin}
        title="אזורי שירות"
        ok={areas.servesAllCountry || areas.regionIds.length > 0 || areas.cityIds.length > 0}
        onEdit={() => onEdit("area")}
        lines={[areaLabel]}
      />
      <ReviewRow
        icon={FileText}
        title="תיאור עסק"
        ok={shortDescription.trim().length >= 10}
        onEdit={() => onEdit("description")}
        lines={[shortDescription.trim() || "חסר תיאור"]}
      />
      <ReviewRow
        icon={ImageIcon}
        title="לוגו"
        ok={!!logoUrl}
        optional
        onEdit={() => onEdit("logo")}
        lines={[logoUrl ? "לוגו הועלה" : "בלי לוגו (מומלץ להוסיף)"]}
        trailing={
          <SupplierLogo name={businessName || "עסק"} logoUrl={logoUrl} size="sm" />
        }
      />

      {missing.length === 0 && (
        <div className="rounded-2xl bg-[#0E6B5A]/8 border border-[#0E6B5A]/15 px-3.5 py-3 flex gap-2.5">
          <UserRound className="h-4 w-4 text-[#0E6B5A] shrink-0 mt-0.5" />
          <p className="text-[13px] text-[#0B1220] leading-relaxed">
            הכל נראה מוכן. אחרי השליחה הפרופיל יעבור לבדיקת אדמין ואז תוכלו לקבל פניות.
          </p>
        </div>
      )}
    </div>
  );
}

function ReviewRow({
  icon: Icon,
  title,
  lines,
  ok,
  optional,
  onEdit,
  trailing,
}: {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  lines: string[];
  ok: boolean;
  optional?: boolean;
  onEdit: () => void;
  trailing?: React.ReactNode;
}) {
  return (
    <div className="rounded-2xl border border-[#E8ECEF] bg-[#FBFCFD] p-3 flex gap-3 items-start">
      <span
        className={cn(
          "h-9 w-9 rounded-xl flex items-center justify-center shrink-0",
          ok ? "bg-emerald-500 text-white" : optional ? "bg-[#E8ECEF] text-[#6B7280]" : "bg-amber-100 text-amber-700",
        )}
      >
        {ok ? <Check className="h-4 w-4" /> : <Icon className="h-4 w-4" />}
      </span>
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between gap-2">
          <span className="font-bold text-[13px] text-[#0B1220]">{title}</span>
          <button
            type="button"
            onClick={onEdit}
            className="text-[12px] font-bold text-[#0E6B5A] hover:underline"
          >
            עריכה
          </button>
        </div>
        {lines.map((line, i) => (
          <p key={i} className="text-[12px] text-[#5B6472] mt-0.5 truncate">
            {line}
          </p>
        ))}
      </div>
      {trailing}
    </div>
  );
}
