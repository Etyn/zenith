import { useState } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';

import type { PlayerView } from '../../engine';
import { HandPanel } from './HandPanel';

/** Hauteur max du détail de la main quand elle est dépliée (scrollable au-delà). */
const HAND_DETAIL_MAX_HEIGHT = 260;

/**
 * Barre "Ma main (n)" pliable/dépliable, placée juste au-dessus du bandeau du bas.
 * Dépliée par défaut. Quand dépliée, affiche le détail de la main (`HandPanel`)
 * au-dessus de la barre, dans une zone scrollable bornée en hauteur pour ne pas
 * pousser le bandeau du bas hors écran.
 */
export function CollapsibleHand({
  view,
  disabled = false,
  onSelectCard,
  defaultOpen = true,
}: {
  view: PlayerView;
  disabled?: boolean;
  onSelectCard?: (id: string) => void;
  defaultOpen?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);
  const handCount = (view.players[view.viewer].hand ?? []).length;

  return (
    <View>
      {open ? (
        <ScrollView
          style={{ maxHeight: HAND_DETAIL_MAX_HEIGHT }}
          className="px-3 pt-2"
          contentContainerClassName="pb-2"
        >
          <HandPanel view={view} disabled={disabled} onSelectCard={onSelectCard} />
        </ScrollView>
      ) : null}

      <Pressable
        onPress={() => setOpen((v) => !v)}
        className="flex-row items-center justify-center gap-2 bg-slate-800/80 py-2"
        accessibilityRole="button"
        accessibilityLabel={open ? 'Replier ma main' : 'Déplier ma main'}
      >
        <Text className="text-base">🃏</Text>
        <Text className="text-slate-200 text-sm font-semibold">Ma main ({handCount})</Text>
        <Text className="text-slate-400 text-xs">{open ? '▼' : '▲'}</Text>
      </Pressable>
    </View>
  );
}
