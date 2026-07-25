import { View } from 'react-native';

import type { Planet } from '../../engine';
import { PLANET_COLORS } from '../../game/planetColors';

/**
 * Disque rond représentant une planète : couleur de la planète (`PLANET_COLORS[planet].hex`)
 * + liseré clair autour (bordure blanche translucide). Composant partagé entre `PlanetsBoard`
 * (disque mobile sur le plateau) et `PlayerBanner` (planètes capturées) afin qu'ils soient
 * visuellement identiques, à taille près (`size`).
 */
export function PlanetDisc({ planet, size }: { planet: Planet; size: number }) {
  return (
    <View
      style={{
        width: size,
        height: size,
        borderRadius: size / 2,
        backgroundColor: PLANET_COLORS[planet].hex,
        borderWidth: 2,
        borderColor: 'rgba(255, 255, 255, 0.5)',
      }}
    />
  );
}
