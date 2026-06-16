import { useState } from "react";
import { Home, Hammer, DoorOpen, Wrench, RefreshCw } from "lucide-react";
import { MobileShell } from "@/components/layout/MobileShell";
import { BottomNav } from "@/components/layout/BottomNav";
import { PageHeader } from "@/components/layout/PageHeader";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { BudgetResultView } from "@/components/budget/BudgetResultView";
import { BudgetAIChat } from "@/components/budget/BudgetAIChat";
import { MatchingDeals } from "@/components/budget/MatchingDeals";
import {
  Track, FinishLevel, Region, RenovationType, RoomKind, ServiceKind,
  REGION_LABELS, FINISH_LABELS, RENO_LABELS, ROOM_LABELS, SERVICES,
  BudgetResult, calcNewBuild, calcFullReno, calcSingleRoom, calcSingleService,
} from "@/lib/budgetPricing";

const TRACKS: { key: Track; label: string; desc: string; icon: typeof Home; tint: string; accent: string; ring: string }[] = [
  { key: "new_build",       label: "בנייה חדשה",       desc: "וילה / בית פרטי מהיסוד",          icon: Home,   tint: "#EEF4FF", accent: "#2563EB", ring: "rgba(37,99,235,0.18)" },
  { key: "full_renovation", label: "שיפוץ בית מלא",     desc: "שיפוץ דירה / בית קיים",            icon: Hammer, tint: "#FFF5EB", accent: "#E8742C", ring: "rgba(232,116,44,0.18)" },
  { key: "single_room",     label: "שיפוץ חדר בודד",    desc: "מטבח / אמבטיה / סלון ועוד",        icon: DoorOpen, tint: "#F0FDF4", accent: "#16A34A", ring: "rgba(22,163,74,0.18)" },
  { key: "single_service",  label: "שירות בודד",        desc: "דלתות / ריצוף / מיזוג ועוד",       icon: Wrench, tint: "#F5F3FF", accent: "#7C3AED", ring: "rgba(124,58,237,0.18)" },
];

const finishOptions: FinishLevel[] = ["basic", "standard", "premium", "luxury"];
const regionOptions: Region[] = ["north", "haifa", "sharon", "center", "jerusalem", "south"];

const FIELD_LABEL = "block text-[11.5px] font-extrabold text-[#6B7280] mb-1.5 tracking-wide";
const FIELD_INPUT = "h-12 bg-white border border-[#E5E7EB] rounded-xl text-[14px] font-bold text-[#1F2937] text-right shadow-[0_1px_2px_rgba(31,41,55,0.04)] focus-visible:ring-2 focus-visible:ring-offset-0 focus-visible:ring-[#C9A227]/30 focus-visible:border-[#C9A227]";
const FIELD_TRIGGER = "h-12 bg-white border border-[#E5E7EB] rounded-xl text-[14px] font-bold text-[#1F2937] shadow-[0_1px_2px_rgba(31,41,55,0.04)] focus:ring-2 focus:ring-[#C9A227]/30";

function FieldGrid({ children }: { children: React.ReactNode }) {
  return <div className="grid grid-cols-2 gap-3">{children}</div>;
}

function FinishSelect({ value, onChange }: { value: FinishLevel; onChange: (v: FinishLevel) => void }) {
  return (
    <div>
      <Label className={FIELD_LABEL} style={{ fontFamily: "'Urbanist'" }}>רמת גמר</Label>
      <Select value={value} onValueChange={(v) => onChange(v as FinishLevel)}>
        <SelectTrigger className={FIELD_TRIGGER}><SelectValue /></SelectTrigger>
        <SelectContent>
          {finishOptions.map((f) => <SelectItem key={f} value={f}>{FINISH_LABELS[f]}</SelectItem>)}
        </SelectContent>
      </Select>
    </div>
  );
}
function RegionSelect({ value, onChange }: { value: Region; onChange: (v: Region) => void }) {
  return (
    <div>
      <Label className={FIELD_LABEL} style={{ fontFamily: "'Urbanist'" }}>אזור בארץ</Label>
      <Select value={value} onValueChange={(v) => onChange(v as Region)}>
        <SelectTrigger className={FIELD_TRIGGER}><SelectValue /></SelectTrigger>
        <SelectContent>
          {regionOptions.map((r) => <SelectItem key={r} value={r}>{REGION_LABELS[r]}</SelectItem>)}
        </SelectContent>
      </Select>
    </div>
  );
}

