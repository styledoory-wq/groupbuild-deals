import {
  AppWindow,
  Building2,
  ClipboardList,
  Circle,
  CircleDashed,
  Compass,
  DoorOpen,
  Droplets,
  Fence,
  Grid3x3,
  Hammer,
  Home,
  KeyRound,
  Layers,
  Lightbulb,
  PaintRoller,
  Plug,
  Ruler,
  ShieldCheck,
  Sofa,
  Sparkles,
  SunMedium,
  Trees,
  Wind,
  Wrench,
  Zap,
  type LucideIcon,
} from "lucide-react";

/** Stage-key → line icon (outline only — matches sketch) */
const STAGE_ICONS: Record<string, LucideIcon> = {
  "pre-plan": Lightbulb,
  planning: Ruler,
  "site-prep": Hammer,
  foundation: Grid3x3,
  envelope: Layers,
  systems: Zap,
  finishes: Sofa,
  "interior-prep": PaintRoller,
  outdoor: Trees,
  handover: KeyRound,
  turnkey: Home,
  "reno-design": Compass,
  "reno-demo": Hammer,
  "kitchen-bath": Droplets,
  electric: Plug,
  plumbing: Droplets,
  ac: Wind,
  "paint-gypsum": PaintRoller,
  flooring: Layers,
  "reno-finishes": Sofa,
  "doors-windows": AppWindow,
  management: ClipboardList,
  cleaning: Sparkles,
  garden: Trees,
  elevators: Building2,
  "shared-electric": Lightbulb,
  cctv: ShieldCheck,
  entrance: DoorOpen,
  facade: Fence,
  solar: SunMedium,
  extras: Sparkles,
  routine: Sparkles,
  "systems-fix": Wrench,
  "building-work": Building2,
  design: Ruler,
  build: Hammer,
  plants: Trees,
  water: Droplets,
  /* --- project-management stage keys (single source of truth) --- */
  structure: Building2,
  qa: ClipboardList,
  done: KeyRound,
  "reno-plan": Ruler,
  "reno-systems": Zap,
  "reno-kitchen-bath": Droplets,
  "reno-floor-paint": PaintRoller,
  "reno-handoff": KeyRound,
  "ext-plan": Ruler,
  "ext-structure": Building2,
  "ext-envelope": Layers,
  "ext-systems": Zap,
  "ext-handoff": KeyRound,
  "mamad-plan": Ruler,
  "mamad-structure": Building2,
  "mamad-door": DoorOpen,
  "mamad-finish": ShieldCheck,
  "com-needs": ClipboardList,
  "com-quotes": ClipboardList,
  "com-select": ClipboardList,
  "com-exec": Wrench,
  "com-handoff": KeyRound,
  "ps-request": ClipboardList,
  "ps-quotes": ClipboardList,
  "ps-exec": Wrench,
  "ps-done": KeyRound,
};


/** Exact category id → icon */
const CATEGORY_ID_ICONS: Record<string, LucideIcon> = {
  "sc-arch": Ruler,
  "sc-interior": Sofa,
  "sc-engineers": Compass,
  "sc-consultants": ClipboardList,
  "sc-surveyors": Compass,
  "sc-permits": ClipboardList,
  "sc-supervision": ClipboardList,
  "sc-kitchen": Droplets,
  "sc-bath": Droplets,
  "sc-plumb": Wrench,
  "sc-gas": Wrench,
  "sc-elec": Zap,
  "sc-lighting": Lightbulb,
  "sc-climate": Wind,
  "sc-smart": Lightbulb,
  "sc-networks": Zap,
  "sc-solar": SunMedium,
  "sc-floor": Layers,
  "sc-parquet": Layers,
  "sc-doors": DoorOpen,
  "sc-windows": DoorOpen,
  "sc-aluminum": DoorOpen,
  "sc-paint": PaintRoller,
  "sc-gypsum": PaintRoller,
  "sc-cladding": Layers,
  "sc-closets": Sofa,
  "sc-carpentry": Hammer,
  "sc-garden": Trees,
  "sc-irrigation": Trees,
  "sc-hardscape": Trees,
  "sc-outdoor-kitchen": Trees,
  "sc-pools": Droplets,
  "sc-fences": Fence,
  "sc-cleaning": Sparkles,
  "sc-post-cleaning": Sparkles,
  "sc-security": ShieldCheck,
  "sc-fire": ShieldCheck,
  "sc-skeleton": Building2,
  "sc-envelope": Layers,
  "sc-waterproof": Layers,
  "sc-roofing": Home,
  "sc-contractors": Hammer,
  "sc-earthworks": Hammer,
  "sc-drilling": Hammer,
  "sc-heavy": Hammer,
  "sc-inspection": KeyRound,
  "sc-form-4": KeyRound,
  "sc-services": ClipboardList,
  "sc-supplies": Layers,
  "sc-tools": Wrench,
  "d-planning": Ruler,
  "d-construction": Building2,
  "d-systems": Zap,
  "d-finishes": Sofa,
  "d-outdoor": Trees,
  "d-furniture": Sofa,
  "d-maintenance": Sparkles,
  "d-materials": Layers,
};

