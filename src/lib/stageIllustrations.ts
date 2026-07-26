/**
 * Contextual illustrations for category / stage tiles.
 * Prefer ID-based matching (stable), then tight Hebrew keywords.
 */
import newBuildImg from "@/assets/journey-new-build.jpg";
import renoImg from "@/assets/journey-renovation.jpg";
import committeeImg from "@/assets/journey-committee.jpg";

import planningImg from "@/assets/stages/stage-planning-desk.jpg";
import sitePrepImg from "@/assets/stages/stage-site-prep.jpg";
import foundationImg from "@/assets/stages/stage-foundation.jpg";
import envelopeImg from "@/assets/stages/stage-envelope.jpg";
import systemsImg from "@/assets/stages/stage-systems.jpg";
import finishesImg from "@/assets/stages/stage-finishes.jpg";
import outdoorImg from "@/assets/stages/stage-outdoor.jpg";
import handoverImg from "@/assets/stages/stage-handover.jpg";
import kitchenBathImg from "@/assets/stages/stage-kitchen-bath.jpg";
import plumbingImg from "@/assets/stages/stage-plumbing.jpg";
import acImg from "@/assets/stages/stage-ac.jpg";
import paintImg from "@/assets/stages/stage-paint.jpg";
import flooringImg from "@/assets/stages/stage-flooring.jpg";
import cleaningImg from "@/assets/stages/stage-cleaning.jpg";
import elevatorsImg from "@/assets/stages/stage-elevators.jpg";
import cctvImg from "@/assets/stages/stage-cctv.jpg";
import solarImg from "@/assets/stages/stage-solar.jpg";
import managementImg from "@/assets/stages/stage-management.jpg";
import demoImg from "@/assets/stages/stage-demo.jpg";
import waterImg from "@/assets/stages/stage-water.jpg";
import windowsImg from "@/assets/stages/stage-windows.jpg";
import carpentryImg from "@/assets/stages/stage-carpentry.jpg";
import waterproofImg from "@/assets/stages/stage-waterproof.jpg";
import pergolaImg from "@/assets/stages/stage-pergola.jpg";
import furnitureImg from "@/assets/stages/stage-furniture.jpg";
import materialsImg from "@/assets/stages/stage-materials.jpg";
import fenceImg from "@/assets/stages/stage-fence.jpg";
import contractorImg from "@/assets/stages/stage-contractor.jpg";

import type { ProjectType } from "@/lib/stageCatalog";

export const PROJECT_TYPE_ILLUSTRATION: Partial<Record<ProjectType, string>> = {
  new: newBuildImg,
  reno: renoImg,
  building: committeeImg,
  maintenance: renoImg,
  outdoor: outdoorImg,
};

/** Stage-key → illustration */
const STAGE_ILLUSTRATION: Record<string, string> = {
  "pre-plan": planningImg,
  planning: planningImg,
  "site-prep": sitePrepImg,
  foundation: foundationImg,
  envelope: envelopeImg,
  systems: systemsImg,
  finishes: finishesImg,
  "interior-prep": paintImg,
  outdoor: outdoorImg,
  handover: handoverImg,
  turnkey: contractorImg,

  "reno-design": planningImg,
  "reno-demo": demoImg,
  "kitchen-bath": kitchenBathImg,
  electric: systemsImg,
  plumbing: plumbingImg,
  ac: acImg,
  "paint-gypsum": paintImg,
  flooring: flooringImg,
  "reno-finishes": finishesImg,
  "doors-windows": windowsImg,

  management: managementImg,
  cleaning: cleaningImg,
  garden: outdoorImg,
  elevators: elevatorsImg,
  "shared-electric": systemsImg,
  cctv: cctvImg,
  entrance: flooringImg,
  facade: envelopeImg,
  solar: solarImg,
  extras: managementImg,

  routine: cleaningImg,
  "systems-fix": plumbingImg,
  "building-work": foundationImg,

  design: planningImg,
  build: pergolaImg,
  plants: outdoorImg,
  water: waterImg,
};

