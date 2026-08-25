import { describe, expect, it } from "vitest";

import { buildTransitionPlan, type MixSettings } from "../lib/mix-engine";
import { createLiveTempoTracker } from "../lib/live-tempo";
import { parseMixSettings, serializeMixSettings } from "../lib/mix-settings";
import { isSupportedAudioAsset, safeAudioFileName, trackImportKey } from "../lib/audio-import";

const baseSettings: MixSettings = {
  autoMixEnabled: true,
  transitionSeconds: 3.5,
  intensity: "balanced",
  preserveAlbums: true,
};

describe("buildTransitionPlan", () => {
  it("uses a beat-match strategy for closely aligned tempos", () => {
    const plan = buildTransitionPlan({ tempo: 120, musicalKey: "A", energy: 0.8 }, { tempo: 123, musicalKey: "E", energy: 0.75 }, baseSettings);
    expect(plan.strategy).toBe("beat-match");
    expect(plan.nextPlaybackRate).toBeCloseTo(120 / 123, 2);
    expect(plan.confidence).toBeGreaterThan(0.7);
  });

  it("protects sequences that should not be mixed", () => {
    const plan = buildTransitionPlan({ preserveSequence: true }, { tempo: 120 }, baseSettings);
    expect(plan.strategy).toBe("clean-handoff");
    expect(plan.transitionSeconds).toBe(0);
  });

  it("falls back to a safe crossfade when analysis is unavailable", () => {
    const plan = buildTransitionPlan({}, {}, baseSettings);
    expect(plan.strategy).toBe("crossfade");
    expect(plan.nextPlaybackRate).toBe(1);
  });

  it("derives a stable provisional tempo from repeated live onsets", () => {
    const tracker = createLiveTempoTracker();
    let estimate = null;
    for (const timestamp of [0, 0.5, 1, 1.5, 2, 2.5, 3]) {
      const candidate = tracker.push(timestamp, new Array(128).fill(0.9));
      if (candidate) estimate = candidate;
    }
    expect(estimate?.tempo).toBeCloseTo(120, 0);
  });

  it("round-trips validated AutoMix settings for persistence", () => {
    const restored = parseMixSettings(serializeMixSettings({
      autoMixEnabled: false,
      transitionSeconds: 6.5,
      intensity: "energetic",
      preserveAlbums: false,
    }));
    expect(restored).toEqual({
      autoMixEnabled: false,
      transitionSeconds: 6.5,
      intensity: "energetic",
      preserveAlbums: false,
    });
    expect(parseMixSettings('{"transitionSeconds":900}').transitionSeconds).toBe(8);
  });

  it("accepts common local audio assets and creates stable import keys", () => {
    expect(isSupportedAudioAsset({ name: "midnight.wav", uri: "file://midnight.wav" })).toBe(true);
    expect(isSupportedAudioAsset({ name: "set", mimeType: "audio/mpeg", uri: "file://set" })).toBe(true);
    expect(isSupportedAudioAsset({ name: "cover.jpg", mimeType: "image/jpeg", uri: "file://cover.jpg" })).toBe(false);
    expect(safeAudioFileName("night / drive?.mp3")).toBe("night___drive_.mp3");
    expect(trackImportKey({ name: "Set.MP3", size: 1024, uri: "file://one" })).toBe(trackImportKey({ name: "set.mp3", size: 1024, uri: "file://two" }));
  });
});
