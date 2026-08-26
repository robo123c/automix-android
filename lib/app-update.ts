import * as Application from "expo-application";
import * as WebBrowser from "expo-web-browser";
import { Platform } from "react-native";

import {
  AUTO_MIX_UPDATE_MANIFEST_URL,
  isNewerAndroidBuild,
  parsePublicApkUpdate,
  type PublicApkUpdate,
} from "./app-update-metadata";

export {
  AUTO_MIX_UPDATE_MANIFEST_URL,
  type PublicApkUpdate,
} from "./app-update-metadata";

export async function fetchPublicApkUpdate() {
  if (Platform.OS !== "android") return { kind: "unsupported" as const };
  const response = await fetch(AUTO_MIX_UPDATE_MANIFEST_URL, {
    headers: { Accept: "application/json" },
  });
  if (!response.ok) {
    throw new Error(`Update metadata was unavailable (${response.status}).`);
  }
  const update = parsePublicApkUpdate(await response.json());
  if (!update) throw new Error("Update metadata was invalid.");
  return isNewerAndroidBuild(update, Application.nativeBuildVersion)
    ? { kind: "available" as const, update }
    : { kind: "current" as const };
}

export async function openApkUpdate(update: PublicApkUpdate) {
  await WebBrowser.openBrowserAsync(update.apkUrl);
}
