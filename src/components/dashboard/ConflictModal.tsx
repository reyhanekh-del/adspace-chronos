import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { AlertTriangle, Tv, Clock } from "lucide-react";
import { ScheduleBlock, Screen } from "@/lib/schedule-data";

type Props = {
  open: boolean;
  onOpenChange: (b: boolean) => void;
  block: ScheduleBlock | null;
  conflicting: ScheduleBlock[];
  screen: Screen | null;
  onForce: () => void;
  onCancel: () => void;
};

export function ConflictModal({ open, onOpenChange, block, conflicting, screen, onForce, onCancel }: Props) {
  if (!block) return null;
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <div className="h-10 w-10 rounded-full bg-destructive/15 grid place-items-center mb-2">
            <AlertTriangle className="h-5 w-5 text-destructive" />
          </div>
          <DialogTitle className="font-display">Scheduling conflict detected</DialogTitle>
          <DialogDescription>
            Moving <span className="font-semibold text-foreground">"{block.title}"</span> overlaps with
            existing schedules on {screen?.name ?? "this screen"}.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-2 my-2">
          <div className="text-[11px] uppercase tracking-wider font-semibold text-muted-foreground">
            Conflicting items
          </div>
          {conflicting.map((c) => (
            <div
              key={c.id}
              className="flex items-center gap-3 rounded-lg border bg-muted/40 px-3 py-2.5"
            >
              <div className="h-8 w-8 rounded-md bg-slot-conflict text-slot-conflict-foreground grid place-items-center">
                <Tv className="h-4 w-4" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="font-medium text-sm truncate">{c.title}</div>
                <div className="text-xs text-muted-foreground flex items-center gap-1.5">
                  <Clock className="h-3 w-3" />
                  {fmt(c.startHour)} – {fmt(c.endHour)}
                  {c.client && <span>· {c.client}</span>}
                </div>
              </div>
            </div>
          ))}
        </div>

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={onCancel}>
            Cancel move
          </Button>
          <Button variant="destructive" onClick={onForce}>
            Force schedule (mark conflict)
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function fmt(h: number) {
  const hh = Math.floor(h);
  const mm = Math.round((h - hh) * 60);
  return `${String(hh).padStart(2, "0")}:${String(mm).padStart(2, "0")}`;
}
