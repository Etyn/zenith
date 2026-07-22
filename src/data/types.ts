import type { Effect, People, Planet } from '../engine/types';

export type CardDef = { id: string; name: string; people: People; planet: Planet; cost: number; effects: Effect[]; scan: string };
