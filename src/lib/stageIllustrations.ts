/**
 * Contextual illustrations for category / stage tiles.
 * Prefer exact ID → id tokens → tight Hebrew keywords.
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
import parquetImg from "@/assets/stages/stage-parquet.jpg";
import tilesImg from "@/assets/stages/stage-tiles.jpg";
import cleaningImg from "@/assets/stages/stage-cleaning.jpg";
import elevatorsImg from "@/assets/stages/stage-elevators.jpg";
import cctvImg from "@/assets/stages/stage-cctv.jpg";
import solarImg from "@/assets/stages/stage-solar.jpg";
import managementImg from "@/assets/stages/stage-management.jpg";
import demoImg from "@/assets/stages/stage-demo.jpg";
import waterImg from "@/assets/stages/stage-water.jpg";
import windowsImg from "@/assets/stages/stage-windows.jpg";
import doorsImg from "@/assets/stages/stage-doors.jpg";
import entranceDoorImg from "@/assets/stages/stage-entrance-door.jpg";
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
  flooring: tilesImg,
  "reno-finishes": finishesImg,
  "doors-windows": doorsImg,

  management: managementImg,
  cleaning: cleaningImg,
  garden: outdoorImg,
  elevators: elevatorsImg,
  "shared-electric": systemsImg,
  cctv: cctvImg,
  entrance: entranceDoorImg,
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
 * More specific tokens first. Doors are NEVER mixed with windows.
 */
const ID_TOKEN_ILLUSTRATION: Array<{ tokens: string[]; img: string }> = [
  { tokens: ["parquet"], img: parquetImg },
  { tokens: ["door", "doors"], img: doorsImg },
  { tokens: ["win", "window", "windows", "aluminum", "blinds"], img: windowsImg },
  { tokens: ["floor", "ceramic", "porcelain", "marble", "pvc", "epoxy", "tile", "tiles"], img: tilesImg },
  { tokens: ["kitchen", "kit"], img: kitchenBathImg },
  { tokens: ["bath"], img: kitchenBathImg },
  { tokens: ["plumb", "gas"], img: plumbingImg },
  { tokens: ["elec", "electric", "electrical", "light", "lighting", "smart", "net", "network", "ev", "charging"], img: systemsImg },
  { tokens: ["climate", "ac", "hvac"], img: acImg },
  { tokens: ["solar", "energy"], img: solarImg },
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
  { tokens: ["arch", "interior", "plan", "permit", "eng", "cons", "surv", "survey", "appr", "insp", "supervision", "sup", "form"], img: planningImg },
  { tokens: ["openings"], img: doorsImg },
  { tokens: ["finish", "finishes"], img: finishesImg },
  { tokens: ["system", "systems"], img: systemsImg },
  { tokens: ["construct", "construction"], img: foundationImg },
];

/** Exact id overrides — doors / parquet / tiles split explicitly. */
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

  // level-2
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
  "c-fin-openings": doorsImg,
  "c-fin-walls": paintImg,
  "c-fin-carpentry": carpentryImg,
  "c-fin-flooring": tilesImg,
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

  // doors (NOT windows)
  "sc-doors": doorsImg,
  "s-door-interior": doorsImg,
  "s-door-entrance": entranceDoorImg,
  "s-door-security": entranceDoorImg,
  "s-door-fire": doorsImg,

  // windows / aluminum
  "sc-windows": windowsImg,
  "sc-aluminum": windowsImg,
  "s-win-aluminum": windowsImg,
  "s-win-pvc": windowsImg,
  "s-win-glass": windowsImg,
  "s-win-mosquito": windowsImg,
  "s-win-blinds": windowsImg,

  // flooring family
  "sc-floor": tilesImg,
  "sc-parquet": parquetImg,
  "s-floor-parquet": parquetImg,
  "s-floor-porcelain": tilesImg,
  "s-floor-ceramic": tilesImg,
  "s-floor-marble": tilesImg,
  "s-floor-pvc": tilesImg,
  "s-floor-epoxy": tilesImg,
  "s-floor-polish": tilesImg,
  "s-hard-paving": tilesImg,
  "s-mat-ceramic": tilesImg,

  // kitchens / baths
  "sc-kitchen": kitchenBathImg,
  "sc-bath": kitchenBathImg,
  "s-kit-custom": kitchenBathImg,
  "s-kit-modular": kitchenBathImg,
  "s-kit-worktop": kitchenBathImg,
  "s-kit-renovation": kitchenBathImg,
  "s-bath-showers": kitchenBathImg,
  "s-bath-sanitary": kitchenBathImg,
  "s-bath-jacuzzi": kitchenBathImg,
  "s-bath-cabinets": kitchenBathImg,
  "s-bath-renovation": kitchenBathImg,

  // closets / carpentry
  "sc-closets": carpentryImg,
  "sc-carpentry": carpentryImg,
  "s-closet-walk-in": carpentryImg,
  "s-closet-sliding": carpentryImg,
  "s-closet-wall": carpentryImg,
  "s-fur-closet": carpentryImg,
  "s-carp-custom": carpentryImg,
  "s-carp-stairs": carpentryImg,
  "s-carp-tv-unit": carpentryImg,

  // cladding / paint / gypsum
  "sc-paint": paintImg,
  "sc-gypsum": paintImg,
  "sc-cladding": paintImg,
  "sc-wallpaper": paintImg,
  "s-clad-tiles": paintImg,
  "s-clad-stone": paintImg,
  "s-clad-wood": paintImg,
  "s-clad-3d": paintImg,
  "s-gyp-walls": paintImg,
  "s-gyp-ceiling": paintImg,
  "s-gyp-acoustic": paintImg,

  // other level-3
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
  "sc-plumb": plumbingImg,
  "sc-gas": plumbingImg,
  "sc-elec": systemsImg,
  "sc-lighting": systemsImg,
  "sc-networks": systemsImg,
  "sc-smart": systemsImg,
  "sc-ev-charging": systemsImg,
  "sc-climate": acImg,
  "sc-solar": solarImg,
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

