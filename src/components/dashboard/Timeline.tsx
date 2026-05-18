import { useRef, useState } from "react";
import { cn } from "@/lib/utils";
import {
  Screen,
  ScheduleBlock,
  ScheduleType,
  ScreenTimelineLane,
  blockLaneKey,
  blocksForTimelineLane,
  getScreenTimelineLanes,
} from "@/lib/schedule-data";
import { scheduleBlockSurfaceClasses } from "@/lib/schedule-block-styles";
import {
  SCREEN_ROW_STICKY_W,
  SCREEN_ROW_RIBBON_W,
  screenRowHeight,
} from "@/lib/screen-row-layout";
import { ScreenRowSidebar } from "@/components/dashboard/ScreenRowSidebar";
import type { ScheduleCreateDraft } from "@/lib/schedule-create-draft";
import { hourOverlapsBlock } from "@/lib/schedule-create-draft";
import { Plus, Repeat, Layers, Tv } from "lucide-react";

const HOURS = Array.from({ length: 24 }, (_, i) => i);
const HOUR_W = 64;
const TRACK_H = 60;

type Props = {
  screens: Screen[];
  blocks: ScheduleBlock[];
  selectedId: string | null;
  onSelect: (b: ScheduleBlock) => void;
  onMove: (id: string, screenId: string, startHour: number, laneKey: string) => void;
  onScheduleEmpty?: (draft: ScheduleCreateDraft) => void;
};

type DragState = {
  id: string;
  offsetHours: number;
  laneKey: string;
};

type HoverState = {
  screenId: string;
  hour: number;
  laneKey: string;
};

