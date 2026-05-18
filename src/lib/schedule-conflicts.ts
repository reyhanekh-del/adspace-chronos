import { Program, ScheduleBlock, Screen } from "@/lib/schedule-data";
import { blockAppearsOnDate } from "@/lib/program-schedule";

export type ConflictOverlap = {
  date: string;
  slotLabel: string;
};

export type ScheduleConflictDetail = {
  key: string;
  screenId: string;
  screenName: string;
  currentSlotLabels: string[];
  overlaps: ConflictOverlap[];
  scheduledBlockId: string;
  scheduledProgramName: string;
  scheduledProgramId: string;
  scheduledScheduleSummary: string;
  scheduledTimeRange: string;
};

export const CONFLICT_OVERLAP_DISPLAY_MAX = 3;

function toIsoDate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function hourToLabel(h: number): string {
  const hh = Math.floor(h);
  const mm = Math.round((h - hh) * 60);
  return `${String(hh).padStart(2, "0")}:${String(mm).padStart(2, "0")}`;
}

const WEEKDAY_SHORT = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

export function resolveProgramId(block: ScheduleBlock, programs: Program[]): string {
  if (block.programId) return block.programId;
  const byName = programs.find((p) => p.name === block.title);
  if (byName) return byName.id;
  const byClient = programs.find(
    (p) => block.client && p.client.toLowerCase() === block.client.toLowerCase()
  );
  if (byClient) return byClient.id;
  return programs[0]?.id ?? block.id;
}

export function formatBlockScheduleSummary(block: ScheduleBlock): string {
  const r = block.recurring ?? "none";
  const time = `${hourToLabel(block.startHour)}–${hourToLabel(block.endHour)}`;

  if (r === "daily") {
    const step = Math.max(1, block.programDailyStep ?? 1);
    const cadence = step > 1 ? `Every ${step} days` : "Every day";
    let tail = "";
    if (block.recurrenceEnd === "never") {
      tail = " (no end)";
    } else if (block.recurrenceEnd === "after") {
      tail = ` (${block.recurrenceCount ?? "?"} occurrences)`;
    } else if (block.recurrenceEndDate) {
      tail = ` until ${block.recurrenceEndDate}`;
    }
    return `${cadence}${tail} · ${time}`;
  }
  if (r === "weekdays") return `Weekdays (Mon–Fri) · ${time}`;
  if (r === "weekly") {
    const step = Math.max(1, block.programWeeklyStep ?? 1);
    const prefix = step > 1 ? `[every ${step} weeks] ` : "";
    const days =
      block.daysOfWeek?.map((d) => WEEKDAY_SHORT[d]).join(", ") || "selected days";
    if (block.recurrenceEnd === "never") return `${prefix}${days} · ${time}`;
    if (block.recurrenceEnd === "after")
      return `${prefix}${days} · ${block.weeklyOccurrenceCap ?? block.recurrenceCount ?? "?"} runs · ${time}`;
    const end = block.recurrenceEndDate ? ` until ${block.recurrenceEndDate}` : "";
    return `${prefix}${days}${end} · ${time}`;
  }
  if (r === "specific_dates") {
    const n = block.specificDates?.length ?? 0;
    return `${n} specific date${n === 1 ? "" : "s"} · ${time}`;
  }
  if (r === "interval") {
    const n = block.intervalDays ?? 2;
    if (block.programIntervalEndMode === "never" || block.recurrenceEnd === "never")
      return `Every ${n} days (open-ended) · ${time}`;
    if (block.recurrenceEnd === "after")
      return `Every ${n} days · ${block.recurrenceCount ?? "?"} runs · ${time}`;
    return `Every ${n} days · ${time}`;
  }
  if (
    r === "monthly" &&
    block.programMonthStart &&
    block.programMonthlyDays?.length
  ) {
    const step = Math.max(1, block.programMonthlyStep ?? 1);
    const prefix = step > 1 ? `[every ${step} months] ` : "";
    const days = block.programMonthlyDays.sort((a, b) => a - b).join(", ");
    return `${prefix}Monthly (days ${days}, from ${block.programMonthStart})${
      block.programMonthUntil ? ` – ${block.programMonthUntil}` : ""
    } · ${time}`;
  }
  if (r === "monthly") {
    return `Monthly · ${time}`;
  }
  if (r === "none") {
    if (block.noneSpans?.length) {
      return `${block.noneSpans.length} one-off window${block.noneSpans.length === 1 ? "" : "s"}`;
    }
    const when = block.startDate ?? "single run";
    return `${when} · ${time}`;
  }
  return time;
}

