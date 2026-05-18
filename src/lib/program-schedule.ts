import { ScheduleBlock } from "@/lib/schedule-data";

export type ProgramSchedulePattern = "none" | "daily" | "weekly" | "monthly";

export type DailyEndMode = "never" | "on_date" | "after_days";

/** End rule for weekly and monthly program patterns */
export type FlexEndMode = "never" | "on_date" | "after_occurrences";

export type NoneRepeatWindow = {
  startDate: string;
  startTime: string;
  endDate: string;
  endTime: string;
};

export type ProgramScheduleFields = {
  schedulePattern: ProgramSchedulePattern;
  startDate: string;
  patternEndDate: string;
  dailyEndMode: DailyEndMode;
  endDayCount: number;
  /** Occurs every N days from start date (default 1) */
  dailyStep: number;
  daysOfWeek: number[];
  weeklyEndMode: FlexEndMode;
  weeklyOccurrenceCount: number;
  /** Matching weekdays only count every N weeks from start date (default 1) */
  weeklyStep: number;
  monthlyStartYM: string;
  monthlyEndMode: FlexEndMode;
  monthlyEndYM: string;
  monthlyOccurrenceCount: number;
  monthlyDays: number[];
  /** Run selected month-days only every N months from start month (default 1) */
  monthlyStep: number;
  noneRepeatWindows: NoneRepeatWindow[];
};

function parseYmd(iso: string): Date {
  return new Date(`${iso}T00:00:00`);
}

export function toIsoDate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function addDays(d: Date, n: number): Date {
  const x = new Date(d);
  x.setDate(x.getDate() + n);
  return x;
}

function daysBetween(a: Date, b: Date): number {
  const ms = parseYmd(toIsoDate(b)).getTime() - parseYmd(toIsoDate(a)).getTime();
  return Math.round(ms / 86400000);
}

function clampDom(y: number, m0: number, dom: number): number | null {
  const last = new Date(y, m0 + 1, 0).getDate();
  const d = Math.min(dom, last);
  return d >= 1 ? d : null;
}

function normalizeTime(t: string): string {
  const raw = (t ?? "00:00").trim().slice(0, 8);
  const parts = raw.split(":").map((x) => x.replace(/\D/g, ""));
  const hh = Math.min(23, Math.max(0, Number(parts[0]) || 0));
  const mm = Math.min(59, Math.max(0, Number(parts[1]) || 0));
  return `${String(hh).padStart(2, "0")}:${String(mm).padStart(2, "0")}`;
}

/** Local "YYYY-MM-DDTHH:mm" from window fields */
export function noneWindowToSpan(w: NoneRepeatWindow): { start: string; end: string } {
  const st = normalizeTime(w.startTime);
  const et = normalizeTime(w.endTime);
  return {
    start: `${w.startDate}T${st}`,
    end: `${w.endDate}T${et}`,
  };
}

export function noneSpanToWindow(span: { start: string; end: string }): NoneRepeatWindow {
  const [sd, stRaw] = span.start.split("T");
  const [ed, etRaw] = span.end.split("T");
  return {
    startDate: sd,
    startTime: normalizeTime(stRaw ?? "00:00"),
    endDate: ed,
    endTime: normalizeTime(etRaw ?? "23:59"),
  };
}

export function noneWindowsToSpans(windows: NoneRepeatWindow[]): { start: string; end: string }[] {
  return windows.map(noneWindowToSpan);
}

/** Parse "YYYY-MM-DDTHH:mm" as local time */
function parseLocalDateTime(s: string): Date {
  const [d, t] = s.split("T");
  const [Y, M, D] = d.split("-").map(Number);
  const [hh, mm] = (t ?? "00:00").slice(0, 5).split(":").map(Number);
  return new Date(Y, (M ?? 1) - 1, D ?? 1, hh || 0, mm || 0, 0, 0);
}

export type DaySegment = { dateIso: string; startHour: number; endHour: number };

