import { Screen } from "@/lib/schedule-data";
import {
  ConflictOverlap,
  ScheduleConflictDetail,
} from "@/lib/schedule-conflicts";

export type ProgramConflictPatternKind = "daily" | "weekly" | "monthly";

export type ProgramDemoConflict = ScheduleConflictDetail & {
  patternKind: ProgramConflictPatternKind;
  patternLabel: string;
  scheduleLines: string[];
};

const PATTERN_LABELS: Record<ProgramConflictPatternKind, string> = {
  daily: "Daily",
  weekly: "Weekly",
  monthly: "Monthly",
};

function isoRangeDaily(start: string, count: number): string[] {
  const out: string[] = [];
  const d = new Date(`${start}T00:00:00`);
  for (let i = 0; i < count; i++) {
    const x = new Date(d);
    x.setDate(d.getDate() + i);
    out.push(x.toISOString().slice(0, 10));
  }
  return out;
}

function buildOverlaps(dates: string[], slotLabels: string[]): ConflictOverlap[] {
  return dates.map((date, i) => ({
    date,
    slotLabel: slotLabels[i % slotLabels.length],
  }));
}

/** Four curated conflicts — one per repeating pattern family — for the program scheduling demo */
export function buildProgramDemoConflicts(params: {
  currentProgramName: string;
  currentSlotLabels: string[];
  screens: Screen[];
}): ProgramDemoConflict[] {
  const screen = (id: string) =>
    params.screens.find((s) => s.id === id)?.name ?? id;

  const slots =
    params.currentSlotLabels.length > 0
      ? params.currentSlotLabels
      : ["09:00 – 12:00", "10:00 – 13:00"];

  const dailyDates = isoRangeDaily("2026-05-01", 92);
  const everyThreeDayDates = [
    "2026-05-01",
    "2026-05-04",
    "2026-05-07",
    "2026-05-10",
    "2026-05-13",
    "2026-05-16",
    "2026-05-19",
    "2026-05-22",
    "2026-05-25",
    "2026-05-28",
    "2026-05-31",
    "2026-06-03",
  ];
  const weekdayDates = [
    "2026-05-05",
    "2026-05-07",
    "2026-05-09",
    "2026-05-12",
    "2026-05-14",
    "2026-05-16",
    "2026-05-19",
    "2026-05-21",
    "2026-05-23",
    "2026-05-26",
    "2026-05-28",
    "2026-05-30",
  ];
  const monthlyDates = [
    "2026-05-20",
    "2026-06-20",
    "2026-07-20",
    "2026-08-20",
  ];

  return [
    {
      key: "demo-daily",
      patternKind: "daily",
      patternLabel: PATTERN_LABELS.daily,
      screenId: "scr-1",
      screenName: screen("scr-1"),
      currentSlotLabels: slots,
      overlaps: buildOverlaps(dailyDates, slots),
      scheduledBlockId: "b2",
      scheduledProgramName: "Nike Air Launch",
      scheduledProgramId: "prg-1",
      scheduledScheduleSummary: "Every day · 09:00–12:00",
      scheduledTimeRange: "09:00 – 12:00",
      scheduleLines: [
        "Start date: May 1, 2026",
        "End date: Jul 31, 2026",
        "Hours: 09:00 – 12:00",
      ],
    },
    {
      key: "demo-daily-step",
      patternKind: "daily",
      patternLabel: "Every 3 days",
      screenId: "scr-8",
      screenName: screen("scr-8"),
      currentSlotLabels: slots,
      overlaps: buildOverlaps(everyThreeDayDates, slots),
      scheduledBlockId: "b19",
      scheduledProgramName: "Samsung Galaxy",
      scheduledProgramId: "prg-5",
      scheduledScheduleSummary: "Every 3 days · 08:00–12:00",
      scheduledTimeRange: "08:00 – 12:00",
      scheduleLines: [
        "Start date: May 1, 2026",
        "End date: Jul 31, 2026",
        "Hours: 08:00 – 12:00",
        "Repeat every: 3 days",
      ],
    },
    {
      key: "demo-weekly",
      patternKind: "weekly",
      patternLabel: PATTERN_LABELS.weekly,
      screenId: "scr-2",
      screenName: screen("scr-2"),
      currentSlotLabels: slots,
      overlaps: buildOverlaps(weekdayDates, slots),
      scheduledBlockId: "b6",
      scheduledProgramName: "Apple Vision Pro",
      scheduledProgramId: "prg-2",
      scheduledScheduleSummary: "Mon, Wed, Fri · 08:00–11:00",
      scheduledTimeRange: "08:00 – 11:00",
      scheduleLines: [
        "Days: Mon, Wed, Fri",
        "Start date: May 5, 2026",
        "End date: Jul 31, 2026",
        "Hours: 08:00 – 11:00",
      ],
    },
    {
      key: "demo-monthly",
      patternKind: "monthly",
      patternLabel: PATTERN_LABELS.monthly,
      screenId: "scr-2",
      screenName: screen("scr-2"),
      currentSlotLabels: slots,
      overlaps: buildOverlaps(monthlyDates, slots),
      scheduledBlockId: "b8",
      scheduledProgramName: "Netflix Premiere",
      scheduledProgramId: "prg-3",
      scheduledScheduleSummary: "Monthly (day 20) · 19:00–23:00",
      scheduledTimeRange: "19:00 – 23:00",
      scheduleLines: [
        "Pattern: Monthly on day 20",
        "Months: May–Aug 2026",
        "Hours: 19:00 – 23:00",
      ],
    },
  ];
}

export function demoConflictDayCount(conflicts: ProgramDemoConflict[]): number {
  const days = new Set<string>();
  for (const c of conflicts) {
    for (const o of c.overlaps) days.add(o.date);
  }
  return days.size;
}
