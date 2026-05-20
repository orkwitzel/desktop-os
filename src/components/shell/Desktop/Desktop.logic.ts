import type { RefObject } from 'react'
import type { ShellLaunchItem } from '@/utils/shellCatalog'
import type { PixelRect } from '@/utils/desktopLayout'
import {
  clearSelection,
  selectOne,
  toggleWithCtrl,
  selectRange,
  selectFromMarquee,
  selectAll,
  sortedItemIds,
  type DesktopItem,
  type DesktopSelectionState,
} from '@/utils/desktopSelection'

// ─── Types ───────────────────────────────────────────────────────────────────

export type DesktopShortcut = Extract<ShellLaunchItem, { kind: 'desktop' }>

type MarqueeState = {
  startClient: { x: number; y: number }
  currentClient: { x: number; y: number }
  /**
   * Cached workspace-element origin at marquee start.
   * Stored here so rendering can compute CSS coords without touching workspaceRef.
   */
  workspaceOrigin: { left: number; top: number }
  addMode: boolean
}

export type DragState = {
  /** Client coords where drag started */
  startClient: { x: number; y: number }
  /** Original grid positions of ALL selected icons at drag start */
  origins: Map<string, { gridX: number; gridY: number }>
  /** The icon whose cell is used as the drag reference (the one the user grabbed) */
  pivotId: string
  /** Current ghost grid position of the pivot icon */
  ghostGrid: { gridX: number; gridY: number }
  /** Whether we've crossed the movement threshold */
  active: boolean
}

type DesktopState = {
  items: DesktopShortcut[]
  selection: DesktopSelectionState
  drag: DragState | null
  marquee: MarqueeState | null
}

type DesktopAction =
  | { type: 'SET_ITEMS'; items: DesktopShortcut[] }
  | { type: 'SELECT_ONE'; id: string }
  | { type: 'SELECT_CTRL'; id: string }
  | { type: 'SELECT_SHIFT'; id: string }
  | { type: 'SELECT_ALL' }
  | { type: 'CLEAR_SELECTION' }
  | { type: 'SELECT_MARQUEE'; marquee: PixelRect }
  | { type: 'SELECT_MARQUEE_ADD'; marquee: PixelRect }
  | { type: 'MARQUEE_START'; client: { x: number; y: number }; workspaceOrigin: { left: number; top: number }; addMode: boolean }
  | { type: 'MARQUEE_UPDATE'; client: { x: number; y: number } }
  | { type: 'MARQUEE_END' }
  | { type: 'DRAG_START'; pivotId: string; startClient: { x: number; y: number } }
  | { type: 'DRAG_MOVE'; ghostGrid: { gridX: number; gridY: number } }
  | { type: 'DRAG_END' }
  | { type: 'APPLY_DROP'; updates: Map<string, { gridX: number; gridY: number }> }

export function toDesktopItems(items: DesktopShortcut[]): DesktopItem[] {
  return items.map((i) => ({ id: i.id, gridX: i.gridX, gridY: i.gridY, label: i.label }))
}

export function desktopReducer(state: DesktopState, action: DesktopAction): DesktopState {
  switch (action.type) {
    case 'SET_ITEMS':
      return { ...state, items: action.items }

    case 'SELECT_ONE':
      return { ...state, selection: selectOne(action.id) }

    case 'SELECT_CTRL':
      return { ...state, selection: toggleWithCtrl(action.id, state.selection) }

    case 'SELECT_SHIFT': {
      const ordered = sortedItemIds(toDesktopItems(state.items))
      return { ...state, selection: selectRange(state.selection.anchorId, action.id, ordered) }
    }

    case 'SELECT_ALL':
      return { ...state, selection: selectAll(toDesktopItems(state.items)) }

    case 'CLEAR_SELECTION':
      return { ...state, selection: clearSelection() }

    case 'SELECT_MARQUEE':
      return {
        ...state,
        selection: selectFromMarquee(action.marquee, toDesktopItems(state.items), state.selection, 'replace'),
        marquee: null,
      }

    case 'SELECT_MARQUEE_ADD':
      return {
        ...state,
        selection: selectFromMarquee(action.marquee, toDesktopItems(state.items), state.selection, 'add'),
        marquee: null,
      }

    case 'MARQUEE_START':
      return {
        ...state,
        marquee: {
          startClient: action.client,
          currentClient: action.client,
          workspaceOrigin: action.workspaceOrigin,
          addMode: action.addMode,
        },
      }

    case 'MARQUEE_UPDATE':
      if (!state.marquee) return state
      return { ...state, marquee: { ...state.marquee, currentClient: action.client } }

    case 'MARQUEE_END':
      return { ...state, marquee: null }

    case 'DRAG_START': {
      const origins = new Map<string, { gridX: number; gridY: number }>()
      const sel = state.selection.selectedIds
      for (const item of state.items) {
        if (sel.has(item.id)) {
          origins.set(item.id, { gridX: item.gridX, gridY: item.gridY })
        }
      }
      const pivot = state.items.find((i) => i.id === action.pivotId)
      const ghostGrid = pivot ? { gridX: pivot.gridX, gridY: pivot.gridY } : { gridX: 0, gridY: 0 }
      return {
        ...state,
        drag: {
          startClient: action.startClient,
          origins,
          pivotId: action.pivotId,
          ghostGrid,
          active: false,
        },
      }
    }

    case 'DRAG_MOVE':
      if (!state.drag) return state
      return { ...state, drag: { ...state.drag, ghostGrid: action.ghostGrid, active: true } }

    case 'DRAG_END':
      return { ...state, drag: null }

    case 'APPLY_DROP': {
      const updated = state.items.map((item) => {
        const pos = action.updates.get(item.id)
        return pos ? { ...item, gridX: pos.gridX, gridY: pos.gridY } : item
      })
      return { ...state, items: updated, drag: null }
    }

    default:
      return state
  }
}

export const DRAG_THRESHOLD = 4

export type DesktopActions = {
  copy: () => void
  cut: () => void
  paste: () => void
  deleteSelection: () => void
  startRename: () => void
}

export type DesktopProps = {
  workspaceRef: RefObject<HTMLDivElement | null>
  onOpenPrimary?: (fn: () => void) => void
  onRegisterClearSelection?: (fn: () => void) => void
  onRegisterDesktopActions?: (actions: DesktopActions) => void
  onSelectionChange?: (state: DesktopSelectionState) => void
}
