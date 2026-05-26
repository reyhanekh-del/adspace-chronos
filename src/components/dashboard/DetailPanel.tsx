import { programs, ScheduleBlock, Screen, screenAdBands } from "@/lib/schedule-data";
import { resolveProgramId } from "@/lib/schedule-conflicts";
import { buildBlockScheduleDetails } from "@/lib/schedule-block-details";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  Layers,
  Tv,
  Building2,
  AlertTriangle,
  Trash2,
  Sparkles,
  Pencil,
  X,
  CalendarRange,
  ExternalLink,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { programSlotClasses } from "@/lib/schedule-block-styles";
import { scheduleBlockTypeTitle } from "@/lib/schedule-block-labels";
import { blockBandMismatch } from "@/lib/schedule-block-pairing";
import { AdSlotAvailability } from "@/components/dashboard/AdSlotAvailability";
import { Link } from "@tanstack/react-router";

type Props = {
  block: ScheduleBlock;
  screen: Screen | null;
  allBlocks: ScheduleBlock[];
  onClose: () => void;
  onDelete: (id: string) => void;
  onEdit: (b: ScheduleBlock) => void;
};

export function DetailPanel({ block, screen, allBlocks, onClose, onDelete, onEdit }: Props) {
  const scheduleRows = buildBlockScheduleDetails(block, screen);
  const programId =
    block.type === "program" ? resolveProgramId(block, programs) : null;
  const screenBands =
    screen?.adSupported ? screenAdBands(screen) : undefined;
  const typeTitle = scheduleBlockTypeTitle(
    block,
    screen?.adSupported ?? false,
    screenBands
  );
  const screenBlocks = screen
    ? allBlocks.filter((b) => b.screenId === screen.id)
    : [];
  const bandMismatch = screen
    ? blockBandMismatch(block, screenBlocks, screen.adSupported, screenBands)
    : null;

  return (
    <aside className="w-[340px] shrink-0 border-l bg-card flex flex-col h-full animate-in slide-in-from-right-4 duration-200">
      <div className="px-5 py-4 border-b flex items-center justify-between gap-2">
        <div className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
          Schedule Details
        </div>
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="sm"
            className="h-7 text-destructive hover:text-destructive"
            onClick={() => onDelete(block.id)}
          >
            <Trash2 className="h-3.5 w-3.5 mr-1" />
            Delete
          </Button>
          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <div className="flex-1 overflow-auto">
        <div className="p-5 space-y-5">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <Badge
                variant="secondary"
                className={cn(
                  "h-5 text-[10px] uppercase tracking-wider font-semibold",
                  block.type === "program"
                    ? programSlotClasses(screen?.adSupported ?? true)
                    : "bg-slot-adpack text-slot-adpack-foreground"
                )}
              >
                {block.type === "program" ? (
                  <Tv className="h-3 w-3 mr-1" />
                ) : (
                  <Layers className="h-3 w-3 mr-1" />
                )}
                {block.type === "program" ? "Program" : "Ad"}
              </Badge>
              <StatusBadge status={block.status} />
              {typeTitle && (
                <Badge
                  variant="outline"
                  className={cn(
                    "h-5 text-[10px] font-medium",
                    bandMismatch &&
                      "border-orange-500 bg-orange-500/15 text-orange-700 dark:text-orange-300"
                  )}
                >
                  {typeTitle}
                </Badge>
              )}
            </div>
            {bandMismatch && (
              <p className="text-xs text-orange-600 dark:text-orange-400 mt-2 flex items-start gap-1.5">
                <AlertTriangle className="h-3.5 w-3.5 shrink-0 mt-0.5" />
                Band mismatch: program expects {bandMismatch.expected}b pack, ad is{" "}
                {bandMismatch.actual}b.
              </p>
            )}
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

          {(block.client || screen) && (
            <div className="space-y-3">
              {block.client && (
                <Row icon={<Sparkles className="h-4 w-4" />} label="Client" value={block.client} />
              )}
              {screen && (
                <Row
                  icon={<Building2 className="h-4 w-4" />}
                  label="Location"
                  value={`${screen.location} · ${screen.resolution}`}
                />
              )}
            </div>
          )}

          <div>
            <label className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5 mb-3">
              <CalendarRange className="h-3.5 w-3.5" />
              Schedule
            </label>
            <dl className="space-y-3">
              {scheduleRows.map((row) => (
                <ScheduleRow key={row.label} label={row.label} value={row.value} />
              ))}
            </dl>
          </div>

          {block.type === "adpack" && screen?.adSupported && (
            <>
              <Separator />
              <AdSlotAvailability block={block} screen={screen} />
            </>
          )}

          <Separator />

          <div className="flex gap-2">
            {block.type === "program" && programId ? (
              <Button variant="outline" className="flex-1" asChild>
                <Link to="/programs/$programId" params={{ programId }}>
                  <ExternalLink className="h-4 w-4 mr-1.5" />
                  View Program
                </Link>
              </Button>
            ) : (
              <Button variant="outline" className="flex-1" onClick={() => onEdit(block)}>
                <ExternalLink className="h-4 w-4 mr-1.5" />
                View Ad
              </Button>
            )}
            <Button className="flex-1" onClick={() => onEdit(block)}>
              <Pencil className="h-4 w-4 mr-1.5" />
              Edit
            </Button>
          </div>
        </div>
      </div>
    </aside>
  );
}

function ScheduleRow({ label, value }: { label: string; value: string }) {
  const multiline = value.includes("\n");
  return (
    <div className="min-w-0">
      <dt className="text-[11px] uppercase tracking-wider text-muted-foreground font-semibold">
        {label}
      </dt>
      <dd
        className={cn(
          "text-sm font-medium mt-0.5 text-foreground",
          multiline ? "whitespace-pre-line leading-relaxed" : "truncate"
        )}
      >
        {value}
      </dd>
    </div>
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
