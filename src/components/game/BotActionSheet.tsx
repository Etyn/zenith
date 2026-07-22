import { ScrollView, Text, View } from 'react-native';

import type { BotTurnLog } from '../../game/session';
import { ActionButton } from '../ui/ActionButton';
import { Sheet } from '../ui/Sheet';

export function BotActionSheet({
  log,
  onDismiss,
}: {
  log: BotTurnLog | null;
  onDismiss: () => void;
}) {
  return (
    <Sheet visible={log !== null}>
      {log !== null ? (
        <View>
          <Text className="text-white text-lg font-bold mb-3">Tour de l&apos;adversaire</Text>
          <ScrollView className="max-h-96">
            {log.moves.length > 0 ? (
              <View className="mb-3">
                <Text className="text-indigo-300 font-medium mb-1">Coups joués</Text>
                {log.moves.map((label, i) => (
                  <Text key={`move-${i}`} className="text-white">
                    • {label}
                  </Text>
                ))}
              </View>
            ) : null}
            {log.deltas.length > 0 ? (
              <View className="mb-3">
                <Text className="text-indigo-300 font-medium mb-1">Effets</Text>
                {log.deltas.map((line, i) => (
                  <Text key={`delta-${i}`} className="text-slate-300">
                    • {line}
                  </Text>
                ))}
              </View>
            ) : null}
          </ScrollView>
          <ActionButton label="Continuer" tone="primary" onPress={onDismiss} />
        </View>
      ) : null}
    </Sheet>
  );
}
