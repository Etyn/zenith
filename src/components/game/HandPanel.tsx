import { Pressable, ScrollView, Text, useWindowDimensions } from 'react-native';

import { cardOf, type PlayerView } from '../../engine';
import { PLANET_COLORS } from '../../game/planetColors';

const PADDING_H = 12;
const GAP = 8;
/** Une main pleine = 6 cartes ; la largeur de carte est calculée pour que 6 tiennent sur une ligne. */
const FULL_HAND = 6;

/**
 * Rangée horizontale de la main du joueur, toujours affichée. Chaque carte est un
 * rectangle arrondi teinté de la couleur de sa planète (nom + coût). La largeur d'une
 * carte est FIXE — calculée pour que 6 cartes tiennent exactement sur la ligne. À 4 ou
 * 5 cartes, même largeur, rangée centrée horizontalement. À plus de 6 (hors règle),
 * la rangée devient scrollable.
 */
export function HandPanel({
  view,
  onSelectCard,
  disabled = false,
}: {
  view: PlayerView;
  onSelectCard?: (id: string) => void;
  disabled?: boolean;
}) {
  const me = view.players[view.viewer];
  const hand = me.hand ?? [];
  const { width } = useWindowDimensions();
  const cardWidth = Math.max(48, Math.floor((width - 2 * PADDING_H - GAP * (FULL_HAND - 1)) / FULL_HAND));
  const scroll = hand.length > FULL_HAND;

  return (
    <ScrollView
      horizontal
      scrollEnabled={scroll}
      showsHorizontalScrollIndicator={false}
      style={{ width: '100%', flexGrow: 0, flexShrink: 0 }}
      contentContainerStyle={{
        minWidth: '100%',
        flexDirection: 'row',
        justifyContent: scroll ? 'flex-start' : 'center',
        alignItems: 'center',
        gap: GAP,
        paddingHorizontal: PADDING_H,
        paddingVertical: 8,
      }}
    >
      {hand.map((id) => {
        const card = cardOf(id);
        const colors = card ? PLANET_COLORS[card.planet] : undefined;
        return (
          <Pressable
            key={id}
            disabled={disabled || onSelectCard === undefined}
            onPress={() => onSelectCard?.(id)}
            style={{
              width: cardWidth,
              aspectRatio: 0.72,
              backgroundColor: colors?.bgTint ?? 'rgba(148, 163, 184, 0.18)',
              borderColor: colors?.hex ?? '#94a3b8',
            }}
            className={`rounded-2xl border-2 px-2 py-2 justify-between ${disabled ? 'opacity-50' : ''}`}
          >
            <Text numberOfLines={2} className="text-white text-xs font-semibold">
              {card?.name ?? id}
            </Text>
            <Text className="text-slate-200 text-[11px] font-bold self-end">{card ? card.cost : ''}</Text>
          </Pressable>
        );
      })}
    </ScrollView>
  );
}
