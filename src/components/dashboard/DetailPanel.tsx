import { ScheduleBlock, Screen } from "@/lib/schedule-data";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Calendar,
  Clock,
  Layers,
  Tv,
  Repeat,
  Building2,
  AlertTriangle,
  Trash2,
  CalendarOff,
  Sparkles,
  Pencil,
} from "lucide-react";
import { cn } from "@/lib/utils";

type Props = {
  block: ScheduleBlock | null;
  screen: Screen | null;
  onChange: (b: ScheduleBlock) => void;
  onDelete: (id: string) => void;
  onEdit: (b: ScheduleBlock) => void;
};

export function DetailPanel({ block, screen, onChange, onDelete, onEdit }: Props) {
  return (
    <aside className="w-[340px] shrink-0 border-l bg-card flex flex-col h-full">
      <div className="px-5 py-4 border-b flex items-center justify-between">
        <div className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
          Schedule Details
        </div>
        {block && (
          <Button
            variant="ghost"
            size="sm"
            className="h-7 text-destructive hover:text-destructive"
            onClick={() => onDelete(block.id)}
          >
            <Trash2 className="h-3.5 w-3.5 mr-1" />
            Delete
          </Button>
        )}
      </div>

      {!block ? (
        <EmptyState />
      ) : (
        <div className="flex-1 overflow-auto">
          <div className="p-5 space-y-5">
            {/* Header */}
            <div>
              <div className="flex items-center gap-2 mb-2">
                <Badge
                  variant="secondary"
                  className={cn(
                    "h-5 text-[10px] uppercase tracking-wider font-semibold",
                    block.type === "program"
                      ? "bg-slot-program text-slot-program-foreground"
                      : "bg-slot-adpack text-slot-adpack-foreground"
                  )}
                >
                  {block.type === "program" ? <Tv className="h-3 w-3 mr-1" /> : <Layers className="h-3 w-3 mr-1" />}
                  {block.type}
                </Badge>
                <StatusBadge status={block.status} />
              </div>
              <h2 className="font-display text-xl font-semibold leading-tight">{block.title}</h2>
              {block.campaign && (
                <p className="text-sm text-muted-foreground mt-1">{block.campaign}</p>
              )}
            </div>

            {block.status === "conflict" && (
              <div className="rounded-lg border border-destructive/30 bg-destructive/10 p-3 text-sm flex gap-2">
                <AlertTriangle className="h-4 w-4 text-destructive shrink-0 mt-0.5" />
                <div>
                  <div className="font-semibold text-destructive">Scheduling conflict</div>
                  <div className="text-xs text-destructive/80 mt-0.5">
                    Overlapping bookings detected. Resolve before publish.
                  </div>
                </div>
              </div>
            )}

            <Separator />

            {/* Meta */}
            <div className="space-y-3">
              <Row icon={<Tv className="h-4 w-4" />} label="Screen" value={screen?.name ?? "—"} />
              <Row
                icon={<Building2 className="h-4 w-4" />}
                label="Location"
                value={screen ? `${screen.location} · ${screen.resolution}` : "—"}
              />
              <Row
                icon={<Clock className="h-4 w-4" />}
                label="Time"
                value={`${fmt(block.startHour)} – ${fmt(block.endHour)} (${(block.endHour - block.startHour).toFixed(1)}h)`}
              />
              {block.client && (
                <Row icon={<Sparkles className="h-4 w-4" />} label="Client" value={block.client} />
              )}
            </div>

            <Separator />

            {/* Recurring */}
            <div>
              <label className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5 mb-2">
                <Repeat className="h-3.5 w-3.5" /> Recurring
              </label>
              <Select
                value={block.recurring ?? "none"}
                onValueChange={(v) => onChange({ ...block, recurring: v as ScheduleBlock["recurring"] })}
              >
                <SelectTrigger className="h-9">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Does not repeat</SelectItem>
                  <SelectItem value="daily">Every day</SelectItem>
                  <SelectItem value="weekdays">Weekdays (Mon–Fri)</SelectItem>
                  <SelectItem value="weekly">Weekly</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* AdPack occupancy */}
            {block.type === "adpack" && block.occupancy !== undefined && (
              <>
                <Separator />
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                      Slot Availability
                    </label>
                    <span className="text-[11px] font-mono tabular-nums text-muted-foreground">
                      {block.filledSlots}/{block.totalSlots}
                    </span>
                  </div>
                  <div className="h-2.5 rounded-full bg-muted overflow-hidden">
                    <div
                      className={cn(
                        "h-full rounded-full transition-all",
                        block.occupancy > 100
                          ? "bg-destructive"
                          : block.occupancy > 80
                          ? "bg-slot-adpack"
                          : "bg-slot-free-foreground"
                      )}
                      style={{ width: `${Math.min(100, block.occupancy)}%` }}
                    />
                  </div>
                  <div className="mt-2 grid grid-cols-12 gap-0.5">
                    {Array.from({ length: block.totalSlots ?? 0 }).map((_, i) => (
                      <div
                        key={i}
                        className={cn(
                          "h-3 rounded-sm",
                          i < (block.filledSlots ?? 0) ? "bg-slot-adpack" : "bg-muted"
                        )}
                      />
                    ))}
                  </div>
                  <p className="text-xs text-muted-foreground mt-2">
                    {block.occupancy > 100
                      ? `Overbooked by ${(block.occupancy - 100).toFixed(0)}%`
                      : `${(100 - block.occupancy).toFixed(0)}% capacity remaining`}
                  </p>
                </div>
              </>
            )}

            <Separator />

            <div className="flex gap-2">
              <Button variant="outline" className="flex-1">
                <CalendarOff className="h-4 w-4 mr-1.5" /> Block
              </Button>
              <Button className="flex-1" onClick={() => onEdit(block)}>
                <Pencil className="h-4 w-4 mr-1.5" /> Edit
              </Button>
            </div>
          </div>
        </div>
      )}
    </aside>
  );
}

