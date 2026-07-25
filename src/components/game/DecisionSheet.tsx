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
              const isPlanet = opt.move.t === 'decide';
              return (
                <ActionButton
                  key={`${opt.move.t}-${i}`}
                  label={isPlanet ? PLANET_FR[opt.move.planet] : opt.label}
                  tone="primary"
                  bgColor={isPlanet ? PLANET_COLORS[opt.move.planet].hex : undefined}
                  onPress={() => onChoose(opt.move)}
                />
              );
            })}
          </ScrollView>
        </View>
      ) : null}
    </Sheet>
  );
}
