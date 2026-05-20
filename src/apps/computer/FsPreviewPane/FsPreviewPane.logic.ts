import type { AppFile, WwwFile } from '@/fs/types'

export type FsPreviewPaneProps = {
  selectedPath: string | null
}

export function parseWww(content: string): WwwFile | null {
  try {
    const www = JSON.parse(content) as WwwFile
    if (typeof www.url !== 'string') return null
    return www
  } catch {
    return null
  }
}

export function parseApp(content: string): AppFile | null {
  try {
    const app = JSON.parse(content) as AppFile
    if (typeof app.appId !== 'string') return null
    return app
  } catch {
    return null
  }
}
