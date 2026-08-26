# In-app APK update implementation notes

- Expo Application exposes `nativeBuildVersion` on Android, sourced from `android.versionCode`; use it rather than app-config metadata to compare installed and available APK builds.
- Expo IntentLauncher can launch Android intents, but it does not provide a safe public file URI for an APK installer handoff by itself. The updater will therefore use a public release download URL and Android’s standard confirmation flow rather than attempting silent installation.

## Official references

- [Expo Application](https://docs.expo.dev/versions/latest/sdk/application/)
- [Expo IntentLauncher](https://docs.expo.dev/versions/latest/sdk/intent-launcher/)
- [Expo app version management](https://docs.expo.dev/build-reference/app-versions/)
