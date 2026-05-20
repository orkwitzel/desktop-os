import { WindowFrame } from '@/components/wm/WindowFrame'
import { useWindowManager } from '@/hooks/useWindowManager'
import type { WindowRecord } from '@/store/session/sessionTypes'
import { Layer } from './WindowLayer.style'

export function WindowLayer() {
  const { session } = useWindowManager()

  const ordered: WindowRecord[] = session.order
    .map((id) => session.windows[id])
    .filter(Boolean)
    .sort((a, b) => a.zIndex - b.zIndex)

  return (
    <Layer>
      {ordered.map((w) => (
        <WindowFrame key={w.id} window={w} />
      ))}
    </Layer>
  )
}
