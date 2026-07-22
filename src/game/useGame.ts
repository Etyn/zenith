import { useCallback, useEffect, useState } from 'react';

import type { GameConfig, Move } from '../engine';
import {
  humanMove,
  initSession,
  replay,
  runBotTurn,
  snapshot,
  type BotTurnLog,
  type SessionSnapshot,
  type SessionState,
} from './session';

const BOT_DELAY_MS = 600;

export type UseGame = {
  snap: SessionSnapshot;
  botThinking: boolean;
  lastBotTurn: BotTurnLog | null;
  dismissBotTurn: () => void;
  play: (move: Move) => void;
  replay: () => void;
};

export function useGame(config: GameConfig, gameSeed: number, botSeed: number): UseGame {
  const [state, setState] = useState<SessionState>(() => initSession(config, gameSeed, botSeed));
  const [lastBotTurn, setLastBotTurn] = useState<BotTurnLog | null>(null);
  const snap = snapshot(state);
  const botThinking = snap.phase === 'bot' && snap.outcome === 'playing' && lastBotTurn === null;

  // Tour du bot joué d'un bloc (temporisé pour laisser voir "le bot réfléchit…"),
  // puis la feuille récap reste affichée (lastBotTurn) tant qu'elle n'est pas fermée :
  // pas d'enchaînement d'un nouveau tour bot avant `dismissBotTurn`.
  useEffect(() => {
    if (!(snap.phase === 'bot' && snap.outcome === 'playing') || lastBotTurn !== null) return;
    const id = setTimeout(() => {
      const { session, log } = runBotTurn(state);
      setState(session);
      if (log.moves.length > 0 || log.deltas.length > 0) setLastBotTurn(log);
    }, BOT_DELAY_MS);
    return () => clearTimeout(id);
  }, [state, snap.phase, snap.outcome, lastBotTurn]);

  const play = useCallback((move: Move) => setState((cur) => humanMove(cur, move)), []);
  const replayGame = useCallback(() => setState((cur) => replay(cur)), []);
  const dismissBotTurn = useCallback(() => setLastBotTurn(null), []);

  return { snap, botThinking, lastBotTurn, dismissBotTurn, play, replay: replayGame };
}
