import type { Screen } from "@/lib/schedule-data";
import { screenAdBands } from "@/lib/schedule-data";

/** Sticky label column + lane ribbon column (day & week views). */
export const SCREEN_ROW_LABEL_W = "w-[11.75rem]";
export const SCREEN_ROW_RIBBON_W = "w-11";
export const SCREEN_ROW_STICKY_W = "w-[15.25rem]";

export const SCREEN_SIDEBAR_MIN_H = 76;

export function screenRowHeight(laneCount: number, laneHeight: number) {
  return Math.max(laneCount * laneHeight, SCREEN_SIDEBAR_MIN_H);
}

export function screenAdModeLabel(screen: Screen): string {
  if (!screen.adSupported) return "Ad-free";
  const bands = screenAdBands(screen);
  if (bands === 1) return "Ad · 1 band";
  if (bands === 2) return "Ad · 2 bands";
  return "Ad · 3 bands";
}
