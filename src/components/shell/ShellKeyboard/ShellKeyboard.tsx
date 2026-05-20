import { useEffect, useLayoutEffect, useRef } from 'react'
import { useContextMenuOptional } from '@/components/shell/ContextMenu'
import { useShellModalOptional } from '@/components/shell/ShellModal'
import { useWindowManager } from '@/hooks/useWindowManager'
import {
  shellShortcuts,
  type ShellKeyboardProps,
  type ShortcutContext,
} from './ShellKeyboard.logic'

export type { DesktopKeyboardContext } from './ShellKeyboard.logic'

function useShellKeyboard({ startMenuOpen, clockWidgetOpen, desktopCtx }: ShellKeyboardProps) {
  const wm = useWindowManager()
  const contextMenu = useContextMenuOptional()
  const shellModal = useShellModalOptional()
  const desktopCtxRef = useRef(desktopCtx)

  useLayoutEffect(() => {
    desktopCtxRef.current = desktopCtx
  })

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      const ctx: ShortcutContext = {
        event,
        startMenuOpen,
        clockWidgetOpen,
        contextMenuOpen: contextMenu?.isOpen() ?? false,
        shellModalOpen: shellModal?.isOpen() ?? false,
        wm,
        desktopCtx: desktopCtxRef.current,
      }
      for (const shortcut of shellShortcuts) {
        if (shortcut.match(ctx)) {
          shortcut.run(ctx)
          return
        }
      }
    }

    document.addEventListener('keydown', onKeyDown)
    return () => document.removeEventListener('keydown', onKeyDown)
  }, [startMenuOpen, clockWidgetOpen, wm, contextMenu, shellModal])
}

export function ShellKeyboard(props: ShellKeyboardProps) {
  useShellKeyboard(props)
  return null
}
