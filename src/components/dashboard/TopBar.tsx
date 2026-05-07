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

type Props = {
  date: Date;
  onPrev: () => void;
  onNext: () => void;
  onToday: () => void;
  dark: boolean;
  onToggleDark: () => void;
  conflicts: number;
};

export function TopBar({ date, onPrev, onNext, onToday, dark, onToggleDark, conflicts }: Props) {
  const dateLabel = date.toLocaleDateString("en-US", {
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
        <div className="hidden md:flex items-center gap-1 ml-2">
          <Button variant="secondary" size="sm" className="h-7 text-xs">Day</Button>
          <Button variant="ghost" size="sm" className="h-7 text-xs text-muted-foreground">Week</Button>
          <Button variant="ghost" size="sm" className="h-7 text-xs text-muted-foreground">Month</Button>
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
        <Button size="sm" className="h-8 ml-1">
          <Plus className="h-4 w-4 mr-1" />
          New schedule
        </Button>
      </div>
    </header>
  );
}