export function expandNoneSpansToDaySegments(spans: { start: string; end: string }[]): DaySegment[] {
  const out: DaySegment[] = [];
  for (const span of spans) {
    const t0 = parseLocalDateTime(span.start);
    const t1 = parseLocalDateTime(span.end);
    if (isNaN(t0.getTime()) || isNaN(t1.getTime()) || t1 <= t0) continue;
    let day = new Date(t0.getFullYear(), t0.getMonth(), t0.getDate());
    const last = new Date(t1.getFullYear(), t1.getMonth(), t1.getDate());
    while (day.getTime() <= last.getTime()) {
      const iso = toIsoDate(day);
      const dayStart = new Date(day.getFullYear(), day.getMonth(), day.getDate(), 0, 0, 0, 0);
      const dayEnd = new Date(day.getFullYear(), day.getMonth(), day.getDate(), 23, 59, 59, 999);
      const seg0 = Math.max(t0.getTime(), dayStart.getTime());
      const seg1 = Math.min(t1.getTime(), dayEnd.getTime());
      if (seg1 >= seg0) {
        const sh = (seg0 - dayStart.getTime()) / 3600000;
        const eh = Math.min(24, (seg1 - dayStart.getTime()) / 3600000);
        const endH = eh > sh ? eh : Math.min(24, sh + 1 / 120);
        out.push({ dateIso: iso, startHour: sh, endHour: endH });
      }
      day = addDays(day, 1);
    }
  }
  return out;
}

const MONTH_LABELS = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

export function formatYearMonth(isoYm: string): string {
  const [y, m] = isoYm.split("-").map(Number);
  if (!y || !m) return isoYm;
  return `${MONTH_LABELS[m - 1]} ${y}`;
}

export function programScheduleAnchorDate(fields: ProgramScheduleFields): Date {
  if (fields.schedulePattern === "none" && fields.noneRepeatWindows[0]) {
    return parseYmd(fields.noneRepeatWindows[0].startDate);
  }
  if (fields.schedulePattern === "monthly") {
    return parseYmd(`${fields.monthlyStartYM}-01`);
  }
  return parseYmd(fields.startDate);
}

export function defaultProgramSchedule(anchor: Date): ProgramScheduleFields {
  const start = anchor.toISOString().slice(0, 10);
  const end = new Date(anchor);
  end.setMonth(end.getMonth() + 1);
  const ym = `${anchor.getFullYear()}-${String(anchor.getMonth() + 1).padStart(2, "0")}`;
  return {
    schedulePattern: "daily",
    startDate: start,
    patternEndDate: end.toISOString().slice(0, 10),
    dailyEndMode: "on_date",
    endDayCount: 7,
    dailyStep: 1,
    daysOfWeek: [anchor.getDay()],
    weeklyEndMode: "on_date",
    weeklyOccurrenceCount: 10,
    weeklyStep: 1,
    monthlyStartYM: ym,
    monthlyEndMode: "on_date",
    monthlyEndYM: ym,
    monthlyOccurrenceCount: 12,
    monthlyDays: [Math.min(anchor.getDate(), 28)],
    monthlyStep: 1,
    noneRepeatWindows: [
      {
        startDate: start,
        startTime: "09:00",
        endDate: start,
        endTime: "17:00",
      },
    ],
  };
}

export function defaultsForProgramPattern(
  pattern: ProgramSchedulePattern,
  anchor: Date
): Partial<ProgramScheduleFields> {
  const base = defaultProgramSchedule(anchor);
  switch (pattern) {
    case "none":
      return { schedulePattern: "none", noneRepeatWindows: base.noneRepeatWindows };
    case "daily":
      return {
        schedulePattern: "daily",
        startDate: base.startDate,
        patternEndDate: base.patternEndDate,
        dailyEndMode: "on_date",
        dailyStep: 1,
      };
    case "weekly":
      return {
        schedulePattern: "weekly",
        startDate: base.startDate,
        patternEndDate: base.patternEndDate,
        daysOfWeek: base.daysOfWeek,
        weeklyEndMode: "on_date",
        weeklyStep: 1,
      };
    case "monthly":
      return {
        schedulePattern: "monthly",
        monthlyStartYM: base.monthlyStartYM,
        monthlyEndYM: base.monthlyEndYM,
        monthlyDays: base.monthlyDays,
        monthlyEndMode: "on_date",
        monthlyStep: 1,
      };
    default:
      return {};
  }
}

