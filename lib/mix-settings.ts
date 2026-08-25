import type { MixSettings } from "@/lib/mix-engine";

export const SETTINGS_STORAGE_KEY = "automix.settings.v1";

export const DEFAULT_MIX_SETTINGS: MixSettings = {
  autoMixEnabled: true,
  transitionSeconds: 3.5,
  intensity: "balanced",
  preserveAlbums: true,
};

export function serializeMixSettings(settings: MixSettings) {
  return JSON.stringify(settings);
}

export function parseMixSettings(serialized: string | null): MixSettings {
  if (!serialized) return DEFAULT_MIX_SETTINGS;
  try {
    const parsed = JSON.parse(serialized) as Partial<MixSettings>;
    const intensity = parsed.intensity === "gentle" || parsed.intensity === "balanced" || parsed.intensity === "energetic"
      ? parsed.intensity
      : DEFAULT_MIX_SETTINGS.intensity;
    return {
      autoMixEnabled: typeof parsed.autoMixEnabled === "boolean" ? parsed.autoMixEnabled : DEFAULT_MIX_SETTINGS.autoMixEnabled,
      transitionSeconds: typeof parsed.transitionSeconds === "number"
        ? Math.min(8, Math.max(1.5, parsed.transitionSeconds))
        : DEFAULT_MIX_SETTINGS.transitionSeconds,
      intensity,
      preserveAlbums: typeof parsed.preserveAlbums === "boolean" ? parsed.preserveAlbums : DEFAULT_MIX_SETTINGS.preserveAlbums,
    };
  } catch {
    return DEFAULT_MIX_SETTINGS;
  }
}
