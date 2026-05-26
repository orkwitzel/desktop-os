import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useReducer,
  useRef,
  useState,
  type RefObject,
} from 'react'
import { useContextMenuApi } from '@/components/shell/ContextMenu'
import { nextUntitledPath } from '@/fs/fsOperations'
import { useOs } from '@/hooks/useOs'
import { useFsStore } from '@/store/fsStore'
import { buildDesktopItems } from '@/utils/shellCatalog'
import {
  buildDesktopBackgroundMenu,
  buildDesktopIconMenu,
} from '@/utils/contextMenuBuilders'
import {
  snapPosition,
  clampToWorkspace,
  getWorkspaceBounds,
  iconPixelBounds,
  rectsIntersect,
  resolveDropCollisions,
  gridToPx,
  type PixelRect,
} from '@/utils/desktopLayout'
import { clearSelection } from '@/utils/desktopSelection'
import { isWindowPointerInteractionActive } from '@/utils/windowInteraction'
import { ShellIcon } from '@/components/shell/ShellIcon'
import { WindowLayer } from '@/components/wm/WindowLayer'
import {
  DRAG_THRESHOLD,
  desktopReducer,
  type DesktopProps,
  type DesktopShortcut,
  type DragState,
} from './Desktop.logic'
import {
  MarqueeRect,
  RenameInput,
  Shortcut,
  ShortcutGhost,
  ShortcutLabel,
  Shortcuts,
  Workspace,
} from './Desktop.style'

