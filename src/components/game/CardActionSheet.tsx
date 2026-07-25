import { ScrollView, Text, View } from 'react-native';

import type { Move } from '../../engine';
import type { LabeledMove } from '../../game/session';
import { ActionButton } from '../ui/ActionButton';
import { Sheet } from '../ui/Sheet';

export function CardActionSheet({
  title,
  planetHex,
  options,
  onChoose,
  onClose,
}: {
  title: string | null;
  /** Couleur (hex) de la planète de la carte, pour un accent visuel discret dans l'entête. */
  planetHex?: string;
  options: LabeledMove[];
  onChoose: (move: Move) => void;
  onClose: () => void;
}) {
  return (
    <Sheet visible={title !== null} onClose={onClose}>
      {title !== null ? (
        <View>
          <View className="flex-row items-center gap-2 mb-3">
            {planetHex ? (
              <View
                style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: planetHex }}
              />
            ) : null}
            <Text className="text-white text-lg font-bold">{title}</Text>
          </View>
          <ScrollView className="max-h-96">
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
