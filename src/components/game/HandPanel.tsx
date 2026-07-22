import { Pressable, Text, View } from 'react-native';

import { cardOf, type People, type Planet, type PlayerView } from '../../engine';
import { describeCardEffects } from '../../game/labels';

const PLANET_FR: Record<Planet, string> = {
  mercure: 'Mercure',
  venus: 'Vénus',
  terra: 'Terra',
  mars: 'Mars',
  jupiter: 'Jupiter',
};

const PEOPLE_FR: Record<People, string> = {
  animod: 'Animods',
  humain: 'Humains',
  robot: 'Robots',
};

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

  return (
    <View className="gap-1">
      <Text className="text-slate-300 font-semibold mb-1">Ta main ({hand.length})</Text>
      {hand.map((id) => {
        const card = cardOf(id);
        return (
          <Pressable
            key={id}
            disabled={disabled || onSelectCard === undefined}
            onPress={() => onSelectCard?.(id)}
            className={`bg-slate-800 rounded-xl px-3 py-2 ${disabled ? 'opacity-50' : ''}`}
          >
            <Text className="text-white font-medium">{card?.name ?? id}</Text>
            <Text className="text-slate-400 text-xs">
              {card ? `${PEOPLE_FR[card.people]} · ${PLANET_FR[card.planet]} · coût ${card.cost}` : ''}
            </Text>
            {describeCardEffects(id).map((eff, i) => (
              <Text key={i} className="text-indigo-200 text-xs mt-0.5">
                • {eff}
              </Text>
            ))}
          </Pressable>
        );
      })}
    </View>
  );
}