function useDesktop({
  workspaceRef,
  onOpenPrimary,
  onRegisterClearSelection,
  onRegisterDesktopActions,
  onSelectionChange,
}: DesktopProps) {
  const os = useOs()
  const ready = useFsStore((s) => s.ready)
  const desktopRevision = useFsStore((s) => s.desktopRevision)
  const fs = useFsStore((s) => s.fs)
  const { openMenu } = useContextMenuApi()
  const [renamingId, setRenamingId] = useState<string | null>(null)

  const [state, dispatch] = useReducer(desktopReducer, {
    items: [],
    selection: clearSelection(),
    drag: null,
    marquee: null,
  })

  // Keep a ref so pointer handlers always see latest state without stale closure.
  const stateRef = useRef(state)
  useLayoutEffect(() => {
    stateRef.current = state
  })

  // Expose selection to parent (for keyboard integration).
  useEffect(() => {
    onSelectionChange?.(state.selection)
  }, [state.selection, onSelectionChange])

  const reloadDesktop = useCallback(async () => {
    if (!ready) return
    const entries = await os.fs.listDesktopEntries()
    const built = await buildDesktopItems(
      entries,
      (path) => os.fs.open(path),
      (entry) => os.fs.resolveDesktopIcon(entry),
    )
    dispatch({
      type: 'SET_ITEMS',
      items: built.filter((i): i is DesktopShortcut => i.kind === 'desktop'),
    })
  }, [ready, os])

  useEffect(() => {
    void reloadDesktop()
  }, [reloadDesktop, desktopRevision])

  const selectedPaths = useCallback(() => {
    return Array.from(stateRef.current.selection.selectedIds)
  }, [])

  const handleOpenPrimary = useCallback(() => {
    const s = stateRef.current
    const primaryId = s.selection.primaryId
    if (!primaryId) return
    const item = s.items.find((i) => i.id === primaryId)
    item?.launch()
  }, [])

  const handleCopy = useCallback(() => {
    const paths = selectedPaths()
    if (paths.length > 0) os.clipboard.copy(paths)
  }, [selectedPaths, os])

  const handleCut = useCallback(() => {
    const paths = selectedPaths()
    if (paths.length > 0) os.clipboard.cut(paths)
  }, [selectedPaths, os])

  const handlePaste = useCallback(() => {
    void os.clipboard.pasteToDesktop().then(() => reloadDesktop())
  }, [os, reloadDesktop])

  const handleDelete = useCallback(async () => {
    const paths = selectedPaths()
    if (paths.length === 0) return
    const message =
      paths.length === 1
        ? 'Are you sure you want to delete this item?'
        : `Are you sure you want to delete these ${paths.length} items?`
    if (!(await os.ui.confirm({ title: 'Confirm Delete', message }))) return
    for (const p of paths) {
      await os.fs.delete(p)
    }
    dispatch({ type: 'CLEAR_SELECTION' })
    await reloadDesktop()
  }, [selectedPaths, os, reloadDesktop])

  const handleStartRename = useCallback(() => {
    const s = stateRef.current
    if (s.selection.selectedIds.size !== 1) return
    const id = s.selection.primaryId ?? Array.from(s.selection.selectedIds)[0]
    if (id) setRenamingId(id)
  }, [])

  const commitRename = useCallback(
    async (id: string, label: string) => {
      setRenamingId(null)
      const trimmed = label.trim()
      if (!trimmed) return
      await os.fs.renameDesktopItem(id, trimmed)
      await reloadDesktop()
    },
    [os, reloadDesktop],
  )

  const cancelRename = useCallback(() => setRenamingId(null), [])

  const buildMenuCtx = useCallback(
    () => ({
      selectedPaths: selectedPaths(),
      hasClipboard: os.clipboard.hasContent(),
      onOpen: handleOpenPrimary,
      onCut: handleCut,
      onCopy: handleCopy,
      onDelete: () => void handleDelete(),
      onRename: handleStartRename,
      onPaste: handlePaste,
      onRefresh: () => void reloadDesktop(),
      onNewTextDocument: () => {
        void os.fs.create.textDocument('/desktop').then(() => reloadDesktop())
      },
      onNewFolder: () => {
        void os.fs.create.folderWithRename('/desktop').then(() => reloadDesktop())
      },
      onNewShortcut: async () => {
        if (!fs) return
        const target = await nextUntitledPath(fs)
        await fs.writeFile(target, '')
        await os.fs.create.shortcutOnDesktop(target)
        await reloadDesktop()
      },
      onProperties: () => {
        const paths = selectedPaths()
        if (paths.length !== 1) return
        const item = stateRef.current.items.find((i) => i.id === paths[0])
        if (!item) return
        const isShortcut = item.desktopPath !== item.targetPath
        os.ui.showProperties({
          title: `${item.label} Properties`,
          name: item.label,
          icon: item.icon,
          kind: isShortcut ? 'shortcut' : 'file',
          path: item.desktopPath,
          targetPath: isShortcut ? item.targetPath : undefined,
          gridX: item.gridX,
          gridY: item.gridY,
        })
      },
    }),
    [
      selectedPaths,
      os,
      handleOpenPrimary,
      handleCut,
      handleCopy,
      handleDelete,
      handleStartRename,
      handlePaste,
      reloadDesktop,
      fs,
    ],
  )

  const handleWorkspaceContextMenu = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault()
      openMenu(e.clientX, e.clientY, buildDesktopBackgroundMenu(buildMenuCtx()))
    },
    [openMenu, buildMenuCtx],
  )

  const handleIconContextMenu = useCallback(
    (e: React.MouseEvent, id: string) => {
      e.preventDefault()
      e.stopPropagation()
      const current = stateRef.current
      if (!current.selection.selectedIds.has(id)) {
        dispatch({ type: 'SELECT_ONE', id })
      }
      openMenu(e.clientX, e.clientY, buildDesktopIconMenu(buildMenuCtx()))
    },
    [openMenu, buildMenuCtx],
  )

  // ─── Marquee pointer listeners (attached to document while marquee active) ──

  const pointerMoveHandlerRef = useRef<((e: PointerEvent) => void) | null>(null)
  const pointerUpHandlerRef = useRef<((e: PointerEvent) => void) | null>(null)

  const detachListeners = useCallback(() => {
    if (pointerMoveHandlerRef.current) {
      window.removeEventListener('pointermove', pointerMoveHandlerRef.current)
      pointerMoveHandlerRef.current = null
    }
    if (pointerUpHandlerRef.current) {
      window.removeEventListener('pointerup', pointerUpHandlerRef.current)
      pointerUpHandlerRef.current = null
    }
  }, [])

  // ─── Icon drag ───────────────────────────────────────────────────────────────

  const handleIconPointerDown = useCallback(
    (e: React.PointerEvent, id: string) => {
      e.stopPropagation() // don't bubble to workspace (which starts marquee)

      const current = stateRef.current
      const item = current.items.find((i) => i.id === id)
      if (!item) return

      // Selection on pointerdown.
      if (e.ctrlKey || e.metaKey) {
        dispatch({ type: 'SELECT_CTRL', id })
      } else if (e.shiftKey) {
        dispatch({ type: 'SELECT_SHIFT', id })
      } else if (!current.selection.selectedIds.has(id)) {
        // Plain click on unselected icon: select it alone immediately.
        dispatch({ type: 'SELECT_ONE', id })
      }
      // If the icon was already selected (plain, no modifier), leave selection
      // intact so group drag works; single-click deselect others happens on pointerup
      // only if no drag occurred.

      const startClient = { x: e.clientX, y: e.clientY }

      // Only start drag tracking for plain or already-selected icon clicks.
      if (!e.shiftKey) {
        dispatch({ type: 'DRAG_START', pivotId: id, startClient })
      }

      const onMove = (ev: PointerEvent) => {
        const s = stateRef.current
        if (!s.drag) return
        const dx = ev.clientX - s.drag.startClient.x
        const dy = ev.clientY - s.drag.startClient.y
        if (!s.drag.active && Math.hypot(dx, dy) < DRAG_THRESHOLD) return
        const workspace = workspaceRef.current
        if (!workspace) return
        const newGrid = snapPosition(ev.clientX, ev.clientY, workspace)
        dispatch({ type: 'DRAG_MOVE', ghostGrid: newGrid })
      }

      const onUp = async (ev: PointerEvent) => {
        detachListeners()
        const s = stateRef.current
        if (!s.drag) return

        if (!s.drag.active) {
          // Plain click — deselect others if no modifier was held at start.
          if (!e.ctrlKey && !e.metaKey && !e.shiftKey) {
            dispatch({ type: 'SELECT_ONE', id })
          }
          dispatch({ type: 'DRAG_END' })
          return
        }

        // Drag completed — compute drop positions with collision resolution.
        const workspace = workspaceRef.current
        if (!workspace) { dispatch({ type: 'DRAG_END' }); return }

        const finalPivotGrid = snapPosition(ev.clientX, ev.clientY, workspace)
        const pivotOrigin = s.drag.origins.get(s.drag.pivotId)
        if (!pivotOrigin) { dispatch({ type: 'DRAG_END' }); return }

        const dCol = finalPivotGrid.gridX - pivotOrigin.gridX
        const dRow = finalPivotGrid.gridY - pivotOrigin.gridY
        const bounds = getWorkspaceBounds(workspace)

        // Desired target positions for every dragged icon (clamped to workspace).
        const dragTargets = new Map<string, { gridX: number; gridY: number }>()
        s.drag.origins.forEach((origin, itemId) => {
          dragTargets.set(itemId, clampToWorkspace(origin.gridX + dCol, origin.gridY + dRow, workspace))
        })

        // Resolve: dragged icons win; stationary ones in their way get pushed out.
        const updates = resolveDropCollisions(dragTargets, s.items, bounds)

        const persistUpdates = Array.from(updates.entries()).map(([desktopPath, pos]) => ({
          desktopPath,
          gridX: pos.gridX,
          gridY: pos.gridY,
        }))

        dispatch({ type: 'APPLY_DROP', updates })
        await os.fs.saveDesktopPositions(persistUpdates)
      }

      pointerMoveHandlerRef.current = onMove
      pointerUpHandlerRef.current = onUp
      window.addEventListener('pointermove', onMove)
      window.addEventListener('pointerup', onUp)

      e.preventDefault()
    },
    [workspaceRef, detachListeners, os],
  )

  const handleIconDoubleClick = useCallback(
    (id: string) => {
      const item = stateRef.current.items.find((i) => i.id === id)
      item?.launch()
    },
    [],
  )

  // ─── Workspace pointerdown (marquee) ─────────────────────────────────────────

  const handleWorkspacePointerDown = useCallback(
    (e: React.PointerEvent) => {
      // Only handle clicks directly on the workspace or shortcuts container.
      const target = e.target as HTMLElement
      if (target.closest('button')) return
      if (target.closest('[data-window-frame]')) return
      if (isWindowPointerInteractionActive()) return

      const addMode = e.ctrlKey || e.metaKey
      const startClient = { x: e.clientX, y: e.clientY }
      let marqueeStarted = false

      const onMove = (ev: PointerEvent) => {
        if (isWindowPointerInteractionActive()) {
          detachListeners()
          if (marqueeStarted) dispatch({ type: 'MARQUEE_END' })
          return
        }
        const dx = ev.clientX - startClient.x
        const dy = ev.clientY - startClient.y
        if (!marqueeStarted && Math.hypot(dx, dy) >= DRAG_THRESHOLD) {
          marqueeStarted = true
          const workspace = workspaceRef.current
          const wRect = workspace?.getBoundingClientRect()
          const workspaceOrigin = wRect
            ? { left: wRect.left, top: wRect.top }
            : { left: 0, top: 0 }
          dispatch({ type: 'MARQUEE_START', client: startClient, workspaceOrigin, addMode })
        }
        if (marqueeStarted) {
          dispatch({ type: 'MARQUEE_UPDATE', client: { x: ev.clientX, y: ev.clientY } })
        }
      }

      const onUp = () => {
        detachListeners()
        if (marqueeStarted) {
          const s = stateRef.current
          if (s.marquee) {
            const { startClient: sc, currentClient: cc, workspaceOrigin: wo } = s.marquee
            const mRect: PixelRect = {
              left: Math.min(sc.x, cc.x) - wo.left,
              top: Math.min(sc.y, cc.y) - wo.top,
              right: Math.max(sc.x, cc.x) - wo.left,
              bottom: Math.max(sc.y, cc.y) - wo.top,
            }
            dispatch({ type: addMode ? 'SELECT_MARQUEE_ADD' : 'SELECT_MARQUEE', marquee: mRect })
          } else {
            dispatch({ type: 'MARQUEE_END' })
          }
        } else {
          // Plain click on empty space — clear selection.
          dispatch({ type: 'CLEAR_SELECTION' })
        }
      }

      pointerMoveHandlerRef.current = onMove
      pointerUpHandlerRef.current = onUp
      window.addEventListener('pointermove', onMove)
      window.addEventListener('pointerup', onUp)

      e.preventDefault()
    },
    [workspaceRef, detachListeners],
  )

  // ─── Clear selection when clicking outside the desktop workspace ───────────

  useEffect(() => {
    const onPointerDown = (e: PointerEvent) => {
      if (stateRef.current.selection.selectedIds.size === 0) return
      const workspace = workspaceRef.current
      if (!workspace) return
      const target = e.target as Node | null
      if (target && workspace.contains(target)) return
      dispatch({ type: 'CLEAR_SELECTION' })
    }
    window.addEventListener('pointerdown', onPointerDown, true)
    return () => window.removeEventListener('pointerdown', onPointerDown, true)
  }, [workspaceRef])

  // ─── Keyboard (Ctrl+A) — handled locally; Enter/Escape wired via parent ─────

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'a') {
        const active = document.activeElement
        if (active && (active.tagName === 'INPUT' || active.tagName === 'TEXTAREA' || (active as HTMLElement).isContentEditable)) return
        // Only intercept if no window is focused above.
        dispatch({ type: 'SELECT_ALL' })
        e.preventDefault()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  useEffect(() => {
    onOpenPrimary?.(handleOpenPrimary)
  }, [onOpenPrimary, handleOpenPrimary])

  useEffect(() => {
    onRegisterDesktopActions?.({
      copy: handleCopy,
      cut: handleCut,
      paste: handlePaste,
      deleteSelection: () => void handleDelete(),
      startRename: handleStartRename,
    })
  }, [
    onRegisterDesktopActions,
    handleCopy,
    handleCut,
    handlePaste,
    handleDelete,
    handleStartRename,
  ])

  const handleClearSelection = useCallback(() => {
    dispatch({ type: 'CLEAR_SELECTION' })
  }, [])

  useEffect(() => {
    onRegisterClearSelection?.(handleClearSelection)
  }, [onRegisterClearSelection, handleClearSelection])

  // ─── Compute marquee overlay rect ────────────────────────────────────────────
  // Uses the cached workspaceOrigin from MarqueeState — avoids reading workspaceRef during render.

  const marqueeRect: PixelRect | null = state.marquee
    ? (() => {
        const { startClient: sc, currentClient: cc, workspaceOrigin: wo } = state.marquee
        return {
          left: Math.min(sc.x, cc.x) - wo.left,
          top: Math.min(sc.y, cc.y) - wo.top,
          right: Math.max(sc.x, cc.x) - wo.left,
          bottom: Math.max(sc.y, cc.y) - wo.top,
        }
      })()
    : null

  const marqueeStyle = marqueeRect
    ? {
        left: marqueeRect.left,
        top: marqueeRect.top,
        width: marqueeRect.right - marqueeRect.left,
        height: marqueeRect.bottom - marqueeRect.top,
      }
    : null

  const marqueeHoverIds = marqueeRect
    ? new Set(
        state.items
          .filter((item) => rectsIntersect(marqueeRect, iconPixelBounds(item.gridX, item.gridY)))
          .map((item) => item.id),
      )
    : null

  return {
    state,
    renamingId,
    handleWorkspacePointerDown,
    handleWorkspaceContextMenu,
    handleIconPointerDown,
    handleIconContextMenu,
    handleIconDoubleClick,
    commitRename,
    cancelRename,
    marqueeStyle,
    marqueeHoverIds,
  }
}



