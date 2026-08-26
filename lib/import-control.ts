export type ImportControlState = "idle" | "importing";

/**
 * Keep an import control rendered during an active import. Android can suppress
 * a native Pressable passed the disabled prop, so duplicate taps are guarded in
 * JavaScript instead of hiding the control from the rendered screen.
 */
export function triggerImportIfAvailable(
  importState: ImportControlState,
  importAudio: () => void | Promise<void>,
) {
  if (importState === "importing") return;
  void importAudio();
}
