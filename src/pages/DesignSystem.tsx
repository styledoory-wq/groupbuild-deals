import { useState } from "react";
import { Plus, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  AppCard,
  ScreenHeader,
  SearchInput,
  StatusChip,
  EmptyState,
  StageBadge,
} from "@/components/ds";
import { STAGE_THEMES, STATUS_PRESETS } from "@/lib/designSystem";

/**
 * /design-system — living documentation for the app's design system.
 * Use these tokens & primitives across every screen. Don't reinvent.
 */
export default function DesignSystemPage() {
  const [q, setQ] = useState("");

  return (
    <div dir="rtl" className="min-h-screen w-full" style={{ background: "#F8F8F6" }}>
      <div className="mx-auto w-full max-w-[var(--app-max-w)] pb-24">
        <ScreenHeader
          title="מערכת העיצוב"
          subtitle="הבסיס הוויזואלי של כל המוצר — צבעים, רכיבים ואנימציות"
        />

        {/* Stage colors */}
        <Section title="צבעי שלבים" subtitle="צבע אחד לכל שלב, בכל האפליקציה">
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {STAGE_THEMES.map((s) => (
              <div
                key={s.id}
                className="rounded-[16px] p-3 flex flex-col gap-2"
                style={{ background: s.tint }}
              >
                <div
                  className="h-8 w-8 rounded-[10px]"
                  style={{ background: s.accent }}
                />
                <div>
                  <div className="text-[11px] font-bold" style={{ color: s.accent }}>
                    שלב {s.index}
                  </div>
                  <div className="text-[13px] font-extrabold text-[#1F2937]">
                    {s.title}
                  </div>
                  <div className="mt-1 text-[10px] font-mono text-[#6B7280]">
                    {s.accent}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </Section>

        {/* Cards */}
        <Section title="כרטיסים" subtitle="פינה 20px · צל רך · ללא border · scale(1.02) בלחיצה">
          <div className="px-5 grid grid-cols-2 gap-3">
            <AppCard to="/design-system">
              <p className="text-[13px] font-extrabold text-[#1F2937]">כרטיס רגיל</p>
              <p className="mt-1 text-[11px] font-medium text-[#6B7280]">לחיץ עם press</p>
            </AppCard>
            <AppCard variant="tinted" tint={STAGE_THEMES[2].tint} to="/design-system">
              <p className="text-[13px] font-extrabold text-[#1F2937]">כרטיס מתוייג</p>
              <p className="mt-1 text-[11px] font-medium text-[#6B7280]">רקע בגוון שלב</p>
            </AppCard>
            <AppCard variant="dim">
              <p className="text-[13px] font-extrabold text-[#1F2937]">כרטיס דהוי</p>
              <p className="mt-1 text-[11px] font-medium text-[#6B7280]">תוכן עתידי</p>
            </AppCard>
            <AppCard>
              <div className="flex items-center justify-between">
                <p className="text-[13px] font-extrabold text-[#1F2937]">עם תג</p>
                <StatusChip status="active" />
              </div>
            </AppCard>
          </div>
        </Section>

        {/* Headers */}
        <Section title="כותרות מסך" subtitle="שם גדול + תיאור קצר מתחת">
          <div className="bg-white rounded-[16px] mx-5">
            <ScreenHeader title="בנו את הבית שלכם" subtitle="כל הקטגוריות במקום אחד" />
          </div>
        </Section>

        {/* Search */}
        <Section title="שדה חיפוש" subtitle="זהה בכל האפליקציה">
          <SearchInput value={q} onChange={setQ} placeholder="חיפוש קטגוריה, ספק או אזור" />
        </Section>

        {/* Buttons */}
        <Section title="כפתורים" subtitle="Primary · Secondary · Danger">
          <div className="px-5 flex flex-wrap gap-2">
            <Button>פעולה ראשית</Button>
            <Button variant="outline">פעולה משנית</Button>
            <Button variant="destructive">מחיקה</Button>
            <Button variant="ghost">שקוף</Button>
          </div>
        </Section>

        {/* Status chips */}
        <Section title="תגיות סטטוס" subtitle="פעיל · בקרוב · הסתיים · ממתין">
          <div className="px-5 flex flex-wrap gap-2">
            {(Object.keys(STATUS_PRESETS) as (keyof typeof STATUS_PRESETS)[]).map((k) => (
              <StatusChip key={k} status={k} />
            ))}
          </div>
        </Section>

        {/* Stage badges */}
        <Section title="תגיות שלב">
          <div className="px-5 flex flex-wrap gap-2">
            {STAGE_THEMES.map((s) => (
              <StageBadge key={s.id} stage={s} />
            ))}
          </div>
        </Section>

        {/* Empty state */}
        <Section title="Empty State" subtitle="איור · כותרת · הסבר · פעולה">
          <div className="bg-white rounded-[20px] mx-5 shadow-[0_8px_20px_-10px_rgba(10,31,61,0.18)]">
            <EmptyState
              icon={<Sparkles className="h-7 w-7 text-[#C9A227]" />}
              title="עדיין אין כאן כלום"
              description="כשתפעלו במסך הזה, התוכן יופיע פה בצורה מסודרת."
              action={
                <Button>
                  <Plus className="h-4 w-4 ml-1" />
                  הוספה
                </Button>
              }
            />
          </div>
        </Section>

        {/* Motion */}
        <Section title="אנימציות" subtitle="180ms · cubic-bezier(0.4,0,0.2,1) · scale / fade / slide">
          <div className="px-5 grid grid-cols-3 gap-3">
            <Demo label="fade" cls="animate-fade-in" />
            <Demo label="scale" cls="animate-scale-in" />
            <Demo label="slide" cls="animate-slide-in-right" />
          </div>
        </Section>
      </div>
    </div>
  );
}

function Section({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="mt-6">
      <div className="px-5 mb-3">
        <h2 className="text-[15px] font-extrabold text-[#1F2937] tracking-tight">
          {title}
        </h2>
        {subtitle && (
          <p className="text-[11.5px] font-semibold text-[#6B7280] mt-0.5">{subtitle}</p>
        )}
      </div>
      {children}
    </section>
  );
}

function Demo({ label, cls }: { label: string; cls: string }) {
  return (
    <div
      className={`h-16 rounded-[16px] bg-white shadow-[0_8px_20px_-10px_rgba(10,31,61,0.18)] flex items-center justify-center text-[12px] font-bold text-[#1F2937] ${cls}`}
    >
      {label}
    </div>
  );
}
