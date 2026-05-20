# Loot Goblins v0.7.8.3 — Action Banner + Sell Threshold + Helper Hotfix

## Fixes

### Temporary action banner
Soft banners now show a short effect summary from the card text instead of only saying the card type like "Special" or "Calling."

### Selling Gear
Selling now requires enough selected Junk to actually gain Glory.

- Sell button stays disabled until selected Gear totals at least 1000 Junk.
- Server also refuses sub-threshold sales before discarding anything.
- This prevents selling one 400-Junk item, losing it, then being told it was not enough.

### Bruiser / discard prompts
Generic card-choice prompts now scroll like the Sell/Junk drawer. This covers Bruiser discard, Backstab discard, and other large owned-card choice prompts.

### Dismiss the Helper
Player-choice prompts now render as actual player tiles instead of fake blank cards.

### Little Helper sacrifice safety
Sacrificing Little Helper while Fleeing now clears the Flee/reaction flags before advancing, reducing the chance of a stuck escape state.
