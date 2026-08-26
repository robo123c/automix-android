import { describe, expect, it } from "vitest";

import { getUpdaterPresentation } from "../lib/app-update-presentation";

const installed = { version: "1.0.2", build: "6" };
const update = {
  version: "1.0.3",
  versionCode: 7,
  apkUrl:
    "https://github.com/robo123c/automix-android/releases/download/v1/AutoMix.apk",
  notes: "Smoother transitions and clearer updater status.",
  apkSizeBytes: 50_830_685,
};

describe("updater presentation", () => {
  it("shows installed and available build context for an update-ready release", () => {
    const presentation = getUpdaterPresentation({
      state: "available",
      installed,
      update,
    });

    expect(presentation).toMatchObject({
      statusLabel: "Update ready",
      primaryAction: "download",
      primaryLabel: "Download update",
      availableSummary: "Ready: 1.0.3 · build 7",
      releaseNotes: update.notes,
      apkSize: "50.8 MB",
      showInstallHelp: true,
    });
  });

  it("provides distinct actionable recovery states", () => {
    expect(
      getUpdaterPresentation({ state: "network-error", installed }),
    ).toMatchObject({
      statusLabel: "Couldn't check",
      primaryAction: "check",
      secondaryAction: "latest-release",
    });
    expect(
      getUpdaterPresentation({ state: "release-error", installed }),
    ).toMatchObject({
      statusLabel: "Release unavailable",
      primaryAction: "check",
      secondaryAction: "latest-release",
    });
    expect(
      getUpdaterPresentation({ state: "browser-error", installed, update }),
    ).toMatchObject({
      statusLabel: "Couldn't open download",
      primaryAction: "download",
      secondaryAction: "latest-release",
    });
    expect(
      getUpdaterPresentation({ state: "browser-error", installed }),
    ).toMatchObject({
      statusLabel: "Couldn't open latest release",
      primaryAction: "latest-release",
      secondaryAction: "check",
    });
    expect(
      getUpdaterPresentation({ state: "latest-release-error", installed }),
    ).toMatchObject({
      statusLabel: "Couldn't open latest release",
      primaryAction: "latest-release",
      secondaryAction: "check",
    });
  });

  it("keeps the browser handoff explicit without claiming installation", () => {
    const presentation = getUpdaterPresentation({
      state: "handoff",
      installed,
      update,
    });
    expect(presentation.message).toContain("Download the APK in your browser");
    expect(presentation.message).toContain("Android's install prompts");
    expect(presentation.primaryLabel).toBe("Open download again");
  });
});