function DragGhosts({
  drag,
  items,
}: {
  drag: DragState
  items: DesktopShortcut[]
}) {
  const pivotOrigin = drag.origins.get(drag.pivotId)
  if (!pivotOrigin) return null

  const dCol = drag.ghostGrid.gridX - pivotOrigin.gridX
  const dRow = drag.ghostGrid.gridY - pivotOrigin.gridY

  return Array.from(drag.origins.entries()).map(([itemId, origin]) => {
    const item = items.find((i) => i.id === itemId)
    if (!item) return null
    const { left, top } = gridToPx(origin.gridX + dCol, origin.gridY + dRow)
    return (
      <ShortcutGhost key={`ghost-${itemId}`} style={{ left, top }}>
        <ShellIcon source={item.icon} size="desktop" />
        <ShortcutLabel>{item.label}</ShortcutLabel>
      </ShortcutGhost>
    )
  })
}

function DesktopShortcutView({
  item,
  selected,
  marqueeHover,
  dragging,
  renaming,
  onPointerDown,
  onDoubleClick,
  onContextMenu,
  onCommitRename,
  onCancelRename,
}: {
  item: DesktopShortcut
  selected: boolean
  marqueeHover: boolean
  dragging: boolean
  renaming: boolean
  onPointerDown: (e: React.PointerEvent, id: string) => void
  onDoubleClick: (id: string) => void
  onContextMenu: (e: React.MouseEvent, id: string) => void
  onCommitRename: (id: string, label: string) => void
  onCancelRename: () => void
}) {
  const { left, top } = gridToPx(item.gridX, item.gridY)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (renaming) {
      inputRef.current?.focus()
      inputRef.current?.select()
    }
  }, [renaming])

  return (
    <Shortcut
      type="button"
      data-desktop-id={item.id}
      $selected={selected}
      $marqueeHover={marqueeHover}
      $dragging={dragging}
      style={{ left, top, zIndex: dragging ? 10 : undefined }}
      aria-selected={selected}
      onPointerDown={(e) => onPointerDown(e, item.id)}
      onDoubleClick={() => onDoubleClick(item.id)}
      onContextMenu={(e) => onContextMenu(e, item.id)}
    >
      <ShellIcon source={item.icon} size="desktop" />
      {renaming ? (
        <RenameInput
          ref={inputRef}
          defaultValue={item.label}
          onClick={(e) => e.stopPropagation()}
          onPointerDown={(e) => e.stopPropagation()}
          onKeyDown={(e) => {
            e.stopPropagation()
            if (e.key === 'Enter') {
              onCommitRename(item.id, (e.target as HTMLInputElement).value)
            }
            if (e.key === 'Escape') onCancelRename()
          }}
          onBlur={(e) => onCommitRename(item.id, e.target.value)}
        />
      ) : (
        <ShortcutLabel>{item.label}</ShortcutLabel>
      )}
    </Shortcut>
  )
}

