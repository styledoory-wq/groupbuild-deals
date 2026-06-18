import { Home, Hammer, ShoppingBag, Building2 } from "lucide-react";
import type { StageId } from "@/lib/designSystem";

export type JourneyId = "new_build" | "renovation" | "single_purchase" | "committee";

export interface JourneyMeta {
  id: JourneyId;
  title: string;
  description: string;
  icon: typeof Home;
  /** Stages to show in the dashboard strip. Empty = hide strip entirely. */
  stages: StageId[];
}

export const JOURNEYS: JourneyMeta[] = [
  {
    id: "new_build",
    title: "בנייה חדשה",
    description: "דירה בפרויקט חדש — מלווה לכל שלבי הבנייה",
    icon: Home,
    stages: ["planning", "structure", "systems", "openings", "finishes", "kitchen-bath", "outdoor", "moving"],
  },
  {
    id: "renovation",
    title: "שיפוץ כללי",
    description: "משפצים דירה קיימת — מערכות, פתחים, גמרים, מטבח",
    icon: Hammer,
    stages: ["systems", "openings", "finishes", "kitchen-bath", "moving"],
  },
  {
    id: "single_purchase",
    title: "רכישה נקודתית",
    description: "צריך מוצר או שירות ספציפי — בלי שלבים",
    icon: ShoppingBag,
    stages: [],
  },
  {
    id: "committee",
    title: "ועד בית",
    description: "מארגנים רכישות קבוצתיות לדיירי הבניין",
    icon: Building2,
    stages: [],
  },
];

export const getJourney = (id: JourneyId | string | null | undefined): JourneyMeta =>
  JOURNEYS.find((j) => j.id === id) ?? JOURNEYS[0];

export const VALID_JOURNEY_IDS = JOURNEYS.map((j) => j.id) as JourneyId[];