export function Timeline({ screens, blocks, selectedId, onSelect, onMove, onScheduleEmpty }: Props) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [drag, setDrag] = useState<DragState | null>(null);
  const [hover, setHover] = useState<HoverState | null>(null);

  const totalW = HOUR_W * 24;

  const onDragStart = (e: React.DragEvent, b: ScheduleBlock, screen: Screen) => {
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    const offsetX = e.clientX - rect.left;
    const offsetHours = offsetX / HOUR_W;
    setDrag({ id: b.id, offsetHours, laneKey: blockLaneKey(b, screen) });
    e.dataTransfer.effectAllowed = "move";
  };

  const onTrackDragOver = (e: React.DragEvent, screenId: string, laneKey: string) => {
    e.preventDefault();
    if (!drag || drag.laneKey !== laneKey) return;
    const x = e.clientX - (e.currentTarget as HTMLElement).getBoundingClientRect().left;
    const hour = Math.max(0, Math.min(23, Math.round((x / HOUR_W - drag.offsetHours) * 2) / 2));
    setHover({ screenId, hour, laneKey });
  };

  const onTrackDrop = (e: React.DragEvent, screenId: string, laneKey: string) => {
    e.preventDefault();
    if (!drag || !hover || hover.laneKey !== laneKey || hover.screenId !== screenId) return;
    onMove(drag.id, screenId, hover.hour, laneKey);
    setDrag(null);
    setHover(null);
  };

  return (
    <div className="flex-1 min-w-0 flex flex-col bg-background">
      {/* Sticky time axis */}
      <div className="flex border-b bg-card/40 backdrop-blur-sm sticky top-0 z-20">
        <div
          className={cn(
            SCREEN_ROW_STICKY_W,
            "shrink-0 border-r px-4 py-3 text-[11px] uppercase tracking-wider font-semibold text-muted-foreground flex items-center gap-1.5"
          )}
        >
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
            const lanes = getScreenTimelineLanes(screen);
            const rowH = screenRowHeight(lanes.length, TRACK_H);

            return (
              <div key={screen.id} className="flex border-b last:border-b-0 group/row">
                <div
                  className={cn(
                    SCREEN_ROW_STICKY_W,
                    "shrink-0 border-r sticky left-0 z-20 flex bg-card shadow-[2px_0_8px_-2px_rgba(0,0,0,0.06)]"
                  )}
                >
                  <ScreenRowSidebar screen={screen} height={rowH} />
                  <div className={cn(SCREEN_ROW_RIBBON_W, "shrink-0 flex flex-col")}>
                    {lanes.map((lane, li) => (
                      <TimelineLaneRibbon
                        key={lane.laneKey}
                        lane={lane}
                        trackH={TRACK_H}
                        isLastRibbon={li === lanes.length - 1}
                      />
                    ))}
                  </div>
                </div>

                <div className="flex flex-col" style={{ width: totalW }}>
                  {lanes.map((lane, li) => (
                    <TimelineTrack
                      key={lane.laneKey}
                      laneKey={lane.laneKey}
                      laneKind={lane.kind}
                      screenId={screen.id}
                      blocks={blocksForTimelineLane(blocks, screen.id, lane)}
                      allBlocks={blocks}
                      hourW={HOUR_W}
                      trackH={TRACK_H}
                      totalW={totalW}
                      selectedId={selectedId}
                      drag={drag}
                      hover={hover}
                      compactAd={lane.kind === "adpack"}
                      onSelect={onSelect}
                      onDragStart={(e, b) => onDragStart(e, b, screen)}
                      onDragOver={(e) => onTrackDragOver(e, screen.id, lane.laneKey)}
                      onDrop={(e) => onTrackDrop(e, screen.id, lane.laneKey)}
                      isLastTrack={li === lanes.length - 1}
                      onScheduleEmpty={onScheduleEmpty}
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

function TimelineLaneRibbon({
  lane,
  trackH,
  isLastRibbon,
}: {
  lane: ScreenTimelineLane;
  trackH: number;
  isLastRibbon: boolean;
}) {
  const isProgram = lane.kind === "program";

  return (
    <div
      className={cn(
        "px-1.5 flex flex-col justify-center border-b border-border/50 gap-0.5",
        isProgram ? "bg-lane-program" : "bg-lane-ad",
        isLastRibbon && "border-b-0"
      )}
      style={{ height: trackH }}
    >
      <div
        className={cn(
          "flex items-center gap-1 text-[9px] font-semibold leading-tight",
          isProgram ? "text-slot-program" : "text-slot-adpack"
        )}
      >
        {isProgram ? <Tv className="h-3 w-3 shrink-0" /> : <Layers className="h-3 w-3 shrink-0" />}
        <span className="uppercase tracking-wide truncate">{lane.labelTitle}</span>
      </div>
    </div>
  );
}

function TimelineTrack({
  laneKey,
  laneKind,
  screenId,
  blocks,
  allBlocks,
  hourW,
  trackH,
  totalW,
  selectedId,
  drag,
  hover,
  compactAd,
  onSelect,
  onDragStart,
  onDragOver,
  onDrop,
  isLastTrack,
  onScheduleEmpty,
}: {
  laneKey: string;
  laneKind: ScheduleType;
  screenId: string;
  blocks: ScheduleBlock[];
  allBlocks: ScheduleBlock[];
  hourW: number;
  trackH: number;
  totalW: number;
  selectedId: string | null;
  drag: DragState | null;
  hover: HoverState | null;
  compactAd?: boolean;
  onSelect: (b: ScheduleBlock) => void;
  onDragStart: (e: React.DragEvent, b: ScheduleBlock) => void;
  onDragOver: (e: React.DragEvent) => void;
  onDrop: (e: React.DragEvent) => void;
  isLastTrack?: boolean;
  onScheduleEmpty?: (draft: ScheduleCreateDraft) => void;
}) {
  const draggedBlock = drag ? allBlocks.find((b) => b.id === drag.id) : null;
  const [emptyHoverHour, setEmptyHoverHour] = useState<number | null>(null);

  const handleEmptyClick = (hour: number) => {
    if (!onScheduleEmpty || drag || hourOverlapsBlock(blocks, hour)) return;
    onScheduleEmpty({
      screenId,
      laneKey,
      scheduleType: laneKind,
      startHour: hour,
      endHour: Math.min(24, hour + 1),
    });
  };

  return (
    <div
      className={cn(
        "relative overflow-hidden",
        laneKind === "program" ? "bg-lane-program" : "bg-lane-ad",
        !isLastTrack && "border-b border-border/40"
      )}
      style={{ width: totalW, height: trackH }}
      onDragOver={onDragOver}
      onDrop={onDrop}
      onMouseLeave={() => setEmptyHoverHour(null)}
    >
      <div className="absolute inset-0 flex z-0">
        {HOURS.map((h) => {
          const empty = !hourOverlapsBlock(blocks, h);
          const hovered = empty && emptyHoverHour === h && !drag;
          return (
            <button
              key={h}
              type="button"
              disabled={!empty || !onScheduleEmpty}
              aria-label={
                empty
                  ? `Schedule ${laneKind === "program" ? "program" : "ad"} at ${fmtHour(h)}`
                  : undefined
              }
              className={cn(
                "h-full border-r border-transparent transition-colors relative",
                h % 6 === 0 && "border-border/40",
                empty &&
                  onScheduleEmpty &&
                  !drag &&
                  "cursor-pointer hover:bg-primary/12 hover:border-primary/30",
                hovered && "bg-primary/15 border-primary/40"
              )}
              style={{ width: hourW }}
              onMouseEnter={() => empty && !drag && setEmptyHoverHour(h)}
              onClick={() => handleEmptyClick(h)}
            >
              {hovered && (
                <span className="absolute inset-x-0 top-1/2 -translate-y-1/2 flex justify-center pointer-events-none px-0.5">
                  <span className="inline-flex items-center gap-0.5 rounded bg-primary text-primary-foreground text-[8px] font-semibold px-1 py-0.5 shadow-sm whitespace-nowrap">
                    <Plus className="h-2.5 w-2.5" />
                    Schedule
                  </span>
                </span>
              )}
            </button>
          );
        })}
      </div>

      <div className="absolute inset-0 flex pointer-events-none z-[1]">
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
        hover.laneKey === laneKey &&
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
          compact={!!compactAd}
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
        "absolute top-1.5 bottom-1.5 z-[2] rounded-md text-left px-2 py-1 transition-all overflow-hidden group/block",
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
              className="h-full rounded-full bg-current"
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
  return scheduleBlockSurfaceClasses(b);
}

function fmtHour(h: number) {
  const hh = Math.floor(h);
  const mm = Math.round((h - hh) * 60);
  return `${String(hh).padStart(2, "0")}:${String(mm).padStart(2, "0")}`;
}
