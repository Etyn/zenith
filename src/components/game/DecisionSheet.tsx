import { ScrollView, Text, View } from 'react-native';

import type { Move } from '../../engine';
import type { LabeledMove } from '../../game/session';
import { ActionButton } from '../ui/ActionButton';
import { Sheet } from '../ui/Sheet';

export function DecisionSheet({
  decision,
  onChoose,
}: {
  decision: { prompt: string; options: LabeledMove[] } | null;
  onChoose: (move: Move) => void;
}) {
  return (
    <Sheet visible={decision !== null}>
      {decision !== null ? (
        <View>
          <Text className="text-white text-lg font-bold mb-3">{decision.prompt}</Text>
          <ScrollView className="max-h-96">
            {decision.options.map((opt, i) => (
              <ActionButton
                key={`${opt.move.t}-${i}`}
                label={opt.label}
                tone="primary"
                onPress={() => onChoose(opt.move)}
              />
            ))}
          </ScrollView>
        </View>
      ) : null}
    </Sheet>
  );
}
