export type SlotStatus = "free" | "reserved" | "blocked" | "conflict";
export type ScheduleType = "program" | "adpack";
/** One band = 6 slots (1 min pack); 2 bands = 12 (2 min); 3 bands = 18 (3 min). */
export type AdBandCount = 1 | 2 | 3;

export type Screen = {
  id: string;
  name: string;
  location: string;
  resolution: string;
  online: boolean;
  tags: string[];
  /** When false, only the program strip is available (no ad inventory). */
  adSupported: boolean;
  /** When `adSupported`, number of ad bands. `3` hides the program strip (ads only). */
  adBands?: AdBandCount;
};

export type ScreenTimelineLane = {
  laneKey: string;
  kind: ScheduleType;
  labelTitle: string;
};

export const SLOTS_PER_BAND = 6;

/** Band count when supported; defaults to 2 for legacy-style screens. */
export function screenAdBands(screen: Screen): AdBandCount {
  if (!screen.adSupported) return 1;
  return screen.adBands ?? 2;
}

export function screenAdSlotCapacity(screen: Screen) {
  const bandCount = screen.adSupported ? screenAdBands(screen) : 0;
  return {
    bandCount: bandCount as AdBandCount | 0,
    slotsPerBand: SLOTS_PER_BAND,
    totalSlots: bandCount * SLOTS_PER_BAND,
  };
}

/** Human-readable band pack for one ad-supported screen. */
export function formatAdPackBandPack(screen: Screen): string {
  if (!screen.adSupported) return "Ad-free screen";
  const bands = screenAdBands(screen);
  const { totalSlots } = screenAdSlotCapacity(screen);
  const minutes = bands === 1 ? 1 : bands === 2 ? 2 : 3;
  const bandWord = bands === 1 ? "1 band" : `${bands} bands`;
  return `${bandWord} · ${totalSlots} slots · ${minutes} min pack`;
}

/** Band label when multiple screens are selected in the Ad modal. */
export function formatAdPackBandPackForSelection(
  screens: Screen[],
  screenIds: string[]
): string {
  const selected = screens.filter((s) => screenIds.includes(s.id) && s.adSupported);
  if (selected.length === 0) {
    return "Select ad-supported screens";
  }
  const bandSet = [...new Set(selected.map((s) => screenAdBands(s)))].sort(
    (a, b) => a - b
  );
  if (bandSet.length === 1) {
    return formatAdPackBandPack(selected[0]);
  }
  return bandSet
    .map((b) => {
      const slots = b * SLOTS_PER_BAND;
      const min = b === 1 ? 1 : b === 2 ? 2 : 3;
      return `${b} band${b > 1 ? "s" : ""} (${slots} slots · ${min} min)`;
    })
    .join(" · ");
}

export type AdBandSlotGroup = {
  band: AdBandCount;
  filled: number;
  total: number;
};

export type AdSlotAvailabilityView = {
  bandCount: AdBandCount;
  slotsPerBand: number;
  totalSlots: number;
  filledSlots: number;
  occupancy: number;
  /** e.g. "Band 2" or "3 bands" */
  bandHeading: string;
  /** Short capacity line under heading */
  capacityLine: string;
  /** Per-band breakdown for the slot grid */
  groups: AdBandSlotGroup[];
};

function distributeFilledAcrossBands(
  filled: number,
  bandCount: number,
  slotsPerBand: number
): AdBandSlotGroup[] {
  let remaining = Math.max(0, filled);
  return Array.from({ length: bandCount }, (_, i) => {
    const band = (i + 1) as AdBandCount;
    const take = Math.min(slotsPerBand, remaining);
    remaining -= take;
    return { band, filled: take, total: slotsPerBand };
  });
}

