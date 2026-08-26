import { describe, expect, it } from "vitest";

import {
  isNewerAndroidBuild,
  parsePublicApkUpdate,
} from "../lib/app-update-metadata";

describe("public APK update metadata", () => {
  const validUpdate = {
    version: "1.0.3",
    versionCode: 5,
    apkUrl:
      "https://github.com/robo123c/automix-android/releases/download/v1/AutoMix-android-release.apk",
    notes: "Import progress and update controls.",
  };

  it("accepts trusted HTTPS APK metadata and compares Android build codes", () => {
    const update = parsePublicApkUpdate(validUpdate);
    expect(update).toEqual(validUpdate);
    expect(isNewerAndroidBuild(update!, "4")).toBe(true);
    expect(isNewerAndroidBuild(update!, "5")).toBe(false);
  });

  it("rejects incomplete and unsafe update metadata", () => {
    expect(
      parsePublicApkUpdate({
        ...validUpdate,
        apkUrl: "http://example.test/app.apk",
      }),
    ).toBeNull();
    expect(parsePublicApkUpdate({ ...validUpdate, versionCode: 0 })).toBeNull();
    expect(parsePublicApkUpdate({ version: "1.0.3" })).toBeNull();
  });
});
