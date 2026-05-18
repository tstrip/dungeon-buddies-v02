# Loot Goblins v0.6.11 — Full Card Parity Regression / Mechanics Lock Audit

This release is a verification and cleanup pass after the v0.6 advanced-mechanics builds.

## What changed

- Locked the live deck to the current classic target: **168 total card copies**.
- Locked deck split to **95 Chamber** and **73 Loot** card copies.
- Added a server parity report endpoint at `/parity`.
- Added automated checks for:
  - total card-copy counts
  - Chamber/Loot split
  - duplicate card IDs
  - player-facing meta/dev text
  - live manual-resolution cards
- Removed the final extra Loot copy that caused the live deck to drift to 169 cards.
- Updated the visible app version and health version.

## Endpoints

- `/health` reports `0.6.11-full-parity-regression`.
- `/parity` reports the full deck audit and should return `ok: true` when the card database is clean.

## Live deck rule

Cards in the live deck must be either:

- fully automated, or
- guided choice into an automated result.

No live card should ask the table to resolve an effect manually.
