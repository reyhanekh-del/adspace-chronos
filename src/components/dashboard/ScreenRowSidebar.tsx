import { cn } from "@/lib/utils";
import type { Screen } from "@/lib/schedule-data";
import { screenAdModeLabel } from "@/lib/screen-row-layout";

type Props = {
  screen: Screen;
  height: number;
  className?: string;
};

export function ScreenRowSidebar({ screen, height, className }: Props) {
  return (
    <div
      className={cn(
        "flex-1 min-w-0 min-h-0 overflow-hidden flex flex-col justify-center gap-0.5",
        "border-r border-border/40 bg-card px-3 py-2",
        className
      )}
      style={{ height }}
    >
      <div className="flex items-center gap-1.5 min-w-0">
        <span
          className={cn(
            "h-1.5 w-1.5 rounded-full shrink-0",
            screen.online ? "bg-emerald-500" : "bg-muted-foreground/40"
          )}
        />
        <span className="font-medium text-sm truncate leading-tight">{screen.name}</span>
      </div>
      <p className="text-[10px] text-muted-foreground truncate leading-tight pl-3">
        {screen.location}
        <span className="opacity-70"> · {screen.resolution}</span>
      </p>
      <p
        className={cn(
          "text-[10px] truncate leading-tight pl-3",
          screen.adSupported ? "text-primary font-medium" : "text-muted-foreground"
        )}
      >
        {screenAdModeLabel(screen)}
      </p>
    </div>
  );
}
