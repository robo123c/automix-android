import { describe, expect, it } from "vitest";

import {
  addNextToQueue,
  addToQueue,
  hydrateLibraryState,
  moveQueueItem,
  queueTracks,
  reconcileQueueCurrentId,
  removeFromQueue,
  sanitizeQueueIds,
} from "../lib/local-library-state";

const tracks = [
  { id: "1710000000000-night-drive", title: "Night Drive" },
  { id: "1710000001000-sunrise", title: "Sunrise" },
  { id: "fallback-id", title: "Fallback" },
];

describe("versioned local Library and Queue state", () => {
  it("migrates a v1 track array into a unique queue without changing order", () => {
    const hydrated = hydrateLibraryState<(typeof tracks)[number]>(
      JSON.stringify(tracks),
    );

    expect(hydrated).toMatchObject({
      migratedFromV1: true,
      state: {
        schemaVersion: 2,
        queueIds: tracks.map((track) => track.id),
      },
    });
    expect(hydrated?.state.tracks.map((track) => track.addedAt)).toEqual([
      1_710_000_000_000, 1_710_000_001_000, 1_700_000_000_002,
    ]);
  });

  it("repairs duplicate and missing IDs from a persisted v2 queue", () => {
    const hydrated = hydrateLibraryState<(typeof tracks)[number]>(
      JSON.stringify({
        schemaVersion: 2,
        tracks,
        queueIds: ["1710000001000-sunrise", "missing", "1710000001000-sunrise"],
        queueCurrentId: "missing",
      }),
    );

    expect(hydrated?.migratedFromV1).toBe(false);
    expect(hydrated?.state.queueIds).toEqual(["1710000001000-sunrise"]);
    expect(hydrated?.state.queueCurrentId).toBeUndefined();
  });

  it("keeps queue operations unique and non-destructive to the Library", () => {
    const initial = ["1710000000000-night-drive", "1710000001000-sunrise"];
    const withFallback = addToQueue(initial, "fallback-id");
    const movedNext = addNextToQueue(
      withFallback,
      "1710000000000-night-drive",
      "fallback-id",
    );
    const reordered = moveQueueItem(movedNext, "1710000001000-sunrise", 0);
    const queueAfterRemoval = removeFromQueue(reordered, "fallback-id");

    expect(queueAfterRemoval).toEqual([
      "1710000001000-sunrise",
      "1710000000000-night-drive",
    ]);
    expect(queueTracks(tracks, queueAfterRemoval)).toEqual([
      tracks[1],
      tracks[0],
    ]);
    expect(tracks).toHaveLength(3);
    expect(
      sanitizeQueueIds(
        tracks.map((track) => track.id),
        ["fallback-id", "fallback-id"],
      ),
    ).toEqual(["fallback-id"]);
  });

  it("preserves the current track identity across add-next and reordering", () => {
    const currentId = "1710000001000-sunrise";
    const queueWithNext = addNextToQueue(
      tracks.map((track) => track.id),
      currentId,
      "fallback-id",
    );
    const reordered = moveQueueItem(
      queueWithNext,
      "1710000000000-night-drive",
      2,
    );

    expect(queueWithNext).toEqual([
      "1710000000000-night-drive",
      "1710000001000-sunrise",
      "fallback-id",
    ]);
    expect(reordered).toEqual([
      "1710000001000-sunrise",
      "fallback-id",
      "1710000000000-night-drive",
    ]);
    expect(reconcileQueueCurrentId(reordered, currentId)).toBe(currentId);
  });
});
