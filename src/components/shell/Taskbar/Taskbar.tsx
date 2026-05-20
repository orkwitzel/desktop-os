import { useEffect, useId, useMemo, useRef, useState } from 'react'
import { StartMenu, START_MENU_ID } from '@/components/shell/StartMenu'
import { ShellIcon } from '@/components/shell/ShellIcon'
import { TrayClock } from '@/components/shell/TrayClock'
import { nerd } from '@/utils/nerdIcons'
import { useWindowManager } from '@/hooks/useWindowManager'
import { TASKBAR_ANIM_MS } from '@/utils/taskbarAnimation'
import { resolveTaskIcon, type TaskbarProps, type TaskbarTask } from './Taskbar.logic'
import {
  Bar,
  StartBtn,
  StartIcon,
  StartLabel,
  TaskBtn,
  TaskBtnLabel,
  Tasks,
  Tray,
} from './Taskbar.style'

type ExitingTask = {
  id: string
  title: string
  appId: string
  minimized: boolean
  active: boolean
  orderIndex: number
}

function useTaskbar({
  startMenuOpen,
  onStartMenuOpenChange,
  clockWidgetOpen,
  onClockWidgetOpenChange,
}: TaskbarProps) {
  const wm = useWindowManager()
  const session = wm.session
  const startRef = useRef<HTMLButtonElement>(null)
  const startButtonId = useId()

  const [exiting, setExiting] = useState<ExitingTask[]>([])
  const [enteringIds, setEnteringIds] = useState<Set<string>>(() => new Set())

  const prevOrderRef = useRef<string[]>([])
  const prevWindowsRef = useRef(session.windows)

  useEffect(() => {
    const prevOrder = prevOrderRef.current
    const prevWindows = prevWindowsRef.current
    const { order, windows, focusedWindowId } = session

    const removed = prevOrder.filter((id) => !order.includes(id))
    if (removed.length > 0) {
      setExiting((prev) => {
        const next = [...prev]
        for (const id of removed) {
          if (next.some((e) => e.id === id)) continue
          const w = prevWindows[id]
          if (!w) continue
          next.push({
            id,
            title: w.title,
            appId: w.appId,
            minimized: w.geometry.mode === 'minimized',
            active: focusedWindowId === id && w.geometry.mode !== 'minimized',
            orderIndex: prevOrder.indexOf(id),
          })
        }
        return next
      })

      for (const id of removed) {
        window.setTimeout(() => {
          setExiting((prev) => prev.filter((e) => e.id !== id))
        }, TASKBAR_ANIM_MS + 60)
      }
    }

    const added = order.filter((id) => !prevOrder.includes(id))
    if (added.length > 0) {
      setEnteringIds((prev) => {
        const next = new Set(prev)
        for (const id of added) next.add(id)
        return next
      })
      for (const id of added) {
        window.setTimeout(() => {
          setEnteringIds((prev) => {
            if (!prev.has(id)) return prev
            const next = new Set(prev)
            next.delete(id)
            return next
          })
        }, TASKBAR_ANIM_MS + 60)
      }
    }

    prevOrderRef.current = order
    prevWindowsRef.current = windows
  }, [session])

  const tasks = useMemo((): TaskbarTask[] => {
    const merged = [...session.order]
    const exitingOnly = [...exiting]
      .filter((e) => !merged.includes(e.id))
      .sort((a, b) => a.orderIndex - b.orderIndex)

    for (const snap of exitingOnly) {
      const idx = Math.min(Math.max(0, snap.orderIndex), merged.length)
      merged.splice(idx, 0, snap.id)
    }

    return merged
      .map((id): TaskbarTask | null => {
        const w = session.windows[id]
        const snap = exiting.find((e) => e.id === id)

        if (w) {
          return {
            id: w.id,
            title: w.title,
            icon: resolveTaskIcon(wm.registry, w.appId),
            minimized: w.geometry.mode === 'minimized',
            active:
              session.focusedWindowId === w.id && w.geometry.mode !== 'minimized',
            entering: enteringIds.has(id),
            exiting: false,
          }
        }

        if (snap) {
          return {
            id: snap.id,
            title: snap.title,
            icon: resolveTaskIcon(wm.registry, snap.appId),
            minimized: snap.minimized,
            active: snap.active,
            entering: false,
            exiting: true,
          }
        }

        return null
      })
      .filter((t): t is TaskbarTask => t !== null)
  }, [session, exiting, enteringIds, wm.registry])

  return {
    wm,
    session,
    tasks,
    startRef,
    startButtonId,
    startMenuOpen,
    onStartMenuOpenChange,
    clockWidgetOpen,
    onClockWidgetOpenChange,
    toggleStart: () => onStartMenuOpenChange(!startMenuOpen),
    closeStart: () => onStartMenuOpenChange(false),
  }
}

export function Taskbar(props: TaskbarProps) {
  const {
    wm,
    tasks,
    startRef,
    startButtonId,
    startMenuOpen,
    clockWidgetOpen,
    onClockWidgetOpenChange,
    toggleStart,
    closeStart,
  } = useTaskbar(props)

  return (
    <Bar data-taskbar>
      <StartBtn
        ref={startRef}
        id={startButtonId}
        type="button"
        $pressed={startMenuOpen}
        aria-label="Start"
        aria-haspopup="menu"
        aria-expanded={startMenuOpen}
        aria-controls={startMenuOpen ? START_MENU_ID : undefined}
        onClick={toggleStart}
      >
        <StartIcon aria-hidden>{nerd.windowsClassic}</StartIcon>
        <StartLabel>Start</StartLabel>
      </StartBtn>
      <StartMenu
        open={startMenuOpen}
        onClose={closeStart}
        anchorRef={startRef}
        startButtonId={startButtonId}
      />
      <Tasks>
        {tasks.map((task) => (
          <TaskBtn
            key={task.id}
            type="button"
            {...(!task.exiting ? { 'data-taskbar-window-id': task.id } : {})}
            $active={task.active}
            $minimized={task.minimized}
            $entering={task.entering}
            $exiting={task.exiting}
            aria-label={task.title}
            disabled={task.exiting}
            onClick={() => {
              if (task.exiting) return
              if (task.minimized) wm.restoreWindow(task.id)
              else wm.focusWindow(task.id)
            }}
          >
            <ShellIcon source={task.icon} size="taskbar" />
            <TaskBtnLabel>{task.title}</TaskBtnLabel>
          </TaskBtn>
        ))}
      </Tasks>
      <Tray>
        <TrayClock open={clockWidgetOpen} onOpenChange={onClockWidgetOpenChange} />
      </Tray>
    </Bar>
  )
}
