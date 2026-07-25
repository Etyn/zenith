import { useEffect, useRef } from 'react';
import { Animated, Text, View } from 'react-native';

import { PEOPLES, type People, type PlayerView } from '../../engine';
import { playerDotColor } from '../../game/playerColors';

const PEOPLE_FR: Record<People, string> = {
  animod: 'Animods',
  humain: 'Humains',
  robot: 'Robots',
};

/** Niveaux affichés sur la piste (0 = point de départ, 5 = niveau max). */
const LEVELS = [0, 1, 2, 3, 4, 5];

/** Taille des repères de niveau (discrets) sur la piste. */
const LEVEL_DOT_SIZE = 6;
/** Taille des points « joueur » (gris/blanc) qui glissent sur la piste. */
const PLAYER_DOT_SIZE = 14;
/** Décalage vertical (px) appliqué aux deux points joueur quand ils partagent le même niveau,
 * pour qu'ils restent tous les deux visibles au lieu de se superposer exactement. */
const COLLISION_OFFSET = 5;
/** Durée (ms) de l'animation de glissement d'un point joueur lors d'un changement de niveau. */
const MARKER_SLIDE_DURATION_MS = 280;

/** Position horizontale (en % de la piste, 0..100) d'un niveau 0..5. */
function levelToPercent(level: number): number {
  return (level / 5) * 100;
}

/**
 * Ligne d'une technologie : piste horizontale (niveaux 0 à 5) avec les deux points joueur
 * (gris/blanc) positionnés selon leur `techMarkers[people]`.
 *
 * Chaque point glisse (au lieu de sauter) vers sa nouvelle position : chaque ligne possède
 * ses deux propres `Animated.Value` (un par joueur), ce qui exige un composant dédié (les
 * hooks ne peuvent pas être appelés dans une boucle `PEOPLES.map`).
 */
function TechRow({
  people,
  faceLabel,
  level0,
  level1,
  color0,
  color1,
}: {
  people: People;
  faceLabel: string;
  level0: number;
  level1: number;
  color0: string;
  color1: string;
}) {
  const pos0 = useRef(new Animated.Value(level0)).current;
  const pos1 = useRef(new Animated.Value(level1)).current;

  useEffect(() => {
    Animated.timing(pos0, {
      toValue: level0,
      duration: MARKER_SLIDE_DURATION_MS,
      useNativeDriver: false,
    }).start();
  }, [pos0, level0]);

  useEffect(() => {
    Animated.timing(pos1, {
      toValue: level1,
      duration: MARKER_SLIDE_DURATION_MS,
      useNativeDriver: false,
    }).start();
  }, [pos1, level1]);

  const left0 = pos0.interpolate({ inputRange: [0, 5], outputRange: ['0%', '100%'] });
  const left1 = pos1.interpolate({ inputRange: [0, 5], outputRange: ['0%', '100%'] });

  // Si les deux joueurs sont au même niveau, on les décale légèrement (un au-dessus, un
  // en-dessous de la piste) pour qu'ils restent tous les deux visibles.
  const samePos = level0 === level1;
  const offsetY0 = samePos ? -COLLISION_OFFSET : 0;
  const offsetY1 = samePos ? COLLISION_OFFSET : 0;

  return (
    <View className="flex-row items-center gap-2">
      <Text className="text-slate-400 text-[11px] w-16">{PEOPLE_FR[people]}</Text>
      <Text className="text-slate-200 text-[11px] font-bold w-4 text-center">{faceLabel}</Text>
      <View style={{ flex: 1, height: 24, justifyContent: 'center' }}>
        <View
          style={{
            position: 'absolute',
            left: 0,
            right: 0,
            top: '50%',
            marginTop: -1,
            height: 2,
            borderRadius: 1,
            backgroundColor: 'rgba(148, 163, 184, 0.25)',
          }}
        />

        {LEVELS.map((lvl) => (
          <View
            key={lvl}
            style={{
              position: 'absolute',
              left: `${levelToPercent(lvl)}%`,
              marginLeft: -LEVEL_DOT_SIZE / 2,
              top: '50%',
              marginTop: -LEVEL_DOT_SIZE / 2,
              width: LEVEL_DOT_SIZE,
              height: LEVEL_DOT_SIZE,
              borderRadius: LEVEL_DOT_SIZE / 2,
              backgroundColor: 'rgba(148, 163, 184, 0.4)',
            }}
          />
        ))}

        <Animated.View
          style={{
            position: 'absolute',
            left: left0,
            marginLeft: -PLAYER_DOT_SIZE / 2,
            top: '50%',
            marginTop: -PLAYER_DOT_SIZE / 2 + offsetY0,
            width: PLAYER_DOT_SIZE,
            height: PLAYER_DOT_SIZE,
            borderRadius: PLAYER_DOT_SIZE / 2,
            backgroundColor: color0,
            borderWidth: 1.5,
            borderColor: 'rgba(15, 23, 42, 0.6)',
          }}
        />
        <Animated.View
          style={{
            position: 'absolute',
            left: left1,
            marginLeft: -PLAYER_DOT_SIZE / 2,
            top: '50%',
            marginTop: -PLAYER_DOT_SIZE / 2 + offsetY1,
            width: PLAYER_DOT_SIZE,
            height: PLAYER_DOT_SIZE,
            borderRadius: PLAYER_DOT_SIZE / 2,
            backgroundColor: color1,
            borderWidth: 1.5,
            borderColor: 'rgba(15, 23, 42, 0.6)',
          }}
        />
      </View>
    </View>
  );
}

/**
 * Panneau des 3 technologies (Animods, Humains, Robots), une ligne par peuple (ordre
 * `PEOPLES`). Chaque ligne affiche la face tirée (`techSetup[people]`) et une piste
 * horizontale (niveaux 0..5) où glissent les deux points joueur (gris/blanc, via
 * `playerDotColor`) selon `players[i].techMarkers[people]`.
 */
export function TechPanel({ view, seed }: { view: PlayerView; seed: number }) {
  const color0 = playerDotColor(seed, 0);
  const color1 = playerDotColor(seed, 1);

  return (
    <View className="bg-slate-900/40 rounded-2xl px-3 py-3 gap-2">
      <Text className="text-slate-300 text-xs font-semibold">Technologies</Text>
      {PEOPLES.map((people) => (
        <TechRow
          key={people}
          people={people}
          faceLabel={view.techSetup[people]}
          level0={view.players[0].techMarkers[people]}
          level1={view.players[1].techMarkers[people]}
          color0={color0}
          color1={color1}
        />
      ))}
    </View>
  );
}
