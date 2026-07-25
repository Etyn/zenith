import { Pressable, ScrollView, Text, View } from 'react-native';

import { cardOf, type PlayerView } from '../../engine';
import { PLANET_COLORS } from '../../game/planetColors';

/** Largeur fixe d'une carte quand la main compte moins de 6 cartes (rangée centrée). */
const CARD_WIDTH = 84;
/** Nombre de cartes à partir duquel la rangée occupe toute la largeur disponible. */
const FULL_WIDTH_COUNT = 6;

/**
 * Rangée horizontale de la main du joueur, toujours affichée (plus de plier/déplier).
 * Chaque carte est un rectangle arrondi teinté de la couleur de sa planète, montrant
 * a minima le nom et le coût. À 6 cartes (main "pleine"), la rangée occupe toute la
 * largeur (chaque carte ~1/6) ; en-dessous de 6, les cartes gardent une largeur fixe
 * et sont centrées. Un dépassement (>6, hors règle normale) reste scrollable.
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
  const isFullRow = hand.length >= FULL_WIDTH_COUNT;

  return (
    <ScrollView
      horizontal
      scrollEnabled={hand.length > FULL_WIDTH_COUNT}
      showsHorizontalScrollIndicator={false}
      style={{ width: '100%' }}
      contentContainerStyle={{
        flexGrow: 1,
        width: '100%',
        flexDirection: 'row',
        justifyContent: isFullRow ? 'space-between' : 'center',
        alignItems: 'stretch',
        gap: 8,
        paddingHorizontal: 12,
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
            style={[
              isFullRow ? { flex: 1, maxWidth: 140 } : { width: CARD_WIDTH },
              {
                aspectRatio: 0.72,
                backgroundColor: colors?.bgTint ?? 'rgba(148, 163, 184, 0.18)',
                borderColor: colors?.hex ?? '#94a3b8',
              },
            ]}
            className={`rounded-2xl border-2 px-2 py-2 justify-between ${disabled ? 'opacity-50' : ''}`}
          >
            <Text numberOfLines={2} className="text-white text-xs font-semibold">
              {card?.name ?? id}
            </Text>
            <Text className="text-slate-200 text-[11px] font-bold self-end">
              {card ? card.cost : ''}
            </Text>
          </Pressable>
        );
      })}
    </ScrollView>
  );
}
