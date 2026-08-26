import { createElement } from "react";
import { act, create } from "react-test-renderer";
import { describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  fetchPublicApkUpdate: vi.fn(),
  openApkUpdate: vi.fn(),
  openLatestAutoMixRelease: vi.fn(),
}));

(
  globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean }
).IS_REACT_ACT_ENVIRONMENT = true;

vi.mock("react-native", () => ({
  Pressable: "Pressable",
  StyleSheet: { create: <T,>(styles: T) => styles },
  Text: "Text",
  View: "View",
}));
vi.mock("@expo/vector-icons/MaterialIcons", () => ({
  default: "MaterialIcons",
}));
vi.mock("../lib/app-update", () => ({
  fetchPublicApkUpdate: mocks.fetchPublicApkUpdate,
  getInstalledAutoMixBuild: () => ({ version: "1.0.2", build: "6" }),
  openApkUpdate: mocks.openApkUpdate,
  openLatestAutoMixRelease: mocks.openLatestAutoMixRelease,
}));

import { AppUpdateCard } from "../components/app-update-card";

function pressable(renderer: ReturnType<typeof create>, testID: string) {
  return renderer.root.findAll(
    (node) =>
      (node.type as unknown) === "Pressable" && node.props.testID === testID,
  )[0]!;
}

function renderedText(renderer: ReturnType<typeof create>) {
  return renderer.root
    .findAll((node) => (node.type as unknown) === "Text")
    .map((node) => node.children.join(""));
}

describe("AppUpdateCard native rendering", () => {
  it("keeps the visible check control mounted without a native disabled prop", () => {
    mocks.fetchPublicApkUpdate.mockResolvedValue({ kind: "current" });
    let renderer!: ReturnType<typeof create>;
    act(() => {
      renderer = create(createElement(AppUpdateCard));
    });

    const primary = pressable(renderer, "app-update-primary-action");
    expect(primary.props.disabled).toBeUndefined();
    expect(primary.props.accessibilityState).toEqual({
      disabled: false,
      busy: false,
    });
    expect(renderedText(renderer)).toContain("Installed: 1.0.2 · build 6");
  });

  it("renders release context and expandable install guidance when an update is found", async () => {
    mocks.fetchPublicApkUpdate.mockResolvedValue({
      kind: "available",
      update: {
        version: "1.0.3",
        versionCode: 7,
        apkUrl: "https://example.test/AutoMix.apk",
        notes: "Smoother transitions.",
        apkSizeBytes: 50_830_685,
      },
    });
    let renderer!: ReturnType<typeof create>;
    act(() => {
      renderer = create(createElement(AppUpdateCard));
    });

    await act(async () => {
      await pressable(renderer, "app-update-primary-action").props.onPress();
    });

    expect(renderedText(renderer)).toEqual(
      expect.arrayContaining([
        "Ready: 1.0.3 · build 7",
        "Smoother transitions.",
        "APK size · 50.8 MB",
      ]),
    );
    expect(
      pressable(renderer, "app-update-primary-action").props.disabled,
    ).toBeUndefined();

    act(() => pressable(renderer, "app-update-install-help").props.onPress());
    expect(renderedText(renderer).join(" ")).toContain(
      "Android—not AutoMix—confirms the install.",
    );
  });
});
