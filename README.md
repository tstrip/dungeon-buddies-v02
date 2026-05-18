# Loot Goblins v0.7.0 — Mechanical QA / Rules Lock

This release is the final mechanical verification pass before moving into visual/table overhaul work.

## What changed

- Kept the live deck locked to the classic target: **168 total card copies**.
- Kept deck split locked to **95 Chamber** and **73 Loot** card copies.
- Kept the `/parity` endpoint from v0.6.11.
- Added a new `/rules-lock` endpoint, also available as `/qa`.
- Added mechanical QA gates for:
  - exact card-copy counts
  - Chamber/Loot split
  - duplicate card IDs
  - live manual-resolution cards
  - player-facing meta/dev text
  - required card fields
  - core mechanical data by card type
  - active-room structural sanity checks
- Removed remaining player-facing version/meta phrasing from normal UI copy where found.
- Updated the visible app version and health version.

## Endpoints

- `/health` reports `0.7.0-table-layout-redesign`.
- `/parity` reports the deck parity audit.
- `/rules-lock` reports the final mechanical QA gate.
- `/qa` is an alias for `/rules-lock`.

## Expected QA result

A clean rules-lock report should return:

```json
{
  "ok": true,
  "status": "MECHANICS_LOCK_CANDIDATE"
}
```

## Live deck rule

Cards in the live deck must be either:

- fully automated, or
- guided choice into an automated result.

No live card should ask the table to resolve an effect manually.

## Next milestone

If v0.7.0 playtests cleanly, the next phase should be **v0.7 — Visual Table Overhaul** rather than more core mechanics expansion.
