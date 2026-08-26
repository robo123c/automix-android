import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import React, { useMemo, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

import {
  fetchPublicApkUpdate,
  getInstalledAutoMixBuild,
  openApkUpdate,
  openLatestAutoMixRelease,
  type PublicApkUpdate,
} from "../lib/app-update";
import {
  getUpdaterPresentation,
  type UpdaterAction,
  type UpdaterState,
  type UpdaterTone,
} from "../lib/app-update-presentation";

const TONE_STYLES: Record<
  UpdaterTone,
  { backgroundColor: string; color: string }
> = {
  neutral: { backgroundColor: "#242733", color: "#C5C8D2" },
  success: { backgroundColor: "#17342B", color: "#84F0BC" },
  accent: { backgroundColor: "#303A17", color: "#C7FF3D" },
  warning: { backgroundColor: "#402E18", color: "#FFD37A" },
  danger: { backgroundColor: "#402127", color: "#FFB2BC" },
};

export function AppUpdateCard() {
  const installed = useMemo(() => getInstalledAutoMixBuild(), []);
  const [state, setState] = useState<UpdaterState>("idle");
  const [update, setUpdate] = useState<PublicApkUpdate>();
  const [installHelpVisible, setInstallHelpVisible] = useState(false);
  const presentation = getUpdaterPresentation({ state, installed, update });

  const checkForUpdate = async () => {
    if (state === "checking" || state === "opening") return;
    setState("checking");
    setUpdate(undefined);
    setInstallHelpVisible(false);

    const result = await fetchPublicApkUpdate();
    if (result.kind === "available") {
      setUpdate(result.update);
      setState("available");
      return;
    }

    setState(result.kind);
  };

  const downloadUpdate = async () => {
    if (!update || state === "opening") return;
    setState("opening");
    setInstallHelpVisible(false);
    try {
      await openApkUpdate(update);
      setState("handoff");
    } catch {
      setState("browser-error");
    }
  };

  const openLatestRelease = async () => {
    if (state === "opening") return;
    try {
      await openLatestAutoMixRelease();
    } catch {
      setState("latest-release-error");
    }
  };

  const runAction = (action?: UpdaterAction) => {
    if (action === "check") return void checkForUpdate();
    if (action === "download") return void downloadUpdate();
    if (action === "latest-release") return void openLatestRelease();
  };

  const toneStyle = TONE_STYLES[presentation.tone];

  return (
    <View style={styles.card} testID="app-update-card">
      <View style={styles.header}>
        <View style={styles.icon}>
          <MaterialIcons name="system-update-alt" color="#C7FF3D" size={20} />
        </View>
        <View style={styles.titleCopy}>
          <Text style={styles.title}>App updates</Text>
          <Text style={styles.installedSummary}>
            Installed: {installed.version} · build {installed.build}
          </Text>
        </View>
        <View
          accessibilityLabel={`Update status: ${presentation.statusLabel}`}
          style={[
            styles.statusChip,
            { backgroundColor: toneStyle.backgroundColor },
          ]}
          testID="app-update-status"
        >
          <Text style={[styles.statusLabel, { color: toneStyle.color }]}>
            {presentation.statusLabel}
          </Text>
        </View>
      </View>

      <Text accessibilityLiveRegion="polite" style={styles.message}>
        {presentation.message}
      </Text>

      {presentation.availableSummary ? (
        <View style={styles.releaseContext}>
          <Text style={styles.availableSummary}>
            {presentation.availableSummary}
          </Text>
          {presentation.releaseNotes ? (
            <Text style={styles.releaseNotes}>{presentation.releaseNotes}</Text>
          ) : null}
          {presentation.apkSize ? (
            <Text style={styles.apkSize}>
              APK size · {presentation.apkSize}
            </Text>
          ) : null}
        </View>
      ) : null}

      {presentation.showInstallHelp ? (
        <Pressable
          accessibilityRole="button"
          accessibilityState={{ expanded: installHelpVisible }}
          onPress={() => setInstallHelpVisible((visible) => !visible)}
          style={({ pressed }) => [
            styles.helpTrigger,
            pressed && styles.pressed,
          ]}
          testID="app-update-install-help"
        >
          <MaterialIcons
            name={installHelpVisible ? "expand-less" : "expand-more"}
            color="#C5C8D2"
            size={18}
          />
          <Text style={styles.helpTriggerText}>What happens next?</Text>
        </Pressable>
      ) : null}

      {installHelpVisible ? (
        <Text style={styles.installHelp}>
          AutoMix opens the public APK download in your browser. Choose
          Download, then follow Android’s installation prompt. Android—not
          AutoMix—confirms the install.
        </Text>
      ) : null}

      {presentation.primaryAction && presentation.primaryLabel ? (
        <Pressable
          accessibilityLabel={presentation.primaryLabel}
          accessibilityRole="button"
          accessibilityState={{
            disabled: presentation.busy,
            busy: presentation.busy,
          }}
          onPress={() => runAction(presentation.primaryAction)}
          style={({ pressed }) => [
            styles.primaryAction,
            presentation.busy && styles.actionBusy,
            pressed && styles.pressed,
          ]}
          testID="app-update-primary-action"
        >
          <Text style={styles.primaryActionText}>
            {presentation.primaryLabel}
          </Text>
        </Pressable>
      ) : null}

      {presentation.secondaryAction && presentation.secondaryLabel ? (
        <Pressable
          accessibilityLabel={presentation.secondaryLabel}
          accessibilityRole="button"
          onPress={() => runAction(presentation.secondaryAction)}
          style={({ pressed }) => [
            styles.secondaryAction,
            pressed && styles.pressed,
          ]}
          testID="app-update-secondary-action"
        >
          <Text style={styles.secondaryActionText}>
            {presentation.secondaryLabel}
          </Text>
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    marginTop: 12,
    padding: 15,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "#292C38",
    backgroundColor: "#161820",
  },
  header: { flexDirection: "row", alignItems: "center", gap: 10 },
  icon: {
    width: 38,
    height: 38,
    borderRadius: 13,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#202816",
  },
  titleCopy: { flex: 1, minWidth: 0 },
  title: { color: "#F6F7F2", fontSize: 14, lineHeight: 18, fontWeight: "900" },
  installedSummary: {
    color: "#9B9EA8",
    marginTop: 1,
    fontSize: 10,
    lineHeight: 14,
  },
  statusChip: { borderRadius: 999, paddingHorizontal: 9, paddingVertical: 5 },
  statusLabel: {
    fontSize: 9,
    lineHeight: 12,
    fontWeight: "900",
    textAlign: "center",
  },
  message: { color: "#D8DAE1", marginTop: 13, fontSize: 12, lineHeight: 17 },
  releaseContext: {
    marginTop: 10,
    padding: 11,
    borderRadius: 14,
    backgroundColor: "#1D202A",
  },
  availableSummary: {
    color: "#C7FF3D",
    fontSize: 11,
    lineHeight: 15,
    fontWeight: "900",
  },
  releaseNotes: {
    color: "#C5C8D2",
    marginTop: 4,
    fontSize: 11,
    lineHeight: 16,
  },
  apkSize: { color: "#9B9EA8", marginTop: 5, fontSize: 10, lineHeight: 14 },
  helpTrigger: {
    minHeight: 44,
    marginTop: 9,
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    alignSelf: "flex-start",
    paddingRight: 8,
  },
  helpTriggerText: {
    color: "#C5C8D2",
    fontSize: 11,
    lineHeight: 15,
    fontWeight: "800",
  },
  installHelp: {
    color: "#B9BCC7",
    marginTop: 2,
    padding: 11,
    borderRadius: 13,
    backgroundColor: "#1D202A",
    fontSize: 11,
    lineHeight: 16,
  },
  primaryAction: {
    minHeight: 46,
    marginTop: 12,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#C7FF3D",
  },
  primaryActionText: {
    color: "#0A0B10",
    fontSize: 12,
    lineHeight: 16,
    fontWeight: "900",
  },
  secondaryAction: {
    minHeight: 44,
    marginTop: 6,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "#383C49",
  },
  secondaryActionText: {
    color: "#D8DAE1",
    fontSize: 12,
    lineHeight: 16,
    fontWeight: "800",
  },
  actionBusy: { opacity: 0.58 },
  pressed: { opacity: 0.74, transform: [{ scale: 0.985 }] },
});
