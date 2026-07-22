import { Text, View } from 'react-native';

import { PLANETS, type Planet, type PlayerView } from '../../engine';

const PLANET_FR: Record<Planet, string> = {
  mercure: 'Mercure',
  venus: 'Vénus',
  terra: 'Terra',
  mars: 'Mars',
  jupiter: 'Jupiter',
};

const CENTER = 4;

export function PlanetsPanel({ view }: { view: PlayerView }) {
  return (
    <View className="gap-1">
      <Text className="text-slate-300 font-semibold mb-1">Planètes</Text>
      {PLANETS.map((planet) => {
        const track = view.planets[planet];
        // discPos : 0 = zone du joueur 0 (toi), 8 = zone du joueur 1 (adversaire), 4 = centre.
        const lead = track.discPos === CENTER ? 'neutre' : track.discPos < CENTER ? 'toi' : 'adversaire';
        return (
          <View
            key={planet}
            className="flex-row justify-between items-center bg-slate-800/60 rounded-xl px-3 py-2"
          >
            <Text className="text-white font-medium w-24">{PLANET_FR[planet]}</Text>
            <Text className="text-indigo-300 text-xs">Influence : {lead}</Text>
            <Text className="text-slate-400 text-xs">
              Captures {track.captured[0]}–{track.captured[1]}
            </Text>
            <Text className="text-slate-500 text-xs">{track.bonusToken ? '◈' : '—'}</Text>
          </View>
        );
      })}
    </View>
  );
}
