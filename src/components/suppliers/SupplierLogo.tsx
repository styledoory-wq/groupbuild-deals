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
        "shrink-0 rounded-2xl overflow-hidden flex items-center justify-center font-extrabold border border-gold/20",
        "bg-gradient-to-br from-primary to-primary-soft text-primary-foreground shadow-soft",
        sizeMap[size],
        className,
      )}
      aria-label={name ?? "ספק"}
    >
      {logoUrl ? (
        <img src={logoUrl} alt={name ?? "לוגו ספק"} className="h-full w-full object-cover" loading="lazy" />
      ) : (
        <span className="gb-gold-text">{initials}</span>
      )}
    </div>
  );
}
