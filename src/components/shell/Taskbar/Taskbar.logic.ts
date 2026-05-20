import type { IconSource } from '@/components/shell/ShellIcon'
import { placeholderIcon } from '@/components/shell/ShellIcon'
import type { AppDefinition } from '@/store/session/sessionTypes'

export type TaskbarProps = {
  startMenuOpen: boolean
  onStartMenuOpenChange: (open: boolean) => void
  clockWidgetOpen: boolean
  onClockWidgetOpenChange: (open: boolean) => void
}

export type TaskbarTask = {
  id: string
  title: string
  icon: IconSource
  minimized: boolean
  active: boolean
  entering: boolean
  exiting: boolean
}

export function resolveTaskIcon(registry: Map<string, AppDefinition>, appId: string): IconSource {
  return registry.get(appId)?.icon ?? placeholderIcon
}
