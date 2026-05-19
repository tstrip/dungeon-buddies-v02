# Loot Goblins Mobile Interaction Polish v0.5.2

This is a finer-comb mobile usability pass on top of v0.5.1.

## Changed

### Top banner de-emphasized
- Mobile top banner is smaller and more status-strip-like.
- Center panel remains the primary action surface.

### Active player clarity
- Added TURN / YOUR TURN badge to active player chip.
- Strengthened active chip glow.

### Center action clarity
- Start Turn no longer duplicates Open Chamber as both a big card and a primary button.
- The Chamber choice card is the primary Open Chamber action.
- No Foe state no longer duplicates Loot the Room as both a big card and a primary button.
- The Loot the Room card is the primary action when it is your move.
- Sell Gear remains as a secondary action.

### Perspective-aware waiting copy
- Waiting players see observer copy such as “J may Start Trouble” instead of direct “Tap a Foe.”
- Disabled option cards look more observational.

### Hand/toolbelt refinement
- Removed duplicate “Bottom Tray / Your Hand / Your Hand” feel.
- Hand now shows Cards / Combat Toolkit / Over Limit / Tribute Required depending on state.
- Over-limit hand count is louder.
- Phase-specific playable hints:
  - setup cards before Open Chamber
  - Foe/start-trouble hint in No Foe
  - playable cards in Combat/Reaction windows
- Added subtle hand edge fades so clipped cards look more intentional.

### Deck strip tightened
- Deck chip labels are shorter and count-forward.

## Still next
- Card inspector should become action-first.
- Backup negotiation deserves a dedicated mobile state.
- Tribute/over-limit can still become more dramatic.
- Full asset pass can wait until the interaction model is stable.