/**
 * Category id token → illustration.
 * Matches sc-kitchen, s-kit-*, c-fin-kitchen, d-systems, etc.
 */
const ID_TOKEN_ILLUSTRATION: Array<{ tokens: string[]; img: string }> = [
  { tokens: ["arch", "interior", "plan", "permit", "eng", "cons", "surv", "survey", "appr", "insp", "supervision", "sup", "form"], img: planningImg },
  { tokens: ["kitchen", "kit", "bath"], img: kitchenBathImg },
  { tokens: ["plumb", "gas"], img: plumbingImg },
  { tokens: ["elec", "electric", "electrical", "light", "lighting", "smart", "net", "network", "ev", "charging"], img: systemsImg },
  { tokens: ["climate", "ac", "hvac"], img: acImg },
  { tokens: ["solar", "energy"], img: solarImg },
  { tokens: ["floor", "parquet"], img: flooringImg },
  { tokens: ["door", "doors", "win", "window", "windows", "aluminum", "openings"], img: windowsImg },
  { tokens: ["paint", "wallpaper", "gypsum", "gyp", "clad", "cladding"], img: paintImg },
  { tokens: ["closet", "closets", "carp", "carpentry"], img: carpentryImg },
  { tokens: ["fur", "furn", "furniture"], img: furnitureImg },
  { tokens: ["waterproof", "roof", "roofing", "envelope", "env"], img: waterproofImg },
  { tokens: ["skel", "skeleton", "earth", "drilling", "heavy", "site"], img: foundationImg },
  { tokens: ["cont", "contractor", "contractors"], img: contractorImg },
  { tokens: ["garden", "irrigation", "outdoor", "hard", "hardscape", "pergola"], img: outdoorImg },
  { tokens: ["pool", "pools"], img: waterImg },
  { tokens: ["fence", "fences", "gate"], img: fenceImg },
  { tokens: ["elevator", "elevators"], img: elevatorsImg },
  { tokens: ["sec", "security", "fire", "cctv"], img: cctvImg },
  { tokens: ["clean", "cleaning", "post", "mnt", "maintenance", "svc", "services", "warranty"], img: cleaningImg },
  { tokens: ["mat", "material", "materials", "supplies", "tool", "tools", "rent", "rental"], img: materialsImg },
  { tokens: ["finish", "finishes"], img: finishesImg },
  { tokens: ["system", "systems"], img: systemsImg },
  { tokens: ["construct", "construction"], img: foundationImg },
];

