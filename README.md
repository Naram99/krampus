# Krampus

Offline Christmas gift planner for Android, built with Expo SDK 54 and React Native. Names, gift ideas, budgets and purchase marks stay in local AsyncStorage. Reminders use the phone's notification scheduler; no account, backend, advertising, analytics or push-token registration is used.

The web target is a development preview. Local reminders and system permission flows must be tested in an installed Android build.

## Development

```sh
npm ci
npm start
npm run android
# Browser preview
npm run web
```

On a network-restricted development machine, set `EXPO_OFFLINE=1`. Expo CLI telemetry can be disabled with `EXPO_NO_TELEMETRY=1`.

## Checks

```sh
npm run check
```

This runs strict TypeScript, ESLint (zero warnings), and Node domain tests. Tests cover money parsing, integer spending calculations, legacy migration, storage failures/recovery, queued mutations, reminder permissions, scheduling boundaries and translation consistency. Tests use the installed TypeScript compiler and Node's built-in test runner; they do not load native modules.

For the optional mobile-size browser smoke test, install Chromium and serve a web export in a separate terminal:

```sh
npx playwright install chromium
npx expo export --platform web --output-dir dist
python3 -m http.server 8083 --bind 127.0.0.1 --directory dist
# In another terminal
npm run test:ui
```

`KRAMPUS_PREVIEW_URL` selects a different preview URL; `PLAYWRIGHT_CHROMIUM_EXECUTABLE` selects an existing Chromium binary. The smoke test checks validation, zero/edited prices, purchase marks, settings/language, budget warnings, persistence and legacy migration. Native confirmation dialogs, Android permissions and notification delivery still need device testing.

## Android builds

```sh
# Requires an authenticated Expo/EAS account with access to this project
npx eas-cli build --platform android --profile preview
# Play Store Android App Bundle
npx eas-cli build --platform android --profile production
```

Preview produces a shareable APK; production produces an AAB. Both use release variants. The offline config plugin removes Internet and overlay permission from release variants and disables Firebase Messaging auto-initialization. Debug builds retain Metro connectivity. Shared-storage permissions are blocked in all variants; local app storage and system-managed backup remain available.

For a local native build, Android SDK/NDK and the corresponding Java toolchain are required:

```sh
npx expo prebuild --platform android
npx expo run:android --variant release
```

Generated `android/` is ignored by Git. Native project generation alone is not an APK build. An Android JS/Hermes export alone does not verify notification delivery or native manifest merging.

## Data and reminders

- Version 2 stores amounts as integer hundredths. Comma and dot decimal input and grouped spaces are supported. Negative, partial and ambiguous values are rejected.
- Existing `@krampus:people` and `@krampus:settings` data migrate without overwriting unreadable sources. The app offers an explicit last-good-copy restore if loading fails. Stored sources and recovery copies are removed by Delete all local data.
- Settings save together. Currency changes retain the numerical amounts and require explicit confirmation; no exchange-rate conversion is performed.
- Reminders apply to the explicitly chosen shopping year and selected December days. Empty and completed lists have no pending reminders. Reminder times use device local time and are reconciled when the app returns to the foreground; Android may delay delivery.
- System backups may include app data according to device settings. This is not app cloud sync. Existing system/cloud backups must be managed outside the app.

The approved plan is in [PUBLISHING_PLAN.hu.md](PUBLISHING_PLAN.hu.md). Android release requirements and actual verification results are in [docs/RELEASE.hu.md](docs/RELEASE.hu.md). The privacy publication draft is in [docs/PRIVACY.hu.md](docs/PRIVACY.hu.md).
