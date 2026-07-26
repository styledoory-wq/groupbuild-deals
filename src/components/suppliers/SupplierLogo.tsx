import { cn } from "@/lib/utils";
import { SmartImg } from "@/components/ui/SmartImg";

interface SupplierLogoProps {
  name?: string | null;
  logoUrl?: string | null;
  size?: "sm" | "md" | "lg" | "xl";
  className?: string;
}

const BRAND = "#0E6B5A";

const sizeMap = {
  sm: "h-10 w-10 text-[11px]",
  md: "h-12 w-12 text-sm",
  lg: "h-16 w-16 text-base",
  xl: "h-24 w-24 text-2xl",
};

const padMap = {
  sm: "p-1",
  md: "p-1.5",
  lg: "p-2",
  xl: "p-2.5",
};

function getInitials(name?: string | null) {
  if (!name) return "?";
  const parts = name.trim().split(/\s+/).slice(0, 2);
  return parts.map((p) => p[0]).join("").toUpperCase();
}

/**
 * Unified logo frame — every supplier keeps their own mark;
 * size, padding, and soft circle chrome stay identical.
 */
export function SupplierLogo({ name, logoUrl, size = "md", className }: SupplierLogoProps) {
  const initials = getInitials(name);
  // Small (sm/md) → thumb preset (96px). Large (lg/xl) → logo preset (200px).
  const preset = size === "sm" || size === "md" ? "thumb" : "logo";
  return (
    <div
      className={cn(
        "shrink-0 rounded-full overflow-hidden flex items-center justify-center font-extrabold",
        "bg-white border border-gray-100 shadow-sm",
        logoUrl ? padMap[size] : "bg-[rgba(14,107,90,0.08)]",
        sizeMap[size],
        className,
      )}
      aria-label={name ?? "ספק"}
    >
      {logoUrl ? (
        <SmartImg
          src={logoUrl}
          size={preset}
          alt={name ?? "לוגו ספק"}
          className="h-full w-full object-contain"
        />
      ) : (
        <span style={{ color: BRAND }}>{initials}</span>
      )}
    </div>
  );
}
