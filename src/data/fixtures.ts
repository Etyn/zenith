import type { People, Planet } from '../engine/types';
import type { CardDef } from './types';

/** ⚠️ Données FACTICES pour tester le moteur. NE PAS confondre avec le vrai contenu Zenith. */
export const FIXTURE_NON_CANONICAL = true;

const PEOPLE_CYCLE: People[] = ['animod', 'humain', 'robot'];
const PLANET_LIST: Planet[] = ['mercure', 'venus', 'terra', 'mars', 'jupiter'];

// 2 cartes par planète (10 cartes), coûts variés. Aucun effet pour l'instant.
export const FIXTURE_CARDS: CardDef[] = PLANET_LIST.flatMap((planet, i) =>
  [0, 1].map((k) => ({
    id: `FIX_${planet}_${k}`,
    name: `Fixture ${planet} ${k}`,
    planet,
    people: PEOPLE_CYCLE[(i + k) % 3]!,
    cost: 1 + ((i + k) % 5), // 1..5
  })),
);
