import type { NormalGeometry, WindowRecord } from '@/store/session/sessionTypes'

export type ResizeEdge = 'se' | 'e' | 's'

export function geometryForRecord(win: WindowRecord): NormalGeometry {
  if (win.geometry.mode === 'normal') return win.geometry.geometry
  if (win.geometry.mode === 'maximized') return win.geometry.frame
  return win.geometry.restored
}
