# Loot Goblins v0.7.9.11 — Observer Choice Hotfix

## Fixes

### Render crash
- Fixed the `cardClass is not defined` crash.
- Prompt source cards now use the existing `cardTypeClass(card)` helper.

### Observer choice screens
- Other players no longer see the generic Cause / Choice / After debug-looking panel for normal table chores.
- Added specific observer waiting screens for:
  - Sell Gear
  - Trade offer / trade review
  - Body Loot
  - Discarding
  - Bad News choice
  - Add Foe
  - generic fallback choice

### Sell Gear observer polish
- Sell Gear now reads like:
  - `[Player] is selling Gear`
  - `Selling is optional. The turn continues when they finish.`
  - `Waiting on their Gear choice.`

### Recover Table visibility
- Recover Table is now hidden from normal waiting/observer states.
- It remains available only inside true render fallback/recovery panels.

## Why
The game was functioning, but observers were seeing a mechanical fallback state. This patch makes common “someone else is doing X” moments feel intentional instead of broken.
