import type { RefObject } from 'react'

export const CLOCK_WIDGET_ID = 'clock-widget'

export type ClockWidgetProps = {
  open: boolean
  onClose: () => void
  anchorRef: RefObject<HTMLButtonElement | null>
  trayButtonId: string
}
