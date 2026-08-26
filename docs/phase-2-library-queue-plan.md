# AutoMix Phase 2: Library Organization and Queue Management

## Objective

Separate **what the user owns** (the local Library) from **what AutoMix will play next** (the Queue). Phase 2 makes it fast to locate imported music, choose a stable viewing order, and deliberately control playback order without deleting local audio or weakening the existing AutoMix transition logic.

> The Library is the durable collection of imported local files. The Queue is a persistent, editable sequence of Library track IDs used by playback and AutoMix.

This phase remains entirely local. It adds no account, remote catalog, cloud sync, or automatic APK build.

## Current-state constraints

AutoMix currently uses the `library` array as both the Library view and the playback order. Removing an item in Queue calls the destructive `removeTrack` operation, and Queue's **Clear** control deletes managed local files. Phase 2 must correct that conflation before adding sorting and reordering controls.

| Existing behavior                                | Phase 2 decision                                                                                                               |
| ------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------ |
| `library` is both collection and playback order. | Persist a distinct `queueIds: string[]`; playback and transition planning operate on queue tracks.                             |
| Queue removal can delete a copied audio file.    | **Remove from queue** only removes the ID from `queueIds`; **Remove from library** remains destructive and belongs in Library. |
| Queue **Clear** clears the entire Library.       | Replace it with **Clear queue**, which retains imported files. Library clearing becomes a separate, confirmed Library action.  |
| Library ordering determines AutoMix order.       | Library sort affects only the visual list; queue order determines AutoMix order.                                               |

## Data and persistence tasks

### P2-D1 — Introduce a versioned local library-and-queue state

Replace the single persisted-array assumption with a versioned shape that stores tracks and queue order independently. Store `queueIds` separately or within a `libraryState` record; either approach is acceptable only if hydration is atomic from the user's perspective.

```ts
type LocalLibraryStateV2 = {
  tracks: LocalTrack[];
  queueIds: string[];
  queueCurrentId?: string;
  schemaVersion: 2;
};

type LibraryViewPreferences = {
  sort: "recent" | "title" | "size";
  direction: "ascending" | "descending";
};
```

Each newly imported track receives `addedAt: number`. Existing tracks migrate by using the numeric timestamp prefix already present in their IDs when valid; otherwise, they receive a stable fallback timestamp in their existing order. The migration must never move, copy, or delete an audio file.

### P2-D2 — Migrate safely from the current installation

When only the current `automix.library.v1` value exists, hydrate all saved tracks and initialize `queueIds` to their existing IDs in that same order. This preserves the user's current playback behavior after updating. Invalid, duplicate, or missing IDs are removed during hydration; valid track IDs retain their relative queue order.

| Scenario                                       | Required result                                                                                        |
| ---------------------------------------------- | ------------------------------------------------------------------------------------------------------ |
| Current app upgrade with three imported tracks | Library contains all three tracks; Queue contains the same three IDs in the pre-upgrade order.         |
| Queue contains a removed track ID              | Ignore the missing ID; retain all valid IDs.                                                           |
| New import                                     | Add the new track to Library and append its ID to Queue.                                               |
| Remove from Queue                              | Keep the Library track and copied file.                                                                |
| Remove from Library                            | Remove its ID from Queue, delete the managed copy when applicable, and stop or repair playback safely. |
| Clear Queue                                    | Empty Queue only; Library and files remain available.                                                  |
| Clear Library                                  | Confirm destructive action, empty both structures, release players, and delete managed files.          |

### P2-D3 — Refactor playback to use queue order

The context exposes `queueTracks`, `queueCurrentIndex`, and `queueCurrentTrack`. `nextTrack`, `playNext`, `playPrevious`, the active transition plan, and transition scheduling derive from `queueTracks`, not the Library's visual sort order. Library filtering and sorting therefore cannot accidentally modify, reset, or re-plan the active queue.

The current Library context API gains the following explicit commands. Each command is JavaScript-guarded, preserves unique IDs, triggers appropriate light/medium haptics, and updates persisted state.

| Context command                  | Exact behavior                                                                                                                                       |
| -------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------- |
| `playLibraryTrack(id)`           | Starts the selected Library track. If absent from Queue, append it first; if present, jump to its queue position.                                    |
| `addToQueue(id)`                 | Append only if the ID is not already queued; show a concise notice when already queued.                                                              |
| `addNext(id)`                    | Insert after the current queue item. If nothing is current, insert at index zero. Existing queued items move rather than duplicate.                  |
| `moveQueueItem(id, targetIndex)` | Move one queue ID within bounds while retaining the same current track by ID.                                                                        |
| `removeFromQueue(id)`            | Remove only the queue ID. Removing the current item stops playback and selects the following queued item only when the user explicitly presses Play. |
| `clearQueue()`                   | Requires confirmation; empties Queue without deleting Library files.                                                                                 |
| `removeTrack(id)`                | Removes from Library and Queue, then follows the existing managed-file cleanup rules.                                                                |

## Library UI tasks

### P2-L1 — Add a compact search field

Place a search field below the Library header and above the updater card. It has a search icon, placeholder **Search imported music**, visible clear affordance only when text exists, and a 44 pt minimum target for clear. Search is case-insensitive and matches `title`, `artist`, and `fileName`. It trims leading/trailing whitespace and does not persist between launches.

