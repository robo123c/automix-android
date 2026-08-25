import AsyncStorage from "@react-native-async-storage/async-storage";
import * as DocumentPicker from "expo-document-picker";
import { Directory, File, Paths } from "expo-file-system";
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
  DEFAULT_MIX_SETTINGS,
  parseMixSettings,
  serializeMixSettings,
  SETTINGS_STORAGE_KEY,
} from "@/lib/mix-settings";

type ManagedPlayer = ReturnType<typeof createAudioPlayer>;

export type LocalTrack = {
  id: string;
  title: string;
  artist: string;
  uri: string;
  fileName: string;
  mimeType?: string;
  bytes?: number;
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
  currentTrack?: LocalTrack;
  nextTrack?: LocalTrack;
  currentIndex: number;
  playback: PlaybackSnapshot;
  settings: MixSettings;
  activePlan: ReturnType<typeof buildTransitionPlan> | null;
  importState: "idle" | "importing";
  issue?: string;
  isReady: boolean;
  importAudio: () => Promise<void>;
  playTrack: (id: string) => Promise<void>;
  togglePlayback: () => Promise<void>;
  playNext: () => Promise<void>;
  playPrevious: () => Promise<void>;
  seekTo: (seconds: number) => Promise<void>;
  updateSettings: (patch: Partial<MixSettings>) => void;
  removeTrack: (id: string) => void;
  clearLibrary: () => void;
};

const STORAGE_KEY = "automix.library.v1";

const MixContext = createContext<MixContextValue | null>(null);

function nextIndexFor(index: number, library: LocalTrack[]) {
  return index >= 0 && index + 1 < library.length ? index + 1 : -1;
}