/** Slot grid + band labels for the ad detail drawer. */
export function resolveAdSlotAvailability(
  block: ScheduleBlock,
  screen: Screen | null
): AdSlotAvailabilityView | null {
  if (!screen?.adSupported || block.type !== "adpack") return null;

  const { bandCount, slotsPerBand, totalSlots } = screenAdSlotCapacity(screen);
  if (bandCount === 0) return null;

  const blockTotal = block.totalSlots && block.totalSlots > 0 ? block.totalSlots : totalSlots;
  const blockFilled = block.filledSlots ?? 0;
  const ratio = Math.min(1, blockFilled / blockTotal);
  const filledSlots = Math.min(totalSlots, Math.round(ratio * totalSlots));
  const occupancy =
    block.occupancy ??
    (totalSlots > 0 ? Math.round((filledSlots / totalSlots) * 100) : 0);

  if (block.adBand && bandCount > 1) {
    const bandFilled = Math.min(slotsPerBand, Math.round(ratio * slotsPerBand));
    return {
      bandCount,
      slotsPerBand,
      totalSlots: slotsPerBand,
      filledSlots: bandFilled,
      occupancy: Math.round((bandFilled / slotsPerBand) * 100),
      bandHeading: `Band ${block.adBand}`,
      capacityLine: `6 slots · 1 min pack`,
      groups: [{ band: block.adBand, filled: bandFilled, total: slotsPerBand }],
    };
  }

  const packMinutes = bandCount === 1 ? 1 : bandCount === 2 ? 2 : 3;
  const bandHeading =
    bandCount === 1 ? "Band 1" : `${bandCount} bands`;
  const capacityLine = `${totalSlots} slots · ${packMinutes} min pack`;

  return {
    bandCount,
    slotsPerBand,
    totalSlots,
    filledSlots,
    occupancy,
    bandHeading,
    capacityLine,
    groups: distributeFilledAcrossBands(filledSlots, bandCount, slotsPerBand),
  };
}

export function getScreenTimelineLanes(screen: Screen): ScreenTimelineLane[] {
  if (!screen.adSupported) {
    return [{ laneKey: "program", kind: "program", labelTitle: "Programs" }];
  }
  const bands = screenAdBands(screen);
  if (bands === 3) {
    return [{ laneKey: "adpack", kind: "adpack", labelTitle: "Ads" }];
  }
  return [
    { laneKey: "program", kind: "program", labelTitle: "Programs" },
    { laneKey: "adpack", kind: "adpack", labelTitle: "Ads" },
  ];
}

/** Blocks rendered in one timeline lane (day view). */
export function blocksForTimelineLane(
  blocks: ScheduleBlock[],
  screenId: string,
  lane: ScreenTimelineLane
): ScheduleBlock[] {
  const onScreen = blocks.filter((b) => b.screenId === screenId);
  if (lane.kind === "program") return onScreen.filter((b) => b.type === "program");
  return onScreen.filter((b) => b.type === "adpack");
}

export function blockLaneKey(block: ScheduleBlock, _screen: Screen): string {
  if (block.type === "program") return "program";
  return "adpack";
}

export type ScheduleBlock = {
  id: string;
  screenId: string;
  programId?: string;
  startHour: number; // 0-24, can be fractional
  endHour: number;
  title: string;
  type: ScheduleType;
  status: SlotStatus;
  client?: string;
  occupancy?: number; // 0-100, for AdPacks
  totalSlots?: number;
  filledSlots?: number;
  /** Optional: logical band placement when slicing a unified ad lane in data or exports. Not used by the UI layout. */
  adBand?: AdBandCount;
  recurring?:
    | "none"
    | "daily"
    | "weekdays"
    | "weekly"
    | "biweekly"
    | "monthly"
    | "specific_dates"
    | "interval";
  daysOfWeek?: number[]; // 0=Sun..6=Sat, for weekly/biweekly
  recurrenceEnd?: "never" | "on" | "after";
  recurrenceEndDate?: string; // ISO date (YYYY-MM-DD) when end="on"
  recurrenceCount?: number; // when end="after"
  specificDates?: string[]; // ISO dates for specific_dates pattern
  intervalDays?: number; // every N days for interval pattern
  /** Program schedule: explicit one-off local ranges */
  noneSpans?: { start: string; end: string }[];
  /** Program monthly: day-of-month hits (e.g. 15, 20) */
  programMonthlyDays?: number[];
  /** Program monthly: first month YYYY-MM */
  programMonthStart?: string;
  /** Program monthly: last month inclusive YYYY-MM when ended by date range */
  programMonthUntil?: string;
  /** Program interval pattern end semantics */
  programIntervalEndMode?: "never" | "on_date" | "after_occurrences";
  /** Program weekly: max matching-day occurrences when recurrence ends after count */
  weeklyOccurrenceCap?: number;
  /** Daily program: repeat every N days (1 = each day along the stepped grid) */
  programDailyStep?: number;
  /** Weekly program: run only every N calendar weeks from the start date */
  programWeeklyStep?: number;
  /** Monthly program: run only every N months from the start month */
  programMonthlyStep?: number;
  campaign?: string;
  startDate?: string; // YYYY-MM-DD program schedule anchor
};

export type Program = {
  id: string;
  name: string;
  client: string;
  campaign?: string;
  durationHint?: number; // hours
  category: "brand" | "news" | "entertainment" | "sports" | "lifestyle";
};