export default function BudgetPlanner() {
  const [track, setTrack] = useState<Track | null>(null);
  const [result, setResult] = useState<BudgetResult | null>(null);

  // Shared
  const [region, setRegion] = useState<Region>("center");
  const [finish, setFinish] = useState<FinishLevel>("standard");

  // Track 1
  const [builtSqm, setBuiltSqm] = useState(180);
  const [floors, setFloors] = useState(1);
  const [basement, setBasement] = useState(false);
  const [safeRoom, setSafeRoom] = useState(true);

  // Track 2
  const [renoSqm, setRenoSqm] = useState(100);
  const [renoType, setRenoType] = useState<RenovationType>("medium");
  const [renoFlags, setRenoFlags] = useState({ infra: false, flooring: true, kitchen: true, doors: false, windows: false });

  // Track 3
  const [room, setRoom] = useState<RoomKind>("kitchen");
  const [roomSize, setRoomSize] = useState(18);
  const [replacePlumbing, setReplacePlumbing] = useState(false);
  const [newFurniture, setNewFurniture] = useState(false);

  // Track 4
  const [svc, setSvc] = useState<ServiceKind>("interior_doors");
  const [qty, setQty] = useState(5);

  const reset = () => { setTrack(null); setResult(null); };

  const calculate = () => {
    if (track === "new_build") {
      setResult(calcNewBuild({ builtSqm, floors, basement, safeRoom, region, finish }));
    } else if (track === "full_renovation") {
      setResult(calcFullReno({ sqm: renoSqm, type: renoType, ...renoFlags, region, finish }));
    } else if (track === "single_room") {
      setResult(calcSingleRoom({ room, sizeSqm: roomSize, finish, region, replacePlumbing, newFurniture }));
    } else if (track === "single_service") {
      setResult(calcSingleService({ service: svc, quantity: qty, finish, region }));
    }
    requestAnimationFrame(() => {
      document.getElementById("budget-result")?.scrollIntoView({ behavior: "smooth", block: "start" });
    });
  };

  const svcDef = SERVICES.find((s) => s.key === svc)!;

  return (
    <MobileShell>
      <div style={{ background: "#F8F8F6", fontFamily: "'Epilogue', system-ui, sans-serif" }}>
      <PageHeader title="מחשבון תקציב מקצועי" subtitle="הערכת עלות מדויקת ב-4 מסלולים — עם יועץ AI ועסקאות מתאימות" />
      <div className="px-5 pb-28 space-y-5">

        {!track && (
          <div className="space-y-3">
            <div className="text-[13px] font-bold text-[#1F2937]" style={{ fontFamily: "'Urbanist'" }}>בחר מסלול</div>
            <div className="grid grid-cols-2 gap-3">
              {TRACKS.map((t) => {
                const Icon = t.icon;
                return (
                  <button
                    key={t.key}
                    onClick={() => { setTrack(t.key); setResult(null); }}
                    className="rounded-2xl p-4 text-right transition active:scale-[0.98] flex flex-col gap-2.5 min-h-[140px]"
                    style={{ background: t.tint, boxShadow: `0 6px 18px -10px ${t.ring}, inset 0 0 0 1px ${t.ring}` }}
                  >
                    <div className="h-11 w-11 rounded-xl flex items-center justify-center shrink-0" style={{ background: "#FFFFFF", boxShadow: `0 4px 10px -4px ${t.ring}` }}>
                      <Icon className="h-5 w-5" strokeWidth={2.2} style={{ color: t.accent }} />
                    </div>
                    <div className="font-extrabold text-[14px] text-[#1F2937] leading-tight" style={{ fontFamily: "'Urbanist'" }}>{t.label}</div>
                    <div className="text-[11px] text-[#6B7280] leading-snug">{t.desc}</div>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {track && (() => {
          const theme = TRACKS.find((t) => t.key === track)!;
          return (
          <>
            <div className="flex items-center justify-between">
              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-[12px] font-extrabold" style={{ background: theme.tint, color: theme.accent, fontFamily: "'Urbanist'" }}>
                <span className="h-2 w-2 rounded-full" style={{ background: theme.accent }} />
                {theme.label}
              </div>
              <button onClick={reset} className="text-[12px] text-[#6B7280] flex items-center gap-1 hover:text-[#1F2937] bg-white border border-[#E5E7EB] rounded-full px-3 py-1.5 shadow-sm">
                <RefreshCw className="h-3.5 w-3.5" /> החלף מסלול
              </button>
            </div>

            <div className="bg-white rounded-3xl p-5 border border-[#E5E7EB] shadow-[0_4px_20px_-12px_rgba(31,41,55,0.12)] space-y-4">
              {(() => {
                const SwitchRow = ({ label, checked, onChange }: { label: string; checked: boolean; onChange: (v: boolean) => void }) => (
                  <button
                    type="button"
                    onClick={() => onChange(!checked)}
                    className="w-full flex items-center justify-between bg-[#F8F8F6] border border-[#E5E7EB] rounded-xl p-3.5 hover:border-[#D1D5DB] transition text-right"
                  >
                    <span className="text-[13.5px] font-bold text-[#1F2937]">{label}</span>
                    <Switch
                      checked={checked}
                      onCheckedChange={onChange}
                      className="data-[state=checked]:bg-[#C9A227] data-[state=unchecked]:bg-[#E5E7EB]"
                    />
                  </button>
                );

                return (
                  <>
              {track === "new_build" && (
                <>
                  <FieldGrid>
                    <div>
                      <Label className={FIELD_LABEL} style={{ fontFamily: "'Urbanist'" }}>שטח בנוי (מ"ר)</Label>
                      <Input type="number" min={40} value={builtSqm} onChange={(e) => setBuiltSqm(+e.target.value)} className={FIELD_INPUT} />
                    </div>
                    <div>
                      <Label className={FIELD_LABEL} style={{ fontFamily: "'Urbanist'" }}>מספר קומות</Label>
                      <Input type="number" min={1} max={5} value={floors} onChange={(e) => setFloors(+e.target.value)} className={FIELD_INPUT} />
                    </div>
                    <FinishSelect value={finish} onChange={setFinish} />
                    <RegionSelect value={region} onChange={setRegion} />
                  </FieldGrid>
                  <SwitchRow label="מרתף" checked={basement} onChange={setBasement} />
                  <SwitchRow label={'ממ"ד'} checked={safeRoom} onChange={setSafeRoom} />
                </>
              )}

              {track === "full_renovation" && (
                <>
                  <FieldGrid>
                    <div>
                      <Label className={FIELD_LABEL} style={{ fontFamily: "'Urbanist'" }}>גודל הבית (מ"ר)</Label>
                      <Input type="number" min={30} value={renoSqm} onChange={(e) => setRenoSqm(+e.target.value)} className={FIELD_INPUT} />
                    </div>
                    <div>
                      <Label className={FIELD_LABEL} style={{ fontFamily: "'Urbanist'" }}>סוג שיפוץ</Label>
                      <Select value={renoType} onValueChange={(v) => setRenoType(v as RenovationType)}>
                        <SelectTrigger className={FIELD_TRIGGER}><SelectValue /></SelectTrigger>
                        <SelectContent>
                          {(Object.keys(RENO_LABELS) as RenovationType[]).map((r) => (
                            <SelectItem key={r} value={r}>{RENO_LABELS[r]}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <FinishSelect value={finish} onChange={setFinish} />
                    <RegionSelect value={region} onChange={setRegion} />
                  </FieldGrid>
                  {([
                    ["infra", "החלפת תשתיות"],
                    ["flooring", "החלפת ריצוף"],
                    ["kitchen", "מטבח חדש"],
                    ["doors", "החלפת דלתות"],
                    ["windows", "החלפת חלונות"],
                  ] as const).map(([key, label]) => (
                    <SwitchRow key={key} label={label} checked={renoFlags[key]} onChange={(v) => setRenoFlags({ ...renoFlags, [key]: v })} />
                  ))}
                </>
              )}

              {track === "single_room" && (
                <>
                  <FieldGrid>
                    <div>
                      <Label className={FIELD_LABEL} style={{ fontFamily: "'Urbanist'" }}>חדר</Label>
                      <Select value={room} onValueChange={(v) => setRoom(v as RoomKind)}>
                        <SelectTrigger className={FIELD_TRIGGER}><SelectValue /></SelectTrigger>
                        <SelectContent>
                          {(Object.keys(ROOM_LABELS) as RoomKind[]).map((r) => (
                            <SelectItem key={r} value={r}>{ROOM_LABELS[r]}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label className={FIELD_LABEL} style={{ fontFamily: "'Urbanist'" }}>גודל החדר (מ"ר)</Label>
                      <Input type="number" min={2} value={roomSize} onChange={(e) => setRoomSize(+e.target.value)} className={FIELD_INPUT} />
                    </div>
                    <FinishSelect value={finish} onChange={setFinish} />
                    <RegionSelect value={region} onChange={setRegion} />
                  </FieldGrid>
                  {["kitchen", "bathroom", "toilet"].includes(room) && (
                    <SwitchRow label="החלפת תשתיות אינסטלציה" checked={replacePlumbing} onChange={setReplacePlumbing} />
                  )}
                  {["kitchen", "living", "bedroom"].includes(room) && (
                    <SwitchRow label="ריהוט חדש" checked={newFurniture} onChange={setNewFurniture} />
                  )}
                </>
              )}

              {track === "single_service" && (
                <>
                  <FieldGrid>
                    <div className="col-span-2">
                      <Label className={FIELD_LABEL} style={{ fontFamily: "'Urbanist'" }}>בחר שירות</Label>
                      <Select value={svc} onValueChange={(v) => setSvc(v as ServiceKind)}>
                        <SelectTrigger className={FIELD_TRIGGER}><SelectValue /></SelectTrigger>
                        <SelectContent>
                          {SERVICES.map((s) => <SelectItem key={s.key} value={s.key}>{s.label}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label className={FIELD_LABEL} style={{ fontFamily: "'Urbanist'" }}>כמות ({svcDef.unitLabel})</Label>
                      <Input
                        type="number"
                        min={1}
                        step={svcDef.unit === "sqm" ? "1" : "1"}
                        value={qty}
                        onChange={(e) => setQty(+e.target.value)}
                        className={FIELD_INPUT}
                      />
                    </div>
                    <FinishSelect value={finish} onChange={setFinish} />
                    <div className="col-span-2"><RegionSelect value={region} onChange={setRegion} /></div>
                  </FieldGrid>
                </>
              )}

              <button
                onClick={calculate}
                className="w-full h-14 rounded-2xl text-white font-extrabold text-[15px] active:scale-[0.99] transition-transform"
                style={{
                  fontFamily: "'Urbanist'",
                  background: `linear-gradient(135deg, ${theme.accent} 0%, ${theme.accent}E0 100%)`,
                  boxShadow: `0 14px 28px -10px ${theme.ring}, inset 0 1px 0 rgba(255,255,255,0.25)`,
                }}
              >
                חשב תקציב
              </button>
                  </>
                );
              })()}
            </div>
          </>
          );
        })()}

        {result && (
          <div id="budget-result" className="space-y-5">
            <BudgetResultView result={result} />
            <MatchingDeals result={result} />
            <BudgetAIChat result={result} />
          </div>
        )}

        {!track && (
          <p className="text-[11px] text-[#9CA3AF] text-center pt-4">
            כל החישובים מבוססים טווחי שוק 2026 בישראל ומיועדים להתמצאות בלבד.
          </p>
        )}
      </div>
      </div>
      <BottomNav role="resident" />
    </MobileShell>
  );
}
