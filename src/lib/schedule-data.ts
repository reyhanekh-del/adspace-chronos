export type SlotStatus = "free" | "reserved" | "blocked" | "conflict";
export type ScheduleType = "program" | "adpack";

export type Screen = {
  id: string;
  name: string;
  location: string;
  resolution: string;
  online: boolean;
  tags: string[];
};

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
  { id: "scr-1", name: "Times Sq · North", location: "New York", resolution: "4K", online: true, tags: ["Landmark", "Premium"] },
  { id: "scr-2", name: "Times Sq · South", location: "New York", resolution: "4K", online: true, tags: ["Landmark", "Retail"] },
  { id: "scr-3", name: "Shibuya Crossing", location: "Tokyo", resolution: "8K", online: true, tags: ["Landmark", "Transit"] },
  { id: "scr-4", name: "Piccadilly Lights", location: "London", resolution: "4K", online: false, tags: ["Landmark", "Premium"] },
  { id: "scr-5", name: "Champs-Élysées 12", location: "Paris", resolution: "4K", online: true, tags: ["Retail", "Premium"] },
  { id: "scr-6", name: "Marina Bay Tower", location: "Singapore", resolution: "4K", online: true, tags: ["Landmark", "Entertainment"] },
  { id: "scr-7", name: "Sunset Strip 401", location: "Los Angeles", resolution: "4K", online: true, tags: ["Entertainment", "Retail"] },
  { id: "scr-8", name: "Gangnam Mega", location: "Seoul", resolution: "8K", online: true, tags: ["Retail", "Premium"] },
];

const DEMO_START = "2026-05-01";
const DEMO_END = "2026-07-31";

export const initialBlocks: ScheduleBlock[] = [
  { id: "b1", screenId: "scr-1", startHour: 6, endHour: 9, title: "Morning Brew Co.", type: "adpack", status: "reserved", client: "Brew Co.", occupancy: 82, totalSlots: 24, filledSlots: 20, recurring: "weekdays", campaign: "Q2 Awareness" },
  { id: "b2", screenId: "scr-1", programId: "prg-1", startHour: 9, endHour: 12, title: "Nike Air Launch", type: "program", status: "reserved", client: "Nike", recurring: "daily", startDate: DEMO_START, recurrenceEnd: "on", recurrenceEndDate: DEMO_END, campaign: "Air Max Drop" },
  { id: "b3", screenId: "scr-1", startHour: 14, endHour: 17, title: "Local Mix · AdPack", type: "adpack", status: "reserved", occupancy: 45, totalSlots: 24, filledSlots: 11 },
  { id: "b4", screenId: "scr-1", programId: "prg-3", startHour: 18, endHour: 22, title: "Netflix Premiere", type: "program", status: "conflict", client: "Netflix", recurring: "weekdays", startDate: DEMO_START, recurrenceEnd: "on", recurrenceEndDate: DEMO_END },

  { id: "b5", screenId: "scr-2", startHour: 0, endHour: 6, title: "Maintenance Window", type: "program", status: "blocked" },
  { id: "b6", screenId: "scr-2", programId: "prg-2", startHour: 8, endHour: 11, title: "Apple Vision Pro", type: "program", status: "reserved", client: "Apple", recurring: "daily", startDate: DEMO_START, recurrenceEnd: "on", recurrenceEndDate: DEMO_END, campaign: "Vision Spring" },
  { id: "b7", screenId: "scr-2", startHour: 12, endHour: 15, title: "Lunch AdPack", type: "adpack", status: "reserved", occupancy: 100, totalSlots: 18, filledSlots: 18 },
  { id: "b8", screenId: "scr-2", programId: "prg-3", startHour: 19, endHour: 23, title: "Netflix Premiere", type: "program", status: "reserved", client: "Netflix", recurring: "daily", startDate: DEMO_START, recurrenceEnd: "on", recurrenceEndDate: DEMO_END },

  { id: "b9", screenId: "scr-3", programId: "prg-6", startHour: 5, endHour: 10, title: "Sony PlayStation", type: "program", status: "reserved", client: "Sony", recurring: "daily", startDate: DEMO_START, recurrenceEnd: "on", recurrenceEndDate: DEMO_END },
  { id: "b10", screenId: "scr-3", startHour: 11, endHour: 16, title: "Asia AdPack", type: "adpack", status: "reserved", occupancy: 67, totalSlots: 30, filledSlots: 20 },
  { id: "b11", screenId: "scr-3", programId: "prg-8", startHour: 18, endHour: 24, title: "Toyota EV", type: "program", status: "reserved", client: "Toyota", recurring: "daily", startDate: DEMO_START, recurrenceEnd: "on", recurrenceEndDate: DEMO_END },

  { id: "b12", screenId: "scr-4", startHour: 0, endHour: 24, title: "Screen Offline", type: "program", status: "blocked" },

  { id: "b13", screenId: "scr-5", programId: "prg-7", startHour: 7, endHour: 10, title: "L'Oréal Spring", type: "program", status: "reserved", client: "L'Oréal", recurring: "daily", startDate: DEMO_START, recurrenceEnd: "on", recurrenceEndDate: DEMO_END },
  { id: "b14", screenId: "scr-5", startHour: 13, endHour: 18, title: "Eurozone AdPack", type: "adpack", status: "conflict", occupancy: 110, totalSlots: 20, filledSlots: 22, campaign: "Overbooked" },

  { id: "b15", screenId: "scr-6", programId: "prg-10", startHour: 9, endHour: 13, title: "ESPN Live Sports", type: "program", status: "reserved", client: "ESPN", recurring: "daily", startDate: DEMO_START, recurrenceEnd: "on", recurrenceEndDate: DEMO_END },
  { id: "b16", screenId: "scr-6", startHour: 15, endHour: 20, title: "Marina AdPack", type: "adpack", status: "reserved", occupancy: 30, totalSlots: 24, filledSlots: 7 },

  { id: "b17", screenId: "scr-7", programId: "prg-4", startHour: 6, endHour: 11, title: "Tesla Cybertruck", type: "program", status: "reserved", client: "Tesla", recurring: "daily", startDate: DEMO_START, recurrenceEnd: "on", recurrenceEndDate: DEMO_END },
  { id: "b18", screenId: "scr-7", startHour: 14, endHour: 19, title: "Sunset AdPack", type: "adpack", status: "reserved", occupancy: 78, totalSlots: 24, filledSlots: 19 },

  { id: "b19", screenId: "scr-8", programId: "prg-5", startHour: 8, endHour: 12, title: "Samsung Galaxy", type: "program", status: "reserved", client: "Samsung", recurring: "daily", startDate: DEMO_START, recurrenceEnd: "on", recurrenceEndDate: DEMO_END },
  { id: "b20", screenId: "scr-8", startHour: 13, endHour: 18, title: "K-Beauty AdPack", type: "adpack", status: "reserved", occupancy: 55, totalSlots: 30, filledSlots: 16 },
  { id: "b21", screenId: "scr-8", programId: "prg-9", startHour: 20, endHour: 24, title: "BTS World Tour", type: "program", status: "reserved", client: "HYBE", recurring: "daily", startDate: DEMO_START, recurrenceEnd: "on", recurrenceEndDate: DEMO_END },
];

export const locations = Array.from(new Set(screens.map((s) => s.location)));
