import AsyncStorage from "@react-native-async-storage/async-storage";
import * as DocumentPicker from "expo-document-picker";
import { Directory, Paths } from "expo-file-system";
import * as FileSystem from "expo-file-system/legacy";
import { createAudioPlayer, setAudioModeAsync } from "expo-audio";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { Platform } from "react-native";

import {
  buildTransitionPlan,
  type MixSettings,
  type TrackProfile,
} from "@/lib/mix-engine";
import { haptic } from "@/lib/haptics";
import { titleFromFileName } from "@/lib/track-utils";
import { createLiveTempoTracker } from "@/lib/live-tempo";
import {
  isSupportedAudioAsset,
  safeAudioFileName,
  trackImportKey,
} from "@/lib/audio-import";
import { type ImportProgress } from "@/lib/import-progress";
import {
  DEFAULT_MIX_SETTINGS,
  parseMixSettings,
  serializeMixSettings,
  SETTINGS_STORAGE_KEY,
} from "@/lib/mix-settings";
import {
  addToQueue,
  hydrateLibraryState,
  LIBRARY_STATE_STORAGE_KEY,
  queueTracks as tracksForQueue,
  reconcileQueueCurrentId,
  removeFromQueue,
  sanitizeQueueIds,
} from "@/lib/local-library-state";

type ManagedPlayer = ReturnType<typeof createAudioPlayer>;
type PlayerSubscription = { remove: () => void };

export type LocalTrack = {
  id: string;
  title: string;
  artist: string;
  uri: string;
  fileName: string;
  mimeType?: string;
  bytes?: number;
  addedAt: number;
  profile: TrackProfile;
};

type PlaybackSnapshot = {
  playing: boolean;
  position: number;
  duration: number;
  isMixing: boolean;
};

type MixContextValue = {
  library: LocalTrack[];
  queueIds: string[];
  queueTracks: LocalTrack[];
  queueCurrentId?: string;
  currentTrack?: LocalTrack;
  nextTrack?: LocalTrack;
  currentIndex: number;
  playback: PlaybackSnapshot;
  settings: MixSettings;
  activePlan: ReturnType<typeof buildTransitionPlan> | null;
  importState: "idle" | "importing";
  importProgress?: ImportProgress;
  issue?: string;
  notice?: string;
  isReady: boolean;
  importAudio: () => Promise<void>;
  playTrack: (id: string) => Promise<void>;
  togglePlayback: () => Promise<void>;
  playNext: () => Promise<void>;
  playPrevious: () => Promise<void>;
  seekTo: (seconds: number) => Promise<void>;
  updateSettings: (patch: Partial<MixSettings>) => void;
  removeTrack: (id: string) => Promise<void>;
  clearLibrary: () => Promise<void>;
};

const LEGACY_LIBRARY_STORAGE_KEY = "automix.library.v1";

const MixContext = createContext<MixContextValue | null>(null);

function nextIndexFor(index: number, library: LocalTrack[]) {
  return index >= 0 && index + 1 < library.length ? index + 1 : -1;
}

function managedLibraryUri() {
  const uri = new Directory(Paths.document, "automix-library").uri;
  return uri.endsWith("/") ? uri : `${uri}/`;
}

function isManagedLibraryUri(uri: string) {
  return uri.startsWith(managedLibraryUri());
}

