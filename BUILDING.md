# Building AutoMix with GitHub Actions

The repository includes an Android build workflow at `.github/workflows/android-build.yml`.

Every pull request and push to `main` runs linting, TypeScript checks, and deterministic tests. Pushes to `main` and manual workflow runs then generate a fresh Android native project from the Expo configuration, assemble a debug APK, and upload it as the **AutoMix-android-debug-apk** workflow artifact.

To create an APK, open the repository’s **Actions** tab, select **Android build**, select **Run workflow**, and download the APK artifact from the completed build. A debug APK is intended for direct device testing and is not signed for Google Play production distribution.

For a Play Store release, add a separate signed release workflow and secure keystore credentials as GitHub repository secrets. Do not place signing material in the repository.
