import { STATUS_PRESETS, StatusKind } from "@/lib/designSystem";

interface StatusChipProps {
  status: StatusKind;
  label?: string;
  className?: string;
}

/** Unified status chip — active / coming-soon / finished / pending. */
export function StatusChip({ status, label, className = "" }: StatusChipProps) {
  const p = STATUS_PRESETS[status];
  return (
    <span
      className={`inline-flex items-center gap-1 text-[10px] font-extrabold px-2 py-0.5 rounded-full shadow-[0_1px_3px_rgba(10,31,61,0.06)] ${className}`}
      style={{ color: p.fg, background: p.bg }}
    >
      <span className="h-1.5 w-1.5 rounded-full" style={{ background: p.dot }} />
      {label ?? p.label}
    </span>
  );
}
