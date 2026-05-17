import { useRef, useState } from "react";
import { cn } from "@/lib/utils";
import { Screen, ScheduleBlock, ScheduleType } from "@/lib/schedule-data";
import { AlertTriangle, Repeat, Layers, Tv } from "lucide-react";

const HOURS = Array.from({ length: 24 }, (_, i) => i);
const HOUR_W = 64;
const TRACK_H = 60;

type Lane = ScheduleType;

type Props = {
  screens: Screen[];
  blocks: ScheduleBlock[];
  selectedId: string | null;
  onSelect: (b: ScheduleBlock) => void;
  onMove: (id: string, screenId: string, startHour: number) => void;
};

type DragState = {
  id: string;
  offsetHours: number;
  lane: Lane;
};

type HoverState = {
  screenId: string;
  hour: number;
  lane: Lane;
};

export function Timeline({ screens, blocks, selectedId, onSelect, onMove }: Props) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [drag, setDrag] = useState<DragState | null>(null);
  const [hover, setHover] = useState<HoverState | null>(null);

  const totalW = HOUR_W * 24;

  const onDragStart = (e: React.DragEvent, b: ScheduleBlock) => {
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    const offsetX = e.clientX - rect.left;
    const offsetHours = offsetX / HOUR_W;
    setDrag({ id: b.id, offsetHours, lane: b.type });
    e.dataTransfer.effectAllowed = "move";
  };

  const onTrackDragOver = (e: React.DragEvent, screenId: string, lane: Lane) => {
    e.preventDefault();
    if (!drag || drag.lane !== lane) return;
    const x = e.clientX - (e.currentTarget as HTMLElement).getBoundingClientRect().left;
    const hour = Math.max(0, Math.min(23, Math.round((x / HOUR_W - drag.offsetHours) * 2) / 2));
    setHover({ screenId, hour, lane });
  };

  const onTrackDrop = (e: React.DragEvent, screenId: string, lane: Lane) => {
    e.preventDefault();
    if (!drag || !hover || hover.lane !== lane || hover.screenId !== screenId) return;
    onMove(drag.id, screenId, hover.hour);
    setDrag(null);
    setHover(null);
  };

  return (
    <div className="flex-1 min-w-0 flex flex-col bg-background">
      {/* Sticky time axis */}
      <div className="flex border-b bg-card/40 backdrop-blur-sm sticky top-0 z-20">
        <div className="w-56 shrink-0 border-r px-4 py-3 text-[11px] uppercase tracking-wider font-semibold text-muted-foreground flex items-center gap-1.5">
          <Tv className="h-3.5 w-3.5" />
          Screens
        </div>
        <div className="overflow-hidden flex-1">
          <div className="flex" style={{ width: totalW }}>
            {HOURS.map((h) => (
              <div
                key={h}
                className="text-[11px] text-muted-foreground border-r last:border-r-0 py-2.5 px-2 font-mono tabular-nums"
                style={{ width: HOUR_W }}
              >
                {String(h).padStart(2, "0")}:00
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Screen rows */}
      <div ref={scrollRef} className="flex-1 overflow-auto timeline-scroll">
        <div className="flex flex-col">
          {screens.map((screen) => {
            const programBlocks = blocks.filter(
              (b) => b.screenId === screen.id && b.type === "program"
            );
            const adBlocks = blocks.filter(
              (b) => b.screenId === screen.id && b.type === "adpack"
            );

            return (
              <div key={screen.id} className="flex border-b last:border-b-0 group/row">
                {/* Sticky screen label — spans both lanes */}
                <div className="w-56 shrink-0 border-r sticky left-0 z-20 flex bg-card shadow-[2px_0_8px_-2px_rgba(0,0,0,0.06)]">
                  <div
                    className="flex-1 min-w-0 px-4 flex flex-col justify-center border-r border-border/40 bg-card"
                    style={{ height: TRACK_H * 2 }}
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
                    <LaneLabel lane="program" trackH={TRACK_H} />
                    <LaneLabel lane="adpack" trackH={TRACK_H} />
                  </div>
                </div>

                {/* Tracks */}
                <div className="flex flex-col" style={{ width: totalW }}>
                  <TimelineTrack
                    lane="program"
                    screenId={screen.id}
                    blocks={programBlocks}
                    allBlocks={blocks}
                    hourW={HOUR_W}
                    trackH={TRACK_H}
                    totalW={totalW}
                    selectedId={selectedId}
                    drag={drag}
                    hover={hover}
                    onSelect={onSelect}
                    onDragStart={onDragStart}
                    onDragOver={(e) => onTrackDragOver(e, screen.id, "program")}
                    onDrop={(e) => onTrackDrop(e, screen.id, "program")}
                  />
                  <TimelineTrack
                    lane="adpack"
                    screenId={screen.id}
                    blocks={adBlocks}
                    allBlocks={blocks}
                    hourW={HOUR_W}
                    trackH={TRACK_H}
                    totalW={totalW}
                    selectedId={selectedId}
                    drag={drag}
                    hover={hover}
                    onSelect={onSelect}
                    onDragStart={onDragStart}
                    onDragOver={(e) => onTrackDragOver(e, screen.id, "adpack")}
                    onDrop={(e) => onTrackDrop(e, screen.id, "adpack")}
                    isLast
                  />
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function LaneLabel({ lane, trackH }: { lane: Lane; trackH: number }) {
  const isProgram = lane === "program";

  return (
    <div
      className={cn(
        "px-2 flex flex-col justify-center border-b border-border/50 last:border-b-0",
        isProgram ? "bg-lane-program" : "bg-lane-ad"
      )}
      style={{ height: trackH }}
    >
      <div
        className={cn(
          "flex flex-col items-center gap-0.5 text-[9px] uppercase tracking-wider font-semibold leading-tight text-center",
          isProgram ? "text-slot-program" : "text-slot-adpack"
        )}
      >
        {isProgram ? (
          <Tv className="h-3 w-3 shrink-0" />
        ) : (
          <Layers className="h-3 w-3 shrink-0" />
        )}
        {isProgram ? "Programs" : "Ads"}
      </div>
    </div>
  );
}

function TimelineTrack({
  lane,
  screenId,
  blocks,
  allBlocks,
  hourW,
  trackH,
  totalW,
  selectedId,
  drag,
  hover,
  onSelect,
  onDragStart,
  onDragOver,
  onDrop,
  isLast,
}: {
  lane: Lane;
  screenId: string;
  blocks: ScheduleBlock[];
  allBlocks: ScheduleBlock[];
  hourW: number;
  trackH: number;
  totalW: number;
  selectedId: string | null;
  drag: DragState | null;
  hover: HoverState | null;
  onSelect: (b: ScheduleBlock) => void;
  onDragStart: (e: React.DragEvent, b: ScheduleBlock) => void;
  onDragOver: (e: React.DragEvent) => void;
  onDrop: (e: React.DragEvent) => void;
  isLast?: boolean;
}) {
  const draggedBlock = drag ? allBlocks.find((b) => b.id === drag.id) : null;

  return (
    <div
      className={cn(
        "relative overflow-hidden",
        lane === "program" ? "bg-lane-program" : "bg-lane-ad",
        !isLast && "border-b border-border/40"
      )}
      style={{ width: totalW, height: trackH }}
      onDragOver={onDragOver}
      onDrop={onDrop}
    >
      <div className="absolute inset-0 flex pointer-events-none">
        {HOURS.map((h) => (
          <div
            key={h}
            className={cn(
              "border-r border-border/40 h-full",
              h % 6 === 0 && "border-border/80"
            )}
            style={{ width: hourW }}
          />
        ))}
      </div>

      {drag &&
        hover &&
        hover.screenId === screenId &&
        hover.lane === lane &&
        draggedBlock && (
          <div
            className="absolute top-1.5 bottom-1.5 rounded-md border-2 border-dashed border-primary/60 bg-primary/10 pointer-events-none"
            style={{
              left: hover.hour * hourW,
              width: (draggedBlock.endHour - draggedBlock.startHour) * hourW,
            }}
          />
        )}

      {blocks.map((b) => (
        <Block
          key={b.id}
          block={b}
          hourW={hourW}
          compact={lane === "adpack"}
          selected={selectedId === b.id}
          onClick={() => onSelect(b)}
          onDragStart={(e) => onDragStart(e, b)}
        />
      ))}
    </div>
  );
}

function Block({
  block,
  hourW,
  compact,
  selected,
  onClick,
  onDragStart,
}: {
  block: ScheduleBlock;
  hourW: number;
  compact?: boolean;
  selected: boolean;
  onClick: () => void;
  onDragStart: (e: React.DragEvent) => void;
}) {
  const left = block.startHour * hourW;
  const width = (block.endHour - block.startHour) * hourW;
  const styles = blockStyles(block);

  return (
    <button
      draggable
      onDragStart={onDragStart}
      onClick={onClick}
      className={cn(
        "absolute top-1.5 bottom-1.5 z-[1] rounded-md text-left px-2 py-1 transition-all overflow-hidden group/block",
        "shadow-sm hover:shadow-md hover:-translate-y-0.5 active:translate-y-0 cursor-grab active:cursor-grabbing",
        styles.bg,
        styles.text,
        styles.border,
        selected && "ring-2 ring-ring ring-offset-1 ring-offset-background z-10"
      )}
      style={{ left, width }}
    >
      <div className="flex items-center gap-1 min-w-0">
        {block.type === "program" ? (
          <Tv className="h-3 w-3 shrink-0 opacity-80" />
        ) : (
          <Layers className="h-3 w-3 shrink-0 opacity-80" />
        )}
        <span className="text-[11px] font-semibold truncate flex-1">{block.title}</span>
        {block.recurring && block.recurring !== "none" && (
          <Repeat className="h-2.5 w-2.5 shrink-0 opacity-70" />
        )}
        {block.status === "conflict" && (
          <AlertTriangle className="h-2.5 w-2.5 shrink-0 text-destructive" />
        )}
      </div>
      <div className="text-[9px] opacity-80 font-mono tabular-nums truncate">
        {fmtHour(block.startHour)} – {fmtHour(block.endHour)}
        {block.client && !compact && (
          <span className="ml-1 opacity-90">· {block.client}</span>
        )}
      </div>

      {block.type === "adpack" && block.occupancy !== undefined && (
        <div className="mt-1 flex items-center gap-1">
          <div className="flex-1 h-1 rounded-full bg-black/15 dark:bg-white/15 overflow-hidden">
            <div
              className={cn(
                "h-full rounded-full",
                block.occupancy > 100 ? "bg-destructive" : "bg-current"
              )}
              style={{ width: `${Math.min(100, block.occupancy)}%`, opacity: 0.85 }}
            />
          </div>
          <span className="text-[9px] font-mono tabular-nums opacity-90 shrink-0">
            {block.filledSlots}/{block.totalSlots}
          </span>
        </div>
      )}
    </button>
  );
}

function blockStyles(b: ScheduleBlock) {
  if (b.status === "conflict") {
    return {
      bg: "bg-slot-conflict",
      text: "text-slot-conflict-foreground",
      border: "border border-destructive/40",
    };
  }
  if (b.status === "blocked") {
    return {
      bg: "bg-slot-blocked",
      text: "text-slot-blocked-foreground",
      border: "border border-border",
    };
  }
  if (b.type === "program") {
    return {
      bg: "bg-slot-program",
      text: "text-slot-program-foreground",
      border: "border border-slot-program/20",
    };
  }
  return {
    bg: "bg-slot-adpack",
    text: "text-slot-adpack-foreground",
    border: "border border-slot-adpack/30",
  };
}

function fmtHour(h: number) {
  const hh = Math.floor(h);
  const mm = Math.round((h - hh) * 60);
  return `${String(hh).padStart(2, "0")}:${String(mm).padStart(2, "0")}`;
}
