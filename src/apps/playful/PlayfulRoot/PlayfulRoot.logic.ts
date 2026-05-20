import type { GameStatus } from '@/apps/playful/minesweeper.logic'

export function faceForStatus(status: GameStatus): string {
  if (status === 'won') return '😎'
  if (status === 'lost') return '😵'
  return '🙂'
}

export function statusMessage(status: GameStatus): string | null {
  if (status === 'won') return 'You win!'
  if (status === 'lost') return 'Boom — try again.'
  return null
}
