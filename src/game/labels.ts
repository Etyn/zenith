import { cardOf, type GameState, type Move, type People, type Planet } from '../engine';

const PLANET_FR: Record<Planet, string> = {
  mercure: 'Mercure',
  venus: 'Vénus',
  terra: 'Terra',
  mars: 'Mars',
  jupiter: 'Jupiter',
};

const PEOPLE_FR: Record<People, string> = {
  animod: 'Animods',
  humain: 'Humains',
  robot: 'Robots',
};

function cardName(id: string): string {
  return cardOf(id)?.name ?? id;
}

export function decisionPrompt(state: GameState): string {
  const p = state.pending;
  if (p === null) return '';
  switch (p.kind) {
    case 'choosePlanet':
      return `Choisis une planète (${p.amount >= 0 ? '+' : ''}${p.amount} influence)`;
    case 'moveDiscToCenter':
      return 'Ramène un disque vers le centre';
    case 'chooseSegment':
      return `Choisis un segment de ${p.count} planètes contiguës`;
    case 'chooseColumn':
      return `Choisis une colonne ${p.owner === 'self' ? 'de ton camp' : 'adverse'}`;
    case 'confirmOptional':
      return 'Activer cet effet optionnel ?';
    case 'chooseOption':
      return 'Choisis une option';
    case 'chooseTier':
      return 'Choisis un palier (ou passe)';
    case 'chooseTech':
      return 'Choisis une technologie à développer';
    case 'chooseHandCard':
      return 'Choisis une carte à défausser';
    case 'chooseBoardToken':
      return 'Choisis un jeton du plateau';
  }
}

function describeChoose(state: GameState, index: number): string {
  const p = state.pending;
  if (p?.kind === 'confirmOptional') return 'Oui, activer';
  if (p?.kind === 'chooseBoardToken') {
    const slot = p.slots[index];
    if (slot === undefined) return `Option ${index + 1}`;
    return slot.kind === 'planet'
      ? `Jeton ${PLANET_FR[slot.planet]}`
      : `Jeton techno ${PEOPLE_FR[slot.people]}`;
  }
  if (p?.kind === 'chooseTier') return `Palier ${index + 1}`;
  return `Option ${index + 1}`;
}

export function describeMove(state: GameState, move: Move): string {
  switch (move.t) {
    case 'recruit': {
      const c = cardOf(move.cardId);
      return c ? `Recruter « ${c.name} » — ${PLANET_FR[c.planet]}` : 'Recruter';
    }
    case 'develop':
      return `Développer ${PEOPLE_FR[move.people]} — « ${cardName(move.cardId)} »`;
    case 'leadership': {
      const c = cardOf(move.cardId);
      return c ? `Leadership ${PEOPLE_FR[c.people]} — « ${c.name} »` : 'Leadership';
    }
    case 'decide':
      return PLANET_FR[move.planet];
    case 'choose':
      return describeChoose(state, move.index);
    case 'skip':
      return state.pending?.kind === 'confirmOptional' ? 'Non merci' : 'Passer';
    case 'decideTech':
      return PEOPLE_FR[move.people];
    case 'decideCard':
      return `Défausser « ${cardName(move.cardId)} »`;
  }
}
