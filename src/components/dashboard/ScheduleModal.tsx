import { useEffect, useState } from "react";
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
import {
  Tabs,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import { ScheduleBlock, Screen } from "@/lib/schedule-data";
import { Layers, Tv, Calendar, Repeat, AlertTriangle } from "lucide-react";
import { cn } from "@/lib/utils";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initial: ScheduleBlock | null;
  screens: Screen[];
  existingBlocks?: ScheduleBlock[];
  anchorDate?: Date;
  onSave: (block: ScheduleBlock) => void;
};

const hourToTime = (h: number) => {
  const hh = Math.floor(h);
  const mm = Math.round((h - hh) * 60);
  return `${String(hh).padStart(2, "0")}:${String(mm).padStart(2, "0")}`;
};

const timeToHour = (t: string) => {
  const [h, m] = t.split(":").map(Number);
  return (h || 0) + (m || 0) / 60;
};

type Form = {
  title: string;
  type: "program" | "adpack";
  screenId: string;
  start: string;
  end: string;
  client: string;
  campaign: string;
  recurring: NonNullable<ScheduleBlock["recurring"]>;
  totalSlots: number;
  filledSlots: number;
};

const empty = (screenId: string): Form => ({
  title: "",
  type: "program",
  screenId,
  start: "09:00",
  end: "10:00",
  client: "",
  campaign: "",
  recurring: "none",
  totalSlots: 24,
  filledSlots: 0,
});

export function ScheduleModal({ open, onOpenChange, initial, screens, existingBlocks = [], anchorDate, onSave }: Props) {
  const [form, setForm] = useState<Form>(empty(screens[0]?.id ?? ""));
  const isEdit = !!initial;

  useEffect(() => {
    if (!open) return;
    if (initial) {
      setForm({
        title: initial.title,
        type: initial.type,
        screenId: initial.screenId,
        start: hourToTime(initial.startHour),
        end: hourToTime(initial.endHour),
        client: initial.client ?? "",
        campaign: initial.campaign ?? "",
        recurring: initial.recurring ?? "none",
        totalSlots: initial.totalSlots ?? 24,
        filledSlots: initial.filledSlots ?? 0,
      });
    } else {
      setForm(empty(screens[0]?.id ?? ""));
    }
  }, [open, initial, screens]);

  const set = <K extends keyof Form>(k: K, v: Form[K]) => setForm((p) => ({ ...p, [k]: v }));

  const startHour = timeToHour(form.start);
  const endHour = timeToHour(form.end);
  const invalid = !form.title.trim() || !form.screenId || endHour <= startHour;

  const handleSave = () => {
    if (invalid) return;
    const filled = Math.min(form.filledSlots, form.totalSlots);
    const occupancy = form.totalSlots > 0 ? Math.round((filled / form.totalSlots) * 100) : 0;
    const block: ScheduleBlock = {
      id: initial?.id ?? `b-${Date.now()}`,
      screenId: form.screenId,
      startHour,
      endHour,
      title: form.title.trim(),
      type: form.type,
      status: initial?.status ?? "reserved",
      client: form.client.trim() || undefined,
      campaign: form.campaign.trim() || undefined,
      recurring: form.recurring,
      ...(form.type === "adpack"
        ? { totalSlots: form.totalSlots, filledSlots: filled, occupancy }
        : {}),
    };
    onSave(block);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle className="font-display flex items-center gap-2">
            <Calendar className="h-4 w-4" />
            {isEdit ? "Edit schedule" : "New schedule"}
          </DialogTitle>
          <DialogDescription>
            {isEdit
              ? "Update the booking details below and save your changes."
              : "Create a new Program or AdPack booking on a screen."}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
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

          <div className="space-y-1.5">
            <Label htmlFor="sched-title">Title</Label>
            <Input
              id="sched-title"
              value={form.title}
              placeholder={form.type === "program" ? "e.g. Nike Air Launch" : "e.g. Morning AdPack"}
              onChange={(e) => set("title", e.target.value)}
            />
          </div>

          <div className="space-y-1.5">
            <Label>Screen</Label>
            <Select value={form.screenId} onValueChange={(v) => set("screenId", v)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {screens.map((s) => (
                  <SelectItem key={s.id} value={s.id}>
                    {s.name} · {s.location}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="sched-start">Start time</Label>
              <Input
                id="sched-start"
                type="time"
                value={form.start}
                onChange={(e) => set("start", e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="sched-end">End time</Label>
              <Input
                id="sched-end"
                type="time"
                value={form.end}
                onChange={(e) => set("end", e.target.value)}
              />
            </div>
          </div>
          {endHour <= startHour && (
            <p className="text-xs text-destructive">End time must be after start time.</p>
          )}

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

          <div className="space-y-1.5">
            <Label>Recurring</Label>
            <Select
              value={form.recurring}
              onValueChange={(v) => set("recurring", v as Form["recurring"])}
            >
              <SelectTrigger>
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

          {form.type === "adpack" && (
            <div className="grid grid-cols-2 gap-3 rounded-lg border bg-muted/40 p-3">
              <div className="space-y-1.5">
                <Label htmlFor="sched-total">Total slots</Label>
                <Input
                  id="sched-total"
                  type="number"
                  min={1}
                  value={form.totalSlots}
                  onChange={(e) => set("totalSlots", Math.max(1, Number(e.target.value) || 1))}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="sched-filled">Filled slots</Label>
                <Input
                  id="sched-filled"
                  type="number"
                  min={0}
                  value={form.filledSlots}
                  onChange={(e) => set("filledSlots", Math.max(0, Number(e.target.value) || 0))}
                />
              </div>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={invalid}>
            {isEdit ? "Save changes" : "Create schedule"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
