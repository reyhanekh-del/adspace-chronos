import { useEffect, useMemo, useState } from "react";
import { Link } from "@tanstack/react-router";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  ScheduleBlock,
  Screen,
  Program,
  programs as allPrograms,
  locations as allLocations,
  screenTags,
} from "@/lib/schedule-data";
import {
  Layers,
  Tv,
  Calendar,
  Repeat,
  AlertTriangle,
  Plus,
  Trash2,
  MonitorPlay,
  Eye,
  ChevronDown,
  MapPin,
  Tag,
  ExternalLink,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { MultiFilterDropdown } from "@/components/dashboard/MultiFilterDropdown";
import { ProgramScheduleSection } from "@/components/dashboard/ProgramScheduleSection";
import {
  defaultProgramSchedule,
  blockToProgramSchedule,
  buildProgramOccurrences,
  programScheduleToBlockFields,
  validateProgramSchedule,
  type ProgramScheduleFields,
} from "@/lib/program-schedule";
import {
  buildProgramDemoConflicts,
  demoConflictDayCount,
  type ProgramDemoConflict,
} from "@/lib/demo-schedule-conflicts";
import { ConflictOverlapsModal } from "@/components/dashboard/ConflictOverlapsModal";
import { ConflictOverlapsPreview } from "@/components/dashboard/ConflictOverlapsPreview";

const HOUR_MARKS = [0, 3, 6, 9, 12, 15, 18, 21];
const PREVIEW_OCCURRENCE_CAP = 2000;
const PREVIEW_PAGE_SIZE = 10;

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initial: ScheduleBlock | null;
  screens: Screen[];
  existingBlocks?: ScheduleBlock[];
  anchorDate?: Date;
  onSave: (blocks: ScheduleBlock[]) => void;
};

type Recurrence = NonNullable<ScheduleBlock["recurring"]>;
type Slot = { start: string; end: string };

const hourToTime = (h: number) => {
  const hh = Math.floor(h);
  const mm = Math.round((h - hh) * 60);
  return `${String(hh).padStart(2, "0")}:${String(mm).padStart(2, "0")}`;
};
const timeToHour = (t: string) => {
  const [h, m] = t.split(":").map(Number);
  return (h || 0) + (m || 0) / 60;
};

const WEEKDAY_SHORT = ["S", "M", "T", "W", "T", "F", "S"];
const WEEKDAY_LONG = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

function buildOccurrences(
  anchor: Date,
  rule: Recurrence,
  days: number[],
  endMode: EndMode,
  endDate: string,
  endCount: number,
  previewCap: number
): Date[] {
  const out: Date[] = [];
  const start = new Date(anchor.getFullYear(), anchor.getMonth(), anchor.getDate());
  if (rule === "none") return [start];
  const limit =
    endMode === "after" ? Math.min(previewCap, Math.max(1, endCount)) : previewCap;
  const until =
    endMode === "on" && endDate
      ? new Date(`${endDate}T00:00:00`)
      : null;
  let cursor = new Date(start);
  let safety = 0;
  while (out.length < limit && safety < 800) {
    if (until && cursor.getTime() > until.getTime()) break;
    const dow = cursor.getDay();
    let ok = false;
    if (rule === "daily") ok = true;
    else if (rule === "weekdays") ok = dow >= 1 && dow <= 5;
    else if (rule === "weekly") ok = days.includes(dow);
    else if (rule === "biweekly") {
      const diffDays = Math.floor((cursor.getTime() - start.getTime()) / 86400000);
      const week = Math.floor(diffDays / 7);
      ok = week % 2 === 0 && days.includes(dow);
    } else if (rule === "monthly") {
      ok = cursor.getDate() === start.getDate();
    }
    if (ok) out.push(new Date(cursor));
    cursor = new Date(cursor.getTime() + 86400000);
    safety++;
  }
  return out;
}

type EndMode = "never" | "on" | "after";

type Form = {
  programId: string;
  title: string;
  type: "program" | "adpack";
  screenIds: string[];
  slots: Slot[];
  programSchedule: ProgramScheduleFields;
  filterLocations: string[];
  filterTags: string[];
  client: string;
  campaign: string;
  recurring: Recurrence;
  daysOfWeek: number[];
  endMode: EndMode;
  endDate: string;
  endCount: number;
  totalSlots: number;
  filledSlots: number;
};

function defaultEndDate(anchor: Date) {
  const d = new Date(anchor);
  d.setMonth(d.getMonth() + 1);
  return d.toISOString().slice(0, 10);
}

const MIN_SCREENS_FOR_CONFLICTS = 2;

/** At least 2 screens so the conflict panel can appear (programs only) */
function ensureMinScreens(
  screenIds: string[],
  screens: Screen[],
  min = MIN_SCREENS_FOR_CONFLICTS
): string[] {
  const ids = [...screenIds];
  for (const s of screens) {
    if (ids.length >= min) break;
    if (!ids.includes(s.id)) ids.push(s.id);
  }
  return ids;
}