/** Ordered calendar dates for monthly program pattern */
function collectMonthlyScheduleDates(params: {
  monthlyStartYM: string;
  monthlyDays: number[];
  monthlyEndMode: FlexEndMode;
  monthlyEndYM?: string;
  monthlyOccurrenceCount?: number;
  monthlyStep: number;
  cap: number;
}): string[] {
  const out: string[] = [];
  const [sy, sm] = params.monthlyStartYM.split("-").map(Number);
  if (!sy || !sm) return out;
  const step = Math.max(1, params.monthlyStep);
  let y = sy;
  let m0 = sm - 1;
  let monthOrdinal = 0;
  let monthsWalked = 0;
  const maxMonths = params.cap * 3 + 240;

  const pushMonth = (): boolean => {
    for (const dom of [...params.monthlyDays].sort((a, b) => a - b)) {
      const d = clampDom(y, m0, dom);
      if (d == null) continue;
      out.push(`${y}-${String(m0 + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`);
      if (
        params.monthlyEndMode === "after_occurrences" &&
        params.monthlyOccurrenceCount &&
        out.length >= params.monthlyOccurrenceCount
      ) {
        return true;
      }
      if (out.length >= params.cap) return true;
    }
    return false;
  };

  while (monthsWalked < maxMonths && out.length < params.cap) {
    const ym = `${y}-${String(m0 + 1).padStart(2, "0")}`;
    if (params.monthlyEndMode === "on_date" && params.monthlyEndYM && ym > params.monthlyEndYM) {
      break;
    }
    if (monthOrdinal % step === 0) {
      const done = pushMonth();
      if (done && params.monthlyEndMode === "after_occurrences") break;
    }
    monthOrdinal++;
    m0++;
    if (m0 > 11) {
      m0 = 0;
      y++;
    }
    monthsWalked++;
    if (params.monthlyEndMode === "on_date" && params.monthlyEndYM) {
      const cur = `${y}-${String(m0 + 1).padStart(2, "0")}`;
      if (cur > params.monthlyEndYM) break;
    }
  }
  return out;
}

/** Whether `date` belongs to monthly program recurrence encoded on block */
export function monthlyProgramAppearsOnDate(block: ScheduleBlock, date: Date): boolean {
  const days = block.programMonthlyDays;
  const from = block.programMonthStart;
  const until = block.programMonthUntil;
  if (!days?.length || !from) {
    const anchor = block.startDate ? parseYmd(block.startDate) : null;
    const dom = anchor ? anchor.getDate() : 1;
    return date.getDate() === dom;
  }

  const iso = toIsoDate(date);
  const ym = iso.slice(0, 7);
  if (ym < from) return false;
  if (until && ym > until) return false;
  if (!days.includes(date.getDate())) return false;

  const mStep = Math.max(1, block.programMonthlyStep ?? 1);
  const monthDelta =
    (() => {
      const [fy, fm] = from.split("-").map(Number);
      const [ty, tm] = ym.split("-").map(Number);
      if (!fy || !fm || !ty || !tm) return 0;
      return (ty - fy) * 12 + (tm - fm);
    })();
  if (monthDelta < 0 || monthDelta % mStep !== 0) return false;

  if (block.recurrenceEnd === "after" && block.recurrenceCount) {
    const first = collectMonthlyScheduleDates({
      monthlyStartYM: from,
      monthlyDays: days,
      monthlyEndMode: "never",
      monthlyStep: mStep,
      cap: Math.max(block.recurrenceCount * 12, 500),
    });
    const head = first.slice(0, block.recurrenceCount);
    return head.includes(iso);
  }

  return true;
}

