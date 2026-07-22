import { useCallback, useEffect, useState } from 'react';

import type { GameConfig, Move } from '../engine';
import {
  humanMove,
  initSession,
  replay,
  snapshot,
  stepBot,
  type SessionSnapshot,
  type SessionState,
} from './session';

const BOT_DELAY_MS = 600;

export type UseGame = {
  snap: SessionSnapshot;
  botThinking: boolean;
  play: (move: Move) => void;
  replay: () => void;
};

export function useGame(config: GameConfig, gameSeed: number, botSeed: number): UseGame {
  const [state, setState] = useState<SessionState>(() => initSession(config, gameSeed, botSeed));
  const snap = snapshot(state);
  const botThinking = snap.phase === 'bot' && snap.outcome === 'playing';

  // Boucle bot : un coup à la fois, temporisé, tant que c'est au bot et que ça joue.
  useEffect(() => {
    if (!(snap.phase === 'bot' && snap.outcome === 'playing')) return;
    const id = setTimeout(() => setState((cur) => stepBot(cur)), BOT_DELAY_MS);
    return () => clearTimeout(id);
  }, [state, snap.phase, snap.outcome]);

  const play = useCallback((move: Move) => setState((cur) => humanMove(cur, move)), []);
  const replayGame = useCallback(() => setState((cur) => replay(cur)), []);

  return { snap, botThinking, play, replay: replayGame };
}
