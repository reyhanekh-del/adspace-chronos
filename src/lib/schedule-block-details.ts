import type { ScheduleBlock, Screen } from "@/lib/schedule-data";

export type ScheduleDetailRow = {
  label: string;
  value: string;
};

const WEEKDAY_SHORT = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

const PATTERN_LABELS: Record<NonNullable<ScheduleBlock["recurring"]>, string> = {
  none: "One-off",
  daily: "Daily",
  weekdays: "Weekdays (Mon–Fri)",
  weekly: "Weekly",
  biweekly: "Biweekly",
  monthly: "Monthly",
  specific_dates: "Specific dates",
  interval: "Interval",
};

function formatHour(h: number): string {
  const hh = Math.floor(h);
  const mm = Math.round((h - hh) * 60);
  return `${String(hh).padStart(2, "0")}:${String(mm).padStart(2, "0")}`;
}

function formatIsoDate(iso: string): string {
  const d = new Date(`${iso}T00:00:00`);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function formatYm(ym: string): string {
  const [y, m] = ym.split("-").map(Number);
  if (!y || !m) return ym;
  return new Date(y, m - 1, 1).toLocaleDateString(undefined, {
    month: "short",
    year: "numeric",
  });
}

export function formatBlockPatternType(block: ScheduleBlock): string {
  const r = block.recurring ?? "none";
  const base = PATTERN_LABELS[r] ?? r;

  if (r === "daily" && (block.programDailyStep ?? 1) > 1) {
    return `${base} · every ${block.programDailyStep} days`;
  }
  if (r === "weekly" && (block.programWeeklyStep ?? 1) > 1) {
    return `${base} · every ${block.programWeeklyStep} weeks`;
  }
  if (r === "monthly" && (block.programMonthlyStep ?? 1) > 1) {
    return `${base} · every ${block.programMonthlyStep} months`;
  }
  if (r === "interval") {
    return `${base} · every ${block.intervalDays ?? 2} days`;
  }
  if (r === "weekly" || r === "weekdays") {
    const days =
      block.daysOfWeek?.map((d) => WEEKDAY_SHORT[d]).join(", ") ??
      (r === "weekdays" ? "Mon–Fri" : "");
    return days ? `${base} · ${days}` : base;
  }
  if (r === "monthly" && block.programMonthlyDays?.length) {
    const days = [...block.programMonthlyDays].sort((a, b) => a - b).join(", ");
    return `${base} · days ${days}`;
  }
  if (r === "specific_dates" && block.specificDates?.length) {
    return `${base} · ${block.specificDates.length} date${block.specificDates.length === 1 ? "" : "s"}`;
  }
  return base;
}

export function formatBlockDateRange(block: ScheduleBlock): string {
  if (block.recurring === "none" && block.noneSpans?.length) {
    const first = block.noneSpans[0];
    const last = block.noneSpans[block.noneSpans.length - 1];
    const start = first.start.slice(0, 10);
    const end = last.end.slice(0, 10);
    return start === end
      ? formatIsoDate(start)
      : `${formatIsoDate(start)} → ${formatIsoDate(end)}`;
  }

  const start = block.startDate;
  const startLabel = start ? formatIsoDate(start) : "—";

  if (block.recurrenceEnd === "on" && block.recurrenceEndDate) {
    return `${startLabel} → ${formatIsoDate(block.recurrenceEndDate)}`;
  }
  if (block.recurrenceEnd === "after" && block.recurrenceCount) {
    return `${startLabel} → After ${block.recurrenceCount} occurrences`;
  }
  if (block.programMonthUntil) {
    const from = block.programMonthStart ? formatYm(block.programMonthStart) : startLabel;
    return `${from} → ${formatYm(block.programMonthUntil)}`;
  }
  if (block.recurrenceEnd === "never" || !block.recurrenceEnd) {
    return start ? `${startLabel} → No end date` : "—";
  }
  return startLabel;
}

export function formatBlockSlotTimes(block: ScheduleBlock): string {
  if (block.noneSpans?.length) {
    return block.noneSpans
      .map((span) => {
        const start = span.start.replace("T", " ");
        const end = span.end.replace("T", " ");
        return `${start} – ${end}`;
      })
      .join("\n");
  }
  if (block.recurring === "specific_dates" && block.specificDates?.length) {
    const time = `${formatHour(block.startHour)} – ${formatHour(block.endHour)}`;
    return `${time} (on selected dates)`;
  }
  return `${formatHour(block.startHour)} – ${formatHour(block.endHour)}`;
}

export function formatBlockInterval(block: ScheduleBlock): string {
  const r = block.recurring ?? "none";

  if (r === "interval") {
    const n = block.intervalDays ?? 2;
    if (block.recurrenceEnd === "after" && block.recurrenceCount) {
      return `Every ${n} days · ${block.recurrenceCount} runs`;
    }
    return `Every ${n} days`;
  }
  if (r === "daily" && (block.programDailyStep ?? 1) > 1) {
    return `Every ${block.programDailyStep} days`;
  }
  if ((r === "weekly" || r === "weekdays") && (block.programWeeklyStep ?? 1) > 1) {
    return `Every ${block.programWeeklyStep} weeks`;
  }
  if (r === "monthly" && (block.programMonthlyStep ?? 1) > 1) {
    return `Every ${block.programMonthlyStep} months`;
  }
  if (r === "biweekly") {
    return "Every 2 weeks";
  }
  return "—";
}

export function formatBlockScreens(screen: Screen | null): string {
  if (!screen) return "—";
  return `${screen.name} · ${screen.location}`;
}

export function buildBlockScheduleDetails(
  block: ScheduleBlock,
  screen: Screen | null
): ScheduleDetailRow[] {
  return [
    { label: "Pattern type", value: formatBlockPatternType(block) },
    { label: "Start & end", value: formatBlockDateRange(block) },
    { label: "Slot times", value: formatBlockSlotTimes(block) },
    { label: "Interval", value: formatBlockInterval(block) },
    { label: "Screens", value: formatBlockScreens(screen) },
  ];
}
