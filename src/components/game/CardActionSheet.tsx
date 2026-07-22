import { ScrollView, Text, View } from 'react-native';

import type { Move } from '../../engine';
import type { LabeledMove } from '../../game/session';
import { ActionButton } from '../ui/ActionButton';
import { Sheet } from '../ui/Sheet';

export function CardActionSheet({
  title,
  options,
  onChoose,
  onClose,
}: {
  title: string | null;
  options: LabeledMove[];
  onChoose: (move: Move) => void;
  onClose: () => void;
}) {
  return (
    <Sheet visible={title !== null} onClose={onClose}>
      {title !== null ? (
        <View>
          <Text className="text-white text-lg font-bold mb-3">{title}</Text>
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
