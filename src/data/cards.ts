import type { CardDef } from './types';

// Contenu réel — source : docs/content/cartes-mars.md + docs/content/lexique-icones.md.
// 1er effet toujours { influence, 1, planète }. give-* (giveOpponent/giveLeaderBadge/
// giveInfluenceOpponent) toujours enveloppés dans un optional (non-skippables sinon).
export const MARS_CARDS: CardDef[] = [
  {
    id: 'mars-bishop', scan: '22.44_6', name: 'Bishop', people: 'robot', planet: 'mars', cost: 4,
    effects: [
      { k: 'influence', amount: 1, on: 'mars' },
      { k: 'conditional', cond: { c: 'hasLeaderBadge' }, effects: [{ k: 'influence', amount: 1, on: 'mars' }] },
    ],
  },
  {
    // "voler 1 carte" = prendre une carte de la colonne adverse au choix → transfer(choice).
    id: 'mars-caligula', scan: '22.44_7', name: 'Caligula', people: 'animod', planet: 'mars', cost: 5,
    effects: [
      { k: 'influence', amount: 1, on: 'mars' },
      { k: 'transfer', count: 1, from: 'choice' },
      { k: 'influence', amount: 1, on: 'choice' },
    ],
  },
  {
    id: 'mars-ramses', scan: '22.44_11', name: 'Ramses', people: 'animod', planet: 'mars', cost: 3,
    effects: [
      { k: 'influence', amount: 1, on: 'mars' },
      { k: 'choice', options: [[{ k: 'transfer', count: 2, from: 'choice' }], [{ k: 'credits', amount: 8, target: 'self' }]] },
    ],
  },
  {
    id: 'mars-titus', scan: '22.44_14', name: 'Titus', people: 'animod', planet: 'mars', cost: 1,
    effects: [
      { k: 'influence', amount: 1, on: 'mars' },
      { k: 'optional', effects: [{ k: 'giveInfluenceOpponent', amount: 1, exceptColor: 'mars' }, { k: 'credits', amount: 10, target: 'self' }] },
    ],
  },
  {
    id: 'mars-w4tson', scan: '22.44_15', name: 'W4tson', people: 'robot', planet: 'mars', cost: 1,
    effects: [
      { k: 'influence', amount: 1, on: 'mars' },
      { k: 'mobilize', count: 1, thenInfluence: false },
      { k: 'credits', amount: 5, target: 'self' },
    ],
  },
  {
    id: 'mars-caesar', scan: '23.02_2', name: 'Caesar', people: 'animod', planet: 'mars', cost: 2,
    effects: [
      { k: 'influence', amount: 1, on: 'mars' },
      { k: 'choice', options: [[{ k: 'zenithium', amount: 1, target: 'self' }], [{ k: 'credits', amount: 7, target: 'self' }]] },
    ],
  },
  {
    id: 'mars-v4nc3', scan: '23.02_3', name: 'V4nc3', people: 'robot', planet: 'mars', cost: 2,
    effects: [
      { k: 'influence', amount: 1, on: 'mars' },
      { k: 'choice', options: [[{ k: 'transfer', count: 1, from: 'choice' }], [{ k: 'zenithium', amount: 1, target: 'self' }]] },
    ],
  },
  {
    // Clarifié (cf. cartes-todo.md, scan 23.02_5) : mobiliser 1 + transférer 1 + exiler 1 agent adverse.
    id: 'mars-charlize-gun', scan: '23.02_5', name: 'Charlize Gun', people: 'humain', planet: 'mars', cost: 4,
    effects: [
      { k: 'influence', amount: 1, on: 'mars' },
      { k: 'mobilize', count: 1, thenInfluence: false },
      { k: 'transfer', count: 1, from: 'choice' },
      { k: 'exile', side: 'opponent', count: 1 },
    ],
  },
  {
    id: 'mars-domitian', scan: '23.02_11', name: 'Domitian', people: 'animod', planet: 'mars', cost: 9,
    effects: [
      { k: 'influence', amount: 1, on: 'mars' },
      { k: 'mobilize', count: 3, thenInfluence: false },
    ],
  },
  {
    id: 'mars-robinson', scan: '23.02_14', name: 'Røbinsøn', people: 'robot', planet: 'mars', cost: 2,
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
    id: 'mars-septimius', scan: '23.02_17', name: 'Septimius', people: 'animod', planet: 'mars', cost: 3,
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
    id: 'mars-little-bob', scan: '23.02_21', name: 'Little Bob', people: 'humain', planet: 'mars', cost: 3,
    effects: [
      { k: 'influence', amount: 1, on: 'mars' },
      { k: 'influenceChoiceExcept', exceptColor: 'mars', amount: 1 },
    ],
  },
  {
    id: 'mars-don-dune', scan: '23.02_22', name: 'Don Dune', people: 'humain', planet: 'mars', cost: 6,
    effects: [
      { k: 'influence', amount: 1, on: 'mars' },
      { k: 'influence', amount: 1, on: 'venus' },
      { k: 'takeLeader', side: 'silver' },
    ],
  },
  {
    id: 'mars-jack-curry', scan: '23.02_42', name: 'Jack Curry', people: 'humain', planet: 'mars', cost: 1,
    effects: [
      { k: 'influence', amount: 1, on: 'mars' },
      { k: 'credits', amount: 4, target: 'self' },
      { k: 'optional', effects: [{ k: 'giveOpponent', resource: 'zenithium', amount: 1 }, { k: 'influence', amount: 1, on: 'mercure' }] },
    ],
  },
  {
    id: 'mars-4nd3rs0n', scan: '23.02_45', name: '4nd3rs0n', people: 'robot', planet: 'mars', cost: 6,
    effects: [
      { k: 'influence', amount: 1, on: 'mars' },
      { k: 'influenceChoiceAtCenter', amount: 2 },
    ],
  },
  {
    id: 'mars-mc4ffr3y', scan: '23.02_50', name: 'Mc4ffr3y', people: 'robot', planet: 'mars', cost: 4,
    effects: [
      { k: 'influence', amount: 1, on: 'mars' },
      { k: 'zenithium', amount: 2, target: 'self' },
    ],
  },
  {
    id: 'mars-handy-luke', scan: '23.02_55', name: 'Handy Luke', people: 'humain', planet: 'mars', cost: 4,
    effects: [
      { k: 'influence', amount: 1, on: 'mars' },
      { k: 'takeBoardBonusToken' },
    ],
  },
  {
    // "exiler 3 cartes adverses → +1 influence sur la couleur de chaque carte exilée" :
    // exil des COLONNES adverses (cf. cartes-todo.md, règle de vocabulaire) ; thenInfluence
    // accorde +1 influence sur la couleur de chaque colonne exilée.
    id: 'mars-lady-moore', scan: '23.02_56', name: 'Lady Moore', people: 'humain', planet: 'mars', cost: 10,
    effects: [
      { k: 'influence', amount: 1, on: 'mars' },
      { k: 'exile', side: 'opponent', count: 3, thenInfluence: true },
    ],
  },
];

