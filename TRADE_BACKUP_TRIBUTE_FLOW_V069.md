# Loot Goblins v0.6.9 — Trade + Backup + Tribute Flow

This build focuses on interaction correctness after the public-resolution clarity pass.

## Included

### Trade system
- Removed direct Give buttons from individual card inspectors.
- Player inspector now surfaces `Trade with [player]` on your turn.
- Trades are offer/accept based:
  - proposer chooses one or more cards to offer
  - recipient accepts or declines
  - proposer can rescind while the offer is pending
  - gifts are possible, but the recipient must still accept

### Backup rescind/cancel
- Fighter can rescind an open Backup request.
- Backup negotiation no longer has to hang if the fighter changes their mind.

### Optional prompt safety
- Optional prompts can be passed/canceled without trapping the game.
- Sell Gear prompts can be canceled/done without selling.
- No-Gear Sell checks return to the same phase and do not advance the turn.

### Use/Sell before Tribute
- The game now routes through a Use Loot / Sell window before checking Tribute.
- Tribute is checked only after the active player finishes that window.

### Potion timing fix
- Potion-Belt of Giant Strength is now a one-use combat Trick instead of equipable Gear.
- It can be used during combat for +3 to a combat side and then discards.

## Notes
- The trade system is intentionally simple: offer cards, accept/decline, rescind. Counteroffers can come later.
- This build does not add new art assets.