export function formatOverlapDate(iso: string): string {
  return new Date(`${iso}T00:00:00`).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export function formatOverlapLine(overlap: ConflictOverlap): string {
  return `${formatOverlapDate(overlap.date)} (${overlap.slotLabel})`;
}

function blockOccursOnDate(block: ScheduleBlock, date: Date, anchor: Date): boolean {
  if (block.recurring && block.recurring !== "none") {
    return blockAppearsOnDate(block, date);
  }
  const iso = toIsoDate(date);
  if (block.startDate) return block.startDate === iso;
  return toIsoDate(anchor) === iso;
}

export function detectScheduleConflicts(params: {
  screenIds: string[];
  slots: { start: string; end: string }[];
  type: ScheduleBlock["type"];
  occurrences: Date[];
  existingBlocks: ScheduleBlock[];
  excludeBlockId?: string;
  screens: Screen[];
  programs: Program[];
  scheduleAnchor: Date;
  timeToHour: (t: string) => number;
}): ScheduleConflictDetail[] {
  const grouped = new Map<
    string,
    ScheduleConflictDetail & {
      overlapKeys: Set<string>;
      slotLabelSet: Set<string>;
    }
  >();

  for (const screenId of params.screenIds) {
    const screen = params.screens.find((s) => s.id === screenId);

    for (let slotIdx = 0; slotIdx < params.slots.length; slotIdx++) {
      const slot = params.slots[slotIdx];
      const slotLabel = `${slot.start} – ${slot.end}`;
      const sh = params.timeToHour(slot.start);
      const eh = params.timeToHour(slot.end);

      for (const date of params.occurrences) {
        const iso = toIsoDate(date);

        for (const block of params.existingBlocks) {
          if (block.id === params.excludeBlockId) continue;
          if (block.screenId !== screenId) continue;
          if (block.type !== params.type) continue;
          if (block.status === "blocked") continue;
          if (sh >= block.endHour || eh <= block.startHour) continue;
          if (!blockOccursOnDate(block, date, params.scheduleAnchor)) continue;

          const conflictKey = `${screenId}::${block.id}`;
          const programId = resolveProgramId(block, params.programs);

          if (!grouped.has(conflictKey)) {
            grouped.set(conflictKey, {
              key: conflictKey,
              screenId,
              screenName: screen?.name ?? screenId,
              currentSlotLabels: [],
              overlaps: [],
              scheduledBlockId: block.id,
              scheduledProgramName: block.title,
              scheduledProgramId: programId,
              scheduledScheduleSummary: formatBlockScheduleSummary(block),
              scheduledTimeRange: `${hourToLabel(block.startHour)} – ${hourToLabel(
                block.endHour
              )}`,
              overlapKeys: new Set(),
              slotLabelSet: new Set(),
            });
          }

          const entry = grouped.get(conflictKey)!;
          const overlapKey = `${iso}::${slotLabel}`;
          if (!entry.overlapKeys.has(overlapKey)) {
            entry.overlapKeys.add(overlapKey);
            entry.overlaps.push({ date: iso, slotLabel });
          }
          entry.slotLabelSet.add(slotLabel);
        }
      }
    }
  }

  return Array.from(grouped.values())
    .map(({ overlapKeys, slotLabelSet, ...rest }) => ({
      ...rest,
      overlaps: rest.overlaps.sort((a, b) => a.date.localeCompare(b.date)),
      currentSlotLabels: Array.from(slotLabelSet).sort(),
    }))
    .sort((a, b) => {
      const byScreen = a.screenName.localeCompare(b.screenName);
      if (byScreen !== 0) return byScreen;
      return a.scheduledProgramName.localeCompare(b.scheduledProgramName);
    });
}

export function affectedScreenNames(conflicts: ScheduleConflictDetail[]): string[] {
  return [...new Set(conflicts.map((c) => c.screenName))];
}

export function totalConflictDays(conflicts: ScheduleConflictDetail[]): number {
  const days = new Set<string>();
  for (const c of conflicts) {
    for (const o of c.overlaps) days.add(o.date);
  }
  return days.size;
}