export function MixProvider({ children }: { children: React.ReactNode }) {
  const [library, setLibrary] = useState<LocalTrack[]>([]);
  const [queueIds, setQueueIds] = useState<string[]>([]);
  const [queueCurrentId, setQueueCurrentId] = useState<string>();
  const [currentIndex, setCurrentIndex] = useState(-1);
  const [settings, setSettings] = useState<MixSettings>(DEFAULT_MIX_SETTINGS);
  const [playback, setPlayback] = useState<PlaybackSnapshot>({
    playing: false,
    position: 0,
    duration: 0,
    isMixing: false,
  });
  const [importState, setImportState] = useState<"idle" | "importing">("idle");
  const [importProgress, setImportProgress] = useState<ImportProgress>();
  const [issue, setIssue] = useState<string>();
  const [notice, setNotice] = useState<string>();
  const [isReady, setIsReady] = useState(false);

  const currentPlayerRef = useRef<ManagedPlayer | null>(null);
  const sampleSubscriptionsRef = useRef(new Map<ManagedPlayer, PlayerSubscription>());
  const transitionPlayerRef = useRef<ManagedPlayer | null>(null);
  const transitionTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const mixingRef = useRef(false);
  const currentIndexRef = useRef(-1);
  const libraryRef = useRef<LocalTrack[]>([]);

  useEffect(() => {
    libraryRef.current = library;
  }, [library]);

  useEffect(() => {
    currentIndexRef.current = currentIndex;
  }, [currentIndex]);

  useEffect(() => {
    void setAudioModeAsync({
      playsInSilentMode: true,
      shouldPlayInBackground: true,
      interruptionModeAndroid: "duckOthers",
    }).catch(() => {
      setIssue("Audio playback setup was unavailable. Restart the app and try again.");
    });
  }, []);

  useEffect(() => {
    let mounted = true;
    const hydrate = async () => {
      try {
        const [storedLibraryState, storedLegacyLibrary, storedSettings] = await Promise.all([
          AsyncStorage.getItem(LIBRARY_STATE_STORAGE_KEY),
          AsyncStorage.getItem(LEGACY_LIBRARY_STORAGE_KEY),
          AsyncStorage.getItem(SETTINGS_STORAGE_KEY),
        ]);
        if (!mounted) return;
        const restoredState =
          hydrateLibraryState<LocalTrack>(storedLibraryState) ??
          hydrateLibraryState<LocalTrack>(storedLegacyLibrary);
        if (restoredState) {
          const restoredLibrary = restoredState.state.tracks;
          const restoredCurrentId = restoredState.state.queueCurrentId;
          const restoredIndex = restoredCurrentId
            ? restoredLibrary.findIndex((track) => track.id === restoredCurrentId)
            : restoredLibrary.length > 0
              ? 0
              : -1;
          setLibrary(restoredLibrary);
          setQueueIds(restoredState.state.queueIds);
          setQueueCurrentId(restoredCurrentId);
          setCurrentIndex(restoredIndex);
        }
        setSettings(parseMixSettings(storedSettings));
      } catch {
        if (mounted) setIssue("Your saved library could not be restored. Import music again to continue.");
      } finally {
        if (mounted) setIsReady(true);
      }
    };
    void hydrate();
    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    if (!isReady) return;

    const trackIds = library.map((track) => track.id);
    const persistedQueueIds = sanitizeQueueIds(trackIds, queueIds);
    const persistedCurrentId = reconcileQueueCurrentId(
      persistedQueueIds,
      queueCurrentId,
    );
    const state = {
      schemaVersion: 2 as const,
      tracks: library,
      queueIds: persistedQueueIds,
      ...(persistedCurrentId ? { queueCurrentId: persistedCurrentId } : {}),
    };

    void AsyncStorage.setItem(
      LIBRARY_STATE_STORAGE_KEY,
      JSON.stringify(state),
    ).catch(() => {
      setIssue("Your Library and queue changes could not be saved. Keep AutoMix open and try again.");
    });
  }, [isReady, library, queueCurrentId, queueIds]);

  useEffect(() => {
    if (isReady) void AsyncStorage.setItem(SETTINGS_STORAGE_KEY, serializeMixSettings(settings));
  }, [isReady, settings]);

  const releasePlayer = useCallback(() => {
    if (transitionTimerRef.current) {
      clearInterval(transitionTimerRef.current);
      transitionTimerRef.current = null;
    }
    mixingRef.current = false;

    const players = new Set([currentPlayerRef.current, transitionPlayerRef.current]);
    players.forEach((player) => {
      if (!player) return;
      sampleSubscriptionsRef.current.get(player)?.remove();
      sampleSubscriptionsRef.current.delete(player);
      try {
        player.pause();
      } catch {
        // The native player may already be disposed after an interrupted transition.
      }
      try {
        player.remove();
      } catch {
        // The native player may already be disposed after an interrupted transition.
      }
    });
    currentPlayerRef.current = null;
    transitionPlayerRef.current = null;
  }, []);

  useEffect(() => releasePlayer, [releasePlayer]);

  const updateTrackProfile = useCallback((trackId: string, profilePatch: Partial<TrackProfile>) => {
    setLibrary((current) => current.map((track) => (
      track.id === trackId ? { ...track, profile: { ...track.profile, ...profilePatch } } : track
    )));
  }, []);

  const createPlayerFor = useCallback((track: LocalTrack) => {
    const player = createAudioPlayer({ uri: track.uri });
    player.volume = 1;
    player.shouldCorrectPitch = true;
    if (player.isAudioSamplingSupported) {
      const tracker = createLiveTempoTracker();
      player.setAudioSamplingEnabled(true);
      const subscription = player.addListener("audioSampleUpdate", (sample) => {
        const estimate = tracker.push(sample.timestamp, sample.channels[0]?.frames ?? []);
        if (estimate) updateTrackProfile(track.id, { tempo: estimate.tempo, energy: estimate.energy });
      });
      sampleSubscriptionsRef.current.set(player, subscription);
    }
    return player;
  }, [updateTrackProfile]);

  const activateTrack = useCallback(async (index: number, autoplay = true) => {
    const nextTrack = libraryRef.current[index];
    if (!nextTrack) return;
    try {
      setIssue(undefined);
      setNotice(undefined);
      if (Platform.OS !== "web" && nextTrack.uri.startsWith("file://")) {
        const fileInfo = await FileSystem.getInfoAsync(nextTrack.uri);
        if (!fileInfo.exists) {
          setIssue("This saved audio file is no longer available. Remove it and import the original file again.");
          return;
        }
      }
      releasePlayer();
      const player = createPlayerFor(nextTrack);
      currentPlayerRef.current = player;
      setQueueCurrentId(nextTrack.id);
      setCurrentIndex(index);
      setPlayback({ playing: false, position: 0, duration: 0, isMixing: false });
      if (autoplay) {
        player.play();
        setPlayback((snapshot) => ({ ...snapshot, playing: true }));
      }
    } catch {
      setIssue("This audio file could not be played. Try importing a different file format.");
    }
  }, [createPlayerFor, releasePlayer]);

  const beginTransition = useCallback(async () => {
    const index = currentIndexRef.current;
    const tracks = libraryRef.current;
    const followingIndex = nextIndexFor(index, tracks);
    const outgoingPlayer = currentPlayerRef.current;
    if (mixingRef.current || followingIndex < 0 || !outgoingPlayer) return;

    const outgoing = tracks[index];
    const incoming = tracks[followingIndex];
    const plan = buildTransitionPlan(outgoing.profile, incoming.profile, settings);

    if (plan.strategy === "clean-handoff") return;

    let incomingPlayer: ManagedPlayer | null = null;
    try {
      mixingRef.current = true;
      setPlayback((snapshot) => ({ ...snapshot, isMixing: true }));
      incomingPlayer = createPlayerFor(incoming);
      const preparedIncomingPlayer = incomingPlayer;
      transitionPlayerRef.current = preparedIncomingPlayer;
      preparedIncomingPlayer.volume = 0;
      preparedIncomingPlayer.setPlaybackRate(plan.nextPlaybackRate);
      preparedIncomingPlayer.play();

      const start = Date.now();
      const durationMs = plan.transitionSeconds * 1000;
      transitionTimerRef.current = setInterval(() => {
        if (currentPlayerRef.current !== outgoingPlayer || transitionPlayerRef.current !== preparedIncomingPlayer) {
          if (transitionTimerRef.current) clearInterval(transitionTimerRef.current);
          transitionTimerRef.current = null;
          mixingRef.current = false;
          return;
        }
        const progress = Math.min(1, (Date.now() - start) / durationMs);
        outgoingPlayer.volume = 1 - progress;
        preparedIncomingPlayer.volume = progress;
        if (progress >= 1) {
          if (transitionTimerRef.current) clearInterval(transitionTimerRef.current);
          transitionTimerRef.current = null;
          sampleSubscriptionsRef.current.get(outgoingPlayer)?.remove();
          sampleSubscriptionsRef.current.delete(outgoingPlayer);
          outgoingPlayer.pause();
          outgoingPlayer.remove();
          currentPlayerRef.current = preparedIncomingPlayer;
          transitionPlayerRef.current = null;
          mixingRef.current = false;
          setQueueCurrentId(incoming.id);
          setCurrentIndex(followingIndex);
          setPlayback({
            playing: true,
            position: preparedIncomingPlayer.currentTime || 0,
            duration: preparedIncomingPlayer.duration || 0,
            isMixing: false,
          });
          haptic.confirm();
        }
      }, 50);
    } catch {
      if (transitionTimerRef.current) {
        clearInterval(transitionTimerRef.current);
        transitionTimerRef.current = null;
      }
      if (incomingPlayer) {
        sampleSubscriptionsRef.current.get(incomingPlayer)?.remove();
        sampleSubscriptionsRef.current.delete(incomingPlayer);
        try {
          incomingPlayer.pause();
          incomingPlayer.remove();
        } catch {
          // Best-effort native cleanup after a failed transition setup.
        }
      }
      transitionPlayerRef.current = null;
      mixingRef.current = false;
      setPlayback((snapshot) => ({ ...snapshot, isMixing: false }));
      setIssue("AutoMix could not prepare the next file. Playback will continue without a transition.");
    }
  }, [activateTrack, createPlayerFor, settings]);

  useEffect(() => {
    const timer = setInterval(() => {
      const player = currentPlayerRef.current;
      const index = currentIndexRef.current;
      if (!player) return;
      const duration = player.duration || 0;
      const position = player.currentTime || 0;
      setPlayback((snapshot) => ({
        ...snapshot,
        playing: player.playing,
        position,
        duration,
      }));
      const followingIndex = nextIndexFor(index, libraryRef.current);
      if (duration > 0 && position >= duration - 0.08 && followingIndex >= 0 && !mixingRef.current) {
        mixingRef.current = true;
        void activateTrack(followingIndex, true).finally(() => {
          mixingRef.current = false;
        });
        return;
      }
      if (
        settings.autoMixEnabled &&
        !mixingRef.current &&
        duration > 0 &&
        duration - position <= settings.transitionSeconds &&
        followingIndex >= 0
      ) {
        void beginTransition();
      }
    }, 250);
    return () => clearInterval(timer);
  }, [beginTransition, settings.autoMixEnabled, settings.transitionSeconds]);

  const importAudio = useCallback(async () => {
    setImportState("importing");
    setIssue(undefined);
    setNotice(undefined);
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: ["audio/*"],
        multiple: true,
        copyToCacheDirectory: true,
      });
      if (result.canceled || !result.assets) return;

      const supportedAssets = result.assets.filter((asset) => (
        isSupportedAudioAsset(asset) && (asset.size === undefined || asset.size === null || asset.size > 0)
      ));
      if (supportedAssets.length === 0) {
        setIssue("Select a local audio file such as MP3, M4A, WAV, FLAC, OGG, or AAC.");
        return;
      }

      const importKeys = new Set(libraryRef.current.map((track) => trackImportKey({
        name: track.fileName,
        size: track.bytes,
        uri: track.uri,
      })));
      const newAssets = supportedAssets.filter((asset) => {
        const key = trackImportKey(asset);
        if (importKeys.has(key)) return false;
        importKeys.add(key);
        return true;
      });
      if (newAssets.length === 0) {
        setNotice("Those files are already in your local library.");
        return;
      }

      const imported: LocalTrack[] = [];
      let failedImports = 0;
      const importStartedAt = Date.now();
      const destinationDirectory = managedLibraryUri();
      setImportProgress({ completed: 0, total: newAssets.length, currentFile: newAssets[0].name });
      if (Platform.OS !== "web") {
        const directoryInfo = await FileSystem.getInfoAsync(destinationDirectory);
        if (!directoryInfo.exists) {
          await FileSystem.makeDirectoryAsync(destinationDirectory, { intermediates: true });
        }
      }

      for (const [index, asset] of newAssets.entries()) {
        let uri = asset.uri;
        setImportProgress({ completed: index, total: newAssets.length, currentFile: asset.name });
        try {
          if (Platform.OS !== "web") {
            const destination = `${destinationDirectory}${importStartedAt}-${index}-${safeAudioFileName(asset.name)}`;
            await FileSystem.copyAsync({ from: asset.uri, to: destination });
            const destinationInfo = await FileSystem.getInfoAsync(destination);
            if (!destinationInfo.exists) throw new Error("Audio file could not be copied into the local library.");
            uri = destination;
          }
          imported.push({
            id: `${importStartedAt}-${index}-${asset.name}`,
            title: titleFromFileName(asset.name),
            artist: "Imported audio",
            uri,
            fileName: asset.name,
            mimeType: asset.mimeType ?? undefined,
            bytes: asset.size ?? undefined,
            addedAt: importStartedAt + index,
            profile: {},
          });
        } catch {
          failedImports += 1;
        }
        setImportProgress({ completed: index + 1, total: newAssets.length, currentFile: asset.name });
      }

      if (imported.length === 0) {
        setIssue("Audio import failed. Confirm the selected files are available locally and try again.");
        return;
      }

      if (libraryRef.current.length === 0 && imported.length > 0) setCurrentIndex(0);
      setLibrary((existing) => [...existing, ...imported]);
      setQueueIds((existing) =>
        imported.reduce((queue, track) => addToQueue(queue, track.id), existing),
      );
      setNotice(`${imported.length} ${imported.length === 1 ? "track was" : "tracks were"} added to your local library.${failedImports > 0 ? ` ${failedImports} could not be copied.` : ""}`);
      haptic.confirm();
    } catch {
      setIssue("Audio import failed. Confirm the file is available locally and try again.");
    } finally {
      setImportProgress(undefined);
      setImportState("idle");
    }
  }, []);

  const playTrack = useCallback(async (id: string) => {
    const index = libraryRef.current.findIndex((track) => track.id === id);
    if (index >= 0) await activateTrack(index, true);
  }, [activateTrack]);

  const togglePlayback = useCallback(async () => {
    if (!currentPlayerRef.current) {
      if (libraryRef.current.length > 0) await activateTrack(0, true);
      return;
    }
    const player = currentPlayerRef.current;
    if (player.playing) {
      player.pause();
      setPlayback((snapshot) => ({ ...snapshot, playing: false }));
    } else {
      if (player.duration > 0 && player.currentTime >= player.duration) await player.seekTo(0);
      player.play();
      setPlayback((snapshot) => ({ ...snapshot, playing: true }));
    }
    haptic.light();
  }, [activateTrack]);

  const playNext = useCallback(async () => {
    if (currentIndexRef.current < 0 && libraryRef.current.length > 0) {
      await activateTrack(0, true);
      return;
    }
    const followingIndex = nextIndexFor(currentIndexRef.current, libraryRef.current);
    const outgoing = libraryRef.current[currentIndexRef.current];
    const incoming = followingIndex >= 0 ? libraryRef.current[followingIndex] : undefined;
    if (outgoing && incoming && buildTransitionPlan(outgoing.profile, incoming.profile, settings).strategy === "clean-handoff") {
      await activateTrack(followingIndex, true);
      return;
    }
    await beginTransition();
  }, [activateTrack, beginTransition, settings]);

  const playPrevious = useCallback(async () => {
    const previous = currentIndexRef.current - 1;
    if (previous >= 0) await activateTrack(previous, true);
  }, [activateTrack]);

  const seekTo = useCallback(async (seconds: number) => {
    if (currentPlayerRef.current) await currentPlayerRef.current.seekTo(seconds);
  }, []);

  const updateSettings = useCallback((patch: Partial<MixSettings>) => {
    setSettings((current) => ({ ...current, ...patch }));
    haptic.medium();
  }, []);

  const deleteManagedTrackFile = useCallback(async (track: LocalTrack) => {
    if (Platform.OS === "web" || !isManagedLibraryUri(track.uri)) return true;
    try {
      const fileInfo = await FileSystem.getInfoAsync(track.uri);
      if (fileInfo.exists) await FileSystem.deleteAsync(track.uri, { idempotent: true });
      return true;
    } catch {
      return false;
    }
  }, []);

  const removeTrack = useCallback(async (id: string) => {
    const current = libraryRef.current;
    const index = current.findIndex((track) => track.id === id);
    if (index < 0) return;

    const removedTrack = current[index];
    const next = current.filter((track) => track.id !== id);
    libraryRef.current = next;
    setLibrary(next);
    setQueueIds((existing) => removeFromQueue(existing, id));
    setQueueCurrentId((currentId) =>
      currentId === id ? undefined : currentId,
    );
    if (index === currentIndexRef.current) {
      releasePlayer();
      currentIndexRef.current = -1;
      setCurrentIndex(-1);
      setPlayback({ playing: false, position: 0, duration: 0, isMixing: false });
    } else if (index < currentIndexRef.current) {
      currentIndexRef.current -= 1;
      setCurrentIndex(currentIndexRef.current);
    }

    if (!(await deleteManagedTrackFile(removedTrack))) {
      setIssue("The track was removed from the queue, but its local copy could not be deleted.");
    }
  }, [deleteManagedTrackFile, releasePlayer]);

  const clearLibrary = useCallback(async () => {
    const tracks = libraryRef.current;
    releasePlayer();
    libraryRef.current = [];
    currentIndexRef.current = -1;
    setLibrary([]);
    setQueueIds([]);
    setQueueCurrentId(undefined);
    setCurrentIndex(-1);
    setPlayback({ playing: false, position: 0, duration: 0, isMixing: false });
    const results = await Promise.all(tracks.map(deleteManagedTrackFile));
    if (results.some((deleted) => !deleted)) {
      setIssue("The queue was cleared, but some local audio copies could not be deleted.");
    }
  }, [deleteManagedTrackFile, releasePlayer]);

  const currentTrack = currentIndex >= 0 ? library[currentIndex] : undefined;
  const queueTracks = useMemo(
    () => tracksForQueue(library, queueIds),
    [library, queueIds],
  );
  const nextIndex = nextIndexFor(currentIndex, library);
  const nextTrack = nextIndex >= 0 ? library[nextIndex] : undefined;
  const activePlan = useMemo(
    () => currentTrack && nextTrack ? buildTransitionPlan(currentTrack.profile, nextTrack.profile, settings) : null,
    [currentTrack, nextTrack, settings],
  );

  const value = useMemo<MixContextValue>(() => ({
    library,
    queueIds,
    queueTracks,
    queueCurrentId,
    currentTrack,
    nextTrack,
    currentIndex,
    playback,
    settings,
    activePlan,
    importState,
    importProgress,
    issue,
    notice,
    isReady,
    importAudio,
    playTrack,
    togglePlayback,
    playNext,
    playPrevious,
    seekTo,
    updateSettings,
    removeTrack,
    clearLibrary,
  }), [
    activePlan,
    clearLibrary,
    currentIndex,
    currentTrack,
    importAudio,
    importProgress,
    importState,
    isReady,
    issue,
    notice,
    library,
    nextTrack,
    playback,
    playNext,
    playPrevious,
    playTrack,
    queueCurrentId,
    queueIds,
    queueTracks,
    removeTrack,
    seekTo,
    settings,
    togglePlayback,
    updateSettings,
  ]);

  return <MixContext.Provider value={value}>{children}</MixContext.Provider>;
}

export function useMix() {
  const context = useContext(MixContext);
  if (!context) throw new Error("useMix must be used inside MixProvider");
  return context;
}