const KEYWORD_ICONS: Array<{ match: RegExp; Icon: LucideIcon }> = [
  { match: /דלת|חלון|אלומינ|תריס/i, Icon: DoorOpen },
  { match: /פרקט|ריצוף|קרמיק|פורצלן/i, Icon: Layers },
  { match: /מטבח|אמבט|סניטר|מקלחת/i, Icon: Droplets },
  { match: /חשמל|תאורה|בית חכם/i, Icon: Zap },
  { match: /אינסטל|צנרת|גז/i, Icon: Wrench },
  { match: /מיזוג|מזגן/i, Icon: Wind },
  { match: /צבע|טיח|גבס|חיפוי/i, Icon: PaintRoller },
  { match: /גינ|חוץ|השקי|פרגול/i, Icon: Trees },
  { match: /בריכ/i, Icon: Droplets },
  { match: /מצלמ|אבטח|אזעק/i, Icon: ShieldCheck },
  { match: /סולאר/i, Icon: SunMedium },
  { match: /נגר|ארון|ריהוט|ספה/i, Icon: Sofa },
  { match: /שלד|בני|קבלן/i, Icon: Building2 },
  { match: /תכנון|אדריכל|מהנדס|היתר/i, Icon: Ruler },
  { match: /ניק|אחזק/i, Icon: Sparkles },
  { match: /קונסטרוקצ|יועץ|מדיד|היתר|פיקוח|מפרט/i, Icon: ClipboardList },
  { match: /איטום|רטיבות|מים|ביוב/i, Icon: Droplets },
  { match: /שלד|יציק|בטון|טיט|לבנ|חיפוי חוץ/i, Icon: Building2 },
  { match: /מעלית/i, Icon: Building2 },
  { match: /דוד|סולארי|אנרגי/i, Icon: SunMedium },
  { match: /מסירה|אכלוס|טופס|מפתח/i, Icon: KeyRound },
  { match: /הובל|ריהוט/i, Icon: Sofa },
];

/** Uniform neutral icon for items with no category link. Never an emoji. */
export const NEUTRAL_ICON: LucideIcon = CircleDashed;

export function iconForStage(stageKey: string): LucideIcon {
  return STAGE_ICONS[stageKey] ?? Sparkles;
}

export function iconForCategory(categoryId?: string | null, label?: string | null): LucideIcon {
  const id = (categoryId ?? "").trim();
  if (id && CATEGORY_ID_ICONS[id]) return CATEGORY_ID_ICONS[id];

  if (id) {
    const tokens = id.toLowerCase().split(/[-_./]/);
    if (tokens.some((t) => ["door", "doors", "win", "window", "windows", "aluminum"].includes(t))) return DoorOpen;
    if (tokens.some((t) => ["floor", "parquet", "tile"].includes(t))) return Layers;
    if (tokens.some((t) => ["kitchen", "kit", "bath", "plumb"].includes(t))) return tokens.includes("plumb") ? Wrench : Droplets;
    if (tokens.some((t) => ["elec", "electric", "light", "smart"].includes(t))) return Zap;
    if (tokens.some((t) => ["climate", "ac"].includes(t))) return Wind;
    if (tokens.some((t) => ["garden", "outdoor", "hardscape"].includes(t))) return Trees;
    if (tokens.some((t) => ["paint", "gypsum", "clad"].includes(t))) return PaintRoller;
    if (tokens.some((t) => ["sec", "security", "fire", "cctv"].includes(t))) return ShieldCheck;
    if (tokens.some((t) => ["solar"].includes(t))) return SunMedium;
    if (tokens.some((t) => ["closet", "carp", "fur"].includes(t))) return Sofa;
    if (tokens.some((t) => ["skel", "construct", "cont"].includes(t))) return Building2;
    if (tokens.some((t) => ["arch", "plan", "eng"].includes(t))) return Ruler;
    if (tokens.some((t) => ["clean", "mnt"].includes(t))) return Sparkles;
  }

  const text = (label ?? "").trim();
  if (text) {
    for (const rule of KEYWORD_ICONS) {
      if (rule.match.test(text)) return rule.Icon;
    }
  }
  return Sparkles;
}
