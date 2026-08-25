# Building AutoMix with GitHub Actions

The repository includes an Android build workflow at `.github/workflows/android-build.yml`.

Every pull request and push to `main` runs linting, TypeScript checks, and deterministic tests, but it does **not** generate an APK. The workflow runs nightly at 02:30 Asia/Kolkata (21:00 UTC) and can also be started manually. It compares `main` with the most recent successful nightly-release marker; if no source changes occurred, it exits without compiling or publishing an APK. The first nightly run creates the baseline release.

When changes are detected, the nightly run generates a fresh Android native project, assembles a self-contained release APK, attaches it to a dated GitHub release, and also retains the **AutoMix-android-release-apk** workflow artifact for 14 days. The build job uses the official Gradle cache action and enables Gradle’s build cache, so repeat builds can reuse downloaded dependencies and compatible task outputs. To request a release outside the nightly schedule, open the repository’s **Actions** tab, select **Android quality and nightly release**, and select **Run workflow**; it still builds only when changes are pending.

## Release policy

Bundle minor fixes into a short, reviewed change list for the next nightly release. Start the workflow manually only when an urgent APK is explicitly required; routine fixes should wait for the conditional nightly release. Markdown documentation changes, including nested files, and workflow-policy updates do not trigger an APK build.

The release APK packages its JavaScript bundle, so it opens on a device without a development server. It is appropriate for direct testing but is not configured for Google Play production distribution.

For a Play Store release, add a separate signed release workflow and secure keystore credentials as GitHub repository secrets. Do not place signing material in the repository.
