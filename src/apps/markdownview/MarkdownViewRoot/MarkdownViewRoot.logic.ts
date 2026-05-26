import { useEffect, useState } from 'react'
import type { AppProps } from '@/store/session/sessionTypes'
import { useOs } from '@/hooks/useOs'
import { useFsStore } from '@/store/fsStore'
import { basename } from '@/utils/paths'

export function useMarkdownViewRoot({ windowId, launch }: AppProps) {
  const os = useOs()
  const ready = useFsStore((s) => s.ready)
  const [source, setSource] = useState<string>('')

  useEffect(() => {
    if (!launch?.path || !ready) return
    let cancelled = false
    void os.fs
      .read(launch.path)
      .then((text) => {
        if (!cancelled) setSource(text)
      })
      .catch(() => {
        if (!cancelled) setSource(`*Could not read \`${launch.path}\`.*`)
      })
    return () => {
      cancelled = true
    }
  }, [ready, os, launch?.path])

  useEffect(() => {
    if (!launch?.path) return
    os.win.setTitle(windowId, basename(launch.path))
  }, [os, windowId, launch?.path])

  return { source }
}
