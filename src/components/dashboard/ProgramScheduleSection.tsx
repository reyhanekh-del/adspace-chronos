import { Calendar, Plus, Repeat, Trash2 } from "lucide-react";
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
} from "@/lib/program-schedule";

const WEEKDAY_SHORT = ["S", "M", "T", "W", "T", "F", "S"];
const WEEKDAY_LONG = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

type Props = {
  fields: ProgramScheduleFields;
  onChange: (patch: Partial<ProgramScheduleFields>) => void;
};

export function ProgramScheduleSection({ fields, onChange }: Props) {
  const set = <K extends keyof ProgramScheduleFields>(
    k: K,
    v: ProgramScheduleFields[K]
  ) => onChange({ [k]: v });

  const toggleDay = (d: number) => {
    const next = fields.daysOfWeek.includes(d)
      ? fields.daysOfWeek.filter((x) => x !== d)
      : [...fields.daysOfWeek, d].sort();
    set("daysOfWeek", next);
  };

  const addSpecificDate = () => {
    set("specificDates", [...fields.specificDates, fields.startDate]);
  };

  const updateSpecificDate = (index: number, value: string) => {
    set(
      "specificDates",
      fields.specificDates.map((d, i) => (i === index ? value : d))
    );
  };

  const removeSpecificDate = (index: number) => {
    if (fields.specificDates.length <= 1) return;
    set(
      "specificDates",
      fields.specificDates.filter((_, i) => i !== index)
    );
  };

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
          onValueChange={(v) =>
            onChange({ schedulePattern: v as ProgramSchedulePattern })
          }
        >
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="daily">Every day</SelectItem>
            <SelectItem value="weekdays">Selected weekdays</SelectItem>
            <SelectItem value="specific_dates">Specific dates</SelectItem>
            <SelectItem value="interval">Every N days</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {fields.schedulePattern !== "specific_dates" && (
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

      {fields.schedulePattern === "daily" && (
        <div className="space-y-3 rounded-md border bg-background/60 p-3">
          <Label className="text-xs text-muted-foreground">End</Label>
          <label className="flex items-center gap-2 text-sm cursor-pointer">
            <input
              type="radio"
              name="daily-end"
              checked={fields.dailyEndMode === "on_date"}
              onChange={() => set("dailyEndMode", "on_date")}
              className="accent-primary"
            />
            <span className="w-24">End date</span>
            <Input
              type="date"
              value={fields.patternEndDate}
              disabled={fields.dailyEndMode !== "on_date"}
              onChange={(e) => {
                set("patternEndDate", e.target.value);
                set("dailyEndMode", "on_date");
              }}
              className="h-8 w-44"
            />
          </label>
          <label className="flex items-center gap-2 text-sm cursor-pointer">
            <input
              type="radio"
              name="daily-end"
              checked={fields.dailyEndMode === "after_days"}
              onChange={() => set("dailyEndMode", "after_days")}
              className="accent-primary"
            />
            <span className="w-24">After</span>
            <Input
              type="number"
              min={1}
              max={365}
              value={fields.endDayCount}
              disabled={fields.dailyEndMode !== "after_days"}
              onChange={(e) => {
                set("endDayCount", Math.max(1, Number(e.target.value) || 1));
                set("dailyEndMode", "after_days");
              }}
              className="h-8 w-20"
            />
            <span className="text-muted-foreground">days</span>
          </label>
        </div>
      )}

      {fields.schedulePattern === "weekdays" && (
        <>
          <div className="space-y-1.5">
            <Label htmlFor="weekdays-end">End date</Label>
            <Input
              id="weekdays-end"
              type="date"
              value={fields.patternEndDate}
              onChange={(e) => set("patternEndDate", e.target.value)}
              className="h-9 w-48"
            />
          </div>
          <div className="space-y-1.5">
            <Label>Days of week</Label>
            <div className="flex gap-1">
              {WEEKDAY_SHORT.map((lbl, i) => {
                const active = fields.daysOfWeek.includes(i);
                return (
                  <button
                    key={i}
                    type="button"
                    onClick={() => toggleDay(i)}
                    className={cn(
                      "h-9 w-9 rounded-md border text-xs font-semibold transition-colors",
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

      {fields.schedulePattern === "specific_dates" && (
        <div className="space-y-2 rounded-md border bg-background/60 p-3">
          <div className="flex items-center justify-between">
            <Label>Dates</Label>
            <Button
              type="button"
              size="sm"
              variant="ghost"
              className="h-7 gap-1 text-xs"
              onClick={addSpecificDate}
            >
              <Plus className="h-3.5 w-3.5" />
              Add date
            </Button>
          </div>
          <p className="text-[11px] text-muted-foreground">
            Add at least one date when this program should run.
          </p>
          <div className="space-y-1.5">
            {fields.specificDates.map((d, i) => (
              <div key={i} className="flex items-center gap-2">
                <Calendar className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                <Input
                  type="date"
                  value={d}
                  onChange={(e) => updateSpecificDate(i, e.target.value)}
                  className="h-8 flex-1"
                />
                <Button
                  type="button"
                  size="icon"
                  variant="ghost"
                  className="h-8 w-8 shrink-0"
                  disabled={fields.specificDates.length <= 1}
                  onClick={() => removeSpecificDate(i)}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </div>
            ))}
          </div>
        </div>
      )}

      {fields.schedulePattern === "interval" && (
        <>
          <div className="space-y-1.5">
            <Label htmlFor="interval-end">End date</Label>
            <Input
              id="interval-end"
              type="date"
              value={fields.patternEndDate}
              onChange={(e) => set("patternEndDate", e.target.value)}
              className="h-9 w-48"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="interval-days">Repeat every (days)</Label>
            <Input
              id="interval-days"
              type="number"
              min={1}
              max={90}
              value={fields.intervalDays}
              onChange={(e) =>
                set("intervalDays", Math.max(1, Number(e.target.value) || 1))
              }
              className="h-9 w-24"
            />
            <p className="text-[11px] text-muted-foreground">
              e.g. 2 = every 2 days, 4 = every 4 days
            </p>
          </div>
        </>
      )}
    </div>
  );
}
