import type { People, Planet } from '../engine/types';

// Les effets seront ajoutés dans le plan « effets ». Ici, le strict nécessaire à la fondation.
export type CardDef = { id: string; name: string; people: People; planet: Planet; cost: number };
