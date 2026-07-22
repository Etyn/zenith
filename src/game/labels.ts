import { CENTER, cardOf, type Condition, type Effect, type GameState, type Move, type People, type Planet, type PlanetTrack, type PlayerIndex } from '../engine';

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

function signed(amount: number): string {
  return `${amount >= 0 ? '+' : ''}${amount}`;
}

function resourceFr(resource: 'credits' | 'zenithium'): string {
  return resource === 'credits' ? 'crédits' : 'zénithium';
}

function sideFr(side: 'self' | 'opponent'): string {
  return side === 'self' ? 'toi' : 'adversaire';
}

function describeCondition(cond: Condition): string {
  switch (cond.c) {
    case 'hasLeaderBadge':
      return cond.side === 'gold' ? 'tu as le badge de leader or' : 'tu as le badge de leader';
    case 'creditsAtLeast':
      return `tu as au moins ${cond.amount} crédits`;
  }
}

/** Rend UN effet en texte FR court (termes techniques acceptés). Couvre tous les variants de `Effect`. */
export function describeEffect(effect: Effect): string {
  switch (effect.k) {
    case 'influence':
      return effect.on === 'choice'
        ? `Influence ${signed(effect.amount)} (planète au choix)`
        : `Influence ${signed(effect.amount)} — ${PLANET_FR[effect.on]}`;
    case 'influenceEach':
      return `Influence ${signed(effect.amount)} sur chaque planète`;
    case 'credits':
      return `${signed(effect.amount)} crédits — ${sideFr(effect.target)}`;
    case 'zenithium':
      return `${signed(effect.amount)} zénithium — ${sideFr(effect.target)}`;
    case 'spend':
      return `Dépense ${effect.amount} ${resourceFr(effect.resource)}`;
    case 'mobilize':
      return `Mobilise ${effect.count} carte(s) du dessus de la pioche${effect.thenInfluence ? ' puis +1 influence' : ''}`;
    case 'takeLeader':
      return `Prends le badge de leader (${effect.side === 'gold' ? 'or' : 'argent'})`;
    case 'steal':
      return `Vole ${effect.amount} ${resourceFr(effect.resource)} à l'adversaire`;
    case 'influenceNeighbors':
      return `Influence ${signed(effect.amount)} sur un segment de ${effect.count} planètes contiguës`;
    case 'influenceDifferent':
      return `Influence ${signed(effect.amount)} sur une planète différente des précédentes`;
    case 'transfer':
      return `Transfère ${effect.count} carte(s) depuis la colonne adverse ${effect.from === 'corresponding' ? 'correspondante' : 'au choix'}${effect.thenInfluence ? ' puis +1 influence' : ''}`;
    case 'exile': {
      const zone = effect.side === 'self' ? 'de ta colonne' : 'de la colonne adverse';
      const which = effect.corresponding ? ' correspondante' : effect.color ? ` (${PLANET_FR[effect.color]})` : '';
      const except = effect.exceptColor ? ` (sauf ${PLANET_FR[effect.exceptColor]})` : '';
      return `Exile ${effect.count} carte(s) ${zone}${which}${except}${effect.thenInfluence ? ' puis +1 influence' : ''}`;
    }
    case 'exileForInfluence':
      return `Exile ${effect.count} carte(s) de ta colonne pour ${signed(effect.amount)} influence`;
    case 'discardHandAll':
      return 'Défausse toute ta main';
    case 'optional':
      return `optionnel: ${effect.effects.map(describeEffect).join(', ') || 'rien'}`;
    case 'bonusToken':
      return 'Pioche un jeton bonus';
    case 'conditional':
      return `si ${describeCondition(effect.cond)}: ${effect.effects.map(describeEffect).join(', ') || 'rien'}`;
    case 'choice':
      return `au choix: ${effect.options.map((opt) => opt.map(describeEffect).join(' + ') || 'rien').join(' | ') || 'aucune option'}`;
    case 'scale':
      return `échelle: ${
        effect.tiers
          .map((t) => `[${t.cost.map(describeEffect).join(', ') || 'gratuit'} → ${t.reward.map(describeEffect).join(', ') || 'rien'}]`)
          .join(' ; ') || 'aucun palier'
      }`;
    case 'creditsPerCardColors':
      return `+${effect.per} crédits par couleur de carte (${effect.zone === 'self' ? 'ta zone' : 'zone adverse'})`;
    case 'creditsPerTechLevels':
      return `Crédits selon niveaux techno atteints (paliers ${effect.tiers.join('/')})${effect.resource === 'zenithium' ? ' en zénithium' : ''}`;
    case 'giveOpponent':
      return `Donne ${effect.amount} ${resourceFr(effect.resource)} à l'adversaire`;
    case 'giveLeaderBadge':
      return 'Donne le badge de leader à l\'adversaire';
    case 'influenceChoiceExcept':
      return `Influence ${signed(effect.amount)} sur une planète au choix (sauf ${PLANET_FR[effect.exceptColor]})`;
    case 'influenceChoiceAtCenter':
      return `Influence ${signed(effect.amount)} sur une planète au centre`;
    case 'giveInfluenceOpponent':
      return `Donne ${signed(effect.amount)} influence à l'adversaire${effect.exceptColor ? ` (sauf ${PLANET_FR[effect.exceptColor]})` : ''}`;
    case 'moveDiscToCenter':
      return 'Ramène un disque vers le centre';
    case 'developDiscounted':
      return `Développe ${effect.which === 'cardPeople' ? 'le peuple de la carte' : 'un peuple au choix'} avec ${effect.discount} de remise`;
    case 'developLowest':
      return 'Développe le peuple le moins avancé';
    case 'discardHand':
      return `Défausse ${effect.count} carte(s) de ta main${effect.thenInfluence ? ' puis +1 influence' : ''}`;
    case 'creditsFromCardValue': {
      const src = effect.source === 'transfer' ? 'transférée' : effect.source === 'exileOpponent' ? 'exilée adverse' : 'défaussée';
      return `Gagne des crédits égaux à la valeur de la carte (${src})`;
    }
    case 'takeBoardBonusToken':
      return 'Prends un jeton bonus visible sur le plateau';
    default: {
      // Défensif : si un nouveau variant d'Effect est ajouté sans texte dédié, on le signale
      // plutôt que de planter silencieusement (never-check + fallback lisible).
      const _exhaustive: never = effect;
      return `effet inconnu: ${JSON.stringify(_exhaustive)}`;
    }
  }
}