/** Exact id overrides (from live categories catalog). */
const ID_EXACT: Record<string, string> = {
  // domains
  "d-planning": planningImg,
  "d-construction": foundationImg,
  "d-systems": systemsImg,
  "d-finishes": finishesImg,
  "d-outdoor": outdoorImg,
  "d-furniture": furnitureImg,
  "d-maintenance": cleaningImg,
  "d-materials": materialsImg,

  // level-2 groups
  "c-plan-design": planningImg,
  "c-plan-permits": planningImg,
  "c-plan-engineering": planningImg,
  "c-plan-inspection": handoverImg,
  "c-con-skeleton": foundationImg,
  "c-con-envelope": envelopeImg,
  "c-con-contractor": contractorImg,
  "c-con-heavy": sitePrepImg,
  "c-sys-electrical": systemsImg,
  "c-sys-plumbing": plumbingImg,
  "c-sys-climate": acImg,
  "c-sys-smart": systemsImg,
  "c-sys-security": cctvImg,
  "c-sys-energy": solarImg,
  "c-fin-kitchen": kitchenBathImg,
  "c-fin-bath": kitchenBathImg,
  "c-fin-openings": windowsImg,
  "c-fin-walls": paintImg,
  "c-fin-carpentry": carpentryImg,
  "c-fin-flooring": flooringImg,
  "c-out-garden": outdoorImg,
  "c-out-pools": waterImg,
  "c-out-fences": fenceImg,
  "c-out-hardscape": pergolaImg,
  "c-mnt-building": cleaningImg,
  "c-mnt-cleaning": cleaningImg,
  "c-mnt-services": managementImg,
  "c-fur-living": furnitureImg,
  "c-fur-bed": furnitureImg,
  "c-fur-kids": furnitureImg,
  "c-fur-dining": furnitureImg,
  "c-fur-office": furnitureImg,
  "c-fur-outdoor": furnitureImg,
  "c-fur-custom": carpentryImg,
  "c-mat-supplies": materialsImg,
  "c-mat-tools": materialsImg,
  "c-mat-rental": materialsImg,

  // level-3 service categories
  "sc-arch": planningImg,
  "sc-interior": finishesImg,
  "sc-engineers": planningImg,
  "sc-consultants": planningImg,
  "sc-surveyors": planningImg,
  "sc-permits": planningImg,
  "sc-supervision": planningImg,
  "sc-appraisers": planningImg,
  "sc-inspection": handoverImg,
  "sc-form-4": handoverImg,
  "sc-contractors": contractorImg,
  "sc-skeleton": foundationImg,
  "sc-envelope": envelopeImg,
  "sc-waterproof": waterproofImg,
  "sc-roofing": waterproofImg,
  "sc-earthworks": sitePrepImg,
  "sc-drilling": sitePrepImg,
  "sc-heavy": sitePrepImg,
  "sc-site-fence": sitePrepImg,
  "sc-kitchen": kitchenBathImg,
  "sc-bath": kitchenBathImg,
  "sc-plumb": plumbingImg,
  "sc-gas": plumbingImg,
  "sc-elec": systemsImg,
  "sc-lighting": systemsImg,
  "sc-networks": systemsImg,
  "sc-smart": systemsImg,
  "sc-ev-charging": systemsImg,
  "sc-climate": acImg,
  "sc-solar": solarImg,
  "sc-floor": flooringImg,
  "sc-parquet": flooringImg,
  "sc-doors": windowsImg,
  "sc-windows": windowsImg,
  "sc-aluminum": windowsImg,
  "sc-paint": paintImg,
  "sc-gypsum": paintImg,
  "sc-cladding": paintImg,
  "sc-wallpaper": paintImg,
  "sc-closets": carpentryImg,
  "sc-carpentry": carpentryImg,
  "sc-garden": outdoorImg,
  "sc-irrigation": outdoorImg,
  "sc-hardscape": pergolaImg,
  "sc-outdoor-kitchen": pergolaImg,
  "sc-pools": waterImg,
  "sc-fences": fenceImg,
  "sc-cleaning": cleaningImg,
  "sc-post-cleaning": cleaningImg,
  "sc-mnt-systems": plumbingImg,
  "sc-warranty": cleaningImg,
  "sc-services": managementImg,
  "sc-security": cctvImg,
  "sc-fire": cctvImg,
  "sc-supplies": materialsImg,
  "sc-tools": materialsImg,
  "sc-rental": materialsImg,
};

