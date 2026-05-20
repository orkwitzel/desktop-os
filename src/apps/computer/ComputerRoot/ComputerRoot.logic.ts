import type { FsNode } from '@/fs/types'
import { dirname, extension, normalizePath } from '@/utils/paths'

type HistoryEntry = { dir: string; selected: string | null }

export type ExplorerState = {
  currentDir: string
  selectedPath: string | null
  history: HistoryEntry[]
  historyIndex: number
}

export type ExplorerAction =
  | { type: 'GO_TO'; dir: string; selected?: string | null }
  | { type: 'BACK' }
  | { type: 'FORWARD' }
  | { type: 'SELECT'; path: string | null }
  | { type: 'RESET'; entry: HistoryEntry }

export function resolveLaunch(
  launch: { path: string } | undefined,
  nodes: FsNode[],
): HistoryEntry {
  const raw = launch?.path
  if (!raw || raw === '/') return { dir: '/', selected: null }

  const path = normalizePath(raw)
  const node = nodes.find((n) => n.path === path)
  if (node?.kind === 'directory') return { dir: path, selected: null }
  if (node?.kind === 'file') return { dir: dirname(path), selected: path }

  if (extension(path)) return { dir: dirname(path), selected: path }
  return { dir: path, selected: null }
}

export function explorerReducer(state: ExplorerState, action: ExplorerAction): ExplorerState {
  switch (action.type) {
    case 'RESET':
      return {
        currentDir: action.entry.dir,
        selectedPath: action.entry.selected,
        history: [action.entry],
        historyIndex: 0,
      }
    case 'GO_TO': {
      const dir = normalizePath(action.dir)
      const selected = action.selected ?? null
      const trimmed = state.history.slice(0, state.historyIndex + 1)
      trimmed.push({ dir, selected })
      return {
        currentDir: dir,
        selectedPath: selected,
        history: trimmed,
        historyIndex: trimmed.length - 1,
      }
    }
    case 'BACK': {
      if (state.historyIndex <= 0) return state
      const next = state.historyIndex - 1
      const entry = state.history[next]!
      return {
        ...state,
        historyIndex: next,
        currentDir: entry.dir,
        selectedPath: entry.selected,
      }
    }
    case 'FORWARD': {
      if (state.historyIndex >= state.history.length - 1) return state
      const next = state.historyIndex + 1
      const entry = state.history[next]!
      return {
        ...state,
        historyIndex: next,
        currentDir: entry.dir,
        selectedPath: entry.selected,
      }
    }
    case 'SELECT':
      return { ...state, selectedPath: action.path }
    default:
      return state
  }
}
