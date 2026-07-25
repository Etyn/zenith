import { useState } from 'react';
import { ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { cardOf, type Move } from '../engine';
import { randomConfig } from '../game/config';
import { PLANET_COLORS } from '../game/planetColors';
import type { LabeledMove, SessionSnapshot } from '../game/session';
import { useGame } from '../game/useGame';
import { BotActionSheet } from '../components/game/BotActionSheet';
import { CardActionSheet } from '../components/game/CardActionSheet';
import { DecisionSheet } from '../components/game/DecisionSheet';
import { GameOverSheet } from '../components/game/GameOverSheet';
import { HandPanel } from '../components/game/HandPanel';
import { PlanetsPanel } from '../components/game/PlanetsPanel';
import { PlayerBanner } from '../components/game/PlayerBanner';

function actionsForCard(snap: SessionSnapshot, cardId: string): LabeledMove[] {
  const all = [...snap.actions.recruit, ...snap.actions.develop, ...snap.actions.leadership];
  return all.filter((lm) => 'cardId' in lm.move && lm.move.cardId === cardId);
}

export default function GameScreen() {
  const [seed] = useState(() => Date.now() % 100000);
  const [config] = useState(() => randomConfig(seed));
  const { snap, botThinking, lastBotTurn, dismissBotTurn, play, replay } = useGame(config, seed, seed + 7);
  const [selectedCard, setSelectedCard] = useState<string | null>(null);

  const canAct = snap.phase === 'human' && snap.decision === null;
  const options = selectedCard === null ? [] : actionsForCard(snap, selectedCard);
  const selectedCardDef = selectedCard === null ? null : cardOf(selectedCard);

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
        <PlayerBanner view={snap.view} side="opponent" />

        <View className="flex-row justify-center gap-4 py-1 bg-slate-900/60">
          <Text className="text-slate-500 text-xs">Pioche : {snap.view.deckCount}</Text>
          <Text className="text-slate-500 text-xs">Jetons : {snap.view.bonusReserveCount}</Text>
        </View>

        <ScrollView className="flex-1 px-3">
          <View className="gap-3 py-3">
            <Text className="text-indigo-300">{banner}</Text>
            <PlanetsPanel view={snap.view} />
            <HandPanel
              view={snap.view}
              disabled={!canAct}
              onSelectCard={canAct ? setSelectedCard : undefined}
            />
          </View>
        </ScrollView>

        <PlayerBanner view={snap.view} side="self" />

        <CardActionSheet
          title={selectedCard === null ? null : (selectedCardDef?.name ?? selectedCard)}
          planetHex={selectedCardDef ? PLANET_COLORS[selectedCardDef.planet].hex : undefined}
          options={options}
          onChoose={(m: Move) => play(m)}
          onClose={() => setSelectedCard(null)}
        />
        <DecisionSheet decision={snap.decision} onChoose={(m: Move) => play(m)} />
        <BotActionSheet log={lastBotTurn} onDismiss={dismissBotTurn} />
        <GameOverSheet
          outcome={snap.outcome}
          winner={snap.winner}
          viewer={snap.view.viewer}
          onReplay={() => {
            setSelectedCard(null);
            replay();
          }}
        />
      </View>
    </SafeAreaView>
  );
}
