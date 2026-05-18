import type { Screen, ScheduleType } from "@/lib/schedule-data";
import { defaultProgramSchedule } from "@/lib/program-schedule";

export type ScheduleCreateDraft = {
  screenId: string;
  laneKey: string;
  scheduleType: ScheduleType;
  startHour: number;
  endHour: number;
};

export function buildScheduleCreateDraft(
  screenId: string,
  laneKey: string,
  scheduleType: ScheduleType,
  startHour: number,
  durationHours = 1
): ScheduleCreateDraft {
  const start = Math.max(0, Math.min(23, startHour));
  return {
    screenId,
    laneKey,
    scheduleType,
    startHour: start,
    endHour: Math.min(24, start + durationHours),
  };
}

export function hourOverlapsBlock(
  blocks: { startHour: number; endHour: number }[],
  hour: number
): boolean {
  const slotEnd = hour + 1;
  return blocks.some((b) => b.startHour < slotEnd && b.endHour > hour);
}

export function emptyFormFromCreateDraft(
  draft: ScheduleCreateDraft,
  anchor: Date
): ReturnType<typeof formSeedFromCreateDraft> & {
  programId: string;
  title: string;
  client: string;
  campaign: string;
} {
  const seed = formSeedFromCreateDraft(draft, anchor);
  return {
    ...seed,
    programId: "",
    title: "",
    client: "",
    campaign: "",
  };
}

export function formSeedFromCreateDraft(
  draft: ScheduleCreateDraft,
  anchor: Date
): {
  type: ScheduleType;
  screenIds: string[];
  slots: { start: string; end: string }[];
  programSchedule: ReturnType<typeof defaultProgramSchedule>;
} {
  const pad = (h: number) => {
    const hh = Math.floor(h);
    const mm = Math.round((h - hh) * 60);
    return `${String(hh).padStart(2, "0")}:${String(mm).padStart(2, "0")}`;
  };

  return {
    type: draft.scheduleType,
    screenIds: [draft.screenId],
    slots: [{ start: pad(draft.startHour), end: pad(draft.endHour) }],
    programSchedule: defaultProgramSchedule(anchor),
  };
}

/** Ad-free screens cannot host ad packs. */
export function screenAllowsScheduleType(screen: Screen, type: ScheduleType): boolean {
  if (type === "program") return true;
  return screen.adSupported;
}
