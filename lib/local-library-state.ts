export const LIBRARY_STATE_STORAGE_KEY = "automix.library.v2";

export type QueueTrack = {
  id: string;
  addedAt?: number;
};

export type LocalLibraryStateV2<T extends QueueTrack> = {
  schemaVersion: 2;
  tracks: Array<T & { addedAt: number }>;
  queueIds: string[];
  queueCurrentId?: string;
};

export type HydratedLibraryState<T extends QueueTrack> = {
  state: LocalLibraryStateV2<T>;
  migratedFromV1: boolean;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object";
}

function validAddedAt(value: unknown): value is number {
  return typeof value === "number" && Number.isSafeInteger(value) && value > 0;
}

function timestampFromTrackId(id: string, fallback: number) {
  const match = /^(\d+)-/.exec(id);
  const parsed = match ? Number(match[1]) : Number.NaN;
  return Number.isSafeInteger(parsed) && parsed > 0 ? parsed : fallback;
}

function normalizeTracks<T extends QueueTrack>(tracks: unknown[]) {
  const seenIds = new Set<string>();
  const fallbackBase = 1_700_000_000_000;

  return tracks.reduce<Array<T & { addedAt: number }>>(
    (normalized, candidate, index) => {
      if (
        !isRecord(candidate) ||
        typeof candidate.id !== "string" ||
        !candidate.id ||
        seenIds.has(candidate.id)
      ) {
        return normalized;
      }

      seenIds.add(candidate.id);
      const track = candidate as T;
      const addedAt = validAddedAt(track.addedAt)
        ? track.addedAt
        : timestampFromTrackId(track.id, fallbackBase + index);
      normalized.push({
        ...track,
        addedAt,
      });
      return normalized;
    },
    [],
  );
}

export function sanitizeQueueIds(trackIds: string[], queueIds: unknown) {
  if (!Array.isArray(queueIds)) return [...trackIds];

  const validTrackIds = new Set(trackIds);
  const seen = new Set<string>();
  return queueIds.reduce<string[]>((sanitized, candidate) => {
    if (
      typeof candidate !== "string" ||
      !validTrackIds.has(candidate) ||
      seen.has(candidate)
    ) {
      return sanitized;
    }

    seen.add(candidate);
    sanitized.push(candidate);
    return sanitized;
  }, []);
}

export function reconcileQueueCurrentId(
  queueIds: string[],
  currentId: unknown,
) {
  return typeof currentId === "string" && queueIds.includes(currentId)
    ? currentId
    : undefined;
}

export function hydrateLibraryState<T extends QueueTrack>(
  rawState: string | null,
): HydratedLibraryState<T> | null {
  if (!rawState) return null;

  let parsed: unknown;
  try {
    parsed = JSON.parse(rawState);
  } catch {
    return null;
  }

  if (Array.isArray(parsed)) {
    const tracks = normalizeTracks<T>(parsed);
    const queueIds = tracks.map((track) => track.id);
    return {
      migratedFromV1: true,
      state: { schemaVersion: 2, tracks, queueIds },
    };
  }

  if (
    !isRecord(parsed) ||
    parsed.schemaVersion !== 2 ||
    !Array.isArray(parsed.tracks)
  ) {
    return null;
  }

  const tracks = normalizeTracks<T>(parsed.tracks);
  const trackIds = tracks.map((track) => track.id);
  const queueIds = sanitizeQueueIds(trackIds, parsed.queueIds);
  return {
    migratedFromV1: false,
    state: {
      schemaVersion: 2,
      tracks,
      queueIds,
      ...(reconcileQueueCurrentId(queueIds, parsed.queueCurrentId)
        ? {
            queueCurrentId: reconcileQueueCurrentId(
              queueIds,
              parsed.queueCurrentId,
            ),
          }
        : {}),
    },
  };
}

export function queueTracks<T extends QueueTrack>(
  tracks: T[],
  queueIds: string[],
) {
  const tracksById = new Map(tracks.map((track) => [track.id, track]));
  return sanitizeQueueIds(
    tracks.map((track) => track.id),
    queueIds,
  ).flatMap((id) => {
    const track = tracksById.get(id);
    return track ? [track] : [];
  });
}

export function addToQueue(queueIds: string[], trackId: string) {
  return queueIds.includes(trackId) ? [...queueIds] : [...queueIds, trackId];
}

export function addNextToQueue(
  queueIds: string[],
  currentId: string | undefined,
  trackId: string,
) {
  if (trackId === currentId) return [...queueIds];

  const withoutTrack = queueIds.filter((id) => id !== trackId);
  const currentIndex = currentId ? withoutTrack.indexOf(currentId) : -1;
  const insertionIndex = currentIndex >= 0 ? currentIndex + 1 : 0;
  return [
    ...withoutTrack.slice(0, insertionIndex),
    trackId,
    ...withoutTrack.slice(insertionIndex),
  ];
}

export function moveQueueItem(
  queueIds: string[],
  trackId: string,
  targetIndex: number,
) {
  const sourceIndex = queueIds.indexOf(trackId);
  if (sourceIndex < 0) return [...queueIds];

  const withoutTrack = queueIds.filter((id) => id !== trackId);
  const clampedIndex = Math.max(0, Math.min(targetIndex, withoutTrack.length));
  return [
    ...withoutTrack.slice(0, clampedIndex),
    trackId,
    ...withoutTrack.slice(clampedIndex),
  ];
}

export function removeFromQueue(queueIds: string[], trackId: string) {
  return queueIds.filter((id) => id !== trackId);
}