The search result count replaces the normal total only while searching: **“3 matches”**. With no matches, show a centered non-destructive empty state: **“No matching tracks”** and **“Try a title, artist, or file name.”** The Import Music control remains visible.

### P2-L2 — Add a persistent sort control

Place a compact **Sort** control beside the search field. Tapping it opens a bottom sheet with these mutually exclusive choices:

| Choice         | Label              | Ordering rule                                                   |
| -------------- | ------------------ | --------------------------------------------------------------- |
| Default        | **Recently added** | Descending `addedAt`; stable tie-breaker is title.              |
| Alphabetical   | **Title A–Z**      | Locale-aware title comparison; stable tie-breaker is `addedAt`. |
| Storage review | **Largest files**  | Descending `bytes`; tracks with unknown size sort last.         |

The selected choice displays a checkmark and is stored in `LibraryViewPreferences`. Sorting is derived with `useMemo`; it never calls `setLibrary`, never alters `queueIds`, and never changes the current playback position.

### P2-L3 — Make Library row actions explicit

Each Library row keeps a large primary tap target for **Play now**. A 44 pt trailing overflow control opens a bottom sheet with the following actions, in this exact order:

1. **Play now**
2. **Play next**
3. **Add to queue** or **In queue** (disabled-looking informational row only; not a native-disabled pressable)
4. **Remove from library** (destructive confirmation)

An in-queue indicator appears beside a track title, using a low-emphasis queue icon rather than a full badge. The action sheet closes before playback or state mutation begins, avoiding stacked modals.

## Queue UI tasks

### P2-Q1 — Clarify queue scope and summary

Replace the current destructive **Clear** button in Queue with **Clear queue**. Present a confirmation sheet: **“Clear this queue? Your imported Library will stay on this device.”** The Queue subtitle becomes **“PLAYBACK ORDER · {count} TRACKS”**. If there is a current item, a compact now-playing line appears below the transition card.

### P2-Q2 — Add edit mode with accessible reordering

Queue supports an explicit **Edit** mode rather than drag-and-drop in this release. Drag handles require additional gesture tooling and are less predictable for one-handed accessibility. In Edit mode, each non-current row exposes three 44 pt controls: **Move up**, **Move down**, and **Remove from queue**. Boundary controls remain rendered with reduced opacity and a JavaScript guard; they are not passed a native `disabled` prop.

The current row remains visually highlighted and is not movable until it is no longer playing. Reordering a queued track immediately updates the displayed position numbers and re-computes the transition preview for the current and following tracks.

### P2-Q3 — Add a play-next shortcut

Outside Edit mode, each Queue row's overflow menu contains **Play now**, **Play next**, and **Remove from queue**. **Play next** moves an existing queued item to the slot immediately after the current item rather than creating a duplicate. The current row has no **Remove from queue** option; the user can stop playback and remove it through the Library's destructive action if necessary.

### P2-Q4 — Define queue empty behavior

When Queue is empty but Library contains tracks, show **“Your queue is empty”**, **“Add tracks from Library to build an AutoMix listening order.”**, and a full-width **Open Library** action. When both are empty, retain the existing import guidance. Neither state modifies local files.

## Interaction, accessibility, and resilience requirements

| Requirement             | Acceptance rule                                                                                                                           |
| ----------------------- | ----------------------------------------------------------------------------------------------------------------------------------------- |
| One-handed reach        | Search clear, Sort, row overflow, edit controls, and confirmations meet a 44 pt minimum target.                                           |
| No hidden controls      | Busy and boundary states use JavaScript guards and `accessibilityState`, never native `disabled` props.                                   |
| Screen-reader clarity   | Actions include track title: for example, `Add Night Drive to queue` and `Move Night Drive up`. Queue position changes announce politely. |
| No accidental data loss | Queue removal/clearing never deletes audio. Library deletion is visually destructive and requires confirmation.                           |
| Playback continuity     | A visual Library sort never changes the active player. Queue reordering retains the current track by ID.                                  |
| Failure recovery        | A failed persistence write shows a concise notice and leaves the in-memory order intact for the session.                                  |

## Deterministic tests and device validation

| ID    | Test                     | Required assertion                                                                                                                    |
| ----- | ------------------------ | ------------------------------------------------------------------------------------------------------------------------------------- |
| P2-T1 | Queue migration          | Current v1 library migrates to a unique queue with identical initial order.                                                           |
| P2-T2 | Queue operations         | Add, add-next, move, remove, and clear preserve uniqueness and do not mutate Library tracks.                                          |
| P2-T3 | Playback continuity      | Moving items before/after the current ID keeps the active current track correct by ID.                                                |
| P2-T4 | Derived Library view     | Search and each sort produce correct derived rows without mutating the source Library or Queue.                                       |
| P2-T5 | Native render regression | Search, Sort, Edit, queue actions, and boundary controls remain mounted without native `disabled` props.                              |
| P2-T6 | Device check             | Import at least five files, search, sort, enqueue, add-next, reorder, clear queue, restart the app, and confirm Library/files remain. |

## Implementation order and bundled-release gate

First implement **P2-D1 through P2-D3** with pure queue helpers and migration tests. Next add **P2-L1 through P2-L3**, then deliver Queue controls **P2-Q1 through P2-Q4**. Finish with the native render tests and device validation. Commit verified source changes, but do not start a manual APK build until this phase is paired with the next user-facing improvement—currently Phase 3 transition quality—unless a blocking defect requires an urgent test build.
