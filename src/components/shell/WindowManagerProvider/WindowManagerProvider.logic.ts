import type { ReactNode, RefObject } from 'react'
import type { AppDefinition } from '@/store/session/sessionTypes'

export type WindowManagerProviderProps = {
  registry: Map<string, AppDefinition>
  workspaceRef: RefObject<HTMLElement | null>
  children: ReactNode
}
