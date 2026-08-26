import { readFileSync } from "node:fs";

import { describe, expect, it, vi } from "vitest";

import { triggerImportIfAvailable } from "../lib/import-control";

const importSurfaces = [
  readFileSync("app/(tabs)/index.tsx", "utf8"),
  readFileSync("app/(tabs)/library.tsx", "utf8"),
].join("\n");
const importButtonSource = readFileSync("components/import-music-button.tsx", "utf8");

describe("import-control regression protection", () => {
  it("starts an import only while idle, without requiring a native disabled prop", () => {
    const importAudio = vi.fn().mockResolvedValue(undefined);

    triggerImportIfAvailable("idle", importAudio);
    triggerImportIfAvailable("importing", importAudio);

    expect(importAudio).toHaveBeenCalledTimes(1);
  });

  it("keeps every import surface visible and uses the guarded import action", () => {
    expect(importButtonSource).toContain('accessibilityState={{ disabled: importState === "importing" }}');
    expect(importButtonSource).toContain("triggerImportIfAvailable(importState, onImport)");
    expect(importButtonSource).not.toContain('disabled={importState === "importing"}');
    expect(importSurfaces).toContain("ImportMusicButton");
    expect(importSurfaces).toContain("Import music");
    expect(importSurfaces).toContain("Add music");
  });
});
