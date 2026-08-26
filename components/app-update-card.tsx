import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import { useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

import {
  fetchPublicApkUpdate,
  openApkUpdate,
  type PublicApkUpdate,
} from "../lib/app-update";

type UpdateState =
  | "idle"
  | "checking"
  | "current"
  | "unsupported"
  | "available"
  | "opening"
  | "error";

export function AppUpdateCard() {
  const [state, setState] = useState<UpdateState>("idle");
  const [update, setUpdate] = useState<PublicApkUpdate>();
  const [message, setMessage] = useState(
    "Check the latest public AutoMix APK.",
  );

  const checkForUpdate = async () => {
    if (state === "checking" || state === "opening") return;
    setState("checking");
    setMessage("Checking for an update…");
    try {
      const result = await fetchPublicApkUpdate();
      if (result.kind === "unsupported") {
        setState("unsupported");
        setMessage("APK updates are available from the Android app.");
      } else if (result.kind === "current") {
        setState("current");
        setMessage("You already have the latest AutoMix build.");
      } else {
        setUpdate(result.update);
        setState("available");
        setMessage(
          `Version ${result.update.version} is ready. ${result.update.notes}`,
        );
      }
    } catch {
      setState("error");
      setMessage(
        "No update metadata is published yet. Try again after the next release.",
      );
    }
  };

  const downloadUpdate = async () => {
    if (!update || state === "opening") return;
    setState("opening");
    setMessage(
      "Opening the APK download. Download it, then follow Android's install prompts.",
    );
    try {
      await openApkUpdate(update);
      setState("available");
    } catch {
      setState("error");
      setMessage("The update download could not be opened. Try again later.");
    }
  };

  const actionLabel =
    state === "available"
      ? "Download update"
      : state === "opening"
        ? "Opening download…"
        : state === "checking"
          ? "Checking…"
          : "Check for update";
  const action =
    state === "available" || state === "opening"
      ? downloadUpdate
      : checkForUpdate;

  return (
    <View style={styles.card}>
      <View style={styles.icon}>
        <MaterialIcons name="system-update-alt" color="#C7FF3D" size={20} />
      </View>
      <View style={styles.copy}>
        <Text style={styles.title}>App updates</Text>
        <Text style={styles.message}>{message}</Text>
      </View>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={actionLabel}
        onPress={() => void action()}
        style={({ pressed }) => [
          styles.button,
          (state === "checking" || state === "opening") && styles.buttonBusy,
          pressed && styles.pressed,
        ]}
      >
        <Text style={styles.buttonText}>{actionLabel}</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    marginTop: 12,
    padding: 13,
    borderRadius: 19,
    borderWidth: 1,
    borderColor: "#292C38",
    backgroundColor: "#161820",
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  icon: {
    width: 36,
    height: 36,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#202816",
  },
  copy: { flex: 1, minWidth: 0 },
  title: { color: "#F6F7F2", fontSize: 12, lineHeight: 16, fontWeight: "800" },
  message: { color: "#9B9EA8", marginTop: 2, fontSize: 10, lineHeight: 14 },
  button: {
    minHeight: 36,
    paddingHorizontal: 10,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#C7FF3D",
  },
  buttonBusy: { opacity: 0.58 },
  buttonText: {
    color: "#0A0B10",
    fontSize: 10,
    lineHeight: 14,
    fontWeight: "900",
    textAlign: "center",
  },
  pressed: { opacity: 0.72, transform: [{ scale: 0.98 }] },
});
