import type { TetrisState } from '@/apps/tetris/tetris.logic'

const GAME_KEYS = new Set([
  'ArrowLeft',
  'ArrowRight',
  'ArrowUp',
  'ArrowDown',
  ' ',
  'x',
  'X',
  'p',
  'P',
  'r',
  'R',
  'Enter',
  'c',
  'C',
])

export { GAME_KEYS }

export function statusMessage(state: TetrisState): string | null {
  if (state.phase === 'paused') return 'Paused — press P to resume'
  if (state.phase === 'gameOver') return 'Game over — press Enter or R to restart'
  if (state.clearingRows?.length) return null
  return null
}
