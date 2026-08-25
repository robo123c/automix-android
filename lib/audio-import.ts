export type PickedAudioAsset = {
  name: string;
  uri: string;
  mimeType?: string | null;
  size?: number | null;
};

const SUPPORTED_EXTENSIONS = new Set([
  "aac", "aif", "aiff", "flac", "m4a", "mp3", "oga", "ogg", "opus", "wav", "weba",
]);

export function isSupportedAudioAsset(asset: PickedAudioAsset) {
  if (asset.mimeType?.startsWith("audio/")) return true;
  const extension = asset.name.split(".").pop()?.toLowerCase();
  return Boolean(extension && SUPPORTED_EXTENSIONS.has(extension));
}

export function trackImportKey(asset: PickedAudioAsset) {
  return `${asset.name.trim().toLowerCase()}::${asset.size ?? "unknown"}`;
}

export function safeAudioFileName(fileName: string) {
  const normalized = fileName.replace(/[^a-zA-Z0-9._-]/g, "_");
  return normalized || "imported-audio";
}
