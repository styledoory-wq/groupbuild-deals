import { PIPELINE_ORDER, statusMeta, type DemandStatus } from "@/lib/demandStatus";
import { Check } from "lucide-react";

export function DemandPipelineStepper({ current }: { current: string }) {
  const idx = PIPELINE_ORDER.indexOf(current as DemandStatus);
  return (
    <div className="flex items-center gap-1 overflow-x-auto py-2 px-1" dir="rtl">
      {PIPELINE_ORDER.map((s, i) => {
        const meta = statusMeta(s);
        const done = i < idx;
        const active = i === idx;
        return (
          <div key={s} className="flex items-center gap-1 shrink-0">
            <div
              className={`flex items-center gap-1 rounded-full px-2 py-1 text-[11px] border ${
                active ? meta.color : done ? "bg-emerald-50 text-emerald-700 border-emerald-200" : "bg-gray-50 text-gray-400 border-gray-200"
              }`}
            >
              {done && <Check className="w-3 h-3" />}
              <span>{meta.label}</span>
            </div>
            {i < PIPELINE_ORDER.length - 1 && <div className="w-3 h-px bg-gray-300" />}
          </div>
        );
      })}
    </div>
  );
}
