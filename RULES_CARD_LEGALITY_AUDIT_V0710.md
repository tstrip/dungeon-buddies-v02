# Loot Goblins v0.7.10 — Rules + Card Legality Audit

## Core rule

If the app lets you tap it, it should work and matter.
If it cannot work or would do nothing, it should not look playable.

## Implemented

### Server-side card legality gate
- `PLAY_CARD` actions from hand now have to match the same legal-action list the server sent to the client.
- This protects against stale buttons, reconnect edge cases, and direct invalid actions.
- If a stale action is sent, the server returns a useful reason instead of consuming the card.

### No-waste action filtering
Special-card legality now checks whether the effect can actually matter:
- Glory-gain cards hide if they cannot change Glory.
- Non-winning Glory cards hide if they would try to give the final Glory.
- Steal-Glory cards require a valid target.
- Draw-Loot cards require Loot deck/discard availability.
- Wand/discard recovery requires discard cards.
- Dismiss Helper requires an actual Little Helper and useful Glory.
- Extra Calling/Kin permits require a Calling/Kin first.
- Add Foe / Illusion Swap require combat and a Foe in hand.
- Combat removal/copy/ending cards require an actual combat Foe.
- Combat-transfer cards require a valid target.
- Zero-value combat modifiers do not appear.

### Combat timing guard
- After a player has passed in combat, their hand cards stop showing as playable until combat changes and readiness resets.
- Combat Tricks with +0/−0 style effects are filtered out.
- Foe Modifiers that alter neither strength nor loot are filtered out.

### Sell Gear audit
- Sell Gear now only appears as a table action when selling could actually gain Glory.
- Gear inspect no longer offers Sell if selling cannot matter.
- Selling Gear cannot consume Gear if the sale would not change Glory.
- Non-winning sale effects cap at 9 Glory and only award useful Glory.
- Existing multi-Gear selection and threshold checks remain.

### Prompt/consequence safety
- Existing v0.7.9.6 no-valid-choice prompt safety remains.
- Transfer-Glory prompts now only show valid living targets with stealable Glory.
- Bad News choice text now states the actual options.

### Trade privacy
- Third players still see that a trade is happening, but offer contents remain private to participants.
- Trade serializer now marks non-participant trade data as participant-private.

## Automated card/effect scan

Detected 65 unique card/effect/type labels in `server/cards.js`.

Top effect/type labels:
- LOSE_RENOWN: 16
- MODIFY_COMBAT_TOTAL: 10
- DISCARD_GEAR: 9
- GAIN_RENOWN: 9
- BONUS_AGAINST_ORIGIN: 7
- BONUS_AGAINST_ROLE: 6
- KNOCKOUT: 6
- RENOWN_BELOW: 6
- AUTO_ESCAPE: 2
- NEVER: 2
- NO_EFFECT: 2
- REMOVE_FOE_LOOT_ONLY: 2
- ADD_DIE_PENALTY: 1
- ADD_EXTRA_CALLING_SLOT: 1
- ADD_EXTRA_KIN_SLOT: 1
- ADD_FOE_FROM_HAND: 1
- ADD_MATCHING_FOE: 1
- ADJACENT_TAKE_GEAR: 1
- CANCEL_ACTIVE_HEX: 1
- CHANGE_ORIGIN: 1
- CHANGE_ROLE: 1
- CHEAT_GEAR: 1
- CHOOSE_DISCARD_HAND_OR_LOSE_GLORY: 1
- DISCARD_ALL_HEAVY_GEAR: 1
- DISCARD_ALL_IDENTITIES: 1
- DISCARD_FROM_HAND: 1
- DISCARD_GEAR_VALUE_OR_ALL: 1
- DISCARD_HAND_AND_GEAR: 1
- DIVINE_INTERVENTION: 1
- DOPPELGANGER: 1

## Acceptance target

- No visible playable card should be fake.
- No hand card can be played through a stale/direct action unless the server would currently advertise that action.
- No prompt should trap the table if it has no valid options.
- Selling Gear should not burn Gear for no Glory.
- Trade contents stay private unless players are participating.
