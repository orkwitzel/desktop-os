import type { FsNode } from '@/fs/types'

export type ShellFilePickerMode = 'open' | 'saveAs'

export type ShellFilePickerProps = {
  open: boolean
  mode: ShellFilePickerMode
  initialDir?: string
  defaultFileName?: string
  onSelect: (path: string) => void
  onCancel: () => void
}

export function sortNodes(nodes: FsNode[]): FsNode[] {
  return [...nodes].sort((a, b) => {
    if (a.kind !== b.kind) return a.kind === 'directory' ? -1 : 1
    return a.name.localeCompare(b.name)
  })
}
