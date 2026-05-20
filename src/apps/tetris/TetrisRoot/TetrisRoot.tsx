import { useCallback, useEffect, useRef, useState } from 'react'
import type { AppProps } from '@/store/session/sessionTypes'
import { isEditableTarget } from '@/utils/shellKeyboard'
import { drawTetris, type DrawContext } from '@/apps/tetris/tetris.renderer'
import {
  clearLockPulse,
  finishLineClear,
  getDropIntervalMs,
  hardDrop,
  hold,
  LINE_CLEAR_MS,
  LOCK_PULSE_MS,
  move,
  newGame,
  rotate,
  softDrop,
  tick,
  togglePause,
  type TetrisState,
} from '@/apps/tetris/tetris.logic'
import { GAME_KEYS, statusMessage } from './TetrisRoot.logic'
import {
  AppBody,
  Controls,
  ControlsPanel,
  ControlsTitle,
  Counter,
  GameCanvas,
  Header,
  PlayRow,
  RestartBtn,
  SideRail,
  StatusText,
} from './TetrisRoot.style'

function useTetrisRoot(props: AppProps) {
  void props.windowId
  const [state, setState] = useState<TetrisState>(() => newGame())
  const bodyRef = useRef<HTMLDivElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const stateRef = useRef(state)
  const clearAnimStartRef = useRef<number | null>(null)
  const lockAnimStartRef = useRef<number | null>(null)
  const prevClearingRef = useRef<number[] | null>(null)
  const prevLockPulseRef = useRef(false)

  useEffect(() => {
    stateRef.current = state
  })

  useEffect(() => {
    const rows = state.clearingRows
    if (rows?.length && rows !== prevClearingRef.current) {
      clearAnimStartRef.current = performance.now()
    }
    if (!rows?.length) {
      clearAnimStartRef.current = null
    }
    prevClearingRef.current = rows
  }, [state.clearingRows])

  useEffect(() => {
    if (state.lockPulse && !prevLockPulseRef.current) {
      lockAnimStartRef.current = performance.now()
    }
    if (!state.lockPulse) {
      lockAnimStartRef.current = null
    }
    prevLockPulseRef.current = state.lockPulse
  }, [state.lockPulse])

  const restart = useCallback(() => {
    clearAnimStartRef.current = null
    lockAnimStartRef.current = null
    setState(newGame())
  }, [])

  const apply = useCallback((fn: (s: TetrisState) => TetrisState) => {
    setState((s) => fn(s))
  }, [])

  useEffect(() => {
    bodyRef.current?.focus()
  }, [])

  useEffect(() => {
    if (state.phase !== 'playing' || state.clearingRows) return
    const id = window.setInterval(() => {
      setState((s) => {
        if (s.phase !== 'playing' || s.clearingRows) return s
        return tick(s)
      })
    }, getDropIntervalMs(state.level))
    return () => window.clearInterval(id)
  }, [state.phase, state.level, state.clearingRows])

  useEffect(() => {
    if (!state.clearingRows?.length) return
    const id = window.setTimeout(() => {
      setState((s) => finishLineClear(s))
    }, LINE_CLEAR_MS)
    return () => window.clearTimeout(id)
  }, [state.clearingRows])

  useEffect(() => {
    if (!state.lockPulse) return
    const id = window.setTimeout(() => {
      setState((s) => clearLockPulse(s))
    }, LOCK_PULSE_MS)
    return () => window.clearTimeout(id)
  }, [state.lockPulse])

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (isEditableTarget(e.target)) return

      const phase = stateRef.current.phase
      const clearing = stateRef.current.clearingRows

      if (phase === 'gameOver') {
        if (e.key === 'Enter' || e.key === 'r' || e.key === 'R') {
          e.preventDefault()
          restart()
        }
        return
      }

      if (phase === 'paused') {
        if (e.key === 'p' || e.key === 'P') {
          e.preventDefault()
          apply(togglePause)
        }
        return
      }

      if (clearing) return

      const isHold =
        e.key === 'c' ||
        e.key === 'C' ||
        e.code === 'ShiftLeft' ||
        e.code === 'ShiftRight'

      const isGameKey = GAME_KEYS.has(e.key) || isHold

      if (!isGameKey) return

      e.preventDefault()

      if (isHold) {
        apply(hold)
        return
      }

      switch (e.key) {
        case 'ArrowLeft':
          apply((s) => move(s, -1))
          break
        case 'ArrowRight':
          apply((s) => move(s, 1))
          break
        case 'ArrowUp':
        case 'x':
        case 'X':
          apply(rotate)
          break
        case 'ArrowDown':
          apply(softDrop)
          break
        case ' ':
          apply(hardDrop)
          break
        case 'p':
        case 'P':
          apply(togglePause)
          break
        default:
          break
      }
    }

    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [apply, restart])

  // Canvas render loop
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    let raf = 0
    const paint = () => {
      const frame: DrawContext = {
        state: stateRef.current,
        now: performance.now(),
        clearAnimStart: clearAnimStartRef.current,
        lockAnimStart: lockAnimStartRef.current,
      }
      drawTetris(canvas, frame)
      raf = requestAnimationFrame(paint)
    }

    raf = requestAnimationFrame(paint)
    return () => cancelAnimationFrame(raf)
  }, [])

  // Re-sync state into ref-driven paints when state changes (paint loop reads stateRef)
  useEffect(() => {
    stateRef.current = state
  }, [state])

  const message = statusMessage(state)

  const focusBody = useCallback(() => {
    bodyRef.current?.focus()
  }, [])

  return {
    state,
    message,
    restart,
    bodyRef,
    canvasRef,
    focusBody,
  }
}


export default function TetrisRoot(props: AppProps) {
  const { bodyRef, canvasRef, focusBody, ...vm } = useTetrisRoot(props)

  return (
    <AppBody
      ref={bodyRef}
      tabIndex={0}
      onPointerDown={focusBody}
      aria-label="Tetris"
    >
      <Header>
        <Counter aria-label="Score">{String(vm.state.score).padStart(6, '0')}</Counter>
        <Counter aria-label="Level">{String(vm.state.level).padStart(2, '0')}</Counter>
        <Counter aria-label="Lines">{String(vm.state.lines).padStart(3, '0')}</Counter>
      </Header>

      {vm.message ? <StatusText>{vm.message}</StatusText> : null}

      <PlayRow>
        <GameCanvas
          ref={canvasRef}
          role="img"
          aria-label="Tetris playfield with hold and next previews"
        />

        <SideRail>
          <ControlsPanel>
            <ControlsTitle>Controls</ControlsTitle>
            <Controls>
              <div>
                <kbd>←</kbd> <kbd>→</kbd> move
              </div>
              <div>
                <kbd>↑</kbd> <kbd>X</kbd> rotate
              </div>
              <div>
                <kbd>↓</kbd> soft drop
              </div>
              <div>
                <kbd>Space</kbd> hard drop
              </div>
              <div>
                <kbd>C</kbd> <kbd>Shift</kbd> hold
              </div>
              <div>
                <kbd>P</kbd> pause
              </div>
            </Controls>
          </ControlsPanel>

          <RestartBtn type="button" onClick={vm.restart}>
            New game
          </RestartBtn>
        </SideRail>
      </PlayRow>
    </AppBody>
  )
}
