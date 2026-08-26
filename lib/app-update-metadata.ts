export const AUTO_MIX_UPDATE_MANIFEST_URL =
  "https://github.com/robo123c/automix-android/releases/latest/download/automix-update.json";

export type PublicApkUpdate = {
  version: string;
  versionCode: number;
  apkUrl: string;
  notes: string;
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
  return {
    version: candidate.version,
    versionCode,
    apkUrl: candidate.apkUrl,
    notes: candidate.notes,
  };
}

export function isNewerAndroidBuild(
  update: PublicApkUpdate,
  installedBuildVersion: string | null,
) {
  const installed = Number(installedBuildVersion ?? 0);
  return Number.isFinite(installed) && update.versionCode > installed;
}
