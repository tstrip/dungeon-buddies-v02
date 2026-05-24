# Loot Goblins v0.7.11 — Reliability Gauntlet

## Build focus

Make full games survive repeated playthroughs, reconnects, prompt edge cases, combat transitions, death/body loot, and trade interruptions.

## Implemented in this build

### Server-side auto-repair
Added `repairRoomState(room, reason)` and supporting checks for:

- stale/missing prompt owners
- dead players holding old prompts
- prompt types that require options but have none
- pending Hex target missing/down
- combat with missing fighter
- combat with no Foes
- combat pass maps missing player keys
- everyone passed but combat not resolving
- escape queue missing players/Foes
- body loot prompt/body pile mismatch
- trade participants missing/down
- trade offers containing cards no longer owned
- dead active player outside the correct return window
- tribute state when hand is already legal

### Broadcast/action hardening
- Auto-repair runs before broadcast.
- Auto-repair runs before and after every player action.
- Manual Recover Table now attempts auto-repair first.

### Combat end protection
- `resolveCombat` now has a resolving guard.
- Dead players no longer block `allCombatPlayersPassed`.
- Missing pass keys are patched automatically.

### Body loot hardening
- Body loot now tracks `currentLooterId`.
- Body loot prompt repair can recover from mismatched/empty piles.
- Successful body loot advances/records the next looter more explicitly.

### Trade/rejoin hardening
- Trade offer contents are cleaned if a card disappears before confirmation.
- Ready/confirmed state resets when a stale card is removed.
- Trade participant missing/down safely closes the trade.
- Trade updatedAt refreshes on offer changes.

## Playtest checklist

### Full game paths
- [ ] Normal victory by Glory.
- [ ] Victory immediately after combat reward.
- [ ] Victory after Loot gain.
- [ ] Victory after selling Gear.
- [ ] Table completes two games in a row after refresh/rejoin.

### Combat
- [ ] Win combat normally.
- [ ] Tie combat; Foe wins; Flee starts.
- [ ] Everyone passes; combat ends exactly once.
- [ ] Add Foe after someone passed; readiness resets.
- [ ] Modifier after someone passed; readiness resets.
- [ ] Backup requested.
- [ ] Backup rescinded.
- [ ] Backup accepted.
- [ ] Combat transferred.
- [ ] Foe removed/replaced by card.

### Flee / Bad News / Death
- [ ] Flee succeeds.
- [ ] Flee fails and exact Bad News happens.
- [ ] Bad News choice routes forward.
- [ ] Knockout with empty hand.
- [ ] Knockout with 1 card.
- [ ] Knockout with 5+ cards.
- [ ] Body loot order advances.
- [ ] Body pile empties and game continues.
- [ ] Dead player returns on next turn.

### Trade / Rejoin
- [ ] Trade with equal offers.
- [ ] Gift trade.
- [ ] Empty offer trade.
- [ ] Offer changed after ready resets acceptance.
- [ ] Cancel trade.
- [ ] Rejoin during trade.
- [ ] Both traders leave/rejoin during trade.
- [ ] Third player only sees private observer trade state.

### Prompt safety
- [ ] Sell Gear with no valid sale cannot trap.
- [ ] Discard prompt with no valid cards skips.
- [ ] Choose-player prompt with no target skips.
- [ ] Prompt owner dies; prompt clears.
- [ ] Recover Table is rarely needed.
