# Loot Goblins v0.7.8 — Streamlined Table Language + Loot Reveal + Sell Drawer Fix

## Main focus

This build reduces meta/repeated language and fixes the Sell Gear drawer problem.

## Language cleanup

Player-facing UI should not say "resolve" anymore.

Examples changed:
- Resolve Hex → Take the Hit
- Host is resolving a Hex → Host is hit by a Hex
- Prompt pending → Choice waiting / player has a choice
- Resolve this choice → Make this choice
- Bad News resolves → Bad News happens

## Sell Gear drawer fix

The Sell Gear decision drawer is now a real scrollable surface:
- Gear list scrolls vertically
- sticky Sell Selected / Done controls
- selected Gear remains clear
- Done is always available for optional selling
- center prompt no longer duplicates the full Gear list

## Private loot/card gain splash

Cards gained privately now appear in a recipient-only splash:
- Loot the Room hidden Chamber draw
- Loot reward draws
- private draw effects

Other players still only see public draw information, not the private card identities.

## Public vs private draw behavior

- Open Chamber face-up remains public.
- Loot the Room is private to the drawing player.
- Loot rewards are private to each recipient.
- The private recipient confirms the gained cards with Got it.

## Still not included

No new art assets or full visual redesign yet. This is UX hardening before v0.8.