export const MERCURE_CARDS: CardDef[] = [
  { id: 'mercure-guy-gambler', scan: '22.44_2', name: 'Guy Gambler', people: 'humain', planet: 'mercure', cost: 3,
    effects: [
      { k: 'influence', amount: 1, on: 'mercure' },
      { k: 'credits', amount: 5, target: 'self' },
      { k: 'conditional', cond: { c: 'hasLeaderBadge' }, effects: [{ k: 'bonusToken' }] },
    ] },
  { id: 'mercure-nero', scan: '22.44_3', name: 'Nero', people: 'animod', planet: 'mercure', cost: 7,
    effects: [
      { k: 'influence', amount: 1, on: 'mercure' },
      { k: 'zenithium', amount: 3, target: 'self' },
    ] },
  { id: 'mercure-orwell', scan: '22.44_4', name: 'Orwell', people: 'robot', planet: 'mercure', cost: 1,
    effects: [
      { k: 'influence', amount: 1, on: 'mercure' },
      { k: 'bonusToken' },
      { k: 'optional', effects: [{ k: 'giveLeaderBadge' }, { k: 'credits', amount: 7, target: 'self' }] },
    ] },
  { id: 'mercure-huxley', scan: '22.44_8', name: 'Huxley', people: 'robot', planet: 'mercure', cost: 5,
    effects: [
      { k: 'influence', amount: 1, on: 'mercure' },
      { k: 'influence', amount: 1, on: 'choice' },
      { k: 'conditional', cond: { c: 'hasLeaderBadge' }, effects: [{ k: 'credits', amount: 3, target: 'self' }] },
    ] },
  { id: 'mercure-master-din', scan: '22.44_16', name: 'Master Din', people: 'humain', planet: 'mercure', cost: 6,
    effects: [
      { k: 'influence', amount: 1, on: 'mercure' },
      { k: 'influence', amount: 1, on: 'mars' },
      { k: 'takeLeader', side: 'silver' },
    ] },
  { id: 'mercure-atlas', scan: '22.44_18', name: 'Atlas', people: 'animod', planet: 'mercure', cost: 3,
    effects: [
      { k: 'influence', amount: 1, on: 'mercure' },
      { k: 'exile', side: 'opponent', count: 1 },
      { k: 'takeLeader', side: 'silver' },
    ] },
  { id: 'mercure-w3lls', scan: '22.44_20', name: 'W3lls', people: 'robot', planet: 'mercure', cost: 4,
    effects: [
      { k: 'influence', amount: 1, on: 'mercure' },
      { k: 'conditional', cond: { c: 'hasLeaderBadge' }, effects: [{ k: 'influence', amount: 1, on: 'mercure' }] },
    ] },
  { id: 'mercure-khan', scan: '22.44_21', name: 'Khan', people: 'animod', planet: 'mercure', cost: 9,
    effects: [
      { k: 'influence', amount: 1, on: 'mercure' },
      { k: 'influence', amount: 1, on: 'choice' },
      { k: 'optional', effects: [{ k: 'giveLeaderBadge' }, { k: 'influenceDifferent', amount: 1 }] },
    ] },
  { id: 'mercure-wul', scan: '23.02_4', name: 'Wul', people: 'robot', planet: 'mercure', cost: 2,
    effects: [
      { k: 'influence', amount: 1, on: 'mercure' },
      { k: 'scale', tiers: [
        { cost: [{ k: 'exile', side: 'self', count: 2, corresponding: true }], reward: [{ k: 'zenithium', amount: 2, target: 'self' }] },
        { cost: [{ k: 'exile', side: 'self', count: 4, corresponding: true }], reward: [{ k: 'zenithium', amount: 4, target: 'self' }] },
        { cost: [{ k: 'exile', side: 'self', count: 7, corresponding: true }], reward: [{ k: 'zenithium', amount: 7, target: 'self' }] },
      ] },
    ] },
  { id: 'mercure-secret-kali', scan: '23.02_6', name: 'Secret Kali', people: 'humain', planet: 'mercure', cost: 2,
    effects: [
      { k: 'influence', amount: 1, on: 'mercure' },
      { k: 'optional', effects: [{ k: 'giveOpponent', resource: 'credits', amount: 3 }, { k: 'influenceChoiceExcept', exceptColor: 'mercure', amount: 1 }] },
    ] },
  { id: 'mercure-h4milton', scan: '23.02_9', name: 'H4miltøn', people: 'robot', planet: 'mercure', cost: 2,
    effects: [
      { k: 'influence', amount: 1, on: 'mercure' },
      { k: 'mobilize', count: 2, thenInfluence: false },
      { k: 'optional', effects: [{ k: 'giveLeaderBadge' }, { k: 'mobilize', count: 3, thenInfluence: false }] },
    ] },
  { id: 'mercure-double-joe', scan: '23.02_13', name: 'Double Joe', people: 'humain', planet: 'mercure', cost: 5,
    effects: [
      { k: 'influence', amount: 1, on: 'mercure' },
      { k: 'zenithium', amount: 2, target: 'self' },
      { k: 'optional', effects: [{ k: 'giveLeaderBadge' }, { k: 'zenithium', amount: 2, target: 'self' }] },
    ] },
  {
    id: 'mercure-chaka', scan: '23.02_16', name: 'Chaka', people: 'animod', planet: 'mercure', cost: 1,
    effects: [
      { k: 'influence', amount: 1, on: 'mercure' },
      { k: 'optional', effects: [{ k: 'exile', side: 'self', count: 2, exceptColor: 'mercure' }, { k: 'credits', amount: 10, target: 'self' }] },
    ] },
  { id: 'mercure-magellan', scan: '23.02_19', name: 'Magellan', people: 'animod', planet: 'mercure', cost: 10,
    effects: [
      { k: 'influence', amount: 1, on: 'mercure' },
      { k: 'influence', amount: 1, on: 'choice' },
      { k: 'influenceDifferent', amount: 1 },
      { k: 'influenceEach', amount: 1 },
    ] },
  { id: 'mercure-lula-smart', scan: '23.02_27', name: 'Lula Smart', people: 'humain', planet: 'mercure', cost: 1,
    effects: [
      { k: 'influence', amount: 1, on: 'mercure' },
      { k: 'credits', amount: 4, target: 'self' },
      { k: 'optional', effects: [{ k: 'giveOpponent', resource: 'zenithium', amount: 1 }, { k: 'influence', amount: 1, on: 'terra' }] },
    ] },
  { id: 'mercure-amytis', scan: '23.02_34', name: 'Amytis', people: 'animod', planet: 'mercure', cost: 3,
    effects: [
      { k: 'influence', amount: 1, on: 'mercure' },
      { k: 'scale', tiers: [
        { cost: [{ k: 'exile', side: 'self', count: 2, corresponding: true }], reward: [{ k: 'influence', amount: 1, on: 'mercure' }] },
        { cost: [{ k: 'exile', side: 'self', count: 4, corresponding: true }], reward: [{ k: 'influence', amount: 2, on: 'mercure' }] },
        { cost: [{ k: 'exile', side: 'self', count: 7, corresponding: true }], reward: [{ k: 'influence', amount: 3, on: 'mercure' }] },
      ] },
    ] },
  { id: 'mercure-cl4rke', scan: '23.02_36', name: 'Cl4rke', people: 'robot', planet: 'mercure', cost: 9,
    effects: [
      { k: 'influence', amount: 1, on: 'mercure' },
      { k: 'influence', amount: 1, on: 'choice' },
      { k: 'optional', effects: [{ k: 'giveOpponent', resource: 'zenithium', amount: 1 }, { k: 'influenceDifferent', amount: 1 }] },
    ] },
  { id: 'mercure-punk-mari', scan: '23.40_02', name: 'Punk Mari', people: 'humain', planet: 'mercure', cost: 7,
    effects: [
      { k: 'influence', amount: 1, on: 'mercure' },
      { k: 'discardHandAll' },
      { k: 'influence', amount: 1, on: 'choice' },
    ] },
];

