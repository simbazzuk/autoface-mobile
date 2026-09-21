# AutoFace Mobile v0.1.8

## Changes
- Branded native iOS splash screen using the supplied AutoFace artwork on black.
- Ionicons added to Discover, Introductions, Messages, Atlas and Profile bottom navigation.
- Selected/unselected tab icons follow the existing theme colours.
- iOS build number 4.
- Atlas request carries forward the profile-reflection API contract (`mode: profile`, explicit consent).

## Windows setup
Copy your existing `.env` from v0.1.7, then run:

    npm install --legacy-peer-deps
    npm run typecheck
    npx expo start --lan --clear

The tab icons can be tested through Metro. The native splash screen requires a fresh EAS iOS build:

    eas build --platform ios --profile development
