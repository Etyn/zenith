import type { Effect, PlanetTrack } from '../../engine';
import { describeCardEffects, describeEffect, describePlanet } from '../labels';

describe('describeEffect', () => {
  test('influence sur une planète précise', () => {
    expect(describeEffect({ k: 'influence', amount: 1, on: 'mars' })).toMatch(/Mars/);
    expect(describeEffect({ k: 'influence', amount: 1, on: 'mars' })).toMatch(/\+1/);
  });

  test('influence au choix', () => {
    expect(describeEffect({ k: 'influence', amount: 2, on: 'choice' })).toMatch(/choix/);
  });

  test('influenceEach', () => {
    expect(describeEffect({ k: 'influenceEach', amount: 1 })).toMatch(/chaque planète/);
  });

  test('credits / zenithium avec cible', () => {
    expect(describeEffect({ k: 'credits', amount: 5, target: 'self' })).toMatch(/crédits/);
    expect(describeEffect({ k: 'zenithium', amount: -2, target: 'opponent' })).toMatch(/zénithium/);
  });

  test('spend', () => {
    expect(describeEffect({ k: 'spend', resource: 'zenithium', amount: 1 })).toMatch(/zénithium/);
  });

  test('mobilize', () => {
    expect(describeEffect({ k: 'mobilize', count: 2, thenInfluence: true })).toMatch(/Mobilise/);
  });

  test('takeLeader', () => {
    expect(describeEffect({ k: 'takeLeader', side: 'gold' })).toMatch(/or/);
  });

  test('steal', () => {
    expect(describeEffect({ k: 'steal', resource: 'credits', amount: 3 })).toMatch(/Vole/);
  });

  test('influenceNeighbors', () => {
    expect(describeEffect({ k: 'influenceNeighbors', count: 3, amount: 1 })).toMatch(/segment/);
  });

  test('influenceDifferent', () => {
    expect(describeEffect({ k: 'influenceDifferent', amount: 1 })).toMatch(/différente/);
  });

  test('transfer', () => {
    expect(describeEffect({ k: 'transfer', count: 1, from: 'corresponding' })).toMatch(/correspondante/);
    expect(describeEffect({ k: 'transfer', count: 1 })).toMatch(/choix/);
  });

  test('exile', () => {
    const txt = describeEffect({ k: 'exile', side: 'opponent', count: 1, color: 'mars', thenInfluence: true });
    expect(txt).toMatch(/Exile/);
    expect(txt).toMatch(/Mars/);
  });

  test('exileForInfluence', () => {
    expect(describeEffect({ k: 'exileForInfluence', count: 1, amount: 2 })).toMatch(/Exile/);
  });

  test('discardHandAll', () => {
    expect(describeEffect({ k: 'discardHandAll' })).toMatch(/Défausse/);
  });

  test('optional imbrique le texte des sous-effets', () => {
    const txt = describeEffect({ k: 'optional', effects: [{ k: 'credits', amount: 1, target: 'self' }] });
    expect(txt).toMatch(/optionnel/);
    expect(txt).toMatch(/crédits/);
  });

  test('bonusToken', () => {
    expect(describeEffect({ k: 'bonusToken' })).toMatch(/jeton bonus/);
  });

  test('conditional décrit la condition et les sous-effets', () => {
    const txt = describeEffect({
      k: 'conditional',
      cond: { c: 'hasLeaderBadge' },
      effects: [{ k: 'influence', amount: 1, on: 'mars' }],
    });
    expect(txt).toMatch(/si /);
    expect(txt).toMatch(/leader/);
  });

  test('conditional creditsAtLeast', () => {
    const txt = describeEffect({
      k: 'conditional',
      cond: { c: 'creditsAtLeast', amount: 5 },
      effects: [{ k: 'credits', amount: 1, target: 'self' }],
    });
    expect(txt).toMatch(/5/);
  });

  test('choice liste les options séparées', () => {
    const txt = describeEffect({
      k: 'choice',
      options: [[{ k: 'credits', amount: 7, target: 'self' }], [{ k: 'zenithium', amount: 1, target: 'self' }]],
    });
    expect(txt).toMatch(/au choix/);
    expect(txt).toMatch(/\|/);
  });

  test('scale décrit les paliers coût/récompense', () => {
    const txt = describeEffect({
      k: 'scale',
      tiers: [{ cost: [{ k: 'spend', resource: 'credits', amount: 2 }], reward: [{ k: 'credits', amount: 4, target: 'self' }] }],
    });
    expect(txt).toMatch(/échelle/);
  });

  test('creditsPerCardColors', () => {
    expect(describeEffect({ k: 'creditsPerCardColors', zone: 'self', per: 1 })).toMatch(/couleur/);
  });

  test('creditsPerTechLevels', () => {
    expect(describeEffect({ k: 'creditsPerTechLevels', tiers: [1, 2, 3] })).toMatch(/techno/);
  });

  test('giveOpponent', () => {
    expect(describeEffect({ k: 'giveOpponent', resource: 'credits', amount: 2 })).toMatch(/Donne/);
  });

  test('giveLeaderBadge', () => {
    expect(describeEffect({ k: 'giveLeaderBadge' })).toMatch(/badge/);
  });

  test('influenceChoiceExcept', () => {
    expect(describeEffect({ k: 'influenceChoiceExcept', exceptColor: 'mars', amount: 1 })).toMatch(/sauf Mars/);
  });

  test('influenceChoiceAtCenter', () => {
    expect(describeEffect({ k: 'influenceChoiceAtCenter', amount: 1 })).toMatch(/centre/);
  });

  test('giveInfluenceOpponent', () => {
    expect(describeEffect({ k: 'giveInfluenceOpponent', amount: 1, exceptColor: 'mars' })).toMatch(/adversaire/);
  });

  test('moveDiscToCenter', () => {
    expect(describeEffect({ k: 'moveDiscToCenter' })).toMatch(/centre/);
  });

  test('developDiscounted', () => {
    expect(describeEffect({ k: 'developDiscounted', which: 'cardPeople', discount: 2 })).toMatch(/Développe/);
  });

  test('developLowest', () => {
    expect(describeEffect({ k: 'developLowest' })).toMatch(/Développe/);
  });

  test('discardHand', () => {
    expect(describeEffect({ k: 'discardHand', count: 1, thenInfluence: true })).toMatch(/Défausse/);
  });

  test('creditsFromCardValue', () => {
    expect(describeEffect({ k: 'creditsFromCardValue', source: 'transfer' })).toMatch(/valeur/);
  });

  test('takeBoardBonusToken', () => {
    expect(describeEffect({ k: 'takeBoardBonusToken' })).toMatch(/jeton bonus/);
  });

  test('couvre tous les variants de Effect sans lever et sans texte vide', () => {
    const samples: Effect[] = [
      { k: 'influence', amount: 1, on: 'mars' },
      { k: 'influenceEach', amount: 1 },
      { k: 'credits', amount: 1, target: 'self' },
      { k: 'zenithium', amount: 1, target: 'self' },
      { k: 'spend', resource: 'credits', amount: 1 },
      { k: 'mobilize', count: 1, thenInfluence: false },
      { k: 'takeLeader', side: 'silver' },
      { k: 'steal', resource: 'credits', amount: 1 },
      { k: 'influenceNeighbors', count: 2, amount: 1 },
      { k: 'influenceDifferent', amount: 1 },
      { k: 'transfer', count: 1 },
      { k: 'exile', side: 'self', count: 1 },
      { k: 'exileForInfluence', count: 1, amount: 1 },
      { k: 'discardHandAll' },
      { k: 'optional', effects: [] },
      { k: 'bonusToken' },
      { k: 'conditional', cond: { c: 'creditsAtLeast', amount: 1 }, effects: [] },
      { k: 'choice', options: [] },
      { k: 'scale', tiers: [] },
      { k: 'creditsPerCardColors', zone: 'self', per: 1 },
      { k: 'creditsPerTechLevels', tiers: [1] },
      { k: 'giveOpponent', resource: 'credits', amount: 1 },
      { k: 'giveLeaderBadge' },
      { k: 'influenceChoiceExcept', exceptColor: 'mars', amount: 1 },
      { k: 'influenceChoiceAtCenter', amount: 1 },
      { k: 'giveInfluenceOpponent', amount: 1 },
      { k: 'moveDiscToCenter' },
      { k: 'developDiscounted', which: 'choice', discount: 1 },
      { k: 'developLowest' },
      { k: 'discardHand', count: 1 },
      { k: 'creditsFromCardValue', source: 'exileOpponent' },
      { k: 'takeBoardBonusToken' },
    ];
    for (const effect of samples) {
      const txt = describeEffect(effect);
      expect(typeof txt).toBe('string');
      expect(txt.length).toBeGreaterThan(0);
    }
  });
});

