import { useEffect, useMemo, useState } from "react";
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
import { ScheduleBlock, Screen, Program, programs as allPrograms } from "@/lib/schedule-data";
import {
  Layers,
  Tv,
  Calendar,
  Repeat,
  AlertTriangle,
  Plus,
  Trash2,
  MonitorPlay,
} from "lucide-react";
import { cn } from "@/lib/utils";

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
  programId: string; // "" = custom
  title: string;
  type: "program" | "adpack";
  screenIds: string[];
  slots: Slot[];
  client: string;
  campaign: string;
  recurring: Recurrence;
  daysOfWeek: number[];
  endMode: EndMode;
  endDate: string; // YYYY-MM-DD
  endCount: number;
  totalSlots: number;
  filledSlots: number;
};

function defaultEndDate(anchor: Date) {
  const d = new Date(anchor);
  d.setMonth(d.getMonth() + 1);
  return d.toISOString().slice(0, 10);
}

const makeEmpty = (screenId: string, anchor: Date): Form => ({
  programId: "",
  title: "",
  type: "program",
  screenIds: screenId ? [screenId] : [],
  slots: [{ start: "09:00", end: "10:00" }],
  client: "",
  campaign: "",
  recurring: "none",
  daysOfWeek: [anchor.getDay()],
  endMode: "never",
  endDate: defaultEndDate(anchor),
  endCount: 10,
  totalSlots: 24,
  filledSlots: 0,
});

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
  const [form, setForm] = useState<Form>(makeEmpty(screens[0]?.id ?? "", anchor));
  const isEdit = !!initial;

  useEffect(() => {
    if (!open) return;
    if (initial) {
      setForm({
        programId:
          allPrograms.find((p) => p.name === initial.title)?.id ?? "",
        title: initial.title,
        type: initial.type,
        screenIds: [initial.screenId],
        slots: [{ start: hourToTime(initial.startHour), end: hourToTime(initial.endHour) }],
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
      setForm(makeEmpty(screens[0]?.id ?? "", anchor));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, initial]);

  const set = <K extends keyof Form>(k: K, v: Form[K]) =>
    setForm((p) => ({ ...p, [k]: v }));

  const pickProgram = (id: string) => {
    if (id === "__custom") {
      setForm((p) => ({ ...p, programId: "" }));
      return;
    }
    const prog = allPrograms.find((p) => p.id === id);
    if (!prog) return;
    setForm((p) => ({
      ...p,
      programId: prog.id,
      title: prog.name,
      client: prog.client,
      campaign: prog.campaign ?? p.campaign,
    }));
  };

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
    !form.title.trim() ||
    form.screenIds.length === 0 ||
    form.slots.length === 0 ||
    !slotsValid ||
    (needsDays && form.daysOfWeek.length === 0);

  // Conflict check: per (screen × slot)
  const conflictMatrix = useMemo(() => {
    const map: Record<string, boolean> = {};
    for (const sid of form.screenIds) {
      for (let i = 0; i < form.slots.length; i++) {
        const sh = timeToHour(form.slots[i].start);
        const eh = timeToHour(form.slots[i].end);
        const hit = existingBlocks.some(
          (b) =>
            b.id !== initial?.id &&
            b.screenId === sid &&
            b.status !== "blocked" &&
            sh < b.endHour &&
            eh > b.startHour
        );
        map[`${sid}::${i}`] = hit;
      }
    }
    return map;
  }, [form.screenIds, form.slots, existingBlocks, initial?.id]);

  const anyConflict = Object.values(conflictMatrix).some(Boolean);

  const occurrences = buildOccurrences(
    anchor,
    form.recurring,
    form.daysOfWeek,
    form.endMode,
    form.endDate,
    form.endCount,
    form.endMode === "never" ? 6 : 50
  );

  const totalGenerated =
    form.screenIds.length * form.slots.length * Math.max(1, occurrences.length);

  const handleSave = () => {
    if (invalid) return;
    const filled = Math.min(form.filledSlots, form.totalSlots);
    const occupancy =
      form.totalSlots > 0 ? Math.round((filled / form.totalSlots) * 100) : 0;

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
          startHour: sh,
          endHour: eh,
          title: form.title.trim(),
          type: form.type,
          status: initial?.status ?? "reserved",
          client: form.client.trim() || undefined,
          campaign: form.campaign.trim() || undefined,
          recurring: form.recurring,
          daysOfWeek: needsDays ? form.daysOfWeek : undefined,
          recurrenceEnd: form.recurring === "none" ? undefined : form.endMode,
          recurrenceEndDate:
            form.recurring !== "none" && form.endMode === "on" ? form.endDate : undefined,
          recurrenceCount:
            form.recurring !== "none" && form.endMode === "after" ? form.endCount : undefined,
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
              ? "Update booking details and save your changes."
              : "Pick a program, target screens, time slots and a recurrence rule."}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-5">
          {/* Type */}
          <Tabs value={form.type} onValueChange={(v) => set("type", v as Form["type"])}>
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="program" className="gap-1.5">
                <Tv className="h-3.5 w-3.5" /> Program
              </TabsTrigger>
              <TabsTrigger value="adpack" className="gap-1.5">
                <Layers className="h-3.5 w-3.5" /> AdPack
              </TabsTrigger>
            </TabsList>
          </Tabs>

          {/* Program picker */}
          {form.type === "program" && (
            <div className="space-y-1.5">
              <Label>Program library</Label>
              <Select
                value={form.programId || "__custom"}
                onValueChange={pickProgram}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Choose a program" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__custom">Custom (enter manually)</SelectItem>
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
                              {p.name} · {p.client}
                            </SelectItem>
                          ))}
                        </div>
                      );
                    }
                  )}
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Title */}
          <div className="space-y-1.5">
            <Label htmlFor="sched-title">Title</Label>
            <Input
              id="sched-title"
              value={form.title}
              placeholder={form.type === "program" ? "e.g. Nike Air Launch" : "e.g. Morning AdPack"}
              onChange={(e) => set("title", e.target.value)}
            />
          </div>

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
                  onClick={() => set("screenIds", screens.map((s) => s.id))}
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
            <div className="grid grid-cols-2 gap-1.5 rounded-lg border bg-muted/30 p-2 max-h-44 overflow-y-auto">
              {screens.map((s) => {
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
                    <div className="relative flex-1 h-2 rounded bg-muted overflow-hidden">
                      {[6, 12, 18].map((h) => (
                        <div
                          key={h}
                          className="absolute top-0 bottom-0 w-px bg-border"
                          style={{ left: `${(h / 24) * 100}%` }}
                        />
                      ))}
                      {!bad && (
                        <div
                          className={cn(
                            "absolute top-0 bottom-0 rounded-sm",
                            form.type === "program" ? "bg-slot-program" : "bg-slot-adpack"
                          )}
                          style={{
                            left: `${(sh / 24) * 100}%`,
                            width: `${((eh - sh) / 24) * 100}%`,
                          }}
                        />
                      )}
                    </div>
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

          {/* Recurrence */}
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
                  <SelectItem value="monthly">Monthly on day {anchor.getDate()}</SelectItem>
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

          {/* Recurrence end */}
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

          {/* Client/campaign */}
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

          {/* Preview */}
          <div className="rounded-lg border bg-muted/30 p-3 space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5 text-sm font-medium">
                <Repeat className="h-3.5 w-3.5 text-muted-foreground" />
                Recurrence preview
              </div>
              <span className="text-[11px] text-muted-foreground tabular-nums">
                {form.screenIds.length} screens × {form.slots.length} slots ×{" "}
                {occurrences.length} {occurrences.length === 1 ? "date" : "dates"}
                {" = "}
                <span className="font-semibold text-foreground">{totalGenerated}</span> bookings
              </span>
            </div>

            {form.recurring === "none" ? (
              <p className="text-[11px] text-muted-foreground">
                Single booking on {anchor.toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" })} — enable recurrence to repeat.
              </p>
            ) : (
              <div className="space-y-1">
                {occurrences.map((d, i) => (
                  <div
                    key={d.toISOString()}
                    className="flex items-center gap-2 rounded-md bg-background/60 border border-border/60 px-2 py-1.5 text-[11px]"
                  >
                    <span className="w-8 font-mono tabular-nums text-muted-foreground">
                      {WEEKDAY_LONG[d.getDay()]}
                    </span>
                    <span className="w-20 font-mono tabular-nums">
                      {d.toLocaleDateString(undefined, { month: "short", day: "2-digit" })}
                    </span>
                    <div className="relative flex-1 h-4 rounded bg-muted overflow-hidden">
                      {[6, 12, 18].map((h) => (
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
                              form.type === "program" ? "bg-slot-program" : "bg-slot-adpack",
                              i === 0 && "ring-1 ring-primary/60"
                            )}
                            style={{
                              left: `${(sh / 24) * 100}%`,
                              width: `${Math.max(1.5, ((eh - sh) / 24) * 100)}%`,
                            }}
                          />
                        );
                      })}
                    </div>
                    <span className="w-16 text-right font-mono tabular-nums text-muted-foreground">
                      ×{form.screenIds.length * form.slots.length}
                    </span>
                  </div>
                ))}
              </div>
            )}

            {anyConflict && (
              <p className="text-[11px] text-destructive flex items-center gap-1">
                <AlertTriangle className="h-3 w-3" />
                Some screen/slot combinations overlap existing bookings.
              </p>
            )}
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={invalid}>
            {isEdit
              ? "Save changes"
              : `Create ${form.screenIds.length * form.slots.length} booking${form.screenIds.length * form.slots.length === 1 ? "" : "s"}`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
