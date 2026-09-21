# AutoFace Mobile v0.1.7 — Messaging polish

Built from the v0.1.6 notification baseline.

## What's new
- Optimistic message sending with Sending / Sent / Failed state.
- Automatic conversation refresh every 5 seconds while the chat is focused and the app is active.
- Pull-to-refresh in chat, Messages and Introductions.
- Date separators (Today / Yesterday / date).
- Quick-reply starters for a new mutual conversation.
- Character counter for the 1,000-character message limit.
- Inline retry for chat load/send errors.
- Safer matchId handling from Expo Router.
- Back label encoding fix retained.
- v0.1.6 push notification support retained.

## Build baseline fixes retained
- EAS project ID and bundle identifier remain unchanged.
- iOS build number is 3.
- expo-dev-client is declared.
- `.npmrc` uses `legacy-peer-deps=true` for reproducible EAS installs.
- TypeScript excludes the Next.js `web-patch` source.
- Firebase exports `configured`, `auth` and `db` without the unsupported `firebase/auth/react-native` import.

## Install
Copy your existing `.env` from v0.1.6, then run:

```powershell
npm install --legacy-peer-deps
npm run typecheck
npx expo start --lan --clear
```

For an iOS development build:

```powershell
eas build --platform ios --profile development
```

## Important
v0.1.7 deliberately does not claim read receipts, typing presence, reactions, voice notes or image messaging. Those require corresponding server/data-model work and should be introduced as a separate backend-aware release.
