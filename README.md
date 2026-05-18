# Loot Goblins v0.7.8 — Visual Cleanup + Bad News Audit

This build is the final pre-design-bible visual cleanup pass. It keeps the bolder goblin-table direction while removing the emoji-heavy look and broad crooked transforms that made parts of the UI feel messy.

## Highlights

- Replaced emoji-style UI marks with simple original monogram/sigil-style marks.
- Reworked the splash/lobby logo treatment into a CSS-built Loot Goblins crest instead of a glyph-based placeholder.
- Removed most broad askew/rotated styling from non-card UI elements.
- Preserved the intentional slight table wobble for Foe cards during combat, where it actually works.
- Added a stronger Bad News/effect audit to the rules-lock report so unsupported card effects are caught instead of silently slipping through.
- Improved Insurance Salesman-style Bad News so Gear-payment effects clearly discard Gear from owned Gear and prompt when a choice is required.
- Added a guided “discard Gear totaling X Junk” prompt.

`/health` reports `0.7.8-visual-cleanup-bad-news-audit`.
`/rules-lock` should report a clean mechanics-lock candidate.
