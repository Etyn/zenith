import type { CardDef } from './types';

// Contenu réel — source : docs/content/cartes-mars.md + docs/content/lexique-icones.md.
// 1er effet toujours { influence, 1, planète }. give-* (giveOpponent/giveLeaderBadge/
// giveInfluenceOpponent) toujours enveloppés dans un optional (non-skippables sinon).
export const MARS_CARDS: CardDef[] = [
  {
    id: 'mars-bishop', name: 'Bishop', people: 'robot', planet: 'mars', cost: 4,
    effects: [
      { k: 'influence', amount: 1, on: 'mars' },
      { k: 'conditional', cond: { c: 'hasLeaderBadge' }, effects: [{ k: 'influence', amount: 1, on: 'mars' }] },
    ],
  },
  {
    // "voler 1 carte" = prendre une carte de la colonne adverse au choix → transfer(choice).
    id: 'mars-caligula', name: 'Caligula', people: 'animod', planet: 'mars', cost: 5,
    effects: [
      { k: 'influence', amount: 1, on: 'mars' },
      { k: 'transfer', count: 1, from: 'choice' },
      { k: 'influence', amount: 1, on: 'choice' },
    ],
  },
  {
    id: 'mars-ramses', name: 'Ramses', people: 'animod', planet: 'mars', cost: 3,
    effects: [
      { k: 'influence', amount: 1, on: 'mars' },
      { k: 'choice', options: [[{ k: 'transfer', count: 2, from: 'choice' }], [{ k: 'credits', amount: 8, target: 'self' }]] },
    ],
  },
  {
    // TODO(rules): "≠ Mars" côté adversaire non exprimable — giveInfluenceOpponent sans exclusion. Mineur.
    id: 'mars-titus', name: 'Titus', people: 'animod', planet: 'mars', cost: 1,
    effects: [
      { k: 'influence', amount: 1, on: 'mars' },
      { k: 'optional', effects: [{ k: 'giveInfluenceOpponent', amount: 1 }, { k: 'credits', amount: 10, target: 'self' }] },
    ],
  },
  {
    id: 'mars-w4tson', name: 'W4tson', people: 'robot', planet: 'mars', cost: 1,
    effects: [
      { k: 'influence', amount: 1, on: 'mars' },
      { k: 'mobilize', count: 1, thenInfluence: false },
      { k: 'credits', amount: 5, target: 'self' },
    ],
  },
  {
    id: 'mars-caesar', name: 'Caesar', people: 'animod', planet: 'mars', cost: 2,
    effects: [
      { k: 'influence', amount: 1, on: 'mars' },
      { k: 'choice', options: [[{ k: 'zenithium', amount: 1, target: 'self' }], [{ k: 'credits', amount: 7, target: 'self' }]] },
    ],
  },
  {
    id: 'mars-v4nc3', name: 'V4nc3', people: 'robot', planet: 'mars', cost: 2,
    effects: [
      { k: 'influence', amount: 1, on: 'mars' },
      { k: 'choice', options: [[{ k: 'transfer', count: 1, from: 'choice' }], [{ k: 'zenithium', amount: 1, target: 'self' }]] },
    ],
  },
  {
    // TODO(rules): la silhouette "mobiliser vers la colonne ADVERSE" n'est pas exprimable
    // (mobilize place toujours dans SA colonne). Encodé en mobilize normal + transfer(choice) pour "voler 1 carte".
    id: 'mars-charlize-gun', name: 'Charlize Gun', people: 'humain', planet: 'mars', cost: 4,
    effects: [
      { k: 'influence', amount: 1, on: 'mars' },
      { k: 'mobilize', count: 1, thenInfluence: false },
      { k: 'transfer', count: 1, from: 'choice' },
    ],
  },
  {
    id: 'mars-domitian', name: 'Domitian', people: 'animod', planet: 'mars', cost: 9,
    effects: [
      { k: 'influence', amount: 1, on: 'mars' },
      { k: 'mobilize', count: 3, thenInfluence: false },
    ],
  },
  {
    id: 'mars-robinson', name: 'Røbinsøn', people: 'robot', planet: 'mars', cost: 2,
    effects: [
      { k: 'influence', amount: 1, on: 'mars' },
      { k: 'scale', tiers: [
        { cost: [{ k: 'exile', side: 'self', count: 2, corresponding: true }], reward: [{ k: 'zenithium', amount: 2, target: 'self' }] },
        { cost: [{ k: 'exile', side: 'self', count: 4, corresponding: true }], reward: [{ k: 'zenithium', amount: 4, target: 'self' }] },
        { cost: [{ k: 'exile', side: 'self', count: 7, corresponding: true }], reward: [{ k: 'zenithium', amount: 7, target: 'self' }] },
      ] },
    ],
  },
  {
    id: 'mars-septimius', name: 'Septimius', people: 'animod', planet: 'mars', cost: 3,
    effects: [
      { k: 'influence', amount: 1, on: 'mars' },
      { k: 'scale', tiers: [
        { cost: [{ k: 'exile', side: 'self', count: 2, corresponding: true }], reward: [{ k: 'influence', amount: 1, on: 'mars' }] },
        { cost: [{ k: 'exile', side: 'self', count: 4, corresponding: true }], reward: [{ k: 'influence', amount: 2, on: 'mars' }] },
        { cost: [{ k: 'exile', side: 'self', count: 7, corresponding: true }], reward: [{ k: 'influence', amount: 3, on: 'mars' }] },
      ] },
    ],
  },
  {
    id: 'mars-little-bob', name: 'Little Bob', people: 'humain', planet: 'mars', cost: 3,
    effects: [
      { k: 'influence', amount: 1, on: 'mars' },
      { k: 'influenceChoiceExcept', exceptColor: 'mars', amount: 1 },
    ],
  },
  {
    id: 'mars-don-dune', name: 'Don Dune', people: 'humain', planet: 'mars', cost: 6,
    effects: [
      { k: 'influence', amount: 1, on: 'mars' },
      { k: 'influence', amount: 1, on: 'venus' },
      { k: 'takeLeader', side: 'silver' },
    ],
  },
  {
    id: 'mars-jack-curry', name: 'Jack Curry', people: 'humain', planet: 'mars', cost: 1,
    effects: [
      { k: 'influence', amount: 1, on: 'mars' },
      { k: 'credits', amount: 4, target: 'self' },
      { k: 'optional', effects: [{ k: 'giveOpponent', resource: 'zenithium', amount: 1 }, { k: 'influence', amount: 1, on: 'mercure' }] },
    ],
  },
  {
    id: 'mars-4nd3rs0n', name: '4nd3rs0n', people: 'robot', planet: 'mars', cost: 6,
    effects: [
      { k: 'influence', amount: 1, on: 'mars' },
      { k: 'influence', amount: 1, on: 'choice' },
    ],
  },
  {
    id: 'mars-mc4ffr3y', name: 'Mc4ffr3y', people: 'robot', planet: 'mars', cost: 4,
    effects: [
      { k: 'influence', amount: 1, on: 'mars' },
      { k: 'zenithium', amount: 2, target: 'self' },
    ],
  },
  {
    id: 'mars-handy-luke', name: 'Handy Luke', people: 'humain', planet: 'mars', cost: 4,
    effects: [
      { k: 'influence', amount: 1, on: 'mars' },
      { k: 'takeBoardBonusToken' },
    ],
  },
  {
    // TODO(rules): "exiler 3 cartes de la MAIN adverse → +1 influence sur la couleur de chaque carte exilée"
    // non exprimable (exile opère sur les colonnes, pas la main adverse ; influence par couleur de carte inconnue).
    // Transcrit avec le seul 1er effet en attendant l'arbitrage utilisateur / un atome dédié.
    id: 'mars-lady-moore', name: 'Lady Moore', people: 'humain', planet: 'mars', cost: 10,
    effects: [
      { k: 'influence', amount: 1, on: 'mars' },
    ],
  },
];