/** Liste les libellés d'effets d'une carte du catalogue (vide si carte inconnue). */
export function describeCardEffects(cardId: string): string[] {
  const card = cardOf(cardId);
  if (!card) return [];
  return card.effects.map(describeEffect);
}

/**
 * Position du disque d'une planète depuis le centre, du point de vue de `viewer`.
 * discPos 0..8, centre=4 ; joueur 0 pousse vers 0, joueur 1 pousse vers 8.
 */
export function describePlanet(track: PlanetTrack, viewer: PlayerIndex): string {
  const dist = Math.abs(track.discPos - CENTER);
  let base: string;
  if (dist === 0) {
    base = 'centre';
  } else {
    const towardViewer = viewer === 0 ? track.discPos < CENTER : track.discPos > CENTER;
    base = `${towardViewer ? 'toi' : 'adversaire'} ×${dist}`;
  }
  const opponent: PlayerIndex = viewer === 0 ? 1 : 0;
  const capturedParts: string[] = [];
  if (track.captured[viewer] > 0) capturedParts.push(`toi ×${track.captured[viewer]}`);
  if (track.captured[opponent] > 0) capturedParts.push(`adversaire ×${track.captured[opponent]}`);
  return capturedParts.length === 0 ? base : `${base} — capturée ${capturedParts.join(', ')}`;
}
