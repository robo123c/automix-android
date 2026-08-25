export function titleFromFileName(name: string) {
  const withoutExtension = name.replace(/\.[^/.]+$/, "");
  return withoutExtension.replace(/[_-]+/g, " ").replace(/\s+/g, " ").trim() || "Untitled track";
}

export function artworkPalette(seed: string) {
  let hash = 0;
  for (let index = 0; index < seed.length; index += 1) {
    hash = (hash << 5) - hash + seed.charCodeAt(index);
    hash |= 0;
  }
  const palettes = [
    ["#C7FF3D", "#2B3F13"],
    ["#6A8CFF", "#1A2148"],
    ["#FF8B6A", "#442218"],
    ["#F6C34A", "#49390C"],
    ["#D38BFF", "#382049"],
  ];
  return palettes[Math.abs(hash) % palettes.length];
}

export function formatDuration(seconds: number) {
  if (!Number.isFinite(seconds) || seconds <= 0) return "--:--";
  const minutes = Math.floor(seconds / 60);
  const remainder = Math.floor(seconds % 60).toString().padStart(2, "0");
  return `${minutes}:${remainder}`;
}
