import { cn } from "@/lib/utils";

interface SupplierLogoProps {
  name?: string | null;
  logoUrl?: string | null;
  size?: "sm" | "md" | "lg" | "xl";
  className?: string;
}

const sizeMap = {
  sm: "h-10 w-10 text-xs",
  md: "h-12 w-12 text-sm",
  lg: "h-16 w-16 text-base",
  xl: "h-24 w-24 text-2xl",
};

function getInitials(name?: string | null) {
  if (!name) return "?";
  const parts = name.trim().split(/\s+/).slice(0, 2);
  return parts.map((p) => p[0]).join("").toUpperCase();
}

export function SupplierLogo({ name, logoUrl, size = "md", className }: SupplierLogoProps) {
  const initials = getInitials(name);
  return (
    <div
      className={cn(
        "shrink-0 rounded-[16px] overflow-hidden flex items-center justify-center font-extrabold",
        "bg-[#F4F6FA] text-[#1F2937] shadow-[0_3px_8px_-2px_rgba(10,31,61,0.10)]",
        sizeMap[size],
        className,
      )}
      aria-label={name ?? "ספק"}
    >
      {logoUrl ? (
        <img src={logoUrl} alt={name ?? "לוגו ספק"} className="h-full w-full object-cover" loading="lazy" />
      ) : (
        <span className="text-[#B8923F]">{initials}</span>
      )}
    </div>
  );
}