export function MixProvider({ children }: { children: React.ReactNode }) {
  const [library, setLibrary] = useState<LocalTrack[]>([]);
  const [currentIndex, setCurrentIndex] = useState(-1);
  const [settings, setSettings] = useState<MixSettings>(DEFAULT_MIX_SETTINGS);
  const [playback, setPlayback] = useState<PlaybackSnapshot>({
    playing: false,
    position: 0,
    duration: 0,
    isMixing: false,
  });
  const [importState, setImportState] = useState<"idle" | "importing">("idle");
  const [issue, setIssue] = useState<string>();
  const [isReady, setIsReady] = useState(false);

  const currentPlayerRef = useRef<ManagedPlayer | null>(null);
  const sampleSubscriptionRef = useRef<{ remove: () => void } | null>(null);
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
    });
  }, []);

  useEffect(() => {
    let mounted = true;
    const hydrate = async () => {
      try {
        const [storedLibrary, storedSettings] = await Promise.all([
          AsyncStorage.getItem(STORAGE_KEY),
          AsyncStorage.getItem(SETTINGS_STORAGE_KEY),
        ]);
        if (!mounted) return;
        if (storedLibrary) {
          const restoredLibrary = JSON.parse(storedLibrary) as LocalTrack[];
          setLibrary(restoredLibrary);
          if (restoredLibrary.length > 0) setCurrentIndex(0);
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
    if (isReady) void AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(library));
  }, [isReady, library]);

  useEffect(() => {
    if (isReady) void AsyncStorage.setItem(SETTINGS_STORAGE_KEY, serializeMixSettings(settings));
  }, [isReady, settings]);

  const releasePlayer = useCallback(() => {
    sampleSubscriptionRef.current?.remove();
    sampleSubscriptionRef.current = null;
    if (currentPlayerRef.current) {
      currentPlayerRef.current.pause();
      currentPlayerRef.current.remove();
      currentPlayerRef.current = null;
    }
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
      sampleSubscriptionRef.current = player.addListener("audioSampleUpdate", (sample) => {
        const estimate = tracker.push(sample.timestamp, sample.channels[0]?.frames ?? []);
        if (estimate) updateTrackProfile(track.id, { tempo: estimate.tempo, energy: estimate.energy });
      });
    }
    return player;
  }, [updateTrackProfile]);

  const activateTrack = useCallback(async (index: number, autoplay = true) => {
    const nextTrack = libraryRef.current[index];
    if (!nextTrack) return;
    try {
      setIssue(undefined);
      releasePlayer();
      const player = createPlayerFor(nextTrack);
      currentPlayerRef.current = player;
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

    try {
      mixingRef.current = true;
      setPlayback((snapshot) => ({ ...snapshot, isMixing: true }));
      const incomingPlayer = createPlayerFor(incoming);
      incomingPlayer.volume = 0;
      incomingPlayer.setPlaybackRate(plan.nextPlaybackRate);
      incomingPlayer.play();

      const start = Date.now();
      const durationMs = plan.transitionSeconds * 1000;
      const timer = setInterval(() => {
        const progress = Math.min(1, (Date.now() - start) / durationMs);
        outgoingPlayer.volume = 1 - progress;
        incomingPlayer.volume = progress;
        if (progress >= 1) {
          clearInterval(timer);
          outgoingPlayer.pause();
          outgoingPlayer.remove();
          currentPlayerRef.current = incomingPlayer;
          mixingRef.current = false;
          setCurrentIndex(followingIndex);
          setPlayback({
            playing: true,
            position: incomingPlayer.currentTime || 0,
            duration: incomingPlayer.duration || 0,
            isMixing: false,
          });
          haptic.confirm();
        }
      }, 50);
    } catch {
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
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: ["audio/*"],
        multiple: true,
        copyToCacheDirectory: true,
      });
      if (result.canceled || !result.assets) return;

      const imported = result.assets.map((asset, index): LocalTrack => {
        let uri = asset.uri;
        if (Platform.OS !== "web") {
          const libraryDirectory = new Directory(Paths.document, "automix-library");
          libraryDirectory.create({ idempotent: true, intermediates: true });
          const safeName = asset.name.replace(/[^a-zA-Z0-9._-]/g, "_");
          const destination = new File(libraryDirectory, `${Date.now()}-${index}-${safeName}`);
          const source = new File(asset.uri);
          source.copy(destination);
          uri = destination.uri;
        }
        return {
          id: `${Date.now()}-${index}-${asset.name}`,
          title: titleFromFileName(asset.name),
          artist: "Imported audio",
          uri,
          fileName: asset.name,
          mimeType: asset.mimeType,
          bytes: asset.size,
          profile: {},
        };
      });

      if (libraryRef.current.length === 0 && imported.length > 0) setCurrentIndex(0);
      setLibrary((existing) => [...existing, ...imported]);
      haptic.confirm();
    } catch {
      setIssue("Audio import failed. Confirm the file is available locally and try again.");
    } finally {
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

  const removeTrack = useCallback((id: string) => {
    setLibrary((current) => {
      const index = current.findIndex((track) => track.id === id);
      const next = current.filter((track) => track.id !== id);
      if (index === currentIndexRef.current) {
        releasePlayer();
        setCurrentIndex(-1);
        setPlayback({ playing: false, position: 0, duration: 0, isMixing: false });
      } else if (index >= 0 && index < currentIndexRef.current) {
        setCurrentIndex((value) => value - 1);
      }
      return next;
    });
  }, [releasePlayer]);

  const clearLibrary = useCallback(() => {
    releasePlayer();
    setLibrary([]);
    setCurrentIndex(-1);
    setPlayback({ playing: false, position: 0, duration: 0, isMixing: false });
  }, [releasePlayer]);

  const currentTrack = currentIndex >= 0 ? library[currentIndex] : undefined;
  const nextIndex = nextIndexFor(currentIndex, library);
  const nextTrack = nextIndex >= 0 ? library[nextIndex] : undefined;
  const activePlan = useMemo(
    () => currentTrack && nextTrack ? buildTransitionPlan(currentTrack.profile, nextTrack.profile, settings) : null,
    [currentTrack, nextTrack, settings],
  );

  const value = useMemo<MixContextValue>(() => ({
    library,
    currentTrack,
    nextTrack,
    currentIndex,
    playback,
    settings,
    activePlan,
    importState,
    issue,
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
    importState,
    isReady,
    issue,
    library,
    nextTrack,
    playback,
    playNext,
    playPrevious,
    playTrack,
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
