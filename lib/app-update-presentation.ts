import { formatApkSize, type PublicApkUpdate } from "./app-update-metadata";
import type { InstalledAutoMixBuild } from "./app-update";

export type UpdaterState =
  | "idle"
  | "checking"
  | "current"
  | "unsupported"
  | "available"
  | "opening"
  | "handoff"
  | "network-error"
  | "release-error"
  | "browser-error"
  | "latest-release-error";

export type UpdaterAction = "check" | "download" | "latest-release";
export type UpdaterTone =
  | "neutral"
  | "success"
  | "accent"
  | "warning"
  | "danger";

export type UpdaterPresentation = {
  statusLabel: string;
  tone: UpdaterTone;
  message: string;
  primaryAction?: UpdaterAction;
  primaryLabel?: string;
  secondaryAction?: UpdaterAction;
  secondaryLabel?: string;
  availableSummary?: string;
  releaseNotes?: string;
  apkSize?: string;
  busy: boolean;
  showInstallHelp: boolean;
};

type UpdaterPresentationInput = {
  state: UpdaterState;
  installed: InstalledAutoMixBuild;
  update?: PublicApkUpdate;
};

function availableDetails(update?: PublicApkUpdate) {
  if (!update) return {};
  return {
    availableSummary: `Ready: ${update.version} · build ${update.versionCode}`,
    releaseNotes: update.notes.trim() || undefined,
    apkSize: formatApkSize(update.apkSizeBytes) ?? undefined,
  };
}

export function getUpdaterPresentation({
  state,
  installed,
  update,
}: UpdaterPresentationInput): UpdaterPresentation {
  const details = availableDetails(update);

  switch (state) {
    case "checking":
      return {
        statusLabel: "Checking",
        tone: "neutral",
        message: "Looking for the latest public AutoMix release.",
        primaryAction: "check",
        primaryLabel: "Checking…",
        busy: true,
        showInstallHelp: false,
      };
    case "current":
      return {
        statusLabel: "Up to date",
        tone: "success",
        message: `You're running ${installed.version} · build ${installed.build}.`,
        primaryAction: "check",
        primaryLabel: "Check again",
        busy: false,
        showInstallHelp: false,
      };
    case "available":
      return {
        statusLabel: "Update ready",
        tone: "accent",
        message: "A newer AutoMix build is ready to download.",
        primaryAction: "download",
        primaryLabel: "Download update",
        busy: false,
        showInstallHelp: true,
        ...details,
      };
    case "opening":
      return {
        statusLabel: "Opening download",
        tone: "accent",
        message: "Opening the verified APK download in your browser.",
        primaryAction: "download",
        primaryLabel: "Opening download…",
        busy: true,
        showInstallHelp: false,
        ...details,
      };
    case "handoff":
      return {
        statusLabel: "Download opened",
        tone: "accent",
        message:
          "Download the APK in your browser, then follow Android's install prompts.",
        primaryAction: "download",
        primaryLabel: "Open download again",
        secondaryAction: "check",
        secondaryLabel: "Check again",
        busy: false,
        showInstallHelp: true,
        ...details,
      };
    case "network-error":
      return {
        statusLabel: "Couldn't check",
        tone: "warning",
        message:
          "AutoMix couldn't reach the update service. Check your connection and try again.",
        primaryAction: "check",
        primaryLabel: "Try again",
        secondaryAction: "latest-release",
        secondaryLabel: "Open latest release",
        busy: false,
        showInstallHelp: false,
      };
    case "release-error":
      return {
        statusLabel: "Release unavailable",
        tone: "warning",
        message:
          "The latest AutoMix release has not published valid update details yet.",
        primaryAction: "check",
        primaryLabel: "Try again",
        secondaryAction: "latest-release",
        secondaryLabel: "Open latest release",
        busy: false,
        showInstallHelp: false,
      };
    case "browser-error":
      if (!update) {
        return {
          statusLabel: "Couldn't open latest release",
          tone: "danger",
          message:
            "AutoMix could not open the public release page. Try again or check for an update.",
          primaryAction: "latest-release",
          primaryLabel: "Open latest release",
          secondaryAction: "check",
          secondaryLabel: "Check for update",
          busy: false,
          showInstallHelp: false,
        };
      }
      return {
        statusLabel: "Couldn't open download",
        tone: "danger",
        message:
          "AutoMix could not open the APK download. Try again or open the latest release.",
        primaryAction: "download",
        primaryLabel: "Open download again",
        secondaryAction: "latest-release",
        secondaryLabel: "Open latest release",
        busy: false,
        showInstallHelp: false,
        ...details,
      };
    case "latest-release-error":
      return {
        statusLabel: "Couldn't open latest release",
        tone: "danger",
        message:
          "AutoMix could not open the public release page. Try again or check for an update.",
        primaryAction: "latest-release",
        primaryLabel: "Open latest release",
        secondaryAction: "check",
        secondaryLabel: "Check for update",
        busy: false,
        showInstallHelp: false,
      };
    case "unsupported":
      return {
        statusLabel: "Android required",
        tone: "neutral",
        message: "APK updates are available from the installed Android app.",
        busy: false,
        showInstallHelp: false,
      };
    case "idle":
    default:
      return {
        statusLabel: "Not checked",
        tone: "neutral",
        message: `Installed: ${installed.version} · build ${installed.build}`,
        primaryAction: "check",
        primaryLabel: "Check for update",
        busy: false,
        showInstallHelp: false,
      };
  }
}
