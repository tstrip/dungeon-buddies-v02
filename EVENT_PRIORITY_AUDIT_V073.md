# Loot Goblins v0.7.3 — Event Priority Audit

This build makes event interruption rules explicit instead of relying on text guessing.

## New event metadata

Announcements now include:

- `priority`: `hard`, `soft`, or `log`
- `category`: event category such as combat, hex, card, backup, turn
- `audience`: currently defaults to `all`, with support for actor/affected/system use later
- `requiresAck`: true/false

The client now respects this metadata first. Text-based detection remains only as a legacy fallback.

## Hard events

These are table-stopping moments:
- combat-changing cards
- Foe added / combat state changes
- Backup deal locked
- Flee result / Bad News
- death / zero Glory / victory
- opening roll complete
- Hex blocked/canceled or Hex choice prompts

## Soft events

These are visible but non-blocking:
- Calling / Kin played
- Gear equipped/carried
- routine card gained/drawn
- routine Hex reveal/resolved bookkeeping
- Glory/Tribute/effect updates that do not demand a table stop

## Log-only events

These do not create popups:
- Use Loot / Sell before Tribute bookkeeping
- pass/done buffing
- waiting states
- Backup negotiation setup/offers/declines before the deal is locked
- routine phase movement

## Why this matters

The game should not interrupt players based on fragile text matching. The server now tells the client exactly how each table event should behave.

## Next best step

v0.7.4 should focus on phase grammar: every phase should clearly answer who acts, what they can do, and what happens next.
