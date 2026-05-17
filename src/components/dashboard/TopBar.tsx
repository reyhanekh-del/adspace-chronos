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
  Radio,
} from "lucide-react";
import { NavbarFilters } from "@/components/dashboard/NavbarFilters";
import { Screen } from "@/lib/schedule-data";

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
  screens: Screen[];
  locations: string[];
  selectedScreens: string[];
  selectedLocations: string[];
  selectedTypes: ("program" | "adpack")[];
  onToggleScreen: (id: string) => void;
  onToggleLocation: (loc: string) => void;
  onToggleType: (t: "program" | "adpack") => void;
  query: string;
  onQuery: (s: string) => void;
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
  screens,
  locations,
  selectedScreens,
  selectedLocations,
  selectedTypes,
  onToggleScreen,
  onToggleLocation,
  onToggleType,
  query,
  onQuery,
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
    <header className="shrink-0 border-b bg-card flex flex-col">
      <div className="h-12 flex items-center justify-between px-4 gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <div className="flex items-center gap-2 shrink-0 mr-1">
            <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-primary to-primary/60 grid place-items-center">
              <Radio className="h-4 w-4 text-primary-foreground" />
            </div>
            <span className="font-display text-base font-semibold hidden lg:inline">Adspace</span>
          </div>

          <div className="flex items-center gap-1">
            <Button variant="outline" size="sm" onClick={onToday} className="h-7 text-xs">
              Today
            </Button>
            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={onPrev}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={onNext}>
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>

          <div className="flex items-center gap-2 min-w-0">
            <Calendar className="h-4 w-4 text-muted-foreground shrink-0" />
            <h1 className="font-display text-base font-semibold truncate">{dateLabel}</h1>
          </div>

          <div className="hidden sm:flex items-center gap-0.5 rounded-md border bg-background p-0.5 shrink-0">
            {(["day", "week", "month"] as const).map((v) => (
              <Button
                key={v}
                variant={view === v ? "secondary" : "ghost"}
                size="sm"
                className="h-6 px-2 text-xs capitalize"
                onClick={() => onViewChange(v)}
              >
                {v}
              </Button>
            ))}
          </div>
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
          {conflicts > 0 && (
            <Badge
              variant="secondary"
              className="bg-slot-conflict text-slot-conflict-foreground border border-destructive/30 gap-1.5 hidden sm:flex"
            >
              <span className="h-1.5 w-1.5 rounded-full bg-destructive animate-pulse" />
              {conflicts} conflict{conflicts > 1 ? "s" : ""}
            </Badge>
          )}
          <Button variant="ghost" size="icon" className="h-7 w-7">
            <Bell className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={onToggleDark}>
            {dark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
          </Button>
          <Button size="sm" className="h-7 text-xs" onClick={onNew}>
            <Plus className="h-3.5 w-3.5 mr-1" />
            New
          </Button>
        </div>
      </div>

      <div className="h-9 border-t bg-muted/25 px-4 flex items-center">
        <NavbarFilters
          screens={screens}
          locations={locations}
          selectedScreens={selectedScreens}
          selectedLocations={selectedLocations}
          selectedTypes={selectedTypes}
          onToggleScreen={onToggleScreen}
          onToggleLocation={onToggleLocation}
          onToggleType={onToggleType}
          query={query}
          onQuery={onQuery}
        />
      </div>
    </header>
  );
}

export function startOfWeek(date: Date): Date {
  const d = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const day = (d.getDay() + 6) % 7;
  d.setDate(d.getDate() - day);
  return d;
}
