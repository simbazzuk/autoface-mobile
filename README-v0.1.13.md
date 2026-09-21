# AutoFace Mobile v0.1.13 — Profile & Verification Hub

- Adds the member's current profile photo to the native Profile screen using the existing authenticated profile-photo route.
- Adds profile-detail completeness feedback.
- Adds a dedicated authenticity and verification hub with Photo, Liveness and Identity status.
- Adds a 0–100% verification progress indicator without inventing verification state.
- Keeps existing profile editing, privacy controls, themes, notifications and sign-out.
- No new backend contract and no new dependency.
- iOS build number 9.

This release intentionally does not implement native photo upload or native liveness capture until the existing web upload/verification API contracts are confirmed. Existing backend verification remains the source of truth.
