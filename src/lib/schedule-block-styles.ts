import type { ScheduleBlock } from "@/lib/schedule-data";
import { cn } from "@/lib/utils";

/** Calendar blocks: program = blue, adpack = yellow (status does not change fill). */
export function scheduleBlockSurfaceClasses(block: ScheduleBlock) {
  if (block.type === "program") {
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

export function scheduleBlockChipClasses(block: ScheduleBlock, selected?: boolean) {
  const s = scheduleBlockSurfaceClasses(block);
  return cn(s.bg, s.text, s.border, selected && "ring-2 ring-ring");
}
