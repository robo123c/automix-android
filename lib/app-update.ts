import * as Application from "expo-application";
import * as WebBrowser from "expo-web-browser";
import { Platform } from "react-native";

import {
  AUTO_MIX_LATEST_RELEASE_URL,
  AUTO_MIX_UPDATE_MANIFEST_URL,
  isNewerAndroidBuild,
  parsePublicApkUpdate,
  type PublicApkUpdate,
} from "./app-update-metadata";

export {
  AUTO_MIX_LATEST_RELEASE_URL,
  AUTO_MIX_UPDATE_MANIFEST_URL,
  type PublicApkUpdate,
} from "./app-update-metadata";

export type InstalledAutoMixBuild = {
  version: string;
  build: string;
};

export type PublicApkUpdateResult =
  | { kind: "unsupported" }
  | { kind: "current" }
  | { kind: "available"; update: PublicApkUpdate }
  | { kind: "network-error" }
  | { kind: "release-error" };

export function getInstalledAutoMixBuild(): InstalledAutoMixBuild {
  return {
    version: Application.nativeApplicationVersion ?? "Unknown version",
    build: Application.nativeBuildVersion ?? "Unknown",
  };
}

export async function fetchPublicApkUpdate(): Promise<PublicApkUpdateResult> {
  if (Platform.OS !== "android") return { kind: "unsupported" };

  let response: Response;
  try {
    response = await fetch(AUTO_MIX_UPDATE_MANIFEST_URL, {
      headers: { Accept: "application/json" },
    });
  } catch {
    return { kind: "network-error" };
  }

  if (!response.ok) return { kind: "release-error" };

  let payload: unknown;
  try {
    payload = await response.json();
  } catch {
    return { kind: "release-error" };
  }

  const update = parsePublicApkUpdate(payload);
  if (!update) return { kind: "release-error" };

  return isNewerAndroidBuild(update, Application.nativeBuildVersion)
    ? { kind: "available", update }
    : { kind: "current" };
}

export async function openApkUpdate(update: PublicApkUpdate) {
  await WebBrowser.openBrowserAsync(update.apkUrl);
}

export async function openLatestAutoMixRelease() {
  await WebBrowser.openBrowserAsync(AUTO_MIX_LATEST_RELEASE_URL);
}
