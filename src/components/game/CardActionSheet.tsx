import { ScrollView, Text, View } from 'react-native';

import { cardOf, type Move, type People } from '../../engine';
import { describeCardEffects } from '../../game/labels';
import { PLANET_COLORS, PLANET_FR } from '../../game/planetColors';
import type { LabeledMove } from '../../game/session';
import { ActionButton } from '../ui/ActionButton';
import { Sheet } from '../ui/Sheet';

const PEOPLE_FR: Record<People, string> = {
  animod: 'Animods',
  humain: 'Humains',
  robot: 'Robots',
};

/**
 * Feuille de détail + actions d'une carte sélectionnée dans la main.
 * Affiche d'abord le détail complet de la carte (nom, peuple · planète · coût, code
 * scan, liste des effets) puis les actions disponibles (`options`), dans cet ordre.
 */
export function CardActionSheet({
  cardId,
  options,
  onChoose,
  onClose,
}: {
  cardId: string | null;
  options: LabeledMove[];
  onChoose: (move: Move) => void;
  onClose: () => void;
}) {
  const card = cardId === null ? null : cardOf(cardId);

  return (
    <Sheet visible={cardId !== null} onClose={onClose}>
      {cardId !== null ? (
        <View>
          <View className="flex-row items-center gap-2 mb-1">
            {card ? (
              <View
                style={{
                  width: 10,
                  height: 10,
                  borderRadius: 5,
                  backgroundColor: PLANET_COLORS[card.planet].hex,
                }}
              />
            ) : null}
            <Text className="text-white text-lg font-bold">{card?.name ?? cardId}</Text>
          </View>
          {card ? (
            <Text className="text-slate-400 text-xs mb-1">
              {PEOPLE_FR[card.people]} · {PLANET_FR[card.planet]} · coût {card.cost}
            </Text>
          ) : null}
          {card?.scan ? <Text className="text-slate-500 text-[10px] mb-2">[{card.scan}]</Text> : null}
          <View className="gap-0.5 mb-3">
            {describeCardEffects(cardId).map((eff, i) => (
              <Text key={i} className="text-indigo-200 text-xs">
                • {eff}
              </Text>
            ))}
          </View>
          <View className="h-px bg-slate-700 mb-3" />
          <ScrollView className="max-h-72">
            {options.length === 0 ? (
              <Text className="text-slate-400">Aucune action possible avec cette carte.</Text>
            ) : null}
            {options.map((opt, i) => (
              <ActionButton
                key={`${opt.move.t}-${i}`}
                label={opt.label}
                onPress={() => {
                  onChoose(opt.move);
                  onClose();
                }}
              />
            ))}
          </ScrollView>
        </View>
      ) : null}
    </Sheet>
  );
}