export const VENUS_CARDS: CardDef[] = [
  { id: 'venus-hiroshi-sun', scan: '22.44_5', name: 'Hiroshi Sun', people: 'humain', planet: 'venus', cost: 1,
    effects: [
      { k: 'influence', amount: 1, on: 'venus' },
      { k: 'credits', amount: 4, target: 'self' },
      { k: 'optional', effects: [{ k: 'giveOpponent', resource: 'zenithium', amount: 1 }, { k: 'influence', amount: 1, on: 'mars' }] },
    ] },
  { id: 'venus-geronimo', scan: '22.44_12', name: 'Geronimo', people: 'animod', planet: 'venus', cost: 2,
    effects: [
      { k: 'influence', amount: 1, on: 'venus' },
      { k: 'creditsPerCardColors', zone: 'self', per: 2 },
    ] },
  { id: 'venus-luc4s', scan: '22.44_17', name: 'Luc4s', people: 'robot', planet: 'venus', cost: 2,
    effects: [
      { k: 'influence', amount: 1, on: 'venus' },
      { k: 'scale', tiers: [
        { cost: [{ k: 'exile', side: 'self', count: 2, corresponding: true }], reward: [{ k: 'zenithium', amount: 2, target: 'self' }] },
        { cost: [{ k: 'exile', side: 'self', count: 4, corresponding: true }], reward: [{ k: 'zenithium', amount: 4, target: 'self' }] },
        { cost: [{ k: 'exile', side: 'self', count: 7, corresponding: true }], reward: [{ k: 'zenithium', amount: 7, target: 'self' }] },
      ] },
    ] },
  { id: 'venus-as1mov', scan: '22.44_23', name: 'As1møv', people: 'robot', planet: 'venus', cost: 10,
    effects: [
      { k: 'influence', amount: 1, on: 'venus' },
      { k: 'optional', effects: [{ k: 'developDiscounted', which: 'choice', discount: 2 }] },
    ] },
  { id: 'venus-c1x1n', scan: '22.44_24', name: 'C1x1n', people: 'robot', planet: 'venus', cost: 4,
    effects: [
      { k: 'influence', amount: 1, on: 'venus' },
      { k: 'conditional', cond: { c: 'hasLeaderBadge' }, effects: [{ k: 'influence', amount: 1, on: 'venus' }] },
    ] },
  { id: 'venus-felis', scan: '22.44_25', name: 'Felis', people: 'animod', planet: 'venus', cost: 3,
    effects: [
      { k: 'influence', amount: 1, on: 'venus' },
      { k: 'zenithium', amount: 3, target: 'self' },
      { k: 'zenithium', amount: 1, target: 'opponent' },
    ] },
  { id: 'venus-moussa', scan: '23.02_8', name: 'Moussa', people: 'animod', planet: 'venus', cost: 2,
    effects: [
      { k: 'influence', amount: 1, on: 'venus' },
      { k: 'scale', tiers: [
        { cost: [{ k: 'spend', resource: 'zenithium', amount: 1 }], reward: [{ k: 'credits', amount: 4, target: 'self' }] },
        { cost: [{ k: 'spend', resource: 'zenithium', amount: 2 }], reward: [{ k: 'credits', amount: 8, target: 'self' }] },
        { cost: [{ k: 'spend', resource: 'zenithium', amount: 3 }], reward: [{ k: 'credits', amount: 12, target: 'self' }] },
      ] },
    ] },
  { id: 'venus-v4n-vogt', scan: '23.02_12', name: 'V4n Vøgt', people: 'robot', planet: 'venus', cost: 6,
    effects: [
      { k: 'influence', amount: 1, on: 'venus' },
      { k: 'zenithium', amount: 2, target: 'opponent' },
    ] },
  { id: 'venus-stessy-power', scan: '23.02_28', name: 'Stessy Power', people: 'humain', planet: 'venus', cost: 3,
    effects: [
      { k: 'influence', amount: 1, on: 'venus' },
      { k: 'scale', tiers: [
        { cost: [{ k: 'spend', resource: 'zenithium', amount: 1 }], reward: [{ k: 'influenceChoiceExcept', exceptColor: 'venus', amount: 1 }] },
        { cost: [{ k: 'spend', resource: 'zenithium', amount: 2 }], reward: [{ k: 'influenceChoiceExcept', exceptColor: 'venus', amount: 2 }] },
        { cost: [{ k: 'spend', resource: 'zenithium', amount: 4 }], reward: [{ k: 'influenceChoiceExcept', exceptColor: 'venus', amount: 3 }] },
      ] },
    ] },
  { id: 'venus-br4dbury', scan: '23.02_29', name: 'Br4dbury', people: 'robot', planet: 'venus', cost: 6,
    effects: [
      { k: 'influence', amount: 1, on: 'venus' },
      { k: 'optional', effects: [{ k: 'developDiscounted', which: 'cardPeople', discount: 1 }] },
    ] },
  { id: 'venus-doc-wissen', scan: '23.02_30', name: 'Doc Wissen', people: 'humain', planet: 'venus', cost: 6,
    effects: [
      { k: 'influence', amount: 1, on: 'venus' },
      { k: 'optional', effects: [{ k: 'developDiscounted', which: 'cardPeople', discount: 1 }] },
    ] },
  { id: 'venus-cresus', scan: '23.02_31', name: 'Cresus', people: 'animod', planet: 'venus', cost: 1,
    effects: [
      { k: 'influence', amount: 1, on: 'venus' },
      { k: 'credits', amount: 6, target: 'self' },
    ] },
  { id: 'venus-pachacuti', scan: '23.02_32', name: 'Pachacuti', people: 'animod', planet: 'venus', cost: 3,
    effects: [
      { k: 'influence', amount: 1, on: 'venus' },
      { k: 'scale', tiers: [
        { cost: [{ k: 'exile', side: 'self', count: 2, corresponding: true }], reward: [{ k: 'influence', amount: 1, on: 'venus' }] },
        { cost: [{ k: 'exile', side: 'self', count: 4, corresponding: true }], reward: [{ k: 'influence', amount: 2, on: 'venus' }] },
        { cost: [{ k: 'exile', side: 'self', count: 7, corresponding: true }], reward: [{ k: 'influence', amount: 3, on: 'venus' }] },
      ] },
    ] },
  { // Zénithium selon le nb de technos >= niv.1 : facteur confirmé ; montant [1,2,3] = lecture "1x/2x/3x hexagone" (cartes-venus.md).
    id: 'venus-ilda-flores', scan: '23.02_33', name: 'Ilda Flores', people: 'humain', planet: 'venus', cost: 1,
    effects: [
      { k: 'influence', amount: 1, on: 'venus' },
      { k: 'creditsPerTechLevels', tiers: [1, 2, 3], resource: 'zenithium' },
    ] },
  { id: 'venus-professor-zed', scan: '23.02_35', name: 'Professor Zed', people: 'humain', planet: 'venus', cost: 9,
    effects: [
      { k: 'influence', amount: 1, on: 'venus' },
      { k: 'zenithium', amount: 4, target: 'self' },
    ] },
  { id: 'venus-king-harold', scan: '23.02_37', name: 'King Harold', people: 'humain', planet: 'venus', cost: 6,
    effects: [
      { k: 'influence', amount: 1, on: 'venus' },
      { k: 'influence', amount: 1, on: 'terra' },
      { k: 'takeLeader', side: 'silver' },
    ] },
  { id: 'venus-bujold', scan: '23.02_52', name: 'Bujøld', people: 'robot', planet: 'venus', cost: 7,
    effects: [
      { k: 'influence', amount: 1, on: 'venus' },
      { k: 'optional', effects: [{ k: 'developLowest' }] },
    ] },
  { id: 'venus-archimedes', scan: '23.02_58', name: 'Archimedes', people: 'animod', planet: 'venus', cost: 6,
    effects: [
      { k: 'influence', amount: 1, on: 'venus' },
      { k: 'optional', effects: [{ k: 'developDiscounted', which: 'cardPeople', discount: 1 }] },
    ] },
];

