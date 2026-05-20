# Loot Goblins v0.6.16 — Soft Popup Fit + Fine-Tooth UX Polish

## Fixed clear issue from screenshot

The passive soft popup could render like a giant parchment/card panel, drift to the right side of the screen, and cover too much of the play area.

Soft popups are now forced into a compact global toast layout:
- fixed viewport positioning
- left/right safe margins
- no offscreen right clipping
- no giant parchment/card body
- compact icon + title + detail + optional View button
- small timer bar
- auto-dismisses after 3 seconds

## Observer copy polish

When another player reveals a non-Foe card, the center panel no longer says:
- "Added to your hand"
- "Choose whether to use it now..."

It now says:
- "Added to [player]'s hand"
- "[player] may play it now or choose a move."

## Inspector legality remains from v0.6.15

Publicly viewed cards still do not show action buttons unless the viewer owns that exact card instance.

## Usability/fun polish direction

This pass keeps the source-first clarity work, but makes passive updates feel like game-like popups instead of web banners or giant cards.
