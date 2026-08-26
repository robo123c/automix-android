import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import React, { type ComponentProps } from "react";
import { Pressable, StyleSheet, Text, type StyleProp, type TextStyle, type ViewStyle } from "react-native";

import { type ImportControlState, triggerImportIfAvailable } from "../lib/import-control";

type MaterialIconName = ComponentProps<typeof MaterialIcons>["name"];

type ImportMusicButtonProps = {
  label: string;
  importState: ImportControlState;
  onImport: () => void | Promise<void>;
  icon?: MaterialIconName;
  testID?: string;
  style?: StyleProp<ViewStyle>;
  importingStyle?: StyleProp<ViewStyle>;
  pressedStyle?: StyleProp<ViewStyle>;
  textStyle?: StyleProp<TextStyle>;
};

/**
 * Keeps the native Pressable mounted while a file picker or copy is in flight.
 * Android can suppress a Pressable supplied with the disabled prop, so the
 * duplicate-tap guard lives in JavaScript and accessibility still reflects it.
 */
export function ImportMusicButton({
  label,
  importState,
  onImport,
  icon = "library-add",
  testID,
  style,
  importingStyle,
  pressedStyle,
  textStyle,
}: ImportMusicButtonProps) {
  return (
    <Pressable
      testID={testID}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled: importState === "importing" }}
      onPress={() => triggerImportIfAvailable(importState, onImport)}
      style={({ pressed }) => [
        styles.button,
        style,
        importState === "importing" && importingStyle,
        pressed && pressedStyle,
      ]}
    >
      <MaterialIcons name={icon} color="#0A0B10" size={20} />
      <Text style={[styles.label, textStyle]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: { flexDirection: "row", alignItems: "center", justifyContent: "center", backgroundColor: "#C7FF3D" },
  label: { color: "#0A0B10", fontWeight: "900" },
});
