import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import { router } from "expo-router";
import { useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { TrackArt } from "@/components/track-art";
import { TransitionCard } from "@/components/transition-card";
import { ScreenContainer } from "@/components/screen-container";
import { triggerImportIfAvailable } from "@/lib/import-control";
import { useMix } from "@/lib/mix-context";
import { formatDuration } from "@/lib/track-utils";

export default function PlayerScreen() {
  const {
    currentTrack,
    nextTrack,
    playback,
    activePlan,
    settings,
    library,
    importAudio,
    importState,
    togglePlayback,
    playPrevious,
    playNext,
    seekTo,
    updateSettings,
    issue,
    notice,
  } = useMix();
  const [progressWidth, setProgressWidth] = useState(0);
  const progress = playback.duration > 0 ? playback.position / playback.duration : 0;

  if (!currentTrack) {
    return (
      <ScreenContainer containerClassName="bg-background" className="px-5" edges={["top", "left", "right", "bottom"]}>
        <View style={styles.emptyPage}>
          <View style={styles.emptyIcon}><MaterialIcons name="auto-awesome" color="#C7FF3D" size={34} /></View>
          <Text style={styles.emptyTitle}>A smarter way to move between songs.</Text>
          <Text style={styles.emptyCopy}>Import local audio to build an Android queue with tempo-aware transitions, safe fallback logic, and controls that explain every mix choice.</Text>
          <Pressable accessibilityState={{ disabled: importState === "importing" }} onPress={() => triggerImportIfAvailable(importState, importAudio)} style={({ pressed }) => [styles.primaryButton, importState === "importing" && styles.disabled, pressed && styles.pressed]}>
            <MaterialIcons name="library-add" color="#0A0B10" size={20} />
            <Text style={styles.primaryButtonText}>{importState === "importing" ? "Opening files…" : "Import music"}</Text>
          </Pressable>
          {issue ? <Text style={styles.issue}>{issue}</Text> : null}
          {notice ? <Text style={styles.notice}>{notice}</Text> : null}
          <View style={styles.boundaryCard}>
            <MaterialIcons name="info-outline" color="#6A8CFF" size={18} />
            <Text style={styles.boundaryText}>AutoMix plays files you select. It does not access Apple Music or recreate Apple’s private audio models.</Text>
          </View>
        </View>
      </ScreenContainer>
    );
  }

  return (
    <ScreenContainer containerClassName="bg-background" className="px-5" edges={["top", "left", "right"]}>
      <View style={styles.header}>
        <View>
          <Text style={styles.wordmark}>AUTOMIX</Text>
          <Text style={styles.headerSub}>LOCAL INTELLIGENT PLAYBACK</Text>
        </View>
        <Pressable onPress={() => router.push("/library" as never)} style={({ pressed }) => [styles.headerButton, pressed && styles.pressed]}>
          <MaterialIcons name="library-music" color="#F6F7F2" size={21} />
        </Pressable>
      </View>

      <View style={styles.artWrap}><TrackArt title={currentTrack.title} /></View>
      <View style={styles.trackMeta}>
        <View style={styles.trackText}>
          <Text numberOfLines={1} style={styles.trackTitle}>{currentTrack.title}</Text>
          <Text numberOfLines={1} style={styles.trackArtist}>{currentTrack.artist}</Text>
        </View>
        <Pressable onPress={() => updateSettings({ autoMixEnabled: !settings.autoMixEnabled })} style={({ pressed }) => [styles.autoPill, settings.autoMixEnabled && styles.autoPillActive, pressed && styles.pressed]}>
          <MaterialIcons name="auto-awesome" size={15} color={settings.autoMixEnabled ? "#0A0B10" : "#9B9EA8"} />
          <Text style={[styles.autoPillText, settings.autoMixEnabled && styles.autoPillTextActive]}>{settings.autoMixEnabled ? "AutoMix" : "Off"}</Text>
        </Pressable>
      </View>

      <View style={styles.analysisLine}>
        <MaterialIcons name={currentTrack.profile.tempo ? "graphic-eq" : "hearing"} color={currentTrack.profile.tempo ? "#C7FF3D" : "#6A8CFF"} size={15} />
        <Text style={styles.analysisText}>{currentTrack.profile.tempo ? `${Math.round(currentTrack.profile.tempo)} BPM learned from live playback` : "Listening for a tempo profile during playback"}</Text>
      </View>

      <View style={styles.progressBlock}>
        <Pressable onPress={(event) => {
          if (!playback.duration || !progressWidth) return;
          const ratio = Math.max(0, Math.min(1, event.nativeEvent.locationX / progressWidth));
          void seekTo(ratio * playback.duration);
        }} onLayout={(event) => setProgressWidth(event.nativeEvent.layout.width)} style={styles.progressTrack}>
          <View style={[styles.progressFill, { width: `${progress * 100}%` }]} />
          <View style={[styles.progressThumb, { left: `${progress * 100}%` }]} />
        </Pressable>
        <View style={styles.timeRow}><Text style={styles.time}>{formatDuration(playback.position)}</Text><Text style={styles.time}>{formatDuration(playback.duration)}</Text></View>
      </View>

      <View style={styles.transport}>
        <Pressable onPress={() => void playPrevious()} style={({ pressed }) => [styles.secondaryControl, pressed && styles.pressed]}>
          <MaterialIcons name="skip-previous" color="#F6F7F2" size={30} />
        </Pressable>
        <Pressable onPress={() => void togglePlayback()} style={({ pressed }) => [styles.playControl, pressed && styles.playPressed]}>
          <MaterialIcons name={playback.playing ? "pause" : "play-arrow"} color="#0A0B10" size={39} />
        </Pressable>
        <Pressable onPress={() => void playNext()} style={({ pressed }) => [styles.secondaryControl, pressed && styles.pressed]}>
          <MaterialIcons name="skip-next" color="#F6F7F2" size={30} />
        </Pressable>
      </View>

      {playback.isMixing ? <View style={styles.mixingState}><View style={styles.mixingDot} /><Text style={styles.mixingText}>MIXING NOW</Text></View> : null}
      <TransitionCard plan={activePlan} nextTitle={nextTrack?.title} onPress={() => router.push("/queue" as never)} />
      {issue ? <Text style={styles.issue}>{issue}</Text> : null}
      {notice ? <Text style={styles.notice}>{notice}</Text> : null}
      <Text style={styles.footerHint}>{library.length} {library.length === 1 ? "track" : "tracks"} in your local library</Text>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  emptyPage: { flex: 1, alignItems: "center", justifyContent: "center", paddingHorizontal: 10 },
  emptyIcon: { width: 78, height: 78, borderRadius: 26, alignItems: "center", justifyContent: "center", backgroundColor: "#1D2512", marginBottom: 25 },
  emptyTitle: { color: "#F6F7F2", fontSize: 30, lineHeight: 36, fontWeight: "800", textAlign: "center", letterSpacing: -0.7 },
  emptyCopy: { color: "#9B9EA8", marginTop: 13, fontSize: 15, lineHeight: 22, textAlign: "center" },
  primaryButton: { marginTop: 30, height: 54, paddingHorizontal: 22, borderRadius: 18, flexDirection: "row", alignItems: "center", gap: 9, backgroundColor: "#C7FF3D" },
  primaryButtonText: { color: "#0A0B10", fontSize: 15, lineHeight: 20, fontWeight: "800" },
  disabled: { opacity: 0.58 },
  boundaryCard: { marginTop: 23, padding: 14, borderWidth: 1, borderColor: "#272A34", backgroundColor: "#161820", borderRadius: 18, flexDirection: "row", gap: 10, alignItems: "flex-start" },
  boundaryText: { flex: 1, color: "#9B9EA8", fontSize: 12, lineHeight: 18 },
  header: { paddingTop: 8, flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  wordmark: { color: "#F6F7F2", fontSize: 17, lineHeight: 21, fontWeight: "900", letterSpacing: 2.4 },
  headerSub: { color: "#747783", fontSize: 9, lineHeight: 14, letterSpacing: 1.05, marginTop: 1, fontWeight: "700" },
  headerButton: { width: 42, height: 42, borderRadius: 14, alignItems: "center", justifyContent: "center", backgroundColor: "#161820", borderWidth: 1, borderColor: "#292C38" },
  artWrap: { alignItems: "center", marginTop: 26 },
  trackMeta: { marginTop: 24, flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 15 },
  trackText: { flex: 1, minWidth: 0 },
  trackTitle: { color: "#F6F7F2", fontSize: 24, lineHeight: 30, fontWeight: "800", letterSpacing: -0.55 },
  trackArtist: { marginTop: 3, color: "#9B9EA8", fontSize: 14, lineHeight: 20 },
  autoPill: { height: 34, flexDirection: "row", alignItems: "center", gap: 5, paddingHorizontal: 11, borderRadius: 999, backgroundColor: "#1A1D26", borderWidth: 1, borderColor: "#323643" },
  autoPillActive: { backgroundColor: "#C7FF3D", borderColor: "#C7FF3D" },
  autoPillText: { color: "#9B9EA8", fontSize: 11, lineHeight: 15, fontWeight: "800" },
  autoPillTextActive: { color: "#0A0B10" },
  analysisLine: { marginTop: 12, minHeight: 20, flexDirection: "row", alignItems: "center", gap: 6 },
  analysisText: { color: "#9B9EA8", fontSize: 11, lineHeight: 15, fontWeight: "600" },
  progressBlock: { marginTop: 16 },
  progressTrack: { height: 20, justifyContent: "center" },
  progressFill: { height: 4, borderRadius: 3, backgroundColor: "#C7FF3D" },
  progressThumb: { position: "absolute", width: 11, height: 11, marginLeft: -5.5, borderRadius: 9, backgroundColor: "#F6F7F2" },
  timeRow: { marginTop: 3, flexDirection: "row", justifyContent: "space-between" },
  time: { color: "#747783", fontSize: 11, lineHeight: 15, fontVariant: ["tabular-nums"] },
  transport: { marginTop: 16, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 28 },
  secondaryControl: { width: 48, height: 48, alignItems: "center", justifyContent: "center" },
  playControl: { width: 70, height: 70, alignItems: "center", justifyContent: "center", borderRadius: 35, backgroundColor: "#C7FF3D", shadowColor: "#C7FF3D", shadowOpacity: 0.26, shadowRadius: 18, elevation: 8 },
  pressed: { opacity: 0.72, transform: [{ scale: 0.97 }] },
  playPressed: { transform: [{ scale: 0.96 }], opacity: 0.92 },
  mixingState: { marginTop: 10, alignItems: "center", flexDirection: "row", justifyContent: "center", gap: 7 },
  mixingDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: "#C7FF3D" },
  mixingText: { color: "#C7FF3D", fontSize: 10, lineHeight: 14, fontWeight: "800", letterSpacing: 1.2 },
  issue: { marginTop: 9, color: "#FFC74A", fontSize: 12, lineHeight: 17, textAlign: "center" },
  notice: { marginTop: 9, color: "#C7FF3D", fontSize: 12, lineHeight: 17, textAlign: "center" },
  footerHint: { color: "#747783", fontSize: 11, lineHeight: 15, textAlign: "center", marginTop: 12 },
});
