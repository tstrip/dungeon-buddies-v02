# Loot Goblins v0.7.9.7 — Game Flow Clarity Pass

## Core principle

Cause → Choice → Consequence.

Whenever the game asks a player to choose, the screen now tries to answer:

1. What caused this?
2. What do I choose?
3. What happens after?

## Changes

### Prompt source cards
- Prompt serialization now includes a sanitized `sourceCard` when available.
- Common effect prompts now attach their source card.
- Prompt screens show the source card before the choice.
- The source card can be tapped/viewed.

### Prompt UI
- Generic prompt screen rebuilt around Cause / Choice / After.
- Decision drawer also shows the Cause / Choice / After summary.
- Prompt titles are clearer:
  - Lose Gear
  - Pay Gear
  - Lose a Calling
  - Lose a Kin
  - Choose Bad News
  - Add a Foe
  - Choose from Discard

### Bad News choice support
- Added real UI for `CHOOSE_BAD_NEWS_OPTION`.
- Player can choose:
  - Lose Glory
  - Discard Your Hand

### No-blind-choice direction
- Wishing Ring was already fixed in v0.7.9.5.
- This pass extends the same philosophy to forced discard/gear/player prompts.

### Better unavailable-card feedback
- Inspecting a card with no legal action now explains why:
  - waiting on another player
  - finish the current choice
  - finish/cancel trade
  - Gear not playable during combat
  - Foes need a card like Unexpected Company
  - wait for your turn
  - down/dead state

### Prompt safety retained
- v0.7.9.6 no-valid-choice safety remains in place.
- No-valid-choice announcements now prefer showing the source card/cause.

## Public / private info rule locked for future builds

Public:
- Foe revealed
- Hex hits someone
- combat cards played
- Bad News
- death/body-loot state
- victory

Private:
- hidden Loot draws
- Loot the Room card identities
- body-looted card identity
- cards received into hand unless publicly revealed first
- trade contents until accepted by the two traders
