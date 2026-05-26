import type { AdBandCount, ScheduleBlock, Screen } from "@/lib/schedule-data";
import type { AdSupportedProgramLayout } from "@/lib/schedule-data";
import { screenAdBands } from "@/lib/schedule-data";
import {
  resolveAdPackBands,
  resolveProgramLayout,
} from "@/lib/schedule-block-labels";

export type BandPairMismatch = {
  expected: AdBandCount;
  actual: AdBandCount;
  programId: string;
  adId: string;
};

export type ScheduleBandConflictDetail = {
  key: string;
  screenId: string;
  screenName: string;
  timeLabel: string;
  expected: AdBandCount;
  actual: AdBandCount;
  schedulingType: "program" | "adpack";
  partnerTitle: string;
  partnerType: "program" | "adpack";
  partnerId: string;
  partnerProgramId?: string;
};

function formatHourRange(startHour: number, endHour: number): string {
  const fmt = (h: number) => {
    const hh = Math.floor(h);
    const mm = Math.round((h - hh) * 60);
    return `${String(hh).padStart(2, "0")}:${String(mm).padStart(2, "0")}`;
  };
  return `${fmt(startHour)} – ${fmt(endHour)}`;
}

export function editingBlockExcludeIds(
  existingBlocks: ScheduleBlock[],
  editingBlockId?: string
): Set<string> {
  const exclude = new Set<string>();
  if (!editingBlockId) return exclude;
  exclude.add(editingBlockId);
  const dash = editingBlockId.lastIndexOf("-");
  const base =
    dash > 0 && /^\d+$/.test(editingBlockId.slice(dash + 1))
      ? editingBlockId.slice(0, dash)
      : editingBlockId;
  for (const b of existingBlocks) {
    if (b.id === editingBlockId || b.id.startsWith(`${base}-`)) {
      exclude.add(b.id);
    }
  }
  return exclude;
}

/** Band mismatches between draft bookings and overlapping blocks already on the schedule. */
export function detectScheduleBandConflicts(params: {
  drafts: ScheduleBlock[];
  existingBlocks: ScheduleBlock[];
  screens: Screen[];
  excludeBlockIds?: Set<string>;
}): ScheduleBandConflictDetail[] {
  const exclude = params.excludeBlockIds ?? new Set<string>();
  const pool = params.existingBlocks.filter((b) => !exclude.has(b.id));
  const screenMap = new Map(params.screens.map((s) => [s.id, s]));
  const out: ScheduleBandConflictDetail[] = [];
  const seen = new Set<string>();

  for (const draft of params.drafts) {
    const screen = screenMap.get(draft.screenId);
    if (!screen?.adSupported) continue;
    const screenBands = screenAdBands(screen);
    const mismatch = blockBandMismatch(draft, pool, true, screenBands);
    if (!mismatch) continue;

    const partner =
      draft.type === "program"
        ? pool.find((b) => b.id === mismatch.adId)
        : pool.find((b) => b.id === mismatch.programId);
    if (!partner) continue;

    const key = `${draft.screenId}::${draft.startHour}-${draft.endHour}::${partner.id}`;
    if (seen.has(key)) continue;
    seen.add(key);

    out.push({
      key,
      screenId: draft.screenId,
      screenName: screen.name,
      timeLabel: formatHourRange(draft.startHour, draft.endHour),
      expected: mismatch.expected,
      actual: mismatch.actual,
      schedulingType: draft.type,
      partnerTitle: partner.title,
      partnerType: partner.type,
      partnerId: partner.id,
      partnerProgramId: partner.programId,
    });
  }

  return out;
}

/** Ad bands implied by program layout (1b / 2b / 3b in the program strip). */
export function programLayoutExpectedAdBands(
  layout: AdSupportedProgramLayout
): AdBandCount {
  if (layout === "full_ads") return 3;
  if (layout === "content_1_ads_2") return 2;
  return 1;
}

export function blocksHoursOverlap(a: ScheduleBlock, b: ScheduleBlock): boolean {
  return a.startHour < b.endHour && b.startHour < a.endHour;
}

export function overlapHours(
  a: ScheduleBlock,
  b: ScheduleBlock
): { start: number; end: number } | null {
  const start = Math.max(a.startHour, b.startHour);
  const end = Math.min(a.endHour, b.endHour);
  if (end <= start) return null;
  return { start, end };
}

function findOverlappingAd(
  program: ScheduleBlock,
  screenBlocks: ScheduleBlock[]
): ScheduleBlock | null {
  const ads = screenBlocks.filter(
    (b) =>
      b.type === "adpack" &&
      b.screenId === program.screenId &&
      blocksHoursOverlap(program, b)
  );
  if (ads.length === 0) return null;
  return ads.reduce((best, ad) => {
    const o = overlapHours(program, ad)!;
    const bestO = overlapHours(program, best)!;
    return o.end - o.start > bestO.end - bestO.start ? ad : best;
  });
}

function findOverlappingProgram(
  ad: ScheduleBlock,
  screenBlocks: ScheduleBlock[]
): ScheduleBlock | null {
  const programs = screenBlocks.filter(
    (b) =>
      b.type === "program" &&
      b.screenId === ad.screenId &&
      blocksHoursOverlap(ad, b)
  );
  if (programs.length === 0) return null;
  return programs.reduce((best, p) => {
    const o = overlapHours(ad, p)!;
    const bestO = overlapHours(ad, best)!;
    return o.end - o.start > bestO.end - bestO.start ? p : best;
  });
}

/** Mismatch when a stacked program/ad pair has different band counts. */
export function blockBandMismatch(
  block: ScheduleBlock,
  screenBlocks: ScheduleBlock[],
  adSupported: boolean,
  screenBands?: AdBandCount
): BandPairMismatch | null {
  if (!adSupported) return null;

  if (block.type === "program") {
    const layout = resolveProgramLayout(block, true, screenBands);
    if (!layout) return null;
    const expected = programLayoutExpectedAdBands(layout);
    const ad = findOverlappingAd(block, screenBlocks);
    if (!ad) return null;
    const actual = resolveAdPackBands(ad, screenBands);
    if (actual === expected) return null;
    return { expected, actual, programId: block.id, adId: ad.id };
  }

  if (block.type === "adpack") {
    const program = findOverlappingProgram(block, screenBlocks);
    if (!program) return null;
    const layout = resolveProgramLayout(program, true, screenBands);
    if (!layout) return null;
    const expected = programLayoutExpectedAdBands(layout);
    const actual = resolveAdPackBands(block, screenBands);
    if (actual === expected) return null;
    return { expected, actual, programId: program.id, adId: block.id };
  }

  return null;
}

export function mismatchHighlightOnAd(
  block: ScheduleBlock,
  mismatch: BandPairMismatch | null,
  screenBlocks: ScheduleBlock[],
  hourW: number
): { left: number; width: number } | null {
  if (!mismatch || block.type !== "adpack" || block.id !== mismatch.adId) return null;
  const program = screenBlocks.find((b) => b.id === mismatch.programId);
  if (!program) return null;
  const span = overlapHours(program, block);
  if (!span) return null;
  return {
    left: (span.start - block.startHour) * hourW,
    width: (span.end - span.start) * hourW,
  };
}