export const MERCURE_CARDS: CardDef[] = [
  { id: 'mercure-guy-gambler', name: 'Guy Gambler', people: 'humain', planet: 'mercure', cost: 3,
    effects: [
      { k: 'influence', amount: 1, on: 'mercure' },
      { k: 'credits', amount: 5, target: 'self' },
      { k: 'conditional', cond: { c: 'hasLeaderBadge' }, effects: [{ k: 'bonusToken' }] },
    ] },
  { id: 'mercure-nero', name: 'Nero', people: 'animod', planet: 'mercure', cost: 7,
    effects: [
      { k: 'influence', amount: 1, on: 'mercure' },
      { k: 'zenithium', amount: 3, target: 'self' },
    ] },
  { id: 'mercure-orwell', name: 'Orwell', people: 'robot', planet: 'mercure', cost: 1,
    effects: [
      { k: 'influence', amount: 1, on: 'mercure' },
      { k: 'bonusToken' },
      { k: 'optional', effects: [{ k: 'giveLeaderBadge' }, { k: 'credits', amount: 7, target: 'self' }] },
    ] },
  { id: 'mercure-huxley', name: 'Huxley', people: 'robot', planet: 'mercure', cost: 5,
    effects: [
      { k: 'influence', amount: 1, on: 'mercure' },
      { k: 'influence', amount: 1, on: 'choice' },
      { k: 'conditional', cond: { c: 'hasLeaderBadge' }, effects: [{ k: 'credits', amount: 3, target: 'self' }] },
    ] },
  { id: 'mercure-master-din', name: 'Master Din', people: 'humain', planet: 'mercure', cost: 6,
    effects: [
      { k: 'influence', amount: 1, on: 'mercure' },
      { k: 'influence', amount: 1, on: 'mars' },
      { k: 'takeLeader', side: 'silver' },
    ] },
  { id: 'mercure-atlas', name: 'Atlas', people: 'animod', planet: 'mercure', cost: 3,
    effects: [
      { k: 'influence', amount: 1, on: 'mercure' },
      { k: 'exile', side: 'opponent', count: 1 },
      { k: 'takeLeader', side: 'silver' },
    ] },
  { id: 'mercure-w3lls', name: 'W3lls', people: 'robot', planet: 'mercure', cost: 4,
    effects: [
      { k: 'influence', amount: 1, on: 'mercure' },
      { k: 'conditional', cond: { c: 'hasLeaderBadge' }, effects: [{ k: 'influence', amount: 1, on: 'mercure' }] },
    ] },
  { id: 'mercure-khan', name: 'Khan', people: 'animod', planet: 'mercure', cost: 9,
    effects: [
      { k: 'influence', amount: 1, on: 'mercure' },
      { k: 'influence', amount: 1, on: 'choice' },
      { k: 'optional', effects: [{ k: 'giveLeaderBadge' }, { k: 'influenceDifferent', amount: 1 }] },
    ] },
  { id: 'mercure-wul', name: 'Wul', people: 'robot', planet: 'mercure', cost: 2,
    effects: [
      { k: 'influence', amount: 1, on: 'mercure' },
      { k: 'scale', tiers: [
        { cost: [{ k: 'exile', side: 'self', count: 2, corresponding: true }], reward: [{ k: 'zenithium', amount: 2, target: 'self' }] },
        { cost: [{ k: 'exile', side: 'self', count: 4, corresponding: true }], reward: [{ k: 'zenithium', amount: 4, target: 'self' }] },
        { cost: [{ k: 'exile', side: 'self', count: 7, corresponding: true }], reward: [{ k: 'zenithium', amount: 7, target: 'self' }] },
      ] },
    ] },
  { id: 'mercure-secret-kali', name: 'Secret Kali', people: 'humain', planet: 'mercure', cost: 2,
    effects: [
      { k: 'influence', amount: 1, on: 'mercure' },
      { k: 'optional', effects: [{ k: 'giveOpponent', resource: 'credits', amount: 3 }, { k: 'influenceChoiceExcept', exceptColor: 'mercure', amount: 1 }] },
    ] },
  { id: 'mercure-h4milton', name: 'H4miltøn', people: 'robot', planet: 'mercure', cost: 2,
    effects: [
      { k: 'influence', amount: 1, on: 'mercure' },
      { k: 'mobilize', count: 2, thenInfluence: false },
      { k: 'optional', effects: [{ k: 'giveLeaderBadge' }, { k: 'mobilize', count: 3, thenInfluence: false }] },
    ] },
  { id: 'mercure-double-joe', name: 'Double Joe', people: 'humain', planet: 'mercure', cost: 5,
    effects: [
      { k: 'influence', amount: 1, on: 'mercure' },
      { k: 'zenithium', amount: 2, target: 'self' },
      { k: 'optional', effects: [{ k: 'giveLeaderBadge' }, { k: 'zenithium', amount: 2, target: 'self' }] },
    ] },
  { // TODO(rules): "exiler 2 cartes ≠ Mercure" — l'exclusion de couleur n'est pas supportée par l'atome exile (choix libre). Mineur.
    id: 'mercure-chaka', name: 'Chaka', people: 'animod', planet: 'mercure', cost: 1,
    effects: [
      { k: 'influence', amount: 1, on: 'mercure' },
      { k: 'optional', effects: [{ k: 'exile', side: 'self', count: 2 }, { k: 'credits', amount: 10, target: 'self' }] },
    ] },
  { id: 'mercure-magellan', name: 'Magellan', people: 'animod', planet: 'mercure', cost: 10,
    effects: [
      { k: 'influence', amount: 1, on: 'mercure' },
      { k: 'influence', amount: 1, on: 'choice' },
      { k: 'influenceDifferent', amount: 1 },
      { k: 'influenceEach', amount: 1 },
    ] },
  { id: 'mercure-lula-smart', name: 'Lula Smart', people: 'humain', planet: 'mercure', cost: 1,
    effects: [
      { k: 'influence', amount: 1, on: 'mercure' },
      { k: 'credits', amount: 4, target: 'self' },
      { k: 'optional', effects: [{ k: 'giveOpponent', resource: 'zenithium', amount: 1 }, { k: 'influence', amount: 1, on: 'terra' }] },
    ] },
  { id: 'mercure-amytis', name: 'Amytis', people: 'animod', planet: 'mercure', cost: 3,
    effects: [
      { k: 'influence', amount: 1, on: 'mercure' },
      { k: 'scale', tiers: [
        { cost: [{ k: 'exile', side: 'self', count: 2, corresponding: true }], reward: [{ k: 'influence', amount: 1, on: 'mercure' }] },
        { cost: [{ k: 'exile', side: 'self', count: 4, corresponding: true }], reward: [{ k: 'influence', amount: 2, on: 'mercure' }] },
        { cost: [{ k: 'exile', side: 'self', count: 7, corresponding: true }], reward: [{ k: 'influence', amount: 3, on: 'mercure' }] },
      ] },
    ] },
  { id: 'mercure-cl4rke', name: 'Cl4rke', people: 'robot', planet: 'mercure', cost: 9,
    effects: [
      { k: 'influence', amount: 1, on: 'mercure' },
      { k: 'influence', amount: 1, on: 'choice' },
      { k: 'optional', effects: [{ k: 'giveOpponent', resource: 'zenithium', amount: 1 }, { k: 'influenceDifferent', amount: 1 }] },
    ] },
  { id: 'mercure-punk-mari', name: 'Punk Mari', people: 'humain', planet: 'mercure', cost: 7,
    effects: [
      { k: 'influence', amount: 1, on: 'mercure' },
      { k: 'discardHandAll' },
      { k: 'influence', amount: 1, on: 'choice' },
    ] },
];

