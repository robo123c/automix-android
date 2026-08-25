# AutoMix Android — Mobile Interface Design

## Product intent

AutoMix is a focused Android music player for user-provided audio. Its central promise is to preserve the ease and delight of a polished streaming-player experience while choosing musical transitions automatically. The first release is deliberately local-first: it imports audio files selected by the user, analyzes available metadata and simple musical compatibility signals, then selects a transition strategy—beat-aware blend, tempo-adjusted blend, crossfade, or clean handoff. It does not claim access to Apple Music’s catalog, Apple’s private models, or Apple’s internal AutoMix implementation.

## Screen list

| Screen | Primary content and functionality |
|---|---|
| **Now Playing** | Full-bleed artwork treatment, track/artist labels, large play control, scrubber, previous/next controls, AutoMix state, and an upcoming-transition preview. This is the default home screen. |
| **Queue** | Ordered upcoming tracks, active-track indicator, transition confidence labels, remove/reorder actions, and a clear queue action. |
| **Library** | Imported local audio list, import action, track metadata, duration, and quick enqueue/play actions. |
| **Transition Detail** | Explanation of the active or proposed mix: compatibility score, tempo relation, selected transition type, mix start point, and fallback explanation. |
| **Mix Settings** | AutoMix master toggle, blend intensity, maximum transition length, album-preservation setting, and fallback behavior. |
| **Import Sheet** | Native file-picker entry point, import-progress state, rejected-format explanations, and post-import confirmation. |

## Primary flows

The primary flow begins on **Now Playing**. The listener taps **Import music**, selects local audio, and is taken to **Library** with imported tracks. Selecting a track starts playback and fills the **Queue**. With AutoMix enabled, the Now Playing screen displays an upcoming transition card that explains the selected strategy rather than hiding it. The listener can tap the card to open **Transition Detail**, tune AutoMix in **Mix Settings**, or switch to Crossfade or no-transition behavior without losing the current queue.

The second flow is a quality-control flow. When two tracks have low compatibility, AutoMix does not force a dramatic blend. It lowers confidence, explains the reason in the transition preview, and falls back to a gentle crossfade or a clean handoff. Sequential albums and tracks marked as “preserve ending” favor no-transition behavior. This makes the app’s choices legible and protects musical endings rather than treating every pair as a club mix.

## Interaction and layout

The interface is designed for **portrait 9:16 Android phones** and one-handed use. The key transport button rests in the lower third; queue and settings are within thumb reach. A compact bottom navigation uses three destinations—Player, Queue, Library—while the player itself opens into a full-height immersive view. Primary controls use a 48–56 dp touch target, secondary icon controls use at least 44 dp, and every playback or AutoMix setting change provides concise haptic feedback on supported devices.

The visual language favors a dark, quiet listening surface over decorative glass effects. The player uses soft charcoal layers, warm off-white type, a lime-luminous primary signal for an active mix, and restrained color extracted from artwork only as a background accent. The same rhythm and spacing system applies across all screens: 8 dp base grid, rounded 22–28 dp surfaces, fine 1 dp separators, and high-contrast labels that remain readable over artwork.

## Color choices

| Token | Color | Intended use |
|---|---:|---|
| **Night** | `#0A0B10` | Primary app canvas and player background. |
| **Graphite** | `#161820` | Elevated cards, queue rows, and bottom navigation. |
| **Signal Lime** | `#C7FF3D` | Active AutoMix state, primary controls, focus accents. |
| **Cloud** | `#F6F7F2` | Main text and high-emphasis icons. |
| **Fog** | `#9B9EA8` | Secondary labels and metadata. |
| **Cobalt Mist** | `#6A8CFF` | Analysis state and informational details. |
| **Amber** | `#FFC74A` | Caution and low-confidence transition state. |

## Technical constraints and delivery boundary

Expo’s standard audio layer supports reliable playback control, but production-quality simultaneous dual-deck playback, beat-grid extraction, phase alignment, and time-stretch DSP require a custom native Android audio module or a dedicated audio engine such as ExoPlayer plus DSP tooling. The first build therefore delivers a realistic, explainable **intelligent transition prototype** with persisted preferences, transition scoring, transition visualisation, crossfade scheduling, and a clear native-module seam. The app will not misrepresent a basic volume fade as a full professional DJ engine.

