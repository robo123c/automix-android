export type TempoEstimate = {
  tempo: number;
  energy: number;
};

function median(values: number[]) {
  const sorted = [...values].sort((a, b) => a - b);
  const middle = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0 ? (sorted[middle - 1] + sorted[middle]) / 2 : sorted[middle];
}

function normaliseTempo(value: number) {
  let tempo = value;
  while (tempo < 72) tempo *= 2;
  while (tempo > 180) tempo /= 2;
  return tempo;
}

/**
 * A deliberately light, live onset tracker for locally played audio. It derives
 * a provisional tempo only after repeated high-energy onsets; until then AutoMix
 * remains on the conservative crossfade path.
 */
export function createLiveTempoTracker() {
  let averageEnergy = 0.012;
  let lastOnset = -Infinity;
  const onsetTimes: number[] = [];
  let lastTempo: number | undefined;

  return {
    push(timestamp: number, frames: number[]): TempoEstimate | null {
      if (frames.length === 0) return null;
      const sampleCount = Math.min(frames.length, 512);
      let sum = 0;
      for (let index = 0; index < sampleCount; index += 1) sum += frames[index] * frames[index];
      const energy = Math.sqrt(sum / sampleCount);
      averageEnergy = averageEnergy * 0.94 + energy * 0.06;

      const threshold = Math.max(0.02, averageEnergy * 1.85);
      if (energy <= threshold || timestamp - lastOnset < 0.24) return null;

      lastOnset = timestamp;
      onsetTimes.push(timestamp);
      if (onsetTimes.length > 12) onsetTimes.shift();
      if (onsetTimes.length < 6) return null;

      const intervals = onsetTimes
        .slice(1)
        .map((time, index) => time - onsetTimes[index])
        .filter((interval) => interval >= 0.28 && interval <= 1.25);
      if (intervals.length < 4) return null;

      const tempo = normaliseTempo(60 / median(intervals));
      if (!Number.isFinite(tempo) || tempo < 72 || tempo > 180) return null;
      if (lastTempo && Math.abs(lastTempo - tempo) < 1.5) return null;
      lastTempo = tempo;
      return { tempo, energy: Math.min(1, energy * 5) };
    },
  };
}
