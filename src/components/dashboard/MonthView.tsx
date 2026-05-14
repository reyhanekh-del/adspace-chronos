import { cn } from "@/lib/utils";
import { ScheduleBlock } from "@/lib/schedule-data";
import { AlertTriangle } from "lucide-react";

type Props = {
  monthDate: Date;
  blocks: ScheduleBlock[];
  onPickDay: (d: Date) => void;
};

const WD = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

function appearsOnDate(b: ScheduleBlock, date: Date) {
  const r = b.recurring ?? "none";
  const dow = (date.getDay() + 6) % 7; // 0=Mon..6=Sun
  if (r === "daily") return true;
  if (r === "weekdays") return dow <= 4;
  if (r === "weekly") return dow === 0; // anchor on Mondays for demo
  // none → only the anchor day (1st of month for demo)
  return date.getDate() === 1;
}

export function MonthView({ monthDate, blocks, onPickDay }: Props) {
  const year = monthDate.getFullYear();
  const month = monthDate.getMonth();
  const first = new Date(year, month, 1);
  const startOffset = (first.getDay() + 6) % 7; // Mon-start
  const gridStart = new Date(year, month, 1 - startOffset);
  const cells: Date[] = Array.from({ length: 42 }, (_, i) => {
    const d = new Date(gridStart);
    d.setDate(gridStart.getDate() + i);
    return d;
  });

  const today = new Date();

  return (
    <div className="flex-1 min-w-0 flex flex-col bg-background overflow-hidden">
      <div className="grid grid-cols-7 border-b bg-card/40 backdrop-blur-sm sticky top-0 z-20">
        {WD.map((d) => (
          <div
            key={d}
            className="px-3 py-2.5 text-[11px] uppercase tracking-wider font-semibold text-muted-foreground border-r last:border-r-0"
          >
            {d}
          </div>
        ))}
      </div>

      <div className="flex-1 overflow-auto">
        <div className="grid grid-cols-7 grid-rows-6 h-full min-h-[600px]">
          {cells.map((d, i) => {
            const inMonth = d.getMonth() === month;
            const isToday =
              d.getFullYear() === today.getFullYear() &&
              d.getMonth() === today.getMonth() &&
              d.getDate() === today.getDate();
            const dayBlocks = blocks.filter((b) => appearsOnDate(b, d));
            const programs = dayBlocks.filter((b) => b.type === "program").length;
            const adpacks = dayBlocks.filter((b) => b.type === "adpack").length;
            const conflicts = dayBlocks.filter((b) => b.status === "conflict").length;

            return (
              <button
                key={i}
                onClick={() => onPickDay(d)}
                className={cn(
                  "border-r border-b last:border-r-0 p-2 text-left flex flex-col gap-1 hover:bg-accent/30 transition-colors min-h-[100px]",
                  !inMonth && "bg-muted/20 text-muted-foreground/60"
                )}
              >
                <div className="flex items-center justify-between">
                  <span
                    className={cn(
                      "inline-flex items-center justify-center text-xs font-mono tabular-nums h-6 w-6 rounded-full",
                      isToday && "bg-primary text-primary-foreground font-semibold"
                    )}
                  >
                    {d.getDate()}
                  </span>
                  {conflicts > 0 && (
                    <span className="inline-flex items-center gap-0.5 text-[10px] text-destructive font-medium">
                      <AlertTriangle className="h-2.5 w-2.5" />
                      {conflicts}
                    </span>
                  )}
                </div>

                <div className="flex flex-col gap-0.5 mt-auto">
                  {programs > 0 && (
                    <div className="flex items-center gap-1.5">
                      <span className="h-1.5 w-1.5 rounded-full bg-slot-program" />
                      <span className="text-[10px] text-muted-foreground">
                        {programs} program{programs !== 1 && "s"}
                      </span>
                    </div>
                  )}
                  {adpacks > 0 && (
                    <div className="flex items-center gap-1.5">
                      <span className="h-1.5 w-1.5 rounded-full bg-slot-adpack" />
                      <span className="text-[10px] text-muted-foreground">
                        {adpacks} adpack{adpacks !== 1 && "s"}
                      </span>
                    </div>
                  )}
                  {dayBlocks.length > 0 && (
                    <div className="mt-1 h-1 rounded-full bg-muted overflow-hidden flex">
                      {programs > 0 && (
                        <div
                          className="h-full bg-slot-program"
                          style={{ width: `${(programs / dayBlocks.length) * 100}%` }}
                        />
                      )}
                      {adpacks > 0 && (
                        <div
                          className="h-full bg-slot-adpack"
                          style={{ width: `${(adpacks / dayBlocks.length) * 100}%` }}
                        />
                      )}
                    </div>
                  )}
                </div>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
