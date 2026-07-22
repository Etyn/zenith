import { Text, View } from 'react-native';

import type { PlayerView } from '../../engine';

export function ResourcesPanel({ view }: { view: PlayerView }) {
  const me = view.players[view.viewer];
  const opp = view.players[view.viewer === 0 ? 1 : 0];
  const leader =
    view.diplomacy.leader === null
      ? '—'
      : view.diplomacy.leader === view.viewer
        ? `Toi (${view.diplomacy.side})`
        : `Adversaire (${view.diplomacy.side})`;

  return (
    <View className="flex-row justify-between bg-slate-800 rounded-2xl p-3">
      <View>
        <Text className="text-amber-300 font-bold">Crédits : {me.credits}</Text>
        <Text className="text-cyan-300 font-bold">Zénithium : {me.zenithium}</Text>
        <Text className="text-slate-400 text-xs mt-1">
          Techno {view.techSetup.animod}
          {me.techMarkers.animod} · {view.techSetup.humain}
          {me.techMarkers.humain} · {view.techSetup.robot}
          {me.techMarkers.robot}
        </Text>
      </View>
      <View className="items-end">
        <Text className="text-slate-300 text-xs">Leader : {leader}</Text>
        <Text className="text-slate-400 text-xs">Pioche : {view.deckCount}</Text>
        <Text className="text-slate-400 text-xs">Main adverse : {opp.handCount ?? 0}</Text>
      </View>
    </View>
  );
}
