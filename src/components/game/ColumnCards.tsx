import { Text, View } from 'react-native';

import { cardOf } from '../../engine';
import { PLANET_COLORS } from '../../game/planetColors';

/** Hauteur totale (px) d'une mini-carte : assez pour lire le nom + le coût de la carte du dessus. */
const CARD_HEIGHT = 46;
/** Hauteur (px) de la bande haute (nom + coût) qui reste visible pour les cartes recouvertes. */
const HEADER_HEIGHT = 20;

/**
 * Pile verticale de mini-cartes représentant les agents posés par un joueur sur une planète
 * (`PlayerPublicState.columns[planet]`), affichée dans `PlanetsBoard`.
 *
 * Superposition : chaque carte, hormis la première de la pile, chevauche la précédente via un
 * `marginTop` négatif (`HEADER_HEIGHT - CARD_HEIGHT`) ; seule sa bande haute (nom + coût) reste
 * visible sous la carte suivante. La dernière carte du tableau (= la plus récente posée) est
 * rendue en dernier, donc au-dessus de la pile (z-order naturel des `View` empilées) et
 * entièrement visible.
 *
 * Orientation : `orientation='opponent'` pivote toute la pile de 180° pour que les cartes de
 * l'adversaire soient "face à lui" (lisibles depuis son côté de l'écran). Comme la pile est
 * retournée dans son ensemble, la carte la plus récente — rendue en dernier, donc visuellement
 * en bas du bloc avant rotation — se retrouve bien au-dessus une fois pivotée à 180°, et le sens
 * d'empilement reste cohérent des deux côtés du plateau.
 */
export function ColumnCards({ cardIds, orientation }: { cardIds: string[]; orientation: 'self' | 'opponent' }) {
  if (cardIds.length === 0) {
    return null;
  }

  return (
    <View style={orientation === 'opponent' ? { transform: [{ rotate: '180deg' }] } : undefined}>
      {cardIds.map((id, index) => {
        const card = cardOf(id);
        const colors = card ? PLANET_COLORS[card.planet] : undefined;
        return (
          <View
            key={id}
            style={[
              {
                height: CARD_HEIGHT,
                marginTop: index === 0 ? 0 : HEADER_HEIGHT - CARD_HEIGHT,
                backgroundColor: colors?.bgTint ?? 'rgba(148, 163, 184, 0.18)',
                borderColor: colors?.hex ?? '#94a3b8',
              },
              { zIndex: index },
            ]}
            className="rounded-lg border px-1.5 py-1 justify-start"
          >
            <View className="flex-row items-start justify-between">
              <Text numberOfLines={1} className="text-white text-[9px] font-semibold flex-shrink mr-1">
                {card?.name ?? id}
              </Text>
              <Text className="text-slate-200 text-[9px] font-bold">{card ? card.cost : ''}</Text>
            </View>
          </View>
        );
      })}
    </View>
  );
}
