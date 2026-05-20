# Loot Goblins v0.7.8.1 — Streamlined Table Language Hotfix

## What this fixes

v0.7.8 accidentally truncated the front-end app file while replacing the old prompt panel. That removed key functions such as the hand renderer, which caused the board to load mostly blank.

This build rebuilds the update from the stable v0.7.7 base and applies the v0.7.8 work safely.

## Kept from v0.7.8

- Player-facing language cleanup:
  - "Resolve Hex" → "Take the Hit"
  - "Prompt pending" → choice/waiting language
  - "Bad News resolves" → "Bad News happens"
- Sell Gear drawer scroll fix
- Private card-gain splash for hidden Chamber/Loot reward/private draws
- Public vs private draw handling

## Safety checks

- app.js is no longer truncated
- renderHand remains present
- renderActiveTable remains present
- renderPrompt is safely replaced only as a small hidden bridge
- JS syntax checks pass
