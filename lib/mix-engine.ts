export type TransitionStrategy = "beat-match" | "tempo-blend" | "crossfade" | "clean-handoff";

export type TrackProfile = {
  tempo?: number;
  musicalKey?: string;
  energy?: number;
  preserveSequence?: boolean;
};

export type MixSettings = {
  autoMixEnabled: boolean;
  transitionSeconds: number;
  intensity: "gentle" | "balanced" | "energetic";
  preserveAlbums: boolean;
};

export type TransitionPlan = {
  strategy: TransitionStrategy;
  confidence: number;
  transitionSeconds: number;
  nextPlaybackRate: number;
  label: string;
  detail: string;
};

const clamp = (value: number, minimum: number, maximum: number) =>
  Math.min(Math.max(value, minimum), maximum);

const harmonicDistance = (first?: string, second?: string) => {
  if (!first || !second) return undefined;
  if (first === second) return 0;
  const circle = ["C", "G", "D", "A", "E", "B", "F#", "C#", "G#", "D#", "A#", "F"];
  const normalise = (key: string) => key.replace(/m$/, "").replace(/♯/g, "#");
  const firstIndex = circle.indexOf(normalise(first));
  const secondIndex = circle.indexOf(normalise(second));
  if (firstIndex < 0 || secondIndex < 0) return undefined;
  const distance = Math.abs(firstIndex - secondIndex);
  return Math.min(distance, circle.length - distance);
};

export function buildTransitionPlan(
  outgoing: TrackProfile,
  incoming: TrackProfile,
  settings: MixSettings,
): TransitionPlan {
  if (!settings.autoMixEnabled) {
    return {
      strategy: "clean-handoff",
      confidence: 1,
      transitionSeconds: 0,
      nextPlaybackRate: 1,
      label: "Transitions off",
      detail: "The next track starts after the current track finishes.",
    };
  }

  if (settings.preserveAlbums && (outgoing.preserveSequence || incoming.preserveSequence)) {
    return {
      strategy: "clean-handoff",
      confidence: 0.96,
      transitionSeconds: 0,
      nextPlaybackRate: 1,
      label: "Sequence preserved",
      detail: "AutoMix protects this continuous album or live sequence.",
    };
  }

  const baseSeconds = settings.intensity === "gentle"
    ? Math.min(settings.transitionSeconds, 2.5)
    : settings.intensity === "energetic"
      ? Math.max(settings.transitionSeconds, 4.5)
      : settings.transitionSeconds;

  if (outgoing.tempo && incoming.tempo) {
    const tempoGap = Math.abs(outgoing.tempo - incoming.tempo) / outgoing.tempo;
    const playbackRate = clamp(outgoing.tempo / incoming.tempo, 0.92, 1.08);
    const keyGap = harmonicDistance(outgoing.musicalKey, incoming.musicalKey);
    const keyScore = keyGap === undefined ? 0.08 : keyGap <= 1 ? 0.2 : keyGap <= 3 ? 0.12 : 0.02;
    const energyScore = outgoing.energy !== undefined && incoming.energy !== undefined
      ? Math.max(0, 0.14 - Math.abs(outgoing.energy - incoming.energy) * 0.14)
      : 0.06;

    if (tempoGap <= 0.035) {
      return {
        strategy: "beat-match",
        confidence: clamp(0.72 + keyScore + energyScore, 0, 0.98),
        transitionSeconds: baseSeconds,
        nextPlaybackRate: playbackRate,
        label: "Beat-matched blend",
        detail: "The tempo relationship is close enough for a rhythm-led transition.",
      };
    }

    if (tempoGap <= 0.12) {
      return {
        strategy: "tempo-blend",
        confidence: clamp(0.54 + keyScore + energyScore, 0, 0.86),
        transitionSeconds: Math.min(baseSeconds, 4.5),
        nextPlaybackRate: playbackRate,
        label: "Tempo-adjusted blend",
        detail: "AutoMix eases the incoming track toward the outgoing tempo while preserving pitch.",
      };
    }
  }

  return {
    strategy: "crossfade",
    confidence: outgoing.tempo || incoming.tempo ? 0.44 : 0.36,
    transitionSeconds: Math.min(baseSeconds, 3.5),
    nextPlaybackRate: 1,
    label: "Safe crossfade",
    detail: "A gentle blend protects the transition until compatible beat data is available.",
  };
}

export function transitionTone(confidence: number) {
  if (confidence >= 0.75) return "high" as const;
  if (confidence >= 0.5) return "medium" as const;
  return "low" as const;
}
