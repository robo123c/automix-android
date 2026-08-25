import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import { Pressable, StyleSheet, Text, View, FlatList } from "react-native";

import { ScreenContainer } from "@/components/screen-container";
import { TransitionCard } from "@/components/transition-card";
import { useMix, type LocalTrack } from "@/lib/mix-context";
import { artworkPalette } from "@/lib/track-utils";

function QueueRow({ track, index, isCurrent, onPlay, onRemove }: { track: LocalTrack; index: number; isCurrent: boolean; onPlay: () => void; onRemove: () => void }) {
  const [accent, deep] = artworkPalette(track.title);
  return (
    <View style={[styles.row, isCurrent && styles.currentRow]}>
      <Text style={[styles.position, isCurrent && styles.currentPosition]}>{isCurrent ? "▶" : index + 1}</Text>
      <View style={[styles.art, { backgroundColor: deep }]}><Text style={[styles.artText, { color: accent }]}>{track.title.slice(0, 1).toUpperCase()}</Text></View>
      <Pressable onPress={onPlay} style={({ pressed }) => [styles.rowCopy, pressed && styles.pressed]}>
        <Text numberOfLines={1} style={styles.rowTitle}>{track.title}</Text>
        <Text numberOfLines={1} style={styles.rowMeta}>{track.mimeType ?? "Audio file"}</Text>
      </Pressable>
      <Pressable onPress={onRemove} style={({ pressed }) => [styles.remove, pressed && styles.pressed]}><MaterialIcons name="close" color="#9B9EA8" size={20} /></Pressable>
    </View>
  );
}

export default function QueueScreen() {
  const { library, currentIndex, activePlan, nextTrack, playTrack, removeTrack, clearLibrary } = useMix();
  return (
    <ScreenContainer containerClassName="bg-background" className="px-5" edges={["top", "left", "right"]}>
      <View style={styles.header}><View><Text style={styles.title}>Queue</Text><Text style={styles.subtitle}>TRANSITION-AWARE ORDER</Text></View>{library.length > 0 ? <Pressable onPress={clearLibrary} style={({ pressed }) => [styles.clear, pressed && styles.pressed]}><Text style={styles.clearText}>Clear</Text></Pressable> : null}</View>
      <TransitionCard plan={activePlan} nextTitle={nextTrack?.title} />
      <FlatList
        data={library}
        keyExtractor={(track) => track.id}
        renderItem={({ item, index }) => <QueueRow track={item} index={index} isCurrent={index === currentIndex} onPlay={() => void playTrack(item.id)} onRemove={() => removeTrack(item.id)} />}
        ListEmptyComponent={<View style={styles.empty}><MaterialIcons name="queue-music" color="#747783" size={31} /><Text style={styles.emptyTitle}>Your queue is empty</Text><Text style={styles.emptyCopy}>Import local tracks in Library, then AutoMix will preview its next transition here.</Text></View>}
        contentContainerStyle={library.length === 0 ? styles.emptyList : styles.list}
        showsVerticalScrollIndicator={false}
      />
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  header: { paddingTop: 8, paddingBottom: 21, flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  title: { color: "#F6F7F2", fontSize: 28, lineHeight: 34, fontWeight: "800", letterSpacing: -0.6 },
  subtitle: { color: "#747783", fontSize: 10, lineHeight: 14, fontWeight: "800", letterSpacing: 1.25, marginTop: 2 },
  clear: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 12, borderWidth: 1, borderColor: "#323643" },
  clearText: { color: "#9B9EA8", fontWeight: "700", fontSize: 12 },
  list: { paddingTop: 12, paddingBottom: 116 },
  row: { minHeight: 74, borderBottomWidth: 1, borderBottomColor: "#232630", flexDirection: "row", alignItems: "center", gap: 11 },
  currentRow: { backgroundColor: "#151a17", marginHorizontal: -8, paddingHorizontal: 8, borderRadius: 16, borderBottomWidth: 0, marginVertical: 3 },
  position: { width: 18, textAlign: "center", color: "#747783", fontSize: 12, fontWeight: "700" },
  currentPosition: { color: "#C7FF3D" },
  art: { width: 44, height: 44, borderRadius: 13, alignItems: "center", justifyContent: "center" },
  artText: { fontSize: 17, fontWeight: "900" },
  rowCopy: { flex: 1, minWidth: 0, paddingVertical: 10 },
  rowTitle: { color: "#F6F7F2", fontSize: 14, lineHeight: 19, fontWeight: "700" },
  rowMeta: { color: "#9B9EA8", marginTop: 2, fontSize: 11, lineHeight: 15 },
  remove: { width: 40, height: 40, alignItems: "center", justifyContent: "center" },
  pressed: { opacity: 0.7, transform: [{ scale: 0.97 }] },
  emptyList: { flexGrow: 1 },
  empty: { paddingHorizontal: 30, flex: 1, alignItems: "center", justifyContent: "center", paddingBottom: 130 },
  emptyTitle: { color: "#F6F7F2", fontSize: 18, lineHeight: 24, marginTop: 14, fontWeight: "800" },
  emptyCopy: { marginTop: 6, color: "#9B9EA8", fontSize: 13, lineHeight: 19, textAlign: "center" },
});
