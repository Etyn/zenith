import { Text, View } from 'react-native';

import { PLANETS, type PlayerIndex, type PlayerView } from '../../engine';
import { PLANET_COLORS } from '../../game/planetColors';

/**
 * Bandeau d'un joueur (haut = adversaire, bas = moi), réutilisable des deux côtés.
 * Affiche crédits, zénithium, technos, leader (si ce joueur l'est) et ses planètes capturées.
 * Côté adversaire, ajoute le nombre de cartes en main.
 */
export function PlayerBanner({ view, side }: { view: PlayerView; side: 'self' | 'opponent' }) {
  const opponentIndex: PlayerIndex = view.viewer === 0 ? 1 : 0;
  const playerIndex: PlayerIndex = side === 'self' ? view.viewer : opponentIndex;
  const player = view.players[playerIndex];
  const leaderLabel =
    view.diplomacy.leader === playerIndex ? (view.diplomacy.side === 'gold' ? 'Leader or' : 'Leader argent') : null;

  const capturedDots = PLANETS.flatMap((planet) => {
    const count = view.planets[planet].captured[playerIndex];
    if (count <= 0) return [];
    return Array.from({ length: count }, (_, i) => (
      <View
        key={`${planet}-${i}`}
        style={{
          width: 10,
          height: 10,
          borderRadius: 5,
          backgroundColor: PLANET_COLORS[planet].hex,
        }}
      />
    ));
  });

  return (
    <View className="flex-row justify-between items-center bg-slate-800 rounded-2xl p-3">
      <View className="gap-0.5">
        <Text className="text-amber-300 font-bold">Crédits : {player.credits}</Text>
        <Text className="text-cyan-300 font-bold">Zénithium : {player.zenithium}</Text>
        <Text className="text-slate-400 text-xs">
          Techno {view.techSetup.animod}
          {player.techMarkers.animod} · {view.techSetup.humain}
          {player.techMarkers.humain} · {view.techSetup.robot}
          {player.techMarkers.robot}
        </Text>
        {side === 'opponent' ? (
          <Text className="text-slate-400 text-xs">Main : {player.handCount ?? 0}</Text>
        ) : null}
      </View>
      <View className="items-end gap-1">
        {leaderLabel ? <Text className="text-indigo-300 text-xs font-semibold">{leaderLabel}</Text> : null}
        {capturedDots.length > 0 ? (
          <View className="flex-row flex-wrap gap-1 justify-end">{capturedDots}</View>
        ) : null}
      </View>
    </View>
  );
}