/** Tight keyword rules — doors/parquet before broader matches. */
const KEYWORD_ILLUSTRATIONS: Array<{ match: RegExp; img: string }> = [
  { match: /דלת כניסה|דלת פלדה|רב[־\-]בריח|דלת ביטחון/i, img: entranceDoorImg },
  { match: /דלת|דלתות/i, img: doorsImg },
  { match: /חלון|חלונות|אלומינ|תריס|זכוכ|יתוש/i, img: windowsImg },
  { match: /פרקט|למינצ/i, img: parquetImg },
  { match: /ריצוף|פורצלן|קרמיק|PVC|ויניל|אפוקסי|שיש ואבן|גרניט/i, img: tilesImg },
  { match: /בריכ|ג['׳']קוזי|מזרק/i, img: waterImg },
  { match: /פרגול|דק(?:ים)?|סככ|ברביק|מטבח חוץ/i, img: pergolaImg },
  { match: /גדר|שער/i, img: fenceImg },
  { match: /איטום|גג|רעפ|בידוד|רטיב/i, img: waterproofImg },
  { match: /ארון|נגר|וורדרוב|מדרגות עץ/i, img: carpentryImg },
  { match: /ריהוט|ספה|כורס|מזרן|כיסא|מזנון|מיט|שולחן|שיד/i, img: furnitureImg },
  { match: /מטבח|אמבט|סניטר|מקלחת|קוריאן/i, img: kitchenBathImg },
  { match: /מיזוג|מזגן|VRF|חימום תת/i, img: acImg },
  { match: /אינסטל|צנרת|ביוב|ברז|גז(?!ם)/i, img: plumbingImg },
  { match: /חשמל|תאורה|בית חכם|טעינ|תקשורת|רשת|סיב|אינטרקום/i, img: systemsImg },
  { match: /סולאר|פוטו|פאנל|דוד שמש|משאבת חום/i, img: solarImg },
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
  { match: /גמר/i, img: finishesImg },
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
  const text = (label ?? "").trim();

  // Label-first for doors/parquet — catches cases even if id grouping is coarse
  if (text) {
    if (/דלת כניסה|דלת פלדה|רב[־\-]בריח|דלת ביטחון/i.test(text)) return entranceDoorImg;
    if (/דלת/i.test(text)) return doorsImg;
    if (/פרקט|למינצ/i.test(text)) return parquetImg;
    if (/חלון|אלומינ|תריס/i.test(text)) return windowsImg;
  }

  if (id && ID_EXACT[id]) return ID_EXACT[id];

  if (id) {
    const tokens = tokensFromId(id);
    // Prefer door over security when both present (s-door-security)
    if (tokens.includes("door") || tokens.includes("doors")) {
      if (tokens.includes("entrance") || tokens.includes("security")) return entranceDoorImg;
      return doorsImg;
    }
    if (tokens.includes("parquet")) return parquetImg;

    for (const rule of ID_TOKEN_ILLUSTRATION) {
      if (rule.tokens.some((t) => tokens.includes(t))) return rule.img;
    }
    for (const rule of ID_TOKEN_ILLUSTRATION) {
      if (rule.tokens.some((t) => id.includes(`-${t}`) || id.startsWith(`${t}-`) || id.includes(`-${t}-`))) {
        return rule.img;
      }
    }
  }

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
