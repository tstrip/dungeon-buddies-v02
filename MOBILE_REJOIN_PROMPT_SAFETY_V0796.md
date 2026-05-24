# Loot Goblins v0.7.9.6 — Mobile Rejoin + Prompt Safety Audit

## Rejoin / mobile recovery

- Fixed duplicate-tab/mobile reconnect race:
  - an old socket disconnect can no longer mark a newly reattached player offline.
- Rejoin emits a visible toast:
  - `Reconnected as [name].`
- Join by same goblin name still reclaims the existing seat, even if the room is full.
- Stale saved sessions are cleared client-side when the server says the saved player/room was not found.
- Create room now gives a small table-created toast.
- Names are normalized and trimmed consistently.

## Trade recovery

- Trade participants can still cancel/recover while reconnecting.
- Trade screen tells you when the other player is reconnecting.
- Added emergency `RECOVER_TABLE` action for the host/active player when a trade or choice is stuck.
- `RECOVER_TABLE` can:
  - clear a stuck trade
  - clear a stuck prompt and continue the table

## Prompt safety

- `createPrompt` now checks for impossible prompts with no valid options.
- If a prompt needs options but has none, the game now:
  - shows a soft `No Valid Choice` event
  - logs the skip
  - continues based on the prompt's `after` rule
- Defensive prompt validation also checks this during `RESOLVE_PROMPT`.

## Version cleanup

- Landing page now says `Loot Goblins v0.7.9.6`.
- Server `/health`, socket ready version, serialized room version, and startup log are updated.

## UX principle from this pass

Mobile rejoin and no-valid-choice safety are core game mechanics now. The app should not punish players for phone calls, tab reloads, or weird card states.
