import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import { FlatList, Pressable, StyleSheet, Switch, Text, View } from "react-native";

import { ScreenContainer } from "@/components/screen-container";
import { useMix, type LocalTrack } from "@/lib/mix-context";
import { artworkPalette } from "@/lib/track-utils";

function LibraryRow({ track, onPress }: { track: LocalTrack; onPress: () => void }) {
  const [accent, deep] = artworkPalette(track.title);
  return <Pressable onPress={onPress} style={({ pressed }) => [styles.row, pressed && styles.pressed]}><View style={[styles.art, { backgroundColor: deep }]}><Text style={[styles.artText, { color: accent }]}>{track.title.slice(0, 1).toUpperCase()}</Text></View><View style={styles.rowCopy}><Text numberOfLines={1} style={styles.rowTitle}>{track.title}</Text><Text numberOfLines={1} style={styles.rowMeta}>{track.bytes ? `${Math.round(track.bytes / 1024 / 1024 * 10) / 10} MB` : track.mimeType ?? "Imported audio"}</Text></View><MaterialIcons name="play-circle-outline" color="#C7FF3D" size={26} /></Pressable>;
}

export default function LibraryScreen() {
  const { library, importAudio, importState, playTrack, settings, updateSettings, issue, notice } = useMix();
  return (
    <ScreenContainer containerClassName="bg-background" className="px-5" edges={["top", "left", "right"]}>
      <View style={styles.header}><View><Text style={styles.title}>Library</Text><Text style={styles.subtitle}>YOUR LOCAL AUDIO</Text></View><Pressable disabled={importState === "importing"} onPress={() => void importAudio()} style={({ pressed }) => [styles.importButton, importState === "importing" && styles.disabled, pressed && styles.pressed]}><MaterialIcons name="add" color="#0A0B10" size={22} /><Text style={styles.importText}>{importState === "importing" ? "Opening" : "Import"}</Text></Pressable></View>
      <View style={styles.settingsCard}>
        <View style={styles.settingsCopy}><Text style={styles.settingsTitle}>AutoMix</Text><Text style={styles.settingsText}>Use a beat-aware blend when compatibility is available; otherwise protect the handoff.</Text></View>
        <Switch value={settings.autoMixEnabled} onValueChange={(autoMixEnabled) => updateSettings({ autoMixEnabled })} trackColor={{ false: "#323643", true: "#8AAC2C" }} thumbColor={settings.autoMixEnabled ? "#C7FF3D" : "#F6F7F2"} />
      </View>
      <View style={styles.segmentRow}>{(["gentle", "balanced", "energetic"] as const).map((intensity) => <Pressable key={intensity} onPress={() => updateSettings({ intensity })} style={({ pressed }) => [styles.segment, settings.intensity === intensity && styles.segmentActive, pressed && styles.pressed]}><Text style={[styles.segmentText, settings.intensity === intensity && styles.segmentTextActive]}>{intensity}</Text></Pressable>)}</View>
      <View style={styles.durationRow}>
        <View><Text style={styles.durationTitle}>Maximum blend</Text><Text style={styles.durationCopy}>AutoMix fades only as long as the song pair needs.</Text></View>
        <View style={styles.durationControls}><Pressable onPress={() => updateSettings({ transitionSeconds: Math.max(1.5, settings.transitionSeconds - 0.5) })} style={({ pressed }) => [styles.stepper, pressed && styles.pressed]}><MaterialIcons name="remove" color="#F6F7F2" size={18} /></Pressable><Text style={styles.durationValue}>{settings.transitionSeconds.toFixed(1)}s</Text><Pressable onPress={() => updateSettings({ transitionSeconds: Math.min(8, settings.transitionSeconds + 0.5) })} style={({ pressed }) => [styles.stepper, pressed && styles.pressed]}><MaterialIcons name="add" color="#F6F7F2" size={18} /></Pressable></View>
      </View>
      <Text style={styles.sectionLabel}>IMPORTED TRACKS</Text>
      <FlatList
        data={library}
        keyExtractor={(track) => track.id}
        renderItem={({ item }) => <LibraryRow track={item} onPress={() => void playTrack(item.id)} />}
        ListEmptyComponent={<View style={styles.empty}><MaterialIcons name="audio-file" color="#747783" size={31} /><Text style={styles.emptyTitle}>No local tracks yet</Text><Text style={styles.emptyCopy}>Choose audio files from your phone. They stay in the app’s local library for playback and mix planning.</Text></View>}
        contentContainerStyle={library.length === 0 ? styles.emptyList : styles.list}
        showsVerticalScrollIndicator={false}
      />
      {issue ? <Text style={styles.issue}>{issue}</Text> : null}
      {notice ? <Text style={styles.notice}>{notice}</Text> : null}
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  header: { paddingTop: 8, paddingBottom: 20, flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  title: { color: "#F6F7F2", fontSize: 28, lineHeight: 34, fontWeight: "800", letterSpacing: -0.6 },
  subtitle: { color: "#747783", fontSize: 10, lineHeight: 14, fontWeight: "800", letterSpacing: 1.25, marginTop: 2 },
  importButton: { height: 42, borderRadius: 14, paddingHorizontal: 13, flexDirection: "row", alignItems: "center", gap: 4, backgroundColor: "#C7FF3D" },
  importText: { color: "#0A0B10", fontSize: 12, fontWeight: "900" },
  disabled: { opacity: 0.58 },
  settingsCard: { flexDirection: "row", alignItems: "center", gap: 12, padding: 15, borderRadius: 21, backgroundColor: "#161820", borderWidth: 1, borderColor: "#292C38" },
  settingsCopy: { flex: 1 },
  settingsTitle: { color: "#F6F7F2", fontSize: 14, lineHeight: 19, fontWeight: "800" },
  settingsText: { color: "#9B9EA8", marginTop: 2, fontSize: 11, lineHeight: 16 },
  segmentRow: { flexDirection: "row", backgroundColor: "#161820", padding: 4, borderRadius: 15, marginTop: 12, gap: 4 },
  segment: { flex: 1, height: 34, alignItems: "center", justifyContent: "center", borderRadius: 11 },
  segmentActive: { backgroundColor: "#2B321A" },
  segmentText: { color: "#9B9EA8", fontSize: 11, fontWeight: "800", textTransform: "capitalize" },
  segmentTextActive: { color: "#C7FF3D" },
  durationRow: { marginTop: 12, padding: 14, borderWidth: 1, borderColor: "#292C38", backgroundColor: "#161820", borderRadius: 19, flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 10 },
  durationTitle: { color: "#F6F7F2", fontSize: 13, lineHeight: 18, fontWeight: "800" },
  durationCopy: { color: "#9B9EA8", fontSize: 10, lineHeight: 15, marginTop: 2, maxWidth: 183 },
  durationControls: { flexDirection: "row", alignItems: "center", gap: 6 },
  stepper: { width: 30, height: 30, borderRadius: 10, alignItems: "center", justifyContent: "center", backgroundColor: "#252936" },
  durationValue: { color: "#C7FF3D", minWidth: 34, textAlign: "center", fontSize: 12, fontWeight: "800" },
  sectionLabel: { color: "#747783", marginTop: 23, marginBottom: 4, fontSize: 10, lineHeight: 14, fontWeight: "800", letterSpacing: 1.3 },
  list: { paddingBottom: 118 },
  row: { minHeight: 72, flexDirection: "row", alignItems: "center", gap: 12, borderBottomWidth: 1, borderBottomColor: "#232630" },
  art: { width: 43, height: 43, borderRadius: 13, alignItems: "center", justifyContent: "center" },
  artText: { fontSize: 17, fontWeight: "900" },
  rowCopy: { flex: 1, minWidth: 0 },
  rowTitle: { color: "#F6F7F2", fontSize: 14, lineHeight: 19, fontWeight: "700" },
  rowMeta: { color: "#9B9EA8", marginTop: 2, fontSize: 11, lineHeight: 15 },
  emptyList: { flexGrow: 1 },
  empty: { alignItems: "center", justifyContent: "center", flex: 1, paddingBottom: 115, paddingHorizontal: 25 },
  emptyTitle: { color: "#F6F7F2", marginTop: 13, fontSize: 18, lineHeight: 24, fontWeight: "800" },
  emptyCopy: { color: "#9B9EA8", marginTop: 6, textAlign: "center", fontSize: 13, lineHeight: 19 },
  issue: { color: "#FFC74A", fontSize: 12, lineHeight: 17, textAlign: "center", paddingVertical: 8 },
  notice: { color: "#C7FF3D", fontSize: 12, lineHeight: 17, textAlign: "center", paddingVertical: 8 },
  pressed: { opacity: 0.72, transform: [{ scale: 0.98 }] },
});