describe('describePlanet', () => {
  const base: PlanetTrack = { discPos: 4, captured: [0, 0], bonusToken: null };

  test('centre, aucune capture', () => {
    expect(describePlanet(base, 0)).toBe('centre');
  });

  test('toi ×2 pour le viewer 0 quand discPos < centre', () => {
    const track: PlanetTrack = { discPos: 2, captured: [0, 0], bonusToken: null };
    expect(describePlanet(track, 0)).toBe('toi ×2');
  });

  test('adversaire ×3 pour le viewer 0 quand discPos > centre', () => {
    const track: PlanetTrack = { discPos: 7, captured: [0, 0], bonusToken: null };
    expect(describePlanet(track, 0)).toBe('adversaire ×3');
  });

  test('inversé pour le viewer 1 : discPos < centre = adversaire', () => {
    const track: PlanetTrack = { discPos: 2, captured: [0, 0], bonusToken: null };
    expect(describePlanet(track, 1)).toBe('adversaire ×2');
  });

  test('inversé pour le viewer 1 : discPos > centre = toi', () => {
    const track: PlanetTrack = { discPos: 7, captured: [0, 0], bonusToken: null };
    expect(describePlanet(track, 1)).toBe('toi ×3');
  });

  test('centre avec capture pour le viewer', () => {
    const track: PlanetTrack = { discPos: 4, captured: [1, 0], bonusToken: null };
    expect(describePlanet(track, 0)).toBe('centre — capturée toi ×1');
  });

  test('capture des deux côtés', () => {
    const track: PlanetTrack = { discPos: 2, captured: [1, 2], bonusToken: null };
    expect(describePlanet(track, 0)).toBe('toi ×2 — capturée toi ×1, adversaire ×2');
  });
});

describe('describeCardEffects', () => {
  test('carte inconnue → tableau vide', () => {
    expect(describeCardEffects('no-such-card')).toEqual([]);
  });

  test('carte réelle du catalogue : mars-bishop (influence + conditionnel)', () => {
    const lines = describeCardEffects('mars-bishop');
    expect(lines.length).toBe(2);
    expect(lines[0]).toMatch(/Mars/);
    expect(lines[1]).toMatch(/si /);
  });
});
