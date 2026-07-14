import type { CSSProperties } from 'react';

/**
 * Preset "spot-the-difference" rounds shared by the SpotDiff exercise component
 * and its validator. Each round breaks one tile out of the system; `odd` holds
 * the style override applied only to that tile, `flaw` explains the break once
 * solved. Kept in a plain (non-client) module so `validate.ts` can import the
 * answer key without pulling in a client component.
 */
export type SpotRound = {
  /** Index (0-based) of the inconsistent tile. */
  oddIndex: number;
  /** Human description of the break, revealed after solving. */
  flaw: string;
  /** Style overrides applied only to the odd tile. */
  odd: CSSProperties;
};

/** Number of tiles rendered per round. */
export const SPOT_TILES = 4;

export const SPOT_ROUNDS: SpotRound[] = [
  { oddIndex: 2, flaw: 'радиус угла выбивается из шкалы (16px вместо 8px)', odd: { borderRadius: 16 } },
  { oddIndex: 0, flaw: 'оттенок фона чуть теплее — не из палитры', odd: { background: '#efe7dc' } },
  { oddIndex: 3, flaw: 'внутренние поля больше остальных (сетка сбита)', odd: { padding: 22 } },
  { oddIndex: 1, flaw: 'насыщенность акцента ниже — другой токен', odd: { opacity: 0.55 } },
];
