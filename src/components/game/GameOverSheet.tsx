import { Text, View } from 'react-native';

import type { PlayerIndex } from '../../engine';
import type { Outcome } from '../../game/session';
import { ActionButton } from '../ui/ActionButton';
import { Sheet } from '../ui/Sheet';

export function GameOverSheet({
  outcome,
  winner,
  viewer,
  onReplay,
}: {
  outcome: Outcome;
  winner: PlayerIndex | null;
  viewer: PlayerIndex;
  onReplay: () => void;
}) {
  const visible = outcome === 'winner' || outcome === 'stuck';
  const title =
    outcome === 'stuck' ? 'Partie bloquée' : winner === viewer ? 'Victoire !' : 'Défaite';
  const subtitle =
    outcome === 'stuck'
      ? 'Plus aucun coup possible.'
      : winner === viewer
        ? 'Tu remportes la partie.'
        : 'Le bot remporte la partie.';

  return (
    <Sheet visible={visible}>
      <View className="items-center">
        <Text className="text-white text-2xl font-bold mb-2">{title}</Text>
        <Text className="text-slate-400 mb-4">{subtitle}</Text>
        <View className="w-full">
          <ActionButton label="Rejouer" tone="primary" onPress={onReplay} />
        </View>
      </View>
    </Sheet>
  );
}
