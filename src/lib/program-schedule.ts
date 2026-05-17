import { ScheduleBlock } from "@/lib/schedule-data";

export type ProgramSchedulePattern = "daily" | "weekdays" | "specific_dates" | "interval";
export type DailyEndMode = "on_date" | "after_days";

export type ProgramScheduleFields = {
  schedulePattern: ProgramSchedulePattern;
  startDate: string;
  patternEndDate: string;
  dailyEndMode: DailyEndMode;
  endDayCount: number;
  daysOfWeek: number[];
  specificDates: string[];
  intervalDays: number;
};

function parseDate(iso: string): Date {
  return new Date(`${iso}T00:00:00`);
}

function toIsoDate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function daysBetween(a: Date, b: Date): number {
  const ms = parseDate(toIsoDate(b)).getTime() - parseDate(toIsoDate(a)).getTime();
  return Math.round(ms / 86400000);
}

/** Whether a saved block should appear on a calendar day */
export function blockAppearsOnDate(block: ScheduleBlock, date: Date): boolean {
  const iso = toIsoDate(date);
  const r = block.recurring ?? "none";

  if (r === "specific_dates") {
    return block.specificDates?.includes(iso) ?? false;
  }

  if (r === "interval") {
    const start = block.startDate;
    if (!start || iso < start) return false;
    if (block.recurrenceEndDate && iso > block.recurrenceEndDate) return false;
    const step = Math.max(1, block.intervalDays ?? 1);
    const diff = daysBetween(parseDate(start), date);
    return diff >= 0 && diff % step === 0;
  }

  if (r === "daily") {
    const start = block.startDate;
    if (start && iso < start) return false;
    if (block.recurrenceEnd === "after" && start) {
      const count = Math.max(1, block.recurrenceCount ?? 1);
      const diff = daysBetween(parseDate(start), date);
      return diff >= 0 && diff < count;
    }
    if (block.recurrenceEndDate) {
      return (!start || iso >= start) && iso <= block.recurrenceEndDate;
    }
    return !start || iso >= start;
  }

  if (r === "weekly") {
    const start = block.startDate;
    if (start && iso < start) return false;
    if (block.recurrenceEndDate && iso > block.recurrenceEndDate) return false;
    const days = block.daysOfWeek ?? [];
    return days.includes(date.getDay());
  }

  if (r === "weekdays") {
    const start = block.startDate;
    if (start && iso < start) return false;
    if (block.recurrenceEndDate && iso > block.recurrenceEndDate) return false;
    const dow = date.getDay();
    return dow >= 1 && dow <= 5;
  }

  if (r === "none") {
    return block.startDate ? block.startDate === iso : date.getDate() === 1;
  }

  // AdPack legacy rules
  const dow = date.getDay();
  if (r === "biweekly") return dow === 1;
  if (r === "monthly") return date.getDate() === (block.startDate ? parseDate(block.startDate).getDate() : 1);
  return true;
}

function addDays(d: Date, n: number): Date {
  const x = new Date(d);
  x.setDate(x.getDate() + n);
  return x;
}

export function defaultProgramSchedule(anchor: Date): ProgramScheduleFields {
  const start = anchor.toISOString().slice(0, 10);
  const end = new Date(anchor);
  end.setMonth(end.getMonth() + 1);
  return {
    schedulePattern: "daily",
    startDate: start,
    patternEndDate: end.toISOString().slice(0, 10),
    dailyEndMode: "on_date",
    endDayCount: 7,
    daysOfWeek: [anchor.getDay()],
    specificDates: [start],
    intervalDays: 2,
  };
}

export function blockToProgramSchedule(
  block: ScheduleBlock,
  anchor: Date
): ProgramScheduleFields {
  const base = defaultProgramSchedule(anchor);
  const start = block.startDate ?? base.startDate;

  if (block.recurring === "specific_dates" && block.specificDates?.length) {
    return {
      ...base,
      schedulePattern: "specific_dates",
      startDate: block.specificDates[0],
      specificDates: [...block.specificDates],
    };
  }

  if (block.recurring === "interval") {
    return {
      ...base,
      schedulePattern: "interval",
      startDate: start,
      patternEndDate: block.recurrenceEndDate ?? base.patternEndDate,
      intervalDays: block.intervalDays ?? 2,
    };
  }

  if (block.recurring === "weekly" || block.recurring === "weekdays") {
    const days =
      block.daysOfWeek ??
      (block.recurring === "weekdays" ? [1, 2, 3, 4, 5] : [anchor.getDay()]);
    return {
      ...base,
      schedulePattern: "weekdays",
      startDate: start,
      patternEndDate: block.recurrenceEndDate ?? base.patternEndDate,
      daysOfWeek: days,
    };
  }

  if (block.recurring === "daily") {
    const dailyEndMode: DailyEndMode =
      block.recurrenceEnd === "after" ? "after_days" : "on_date";
    return {
      ...base,
      schedulePattern: "daily",
      startDate: start,
      patternEndDate: block.recurrenceEndDate ?? base.patternEndDate,
      dailyEndMode,
      endDayCount: block.recurrenceCount ?? 7,
    };
  }

  return { ...base, startDate: start };
}

