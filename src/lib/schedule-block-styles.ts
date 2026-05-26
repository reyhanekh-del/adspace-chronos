import type { ScheduleBlock } from "@/lib/schedule-data";
import { cn } from "@/lib/utils";

/** Calendar blocks: program = blue (ad-supported) or teal (ad-free), adpack = yellow. */
export function scheduleBlockSurfaceClasses(block: ScheduleBlock, adSupported?: boolean) {
  if (block.type === "program") {
    const adFree = adSupported === false;
    return {
      bg: adFree ? "bg-slot-program-adfree" : "bg-slot-program",
      text: adFree ? "text-slot-program-adfree-foreground" : "text-slot-program-foreground",
      border: adFree
        ? "border border-slot-program-adfree/20"
        : "border border-slot-program/20",
    };
  }
  return {
    bg: "bg-slot-adpack",
    text: "text-slot-adpack-foreground",
    border: "border border-slot-adpack/30",
  };
}

export function scheduleBlockChipClasses(
  block: ScheduleBlock,
  adSupported?: boolean,
  selected?: boolean
) {
  const s = scheduleBlockSurfaceClasses(block, adSupported);
  return cn(s.bg, s.text, s.border, selected && "ring-2 ring-ring");
}

export function programSlotClasses(adSupported: boolean) {
  const adFree = !adSupported;
  return adFree
    ? "bg-slot-program-adfree text-slot-program-adfree-foreground"
    : "bg-slot-program text-slot-program-foreground";
}
