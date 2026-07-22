import { useState } from 'react';
import { ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { cardOf, type Move } from '../engine';
import { DEFAULT_CONFIG } from '../game/config';
import type { LabeledMove, SessionSnapshot } from '../game/session';
import { useGame } from '../game/useGame';
import { CardActionSheet } from '../components/game/CardActionSheet';
import { DecisionSheet } from '../components/game/DecisionSheet';
import { HandPanel } from '../components/game/HandPanel';
import { PlanetsPanel } from '../components/game/PlanetsPanel';
import { ResourcesPanel } from '../components/game/ResourcesPanel';

function actionsForCard(snap: SessionSnapshot, cardId: string): LabeledMove[] {
  const all = [...snap.actions.recruit, ...snap.actions.develop, ...snap.actions.leadership];
  return all.filter((lm) => 'cardId' in lm.move && lm.move.cardId === cardId);
}

export default function GameScreen() {
  const [seed] = useState(() => Date.now() % 100000);
  const { snap, botThinking, play } = useGame(DEFAULT_CONFIG, seed, seed + 7);
  const [selectedCard, setSelectedCard] = useState<string | null>(null);

  const canAct = snap.phase === 'human' && snap.decision === null;
  const options = selectedCard === null ? [] : actionsForCard(snap, selectedCard);

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
            <HandPanel
              view={snap.view}
              disabled={!canAct}
              onSelectCard={canAct ? setSelectedCard : undefined}
            />
          </View>
        </ScrollView>

        <CardActionSheet
          title={selectedCard === null ? null : (cardOf(selectedCard)?.name ?? selectedCard)}
          options={options}
          onChoose={(m: Move) => play(m)}
          onClose={() => setSelectedCard(null)}
        />
        <DecisionSheet decision={snap.decision} onChoose={(m: Move) => play(m)} />
      </View>
    </SafeAreaView>
  );
}
