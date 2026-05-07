import { useRef, useState } from "react";
import { cn } from "@/lib/utils";
import { Screen, ScheduleBlock } from "@/lib/schedule-data";
import { AlertTriangle, Repeat, Layers, Tv } from "lucide-react";

const HOURS = Array.from({ length: 24 }, (_, i) => i);
const HOUR_W = 64; // px per hour
const ROW_H = 88;

type Props = {
  screens: Screen[];
  blocks: ScheduleBlock[];
  selectedId: string | null;
  onSelect: (b: ScheduleBlock) => void;
  onMove: (id: string, screenId: string, startHour: number) => void;
};

export function Timeline({ screens, blocks, selectedId, onSelect, onMove }: Props) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [drag, setDrag] = useState<{ id: string; offsetHours: number } | null>(null);
  const [hover, setHover] = useState<{ screenId: string; hour: number } | null>(null);

  const totalW = HOUR_W * 24;

  const onDragStart = (e: React.DragEvent, b: ScheduleBlock) => {
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    const offsetX = e.clientX - rect.left;
    const offsetHours = offsetX / HOUR_W;
    setDrag({ id: b.id, offsetHours });
    e.dataTransfer.effectAllowed = "move";
  };

  const onRowDragOver = (e: React.DragEvent, screenId: string) => {
    e.preventDefault();
    if (!drag) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left + (e.currentTarget as HTMLElement).scrollLeft;
    const hour = Math.max(0, Math.min(23, Math.round((x / HOUR_W - drag.offsetHours) * 2) / 2));
    setHover({ screenId, hour });
  };

  const onRowDrop = (e: React.DragEvent, screenId: string) => {
    e.preventDefault();
    if (!drag || !hover) return;
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

      {/* Rows */}
      <div ref={scrollRef} className="flex-1 overflow-auto timeline-scroll">
        <div className="flex flex-col">
          {screens.map((screen) => {
            const screenBlocks = blocks.filter((b) => b.screenId === screen.id);
            return (
              <div key={screen.id} className="flex border-b last:border-b-0 group/row">
                {/* Row label */}
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

                {/* Track */}
                <div
                  className="relative timeline-grid-bg"
                  style={{ width: totalW, height: ROW_H }}
                  onDragOver={(e) => onRowDragOver(e, screen.id)}
                  onDrop={(e) => onRowDrop(e, screen.id)}
                >
                  {/* Hour grid lines (vertical) */}
                  <div className="absolute inset-0 flex pointer-events-none">
                    {HOURS.map((h) => (
                      <div
                        key={h}
                        className={cn(
                          "border-r border-border/40 h-full",
                          h % 6 === 0 && "border-border/80"
                        )}
                        style={{ width: HOUR_W }}
                      />
                    ))}
                  </div>

                  {/* Drop preview */}
                  {drag && hover && hover.screenId === screen.id && (
                    <div
                      className="absolute top-2 bottom-2 rounded-lg border-2 border-dashed border-primary/60 bg-primary/10 pointer-events-none"
                      style={{
                        left: hover.hour * HOUR_W,
                        width: ((blocks.find((b) => b.id === drag.id)?.endHour ?? 1) -
                          (blocks.find((b) => b.id === drag.id)?.startHour ?? 0)) *
                          HOUR_W,
                      }}
                    />
                  )}

                  {/* Blocks */}
                  {screenBlocks.map((b) => (
                    <Block
                      key={b.id}
                      block={b}
                      hourW={HOUR_W}
                      selected={selectedId === b.id}
                      onClick={() => onSelect(b)}
                      onDragStart={(e) => onDragStart(e, b)}
                    />
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function Block({
  block,
  hourW,
  selected,
  onClick,
  onDragStart,
}: {
  block: ScheduleBlock;
  hourW: number;
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
        "absolute top-2 bottom-2 rounded-lg text-left px-2.5 py-1.5 transition-all overflow-hidden group/block",
        "shadow-sm hover:shadow-md hover:-translate-y-0.5 active:translate-y-0 cursor-grab active:cursor-grabbing",
        styles.bg,
        styles.text,
        styles.border,
        selected && "ring-2 ring-ring ring-offset-2 ring-offset-background z-10"
      )}
      style={{ left, width }}
    >
      <div className="flex items-center gap-1.5 min-w-0">
        {block.type === "program" ? (
          <Tv className="h-3 w-3 shrink-0 opacity-80" />
        ) : (
          <Layers className="h-3 w-3 shrink-0 opacity-80" />
        )}
        <span className="text-[12px] font-semibold truncate flex-1">{block.title}</span>
        {block.recurring && block.recurring !== "none" && (
          <Repeat className="h-3 w-3 shrink-0 opacity-70" />
        )}
        {block.status === "conflict" && (
          <AlertTriangle className="h-3 w-3 shrink-0 text-destructive" />
        )}
      </div>
      <div className="text-[10px] opacity-80 mt-0.5 font-mono tabular-nums">
        {fmtHour(block.startHour)} – {fmtHour(block.endHour)}
        {block.client && <span className="ml-1.5 opacity-90">· {block.client}</span>}
      </div>

      {block.type === "adpack" && block.occupancy !== undefined && (
        <div className="mt-1.5 flex items-center gap-1.5">
          <div className="flex-1 h-1.5 rounded-full bg-black/15 dark:bg-white/15 overflow-hidden">
            <div
              className={cn(
                "h-full rounded-full",
                block.occupancy > 100 ? "bg-destructive" : "bg-current"
              )}
              style={{ width: `${Math.min(100, block.occupancy)}%`, opacity: 0.85 }}
            />
          </div>
          <span className="text-[10px] font-mono tabular-nums opacity-90">
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
      bg: "bg-slot-blocked bg-[repeating-linear-gradient(45deg,transparent_0_6px,rgba(0,0,0,0.06)_6px_12px)]",
      text: "text-slot-blocked-foreground",
      border: "border border-border",
    };
  }
  if (b.type === "program") {
    return {
      bg: "bg-slot-program",
      text: "text-slot-program-foreground",
      border: "border border-white/10",
    };
  }
  return {
    bg: "bg-slot-adpack",
    text: "text-slot-adpack-foreground",
    border: "border border-white/10",
  };
}

function fmtHour(h: number) {
  const hh = Math.floor(h);
  const mm = Math.round((h - hh) * 60);
  return `${String(hh).padStart(2, "0")}:${String(mm).padStart(2, "0")}`;
}