export const VENUS_CARDS: CardDef[] = [
  { id: 'venus-hiroshi-sun', name: 'Hiroshi Sun', people: 'humain', planet: 'venus', cost: 1,
    effects: [
      { k: 'influence', amount: 1, on: 'venus' },
      { k: 'credits', amount: 4, target: 'self' },
      { k: 'optional', effects: [{ k: 'giveOpponent', resource: 'zenithium', amount: 1 }, { k: 'influence', amount: 1, on: 'mars' }] },
    ] },
  { id: 'venus-geronimo', name: 'Geronimo', people: 'animod', planet: 'venus', cost: 2,
    effects: [
      { k: 'influence', amount: 1, on: 'venus' },
      { k: 'creditsPerCardColors', zone: 'self', per: 2 },
    ] },
  { id: 'venus-luc4s', name: 'Luc4s', people: 'robot', planet: 'venus', cost: 2,
    effects: [
      { k: 'influence', amount: 1, on: 'venus' },
      { k: 'scale', tiers: [
        { cost: [{ k: 'exile', side: 'self', count: 2, corresponding: true }], reward: [{ k: 'zenithium', amount: 2, target: 'self' }] },
        { cost: [{ k: 'exile', side: 'self', count: 4, corresponding: true }], reward: [{ k: 'zenithium', amount: 4, target: 'self' }] },
        { cost: [{ k: 'exile', side: 'self', count: 7, corresponding: true }], reward: [{ k: 'zenithium', amount: 7, target: 'self' }] },
      ] },
    ] },
  { id: 'venus-as1mov', name: 'As1møv', people: 'robot', planet: 'venus', cost: 10,
    effects: [
      { k: 'influence', amount: 1, on: 'venus' },
      { k: 'optional', effects: [{ k: 'developDiscounted', which: 'choice', discount: 2 }] },
    ] },
  { id: 'venus-c1x1n', name: 'C1x1n', people: 'robot', planet: 'venus', cost: 4,
    effects: [
      { k: 'influence', amount: 1, on: 'venus' },
      { k: 'conditional', cond: { c: 'hasLeaderBadge' }, effects: [{ k: 'influence', amount: 1, on: 'venus' }] },
    ] },
  { id: 'venus-felis', name: 'Felis', people: 'animod', planet: 'venus', cost: 3,
    effects: [
      { k: 'influence', amount: 1, on: 'venus' },
      { k: 'zenithium', amount: 3, target: 'self' },
      { k: 'zenithium', amount: 1, target: 'opponent' },
    ] },
  { id: 'venus-moussa', name: 'Moussa', people: 'animod', planet: 'venus', cost: 2,
    effects: [
      { k: 'influence', amount: 1, on: 'venus' },
      { k: 'scale', tiers: [
        { cost: [{ k: 'zenithium', amount: -1, target: 'self' }], reward: [{ k: 'credits', amount: 4, target: 'self' }] },
        { cost: [{ k: 'zenithium', amount: -2, target: 'self' }], reward: [{ k: 'credits', amount: 8, target: 'self' }] },
        { cost: [{ k: 'zenithium', amount: -3, target: 'self' }], reward: [{ k: 'credits', amount: 12, target: 'self' }] },
      ] },
    ] },
  { id: 'venus-v4n-vogt', name: 'V4n Vøgt', people: 'robot', planet: 'venus', cost: 6,
    effects: [
      { k: 'influence', amount: 1, on: 'venus' },
      { k: 'zenithium', amount: 2, target: 'opponent' },
    ] },
  { id: 'venus-stessy-power', name: 'Stessy Power', people: 'humain', planet: 'venus', cost: 3,
    effects: [
      { k: 'influence', amount: 1, on: 'venus' },
      { k: 'scale', tiers: [
        { cost: [{ k: 'zenithium', amount: -1, target: 'self' }], reward: [{ k: 'influenceChoiceExcept', exceptColor: 'venus', amount: 1 }] },
        { cost: [{ k: 'zenithium', amount: -2, target: 'self' }], reward: [{ k: 'influenceChoiceExcept', exceptColor: 'venus', amount: 2 }] },
        { cost: [{ k: 'zenithium', amount: -4, target: 'self' }], reward: [{ k: 'influenceChoiceExcept', exceptColor: 'venus', amount: 3 }] },
      ] },
    ] },
  { id: 'venus-br4dbury', name: 'Br4dbury', people: 'robot', planet: 'venus', cost: 6,
    effects: [
      { k: 'influence', amount: 1, on: 'venus' },
      { k: 'optional', effects: [{ k: 'developDiscounted', which: 'cardPeople', discount: 1 }] },
    ] },
  { id: 'venus-doc-wissen', name: 'Doc Wissen', people: 'humain', planet: 'venus', cost: 6,
    effects: [
      { k: 'influence', amount: 1, on: 'venus' },
      { k: 'optional', effects: [{ k: 'developDiscounted', which: 'cardPeople', discount: 1 }] },
    ] },
  { id: 'venus-cresus', name: 'Cresus', people: 'animod', planet: 'venus', cost: 1,
    effects: [
      { k: 'influence', amount: 1, on: 'venus' },
      { k: 'credits', amount: 6, target: 'self' },
    ] },
  { id: 'venus-pachacuti', name: 'Pachacuti', people: 'animod', planet: 'venus', cost: 3,
    effects: [
      { k: 'influence', amount: 1, on: 'venus' },
      { k: 'scale', tiers: [
        { cost: [{ k: 'exile', side: 'self', count: 2, corresponding: true }], reward: [{ k: 'influence', amount: 1, on: 'venus' }] },
        { cost: [{ k: 'exile', side: 'self', count: 4, corresponding: true }], reward: [{ k: 'influence', amount: 2, on: 'venus' }] },
        { cost: [{ k: 'exile', side: 'self', count: 7, corresponding: true }], reward: [{ k: 'influence', amount: 3, on: 'venus' }] },
      ] },
    ] },
  { // TODO(rules): "gagner du ZÉNITHIUM selon le nb de technos ≥ niv.1" non exprimable :
    // creditsPerTechLevels donne des CRÉDITS, pas du zénithium ; aucun atome zenithiumPerTechLevels.
    // Montant exact de la récompense également à confirmer (feuille). Transcrit avec le seul 1er effet.
    id: 'venus-ilda-flores', name: 'Ilda Flores', people: 'humain', planet: 'venus', cost: 1,
    effects: [
      { k: 'influence', amount: 1, on: 'venus' },
    ] },
  { id: 'venus-professor-zed', name: 'Professor Zed', people: 'humain', planet: 'venus', cost: 9,
    effects: [
      { k: 'influence', amount: 1, on: 'venus' },
      { k: 'zenithium', amount: 4, target: 'self' },
    ] },
  { id: 'venus-king-harold', name: 'King Harold', people: 'humain', planet: 'venus', cost: 6,
    effects: [
      { k: 'influence', amount: 1, on: 'venus' },
      { k: 'influence', amount: 1, on: 'terra' },
      { k: 'takeLeader', side: 'silver' },
    ] },
  { id: 'venus-bujold', name: 'Bujøld', people: 'robot', planet: 'venus', cost: 7,
    effects: [
      { k: 'influence', amount: 1, on: 'venus' },
      { k: 'optional', effects: [{ k: 'developLowest' }] },
    ] },
  { id: 'venus-archimedes', name: 'Archimedes', people: 'animod', planet: 'venus', cost: 6,
    effects: [
      { k: 'influence', amount: 1, on: 'venus' },
      { k: 'optional', effects: [{ k: 'developDiscounted', which: 'cardPeople', discount: 1 }] },
    ] },
];

export const CARDS: CardDef[] = [...MARS_CARDS, ...MERCURE_CARDS, ...VENUS_CARDS];
