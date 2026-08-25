import { Text, View, StyleSheet } from "react-native";

import { artworkPalette } from "@/lib/track-utils";

export function TrackArt({ title, size = 264 }: { title: string; size?: number }) {
  const [accent, deep] = artworkPalette(title);
  const initials = title
    .split(" ")
    .slice(0, 2)
    .map((word) => word.charAt(0))
    .join("")
    .toUpperCase();
  return (
    <View style={[styles.frame, { width: size, height: size, backgroundColor: deep }]}> 
      <View style={[styles.orbit, { backgroundColor: accent, opacity: 0.84 }]} />
      <View style={[styles.orbitSmall, { borderColor: accent }]} />
      <Text style={[styles.initials, { color: accent }]}>{initials || "AM"}</Text>
      <Text style={styles.caption}>LOCAL MIX</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  frame: {
    borderRadius: 30,
    overflow: "hidden",
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#000",
    shadowOpacity: 0.38,
    shadowRadius: 28,
    elevation: 12,
  },
  orbit: {
    position: "absolute",
    width: "130%",
    height: "40%",
    transform: [{ rotate: "-36deg" }, { translateY: -4 }],
  },
  orbitSmall: {
    position: "absolute",
    width: "66%",
    height: "66%",
    borderWidth: 1,
    borderRadius: 999,
  },
  initials: {
    fontSize: 50,
    lineHeight: 56,
    letterSpacing: -2,
    fontWeight: "800",
  },
  caption: {
    position: "absolute",
    bottom: 18,
    color: "#F6F7F2",
    opacity: 0.72,
    fontSize: 10,
    lineHeight: 14,
    letterSpacing: 2.2,
    fontWeight: "700",
  },
});
