import { ScrollView, Text, View } from 'react-native';

import type { Move } from '../../engine';
import type { LabeledMove } from '../../game/session';
import { PLANET_COLORS, PLANET_FR } from '../../game/planetColors';
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
            {decision.options.map((opt, i) => {
              // Décision de planète : juste le nom de la planète, bouton à sa couleur.
              const m = opt.move;
              return (
                <ActionButton
                  key={`${m.t}-${i}`}
                  label={m.t === 'decide' ? PLANET_FR[m.planet] : opt.label}
                  tone="primary"
                  bgColor={m.t === 'decide' ? PLANET_COLORS[m.planet].hex : undefined}
                  onPress={() => onChoose(m)}
                />
              );
            })}
          </ScrollView>
        </View>
      ) : null}
    </Sheet>
  );
}
