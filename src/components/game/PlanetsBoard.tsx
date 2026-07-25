import { useEffect, useRef } from 'react';
import { Animated, Text, View } from 'react-native';

import { PLANETS, type Planet, type PlanetTrack, type PlayerView } from '../../engine';
import { PLANET_COLORS, PLANET_FR } from '../../game/planetColors';

/** Hauteur totale de la colonne (zone où le disque peut se déplacer + marge). */
const TRACK_HEIGHT = 150;
/** Taille du disque mobile (la planète elle-même). */
const DISC_SIZE = 22;
/** Taille du point central (emplacement `discPos 4`). */
const DOT_CENTER_SIZE = 10;
/** Taille des points de niveau (+1/+2/+3 de chaque côté). */
const DOT_SIZE = 6;

/**
 * Centre vertical (en px, depuis le haut de la colonne) d'un `discPos` (0..8).
 * `discPos 8` (haut, adversaire) → proche de 0 ; `discPos 0` (bas, moi) → proche de `TRACK_HEIGHT`.
 * `discPos 4` (centre) → exactement au milieu.
 */
function centerY(discPos: number): number {
  return ((8 - discPos) / 8) * (TRACK_HEIGHT - DISC_SIZE) + DISC_SIZE / 2;
}

/** Positions de niveau affichées comme points de repère (les extrémités 0/8 — zones de
 * capture — n'ont pas besoin d'un point : le disque, lui, peut toujours les atteindre). */
const LEVEL_DOT_POSITIONS = [1, 2, 3, 4, 5, 6, 7];

/** Durée (ms) de l'animation de glissement du disque lors d'un changement de `discPos`. */
const DISC_SLIDE_DURATION_MS = 280;

/**
 * Colonne verticale d'une planète : barre + points de niveau, disque coloré mobile
 * (sa hauteur reflète `discPos` : haut = adversaire, bas = moi, centre = 4), nom de la
 * planète, et un `◈` discret si un jeton bonus est posé dessus.
 *
 * Le disque glisse (au lieu de sauter) d'une position à l'autre : chaque colonne possède
 * sa propre `Animated.Value`, ce qui exige un composant dédié (les hooks ne peuvent pas
 * être appelés dans une boucle `PLANETS.map`).
 */
function PlanetColumn({ planet, track, flip }: { planet: Planet; track: PlanetTrack; flip: boolean }) {
  const displayPos = flip ? 8 - track.discPos : track.discPos;
  const barTop = centerY(8);
  const barHeight = centerY(0) - centerY(8);

  const discTop = useRef(new Animated.Value(centerY(displayPos) - DISC_SIZE / 2)).current;

  useEffect(() => {
    Animated.timing(discTop, {
      toValue: centerY(displayPos) - DISC_SIZE / 2,
      duration: DISC_SLIDE_DURATION_MS,
      useNativeDriver: false,
    }).start();
  }, [discTop, displayPos]);

  return (
    <View className="flex-1 items-center">
      <View style={{ width: '100%', height: TRACK_HEIGHT, position: 'relative' }}>
        <View
          style={{
            position: 'absolute',
            left: '50%',
            marginLeft: -1,
            top: barTop,
            height: barHeight,
            width: 2,
            borderRadius: 1,
            backgroundColor: 'rgba(148, 163, 184, 0.25)',
          }}
        />

        {LEVEL_DOT_POSITIONS.map((pos) => {
          const isCenter = pos === 4;
          const size = isCenter ? DOT_CENTER_SIZE : DOT_SIZE;
          return (
            <View
              key={pos}
              style={{
                position: 'absolute',
                left: '50%',
                marginLeft: -size / 2,
                top: centerY(pos) - size / 2,
                width: size,
                height: size,
                borderRadius: size / 2,
                backgroundColor: isCenter ? 'rgba(226, 232, 240, 0.7)' : 'rgba(148, 163, 184, 0.4)',
              }}
            />
          );
        })}

        {track.bonusToken ? (
          <Text
            style={{
              position: 'absolute',
              left: '50%',
              marginLeft: DOT_CENTER_SIZE,
              top: centerY(4) - 9,
              fontSize: 12,
              color: 'rgba(226, 232, 240, 0.8)',
            }}
          >
            ◈
          </Text>
        ) : null}

        <Animated.View
          style={{
            position: 'absolute',
            left: '50%',
            marginLeft: -DISC_SIZE / 2,
            top: discTop,
            width: DISC_SIZE,
            height: DISC_SIZE,
            borderRadius: DISC_SIZE / 2,
            backgroundColor: PLANET_COLORS[planet].hex,
            borderWidth: 2,
            borderColor: 'rgba(255, 255, 255, 0.5)',
          }}
        />
      </View>
      <Text className="text-slate-300 text-[11px] mt-1">{PLANET_FR[planet]}</Text>
    </View>
  );
}

/**
 * Plateau visuel des 5 planètes, une colonne verticale par planète (ordre `PLANETS`,
 * gauche → droite).
 */
export function PlanetsBoard({ view }: { view: PlayerView }) {
  // Le viewer humain est toujours 0 en pratique, mais on reste correct si ce n'était pas le cas :
  // "bas = moi" doit toujours pointer vers le viewer, quel que soit son index côté moteur.
  const flip = view.viewer !== 0;

  return (
    <View className="flex-row justify-between bg-slate-900/40 rounded-2xl px-2 py-3">
      {PLANETS.map((planet) => (
        <PlanetColumn key={planet} planet={planet} track={view.planets[planet]} flip={flip} />
      ))}
    </View>
  );
}
