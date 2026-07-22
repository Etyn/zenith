import type { People, Planet } from '../engine/types';
import type { CardDef } from './types';

/** ⚠️ Données FACTICES pour tester le moteur. NE PAS confondre avec le vrai contenu Zenith. */
export const FIXTURE_NON_CANONICAL = true;

const PEOPLE_CYCLE: People[] = ['animod', 'humain', 'robot'];
const PLANET_LIST: Planet[] = ['mercure', 'venus', 'terra', 'mars', 'jupiter'];

// 2 cartes par planète (10 cartes), coûts variés. Chaque carte donne 1 influence sur sa planète.
export const FIXTURE_CARDS: CardDef[] = PLANET_LIST.flatMap((planet, i) =>
  [0, 1].map((k) => ({
    id: `FIX_${planet}_${k}`,
    name: `Fixture ${planet} ${k}`,
    scan: 'FIXTURE',
    planet,
    people: PEOPLE_CYCLE[(i + k) % 3]!,
    cost: 1 + ((i + k) % 5), // 1..5
    effects: [
      { k: 'influence', amount: 1, on: planet },
      k === 0 ? { k: 'credits', amount: 2, target: 'self' } : { k: 'zenithium', amount: 1, target: 'self' },
    ],
  })),
);
