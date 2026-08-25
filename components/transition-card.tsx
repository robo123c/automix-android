import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { transitionTone, type TransitionPlan } from "@/lib/mix-engine";

export function TransitionCard({
  plan,
  nextTitle,
  onPress,
}: {
  plan: TransitionPlan | null;
  nextTitle?: string;
  onPress?: () => void;
}) {
  const tone = transitionTone(plan?.confidence ?? 0);
  const color = tone === "high" ? "#C7FF3D" : tone === "medium" ? "#6A8CFF" : "#FFC74A";
  return (
    <Pressable
      accessibilityRole={onPress ? "button" : undefined}
      onPress={onPress}
      style={({ pressed }) => [styles.card, pressed && onPress ? styles.pressed : undefined]}
    >
      <View style={[styles.icon, { backgroundColor: `${color}20` }]}>
        <MaterialIcons name="auto-awesome" size={19} color={color} />
      </View>
      <View style={styles.copy}>
        <Text style={styles.eyebrow}>UP NEXT</Text>
        <Text numberOfLines={1} style={styles.title}>{nextTitle ?? "Add another track to preview the mix"}</Text>
        <Text numberOfLines={2} style={styles.detail}>{plan?.detail ?? "AutoMix will choose the safest transition after you build a queue."}</Text>
      </View>
      <View style={styles.meta}>
        <Text style={[styles.score, { color }]}>{plan ? `${Math.round(plan.confidence * 100)}%` : "—"}</Text>
        <Text style={styles.strategy}>{plan?.label ?? "Waiting"}</Text>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    minHeight: 104,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    padding: 15,
    borderRadius: 22,
    backgroundColor: "#161820",
    borderWidth: 1,
    borderColor: "#292C38",
  },
  pressed: { opacity: 0.76, transform: [{ scale: 0.985 }] },
  icon: { width: 40, height: 40, borderRadius: 14, alignItems: "center", justifyContent: "center" },
  copy: { flex: 1, minWidth: 0 },
  eyebrow: { color: "#9B9EA8", fontWeight: "700", letterSpacing: 1.25, fontSize: 10, lineHeight: 14 },
  title: { marginTop: 2, color: "#F6F7F2", fontSize: 14, lineHeight: 20, fontWeight: "700" },
  detail: { marginTop: 3, color: "#9B9EA8", fontSize: 12, lineHeight: 17 },
  meta: { alignItems: "flex-end", maxWidth: 82 },
  score: { fontSize: 16, lineHeight: 20, fontWeight: "800" },
  strategy: { marginTop: 3, color: "#9B9EA8", fontSize: 10, lineHeight: 13, textAlign: "right" },
});
