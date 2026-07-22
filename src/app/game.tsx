import { useState } from 'react';
import { ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { DEFAULT_CONFIG } from '../game/config';
import { useGame } from '../game/useGame';
import { HandPanel } from '../components/game/HandPanel';
import { PlanetsPanel } from '../components/game/PlanetsPanel';
import { ResourcesPanel } from '../components/game/ResourcesPanel';

export default function GameScreen() {
  const [seed] = useState(() => Date.now() % 100000);
  const { snap, botThinking } = useGame(DEFAULT_CONFIG, seed, seed + 7);

  const banner =
    snap.phase === 'over'
      ? 'Partie terminée'
      : botThinking
        ? 'Le bot réfléchit…'
        : snap.decision !== null
          ? 'À toi de décider'
          : snap.phase === 'human'
            ? 'À toi de jouer'
            : "Tour de l'adversaire";

  return (
    <SafeAreaView style={{ flex: 1 }}>
      <View className="flex-1 bg-slate-950">
        <ScrollView className="flex-1 px-3">
          <View className="gap-3 py-3">
            <Text className="text-white text-xl font-bold">Zenith</Text>
            <Text className="text-indigo-300">{banner}</Text>
            <ResourcesPanel view={snap.view} />
            <PlanetsPanel view={snap.view} />
            <HandPanel view={snap.view} />
          </View>
        </ScrollView>
      </View>
    </SafeAreaView>
  );
}
