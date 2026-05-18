import { useState, useEffect } from "react";
import { Plus, Repeat, Trash2 } from "lucide-react";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import {
  ProgramScheduleFields,
  ProgramSchedulePattern,
  defaultsForProgramPattern,
  DailyEndMode,
  FlexEndMode,
  formatYearMonth,
} from "@/lib/program-schedule";

const WEEKDAY_SHORT = ["S", "M", "T", "W", "T", "F", "S"];
const WEEKDAY_LONG = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

type Props = {
  fields: ProgramScheduleFields;
  onChange: (patch: Partial<ProgramScheduleFields>) => void;
  anchor: Date;
};

function ymOptions(center: Date, span = 60): string[] {
  const out: string[] = [];
  let y = center.getFullYear();
  let m = center.getMonth();
  const half = Math.floor(span / 2);
  m -= half;
  while (m < 0) {
    m += 12;
    y--;
  }
  while (m > 11) {
    m -= 12;
    y++;
  }
  for (let i = 0; i < span; i++) {
    out.push(`${y}-${String(m + 1).padStart(2, "0")}`);
    m++;
    if (m > 11) {
      m = 0;
      y++;
    }
  }
  return out;
}

export function ProgramScheduleSection({ fields, onChange, anchor }: Props) {
  const [monthDayDraft, setMonthDayDraft] = useState("");

  const set = <K extends keyof ProgramScheduleFields>(
    k: K,
    v: ProgramScheduleFields[K]
  ) => onChange({ [k]: v });

  const applyPatternChange = (p: ProgramSchedulePattern) =>
    onChange({
      schedulePattern: p,
      ...defaultsForProgramPattern(p, anchor),
    } as Partial<ProgramScheduleFields>);

  useEffect(() => {
    if (fields.schedulePattern !== "monthly") setMonthDayDraft("");
  }, [fields.schedulePattern]);

  const toggleDay = (d: number) => {
    const next = fields.daysOfWeek.includes(d)
      ? fields.daysOfWeek.filter((x) => x !== d)
      : [...fields.daysOfWeek, d].sort();
    set("daysOfWeek", next);
  };

  const addMonthlyDay = () => {
    const digits = monthDayDraft.replace(/\D/g, "").slice(0, 2);
    const dom = digits === "" ? NaN : parseInt(digits, 10);
    if (dom < 1 || dom > 31 || Number.isNaN(dom)) return;
    if (fields.monthlyDays.includes(dom)) {
      setMonthDayDraft("");
      return;
    }
    set(
      "monthlyDays",
      [...fields.monthlyDays, dom].sort((a, b) => a - b)
    );
    setMonthDayDraft("");
  };

  const removeMonthlyDay = (dom: number) => {
    set(
      "monthlyDays",
      fields.monthlyDays.filter((x) => x !== dom)
    );
  };

  const addNoneWindow = () => {
    const w = fields.noneRepeatWindows[fields.noneRepeatWindows.length - 1];
    set("noneRepeatWindows", [
      ...fields.noneRepeatWindows,
      {
        startDate: w?.endDate ?? fields.startDate,
        startTime: "09:00",
        endDate: w?.endDate ?? fields.startDate,
        endTime: "17:00",
      },
    ]);
  };

  const updateNoneWindow = (idx: number, patch: Partial<(typeof fields.noneRepeatWindows)[0]>) =>
    set(
      "noneRepeatWindows",
      fields.noneRepeatWindows.map((w, i) => (i === idx ? { ...w, ...patch } : w))
    );

  const removeNoneWindow = (idx: number) => {
    if (fields.noneRepeatWindows.length <= 1) return;
    set(
      "noneRepeatWindows",
      fields.noneRepeatWindows.filter((_, i) => i !== idx)
    );
  };

  const monthChoices = ymOptions(anchor);

  return (
    <div className="rounded-lg border bg-muted/20 p-4 space-y-4">
      <Label className="flex items-center gap-1.5 text-sm font-medium">
        <Repeat className="h-3.5 w-3.5" />
        Schedule pattern
      </Label>

      <div className="space-y-1.5">
        <Label className="text-xs text-muted-foreground">Pattern type</Label>
        <Select
          value={fields.schedulePattern}
          onValueChange={(v) => applyPatternChange(v as ProgramSchedulePattern)}
        >
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="none">Does not repeat</SelectItem>
            <SelectItem value="daily">Daily</SelectItem>
            <SelectItem value="weekly">Weekly</SelectItem>
            <SelectItem value="monthly">Monthly</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {fields.schedulePattern !== "monthly" && fields.schedulePattern !== "none" && (
        <div className="space-y-1.5">
          <Label htmlFor="program-start-date">Start date</Label>
          <Input
            id="program-start-date"
            type="date"
            value={fields.startDate}
            onChange={(e) => set("startDate", e.target.value)}
            className="h-9 w-48"
          />
        </div>
      )}

      {/* Does not repeat — datetime windows */}
      {fields.schedulePattern === "none" && (
        <div className="space-y-2 rounded-md border bg-background/60 p-3">
          <div className="flex items-center justify-between">
            <Label>Run windows</Label>
            <Button
              type="button"
              size="sm"
              variant="ghost"
              className="h-7 gap-1 text-xs"
              onClick={addNoneWindow}
            >
              <Plus className="h-3.5 w-3.5" />
              Add window
            </Button>
          </div>
          <p className="text-[11px] text-muted-foreground">
            Each window uses its own start and end date and time — no separate time-slot row.
          </p>
          <div className="space-y-2">
            {fields.noneRepeatWindows.map((w, i) => (
              <div
                key={i}
                className="grid gap-2 rounded-md border border-border/60 bg-muted/20 p-2 sm:grid-cols-2"
              >
                <div className="space-y-1">
                  <Label className="text-[11px]">Start</Label>
                  <div className="flex flex-wrap gap-1.5">
                    <Input
                      type="date"
                      value={w.startDate}
                      onChange={(e) =>
                        updateNoneWindow(i, { startDate: e.target.value })
                      }
                      className="h-8 flex-1 min-w-[8.5rem]"
                    />
                    <Input
                      type="time"
                      value={w.startTime}
                      onChange={(e) =>
                        updateNoneWindow(i, { startTime: e.target.value })
                      }
                      className="h-8 w-[6.75rem]"
                    />
                  </div>
                </div>
                <div className="space-y-1">
                  <Label className="text-[11px]">End</Label>
                  <div className="flex flex-wrap gap-1.5">
                    <Input
                      type="date"
                      value={w.endDate}
                      onChange={(e) =>
                        updateNoneWindow(i, { endDate: e.target.value })
                      }
                      className="h-8 flex-1 min-w-[8.5rem]"
                    />
                    <Input
                      type="time"
                      value={w.endTime}
                      onChange={(e) =>
                        updateNoneWindow(i, { endTime: e.target.value })
                      }
                      className="h-8 w-[6.75rem]"
                    />
                  </div>
                </div>
                <div className="sm:col-span-2 flex justify-end">
                  <Button
                    type="button"
                    size="sm"
                    variant="ghost"
                    className="h-7 gap-1 text-xs"
                    disabled={fields.noneRepeatWindows.length <= 1}
                    onClick={() => removeNoneWindow(i)}
                  >
                    <Trash2 className="h-3 w-3" /> Remove window
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* daily */}
      {fields.schedulePattern === "daily" && (
        <>
          <FlexEndRadiosDaily
            mode={fields.dailyEndMode}
            onMode={(m: DailyEndMode) => set("dailyEndMode", m)}
            patternEndDate={fields.patternEndDate}
            onPatternEnd={(d) => set("patternEndDate", d)}
            endDayCount={fields.endDayCount}
            onEndDayCount={(n) => set("endDayCount", n)}
          />
          <PatternStepRow
            id="program-daily-step"
            value={fields.dailyStep}
            onChange={(n) => set("dailyStep", n)}
            unitLabel="calendar days"
            inputMax={365}
          />
        </>
      )}

      {/* Weekly */}
      {fields.schedulePattern === "weekly" && (
        <>
          <FlexEndRadiosFlexible
            mode={fields.weeklyEndMode}
            onMode={(m) => set("weeklyEndMode", m)}
            patternEndDate={fields.patternEndDate}
            onPatternEnd={(d) => set("patternEndDate", d)}
            occurrenceCount={fields.weeklyOccurrenceCount}
            onOccurrenceCount={(n) => set("weeklyOccurrenceCount", n)}
            occurrenceLabel="matching weekdays"
          />
          <PatternStepRow
            id="program-weekly-step"
            value={fields.weeklyStep}
            onChange={(n) => set("weeklyStep", n)}
            unitLabel="weeks"
            inputMax={104}
          />
          <div className="space-y-1.5">
            <Label>Days of week</Label>
            <div className="flex gap-1 flex-wrap">
              {WEEKDAY_SHORT.map((lbl, i) => {
                const active = fields.daysOfWeek.includes(i);
                return (
                  <button
                    key={i}
                    type="button"
                    onClick={() => toggleDay(i)}
                    className={cn(
                      "h-9 w-9 rounded-md border text-xs font-semibold transition-colors shrink-0",
                      active
                        ? "border-primary bg-primary text-primary-foreground"
                        : "border-border bg-background hover:bg-accent/50"
                    )}
                    aria-label={WEEKDAY_LONG[i]}
                  >
                    {lbl}
                  </button>
                );
              })}
            </div>
          </div>
        </>
      )}

      {/* Monthly */}
      {fields.schedulePattern === "monthly" && (
        <>
          <div className="space-y-1.5">
            <Label>Start month</Label>
            <Select
              value={fields.monthlyStartYM}
              onValueChange={(v) => set("monthlyStartYM", v)}
            >
              <SelectTrigger className="h-9 w-full max-w-sm">
                <SelectValue placeholder="Pick month" />
              </SelectTrigger>
              <SelectContent>
                {monthChoices.map((ym) => (
                  <SelectItem key={ym} value={ym}>
                    {formatYearMonth(ym)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <FlexEndRadiosFlexible
            mode={fields.monthlyEndMode}
            onMode={(m) => set("monthlyEndMode", m)}
            patternEndLabel="End month"
            patternEndYM={fields.monthlyEndYM}
            onPatternEndYM={(ym) => set("monthlyEndYM", ym)}
            patternEndChoices={monthChoices}
            occurrenceCount={fields.monthlyOccurrenceCount}
            onOccurrenceCount={(n) => set("monthlyOccurrenceCount", n)}
            occurrenceLabel="Month-day runs"
          />
          <PatternStepRow
            id="program-monthly-step"
            value={fields.monthlyStep}
            onChange={(n) => set("monthlyStep", n)}
            unitLabel="months"
            inputMax={120}
          />
          <div className="space-y-2">
            <Label htmlFor="month-day-draft">Days of month</Label>
            <p className="text-[11px] text-muted-foreground">
              Enter a day from 01–31, then tap add to attach more monthly run days.
            </p>
            <div className="flex flex-wrap items-end gap-2">
              <div className="space-y-1">
                <Label htmlFor="month-day-draft" className="text-[10px] text-muted-foreground">
                  Day (2 digits)
                </Label>
                <Input
                  id="month-day-draft"
                  type="text"
                  inputMode="numeric"
                  maxLength={2}
                  placeholder="15"
                  value={monthDayDraft}
                  onChange={(e) =>
                    setMonthDayDraft(e.target.value.replace(/\D/g, "").slice(0, 2))
                  }
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      addMonthlyDay();
                    }
                  }}
                  className="h-9 w-[3.25rem] tabular-nums text-center font-mono text-sm"
                />
              </div>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="h-9 gap-1"
                onClick={addMonthlyDay}
              >
                <Plus className="h-3.5 w-3.5" />
                Add day
              </Button>
            </div>
            {fields.monthlyDays.length > 0 && (
              <div className="flex flex-wrap gap-1.5 pt-1">
                {fields.monthlyDays.map((d) => (
                  <span
                    key={d}
                    className="inline-flex items-center gap-1 rounded-md border border-primary/30 bg-primary/10 px-2 py-0.5 text-xs font-medium tabular-nums"
                  >
                    {String(d).padStart(2, "0")}
                    <button
                      type="button"
                      aria-label={`Remove day ${d}`}
                      className="rounded hover:bg-primary/20 p-0.5"
                      onClick={() => removeMonthlyDay(d)}
                    >
                      <Trash2 className="h-3 w-3 opacity-70" />
                    </button>
                  </span>
                ))}
              </div>
            )}
          </div>
        </>
      )}

    </div>
  );
}

function PatternStepRow({
  id,
  value,
  onChange,
  unitLabel,
  inputMax,
}: {
  id: string;
  value: number;
  onChange: (n: number) => void;
  unitLabel: string;
  inputMax: number;
}) {
  return (
    <div className="space-y-2 rounded-md border bg-background/60 p-3">
      <Label htmlFor={id} className="text-xs text-muted-foreground">
        Repeat every
      </Label>
      <div className="flex flex-wrap items-center gap-2">
        <Input
          id={id}
          type="number"
          min={1}
          max={inputMax}
          value={value}
          onChange={(e) =>
            onChange(Math.min(inputMax, Math.max(1, Number(e.target.value) || 1)))
          }
          className="h-9 w-20 tabular-nums"
        />
        <span className="text-muted-foreground text-sm">{unitLabel}</span>
      </div>
      <p className="text-[11px] text-muted-foreground leading-snug">
        Default is 1 (every day / week / month). Use 2 or more to skip between runs (for example,
        every other day or every second week).
      </p>
    </div>
  );
}

function FlexEndRadiosDaily({
  mode,
  onMode,
  patternEndDate,
  onPatternEnd,
  endDayCount,
  onEndDayCount,
}: {
  mode: DailyEndMode;
  onMode: (m: DailyEndMode) => void;
  patternEndDate: string;
  onPatternEnd: (d: string) => void;
  endDayCount: number;
  onEndDayCount: (n: number) => void;
}) {
  return (
    <div className="space-y-3 rounded-md border bg-background/60 p-3">
      <Label className="text-xs text-muted-foreground">End</Label>
      <label className="flex flex-wrap items-center gap-2 text-sm cursor-pointer">
        <input
          type="radio"
          name="daily-end"
          checked={mode === "never"}
          onChange={() => onMode("never")}
          className="accent-primary"
        />
        <span className="w-28">Never</span>
      </label>
      <label className="flex flex-wrap items-center gap-2 text-sm cursor-pointer">
        <input
          type="radio"
          name="daily-end"
          checked={mode === "on_date"}
          onChange={() => onMode("on_date")}
          className="accent-primary"
        />
        <span className="w-28 shrink-0">End date</span>
        <Input
          type="date"
          value={patternEndDate}
          disabled={mode !== "on_date"}
          onChange={(e) => {
            onPatternEnd(e.target.value);
            onMode("on_date");
          }}
          className="h-8 w-44"
        />
      </label>
      <label className="flex flex-wrap items-center gap-2 text-sm cursor-pointer">
        <input
          type="radio"
          name="daily-end"
          checked={mode === "after_days"}
          onChange={() => onMode("after_days")}
          className="accent-primary"
        />
        <span className="w-28 shrink-0">After</span>
        <Input
          type="number"
          min={1}
          max={3650}
          value={endDayCount}
          disabled={mode !== "after_days"}
          onChange={(e) => {
            onEndDayCount(Math.max(1, Number(e.target.value) || 1));
            onMode("after_days");
          }}
          className="h-8 w-20"
        />
        <span className="text-muted-foreground text-sm">days</span>
      </label>
    </div>
  );
}

function FlexEndRadiosFlexible({
  mode,
  onMode,
  patternEndDate,
  onPatternEnd,
  patternEndLabel = "End date",
  patternEndYM,
  onPatternEndYM,
  patternEndChoices,
  occurrenceCount,
  onOccurrenceCount,
  occurrenceLabel = "matching runs",
}: {
  mode: FlexEndMode;
  onMode: (m: FlexEndMode) => void;
  patternEndDate?: string;
  onPatternEnd?: (d: string) => void;
  patternEndLabel?: string;
  patternEndYM?: string;
  onPatternEndYM?: (ym: string) => void;
  patternEndChoices?: string[];
  occurrenceCount: number;
  onOccurrenceCount: (n: number) => void;
  occurrenceLabel?: string;
}) {
  return (
    <div className="space-y-3 rounded-md border bg-background/60 p-3">
      <Label className="text-xs text-muted-foreground">End</Label>
      <label className="flex flex-wrap items-center gap-2 text-sm cursor-pointer">
        <input
          type="radio"
          name="flex-end"
          checked={mode === "never"}
          onChange={() => onMode("never")}
          className="accent-primary"
        />
        <span>Never</span>
      </label>
      <label className="flex flex-wrap items-center gap-2 text-sm cursor-pointer">
        <input
          type="radio"
          name="flex-end"
          checked={mode === "on_date"}
          onChange={() => onMode("on_date")}
          className="accent-primary"
        />
        <span className="w-36 shrink-0">{patternEndLabel}</span>
        {patternEndYM != null && onPatternEndYM && patternEndChoices ? (
          <Select
            value={patternEndYM}
            onValueChange={(v) => {
              onPatternEndYM(v);
              onMode("on_date");
            }}
            disabled={mode !== "on_date"}
          >
            <SelectTrigger className={cn("h-8 max-w-[12rem]", mode !== "on_date" && "opacity-60")}>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {patternEndChoices.map((ym) => (
                <SelectItem key={ym} value={ym}>
                  {formatYearMonth(ym)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        ) : patternEndDate != null && onPatternEnd ? (
          <Input
            type="date"
            value={patternEndDate}
            disabled={mode !== "on_date"}
            onChange={(e) => {
              onPatternEnd(e.target.value);
              onMode("on_date");
            }}
            className="h-8 w-44"
          />
        ) : null}
      </label>
      <label className="flex flex-wrap items-center gap-2 text-sm cursor-pointer">
        <input
          type="radio"
          name="flex-end"
          checked={mode === "after_occurrences"}
          onChange={() => onMode("after_occurrences")}
          className="accent-primary"
        />
        <span className="w-52 shrink-0">After occurrence count reaches</span>
        <Input
          type="number"
          min={1}
          max={50000}
          value={occurrenceCount}
          disabled={mode !== "after_occurrences"}
          onChange={(e) => {
            onOccurrenceCount(Math.max(1, Number(e.target.value) || 1));
            onMode("after_occurrences");
          }}
          className="h-8 w-24"
        />
        <span className="text-muted-foreground text-sm">({occurrenceLabel})</span>
      </label>
    </div>
  );
}
