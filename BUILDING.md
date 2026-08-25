# Building AutoMix with GitHub Actions

The repository includes an Android build workflow at `.github/workflows/android-build.yml`.

Every pull request and push to `main` runs linting, TypeScript checks, and deterministic tests. Pushes to `main` and manual workflow runs then generate a fresh Android native project from the Expo configuration, assemble a self-contained release APK, and upload it as the **AutoMix-android-release-apk** workflow artifact. The build job uses the official Gradle cache action and enables Gradle’s build cache, so repeat builds can reuse downloaded dependencies and compatible task outputs.

To create an APK, open the repository’s **Actions** tab, select **Android build**, select **Run workflow**, and download the APK artifact from the completed build. The release APK packages its JavaScript bundle, so it can open on a device without a development server. It is appropriate for direct testing but is not configured for Google Play production distribution.

For a Play Store release, add a separate signed release workflow and secure keystore credentials as GitHub repository secrets. Do not place signing material in the repository.