export const TERRA_CARDS: CardDef[] = [
  { id: 'terra-charlemagne', scan: '22.44_1', name: 'Charlemagne', people: 'animod', planet: 'terra', cost: 8,
    effects: [
      { k: 'influence', amount: 1, on: 'terra' },
      { k: 'influence', amount: 1, on: 'choice' },
      { k: 'influenceDifferent', amount: 1 },
      { k: 'influenceDifferent', amount: 1 },
    ] },
  { id: 'terra-v3rn3', scan: '22.44_13', name: 'V3rn3', people: 'robot', planet: 'terra', cost: 2,
    effects: [
      { k: 'influence', amount: 1, on: 'terra' },
      { k: 'scale', tiers: [
        { cost: [{ k: 'exile', side: 'self', count: 2, corresponding: true }], reward: [{ k: 'zenithium', amount: 2, target: 'self' }] },
        { cost: [{ k: 'exile', side: 'self', count: 4, corresponding: true }], reward: [{ k: 'zenithium', amount: 4, target: 'self' }] },
        { cost: [{ k: 'exile', side: 'self', count: 7, corresponding: true }], reward: [{ k: 'zenithium', amount: 7, target: 'self' }] },
      ] },
    ] },
  { id: 'terra-gilgamesh', scan: '22.44_19', name: 'Gilgamesh', people: 'animod', planet: 'terra', cost: 9,
    effects: [
      { k: 'influence', amount: 1, on: 'terra' },
      { k: 'influence', amount: 1, on: 'choice' },
      { k: 'influence', amount: 1, on: 'choice' },
    ] },
  { id: 'terra-brussolo', scan: '22.44_22', name: 'Brussoløc', people: 'robot', planet: 'terra', cost: 1,
    effects: [
      { k: 'influence', amount: 1, on: 'terra' },
      { k: 'zenithium', amount: 1, target: 'self' },
    ] },
  { id: 'terra-ice-june', scan: '22.44_26', name: 'Ice June', people: 'humain', planet: 'terra', cost: 4,
    effects: [
      { k: 'influence', amount: 1, on: 'terra' },
      { k: 'discardHand', count: 1, thenInfluence: true },
    ] },
  { id: 'terra-m4th3son', scan: '22.44_27', name: 'M4th3søn', people: 'robot', planet: 'terra', cost: 4,
    effects: [
      { k: 'influence', amount: 1, on: 'terra' },
      { k: 'conditional', cond: { c: 'hasLeaderBadge' }, effects: [{ k: 'influence', amount: 1, on: 'terra' }] },
    ] },
  { // effet 2 FACULTATIF (give-* enveloppé), effet 3 OBLIGATOIRE.
    id: 'terra-baron-goro', scan: '22.44_29', name: 'Baron Goro', people: 'humain', planet: 'terra', cost: 4,
    effects: [
      { k: 'influence', amount: 1, on: 'terra' },
      { k: 'optional', effects: [{ k: 'giveInfluenceOpponent', amount: 1, exceptColor: 'terra' }] },
      { k: 'zenithium', amount: 3, target: 'self' },
    ] },
  { id: 'terra-elisabeth', scan: '22.44_30', name: 'Elisabeth', people: 'animod', planet: 'terra', cost: 2,
    effects: [
      { k: 'influence', amount: 1, on: 'terra' },
      { k: 'exile', side: 'self', count: 1, corresponding: true },
      { k: 'zenithium', amount: 1, target: 'self' },
    ] },
  { id: 'terra-augustus', scan: '23.02_1', name: 'Augustus', people: 'animod', planet: 'terra', cost: 10,
    effects: [
      { k: 'influence', amount: 1, on: 'terra' },
      { k: 'influence', amount: 1, on: 'choice' },
      { k: 'influence', amount: 1, on: 'choice' },
      { k: 'influence', amount: 1, on: 'choice' },
    ] },
  { id: 'terra-sneaky-jules', scan: '23.02_23', name: 'Sneaky Jules', people: 'humain', planet: 'terra', cost: 1,
    effects: [
      { k: 'influence', amount: 1, on: 'terra' },
      { k: 'credits', amount: 4, target: 'self' },
      { k: 'optional', effects: [{ k: 'giveOpponent', resource: 'zenithium', amount: 1 }, { k: 'influenceChoiceAtCenter', amount: 2 }] },
    ] },
  { // "exiler 1 carte d'une couleur precise -> 1 zenithium", une fois par couleur (Mercure/Venus/Mars/Jupiter).
    id: 'terra-l0v3cr4ft', scan: '23.02_25', name: 'L0v3cr4ft', people: 'robot', planet: 'terra', cost: 5,
    effects: [
      { k: 'influence', amount: 1, on: 'terra' },
      { k: 'optional', effects: [{ k: 'exile', side: 'self', count: 1, color: 'mercure' }, { k: 'zenithium', amount: 1, target: 'self' }] },
      { k: 'optional', effects: [{ k: 'exile', side: 'self', count: 1, color: 'venus' }, { k: 'zenithium', amount: 1, target: 'self' }] },
      { k: 'optional', effects: [{ k: 'exile', side: 'self', count: 1, color: 'mars' }, { k: 'zenithium', amount: 1, target: 'self' }] },
      { k: 'optional', effects: [{ k: 'exile', side: 'self', count: 1, color: 'jupiter' }, { k: 'zenithium', amount: 1, target: 'self' }] },
    ] },
  { id: 'terra-zenon', scan: '23.02_43', name: 'Zenon', people: 'animod', planet: 'terra', cost: 1,
    effects: [
      { k: 'influence', amount: 1, on: 'terra' },
      { k: 'credits', amount: 8, target: 'self' },
      { k: 'credits', amount: 2, target: 'opponent' },
    ] },
  { id: 'terra-lord-creep', scan: '23.02_44', name: 'Lord Creep', people: 'humain', planet: 'terra', cost: 5,
    effects: [
      { k: 'influence', amount: 1, on: 'terra' },
      { k: 'influence', amount: 1, on: 'choice' },
      { k: 'takeLeader', side: 'silver' },
    ] },
  { // Planète de bandeau NON confirmée (classée Terra par défaut). 4 couleurs = Mercure/Venus/Mars/Jupiter.
    // "exiler 1 carte d'une couleur donnee -> +1 influence sur cette meme couleur" (thenInfluence : uniquement si une carte est exilee).
    id: 'terra-h3rb3rt', scan: '23.02_46', name: 'H3rb3rt', people: 'robot', planet: 'terra', cost: 6,
    effects: [
      { k: 'influence', amount: 1, on: 'terra' },
      { k: 'optional', effects: [{ k: 'exile', side: 'self', count: 1, color: 'mercure', thenInfluence: true }] },
      { k: 'optional', effects: [{ k: 'exile', side: 'self', count: 1, color: 'venus', thenInfluence: true }] },
      { k: 'optional', effects: [{ k: 'exile', side: 'self', count: 1, color: 'mars', thenInfluence: true }] },
      { k: 'optional', effects: [{ k: 'exile', side: 'self', count: 1, color: 'jupiter', thenInfluence: true }] },
    ] },
  { // Planète de bandeau NON confirmée (classée Terra par défaut).
    id: 'terra-sir-sam', scan: '23.02_47', name: 'Sir Sam', people: 'humain', planet: 'terra', cost: 7,
    effects: [
      { k: 'influence', amount: 1, on: 'terra' },
      { k: 'moveDiscToCenter' },
    ] },
  { // Planète de bandeau NON confirmée (classée Terra par défaut). exceptColor = couleur du bandeau (terra par défaut).
    id: 'terra-helena-kerr', scan: '23.02_49', name: 'Helena Kerr', people: 'humain', planet: 'terra', cost: 6,
    effects: [
      { k: 'influence', amount: 1, on: 'terra' },
      { k: 'influenceChoiceExcept', exceptColor: 'terra', amount: 1 },
    ] },
  { id: 'terra-f4rm3r', scan: '23.02_51', name: 'F4rm3r', people: 'robot', planet: 'terra', cost: 6,
    effects: [
      { k: 'influence', amount: 1, on: 'terra' },
      { k: 'influence', amount: 1, on: 'choice' },
      { k: 'influenceDifferent', amount: 1 },
    ] },
  { id: 'terra-tiberius', scan: '23.02_54', name: 'Tiberius', people: 'animod', planet: 'terra', cost: 3,
    effects: [
      { k: 'influence', amount: 1, on: 'terra' },
      { k: 'scale', tiers: [
        { cost: [{ k: 'exile', side: 'self', count: 2, corresponding: true }], reward: [{ k: 'influence', amount: 1, on: 'terra' }] },
        { cost: [{ k: 'exile', side: 'self', count: 4, corresponding: true }], reward: [{ k: 'influence', amount: 2, on: 'terra' }] },
        { cost: [{ k: 'exile', side: 'self', count: 7, corresponding: true }], reward: [{ k: 'influence', amount: 3, on: 'terra' }] },
      ] },
    ] },
];