export const programs: Program[] = [
  { id: "prg-1",  name: "Nike Air Launch",     client: "Nike",     campaign: "Air Max Drop",   durationHint: 3, category: "brand" },
  { id: "prg-2",  name: "Apple Vision Pro",    client: "Apple",    campaign: "Vision Spring",  durationHint: 3, category: "brand" },
  { id: "prg-3",  name: "Netflix Premiere",    client: "Netflix",  campaign: "New Releases",   durationHint: 4, category: "entertainment" },
  { id: "prg-4",  name: "Tesla Cybertruck",    client: "Tesla",    campaign: "EV Showcase",    durationHint: 5, category: "brand" },
  { id: "prg-5",  name: "Samsung Galaxy",      client: "Samsung",  campaign: "Galaxy Unpacked", durationHint: 4, category: "brand" },
  { id: "prg-6",  name: "Sony PlayStation",    client: "Sony",     campaign: "PS Holiday",     durationHint: 5, category: "entertainment" },
  { id: "prg-7",  name: "L'Oréal Spring",      client: "L'Oréal",  campaign: "Spring Beauty",  durationHint: 3, category: "lifestyle" },
  { id: "prg-8",  name: "Toyota EV",           client: "Toyota",   campaign: "Beyond Zero",    durationHint: 4, category: "brand" },
  { id: "prg-9",  name: "BTS World Tour",      client: "HYBE",     campaign: "World Tour 26",  durationHint: 4, category: "entertainment" },
  { id: "prg-10", name: "ESPN Live Sports",    client: "ESPN",     campaign: "Game Night",     durationHint: 3, category: "sports" },
  { id: "prg-11", name: "BBC News Hour",       client: "BBC",     campaign: "Top of Hour",    durationHint: 1, category: "news" },
  { id: "prg-12", name: "Spotify Wrapped",     client: "Spotify",  campaign: "Year in Music",  durationHint: 2, category: "brand" },
];

export const screenTags = ["Landmark", "Transit", "Retail", "Premium", "Entertainment"] as const;

export const screens: Screen[] = [
  { id: "scr-1", name: "Times Sq · North", location: "New York", resolution: "4K", online: true, tags: ["Landmark", "Premium"], adSupported: true, adBands: 2 },
  { id: "scr-2", name: "Times Sq · South", location: "New York", resolution: "4K", online: true, tags: ["Landmark", "Retail"], adSupported: true, adBands: 1 },
  { id: "scr-3", name: "Shibuya Crossing", location: "Tokyo", resolution: "8K", online: true, tags: ["Landmark", "Transit"], adSupported: false },
  { id: "scr-4", name: "Piccadilly Lights", location: "London", resolution: "4K", online: false, tags: ["Landmark", "Premium"], adSupported: true, adBands: 3 },
  { id: "scr-5", name: "Champs-Élysées 12", location: "Paris", resolution: "4K", online: true, tags: ["Retail", "Premium"], adSupported: true, adBands: 1 },
  { id: "scr-6", name: "Marina Bay Tower", location: "Singapore", resolution: "4K", online: true, tags: ["Landmark", "Entertainment"], adSupported: false },
  { id: "scr-7", name: "Sunset Strip 401", location: "Los Angeles", resolution: "4K", online: true, tags: ["Entertainment", "Retail"], adSupported: true, adBands: 2 },
  { id: "scr-8", name: "Gangnam Mega", location: "Seoul", resolution: "8K", online: true, tags: ["Retail", "Premium"], adSupported: true, adBands: 3 },
];

const DEMO_START = "2026-05-01";
const DEMO_END = "2026-07-31";

