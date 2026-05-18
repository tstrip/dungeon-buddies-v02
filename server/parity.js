
const TARGETS = {
  totalCopies: 168,
  chamberCopies: 95,
  lootCopies: 73,
  forbiddenPlayerText: [
    /manual resolution/i,
    /resolve manually/i,
    /automated/i,
    /guided/i,
    /implementation/i,
    /placeholder/i,
    /source card/i,
    /v0\./i
  ]
};

function copyCount(cards) {
  return cards.reduce((sum, card) => sum + (card.copies || 1), 0);
}

function countBy(cards, keyFn) {
  const out = {};
  for (const card of cards) {
    const key = keyFn(card);
    out[key] = (out[key] || 0) + (card.copies || 1);
  }
  return out;
}

function textIssues(cards) {
  const issues = [];
  for (const card of cards) {
    for (const field of ['publicName', 'publicText', 'flavorText']) {
      const value = card[field] || '';
      for (const pattern of TARGETS.forbiddenPlayerText) {
        if (pattern.test(value)) {
          issues.push({ id: card.id, field, value, pattern: String(pattern) });
          break;
        }
      }
    }
  }
  return issues;
}

function manualIssues(cards) {
  return cards.filter((card) => (
    card.enforcement === 'MANUAL' ||
    card.manualRestriction === true ||
    card.effect?.type === 'MANUAL_PROMPT' ||
    card.consequence?.type === 'MANUAL_PROMPT' ||
    (Array.isArray(card.effects) && card.effects.some((e) => e?.type === 'MANUAL_PROMPT'))
  )).map((card) => ({ id: card.id, name: card.publicName, deck: card.deck, type: card.type }));
}

function duplicateIdIssues(cards) {
  const seen = new Map();
  const dupes = [];
  for (const card of cards) {
    if (seen.has(card.id)) dupes.push({ id: card.id, first: seen.get(card.id), second: card.publicName });
    else seen.set(card.id, card.publicName);
  }
  return dupes;
}

function buildParityReport(chamberCards, lootCards) {
  const all = [...chamberCards, ...lootCards];
  const chamberCopies = copyCount(chamberCards);
  const lootCopies = copyCount(lootCards);
  const totalCopies = chamberCopies + lootCopies;
  const manual = manualIssues(all);
  const text = textIssues(all);
  const dupes = duplicateIdIssues(all);
  const failures = [];

  if (chamberCopies !== TARGETS.chamberCopies) failures.push(`Chamber copy count is ${chamberCopies}; target is ${TARGETS.chamberCopies}.`);
  if (lootCopies !== TARGETS.lootCopies) failures.push(`Loot copy count is ${lootCopies}; target is ${TARGETS.lootCopies}.`);
  if (totalCopies !== TARGETS.totalCopies) failures.push(`Total copy count is ${totalCopies}; target is ${TARGETS.totalCopies}.`);
  if (manual.length) failures.push(`${manual.length} live card(s) still require manual resolution.`);
  if (text.length) failures.push(`${text.length} player-facing card text issue(s) found.`);
  if (dupes.length) failures.push(`${dupes.length} duplicate card id issue(s) found.`);

  return {
    version: '0.7.8-visual-cleanup-bad-news-audit',
    ok: failures.length === 0,
    targets: TARGETS,
    counts: {
      unique: { chamber: chamberCards.length, loot: lootCards.length, total: all.length },
      copies: { chamber: chamberCopies, loot: lootCopies, total: totalCopies },
      byDeckAndType: countBy(all, (card) => `${card.deck}:${card.type}`),
      byEnforcement: countBy(all, (card) => card.enforcement || 'AUTO')
    },
    failures,
    manualIssues: manual,
    playerFacingTextIssues: text,
    duplicateIdIssues: dupes
  };
}

module.exports = { buildParityReport, TARGETS };
