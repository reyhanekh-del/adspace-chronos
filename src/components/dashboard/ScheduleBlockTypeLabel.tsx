import { cn } from "@/lib/utils";
import type { AdBandCount, ScheduleBlock } from "@/lib/schedule-data";
import { scheduleBlockTypeLabel } from "@/lib/schedule-block-labels";

type Props = {
  block: ScheduleBlock;
  adSupported: boolean;
  screenBands?: AdBandCount;
  bandMismatch?: boolean;
  className?: string;
};

export function ScheduleBlockTypeLabel({
  block,
  adSupported,
  screenBands,
  bandMismatch = false,
  className,
}: Props) {
  const label = scheduleBlockTypeLabel(block, adSupported, screenBands);
  if (!label) return null;

  const isProgram = block.type === "program";

  return (
    <span
      className={cn(
        "absolute top-0.5 right-0.5 z-[3] pointer-events-none",
        "inline-flex max-w-[48%] items-center rounded px-1 py-px",
        "text-[8px] font-bold leading-tight tracking-tight shadow-sm truncate",
        bandMismatch
          ? "bg-orange-500 text-white ring-1 ring-orange-600"
          : isProgram
            ? "bg-white text-slot-program"
            : "bg-amber-950/90 text-amber-50",
        className
      )}
    >
      {label}
    </span>
  );
}