export function buildProgramOccurrences(
  fields: ProgramScheduleFields,
  cap = 50
): Date[] {
  const start = parseDate(fields.startDate);
  if (isNaN(start.getTime())) return [];

  if (fields.schedulePattern === "specific_dates") {
    return fields.specificDates
      .map((d) => parseDate(d))
      .filter((d) => !isNaN(d.getTime()))
      .sort((a, b) => a.getTime() - b.getTime())
      .slice(0, cap);
  }

  if (fields.schedulePattern === "daily") {
    const out: Date[] = [];
    if (fields.dailyEndMode === "after_days") {
      const count = Math.max(1, fields.endDayCount);
      for (let i = 0; i < Math.min(count, cap); i++) {
        out.push(addDays(start, i));
      }
      return out;
    }
    const end = parseDate(fields.patternEndDate);
    if (isNaN(end.getTime())) return [start];
    let cursor = new Date(start);
    while (cursor.getTime() <= end.getTime() && out.length < cap) {
      out.push(new Date(cursor));
      cursor = addDays(cursor, 1);
    }
    return out;
  }

  if (fields.schedulePattern === "weekdays") {
    const end = parseDate(fields.patternEndDate);
    if (isNaN(end.getTime()) || fields.daysOfWeek.length === 0) return [start];
    const out: Date[] = [];
    let cursor = new Date(start);
    while (cursor.getTime() <= end.getTime() && out.length < cap) {
      if (fields.daysOfWeek.includes(cursor.getDay())) {
        out.push(new Date(cursor));
      }
      cursor = addDays(cursor, 1);
    }
    return out;
  }

  if (fields.schedulePattern === "interval") {
    const end = parseDate(fields.patternEndDate);
    const step = Math.max(1, fields.intervalDays);
    if (isNaN(end.getTime())) return [start];
    const out: Date[] = [];
    let cursor = new Date(start);
    while (cursor.getTime() <= end.getTime() && out.length < cap) {
      out.push(new Date(cursor));
      cursor = addDays(cursor, step);
    }
    return out;
  }

  return [start];
}

export function programScheduleToBlockFields(
  fields: ProgramScheduleFields
): Pick<
  ScheduleBlock,
  | "startDate"
  | "recurring"
  | "daysOfWeek"
  | "recurrenceEnd"
  | "recurrenceEndDate"
  | "recurrenceCount"
  | "specificDates"
  | "intervalDays"
> {
  const base = { startDate: fields.startDate };

  if (fields.schedulePattern === "specific_dates") {
    return {
      ...base,
      recurring: "specific_dates",
      specificDates: fields.specificDates,
    };
  }

  if (fields.schedulePattern === "interval") {
    return {
      ...base,
      recurring: "interval",
      intervalDays: Math.max(1, fields.intervalDays),
      recurrenceEnd: "on",
      recurrenceEndDate: fields.patternEndDate,
    };
  }

  if (fields.schedulePattern === "weekdays") {
    return {
      ...base,
      recurring: "weekly",
      daysOfWeek: fields.daysOfWeek,
      recurrenceEnd: "on",
      recurrenceEndDate: fields.patternEndDate,
    };
  }

  if (fields.schedulePattern === "daily") {
    if (fields.dailyEndMode === "after_days") {
      return {
        ...base,
        recurring: "daily",
        recurrenceEnd: "after",
        recurrenceCount: Math.max(1, fields.endDayCount),
      };
    }
    return {
      ...base,
      recurring: "daily",
      recurrenceEnd: "on",
      recurrenceEndDate: fields.patternEndDate,
    };
  }

  return { ...base, recurring: "daily" };
}

export function validateProgramSchedule(fields: ProgramScheduleFields): boolean {
  if (!fields.startDate) return false;

  if (fields.schedulePattern === "specific_dates") {
    return fields.specificDates.length >= 1;
  }

  if (fields.schedulePattern === "weekdays") {
    return (
      fields.daysOfWeek.length >= 1 &&
      !!fields.patternEndDate &&
      fields.patternEndDate >= fields.startDate
    );
  }

  if (fields.schedulePattern === "interval") {
    return (
      fields.intervalDays >= 1 &&
      !!fields.patternEndDate &&
      fields.patternEndDate >= fields.startDate
    );
  }

  if (fields.schedulePattern === "daily") {
    if (fields.dailyEndMode === "after_days") {
      return fields.endDayCount >= 1;
    }
    return !!fields.patternEndDate && fields.patternEndDate >= fields.startDate;
  }

  return true;
}
