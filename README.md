# AutoFace Mobile v0.1.10 — Discover & Matching Experience

Built on the stable v0.1.9 Atlas Relationship Profile checkpoint.

## Changes
- Richer Discover candidate cards with larger photography and clearer profile metadata.
- Local age and location filters over the candidate set returned by the existing Discovery API.
- Clear empty-filter state with one-tap reset.
- Atlas compatibility signal and expandable explanation.
- Compatibility wording explicitly treats the signal as guidance, not a relationship judgement.
- Clearer Interested, Save and Pass actions.
- Optimistic removal after a successful choice, avoiding a full discovery reload after every action.
- Existing authenticity signal retained.
- No new dependencies or backend contract changes.
- App version 0.1.10; iOS build number 6.

## Test
1. Open Discover and pull to refresh.
2. Check candidate image/name/location/occupation/authenticity/Atlas signal.
3. Apply each age filter and a location substring; clear filters.
4. Expand/collapse Why this Atlas signal? on multiple candidates.
5. Test Save and confirm the candidate disappears only after the API succeeds.
6. Test Pass and Interested in the same way.
7. Confirm an API error remains visible and does not remove the candidate.
8. Confirm empty discovery and no-filter-match states are different.
9. Regression-check Introductions, Messages, Atlas and Profile.
