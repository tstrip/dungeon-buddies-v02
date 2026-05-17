# Loot Goblins v0.6.4

## Economy + Attachments Patch

This build continues the v0.6 advanced mechanics track by tightening the everyday economy and Gear systems.

## Live-card standard

Cards should either resolve automatically or ask a clear player choice and then resolve automatically. No live card should ask the table to resolve vague manual text.

## Main changes

- Adds direct **Sell Gear** access during legal own-turn, non-combat phases.
- Selling can use Gear from hand, carried Gear, or equipped Gear.
- Every 1000 Junk Value gives +1 Glory.
- Selling cannot grant the final winning Glory.
- Halfstep-style sale doubling is applied once per turn when selling Gear.
- Adds Gear giving/trading support for Gear already in play.
  - Gear from hand cannot be traded directly.
  - Given Gear becomes carried by the recipient.
  - Heavy Gear limits are checked before transfer.
- Upgrades **Fine Print Permit** into a real attachment.
  - The permit attaches to a chosen Gear card.
  - That Gear becomes legal for its owner.
  - The attached permit stays with the Gear and is discarded with it.
- Adds Little Helper Flee support.
  - A player with Little Helper can sacrifice it while Fleeing to escape automatically.
- Adds basic Gear revalidation after Calling/Kin changes.
  - Gear that is no longer legal becomes carried and inactive instead of silently continuing to count.
- Removes remaining player-facing build/meta wording from card text.

## Version

Health endpoint reports `0.6.4-economy-attachments`.
