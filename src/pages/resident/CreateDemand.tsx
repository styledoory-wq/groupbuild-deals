import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { ChevronRight, ChevronLeft, Check, Home, Building2, Users2, Map, PencilLine, ClipboardList, MapPin, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useApp } from "@/store/AppStore";
import { BackHeader, LoadingState } from "@/components/ds";
import { useRegions } from "@/hooks/useRegions";
import { PROJECT_TYPES } from "@/lib/demandStatus";

interface Category { id: string; name: string }

const PROJECT_TYPE_ICONS: Record<string, typeof Home> = {
  private_home: Home,
  renovation: PencilLine,
  house_committee: Users2,
  building: Building2,
  neighborhood: Map,
};

const DRAFT_KEY = "gb:create-demand:draft:v1";

type Draft = {
  step: number;
  projectType: string;
  categoryId: string;
  subTopic: string;
  regionId: string;
  cityId: string;
  address: string;
  description: string;
  participants: string;
};

function readDraft(): Partial<Draft> {
  try {
    return JSON.parse(localStorage.getItem(DRAFT_KEY) || "{}") as Partial<Draft>;
  } catch {
    return {};
  }
}

const STEPS = [
  { id: 1, label: "סוג פרויקט" },
  { id: 2, label: "תחום" },
  { id: 3, label: "אזור" },
  { id: 4, label: "תיאור" },
  { id: 5, label: "סיכום" },
];

