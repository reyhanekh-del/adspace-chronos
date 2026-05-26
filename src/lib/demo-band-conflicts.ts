import type { Screen } from "@/lib/schedule-data";
import type { ScheduleBandConflictDetail } from "@/lib/schedule-block-pairing";

/** Two curated band mismatches — ad-heavier and program-heavier — for the scheduling demo */
export function buildBandDemoConflicts(params: {
  schedulingType: "program" | "adpack";
  screens: Screen[];
}): ScheduleBandConflictDetail[] {
  const screenName = (id: string) =>
    params.screens.find((s) => s.id === id)?.name ?? id;

  const adHeavier: ScheduleBandConflictDetail = {
    key: "demo-band-ad-heavier",
    screenId: "scr-8",
    screenName: screenName("scr-8"),
    timeLabel: "08:00 – 13:00",
    expected: 2,
    actual: 3,
    schedulingType: params.schedulingType,
    partnerTitle:
      params.schedulingType === "program"
        ? "Gangnam AM Stack"
        : "Samsung Galaxy",
    partnerType: params.schedulingType === "program" ? "adpack" : "program",
    partnerId: "demo-band-ad-heavy",
    partnerProgramId: params.schedulingType === "adpack" ? "prg-5" : undefined,
  };

  const programHeavier: ScheduleBandConflictDetail = {
    key: "demo-band-program-heavier",
    screenId: "scr-2",
    screenName: screenName("scr-2"),
    timeLabel: "19:00 – 23:00",
    expected: 2,
    actual: 1,
    schedulingType: params.schedulingType,
    partnerTitle:
      params.schedulingType === "program"
        ? "Netflix · Ad Stack"
        : "Netflix Premiere",
    partnerType: params.schedulingType === "program" ? "adpack" : "program",
    partnerId: "demo-band-program-heavy",
    partnerProgramId: params.schedulingType === "adpack" ? "prg-3" : undefined,
  };

  return [adHeavier, programHeavier];
}