/** Demo defaults: 2 screens so the conflict panel is visible in the sample */
function defaultDemoForm(screens: Screen[], anchor: Date): Form {
  const demoProgram = allPrograms.find((p) => p.id === "prg-4") ?? allPrograms[0];
  const demoScreens = ensureMinScreens([], screens);
  const schedule = defaultProgramSchedule(anchor);
  schedule.schedulePattern = "daily";
  schedule.startDate = "2026-05-01";
  schedule.patternEndDate = "2026-07-31";
  schedule.dailyEndMode = "on_date";

  return {
    programId: demoProgram?.id ?? "",
    title: demoProgram?.name ?? "",
    type: "program",
    screenIds: demoScreens,
    slots: [
      { start: "09:00", end: "12:00" },
      { start: "10:00", end: "13:00" },
    ],
    programSchedule: schedule,
    filterLocations: [],
    filterTags: [],
    client: "",
    campaign: "",
    recurring: "none",
    daysOfWeek: [anchor.getDay()],
    endMode: "never",
    endDate: defaultEndDate(anchor),
    endCount: 10,
    totalSlots: 24,
    filledSlots: 0,
  };
}

export function ScheduleModal({
  open,
  onOpenChange,
  initial,
  screens,
  existingBlocks = [],
  anchorDate,
  onSave,
}: Props) {
  const anchor = anchorDate ?? new Date();
  const [form, setForm] = useState<Form>(() => defaultDemoForm(screens, anchor));
  const [conflictExpanded, setConflictExpanded] = useState(false);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewPage, setPreviewPage] = useState(1);
  const [overlapModalConflict, setOverlapModalConflict] =
    useState<ProgramDemoConflict | null>(null);
  const isEdit = !!initial;
  const isProgram = form.type === "program";

  useEffect(() => {
    if (!open) return;
    if (initial) {
      const isInitialProgram = initial.type === "program";
      setForm({
        programId:
          allPrograms.find((p) => p.name === initial.title)?.id ?? "",
        title: initial.title,
        type: initial.type,
        screenIds: isInitialProgram
          ? ensureMinScreens([initial.screenId], screens)
          : [initial.screenId],
        slots: [{ start: hourToTime(initial.startHour), end: hourToTime(initial.endHour) }],
        programSchedule: blockToProgramSchedule(initial, anchor),
        filterLocations: [],
        filterTags: [],
        client: initial.client ?? "",
        campaign: initial.campaign ?? "",
        recurring: initial.recurring ?? "none",
        daysOfWeek: initial.daysOfWeek ?? [anchor.getDay()],
        endMode: initial.recurrenceEnd ?? "never",
        endDate: initial.recurrenceEndDate ?? defaultEndDate(anchor),
        endCount: initial.recurrenceCount ?? 10,
        totalSlots: initial.totalSlots ?? 24,
        filledSlots: initial.filledSlots ?? 0,
      });
    } else {
      setForm(defaultDemoForm(screens, anchor));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, initial]);

  const set = <K extends keyof Form>(k: K, v: Form[K]) =>
    setForm((p) => ({ ...p, [k]: v }));

  const pickProgram = (id: string) => {
    const prog = allPrograms.find((p) => p.id === id);
    if (!prog) return;
    setForm((p) => ({
      ...p,
      programId: prog.id,
      title: prog.name,
      screenIds: ensureMinScreens(p.screenIds, screens),
    }));
  };

  const toggleFilterLocation = (loc: string) =>
    setForm((p) => ({
      ...p,
      filterLocations: p.filterLocations.includes(loc)
        ? p.filterLocations.filter((x) => x !== loc)
        : [...p.filterLocations, loc],
    }));

  const toggleFilterTag = (tag: string) =>
    setForm((p) => ({
      ...p,
      filterTags: p.filterTags.includes(tag)
        ? p.filterTags.filter((x) => x !== tag)
        : [...p.filterTags, tag],
    }));

  const filteredScreens = useMemo(() => {
    return screens.filter((s) => {
      if (form.filterLocations.length > 0 && !form.filterLocations.includes(s.location)) {
        return false;
      }
      if (form.filterTags.length > 0 && !s.tags.some((t) => form.filterTags.includes(t))) {
        return false;
      }
      return true;
    });
  }, [screens, form.filterLocations, form.filterTags]);

  const selectedProgram = allPrograms.find((p) => p.id === form.programId);

  const scheduleAnchor = useMemo(
    () => new Date(`${form.programSchedule.startDate}T00:00:00`),
    [form.programSchedule.startDate]
  );

  const updateSlot = (i: number, patch: Partial<Slot>) =>
    setForm((p) => ({
      ...p,
      slots: p.slots.map((s, idx) => (idx === i ? { ...s, ...patch } : s)),
    }));

  const addSlot = () => {
    setForm((p) => {
      const last = p.slots[p.slots.length - 1];
      const lastEndH = last ? timeToHour(last.end) : 9;
      const start = Math.min(23, lastEndH + 1);
      const end = Math.min(24, start + 1);
      return {
        ...p,
        slots: [...p.slots, { start: hourToTime(start), end: hourToTime(end) }],
      };
    });
  };

  const removeSlot = (i: number) =>
    setForm((p) => ({
      ...p,
      slots: p.slots.length > 1 ? p.slots.filter((_, idx) => idx !== i) : p.slots,
    }));

  const toggleScreen = (id: string) =>
    setForm((p) => ({
      ...p,
      screenIds: p.screenIds.includes(id)
        ? p.screenIds.filter((x) => x !== id)
        : [...p.screenIds, id],
    }));

  const toggleDay = (d: number) =>
    setForm((p) => ({
      ...p,
      daysOfWeek: p.daysOfWeek.includes(d)
        ? p.daysOfWeek.filter((x) => x !== d)
        : [...p.daysOfWeek, d].sort(),
    }));

  const slotsValid = form.slots.every((s) => timeToHour(s.end) > timeToHour(s.start));
  const needsDays = form.recurring === "weekly" || form.recurring === "biweekly";
  const invalid =
    (isProgram
      ? !form.programId || !validateProgramSchedule(form.programSchedule)
      : !form.title.trim()) ||
    form.screenIds.length === 0 ||
    form.slots.length === 0 ||
    !slotsValid ||
    (!isProgram && needsDays && form.daysOfWeek.length === 0);

  const occurrences = useMemo(
    () =>
      isProgram
        ? buildProgramOccurrences(form.programSchedule, PREVIEW_OCCURRENCE_CAP)
        : buildOccurrences(
            scheduleAnchor,
            form.recurring,
            form.daysOfWeek,
            form.endMode,
            form.endDate,
            form.endCount,
            form.endMode === "never" ? 6 : PREVIEW_OCCURRENCE_CAP
          ),
    [
      isProgram,
      form.programSchedule,
      scheduleAnchor,
      form.recurring,
      form.daysOfWeek,
      form.endMode,
      form.endDate,
      form.endCount,
    ]
  );

  const previewTruncated = occurrences.length >= PREVIEW_OCCURRENCE_CAP;
  const previewTotalPages = Math.max(1, Math.ceil(occurrences.length / PREVIEW_PAGE_SIZE));
  const previewPageSafe = Math.min(previewPage, previewTotalPages);
  const pagedOccurrences = occurrences.slice(
    (previewPageSafe - 1) * PREVIEW_PAGE_SIZE,
    previewPageSafe * PREVIEW_PAGE_SIZE
  );

  const currentSlotLabels = useMemo(
    () => form.slots.map((s) => `${s.start} – ${s.end}`),
    [form.slots]
  );

  const programDemoConflicts = useMemo(
    (): ProgramDemoConflict[] =>
      buildProgramDemoConflicts({
        currentProgramName: selectedProgram?.name ?? form.title,
        currentSlotLabels,
        screens,
      }),
    [selectedProgram?.name, form.title, currentSlotLabels, screens]
  );

  const showConflictPanel =
    isProgram && form.screenIds.length >= MIN_SCREENS_FOR_CONFLICTS;
  const scheduleConflicts = showConflictPanel ? programDemoConflicts : [];
  const conflictCount = scheduleConflicts.length;
  const conflictDayCount = showConflictPanel
    ? demoConflictDayCount(programDemoConflicts)
    : 0;
  const conflictedScreenNames = [
    ...new Set(scheduleConflicts.map((c) => c.screenName)),
  ];
  const anyConflict = showConflictPanel && conflictCount > 0;

  const previewResetKey = useMemo(
    () =>
      isProgram
        ? JSON.stringify(form.programSchedule)
        : [
            scheduleAnchor.toISOString(),
            form.recurring,
            form.daysOfWeek.join(","),
            form.endMode,
            form.endDate,
            form.endCount,
          ].join("|"),
    [
      isProgram,
      form.programSchedule,
      scheduleAnchor,
      form.recurring,
      form.daysOfWeek,
      form.endMode,
      form.endDate,
      form.endCount,
    ]
  );

  useEffect(() => {
    setPreviewPage(1);
  }, [previewResetKey]);

  useEffect(() => {
    if (!open) setConflictExpanded(false);
  }, [open]);

  useEffect(() => {
    if (!anyConflict) setConflictExpanded(false);
  }, [anyConflict]);

  const totalGenerated =
    form.screenIds.length * form.slots.length * Math.max(1, occurrences.length);

  const handleSave = () => {
    if (invalid) return;
    const filled = Math.min(form.filledSlots, form.totalSlots);
    const occupancy =
      form.totalSlots > 0 ? Math.round((filled / form.totalSlots) * 100) : 0;

    const blockTitle = isProgram
      ? (selectedProgram?.name ?? form.title.trim())
      : form.title.trim();

    const programFields = isProgram
      ? programScheduleToBlockFields(form.programSchedule)
      : null;

    const baseId = initial?.id ?? `b-${Date.now()}`;
    const blocks: ScheduleBlock[] = [];
    let n = 0;
    for (const sid of form.screenIds) {
      for (const slot of form.slots) {
        const sh = timeToHour(slot.start);
        const eh = timeToHour(slot.end);
        blocks.push({
          id: isEdit && form.screenIds.length === 1 && form.slots.length === 1
            ? baseId
            : `${baseId}-${n}`,
          screenId: sid,
          ...(isProgram && form.programId ? { programId: form.programId } : {}),
          startHour: sh,
          endHour: eh,
          title: blockTitle,
          type: form.type,
          status: anyConflict ? "conflict" : initial?.status ?? "reserved",
          ...(programFields ?? {
            recurring: form.recurring,
            daysOfWeek: needsDays ? form.daysOfWeek : undefined,
            recurrenceEnd: form.recurring === "none" ? undefined : form.endMode,
            recurrenceEndDate:
              form.recurring !== "none" && form.endMode === "on" ? form.endDate : undefined,
            recurrenceCount:
              form.recurring !== "none" && form.endMode === "after"
                ? form.endCount
                : undefined,
          }),
          client: !isProgram && form.client.trim() ? form.client.trim() : undefined,
          campaign: !isProgram && form.campaign.trim() ? form.campaign.trim() : undefined,
          ...(form.type === "adpack"
            ? { totalSlots: form.totalSlots, filledSlots: filled, occupancy }
            : {}),
        });
        n++;
      }
    }
    onSave(blocks);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[92vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="font-display flex items-center gap-2">
            <Calendar className="h-4 w-4" />
            {isEdit ? "Edit schedule" : "New schedule"}
          </DialogTitle>
          <DialogDescription>
            {isEdit
              ? isProgram
                ? "Update program screens, time slots, and schedule pattern."
                : "Update AdPack screens, time slots, and recurrence."
              : "Pick a program, target screens, time slots and a recurrence rule."}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-5">
          {!isEdit && (
            <Tabs
              value={form.type}
              onValueChange={(v) => {
                const type = v as Form["type"];
                setForm((p) => ({
                  ...p,
                  type,
                  screenIds:
                    type === "program"
                      ? ensureMinScreens(p.screenIds, screens)
                      : p.screenIds,
                }));
              }}
            >
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="program" className="gap-1.5">
                  <Tv className="h-3.5 w-3.5" /> Program
                </TabsTrigger>
                <TabsTrigger value="adpack" className="gap-1.5">
                  <Layers className="h-3.5 w-3.5" /> AdPack
                </TabsTrigger>
              </TabsList>
            </Tabs>
          )}

          {isProgram && (
            <div className="space-y-1.5">
              <Label>Program</Label>
              {isEdit ? (
                <div className="flex items-center gap-2 rounded-md border bg-muted/30 px-3 py-2.5">
                  <Tv className="h-4 w-4 text-slot-program shrink-0" />
                  <span className="font-medium flex-1 truncate">
                    {selectedProgram?.name ?? form.title}
                  </span>
                  {form.programId && (
                    <Button variant="outline" size="icon" className="shrink-0" asChild>
                      <Link
                        to="/programs/$programId"
                        params={{ programId: form.programId }}
                        onClick={() => onOpenChange(false)}
                      >
                        <Eye className="h-4 w-4" />
                      </Link>
                    </Button>
                  )}
                </div>
              ) : (
                <div className="flex gap-2">
              <Select
                value={form.programId || undefined}
                onValueChange={pickProgram}
              >
                <SelectTrigger className="flex-1">
                  <SelectValue placeholder="Choose a program" />
                </SelectTrigger>
                <SelectContent>
                  {(["brand", "entertainment", "sports", "news", "lifestyle"] as Program["category"][]).map(
                    (cat) => {
                      const items = allPrograms.filter((p) => p.category === cat);
                      if (items.length === 0) return null;
                      return (
                        <div key={cat}>
                          <div className="px-2 py-1 text-[10px] uppercase tracking-wider text-muted-foreground">
                            {cat}
                          </div>
                          {items.map((p) => (
                            <SelectItem key={p.id} value={p.id}>
                              {p.name}
                            </SelectItem>
                          ))}
                        </div>
                      );
                    }
                  )}
                </SelectContent>
              </Select>
              <Button
                type="button"
                variant="outline"
                size="icon"
                className="shrink-0"
                disabled={!form.programId}
                asChild={!!form.programId}
              >
                {form.programId ? (
                  <Link
                    to="/programs/$programId"
                    params={{ programId: form.programId }}
                    onClick={() => onOpenChange(false)}
                  >
                    <Eye className="h-4 w-4" />
                  </Link>
                ) : (
                  <span>
                    <Eye className="h-4 w-4 opacity-40" />
                  </span>
                )}
              </Button>
                </div>
              )}
            </div>
          )}

          {!isProgram && (
            <div className="space-y-1.5">
              <Label htmlFor="sched-title">Title</Label>
              <Input
                id="sched-title"
                value={form.title}
                placeholder="e.g. Morning AdPack"
                onChange={(e) => set("title", e.target.value)}
              />
            </div>
          )}

          {/* Screens multi-select */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label className="flex items-center gap-1.5">
                <MonitorPlay className="h-3.5 w-3.5" /> Screens
                <span className="text-[11px] font-normal text-muted-foreground">
                  ({form.screenIds.length} selected)
                </span>
              </Label>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => set("screenIds", filteredScreens.map((s) => s.id))}
                  className="text-[11px] text-primary hover:underline"
                >
                  All
                </button>
                <span className="text-[11px] text-muted-foreground">·</span>
                <button
                  type="button"
                  onClick={() => set("screenIds", [])}
                  className="text-[11px] text-muted-foreground hover:underline"
                >
                  None
                </button>
              </div>
            </div>

            {isProgram && (
              <div className="grid grid-cols-2 gap-2">
                <MultiFilterDropdown
                  label="Location"
                  icon={<MapPin className="h-3.5 w-3.5" />}
                  options={[...allLocations]}
                  selected={form.filterLocations}
                  onToggle={toggleFilterLocation}
                  onClear={() => set("filterLocations", [])}
                />
                <MultiFilterDropdown
                  label="Tag"
                  icon={<Tag className="h-3.5 w-3.5" />}
                  options={[...screenTags]}
                  selected={form.filterTags}
                  onToggle={toggleFilterTag}
                  onClear={() => set("filterTags", [])}
                />
              </div>
            )}

            <div className="grid grid-cols-2 gap-1.5 rounded-lg border bg-muted/30 p-2 max-h-44 overflow-y-auto">
              {filteredScreens.map((s) => {
                const active = form.screenIds.includes(s.id);
                return (
                  <button
                    key={s.id}
                    type="button"
                    onClick={() => toggleScreen(s.id)}
                    className={cn(
                      "flex items-center gap-2 rounded-md border px-2 py-1.5 text-left text-xs transition-colors",
                      active
                        ? "border-primary/50 bg-primary/10"
                        : "border-border bg-background hover:bg-accent/40"
                    )}
                  >
                    <Checkbox checked={active} className="pointer-events-none" />
                    <span
                      className={cn(
                        "h-1.5 w-1.5 rounded-full shrink-0",
                        s.online ? "bg-emerald-500" : "bg-muted-foreground/40"
                      )}
                    />
                    <div className="min-w-0 flex-1">
                      <div className="truncate font-medium">{s.name}</div>
                      <div className="truncate text-[10px] text-muted-foreground">
                        {s.location} · {s.resolution}
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Time slots */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label>Time slots</Label>
              <Button
                type="button"
                size="sm"
                variant="ghost"
                onClick={addSlot}
                className="h-7 gap-1 text-xs"
              >
                <Plus className="h-3.5 w-3.5" /> Add slot
              </Button>
            </div>
            <div className="space-y-1.5">
              {form.slots.map((slot, i) => {
                const sh = timeToHour(slot.start);
                const eh = timeToHour(slot.end);
                const bad = eh <= sh;
                return (
                  <div
                    key={i}
                    className={cn(
                      "flex items-center gap-2 rounded-md border bg-background/60 p-2",
                      bad && "border-destructive/40 bg-destructive/5"
                    )}
                  >
                    <span className="w-6 text-center font-mono text-[11px] text-muted-foreground">
                      {i + 1}
                    </span>
                    <Input
                      type="time"
                      value={slot.start}
                      onChange={(e) => updateSlot(i, { start: e.target.value })}
                      className="h-8 w-32"
                    />
                    <span className="text-muted-foreground text-xs">→</span>
                    <Input
                      type="time"
                      value={slot.end}
                      onChange={(e) => updateSlot(i, { end: e.target.value })}
                      className="h-8 w-32"
                    />
                    <HourTimelineBar
                      startHour={sh}
                      endHour={eh}
                      variant={form.type}
                      invalid={bad}
                    />
                    <Button
                      type="button"
                      size="icon"
                      variant="ghost"
                      onClick={() => removeSlot(i)}
                      disabled={form.slots.length === 1}
                      className="h-7 w-7 shrink-0"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                );
              })}
            </div>
            {!slotsValid && (
              <p className="text-xs text-destructive">
                Each slot's end time must be after its start time.
              </p>
            )}
          </div>

          {isProgram ? (
            <ProgramScheduleSection
              fields={form.programSchedule}
              onChange={(patch) =>
                setForm((prev) => ({
                  ...prev,
                  programSchedule: { ...prev.programSchedule, ...patch },
                }))
              }
            />
          ) : (
            <>
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            <div className="space-y-1.5">
              <Label className="flex items-center gap-1.5">
                <Repeat className="h-3.5 w-3.5" /> Recurrence
              </Label>
              <Select
                value={form.recurring}
                onValueChange={(v) => set("recurring", v as Recurrence)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Does not repeat</SelectItem>
                  <SelectItem value="daily">Every day</SelectItem>
                  <SelectItem value="weekdays">Weekdays (Mon–Fri)</SelectItem>
                  <SelectItem value="weekly">Weekly on selected days</SelectItem>
                  <SelectItem value="biweekly">Every 2 weeks on selected days</SelectItem>
                  <SelectItem value="monthly">Monthly on day {scheduleAnchor.getDate()}</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {needsDays && (
              <div className="space-y-1.5">
                <Label>Days of week</Label>
                <div className="flex gap-1">
                  {WEEKDAY_SHORT.map((lbl, i) => {
                    const active = form.daysOfWeek.includes(i);
                    return (
                      <button
                        key={i}
                        type="button"
                        onClick={() => toggleDay(i)}
                        className={cn(
                          "h-9 w-9 rounded-md border text-xs font-semibold transition-colors",
                          active
                            ? "border-primary bg-primary text-primary-foreground"
                            : "border-border bg-background hover:bg-accent/50"
                        )}
                        aria-label={WEEKDAY_LONG[i]}
                      >
                        {lbl}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          {form.recurring !== "none" && (
            <div className="rounded-lg border bg-muted/20 p-3 space-y-2">
              <Label className="text-xs uppercase tracking-wider text-muted-foreground">
                Ends
              </Label>
              <div className="space-y-2">
                <label className="flex items-center gap-2 text-sm cursor-pointer">
                  <input
                    type="radio"
                    name="end-mode"
                    checked={form.endMode === "never"}
                    onChange={() => set("endMode", "never")}
                    className="accent-primary"
                  />
                  <span>Never</span>
                </label>
                <label className="flex items-center gap-2 text-sm cursor-pointer">
                  <input
                    type="radio"
                    name="end-mode"
                    checked={form.endMode === "on"}
                    onChange={() => set("endMode", "on")}
                    className="accent-primary"
                  />
                  <span className="w-16">On date</span>
                  <Input
                    type="date"
                    value={form.endDate}
                    onChange={(e) => {
                      set("endDate", e.target.value);
                      set("endMode", "on");
                    }}
                    className="h-8 w-44"
                  />
                </label>
                <label className="flex items-center gap-2 text-sm cursor-pointer">
                  <input
                    type="radio"
                    name="end-mode"
                    checked={form.endMode === "after"}
                    onChange={() => set("endMode", "after")}
                    className="accent-primary"
                  />
                  <span className="w-16">After</span>
                  <Input
                    type="number"
                    min={1}
                    max={365}
                    value={form.endCount}
                    onChange={(e) => {
                      set("endCount", Math.max(1, Number(e.target.value) || 1));
                      set("endMode", "after");
                    }}
                    className="h-8 w-20"
                  />
                  <span className="text-muted-foreground">occurrences</span>
                </label>
              </div>
            </div>
          )}
            </>
          )}

          {!isProgram && (
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="sched-client">Client</Label>
                <Input
                  id="sched-client"
                  value={form.client}
                  placeholder="Optional"
                  onChange={(e) => set("client", e.target.value)}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="sched-campaign">Campaign</Label>
                <Input
                  id="sched-campaign"
                  value={form.campaign}
                  placeholder="Optional"
                  onChange={(e) => set("campaign", e.target.value)}
                />
              </div>
            </div>
          )}

          {anyConflict && (
            <div className="rounded-lg border border-destructive/40 bg-slot-conflict/30 overflow-hidden">
              <button
                type="button"
                onClick={() => setConflictExpanded((v) => !v)}
                className="flex w-full items-center justify-between gap-2 p-3 text-left transition-colors hover:bg-slot-conflict/40"
              >
                <div className="flex items-center gap-2 text-sm font-medium text-destructive">
                  <AlertTriangle className="h-4 w-4 shrink-0" />
                  Scheduling conflicts detected
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-semibold tabular-nums bg-destructive/15 text-destructive px-2 py-0.5 rounded-full">
                    4 patterns · {conflictDayCount} overlapping days
                  </span>
                  <ChevronDown
                    className={cn(
                      "h-4 w-4 text-destructive/80 transition-transform shrink-0",
                      conflictExpanded && "rotate-180"
                    )}
                  />
                </div>
              </button>

              {conflictExpanded && (
                <div className="border-t border-destructive/20 px-3 pb-3 pt-2 space-y-3">
                  {conflictedScreenNames.length > 0 && (
                    <p className="text-[11px] text-destructive/90">
                      <span className="font-medium">Screens with conflicts:</span>{" "}
                      {conflictedScreenNames.join(", ")}
                    </p>
                  )}

                  <ul className="space-y-2">
                    {scheduleConflicts.map((c) => {
                      const demo = c as ProgramDemoConflict;
                      return (
                        <li
                          key={c.key}
                          className="rounded-md border border-destructive/25 bg-background/70 p-2.5 space-y-2.5"
                        >
                          <div className="flex items-start justify-between gap-2">
                            <div className="min-w-0 space-y-1">
                              <span className="inline-flex items-center rounded-md bg-destructive/10 px-2 py-0.5 text-[10px] font-semibold text-destructive">
                                Screen: {c.screenName}
                              </span>
                              <p className="text-[10px] uppercase tracking-wider text-muted-foreground pt-0.5">
                                Previously scheduled program
                              </p>
                              <p className="text-sm font-semibold text-foreground truncate">
                                {c.scheduledProgramName}
                              </p>
                            </div>
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              className="h-7 shrink-0 gap-1 text-xs"
                              asChild
                            >
                              <Link
                                to="/programs/$programId"
                                params={{ programId: c.scheduledProgramId }}
                                onClick={() => onOpenChange(false)}
                              >
                                <ExternalLink className="h-3 w-3" />
                                View program
                              </Link>
                            </Button>
                          </div>

                          <div className="rounded-md bg-muted/40 border border-border/50 px-2.5 py-2 space-y-1">
                            <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                              Scheduled program timing
                            </p>
                            <p className="text-[11px] font-semibold text-foreground">
                              {demo.patternLabel}
                            </p>
                            {demo.scheduleLines.map((line) => (
                              <p key={line} className="text-[11px] text-foreground/90">
                                {line}
                              </p>
                            ))}
                          </div>

                          <div className="space-y-1 text-[11px] border-t border-border/50 pt-2">
                            <p className="text-muted-foreground">
                              <span className="font-medium text-foreground/90">Current program:</span>{" "}
                              {selectedProgram?.name ?? form.title}
                            </p>
                            <p className="text-muted-foreground leading-relaxed">
                              <span className="font-medium text-foreground/90">
                                Overlapping dates:
                              </span>{" "}
                              <ConflictOverlapsPreview
                                overlaps={c.overlaps}
                                onShowAll={() => setOverlapModalConflict(demo)}
                              />
                            </p>
                          </div>
                        </li>
                      );
                    })}
                  </ul>
                </div>
              )}
            </div>
          )}

          {/* AdPack slots */}
          {form.type === "adpack" && (
            <div className="grid grid-cols-2 gap-3 rounded-lg border bg-muted/40 p-3">
              <div className="space-y-1.5">
                <Label htmlFor="sched-total">Total slots</Label>
                <Input
                  id="sched-total"
                  type="number"
                  min={1}
                  value={form.totalSlots}
                  onChange={(e) =>
                    set("totalSlots", Math.max(1, Number(e.target.value) || 1))
                  }
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="sched-filled">Filled slots</Label>
                <Input
                  id="sched-filled"
                  type="number"
                  min={0}
                  value={form.filledSlots}
                  onChange={(e) =>
                    set("filledSlots", Math.max(0, Number(e.target.value) || 0))
                  }
                />
              </div>
            </div>
          )}

          <Collapsible open={previewOpen} onOpenChange={setPreviewOpen}>
            <div className="rounded-lg border bg-muted/30 overflow-hidden">
              <CollapsibleTrigger asChild>
                <button
                  type="button"
                  className="flex w-full items-center justify-between gap-2 p-3 text-left hover:bg-muted/50 transition-colors"
                >
                  <div className="flex items-center gap-1.5 text-sm font-medium">
                    <Repeat className="h-3.5 w-3.5 text-muted-foreground" />
                    Schedule preview
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-[11px] text-muted-foreground tabular-nums">
                      {form.screenIds.length} screens × {form.slots.length} slots ×{" "}
                      {occurrences.length}
                      {previewTruncated ? "+" : ""}{" "}
                      {occurrences.length === 1 ? "date" : "dates"}
                      {" = "}
                      <span className="font-semibold text-foreground">
                        {totalGenerated}
                        {previewTruncated ? "+" : ""}
                      </span>
                    </span>
                    <ChevronDown
                      className={cn(
                        "h-4 w-4 text-muted-foreground transition-transform",
                        previewOpen && "rotate-180"
                      )}
                    />
                  </div>
                </button>
              </CollapsibleTrigger>
              <CollapsibleContent>
                <div className="border-t px-3 pb-3 pt-2 space-y-2">

            {!isProgram && form.recurring === "none" ? (
              <p className="text-[11px] text-muted-foreground">
                Single booking on{" "}
                {scheduleAnchor.toLocaleDateString(undefined, {
                  weekday: "short",
                  month: "short",
                  day: "numeric",
                })}{" "}
                — enable recurrence to repeat.
              </p>
            ) : occurrences.length === 0 ? (
              <p className="text-[11px] text-muted-foreground">
                Complete the schedule pattern to see upcoming dates.
              </p>
            ) : (
              <div className="space-y-2">
                <ScrollArea className="h-56 w-full rounded-md border border-border/60 bg-background/40">
                  <div className="space-y-1 p-2">
                    {pagedOccurrences.map((d, i) => {
                      const globalIndex = (previewPageSafe - 1) * PREVIEW_PAGE_SIZE + i;
                      return (
                        <div
                          key={`${d.toISOString()}-${globalIndex}`}
                          className="flex items-center gap-2 rounded-md bg-background/60 border border-border/60 px-2 py-1.5 text-[11px]"
                        >
                          <span className="w-8 font-mono tabular-nums text-muted-foreground">
                            {WEEKDAY_LONG[d.getDay()]}
                          </span>
                          <span className="w-20 font-mono tabular-nums">
                            {d.toLocaleDateString(undefined, {
                              month: "short",
                              day: "2-digit",
                            })}
                          </span>
                          <div className="relative flex-1 min-w-0">
                            <div className="relative h-3 mb-0.5">
                              {HOUR_MARKS.map((h) => (
                                <span
                                  key={h}
                                  className="absolute text-[8px] font-mono text-muted-foreground -translate-x-1/2 tabular-nums"
                                  style={{ left: `${(h / 24) * 100}%` }}
                                >
                                  {String(h).padStart(2, "0")}
                                </span>
                              ))}
                            </div>
                            <div className="relative h-4 rounded bg-muted overflow-hidden">
                              {HOUR_MARKS.map((h) => (
                                <div
                                  key={h}
                                  className="absolute top-0 bottom-0 w-px bg-border"
                                  style={{ left: `${(h / 24) * 100}%` }}
                                />
                              ))}
                              {form.slots.map((s, si) => {
                                const sh = timeToHour(s.start);
                                const eh = timeToHour(s.end);
                                if (eh <= sh) return null;
                                return (
                                  <div
                                    key={si}
                                    className={cn(
                                      "absolute top-0 bottom-0 rounded-sm",
                                      form.type === "program"
                                        ? "bg-slot-program"
                                        : "bg-slot-adpack",
                                      globalIndex === 0 && "ring-1 ring-primary/60"
                                    )}
                                    style={{
                                      left: `${(sh / 24) * 100}%`,
                                      width: `${Math.max(1.5, ((eh - sh) / 24) * 100)}%`,
                                    }}
                                  />
                                );
                              })}
                            </div>
                          </div>
                          <span className="w-16 text-right font-mono tabular-nums text-muted-foreground shrink-0">
                            ×{form.screenIds.length * form.slots.length}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </ScrollArea>

                {previewTotalPages > 1 && (
                  <div className="flex items-center justify-between gap-2 pt-0.5">
                    <p className="text-[11px] text-muted-foreground tabular-nums">
                      Page {previewPageSafe} of {previewTotalPages}
                      {previewTruncated && " · list capped at 2,000 dates"}
                    </p>
                    <div className="flex items-center gap-1">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="h-7 text-xs"
                        disabled={previewPageSafe <= 1}
                        onClick={() => setPreviewPage((p) => Math.max(1, p - 1))}
                      >
                        Previous
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="h-7 text-xs"
                        disabled={previewPageSafe >= previewTotalPages}
                        onClick={() =>
                          setPreviewPage((p) => Math.min(previewTotalPages, p + 1))
                        }
                      >
                        Next
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            )}
                </div>
              </CollapsibleContent>
            </div>
          </Collapsible>
        </div>

        <DialogFooter className="flex-col items-stretch gap-2 sm:flex-col sm:items-stretch">
          {anyConflict && (
            <p className="text-xs text-muted-foreground text-left w-full">
              Overlapping time on the previously scheduled program will be removed on each
              affected screen. The current program replaces those slots.
            </p>
          )}
          <div className="flex w-full justify-end gap-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleSave}
              disabled={invalid}
              className={cn(
                anyConflict &&
                  "bg-orange-500 text-white hover:bg-orange-600 focus-visible:ring-orange-500/30"
              )}
            >
              {anyConflict
                ? isEdit
                  ? "Save & replace overlaps"
                  : "Schedule & replace overlaps"
                : isEdit
                  ? "Save changes"
                  : `Create ${form.screenIds.length * form.slots.length} booking${form.screenIds.length * form.slots.length === 1 ? "" : "s"}`}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>

      <ConflictOverlapsModal
        open={!!overlapModalConflict}
        onOpenChange={(open) => !open && setOverlapModalConflict(null)}
        programName={overlapModalConflict?.scheduledProgramName ?? ""}
        patternLabel={overlapModalConflict?.patternLabel}
        overlaps={overlapModalConflict?.overlaps ?? []}
      />
    </Dialog>
  );
}

function HourTimelineBar({
  startHour,
  endHour,
  variant,
  invalid,
}: {
  startHour: number;
  endHour: number;
  variant: "program" | "adpack";
  invalid?: boolean;
}) {
  return (
    <div className="relative flex-1 min-w-0">
      <div className="relative h-3.5 mb-0.5">
        {HOUR_MARKS.map((h) => (
          <span
            key={h}
            className="absolute text-[8px] font-mono text-muted-foreground -translate-x-1/2 tabular-nums"
            style={{ left: `${(h / 24) * 100}%` }}
          >
            {String(h).padStart(2, "0")}
          </span>
        ))}
      </div>
      <div className="relative h-2 rounded bg-muted overflow-hidden">
        {HOUR_MARKS.map((h) => (
          <div
            key={h}
            className="absolute top-0 bottom-0 w-px bg-border/80"
            style={{ left: `${(h / 24) * 100}%` }}
          />
        ))}
        {!invalid && (
          <div
            className={cn(
              "absolute top-0 bottom-0 rounded-sm",
              variant === "program" ? "bg-slot-program" : "bg-slot-adpack"
            )}
            style={{
              left: `${(startHour / 24) * 100}%`,
              width: `${((endHour - startHour) / 24) * 100}%`,
            }}
          />
        )}
      </div>
    </div>
  );
}