/** Whether a saved block should appear on a calendar day */
export function blockAppearsOnDate(block: ScheduleBlock, date: Date): boolean {
  const iso = toIsoDate(date);
  const r = block.recurring ?? "none";

  if (r === "none") {
    if (block.noneSpans?.length) {
      for (const span of block.noneSpans) {
        const t0 = parseLocalDateTime(span.start).getTime();
        const t1 = parseLocalDateTime(span.end).getTime();
        const d0 = new Date(date.getFullYear(), date.getMonth(), date.getDate(), 0, 0, 0).getTime();
        const d1 = new Date(date.getFullYear(), date.getMonth(), date.getDate(), 23, 59, 59, 999).getTime();
        if (t1 > d0 && t0 <= d1) return true;
      }
      return false;
    }
    return block.startDate ? block.startDate === iso : true;
  }

  if (r === "specific_dates") {
    return block.specificDates?.includes(iso) ?? false;
  }

  if (r === "interval") {
    const start = block.startDate;
    if (!start || iso < start) return false;

    const endMode =
      block.programIntervalEndMode ??
      (block.recurrenceEnd === "after"
        ? "after_occurrences"
        : block.recurrenceEnd === "never"
          ? "never"
          : block.recurrenceEndDate
            ? "on_date"
            : "never");

    if (endMode === "on_date" && block.recurrenceEndDate && iso > block.recurrenceEndDate) {
      return false;
    }

    const step = Math.max(1, block.intervalDays ?? 1);
    const diff = daysBetween(parseYmd(start), date);
    if (diff < 0 || diff % step !== 0) return false;

    if (
      endMode === "after_occurrences" &&
      block.recurrenceEnd === "after" &&
      block.recurrenceCount
    ) {
      const idx = Math.floor(diff / step);
      return idx >= 0 && idx < block.recurrenceCount;
    }
    return true;
  }

  if (r === "daily") {
    const start = block.startDate;
    const step = Math.max(1, block.programDailyStep ?? 1);
    const diff =
      start && !Number.isNaN(parseYmd(start).getTime())
        ? daysBetween(parseYmd(start), date)
        : 0;
    if (start && iso < start) return false;
    if (diff < 0 || diff % step !== 0) return false;

    if (block.recurrenceEnd === "after" && start) {
      const count = Math.max(1, block.recurrenceCount ?? 1);
      const occIdx = diff / step;
      return occIdx >= 0 && occIdx < count;
    }
    if (block.recurrenceEndDate) {
      return (!start || iso >= start) && iso <= block.recurrenceEndDate;
    }
    return !start || iso >= start;
  }

  if (r === "weekly") {
    const start = block.startDate;
    if (start && iso < start) return false;

    const days = block.daysOfWeek ?? [];
    if (days.length === 0) return false;
    if (!days.includes(date.getDay())) return false;

    const wStep = Math.max(1, block.programWeeklyStep ?? 1);
    if (start) {
      const wn = Math.floor(daysBetween(parseYmd(start), date) / 7);
      if (wn % wStep !== 0) return false;
    }

    if (
      block.type === "program" &&
      block.recurrenceEnd === "after" &&
      (block.weeklyOccurrenceCap ?? block.recurrenceCount)
    ) {
      const cap = Math.max(1, block.weeklyOccurrenceCap ?? block.recurrenceCount ?? 1);
      if (!start) return false;
      let cur = parseYmd(start);
      const limit = parseYmd(iso);
      let occurrenceIdx = -1;
      while (cur.getTime() <= limit.getTime()) {
        if (days.includes(cur.getDay())) {
          const wn = Math.floor(daysBetween(parseYmd(start), cur) / 7);
          if (wn % wStep === 0) {
            occurrenceIdx++;
            if (toIsoDate(cur) === iso) return occurrenceIdx < cap;
            if (occurrenceIdx >= cap) return false;
          }
        }
        cur = addDays(cur, 1);
      }
      return false;
    }

    if (block.recurrenceEndDate && iso > block.recurrenceEndDate) return false;
    return true;
  }

  if (r === "weekdays") {
    const start = block.startDate;
    if (start && iso < start) return false;
    if (block.recurrenceEndDate && iso > block.recurrenceEndDate) return false;
    const dow = date.getDay();
    return dow >= 1 && dow <= 5;
  }

  if (r === "monthly" && block.type === "program" && block.programMonthStart && block.programMonthlyDays?.length) {
    return monthlyProgramAppearsOnDate(block, date);
  }

  if (r === "monthly") {
    return (
      date.getDate() ===
      (block.startDate ? parseYmd(block.startDate).getDate() : 1)
    );
  }

  const dow = date.getDay();
  if (r === "biweekly") return dow === 1;
  return true;
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
      schedulePattern: "none",
      noneRepeatWindows: block.specificDates.map((d) => ({
        startDate: d,
        startTime: "00:00",
        endDate: d,
        endTime: "23:59",
      })),
    };
  }

  if (block.recurring === "none") {
    if (block.noneSpans?.length) {
      return {
        ...base,
        schedulePattern: "none",
        noneRepeatWindows: block.noneSpans.map(noneSpanToWindow),
      };
    }
    return {
      ...base,
      schedulePattern: "none",
      noneRepeatWindows: [
        {
          startDate: start,
          startTime:
            `${String(Math.floor(block.startHour)).padStart(2, "0")}:${String(
              Math.round((block.startHour % 1) * 60)
            ).padStart(2, "0")}`,
          endDate: start,
          endTime:
            `${String(Math.floor(block.endHour)).padStart(2, "0")}:${String(
              Math.round((block.endHour % 1) * 60)
            ).padStart(2, "0")}`,
        },
      ],
    };
  }

  if (block.recurring === "interval") {
    const step = Math.max(1, block.intervalDays ?? 2);
    let dailyEndMode: DailyEndMode = "on_date";
    if (
      block.programIntervalEndMode === "never" ||
      (block.recurrenceEnd === "never" && !block.recurrenceEndDate)
    ) {
      dailyEndMode = "never";
    } else if (
      block.programIntervalEndMode === "after_occurrences" ||
      block.recurrenceEnd === "after"
    ) {
      dailyEndMode = "after_days";
    }

    return {
      ...base,
      schedulePattern: "daily",
      startDate: start,
      dailyStep: step,
      dailyEndMode,
      patternEndDate: block.recurrenceEndDate ?? base.patternEndDate,
      endDayCount: block.recurrenceCount ?? 10,
    };
  }

  if (block.recurring === "weekly" || block.recurring === "weekdays") {
    const days =
      block.daysOfWeek ?? (block.recurring === "weekdays" ? [1, 2, 3, 4, 5] : [anchor.getDay()]);
    let weeklyEndMode: FlexEndMode =
      block.recurrenceEnd === "never"
        ? "never"
        : block.recurrenceEnd === "after"
          ? "after_occurrences"
          : "on_date";

    return {
      ...base,
      schedulePattern: "weekly",
      startDate: start,
      patternEndDate: block.recurrenceEndDate ?? base.patternEndDate,
      daysOfWeek: days,
      weeklyEndMode,
      weeklyOccurrenceCount: block.weeklyOccurrenceCap ?? block.recurrenceCount ?? 10,
      weeklyStep: Math.max(1, block.programWeeklyStep ?? 1),
    };
  }

  if (
    block.recurring === "monthly" &&
    block.type === "program" &&
    block.programMonthStart &&
    block.programMonthlyDays?.length
  ) {
    let monthlyEndMode: FlexEndMode = "never";
    if (block.programMonthUntil) monthlyEndMode = "on_date";
    if (block.recurrenceEnd === "after") monthlyEndMode = "after_occurrences";

    return {
      ...base,
      schedulePattern: "monthly",
      monthlyStartYM: block.programMonthStart,
      monthlyEndYM: block.programMonthUntil ?? base.monthlyEndYM,
      monthlyDays: [...block.programMonthlyDays],
      monthlyEndMode,
      monthlyOccurrenceCount: block.recurrenceCount ?? 12,
      monthlyStep: Math.max(1, block.programMonthlyStep ?? 1),
    };
  }

  if (block.recurring === "daily") {
    let dailyEndMode: DailyEndMode = "never";
    if (block.recurrenceEnd === "after") dailyEndMode = "after_days";
    else if (block.recurrenceEnd === "on" && block.recurrenceEndDate)
      dailyEndMode = "on_date";
    else if (block.recurrenceEndDate) dailyEndMode = "on_date";

    return {
      ...base,
      schedulePattern: "daily",
      startDate: start,
      patternEndDate: block.recurrenceEndDate ?? base.patternEndDate,
      dailyEndMode,
      endDayCount: block.recurrenceCount ?? 7,
      dailyStep: Math.max(1, block.programDailyStep ?? 1),
    };
  }

  return { ...base, startDate: start };
}

