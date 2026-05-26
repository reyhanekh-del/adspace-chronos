import type {
  AdBandCount,
  AdSupportedProgramLayout,
  ScheduleBlock,
} from "@/lib/schedule-data";
import { SLOTS_PER_BAND } from "@/lib/schedule-data";

export type { AdSupportedProgramLayout };

export const AD_SUPPORTED_PROGRAM_LAYOUTS: {
  id: AdSupportedProgramLayout;
  title: string;
  shortLabel: string;
}[] = [
  { id: "full_ads", title: "Full Ads · 3 bands", shortLabel: "Full Ads" },
  { id: "content_1_ads_2", title: "1:00 content + 2 bands", shortLabel: "1:00 + 2b" },
  { id: "content_2_ads_1", title: "2:00 content + 1 band", shortLabel: "2:00 + 1b" },
];

export const AD_PACK_BAND_OPTIONS: {
  bands: AdBandCount;
  title: string;
  shortLabel: string;
}[] = [
  { bands: 1, title: "1 band (1 min)", shortLabel: "1b · 1m" },
  { bands: 2, title: "2 bands (2 min)", shortLabel: "2b · 2m" },
  { bands: 3, title: "3 bands (3 min)", shortLabel: "3b · 3m" },
];

export function programLayoutShortLabel(layout: AdSupportedProgramLayout): string {
  return (
    AD_SUPPORTED_PROGRAM_LAYOUTS.find((l) => l.id === layout)?.shortLabel ?? layout
  );
}

export function adPackBandsShortLabel(bands: AdBandCount): string {
  return (
    AD_PACK_BAND_OPTIONS.find((o) => o.bands === bands)?.shortLabel ?? `${bands}b`
  );
}

/** Default program layout from screen band capacity when block has no explicit type. */
export function defaultProgramLayoutForScreen(screenBands: AdBandCount): AdSupportedProgramLayout {
  if (screenBands === 1) return "content_2_ads_1";
  if (screenBands === 3) return "content_1_ads_2";
  return "content_1_ads_2";
}

export function resolveProgramLayout(
  block: ScheduleBlock,
  adSupported: boolean,
  screenBands?: AdBandCount
): AdSupportedProgramLayout | null {
  if (block.type !== "program" || !adSupported) return null;
  if (block.programLayout) return block.programLayout;
  if (screenBands) return defaultProgramLayoutForScreen(screenBands);
  return "content_1_ads_2";
}

export function resolveAdPackBands(
  block: ScheduleBlock,
  screenBands?: AdBandCount
): AdBandCount {
  if (block.type !== "adpack") return screenBands ?? 2;
  if (block.adPackBands) return block.adPackBands;
  if (block.adBand) return block.adBand;
  if (block.totalSlots && block.totalSlots > 0) {
    const bands = Math.round(block.totalSlots / SLOTS_PER_BAND);
    if (bands === 1 || bands === 2 || bands === 3) return bands;
  }
  return screenBands ?? 2;
}

/** Short type label for timeline chips; null only for ad-free programs. */
export function scheduleBlockTypeLabel(
  block: ScheduleBlock,
  adSupported: boolean,
  screenBands?: AdBandCount
): string | null {
  if (block.type === "program") {
    const layout = resolveProgramLayout(block, adSupported, screenBands);
    if (!layout) return null;
    return programLayoutShortLabel(layout);
  }
  return adPackBandsShortLabel(resolveAdPackBands(block, screenBands));
}

/** Longer type line for detail panel. */
export function scheduleBlockTypeTitle(
  block: ScheduleBlock,
  adSupported: boolean,
  screenBands?: AdBandCount
): string | null {
  if (block.type === "program") {
    const layout = resolveProgramLayout(block, adSupported, screenBands);
    if (!layout) return null;
    return (
      AD_SUPPORTED_PROGRAM_LAYOUTS.find((l) => l.id === layout)?.title ?? null
    );
  }
  const bands = resolveAdPackBands(block, screenBands);
  return AD_PACK_BAND_OPTIONS.find((o) => o.bands === bands)?.title ?? null;
}
