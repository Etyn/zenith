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

export const CARDS: CardDef[] = [...MARS_CARDS];
