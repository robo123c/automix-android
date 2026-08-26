import { createElement } from "react";
import { act, create } from "react-test-renderer";
import { describe, expect, it, vi } from "vitest";

(globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

vi.mock("react-native", () => ({
  Pressable: "Pressable",
  StyleSheet: { create: <T,>(styles: T) => styles },
  Text: "Text",
}));
vi.mock("@expo/vector-icons/MaterialIcons", () => ({ default: "MaterialIcons" }));

import { ImportMusicButton } from "../components/import-music-button";

function renderedPressable(renderer: ReturnType<typeof create>, testID: string) {
  return renderer.root.findAll((node) => (node.type as unknown) === "Pressable" && node.props.testID === testID)[0]!;
}

describe("ImportMusicButton native rendering", () => {
  it("remains mounted without a native disabled prop during an import", () => {
    let renderer!: ReturnType<typeof create>;
    act(() => {
      renderer = create(createElement(ImportMusicButton, {
        label: "Copying 1 of 2",
        importState: "importing",
        onImport: vi.fn(),
        testID: "import-control",
      }));
    });

    const button = renderedPressable(renderer, "import-control");
    expect(button.props.disabled).toBeUndefined();
    expect(button.props.accessibilityState).toEqual({ disabled: true });
    expect(renderer.toJSON()).toBeTruthy();
  });

  it("calls the import handler only while idle", () => {
    const onImport = vi.fn();
    let renderer!: ReturnType<typeof create>;
    act(() => {
      renderer = create(createElement(ImportMusicButton, {
        label: "Import music",
        importState: "idle",
        onImport,
        testID: "idle-import-control",
      }));
    });

    act(() => renderedPressable(renderer, "idle-import-control").props.onPress());
    expect(onImport).toHaveBeenCalledTimes(1);
  });
});