function StatusBadge({ status }: { status: ScheduleBlock["status"] }) {
  const map: Record<ScheduleBlock["status"], { label: string; cls: string }> = {
    free: { label: "Free", cls: "bg-slot-free text-slot-free-foreground" },
    reserved: { label: "Reserved", cls: "bg-slot-reserved text-slot-reserved-foreground" },
    blocked: { label: "Blocked", cls: "bg-slot-blocked text-slot-blocked-foreground" },
    conflict: { label: "Conflict", cls: "bg-slot-conflict text-slot-conflict-foreground" },
  };
  const s = map[status];
  return (
    <Badge variant="secondary" className={cn("h-5 text-[10px] uppercase tracking-wider font-semibold", s.cls)}>
      {s.label}
    </Badge>
  );
}

function Row({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="flex items-start gap-3">
      <div className="text-muted-foreground mt-0.5">{icon}</div>
      <div className="min-w-0 flex-1">
        <div className="text-[11px] uppercase tracking-wider text-muted-foreground font-semibold">
          {label}
        </div>
        <div className="text-sm font-medium truncate">{value}</div>
      </div>
    </div>
  );
}

function EmptyState() {
  return (
    <div className="flex-1 flex flex-col items-center justify-center px-6 text-center">
      <div className="h-14 w-14 rounded-full bg-accent grid place-items-center mb-4">
        <Calendar className="h-6 w-6 text-accent-foreground" />
      </div>
      <h3 className="font-display text-base font-semibold">No schedule selected</h3>
      <p className="text-sm text-muted-foreground mt-1.5 max-w-[240px]">
        Click any block in the timeline to view details, edit recurrence, or check AdPack occupancy.
      </p>
    </div>
  );
}

function fmt(h: number) {
  const hh = Math.floor(h);
  const mm = Math.round((h - hh) * 60);
  return `${String(hh).padStart(2, "0")}:${String(mm).padStart(2, "0")}`;
}