export function buildProgramOccurrences(
  fields: ProgramScheduleFields,
  cap = 50
): Date[] {
  if (fields.schedulePattern === "none") {
    const spans = noneWindowsToSpans(fields.noneRepeatWindows);
    const segs = expandNoneSpansToDaySegments(spans);
    return segs
      .slice(0, cap)
      .map((s) => parseYmd(s.dateIso))
      .filter((d) => !isNaN(d.getTime()));
  }

  const start = parseYmd(fields.startDate);
  if (fields.schedulePattern === "daily") {
    if (isNaN(start.getTime())) return [];
    const step = Math.max(1, fields.dailyStep);
    const out: Date[] = [];
    if (fields.dailyEndMode === "after_days") {
      const count = Math.max(1, fields.endDayCount);
      for (let i = 0; i < Math.min(count, cap); i++) {
        out.push(addDays(start, i * step));
      }
      return out;
    }
    if (fields.dailyEndMode === "never") {
      let i = 0;
      while (out.length < cap && i < 8000) {
        out.push(addDays(start, i * step));
        i++;
      }
      return out;
    }
    const end = parseYmd(fields.patternEndDate);
    if (isNaN(end.getTime())) return [start];
    let i = 0;
    while (out.length < cap) {
      const cursor = addDays(start, i * step);
      if (cursor.getTime() > end.getTime()) break;
      out.push(new Date(cursor));
      i++;
    }
    return out;
  }

  if (fields.schedulePattern === "weekly") {
    if (isNaN(start.getTime()) || fields.daysOfWeek.length === 0) return [];
    const wStep = Math.max(1, fields.weeklyStep);
    const out: Date[] = [];
    let cursor = new Date(start);
    let guard = 0;
    while (guard < 8000 && out.length < cap) {
      if (fields.patternEndDate && fields.weeklyEndMode === "on_date") {
        if (toIsoDate(cursor) > fields.patternEndDate) break;
      }
      if (fields.daysOfWeek.includes(cursor.getDay())) {
        const wn = Math.floor(daysBetween(start, cursor) / 7);
        if (wn % wStep === 0) {
          out.push(new Date(cursor));
          if (
            fields.weeklyEndMode === "after_occurrences" &&
            out.length >= fields.weeklyOccurrenceCount
          ) {
            break;
          }
        }
      }
      cursor = addDays(cursor, 1);
      guard++;
    }
    return out.slice(0, cap);
  }

  if (fields.schedulePattern === "monthly") {
    const isoList = collectMonthlyScheduleDates({
      monthlyStartYM: fields.monthlyStartYM,
      monthlyDays: fields.monthlyDays,
      monthlyEndMode: fields.monthlyEndMode,
      monthlyEndYM: fields.monthlyEndYM,
      monthlyOccurrenceCount: fields.monthlyOccurrenceCount,
      monthlyStep: Math.max(1, fields.monthlyStep),
      cap,
    });
    return isoList.map((s) => parseYmd(s));
  }

  return [start];
}

