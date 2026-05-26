import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import {
  HOUR_END_TIME_OPTIONS,
  HOUR_TIME_OPTIONS,
  hourFromTime,
  normalizeHourOnlyTime,
} from "@/lib/hour-time";

type Props = {
  value: string;
  onChange: (value: string) => void;
  /** Allow 24:00 (end-of-day) — use for slot/window end times. */
  allowEndOfDay?: boolean;
  className?: string;
  id?: string;
};

export function HourTimeSelect({
  value,
  onChange,
  allowEndOfDay = false,
  className,
  id,
}: Props) {
  const maxHour = allowEndOfDay ? 24 : 23;
  const options = allowEndOfDay ? HOUR_END_TIME_OPTIONS : HOUR_TIME_OPTIONS;
  const normalized = normalizeHourOnlyTime(value, maxHour);
  const selected =
    allowEndOfDay && hourFromTime(value) === 24 ? "24:00" : normalized;

  return (
    <Select
      value={selected}
      onValueChange={(v) => onChange(v)}
    >
      <SelectTrigger id={id} className={cn("h-8 w-[5.5rem] font-mono tabular-nums", className)}>
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {options.map((t) => (
          <SelectItem key={t} value={t} className="font-mono tabular-nums">
            {t.slice(0, 2)}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
