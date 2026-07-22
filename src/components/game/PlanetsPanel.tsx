import { Text, View } from 'react-native';

import { PLANETS, type Planet, type PlayerView } from '../../engine';
import { describePlanet } from '../../game/labels';

const PLANET_FR: Record<Planet, string> = {
  mercure: 'Mercure',
  venus: 'Vénus',
  terra: 'Terra',
  mars: 'Mars',
  jupiter: 'Jupiter',
};

export function PlanetsPanel({ view }: { view: PlayerView }) {
  return (
    <View className="gap-1">
      <Text className="text-slate-300 font-semibold mb-1">Planètes</Text>
      {PLANETS.map((planet) => {
        const track = view.planets[planet];
        return (
          <View
            key={planet}
            className="flex-row justify-between items-center bg-slate-800/60 rounded-xl px-3 py-2"
          >
            <Text className="text-white font-medium w-24">{PLANET_FR[planet]}</Text>
            <Text className="text-indigo-300 text-xs flex-1">{describePlanet(track, view.viewer)}</Text>
            <Text className="text-slate-500 text-xs">{track.bonusToken ? '◈' : '—'}</Text>
          </View>
        );
      })}
    </View>
  );
}
