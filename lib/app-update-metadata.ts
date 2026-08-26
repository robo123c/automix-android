export const AUTO_MIX_UPDATE_MANIFEST_URL =
  "https://github.com/robo123c/automix-android/releases/latest/download/automix-update.json";
export const AUTO_MIX_LATEST_RELEASE_URL =
  "https://github.com/robo123c/automix-android/releases/latest";

export type PublicApkUpdate = {
  version: string;
  versionCode: number;
  apkUrl: string;
  notes: string;
  apkSizeBytes?: number;
};

export function parsePublicApkUpdate(value: unknown): PublicApkUpdate | null {
  if (!value || typeof value !== "object") return null;
  const candidate = value as Record<string, unknown>;
  const versionCode = Number(candidate.versionCode);
  if (
    typeof candidate.version !== "string" ||
    !Number.isInteger(versionCode) ||
    versionCode < 1 ||
    typeof candidate.apkUrl !== "string" ||
    !candidate.apkUrl.startsWith("https://") ||
    typeof candidate.notes !== "string"
  ) {
    return null;
  }

  const apkSizeBytes =
    typeof candidate.apkSizeBytes === "number" &&
    Number.isSafeInteger(candidate.apkSizeBytes) &&
    candidate.apkSizeBytes > 0
      ? candidate.apkSizeBytes
      : undefined;

  return {
    version: candidate.version,
    versionCode,
    apkUrl: candidate.apkUrl,
    notes: candidate.notes,
    ...(apkSizeBytes ? { apkSizeBytes } : {}),
  };
}

export function isNewerAndroidBuild(
  update: PublicApkUpdate,
  installedBuildVersion: string | null,
) {
  const installed = Number(installedBuildVersion ?? 0);
  return Number.isFinite(installed) && update.versionCode > installed;
}

export function formatApkSize(apkSizeBytes?: number) {
  if (!apkSizeBytes || apkSizeBytes < 1) return null;
  return `${(apkSizeBytes / 1_000_000).toFixed(1)} MB`;
}
