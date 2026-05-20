import type { RefObject } from 'react'
import type { IconSource } from '@/components/shell/ShellIcon'

export const START_MENU_ID = 'start-menu'

export type StartMenuProps = {
  open: boolean
  onClose: () => void
  anchorRef: RefObject<HTMLButtonElement | null>
  startButtonId: string
}

export type StartMenuItemProps = {
  label: string
  icon: IconSource
  onActivate: () => void
}