export function programScheduleToBlockFields(fields: ProgramScheduleFields): Pick<
  ScheduleBlock,
  | "startDate"
  | "recurring"
  | "daysOfWeek"
  | "recurrenceEnd"
  | "recurrenceEndDate"
  | "recurrenceCount"
  | "specificDates"
  | "noneSpans"
  | "programMonthlyDays"
  | "programMonthStart"
  | "programMonthUntil"
  | "weeklyOccurrenceCap"
  | "programDailyStep"
  | "programWeeklyStep"
  | "programMonthlyStep"
> &
  Partial<Pick<ScheduleBlock, "weeklyOccurrenceCap">> {
  const base = { startDate: fields.startDate };

  if (fields.schedulePattern === "none") {
    const spans = noneWindowsToSpans(fields.noneRepeatWindows);
    return {
      ...base,
      startDate: fields.noneRepeatWindows[0]?.startDate ?? fields.startDate,
      recurring: "none",
      noneSpans: spans,
    };
  }


  if (fields.schedulePattern === "weekly") {
    const out = {
      ...base,
      recurring: "weekly" as const,
      daysOfWeek: fields.daysOfWeek,
    };
    if (fields.weeklyEndMode === "on_date") {
      return {
        ...out,
        recurrenceEnd: "on" as const,
        recurrenceEndDate: fields.patternEndDate,
        programWeeklyStep: Math.max(1, fields.weeklyStep),
      };
    }
    if (fields.weeklyEndMode === "after_occurrences") {
      return {
        ...out,
        recurrenceEnd: "after" as const,
        recurrenceCount: Math.max(1, fields.weeklyOccurrenceCount),
        weeklyOccurrenceCap: Math.max(1, fields.weeklyOccurrenceCount),
        programWeeklyStep: Math.max(1, fields.weeklyStep),
      };
    }
    return {
      ...out,
      recurrenceEnd: "never" as const,
      programWeeklyStep: Math.max(1, fields.weeklyStep),
    };
  }

  if (fields.schedulePattern === "monthly") {
    const ym = `${fields.monthlyStartYM}-01`;
    const out: Pick<
      ScheduleBlock,
      | "startDate"
      | "recurring"
      | "programMonthStart"
      | "programMonthUntil"
      | "programMonthlyDays"
      | "recurrenceEnd"
      | "recurrenceEndDate"
      | "recurrenceCount"
    > = {
      startDate: ym,
      recurring: "monthly",
      programMonthStart: fields.monthlyStartYM,
      programMonthlyDays: [...fields.monthlyDays].sort((a, b) => a - b),
    };

    if (fields.monthlyEndMode === "on_date") {
      out.programMonthUntil = fields.monthlyEndYM;
      out.recurrenceEnd = "on";
    } else if (fields.monthlyEndMode === "after_occurrences") {
      out.recurrenceEnd = "after";
      out.recurrenceCount = Math.max(1, fields.monthlyOccurrenceCount);
    } else {
      out.recurrenceEnd = "never";
    }
    return {
      ...out,
      programMonthlyStep: Math.max(1, fields.monthlyStep),
    };
  }

  if (fields.schedulePattern === "daily") {
    const sd = Math.max(1, fields.dailyStep);
    if (fields.dailyEndMode === "after_days") {
      return {
        ...base,
        recurring: "daily",
        recurrenceEnd: "after",
        recurrenceCount: Math.max(1, fields.endDayCount),
        programDailyStep: sd,
      };
    }
    if (fields.dailyEndMode === "never") {
      return {
        ...base,
        recurring: "daily",
        recurrenceEnd: "never",
        programDailyStep: sd,
      };
    }
    return {
      ...base,
      recurring: "daily",
      recurrenceEnd: "on",
      recurrenceEndDate: fields.patternEndDate,
      programDailyStep: sd,
    };
  }

  return { ...base, recurring: "daily", recurrenceEnd: "never", programDailyStep: 1 };
}