export const JUPITER_CARDS: CardDef[] = [
  { id: 'jupiter-ch4mb3rs', scan: '22.44_9', name: 'Ch4mb3rs', people: 'robot', planet: 'jupiter', cost: 8,
    effects: [
      { k: 'influence', amount: 1, on: 'jupiter' },
      { k: 'zenithium', amount: 3, target: 'self' },
      { k: 'conditional', cond: { c: 'hasLeaderBadge' }, effects: [{ k: 'zenithium', amount: 1, target: 'self' }] },
    ] },
  { id: 'jupiter-arnulf', scan: '22.44_10', name: 'Arnulf', people: 'animod', planet: 'jupiter', cost: 3,
    effects: [
      { k: 'influence', amount: 1, on: 'jupiter' },
      { k: 'scale', tiers: [
        { cost: [{ k: 'exile', side: 'self', count: 2, corresponding: true }], reward: [{ k: 'influence', amount: 1, on: 'jupiter' }] },
        { cost: [{ k: 'exile', side: 'self', count: 4, corresponding: true }], reward: [{ k: 'influence', amount: 2, on: 'jupiter' }] },
        { cost: [{ k: 'exile', side: 'self', count: 7, corresponding: true }], reward: [{ k: 'influence', amount: 3, on: 'jupiter' }] },
      ] },
    ] },
  { id: 'jupiter-gibson', scan: '22.44_28', name: 'Gibsøn', people: 'robot', planet: 'jupiter', cost: 4,
    effects: [
      { k: 'influence', amount: 1, on: 'jupiter' },
      { k: 'transfer', count: 2, from: 'choice' },
      { k: 'optional', effects: [{ k: 'giveLeaderBadge' }, { k: 'transfer', count: 2, from: 'choice' }] },
    ] },
  { id: 'jupiter-annie', scan: '23.02_7', name: 'Annie', people: 'animod', planet: 'jupiter', cost: 1,
    effects: [
      { k: 'influence', amount: 1, on: 'jupiter' },
      { k: 'credits', amount: 5, target: 'self' },
      { k: 'optional', effects: [{ k: 'giveLeaderBadge' }, { k: 'credits', amount: 7, target: 'self' }] },
    ] },
  { id: 'jupiter-captain-andreev', scan: '23.02_10', name: 'Captain Andreev', people: 'humain', planet: 'jupiter', cost: 4,
    effects: [
      { k: 'influence', amount: 1, on: 'jupiter' },
      { k: 'optional', effects: [{ k: 'creditsFromCardValue', source: 'transfer' }] },
    ] },
  { id: 'jupiter-m4rt1n', scan: '23.02_15', name: 'M4rt1n', people: 'robot', planet: 'jupiter', cost: 4,
    effects: [
      { k: 'influence', amount: 1, on: 'jupiter' },
      { k: 'conditional', cond: { c: 'hasLeaderBadge' }, effects: [{ k: 'influence', amount: 1, on: 'jupiter' }] },
    ] },
  { id: 'jupiter-lisa-charity', scan: '23.02_18', name: 'Lisa Charity', people: 'humain', planet: 'jupiter', cost: 2,
    effects: [
      { k: 'influence', amount: 1, on: 'jupiter' },
      { k: 'zenithium', amount: 2, target: 'self' },
      { k: 'credits', amount: 3, target: 'opponent' },
    ] },
  { id: 'jupiter-agent-ezra', scan: '23.02_20', name: 'Agent Ezra', people: 'humain', planet: 'jupiter', cost: 1,
    effects: [
      { k: 'influence', amount: 1, on: 'jupiter' },
      { k: 'credits', amount: 4, target: 'self' },
      { k: 'optional', effects: [{ k: 'giveOpponent', resource: 'zenithium', amount: 1 }, { k: 'influence', amount: 1, on: 'venus' }] },
    ] },
  { id: 'jupiter-queen-suzanne', scan: '23.02_24', name: 'Queen Suzanne', people: 'humain', planet: 'jupiter', cost: 10,
    effects: [
      { k: 'influence', amount: 1, on: 'jupiter' },
      { k: 'influence', amount: 2, on: 'choice' },
      { k: 'zenithium', amount: 2, target: 'self' },
      { k: 'takeLeader', side: 'gold' },
    ] },
  { id: 'jupiter-milady-jones', scan: '23.02_26', name: 'Milady Jones', people: 'humain', planet: 'jupiter', cost: 6,
    effects: [
      { k: 'influence', amount: 1, on: 'jupiter' },
      { k: 'influence', amount: 1, on: 'terra' },
      { k: 'takeLeader', side: 'silver' },
    ] },
  { id: 'jupiter-b4rj4v3l', scan: '23.02_38', name: 'B4rj4v3l', people: 'robot', planet: 'jupiter', cost: 2,
    effects: [
      { k: 'influence', amount: 1, on: 'jupiter' },
      { k: 'scale', tiers: [
        { cost: [{ k: 'exile', side: 'self', count: 2, corresponding: true }], reward: [{ k: 'zenithium', amount: 2, target: 'self' }] },
        { cost: [{ k: 'exile', side: 'self', count: 4, corresponding: true }], reward: [{ k: 'zenithium', amount: 4, target: 'self' }] },
        { cost: [{ k: 'exile', side: 'self', count: 7, corresponding: true }], reward: [{ k: 'zenithium', amount: 7, target: 'self' }] },
      ] },
    ] },
  { id: 'jupiter-ivan', scan: '23.02_39', name: 'Ivan', people: 'animod', planet: 'jupiter', cost: 1,
    effects: [
      { k: 'influence', amount: 1, on: 'jupiter' },
      { k: 'creditsPerCardColors', zone: 'opponent', per: 2 },
    ] },
  { // Clarifié (cf. cartes-todo.md, scan 23.02_40) : exiler 1 carte adverse (plateau) -> gagner sa valeur en credits.
    id: 'jupiter-bajazet', scan: '23.02_40', name: 'Bajazet', people: 'animod', planet: 'jupiter', cost: 3,
    effects: [
      { k: 'influence', amount: 1, on: 'jupiter' },
      { k: 'creditsFromCardValue', source: 'exileOpponent' },
    ] },
  { id: 'jupiter-geta', scan: '23.02_41', name: 'Geta', people: 'animod', planet: 'jupiter', cost: 3,
    effects: [
      { k: 'influence', amount: 1, on: 'jupiter' },
      { k: 'choice', options: [[{ k: 'takeLeader', side: 'gold' }], [{ k: 'credits', amount: 8, target: 'self' }]] },
    ] },
  { id: 'jupiter-donald-smooth', scan: '23.02_48', name: 'Donald Smooth', people: 'humain', planet: 'jupiter', cost: 2,
    effects: [
      { k: 'influence', amount: 1, on: 'jupiter' },
      { k: 'optional', effects: [{ k: 'creditsFromCardValue', source: 'discardHand' }] },
    ] },
  { id: 'jupiter-suleiman', scan: '23.40_01', name: 'Suleiman', people: 'animod', planet: 'jupiter', cost: 1,
    effects: [
      { k: 'influence', amount: 1, on: 'jupiter' },
      { k: 'scale', tiers: [
        { cost: [{ k: 'exile', side: 'self', count: 3, corresponding: true }], reward: [{ k: 'influenceChoiceExcept', exceptColor: 'jupiter', amount: 1 }] },
        { cost: [{ k: 'exile', side: 'self', count: 7, corresponding: true }], reward: [{ k: 'influenceChoiceExcept', exceptColor: 'jupiter', amount: 2 }] },
        { cost: [{ k: 'exile', side: 'self', count: 12, corresponding: true }], reward: [{ k: 'influenceChoiceExcept', exceptColor: 'jupiter', amount: 3 }] },
      ] },
    ] },
  { id: 'jupiter-pkdick', scan: '23.02_53', name: 'P.K.Dick', people: 'robot', planet: 'jupiter', cost: 5,
    effects: [
      { k: 'influence', amount: 1, on: 'jupiter' },
      { k: 'influence', amount: 1, on: 'choice' },
      { k: 'conditional', cond: { c: 'hasLeaderBadge' }, effects: [{ k: 'zenithium', amount: 1, target: 'self' }] },
    ] },
  { id: 'jupiter-thompson', scan: '23.02_57', name: 'Thømpsøn', people: 'robot', planet: 'jupiter', cost: 8,
    effects: [
      { k: 'influence', amount: 1, on: 'jupiter' },
      { k: 'influence', amount: 2, on: 'choice' },
      { k: 'conditional', cond: { c: 'creditsAtLeast', amount: 6 }, effects: [{ k: 'influenceDifferent', amount: 1 }] },
    ] },
];

export const CARDS: CardDef[] = [
  ...MARS_CARDS, ...MERCURE_CARDS, ...VENUS_CARDS, ...TERRA_CARDS, ...JUPITER_CARDS,
];
