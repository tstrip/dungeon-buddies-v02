# Loot Goblins v0.7.9.9 — Rejoin Recovery + Banner + No-Waste Play QOL

## Brainstormed QOL changes implemented

### 1. Rejoin/render recovery
The screenshot looked like the client reconnected but a mobile view render failed, leaving the table center blank.

Changes:
- renderGame now isolates render sections so one UI hiccup does not blank the whole screen.
- mobile stage rendering now has a fallback recovery panel.
- fallback panel includes Reload View and Recover Table when available.
- incoming state render is scheduled on the next animation frame to reduce reconnect timing weirdness.

### 2. Concise longer soft banners
Soft banners were carrying too much detail and disappearing a little fast.

Changes:
- soft popup now shows title + one concise line.
- removed the extra effect subline from soft popups.
- soft banner duration increased from 3.0s to 4.5s.
- toast timing adjusted slightly.

### 3. No-waste card actions
Cards should not appear playable if they cannot affect the game.

Changes:
- Special-card legal actions now check whether the effect can actually do something.
- Glory-gain cards that cannot increase Glory right now are not offered.
- “Steal a Glory” only appears when there is a valid target and the gain can matter.
- Hoard/Wand style cards only appear when the relevant deck/discard source exists.
- Dismiss Helper only appears when a Little Helper exists and Glory can matter.
- Extra Calling/Kin permits require a Calling/Kin before appearing.
