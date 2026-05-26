import type { Screen, ScheduleType } from "@/lib/schedule-data";

/** Sticky label column + lane ribbon column (day & week views). */
export const SCREEN_ROW_LABEL_W = "w-[11.75rem]";
export const SCREEN_ROW_RIBBON_W = "w-11";
export const SCREEN_ROW_STICKY_W = "w-[15.25rem]";

/** Day view: same block height for program (blue/teal) and ad (yellow) lanes. */
export const DAY_LANE_H = 68;

/** Week view: same block height, scaled down. */
export const WEEK_LANE_H = 58;

export type LaneHeightVariant = "day" | "week";

export function timelineLaneHeight(
  _kind: ScheduleType,
  variant: LaneHeightVariant = "day"
): number {
  return variant === "week" ? WEEK_LANE_H : DAY_LANE_H;
}

export function screenRowHeight(
  lanes: { kind: ScheduleType }[],
  variant: LaneHeightVariant = "day"
): number {
  return lanes.reduce((sum, lane) => sum + timelineLaneHeight(lane.kind, variant), 0);
}

export function screenAdModeLabel(screen: Screen): string {
  return screen.adSupported ? "Ad-supported" : "Ad-free";
}
