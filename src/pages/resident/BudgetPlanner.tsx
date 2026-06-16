import { useState } from "react";
import { Home, Hammer, DoorOpen, Wrench, ArrowRight, RefreshCw } from "lucide-react";
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

const TRACKS: { key: Track; label: string; desc: string; icon: typeof Home }[] = [
  { key: "new_build", label: "בנייה חדשה", desc: "וילה / בית פרטי מהיסוד", icon: Home },
  { key: "full_renovation", label: "שיפוץ בית מלא", desc: "שיפוץ דירה / בית קיים", icon: Hammer },
  { key: "single_room", label: "שיפוץ חדר בודד", desc: "מטבח / אמבטיה / סלון ועוד", icon: DoorOpen },
  { key: "single_service", label: "שירות בודד", desc: "דלתות / ריצוף / מיזוג ועוד", icon: Wrench },
];

const finishOptions: FinishLevel[] = ["basic", "standard", "premium", "luxury"];
const regionOptions: Region[] = ["north", "haifa", "sharon", "center", "jerusalem", "south"];

function FieldGrid({ children }: { children: React.ReactNode }) {
  return <div className="grid grid-cols-2 gap-3">{children}</div>;
}

function FinishSelect({ value, onChange }: { value: FinishLevel; onChange: (v: FinishLevel) => void }) {
  return (
    <div>
      <Label>רמת גמר</Label>
      <Select value={value} onValueChange={(v) => onChange(v as FinishLevel)}>
        <SelectTrigger><SelectValue /></SelectTrigger>
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
      <Label>אזור בארץ</Label>
      <Select value={value} onValueChange={(v) => onChange(v as Region)}>
        <SelectTrigger><SelectValue /></SelectTrigger>
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
            {TRACKS.map((t) => {
              const Icon = t.icon;
              return (
                <button
                  key={t.key}
                  onClick={() => { setTrack(t.key); setResult(null); }}
                  className="w-full bg-white rounded-2xl p-4 border border-[#E5E7EB] flex items-center gap-3 text-right hover:border-[#C9A227] shadow-sm transition"
                >
                  <div className="h-12 w-12 rounded-xl bg-[#FFFBEB] flex items-center justify-center shrink-0">
                    <Icon className="h-6 w-6 text-[#C9A227]" strokeWidth={2.2} />
                  </div>
                  <div className="flex-1">
                    <div className="font-extrabold text-[15px] text-[#1F2937]" style={{ fontFamily: "'Urbanist'" }}>{t.label}</div>
                    <div className="text-[12px] text-[#6B7280] mt-0.5">{t.desc}</div>
                  </div>
                  <ArrowRight className="h-5 w-5 text-[#9CA3AF]" />
                </button>
              );
            })}
          </div>
        )}

        {track && (
          <>
            <div className="flex items-center justify-between">
              <div className="text-[14px] font-extrabold text-[#1F2937]" style={{ fontFamily: "'Urbanist'" }}>
                {TRACKS.find((t) => t.key === track)?.label}
              </div>
              <button onClick={reset} className="text-[12px] text-[#6B7280] flex items-center gap-1 hover:text-[#1F2937] bg-white border border-[#E5E7EB] rounded-full px-3 py-1.5 shadow-sm">
                <RefreshCw className="h-3.5 w-3.5" /> החלף מסלול
              </button>
            </div>

            <div className="bg-white rounded-3xl p-5 border border-[#E5E7EB] shadow-sm space-y-4">
              {track === "new_build" && (
                <>
                  <FieldGrid>
                    <div>
                      <Label>שטח בנוי (מ"ר)</Label>
                      <Input type="number" min={40} value={builtSqm} onChange={(e) => setBuiltSqm(+e.target.value)} />
                    </div>
                    <div>
                      <Label>מספר קומות</Label>
                      <Input type="number" min={1} max={5} value={floors} onChange={(e) => setFloors(+e.target.value)} />
                    </div>
                    <FinishSelect value={finish} onChange={setFinish} />
                    <RegionSelect value={region} onChange={setRegion} />
                  </FieldGrid>
                  <div className="flex items-center justify-between bg-[#F8F8F6] border border-[#E5E7EB] rounded-xl p-3">
                    <Label className="m-0">מרתף</Label>
                    <Switch checked={basement} onCheckedChange={setBasement} />
                  </div>
                  <div className="flex items-center justify-between bg-[#F8F8F6] border border-[#E5E7EB] rounded-xl p-3">
                    <Label className="m-0">ממ"ד</Label>
                    <Switch checked={safeRoom} onCheckedChange={setSafeRoom} />
                  </div>
                </>
              )}

              {track === "full_renovation" && (
                <>
                  <FieldGrid>
                    <div>
                      <Label>גודל הבית (מ"ר)</Label>
                      <Input type="number" min={30} value={renoSqm} onChange={(e) => setRenoSqm(+e.target.value)} />
                    </div>
                    <div>
                      <Label>סוג שיפוץ</Label>
                      <Select value={renoType} onValueChange={(v) => setRenoType(v as RenovationType)}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
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
                    <div key={key} className="flex items-center justify-between bg-[#F8F8F6] border border-[#E5E7EB] rounded-xl p-3">
                      <Label className="m-0">{label}</Label>
                      <Switch
                        checked={renoFlags[key]}
                        onCheckedChange={(v) => setRenoFlags({ ...renoFlags, [key]: v })}
                      />
                    </div>
                  ))}
                </>
              )}

              {track === "single_room" && (
                <>
                  <FieldGrid>
                    <div>
                      <Label>חדר</Label>
                      <Select value={room} onValueChange={(v) => setRoom(v as RoomKind)}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          {(Object.keys(ROOM_LABELS) as RoomKind[]).map((r) => (
                            <SelectItem key={r} value={r}>{ROOM_LABELS[r]}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label>גודל החדר (מ"ר)</Label>
                      <Input type="number" min={2} value={roomSize} onChange={(e) => setRoomSize(+e.target.value)} />
                    </div>
                    <FinishSelect value={finish} onChange={setFinish} />
                    <RegionSelect value={region} onChange={setRegion} />
                  </FieldGrid>
                  {["kitchen", "bathroom", "toilet"].includes(room) && (
                    <div className="flex items-center justify-between bg-[#F8F8F6] border border-[#E5E7EB] rounded-xl p-3">
                      <Label className="m-0">החלפת תשתיות אינסטלציה</Label>
                      <Switch checked={replacePlumbing} onCheckedChange={setReplacePlumbing} />
                    </div>
                  )}
                  {["kitchen", "living", "bedroom"].includes(room) && (
                    <div className="flex items-center justify-between bg-[#F8F8F6] border border-[#E5E7EB] rounded-xl p-3">
                      <Label className="m-0">ריהוט חדש</Label>
                      <Switch checked={newFurniture} onCheckedChange={setNewFurniture} />
                    </div>
                  )}
                </>
              )}

              {track === "single_service" && (
                <>
                  <FieldGrid>
                    <div className="col-span-2">
                      <Label>בחר שירות</Label>
                      <Select value={svc} onValueChange={(v) => setSvc(v as ServiceKind)}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          {SERVICES.map((s) => <SelectItem key={s.key} value={s.key}>{s.label}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label>כמות ({svcDef.unitLabel})</Label>
                      <Input
                        type="number"
                        min={1}
                        step={svcDef.unit === "sqm" ? "1" : "1"}
                        value={qty}
                        onChange={(e) => setQty(+e.target.value)}
                      />
                    </div>
                    <FinishSelect value={finish} onChange={setFinish} />
                    <div className="col-span-2"><RegionSelect value={region} onChange={setRegion} /></div>
                  </FieldGrid>
                </>
              )}

              <button
                onClick={calculate}
                className="w-full h-12 rounded-xl bg-[#1F2937] text-white font-extrabold text-[14px] shadow-md active:scale-[0.99] transition-transform"
                style={{ fontFamily: "'Urbanist'" }}
              >
                חשב תקציב
              </button>
            </div>
          </>
        )}

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