export const initialBlocks: ScheduleBlock[] = [
  { id: "b1", screenId: "scr-1", startHour: 6, endHour: 9, title: "Morning Brew Co.", type: "adpack", status: "reserved", client: "Brew Co.", occupancy: 82, totalSlots: 24, filledSlots: 20, recurring: "weekdays", campaign: "Q2 Awareness" },
  { id: "b2", screenId: "scr-1", programId: "prg-1", startHour: 9, endHour: 12, title: "Nike Air Launch", type: "program", status: "reserved", client: "Nike", recurring: "daily", startDate: DEMO_START, recurrenceEnd: "on", recurrenceEndDate: DEMO_END, campaign: "Air Max Drop" },
  { id: "b3", screenId: "scr-1", startHour: 14, endHour: 17, title: "Local Mix · AdPack", type: "adpack", status: "reserved", occupancy: 45, totalSlots: 24, filledSlots: 11 },
  { id: "b4", screenId: "scr-1", programId: "prg-3", startHour: 18, endHour: 22, title: "Netflix Premiere", type: "program", status: "reserved", client: "Netflix", recurring: "weekdays", startDate: DEMO_START, recurrenceEnd: "on", recurrenceEndDate: DEMO_END },

  { id: "b5", screenId: "scr-2", startHour: 0, endHour: 6, title: "Maintenance Window", type: "program", status: "reserved" },
  { id: "b6", screenId: "scr-2", programId: "prg-2", startHour: 8, endHour: 11, title: "Apple Vision Pro", type: "program", status: "reserved", client: "Apple", recurring: "daily", startDate: DEMO_START, recurrenceEnd: "on", recurrenceEndDate: DEMO_END, campaign: "Vision Spring" },
  { id: "b7", screenId: "scr-2", startHour: 12, endHour: 15, title: "Lunch AdPack", type: "adpack", status: "reserved", occupancy: 100, totalSlots: 18, filledSlots: 18 },
  { id: "b8", screenId: "scr-2", programId: "prg-3", startHour: 19, endHour: 23, title: "Netflix Premiere", type: "program", status: "reserved", client: "Netflix", recurring: "daily", startDate: DEMO_START, recurrenceEnd: "on", recurrenceEndDate: DEMO_END },

  { id: "b9", screenId: "scr-3", programId: "prg-6", startHour: 5, endHour: 10, title: "Sony PlayStation", type: "program", status: "reserved", client: "Sony", recurring: "daily", startDate: DEMO_START, recurrenceEnd: "on", recurrenceEndDate: DEMO_END },
  { id: "b11", screenId: "scr-3", programId: "prg-8", startHour: 18, endHour: 24, title: "Toyota EV", type: "program", status: "reserved", client: "Toyota", recurring: "daily", startDate: DEMO_START, recurrenceEnd: "on", recurrenceEndDate: DEMO_END },

  // scr-4: ads-only · 3 bands on one unified ad strip (18 slots)
  { id: "b12a", screenId: "scr-4", startHour: 6, endHour: 12, title: "UK Morning Pack", type: "adpack", status: "reserved", client: "Local Network", occupancy: 70, totalSlots: 18, filledSlots: 12 },
  { id: "b12b", screenId: "scr-4", startHour: 13, endHour: 18, title: "Afternoon Block", type: "adpack", status: "reserved", occupancy: 50, totalSlots: 18, filledSlots: 9 },
  { id: "b12c", screenId: "scr-4", startHour: 18, endHour: 23, title: "Premium Prime", type: "adpack", status: "reserved", client: "House", occupancy: 0, totalSlots: 18, filledSlots: 0 },

  { id: "b13", screenId: "scr-5", programId: "prg-7", startHour: 7, endHour: 10, title: "L'Oréal Spring", type: "program", status: "reserved", client: "L'Oréal", recurring: "daily", startDate: DEMO_START, recurrenceEnd: "on", recurrenceEndDate: DEMO_END },
  { id: "b14", screenId: "scr-5", startHour: 13, endHour: 18, title: "Eurozone AdPack", type: "adpack", status: "reserved", occupancy: 110, totalSlots: 20, filledSlots: 22, campaign: "Overbooked" },

  { id: "b15", screenId: "scr-6", programId: "prg-10", startHour: 9, endHour: 13, title: "ESPN Live Sports", type: "program", status: "reserved", client: "ESPN", recurring: "daily", startDate: DEMO_START, recurrenceEnd: "on", recurrenceEndDate: DEMO_END },

  { id: "b17", screenId: "scr-7", programId: "prg-4", startHour: 6, endHour: 11, title: "Tesla Cybertruck", type: "program", status: "reserved", client: "Tesla", recurring: "daily", startDate: DEMO_START, recurrenceEnd: "on", recurrenceEndDate: DEMO_END },
  { id: "b18", screenId: "scr-7", startHour: 14, endHour: 19, title: "Sunset AdPack", type: "adpack", status: "reserved", occupancy: 78, totalSlots: 24, filledSlots: 19 },

  // scr-8: same — single ad lane for full 18-slot inventory
  { id: "b19a", screenId: "scr-8", startHour: 8, endHour: 13, title: "Gangnam AM Stack", type: "adpack", status: "reserved", client: "K-Retail Co.", occupancy: 90, totalSlots: 18, filledSlots: 11 },
  { id: "b19b", screenId: "scr-8", startHour: 13, endHour: 17, title: "Lunch Carousel", type: "adpack", status: "reserved", occupancy: 40, totalSlots: 18, filledSlots: 6 },
  { id: "b19c", screenId: "scr-8", startHour: 18, endHour: 24, title: "Prime Glow", type: "adpack", status: "reserved", client: "Music Promo", occupancy: 120, totalSlots: 18, filledSlots: 12, recurring: "weekdays", campaign: "Overbooked demo" },
];

export const locations = Array.from(new Set(screens.map((s) => s.location)));
