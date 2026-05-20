import { useCallback, useState } from 'react'
import type { AppProps } from '@/store/session/sessionTypes'
import {
  countFlags,
  MINE_COUNT,
  newGame,
  reveal,
  toggleFlag,
  type Board as MinesweeperBoard,
  type GameStatus,
} from '@/apps/playful/minesweeper.logic'
import { faceForStatus, statusMessage } from './PlayfulRoot.logic'
import {
  AppBody,
  Board,
  Cell,
  Counter,
  FaceBtn,
  Header,
  StatusText,
} from './PlayfulRoot.style'

function usePlayfulRoot(props: AppProps) {
  void props.windowId
  const [board, setBoard] = useState<MinesweeperBoard>(() => newGame().board)
  const [status, setStatus] = useState<GameStatus>('playing')
  const [firstClick, setFirstClick] = useState(true)

  const restart = useCallback(() => {
    const g = newGame()
    setBoard(g.board)
    setStatus(g.status)
    setFirstClick(g.firstClick)
  }, [])

  const onReveal = (row: number, col: number) => {
    if (status !== 'playing') return
    const result = reveal(board, row, col, firstClick)
    setBoard(result.board)
    setStatus(result.status)
    setFirstClick(result.firstClick)
  }

  const onFlag = (row: number, col: number) => {
    if (status !== 'playing') return
    setBoard(toggleFlag(board, row, col))
  }

  const minesLeft = Math.max(0, MINE_COUNT - countFlags(board))
  const message = statusMessage(status)

  return {
    board,
    status,
    restart,
    onReveal,
    onFlag,
    minesLeft,
    message,
    face: faceForStatus(status),
  }
}

export default function PlayfulRoot(props: AppProps) {
  const vm = usePlayfulRoot(props)

  return (
    <AppBody>
      <Header>
        <Counter aria-label="Mines remaining">
          {String(vm.minesLeft).padStart(2, '0')}
        </Counter>
        <FaceBtn type="button" onClick={vm.restart} aria-label="New game">
          {vm.face}
        </FaceBtn>
        <Counter aria-hidden>00</Counter>
      </Header>

      {vm.message ? <StatusText>{vm.message}</StatusText> : null}

      <Board
        role="grid"
        aria-label="Minesweeper board"
        data-minesweeper-board
        onContextMenu={(e) => e.preventDefault()}
      >
        {vm.board.map((row, r) =>
          row.map((cell, c) => {
            const revealed = cell.revealed
            let label = ''
            if (revealed) {
              if (cell.mine) label = '💣'
              else if (cell.adjacent > 0) label = String(cell.adjacent)
            } else if (cell.flagged) {
              label = '🚩'
            }

            return (
              <Cell
                key={`${r}-${c}`}
                type="button"
                $revealed={revealed}
                $flagged={cell.flagged}
                $mine={cell.mine}
                $mineHit={revealed && cell.mine && vm.status === 'lost'}
                $adjacent={cell.adjacent}
                disabled={revealed || vm.status !== 'playing'}
                aria-label={`Row ${r + 1} column ${c + 1}`}
                onClick={() => vm.onReveal(r, c)}
                onContextMenu={(e) => {
                  e.preventDefault()
                  vm.onFlag(r, c)
                }}
              >
                {label}
              </Cell>
            )
          }),
        )}
      </Board>
    </AppBody>
  )
}