export default function CreateDemand() {
  const navigate = useNavigate();
  const { user, authReady } = useApp();
  const { regions, cities, loading: areasLoading } = useRegions();
  const draft = useRef<Partial<Draft>>(readDraft()).current;
  const [step, setStep] = useState(draft.step ?? 1);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const submitted = useRef(false);

  // Form — restored from the local draft so a refresh, an app switch or a
  // temporary bounce to sign-in never loses what the user typed.
  const [projectType, setProjectType] = useState<string>(draft.projectType ?? "");
  const [categoryId, setCategoryId] = useState<string>(draft.categoryId ?? "");
  const [subTopic, setSubTopic] = useState<string>(draft.subTopic ?? "");
  const [regionId, setRegionId] = useState<string>(draft.regionId ?? "");
  const [cityId, setCityId] = useState<string>(draft.cityId ?? "");
  const [address, setAddress] = useState<string>(draft.address ?? "");
  const [description, setDescription] = useState<string>(draft.description ?? "");
  const [participants, setParticipants] = useState<string>(draft.participants ?? "1");

  const [categories, setCategories] = useState<Category[]>([]);
  const [userProjectId, setUserProjectId] = useState<string | null>(null);

  // Persist the draft on every change (skipped once the request was sent).
  useEffect(() => {
    if (submitted.current) return;
    const payload: Draft = { step, projectType, categoryId, subTopic, regionId, cityId, address, description, participants };
    try { localStorage.setItem(DRAFT_KEY, JSON.stringify(payload)); } catch { /* quota / private mode */ }
  }, [step, projectType, categoryId, subTopic, regionId, cityId, address, description, participants]);

  useEffect(() => {
    // Access control lives in RequireRole — this screen must never navigate
    // away on its own while auth is still hydrating (it would drop the form).
    if (!authReady) return;
    if (!user?.id) { setLoading(false); return; }
    (async () => {
      const [{ data: cats }, { data: prof }] = await Promise.all([
        supabase.from("categories").select("id,name").eq("is_active", true).order("display_order").order("name"),
        supabase.from("profiles").select("project_id,region_id,city_id").eq("id", user.id).maybeSingle(),
      ]);
      setCategories((cats ?? []) as Category[]);
      const p = prof as { project_id?: string | null; region_id?: string | null; city_id?: string | null } | null;
      if (p?.project_id) setUserProjectId(p.project_id);
      if (p?.region_id && !draft.regionId) setRegionId(p.region_id);
      if (p?.city_id && !draft.cityId) setCityId(p.city_id);
      setLoading(false);
    })();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authReady, user?.id]);

  const filteredCities = useMemo(
    () => regionId ? cities.filter((c) => c.region_id === regionId) : cities,
    [cities, regionId],
  );

  const canNext = useMemo(() => {
    if (step === 1) return !!projectType;
    if (step === 2) return !!categoryId;
    if (step === 3) return !!regionId && !!cityId;
    if (step === 4) return description.trim().length >= 10;
    return true;
  }, [step, projectType, categoryId, regionId, cityId, description]);

  const nextStep = () => {
    if (!canNext) {
      if (step === 4) toast.error("נא לתאר את הבקשה (לפחות 10 תווים)");
      else toast.error("נא למלא את כל השדות");
      return;
    }
    setStep((s) => Math.min(5, s + 1));
  };
  const prevStep = () => setStep((s) => Math.max(1, s - 1));

  const handleSubmit = async () => {
    if (!user?.id) return;
    setSubmitting(true);
    try {
      const parts = Math.max(1, parseInt(participants, 10) || 1);
      const fullDescription = [
        description.trim(),
        subTopic.trim() ? `תת-תחום: ${subTopic.trim()}` : "",
        address.trim() ? `כתובת: ${address.trim()}` : "",
      ].filter(Boolean).join("\n\n");

      const { data, error } = await supabase.from("demand_requests").insert({
        resident_user_id: user.id,
        category_id: categoryId,
        region_id: regionId || null,
        city_id: cityId || null,
        project_id: userProjectId,
        project_type: projectType,
        description: fullDescription,
        participants_count: parts,
        status: "open",
        admin_status: "new",
      }).select("id").single();
      if (error) throw error;

      // Fire-and-forget activity log
      supabase.from("demand_activity_log").insert({
        demand_id: (data as { id: string }).id,
        actor_id: user.id,
        action: "created",
        payload: { project_type: projectType, category_id: categoryId },
      }).then(() => { /* noop */ }, () => { /* noop */ });

      submitted.current = true;
      try { localStorage.removeItem(DRAFT_KEY); } catch { /* ignore */ }
      toast.success("הבקשה נשלחה בהצלחה!");
      navigate("/resident/demands?created=1", { replace: true });
    } catch (err) {
      console.error(err);
      toast.error("שגיאה בשליחת הבקשה. נסה שוב.");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading || areasLoading) {
    return <div className="min-h-screen bg-[#F7F6F2]"><LoadingState /></div>;
  }

  const selectedCategory = categories.find((c) => c.id === categoryId);
  const selectedRegion = regions.find((r) => r.id === regionId);
  const selectedCity = cities.find((c) => c.id === cityId);
  const selectedType = PROJECT_TYPES.find((t) => t.value === projectType);

  return (
    <div className="min-h-screen bg-[#F7F6F2] pb-32" dir="rtl">
      <BackHeader title="בקשת רכישה קבוצתית" backTo="/resident" />

      {/* Progress */}
      <div className="px-5 pt-4">
        <div className="flex items-center justify-between mb-2">
          {STEPS.map((s) => (
            <div key={s.id} className="flex flex-col items-center flex-1">
              <div className={`h-8 w-8 rounded-full flex items-center justify-center text-[12px] font-bold border-2 transition-colors ${
                step > s.id ? "bg-[#0E6B5A] border-[#0E6B5A] text-white"
                : step === s.id ? "bg-white border-[#0E6B5A] text-[#0E6B5A]"
                : "bg-white border-[#E5E5EA] text-[#8E8E93]"
              }`}>
                {step > s.id ? <Check className="h-4 w-4" strokeWidth={3} /> : s.id}
              </div>
              <div className={`text-[10px] mt-1 text-center leading-tight ${step === s.id ? "text-[#0E6B5A] font-semibold" : "text-[#8E8E93]"}`}>
                {s.label}
              </div>
            </div>
          ))}
        </div>
        <div className="h-1 bg-[#E5E5EA] rounded-full overflow-hidden">
          <div className="h-full bg-[#0E6B5A] transition-all" style={{ width: `${(step / STEPS.length) * 100}%` }} />
        </div>
      </div>

      <div className="px-5 mt-6">
        {/* Step 1: project type */}
        {step === 1 && (
          <section>
            <h2 className="text-[18px] font-bold text-[#1C1C1E] mb-1">איזה סוג פרויקט?</h2>
            <p className="text-[13px] text-[#8E8E93] mb-4">בחר את הסוג שהכי מתאים לבקשה שלך</p>
            <div className="grid grid-cols-2 gap-3">
              {PROJECT_TYPES.map((t) => {
                const Icon = PROJECT_TYPE_ICONS[t.value] ?? Home;
                const active = projectType === t.value;
                return (
                  <button
                    key={t.value}
                    onClick={() => setProjectType(t.value)}
                    className={`p-4 rounded-2xl border-2 text-right transition ${active ? "border-[#0E6B5A] bg-[#0E6B5A]/5" : "border-[#E5E5EA] bg-white"}`}
                  >
                    <div className={`h-10 w-10 rounded-xl flex items-center justify-center mb-2 ${active ? "bg-[#0E6B5A] text-white" : "bg-[#F7F5F0] text-[#8E8E93]"}`}>
                      <Icon className="h-5 w-5" strokeWidth={2.2} />
                    </div>
                    <div className="text-[14px] font-semibold text-[#1C1C1E]">{t.label}</div>
                  </button>
                );
              })}
            </div>
          </section>
        )}

        {/* Step 2: category */}
        {step === 2 && (
          <section>
            <h2 className="text-[18px] font-bold text-[#1C1C1E] mb-1">מה התחום?</h2>
            <p className="text-[13px] text-[#8E8E93] mb-4">בחר את התחום העיקרי של הבקשה</p>
            <div className="space-y-2 mb-5">
              {categories.map((c) => {
                const active = categoryId === c.id;
                return (
                  <button
                    key={c.id}
                    onClick={() => setCategoryId(c.id)}
                    className={`w-full p-3 rounded-xl border-2 text-right transition flex items-center justify-between ${active ? "border-[#0E6B5A] bg-[#0E6B5A]/5" : "border-[#E5E5EA] bg-white"}`}
                  >
                    <span className="text-[14px] font-medium text-[#1C1C1E]">{c.name}</span>
                    {active && <Check className="h-4 w-4 text-[#0E6B5A]" strokeWidth={3} />}
                  </button>
                );
              })}
            </div>
            <label className="block">
              <span className="text-[13px] font-medium text-[#1C1C1E] mb-1.5 block">תת-תחום (אופציונלי)</span>
              <input
                value={subTopic}
                onChange={(e) => setSubTopic(e.target.value)}
                enterKeyHint="next"
                placeholder="לדוגמה: ריצוף גרניט פורצלן"
                className="w-full h-11 px-3 rounded-xl border border-[#E5E5EA] bg-white text-[14px]"
                maxLength={100}
              />
            </label>
          </section>
        )}

        {/* Step 3: area */}
        {step === 3 && (
          <section>
            <h2 className="text-[18px] font-bold text-[#1C1C1E] mb-1">איפה זה?</h2>
            <p className="text-[13px] text-[#8E8E93] mb-4">בחר אזור ועיר לביצוע העבודה</p>
            <label className="block mb-3">
              <span className="text-[13px] font-medium text-[#1C1C1E] mb-1.5 block">אזור</span>
              <select
                value={regionId}
                onChange={(e) => { setRegionId(e.target.value); setCityId(""); }}
                className="w-full h-11 px-3 rounded-xl border border-[#E5E5EA] bg-white text-[14px]"
              >
                <option value="">בחר אזור</option>
                {regions.map((r) => <option key={r.id} value={r.id}>{r.name_he}</option>)}
              </select>
            </label>
            <label className="block mb-3">
              <span className="text-[13px] font-medium text-[#1C1C1E] mb-1.5 block">עיר</span>
              <select
                value={cityId}
                onChange={(e) => setCityId(e.target.value)}
                disabled={!regionId}
                className="w-full h-11 px-3 rounded-xl border border-[#E5E5EA] bg-white text-[14px] disabled:opacity-50"
              >
                <option value="">בחר עיר</option>
                {filteredCities.map((c) => <option key={c.id} value={c.id}>{c.name_he}</option>)}
              </select>
            </label>
            <label className="block">
              <span className="text-[13px] font-medium text-[#1C1C1E] mb-1.5 block">כתובת (אופציונלי)</span>
              <input
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                autoComplete="street-address"
                enterKeyHint="next"
                placeholder="רחוב, מספר בית"
                className="w-full h-11 px-3 rounded-xl border border-[#E5E5EA] bg-white text-[14px]"
                maxLength={150}
              />
            </label>
          </section>
        )}

        {/* Step 4: description */}
        {step === 4 && (
          <section>
            <h2 className="text-[18px] font-bold text-[#1C1C1E] mb-1">ספר לנו על הבקשה</h2>
            <p className="text-[13px] text-[#8E8E93] mb-4">כמה שתפרט יותר, נוכל להתאים לך ספקים טובים יותר</p>
            <label className="block mb-4">
              <span className="text-[13px] font-medium text-[#1C1C1E] mb-1.5 block">תיאור הבקשה</span>
              <textarea
                enterKeyHint="enter"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="לדוגמה: אנחנו 12 דיירים בבניין מחפשים חברת ניקיון לחדר מדרגות, פעם בשבוע..."
                rows={6}
                className="w-full p-3 rounded-xl border border-[#E5E5EA] bg-white text-[14px] resize-none"
                maxLength={2000}
              />
              <div className="text-[11px] text-[#8E8E93] mt-1 text-left">{description.length}/2000</div>
            </label>
            <label className="block mb-4">
              <span className="text-[13px] font-medium text-[#1C1C1E] mb-1.5 block">מספר משתתפים משוער</span>
              <input
                type="number"
                inputMode="numeric"
                enterKeyHint="done"
                min={1}
                value={participants}
                onChange={(e) => setParticipants(e.target.value)}
                className="w-full h-11 px-3 rounded-xl border border-[#E5E5EA] bg-white text-[14px]"
              />
            </label>
            <div className="p-3 rounded-xl bg-[#F7F5F0] border border-[#E5E5EA] text-[12px] text-[#8E8E93] leading-relaxed">
              <ClipboardList className="h-4 w-4 inline ml-1 text-[#0E6B5A]" />
              העלאת תמונות ומסמכים תהיה זמינה בקרוב. בינתיים אפשר לפרט בשדה התיאור.
            </div>
          </section>
        )}

        {/* Step 5: summary */}
        {step === 5 && (
          <section>
            <h2 className="text-[18px] font-bold text-[#1C1C1E] mb-1">סיכום ושליחה</h2>
            <p className="text-[13px] text-[#8E8E93] mb-4">בדוק את הפרטים לפני השליחה</p>
            <div className="bg-white rounded-2xl border border-[#E5E5EA] divide-y divide-[#E5E5EA]">
              <SummaryRow label="סוג פרויקט" value={selectedType?.label ?? "—"} />
              <SummaryRow label="תחום" value={selectedCategory?.name ?? "—"} />
              {subTopic && <SummaryRow label="תת-תחום" value={subTopic} />}
              <SummaryRow label="אזור" value={selectedRegion?.name_he ?? "—"} />
              <SummaryRow label="עיר" value={selectedCity?.name_he ?? "—"} />
              {address && <SummaryRow label="כתובת" value={address} />}
              <SummaryRow label="משתתפים" value={String(Math.max(1, parseInt(participants, 10) || 1))} />
              <div className="p-3">
                <div className="text-[12px] text-[#8E8E93] mb-1">תיאור</div>
                <div className="text-[13px] text-[#1C1C1E] whitespace-pre-wrap">{description}</div>
              </div>
            </div>
            <div className="mt-4 p-3 rounded-xl bg-[#0E6B5A]/5 border border-[#0E6B5A]/20 text-[12px] text-[#0E6B5A] leading-relaxed">
              <MapPin className="h-4 w-4 inline ml-1" />
              לאחר השליחה, צוות GroupBuild יבחן את הבקשה ויתחיל בחיפוש ספקים מתאימים. תקבל עדכון על כל שינוי בסטטוס.
            </div>
          </section>
        )}
      </div>

      {/* Sticky footer */}
      <div className="fixed bottom-0 inset-x-0 bg-white border-t border-[#E5E5EA] p-3 flex gap-2 pb-[calc(env(safe-area-inset-bottom)+0.75rem)]" dir="rtl">
        {step > 1 && (
          <button
            onClick={prevStep}
            disabled={submitting}
            className="h-12 px-4 rounded-xl border border-[#E5E5EA] bg-white text-[#1C1C1E] text-[14px] font-medium inline-flex items-center gap-1"
          >
            <ChevronRight className="h-4 w-4" /> חזרה
          </button>
        )}
        {step < 5 ? (
          <button
            onClick={nextStep}
            className="flex-1 h-12 rounded-xl bg-[#0E6B5A] text-white text-[14px] font-semibold inline-flex items-center justify-center gap-1 disabled:opacity-50"
          >
            המשך <ChevronLeft className="h-4 w-4" />
          </button>
        ) : (
          <button
            onClick={handleSubmit}
            disabled={submitting}
            className="flex-1 h-12 rounded-xl bg-[#0E6B5A] text-white text-[14px] font-semibold inline-flex items-center justify-center gap-2 disabled:opacity-50"
          >
            {submitting ? <><Loader2 className="h-4 w-4 animate-spin" /> שולח...</> : <>שלח בקשה <Check className="h-4 w-4" strokeWidth={3} /></>}
          </button>
        )}
      </div>
    </div>
  );
}

function SummaryRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="p-3 flex items-center justify-between gap-3">
      <span className="text-[12px] text-[#8E8E93]">{label}</span>
      <span className="text-[13px] font-medium text-[#1C1C1E] text-left truncate">{value}</span>
    </div>
  );
}
