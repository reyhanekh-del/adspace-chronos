import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Calendar,
  ChevronLeft,
  ChevronRight,
  Moon,
  Plus,
  Sun,
  Bell,
  Filter,
} from "lucide-react";

export type CalendarView = "day" | "week" | "month";

type Props = {
  date: Date;
  view: CalendarView;
  onViewChange: (v: CalendarView) => void;
  onPrev: () => void;
  onNext: () => void;
  onToday: () => void;
  dark: boolean;
  onToggleDark: () => void;
  conflicts: number;
  onNew: () => void;
};

export function TopBar({
  date,
  view,
  onViewChange,
  onPrev,
  onNext,
  onToday,
  dark,
  onToggleDark,
  conflicts,
  onNew,
}: Props) {
  const dateLabel =
    view === "month"
      ? date.toLocaleDateString("en-US", { month: "long", year: "numeric" })
      : view === "week"
        ? (() => {
            const start = startOfWeek(date);
            const end = new Date(start);
            end.setDate(start.getDate() + 6);
            const sameMonth = start.getMonth() === end.getMonth();
            const left = start.toLocaleDateString("en-US", { month: "short", day: "numeric" });
            const right = end.toLocaleDateString("en-US", {
              month: sameMonth ? undefined : "short",
              day: "numeric",
              year: "numeric",
            });
            return `${left} – ${right}`;
          })()
        : date.toLocaleDateString("en-US", {
            weekday: "long",
            month: "long",
            day: "numeric",
            year: "numeric",
          });

  return (
    <header className="h-14 border-b bg-card/60 backdrop-blur flex items-center justify-between px-5 shrink-0">
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-1">
          <Button variant="outline" size="sm" onClick={onToday} className="h-8">
            Today
          </Button>
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={onPrev}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={onNext}>
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
        <div className="flex items-center gap-2">
          <Calendar className="h-4 w-4 text-muted-foreground" />
          <h1 className="font-display text-lg font-semibold">{dateLabel}</h1>
        </div>
        <div className="hidden md:flex items-center gap-1 ml-2 rounded-md border bg-background p-0.5">
          {(["day", "week", "month"] as const).map((v) => (
            <Button
              key={v}
              variant={view === v ? "secondary" : "ghost"}
              size="sm"
              className="h-6 px-2.5 text-xs capitalize"
              onClick={() => onViewChange(v)}
            >
              {v}
            </Button>
          ))}
        </div>
      </div>

      <div className="flex items-center gap-2">
        {conflicts > 0 && (
          <Badge variant="secondary" className="bg-slot-conflict text-slot-conflict-foreground border border-destructive/30 gap-1.5">
            <span className="h-1.5 w-1.5 rounded-full bg-destructive animate-pulse" />
            {conflicts} conflict{conflicts > 1 ? "s" : ""}
          </Badge>
        )}
        <Button variant="ghost" size="icon" className="h-8 w-8 md:hidden">
          <Filter className="h-4 w-4" />
        </Button>
        <Button variant="ghost" size="icon" className="h-8 w-8">
          <Bell className="h-4 w-4" />
        </Button>
        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={onToggleDark}>
          {dark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
        </Button>
        <Button size="sm" className="h-8 ml-1" onClick={onNew}>
          <Plus className="h-4 w-4 mr-1" />
          New schedule
        </Button>
      </div>
    </header>
  );
}

export function startOfWeek(date: Date): Date {
  const d = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const day = (d.getDay() + 6) % 7; // Mon=0
  d.setDate(d.getDate() - day);
  return d;
}