function validateWindow(w: NoneRepeatWindow): boolean {
  if (!w.startDate || !w.endDate || !w.startTime || !w.endTime) return false;
  const start = parseLocalDateTime(`${w.startDate}T${w.startTime}`);
  const end = parseLocalDateTime(`${w.endDate}T${w.endTime}`);
  return !isNaN(start.getTime()) && !isNaN(end.getTime()) && end > start;
}

export function validateProgramSchedule(fields: ProgramScheduleFields): boolean {
  if (fields.schedulePattern === "none") {
    return fields.noneRepeatWindows.length >= 1 && fields.noneRepeatWindows.every(validateWindow);
  }

  if (!fields.startDate && fields.schedulePattern !== "monthly") return false;

  if (fields.schedulePattern === "daily") {
    if (fields.dailyStep < 1) return false;
    if (fields.dailyEndMode === "after_days") return fields.endDayCount >= 1;
    if (fields.dailyEndMode === "on_date") {
      return !!fields.patternEndDate && fields.patternEndDate >= fields.startDate;
    }
    return true;
  }

  if (fields.schedulePattern === "weekly") {
    if (fields.daysOfWeek.length < 1) return false;
    if (fields.weeklyStep < 1) return false;
    if (fields.weeklyEndMode === "on_date") {
      return !!fields.patternEndDate && fields.patternEndDate >= fields.startDate;
    }
    if (fields.weeklyEndMode === "after_occurrences") {
      return fields.weeklyOccurrenceCount >= 1;
    }
    return true;
  }


  if (fields.schedulePattern === "monthly") {
    if (!fields.monthlyStartYM || fields.monthlyDays.length < 1) return false;
    if (fields.monthlyStep < 1) return false;
    if (fields.monthlyEndMode === "on_date") {
      return !!fields.monthlyEndYM && fields.monthlyEndYM >= fields.monthlyStartYM;
    }
    if (fields.monthlyEndMode === "after_occurrences") {
      return fields.monthlyOccurrenceCount >= 1;
    }
    return true;
  }

  return true;
}
