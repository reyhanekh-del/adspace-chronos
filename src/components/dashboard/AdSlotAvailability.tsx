import { ScheduleBlock, Screen, resolveAdSlotAvailability } from "@/lib/schedule-data";
import { cn } from "@/lib/utils";

type Props = {
  block: ScheduleBlock;
  screen: Screen | null;
};

export function AdSlotAvailability({ block, screen }: Props) {
  const view = resolveAdSlotAvailability(block, screen);
  if (!view) return null;

  const remaining = Math.max(0, 100 - view.occupancy);

  return (
    <div>
      <div className="flex items-start justify-between gap-3 mb-3">
        <div className="min-w-0">
          <label className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
            Slot Availability
          </label>
          <p className="text-sm font-semibold text-foreground mt-0.5">{view.bandHeading}</p>
          <p className="text-[11px] text-muted-foreground">{view.capacityLine}</p>
        </div>
        <span className="text-[11px] font-mono tabular-nums text-muted-foreground shrink-0 pt-0.5">
          {view.filledSlots}/{view.totalSlots}
        </span>
      </div>

      <div className="h-2.5 rounded-full bg-muted overflow-hidden">
        <div
          className="h-full rounded-full bg-slot-adpack transition-all"
          style={{ width: `${Math.min(100, view.occupancy)}%` }}
        />
      </div>

      <div className="mt-3 space-y-2.5">
        {view.groups.map((group) => (
          <div key={group.band}>
            {view.bandCount > 1 && (
              <div className="flex items-center justify-between mb-1">
                <span className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                  Band {group.band}
                </span>
                <span className="text-[10px] font-mono tabular-nums text-muted-foreground">
                  {group.filled}/{group.total}
                </span>
              </div>
            )}
            <div className="grid grid-cols-6 gap-0.5">
              {Array.from({ length: group.total }).map((_, i) => (
                <div
                  key={i}
                  className={cn(
                    "h-3 rounded-sm",
                    i < group.filled ? "bg-slot-adpack" : "bg-muted"
                  )}
                  title={`Band ${group.band} · slot ${i + 1}`}
                />
              ))}
            </div>
          </div>
        ))}
      </div>

      <p className="text-xs text-muted-foreground mt-2">
        {view.occupancy > 100
          ? `Overbooked by ${(view.occupancy - 100).toFixed(0)}%`
          : `${remaining.toFixed(0)}% capacity remaining`}
      </p>
    </div>
  );
}
