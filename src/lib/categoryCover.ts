/**
 * Category-based fallback cover for deals with no uploaded image.
 * Returns a luxurious gradient + icon so every deal looks intentional,
 * even when the supplier has no marketing material.
 */

const PALETTES: Array<{ from: string; to: string; ink: string }> = [
  { from: "#0E6B5A", to: "#1A8870", ink: "#F5EFE0" }, // brand green
  { from: "#0A1F3D", to: "#2F6BFF", ink: "#EAF2FF" }, // deep navy → blue
  { from: "#8A6A1E", to: "#F5C547", ink: "#3A2A05" }, // gold
  { from: "#2C3E50", to: "#0FB5C9", ink: "#E7F8FB" }, // slate → teal
  { from: "#5B2A86", to: "#B07EE0", ink: "#F3E9FF" }, // royal purple
  { from: "#8B3A2E", to: "#E8742C", ink: "#FFF1E4" }, // terracotta
  { from: "#1F3B2D", to: "#2EA85A", ink: "#E8F7EC" }, // forest
  { from: "#2A2A2A", to: "#6B7280", ink: "#F4F6FA" }, // graphite
];

function hashString(input: string | null | undefined): number {
  if (!input) return 0;
  let h = 0;
  for (let i = 0; i < input.length; i++) {
    h = (h * 31 + input.charCodeAt(i)) | 0;
  }
  return Math.abs(h);
}

export type CategoryCover = {
  from: string;
  to: string;
  ink: string;
  icon: string;
  gradient: string;
};

export function getCategoryCover(opts: {
  categoryId?: string | null;
  categoryName?: string | null;
  categoryIcon?: string | null;
  seed?: string | null;
}): CategoryCover {
  const key = opts.categoryId || opts.categoryName || opts.seed || "default";
  const p = PALETTES[hashString(key) % PALETTES.length];
  const icon = opts.categoryIcon?.trim() || "✨";
  return {
    ...p,
    icon,
    gradient: `linear-gradient(135deg, ${p.from} 0%, ${p.to} 100%)`,
  };
}
