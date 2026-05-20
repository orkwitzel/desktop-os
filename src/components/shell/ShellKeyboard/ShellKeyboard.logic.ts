import { getNextFocusWindowId, isEditableTarget } from '@/utils/shellKeyboard'
import type { WindowManagerApi } from '@/store/session/windowManagerContext'

export type DesktopKeyboardContext = {
  openPrimary: () => void
  clearSelection: () => void
  hasSelection: boolean
  copy: () => void
  cut: () => void
  paste: () => void
  deleteSelection: () => void
  startRename: () => void
}

export type ShellKeyboardProps = {
  startMenuOpen: boolean
  clockWidgetOpen: boolean
  desktopCtx?: DesktopKeyboardContext
}

export type ShortcutContext = {
  event: KeyboardEvent
  startMenuOpen: boolean
  clockWidgetOpen: boolean
  contextMenuOpen: boolean
  shellModalOpen: boolean
  wm: WindowManagerApi
  desktopCtx: DesktopKeyboardContext | undefined
}

type Shortcut = {
  match: (ctx: ShortcutContext) => boolean
  run: (ctx: ShortcutContext) => void
}

function shellShortcutsEnabled(ctx: ShortcutContext): boolean {
  return (
    !ctx.startMenuOpen &&
    !ctx.clockWidgetOpen &&
    !ctx.contextMenuOpen &&
    !ctx.shellModalOpen &&
    !isEditableTarget(document.activeElement)
  )
}

function desktopFocused(ctx: ShortcutContext): boolean {
  return !ctx.wm.session.focusedWindowId
}

export const shellShortcuts: Shortcut[] = [
  {
    match: ({ event, startMenuOpen, clockWidgetOpen, contextMenuOpen, shellModalOpen }) =>
      !startMenuOpen &&
      !clockWidgetOpen &&
      !contextMenuOpen &&
      !shellModalOpen &&
      event.key === 'Escape' &&
      !isEditableTarget(document.activeElement),
    run: ({ event, wm, desktopCtx }) => {
      const id = wm.session.focusedWindowId
      if (id) {
        void (async () => {
          const allowed = await wm.requestCloseWindow(id)
          if (allowed) wm.closeWindow(id)
        })()
        event.preventDefault()
      } else if (desktopCtx?.hasSelection) {
        desktopCtx.clearSelection()
        event.preventDefault()
      }
    },
  },
  {
    match: (ctx) =>
      shellShortcutsEnabled(ctx) &&
      desktopFocused(ctx) &&
      ctx.event.key === 'Enter' &&
      Boolean(ctx.desktopCtx?.hasSelection),
    run: ({ event, desktopCtx }) => {
      desktopCtx?.openPrimary()
      event.preventDefault()
    },
  },
  {
    match: (ctx) =>
      shellShortcutsEnabled(ctx) &&
      desktopFocused(ctx) &&
      (ctx.event.ctrlKey || ctx.event.metaKey) &&
      ctx.event.key.toLowerCase() === 'c' &&
      Boolean(ctx.desktopCtx?.hasSelection),
    run: ({ event, desktopCtx }) => {
      desktopCtx?.copy()
      event.preventDefault()
    },
  },
  {
    match: (ctx) =>
      shellShortcutsEnabled(ctx) &&
      desktopFocused(ctx) &&
      (ctx.event.ctrlKey || ctx.event.metaKey) &&
      ctx.event.key.toLowerCase() === 'x' &&
      Boolean(ctx.desktopCtx?.hasSelection),
    run: ({ event, desktopCtx }) => {
      desktopCtx?.cut()
      event.preventDefault()
    },
  },
  {
    match: (ctx) =>
      shellShortcutsEnabled(ctx) &&
      desktopFocused(ctx) &&
      (ctx.event.ctrlKey || ctx.event.metaKey) &&
      ctx.event.key.toLowerCase() === 'v',
    run: ({ event, desktopCtx }) => {
      desktopCtx?.paste()
      event.preventDefault()
    },
  },
  {
    match: (ctx) =>
      shellShortcutsEnabled(ctx) &&
      desktopFocused(ctx) &&
      ctx.event.key === 'F2' &&
      Boolean(ctx.desktopCtx?.hasSelection),
    run: ({ event, desktopCtx }) => {
      desktopCtx?.startRename()
      event.preventDefault()
    },
  },
  {
    match: (ctx) =>
      shellShortcutsEnabled(ctx) &&
      desktopFocused(ctx) &&
      ctx.event.key === 'Delete' &&
      Boolean(ctx.desktopCtx?.hasSelection),
    run: ({ event, desktopCtx }) => {
      desktopCtx?.deleteSelection()
      event.preventDefault()
    },
  },
  {
    match: ({ event, startMenuOpen, clockWidgetOpen, contextMenuOpen, shellModalOpen }) =>
      !startMenuOpen &&
      !clockWidgetOpen &&
      !contextMenuOpen &&
      !shellModalOpen &&
      event.altKey &&
      event.key === 'F4' &&
      Boolean(event.target instanceof HTMLElement),
    run: ({ event, wm }) => {
      const id = wm.session.focusedWindowId
      if (!id) return
      void (async () => {
        const allowed = await wm.requestCloseWindow(id)
        if (allowed) wm.closeWindow(id)
      })()
      event.preventDefault()
    },
  },
  {
    match: ({ event, startMenuOpen, clockWidgetOpen, contextMenuOpen }) =>
      !startMenuOpen &&
      !clockWidgetOpen &&
      !contextMenuOpen &&
      event.ctrlKey &&
      !event.shiftKey &&
      (event.key === 'Backquote' || event.key === '`'),
    run: ({ event, wm }) => {
      const nextId = getNextFocusWindowId(wm.session)
      if (!nextId) return
      wm.focusWindow(nextId)
      event.preventDefault()
    },
  },
]
