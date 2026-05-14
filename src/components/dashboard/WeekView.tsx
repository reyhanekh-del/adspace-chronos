import { cn } from "@/lib/utils";
import { Screen, ScheduleBlock } from "@/lib/schedule-data";
import { Layers, Tv, AlertTriangle, Repeat } from "lucide-react";

type Props = {
  weekStart: Date; // Monday
  screens: Screen[];
  blocks: ScheduleBlock[];
  selectedId: string | null;
  onSelect: (b: ScheduleBlock) => void;
  onPickDay: (d: Date) => void;
};

const DAY_LABEL = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const DAY_W = 168;

function appearsOnDay(b: ScheduleBlock, dayIdx: number) {
  const r = b.recurring ?? "none";
  if (r === "daily") return true;
  if (r === "weekdays") return dayIdx <= 4;
  if (r === "weekly") return true; // anchor day every week
  return dayIdx === 0; // single, render on anchor day (Monday) for visibility
}

export function WeekView({ weekStart, screens, blocks, selectedId, onSelect, onPickDay }: Props) {
  const days = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(weekStart);
    d.setDate(weekStart.getDate() + i);
    return d;
  });
  const totalW = DAY_W * 7;

  return (
    <div className="flex-1 min-w-0 flex flex-col bg-background">
      <div className="flex border-b bg-card/40 backdrop-blur-sm sticky top-0 z-20">
        <div className="w-56 shrink-0 border-r px-4 py-3 text-[11px] uppercase tracking-wider font-semibold text-muted-foreground flex items-center gap-1.5">
          <Tv className="h-3.5 w-3.5" /> Screens
        </div>
        <div className="overflow-hidden flex-1">
          <div className="flex" style={{ width: totalW }}>
            {days.map((d, i) => {
              const isToday = isSameDay(d, new Date());
              return (
                <button
                  key={i}
                  onClick={() => onPickDay(d)}
                  className={cn(
                    "border-r last:border-r-0 py-2 px-3 text-left hover:bg-accent/40 transition-colors",
                    isToday && "bg-primary/5"
                  )}
                  style={{ width: DAY_W }}
                >
                  <div className="text-[10px] uppercase tracking-wider font-semibold text-muted-foreground">
                    {DAY_LABEL[i]}
                  </div>
                  <div
                    className={cn(
                      "font-display text-lg font-semibold tabular-nums",
                      isToday && "text-primary"
                    )}
                  >
                    {d.getDate()}
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-auto timeline-scroll">
        <div className="flex flex-col">
          {screens.map((screen) => (
            <div key={screen.id} className="flex border-b last:border-b-0">
              <div className="w-56 shrink-0 border-r px-4 py-3 bg-card/30 sticky left-0 z-10 flex flex-col justify-center">
                <div className="flex items-center gap-2">
                  <span
                    className={cn(
                      "h-2 w-2 rounded-full",
                      screen.online ? "bg-emerald-500" : "bg-muted-foreground/40"
                    )}
                  />
                  <div className="font-medium text-sm truncate">{screen.name}</div>
                </div>
                <div className="text-[11px] text-muted-foreground mt-0.5 ml-4">
                  {screen.location} · {screen.resolution}
                </div>
              </div>

              <div className="flex" style={{ width: totalW }}>
                {days.map((d, i) => {
                  const dayBlocks = blocks.filter(
                    (b) => b.screenId === screen.id && appearsOnDay(b, i)
                  );
                  return (
                    <button
                      key={i}
                      onClick={() => onPickDay(d)}
                      className="border-r last:border-r-0 py-2 px-1.5 text-left align-top hover:bg-accent/20 transition-colors min-h-[120px] flex flex-col gap-1"
                      style={{ width: DAY_W }}
                    >
                      {dayBlocks.length === 0 && (
                        <span className="text-[10px] text-muted-foreground/60 px-1">—</span>
                      )}
                      {dayBlocks.slice(0, 4).map((b) => (
                        <span
                          key={b.id}
                          onClick={(e) => {
                            e.stopPropagation();
                            onSelect(b);
                          }}
                          className={cn(
                            "rounded-md px-1.5 py-1 text-[11px] flex items-center gap-1 cursor-pointer transition-shadow hover:shadow-sm",
                            chipStyles(b),
                            selectedId === b.id && "ring-2 ring-ring"
                          )}
                        >
                          {b.type === "program" ? (
                            <Tv className="h-2.5 w-2.5 shrink-0 opacity-80" />
                          ) : (
                            <Layers className="h-2.5 w-2.5 shrink-0 opacity-80" />
                          )}
                          <span className="font-mono tabular-nums opacity-80 text-[10px]">
                            {fmtHour(b.startHour)}
                          </span>
                          <span className="truncate font-medium">{b.title}</span>
                          {b.recurring && b.recurring !== "none" && (
                            <Repeat className="h-2.5 w-2.5 ml-auto opacity-70 shrink-0" />
                          )}
                          {b.status === "conflict" && (
                            <AlertTriangle className="h-2.5 w-2.5 text-destructive shrink-0" />
                          )}
                        </span>
                      ))}
                      {dayBlocks.length > 4 && (
                        <span className="text-[10px] text-muted-foreground px-1">
                          +{dayBlocks.length - 4} more
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function chipStyles(b: ScheduleBlock) {
  if (b.status === "conflict") return "bg-slot-conflict text-slot-conflict-foreground border border-destructive/40";
  if (b.status === "blocked") return "bg-slot-blocked text-slot-blocked-foreground border border-border";
  if (b.type === "program") return "bg-slot-program text-slot-program-foreground border border-white/10";
  return "bg-slot-adpack text-slot-adpack-foreground border border-white/10";
}

function fmtHour(h: number) {
  const hh = Math.floor(h);
  const mm = Math.round((h - hh) * 60);
  return `${String(hh).padStart(2, "0")}:${String(mm).padStart(2, "0")}`;
}

function isSameDay(a: Date, b: Date) {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}
