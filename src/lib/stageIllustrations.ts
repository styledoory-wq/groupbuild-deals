/**
 * Contextual illustrations for category / stage tiles.
 * Each stage key maps to a topic-matched image (not a generic emoji).
 */
import newBuildImg from "@/assets/journey-new-build.jpg";
import renoImg from "@/assets/journey-renovation.jpg";
import committeeImg from "@/assets/journey-committee.jpg";
import legacyPlanningImg from "@/assets/stage-planning.jpg";

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

import type { ProjectType } from "@/lib/stageCatalog";

export const PROJECT_TYPE_ILLUSTRATION: Partial<Record<ProjectType, string>> = {
  new: newBuildImg,
  reno: renoImg,
  building: committeeImg,
  maintenance: renoImg,
  outdoor: outdoorImg,
};

/** Stage-key → illustration (covers all keys in STAGE_ORDER + legacy). */
const STAGE_ILLUSTRATION: Record<string, string> = {
  // new build
  "pre-plan": planningImg,
  planning: planningImg,
  "site-prep": sitePrepImg,
  foundation: foundationImg,
  envelope: envelopeImg,
  systems: systemsImg,
  finishes: finishesImg,
  outdoor: outdoorImg,
  handover: handoverImg,
  turnkey: newBuildImg,

  // renovation
  "reno-design": planningImg,
  "reno-demo": demoImg,
  "kitchen-bath": kitchenBathImg,
  electric: systemsImg,
  plumbing: plumbingImg,
  ac: acImg,
  "paint-gypsum": paintImg,
  flooring: flooringImg,
  "reno-finishes": finishesImg,
  "doors-windows": flooringImg,

  // building / committee
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

  // maintenance
  routine: cleaningImg,
  "systems-fix": plumbingImg,
  "building-work": foundationImg,

  // outdoor journey
  design: planningImg,
  build: foundationImg,
  plants: outdoorImg,
  water: waterImg,
};

const KEYWORD_ILLUSTRATIONS: Array<{ match: RegExp; img: string }> = [
  { match: /תכנון|רישוי|עיצוב|אדריכל|הנדס|רעיון|design|plan|architect/i, img: planningImg },
  { match: /הריס|הכנה|פירוק|demo|prep|הכשר/i, img: demoImg },
  { match: /שלד|יסוד|בני[הי]|קונסט|שלדי|structure|foundation|skeleton/i, img: foundationImg },
  { match: /מעטפת|איטום|חזית|טיח|cladding|facade|sealing/i, img: envelopeImg },
  { match: /חשמל|תקשורת|תאורה|סמארט|חשמלית|electric|lighting|smart/i, img: systemsImg },
  { match: /מיזוג|אוורור|מזגן|אקלים|ac|hvac|air.?cond/i, img: acImg },
  { match: /בריכ|ג['׳']קוזי|spa|pool/i, img: waterImg },
  { match: /אינסטל|צנרת|ביוב|ברז|plumbing|pipe/i, img: plumbingImg },
  { match: /מטבח|אמבט|שיש|סניטר|kitchen|bath|shower/i, img: kitchenBathImg },
  { match: /צבע|גבס|צביעה|paint|gypsum|plaster/i, img: paintImg },
  { match: /ריצוף|פרקט|דלת|חלון|פתח|floor|door|window|tile/i, img: flooringImg },
  { match: /גמר|ריהוט|עיצוב פנים|finish|interior|furniture/i, img: finishesImg },
  { match: /גינ|חוץ|חצר|השקיה|דשא|garden|outdoor|landscape|plant/i, img: outdoorImg },
  { match: /ניק|אחזקה שוטפת|clean|routine/i, img: cleaningImg },
  { match: /מעלית|elevator|lift/i, img: elevatorsImg },
  { match: /מצלמ|אבטח|אינטרקום|cctv|security|camera/i, img: cctvImg },
  { match: /סולאר|אנרג|פאנל|solar|energy/i, img: solarImg },
  { match: /ניהול|ועד בית|מסמך|manage|committee|admin/i, img: managementImg },
  { match: /מסיר|אכלוס|handover|keys|move.?in/i, img: handoverImg },
  { match: /קבלן מפתח|turnkey|new.?build|בנייה חדשה|בית חדש/i, img: newBuildImg },
  { match: /שיפוץ|reno/i, img: renoImg },
  { match: /בניין|דירות|building|apartment/i, img: committeeImg },
];

export function illustrationForStage(stageKey: string, projectType?: ProjectType): string {
  if (STAGE_ILLUSTRATION[stageKey]) return STAGE_ILLUSTRATION[stageKey];
  if (projectType && PROJECT_TYPE_ILLUSTRATION[projectType]) {
    return PROJECT_TYPE_ILLUSTRATION[projectType] as string;
  }
  return planningImg;
}

export function illustrationForLabel(label: string | null | undefined, fallback?: string): string {
  const text = (label ?? "").trim();
  if (!text) return fallback ?? planningImg;
  for (const rule of KEYWORD_ILLUSTRATIONS) {
    if (rule.match.test(text)) return rule.img;
  }
  return fallback ?? legacyPlanningImg;
}

export function illustrationForProjectType(type: ProjectType): string {
  return PROJECT_TYPE_ILLUSTRATION[type] ?? newBuildImg;
}
