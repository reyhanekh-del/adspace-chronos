import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  ConflictOverlap,
  formatOverlapLine,
} from "@/lib/schedule-conflicts";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  programName: string;
  patternLabel?: string;
  overlaps: ConflictOverlap[];
};

export function ConflictOverlapsModal({
  open,
  onOpenChange,
  programName,
  patternLabel,
  overlaps,
}: Props) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md max-h-[85vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="font-display text-base">
            Overlapping dates
          </DialogTitle>
          <DialogDescription>
            {programName}
            {patternLabel ? ` · ${patternLabel}` : ""} — {overlaps.length} overlap
            {overlaps.length === 1 ? "" : "s"}
          </DialogDescription>
        </DialogHeader>
        <ScrollArea className="flex-1 min-h-0 max-h-[55vh] rounded-md border">
          <ul className="p-2 space-y-0.5">
            {overlaps.map((o, i) => (
              <li
                key={`${o.date}-${o.slotLabel}-${i}`}
                className="rounded-md px-2.5 py-2 text-sm font-mono tabular-nums text-foreground/90 hover:bg-muted/60"
              >
                {formatOverlapLine(o)}
              </li>
            ))}
          </ul>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
