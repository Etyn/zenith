import { Text, View } from 'react-native';

import { PLANETS, type PlayerIndex, type PlayerView } from '../../engine';
import { playerDotColor } from '../../game/playerColors';
import { PlanetDisc } from './PlanetDisc';

/** Taille des disques de planètes capturées dans le bandeau (mêmes proportions que le plateau). */
const CAPTURED_DISC_SIZE = 14;

/**
 * Bandeau d'un joueur (haut = adversaire, bas = moi), réutilisable des deux côtés.
 * Affiche crédits/zénithium (une ligne), le leader argent/or (poussé à droite sur
 * cette même ligne) et les planètes capturées par ce joueur (rangée centrée en bas).
 * Un point de légende indique la couleur (gris/blanc) de ce joueur pour le futur
 * panneau technos. Côté adversaire, ajoute le nombre de cartes en main.
 */
export function PlayerBanner({ view, side, seed }: { view: PlayerView; side: 'self' | 'opponent'; seed: number }) {
  const opponentIndex: PlayerIndex = view.viewer === 0 ? 1 : 0;
  const playerIndex: PlayerIndex = side === 'self' ? view.viewer : opponentIndex;
  const player = view.players[playerIndex];
  const dotColor = playerDotColor(seed, playerIndex);
  const leaderLabel =
    view.diplomacy.leader === playerIndex ? (view.diplomacy.side === 'gold' ? 'Leader or' : 'Leader argent') : null;

  const capturedDots = PLANETS.flatMap((planet) => {
    const count = view.planets[planet].captured[playerIndex];
    if (count <= 0) return [];
    return Array.from({ length: count }, (_, i) => (
      <PlanetDisc key={`${planet}-${i}`} planet={planet} size={CAPTURED_DISC_SIZE} />
    ));
  });

  return (
    <View className="bg-slate-800 rounded-2xl p-3 gap-1.5">
      <View className="flex-row justify-between items-center">
        <View className="flex-row items-center gap-2">
          <View
            style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: dotColor }}
          />
          <Text className="font-bold">
            <Text className="text-amber-300">Crédits {player.credits}</Text>
            <Text className="text-slate-500"> · </Text>
            <Text className="text-cyan-300">Zénithium {player.zenithium}</Text>
          </Text>
        </View>
        {leaderLabel ? <Text className="text-indigo-300 text-xs font-semibold">{leaderLabel}</Text> : null}
      </View>
      {side === 'opponent' ? (
        <Text className="text-slate-400 text-xs">Main : {player.handCount ?? 0}</Text>
      ) : null}
      {capturedDots.length > 0 ? (
        <View className="flex-row flex-wrap gap-1 justify-center">{capturedDots}</View>
      ) : null}
    </View>
  );
}