export function Desktop(props: DesktopProps) {
  const vm = useDesktop(props)
  const { workspaceRef } = props

  return (
    <Workspace
      ref={workspaceRef as RefObject<HTMLDivElement>}
      data-desktop-workspace
      onPointerDown={vm.handleWorkspacePointerDown}
      onContextMenu={vm.handleWorkspaceContextMenu}
    >
      {vm.marqueeStyle && <MarqueeRect style={vm.marqueeStyle} />}
      <Shortcuts>
        {vm.state.items.map((item) => (
          <DesktopShortcutView
            key={item.id}
            item={item}
            selected={vm.state.selection.selectedIds.has(item.id)}
            marqueeHover={vm.marqueeHoverIds?.has(item.id) ?? false}
            dragging={
              vm.state.drag?.active === true &&
              vm.state.selection.selectedIds.has(item.id)
            }
            renaming={vm.renamingId === item.id}
            onPointerDown={vm.handleIconPointerDown}
            onDoubleClick={vm.handleIconDoubleClick}
            onContextMenu={vm.handleIconContextMenu}
            onCommitRename={vm.commitRename}
            onCancelRename={vm.cancelRename}
          />
        ))}
        {vm.state.drag?.active && (
          <DragGhosts drag={vm.state.drag} items={vm.state.items} />
        )}
      </Shortcuts>
      <WindowLayer />
    </Workspace>
  )
}