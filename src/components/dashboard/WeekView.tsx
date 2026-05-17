import { cn } from "@/lib/utils";
import { Screen, ScheduleBlock, ScheduleType } from "@/lib/schedule-data";
import { blockAppearsOnDate } from "@/lib/program-schedule";
import { Layers, Tv, AlertTriangle, Repeat } from "lucide-react";

type Props = {
  weekStart: Date; // Monday
  screens: Screen[];
  blocks: ScheduleBlock[];
  selectedId: string | null;
  onSelect: (b: ScheduleBlock) => void;
  onPickDay: (d: Date) => void;
};

type Lane = ScheduleType;

const DAY_LABEL = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const DAY_W = 168;
const LANE_H = 56;
const MAX_CHIPS = 2;

function appearsOnDay(b: ScheduleBlock, day: Date) {
  return blockAppearsOnDate(b, day);
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
      <div className="flex border-b bg-card sticky top-0 z-20">
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
              <div className="w-56 shrink-0 border-r sticky left-0 z-20 flex bg-card shadow-[2px_0_8px_-2px_rgba(0,0,0,0.06)]">
                <div
                  className="flex-1 min-w-0 px-4 flex flex-col justify-center border-r border-border/40 bg-card"
                  style={{ height: LANE_H * 2 }}
                >
                  <div className="flex items-center gap-2">
                    <span
                      className={cn(
                        "h-2 w-2 rounded-full shrink-0",
                        screen.online ? "bg-emerald-500" : "bg-muted-foreground/40"
                      )}
                    />
                    <div className="font-medium text-sm truncate">{screen.name}</div>
                  </div>
                  <div className="text-[11px] text-muted-foreground mt-0.5 ml-4 truncate">
                    {screen.location} · {screen.resolution}
                  </div>
                </div>
                <div className="w-14 shrink-0 flex flex-col">
                  <LaneLabel lane="program" />
                  <LaneLabel lane="adpack" />
                </div>
              </div>

              <div className="flex flex-col" style={{ width: totalW }}>
                <div className="flex">
                  {days.map((d, i) => (
                    <DayLaneCell
                      key={`${screen.id}-program-${i}`}
                      lane="program"
                      day={d}
                      dayIdx={i}
                      screenId={screen.id}
                      blocks={blocks}
                      selectedId={selectedId}
                      onSelect={onSelect}
                      onPickDay={onPickDay}
                    />
                  ))}
                </div>
                <div className="flex">
                  {days.map((d, i) => (
                    <DayLaneCell
                      key={`${screen.id}-adpack-${i}`}
                      lane="adpack"
                      day={d}
                      dayIdx={i}
                      screenId={screen.id}
                      blocks={blocks}
                      selectedId={selectedId}
                      onSelect={onSelect}
                      onPickDay={onPickDay}
                      isLast
                    />
                  ))}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function LaneLabel({ lane }: { lane: Lane }) {
  const isProgram = lane === "program";

  return (
    <div
      className={cn(
        "px-2 flex flex-col justify-center border-b border-border/50 last:border-b-0",
        isProgram ? "bg-lane-program" : "bg-lane-ad"
      )}
      style={{ height: LANE_H }}
    >
      <div
        className={cn(
          "flex flex-col items-center gap-0.5 text-[9px] uppercase tracking-wider font-semibold leading-tight text-center",
          isProgram ? "text-slot-program" : "text-slot-adpack"
        )}
      >
        {isProgram ? <Tv className="h-3 w-3 shrink-0" /> : <Layers className="h-3 w-3 shrink-0" />}
        {isProgram ? "Programs" : "Ads"}
      </div>
    </div>
  );
}

function DayLaneCell({
  lane,
  day,
  dayIdx,
  screenId,
  blocks,
  selectedId,
  onSelect,
  onPickDay,
  isLast,
}: {
  lane: Lane;
  day: Date;
  dayIdx: number;
  screenId: string;
  blocks: ScheduleBlock[];
  selectedId: string | null;
  onSelect: (b: ScheduleBlock) => void;
  onPickDay: (d: Date) => void;
  isLast?: boolean;
}) {
  const isProgram = lane === "program";
  const dayBlocks = blocks
    .filter(
      (b) =>
        b.screenId === screenId &&
        b.type === lane &&
        appearsOnDay(b, day)
    )
    .sort((a, b) => a.startHour - b.startHour);

  return (
    <button
      onClick={() => onPickDay(day)}
      className={cn(
        "border-r last:border-r-0 px-1.5 py-1 text-left align-top hover:bg-accent/20 transition-colors flex flex-col gap-0.5 overflow-hidden",
        isProgram ? "bg-lane-program" : "bg-lane-ad",
        !isLast && "border-b border-border/40"
      )}
      style={{ width: DAY_W, height: LANE_H }}
    >
      {dayBlocks.length === 0 ? (
        <span className="text-[10px] text-muted-foreground/50 px-0.5">—</span>
      ) : (
        <>
          {dayBlocks.slice(0, MAX_CHIPS).map((b) => (
            <BlockChip
              key={b.id}
              block={b}
              selected={selectedId === b.id}
              onSelect={onSelect}
            />
          ))}
          {dayBlocks.length > MAX_CHIPS && (
            <span className="text-[9px] text-muted-foreground px-0.5">
              +{dayBlocks.length - MAX_CHIPS} more
            </span>
          )}
        </>
      )}
    </button>
  );
}

function BlockChip({
  block,
  selected,
  onSelect,
}: {
  block: ScheduleBlock;
  selected: boolean;
  onSelect: (b: ScheduleBlock) => void;
}) {
  return (
    <span
      onClick={(e) => {
        e.stopPropagation();
        onSelect(block);
      }}
      className={cn(
        "rounded px-1 py-0.5 text-[10px] flex items-center gap-0.5 cursor-pointer transition-shadow hover:shadow-sm min-w-0",
        chipStyles(block),
        selected && "ring-2 ring-ring"
      )}
    >
      {block.type === "program" ? (
        <Tv className="h-2.5 w-2.5 shrink-0 opacity-80" />
      ) : (
        <Layers className="h-2.5 w-2.5 shrink-0 opacity-80" />
      )}
      <span className="font-mono tabular-nums opacity-80 shrink-0 text-[9px]">
        {fmtHour(block.startHour)} – {fmtHour(block.endHour)}
      </span>
      <span className="truncate font-medium">{block.title}</span>
      {block.recurring && block.recurring !== "none" && (
        <Repeat className="h-2 w-2 ml-auto opacity-70 shrink-0" />
      )}
      {block.status === "conflict" && (
        <AlertTriangle className="h-2 w-2 text-destructive shrink-0" />
      )}
    </span>
  );
}

function chipStyles(b: ScheduleBlock) {
  if (b.status === "conflict")
    return "bg-slot-conflict text-slot-conflict-foreground border border-destructive/40";
  if (b.status === "blocked")
    return "bg-slot-blocked text-slot-blocked-foreground border border-border";
  if (b.type === "program")
    return "bg-slot-program text-slot-program-foreground border border-slot-program/20";
  return "bg-slot-adpack text-slot-adpack-foreground border border-slot-adpack/30";
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
