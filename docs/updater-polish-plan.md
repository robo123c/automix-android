# AutoMix Phase 1: Updater Polish Specification

## Objective

Make the **Library** update experience immediately understandable, safe, and recoverable. This phase improves the existing public-APK workflow only: AutoMix checks the public release manifest, opens the browser download when an update is available, and lets Android handle the user-confirmed installation. It must not imply silent installation or trigger an APK build by itself.

## Scope and non-goals

The scope is the existing **App updates** card in Library. It includes clearer installed-versus-available version information, explicit status states, release context, browser-handoff guidance, retry behavior, accessibility, and tests. The phase does not add background polling, automatic APK downloads, silent installation, accounts, or a new release.

## Target layout

The updater remains immediately below the Library's maximum-blend control and above the imported-track section. It becomes a vertically stacked card rather than a dense horizontal row, so the version and guidance remain legible on a narrow Android display.

| Area              | Required UI                                              | Purpose                                                     |
| ----------------- | -------------------------------------------------------- | ----------------------------------------------------------- |
| Header            | Update icon, **App updates**, and a compact status chip  | Lets a user scan the state without reading the entire card. |
| Installed summary | `Installed: 1.0.2 · build 6`                             | Establishes the version currently running on the device.    |
| Available summary | `Ready: 1.0.3 · build 7` when applicable                 | Makes the comparison and the update decision explicit.      |
| Release context   | Up to two lines of release notes and `APK size: 50.8 MB` | Provides enough context before leaving the app.             |
| Primary action    | One full-width, 44 pt minimum-height action              | Supports reliable one-handed use.                           |
| Secondary action  | Text action for retry or reopening the browser handoff   | Provides recovery without overloading the primary action.   |

The card should use the existing dark Library surface, lime accent for an update-ready state, neutral gray for the current state, amber only for recoverable attention states, and red only for an action-blocking error. The card must never hide, remove, or natively disable a `Pressable`; busy states use a JavaScript guard plus `accessibilityState`.

## Exact updater states and copy

| State                    | Status chip              | Primary action        | Supporting copy                                                                   | Secondary action                |
| ------------------------ | ------------------------ | --------------------- | --------------------------------------------------------------------------------- | ------------------------------- |
| Idle                     | `Not checked`            | `Check for update`    | `Installed: {version} · build {code}`                                             | None                            |
| Checking                 | `Checking`               | `Checking…`           | `Looking for the latest public AutoMix release.`                                  | None                            |
| Current                  | `Up to date`             | `Check again`         | `You're running {version} · build {code}.`                                        | None                            |
| Update ready             | `Update ready`           | `Download update`     | `Ready: {version} · build {code}` followed by release notes and APK size          | `What happens next?` disclosure |
| Browser handoff          | `Download opened`        | `Open download again` | `Download the APK in your browser, then follow Android's install prompts.`        | `Check again`                   |
| Offline/request failure  | `Couldn't check`         | `Try again`           | `AutoMix couldn't reach the update service. Check your connection and try again.` | `Open latest release`           |
| Missing/invalid manifest | `Release unavailable`    | `Try again`           | `The latest AutoMix release has not published valid update details yet.`          | `Open latest release`           |
| Browser failure          | `Couldn't open download` | `Open download again` | `AutoMix could not open the APK download. Try again or open the latest release.`  | `Open latest release`           |
| Unsupported platform     | `Android required`       | Hidden                | `APK updates are available from the installed Android app.`                       | None                            |

The **What happens next?** disclosure is collapsed by default. When opened, it shows: “AutoMix opens the public APK download in your browser. Choose **Download**, then follow Android’s installation prompt. Android—not AutoMix—confirms the install.” This is a precise explanation of the current security model.

## Implementation tasks

| ID  | Task                                             | Exact change                                                                                                                               | Done when                                                                               |
| --- | ------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------ | --------------------------------------------------------------------------------------- |
| U1  | Extend release metadata                          | Add optional `apkSizeBytes` to the public manifest. The release workflow obtains the value from the completed APK file before publication. | A new manifest includes a positive numeric size, while older manifests remain readable. |
| U2  | Extend metadata parsing                          | Parse and validate optional APK size; format it as MB only when present. Preserve the strict HTTPS URL and positive version-code checks.   | Invalid sizes are ignored safely; valid data renders as a human-readable size.          |
| U3  | Separate outcome reasons                         | Return typed results for current, update-ready, unsupported, network/request failure, invalid manifest, and browser handoff failure.       | The card never exposes raw errors or treats every failure as “no metadata.”             |
| U4  | Restructure the update card                      | Replace the current single horizontal arrangement with header, version summary, contextual content, and stacked actions.                   | All state copy remains readable on a 360 px-wide Android device.                        |
| U5  | Add handoff completion state                     | After the browser opens successfully, show `Download opened`, explicit Android guidance, and `Open download again`.                        | A user returning from the browser understands the next required action.                 |
| U6  | Add recovery paths                               | Provide retry for request failures and a public “latest release” fallback link for failures that block the normal path.                    | Every recoverable failure has an actionable next step.                                  |
| U7  | Preserve accessibility and import-control safety | Use accessible labels, busy-state announcements, 44 pt actions, and JavaScript press guards rather than native disabled props.             | Screen readers describe state/action correctly, and import controls remain unaffected.  |
| U8  | Add deterministic tests                          | Cover metadata size parsing, state-to-copy/action mapping, browser-handoff behavior, and render/accessibility assertions.                  | Tests cover every table state and regression checks remain green.                       |

## Interaction rules

The updater should remain **user initiated**. Library opening must not request the network automatically. While a check or browser handoff is active, repeat presses are ignored in JavaScript and the active button announces its busy state. A successful check that finds a newer build retains the available update until the user checks again or leaves the Library screen.

The `Open latest release` fallback always points to the public GitHub latest-release page rather than guessing an APK file name. The normal download action continues to use the validated APK URL from the manifest. No action claims that AutoMix installed the APK.

## Acceptance criteria

| Category            | Acceptance check                                                                                                                                        |
| ------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Version clarity     | Idle, current, and update-ready views show the installed version and build code; update-ready also shows the available version and build code.          |
| Release context     | New manifests show release notes and APK size; older manifests show notes without an empty size row.                                                    |
| Handoff clarity     | After browser opening, the UI tells the user to download in the browser and complete Android's installation prompt.                                     |
| Recovery            | Offline, invalid-manifest, and browser-open failures show distinct plain-language messages and useful actions.                                          |
| Accessibility       | All actions have stable labels, meet a 44 pt target, expose busy state, and remain operable without native `disabled` props.                            |
| Regression coverage | Unit and native-render tests cover the state map, optional size metadata, status/action copy, and visible controls.                                     |
| Release discipline  | The work stays in source and tests until bundled with at least one additional user-facing improvement, unless an urgent defect requires a manual build. |

## Recommended implementation order

Implement **U1–U3** first so the data and error model are stable. Then deliver **U4–U6** as one coherent Library UI change, followed by **U7–U8** and normal validation. The change should be committed after validation but held for the next bundled APK release, consistent with the established release policy.