/** Tight keyword rules — order matters; more specific first. */
const KEYWORD_ILLUSTRATIONS: Array<{ match: RegExp; img: string }> = [
  { match: /בריכ|ג['׳']קוזי|מזרק/i, img: waterImg },
  { match: /פרגול|דק|סככ|ברביק|מטבח חוץ/i, img: pergolaImg },
  { match: /גדר|שער/i, img: fenceImg },
  { match: /איטום|גג|רעפ|בידוד|רטיב/i, img: waterproofImg },
  { match: /חלון|אלומינ|תריס|זכוכ|דלת/i, img: windowsImg },
  { match: /ארון|נגר|וורדרוב|מדרגות עץ/i, img: carpentryImg },
  { match: /ריהוט|ספה|כורס|מזרן|כיסא|מזנון/i, img: furnitureImg },
  { match: /מטבח|אמבט|סניטר|מקלחת|שיש|קוריאן/i, img: kitchenBathImg },
  { match: /מיזוג|מזגן|VRF|חימום תת/i, img: acImg },
  { match: /אינסטל|צנרת|ביוב|ברז|גז(?!ם)/i, img: plumbingImg },
  { match: /חשמל|תאורה|בית חכם|טעינ|תקשורת|רשת|סיב|אינטרקום/i, img: systemsImg },
  { match: /סולאר|פוטו|פאנל|דוד שמש|משאבת חום/i, img: solarImg },
  { match: /ריצוף|פרקט|פורצלן|PVC|אפוקסי/i, img: flooringImg },
  { match: /צבע|טיח|טפט|גבס|חיפוי/i, img: paintImg },
  { match: /מצלמ|אזעק|אבטח|ספרינק|גילוי אש|בקרת כניסה/i, img: cctvImg },
  { match: /מעלית/i, img: elevatorsImg },
  { match: /ניק|הדבר|פוליש|אחזק/i, img: cleaningImg },
  { match: /גינ|השקי|דשא|שתיל/i, img: outdoorImg },
  { match: /הריס|פינוי|חפיר|עפר|קידוח|פיגום|מנוף/i, img: sitePrepImg },
  { match: /שלד|יסוד|בטון|טפסנ|ברזלנ|קונסטרוק/i, img: foundationImg },
  { match: /מעטפת|חזית/i, img: envelopeImg },
  { match: /קבלן|קבלנ/i, img: contractorImg },
  { match: /חומר|כלי עבודה|השכרת/i, img: materialsImg },
  { match: /בדק בית|מסיר|טופס 4|אכלוס/i, img: handoverImg },
  { match: /אדריכל|מהנדס|יועץ|היתר|רישוי|פיקוח|מודד|שמאי|הדמי|עיצוב פנים|תכנון/i, img: planningImg },
  { match: /ניהול ועד|ועד בית/i, img: managementImg },
  { match: /גמר|עיצוב פנים/i, img: finishesImg },
];

function tokensFromId(id: string): string[] {
  return id
    .toLowerCase()
    .split(/[-_./]/)
    .filter((t) => t && t.length > 1 && !["sc", "s", "c", "d"].includes(t));
}

export function illustrationForStage(stageKey: string, projectType?: ProjectType): string {
  if (STAGE_ILLUSTRATION[stageKey]) return STAGE_ILLUSTRATION[stageKey];
  if (projectType && PROJECT_TYPE_ILLUSTRATION[projectType]) {
    return PROJECT_TYPE_ILLUSTRATION[projectType] as string;
  }
  return planningImg;
}

export function illustrationForCategory(
  categoryId?: string | null,
  label?: string | null,
  fallback?: string,
): string {
  const id = (categoryId ?? "").trim();
  if (id && ID_EXACT[id]) return ID_EXACT[id];

  if (id) {
    const tokens = tokensFromId(id);
    for (const rule of ID_TOKEN_ILLUSTRATION) {
      if (rule.tokens.some((t) => tokens.includes(t))) return rule.img;
    }
    // prefix match: sc-kitchen, s-kit-custom → kitchen/kit
    for (const rule of ID_TOKEN_ILLUSTRATION) {
      if (rule.tokens.some((t) => id.includes(`-${t}`) || id.startsWith(`${t}-`) || id.includes(`-${t}-`))) {
        return rule.img;
      }
    }
  }

  const text = (label ?? "").trim();
  if (text) {
    for (const rule of KEYWORD_ILLUSTRATIONS) {
      if (rule.match.test(text)) return rule.img;
    }
  }

  return fallback ?? planningImg;
}

/** @deprecated use illustrationForCategory */
export function illustrationForLabel(label: string | null | undefined, fallback?: string): string {
  return illustrationForCategory(null, label, fallback);
}

export function illustrationForProjectType(type: ProjectType): string {
  return PROJECT_TYPE_ILLUSTRATION[type] ?? newBuildImg;
}
