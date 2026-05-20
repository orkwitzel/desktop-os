import {
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from 'react'
import {
  formatWidgetDate,
  formatWidgetTime,
  formatWidgetTimezone,
  useLiveClock,
} from '@/utils/liveClock'
import { AnalogClock } from './AnalogClock'
import { CLOCK_WIDGET_ID, type ClockWidgetProps } from './ClockWidget.logic'
import {
  DateLine,
  DigitalTime,
  TimezoneId,
  TimezoneShort,
  WidgetPanel,
} from './ClockWidget.style'

export { CLOCK_WIDGET_ID } from './ClockWidget.logic'

function useClockWidget({ open, onClose, anchorRef, trayButtonId }: ClockWidgetProps) {
  const panelRef = useRef<HTMLDivElement>(null)
  const [position, setPosition] = useState<{ right: number; bottom: number } | null>(null)
  const now = useLiveClock('second')

  useLayoutEffect(() => {
    if (!open) return
    const el = anchorRef.current
    if (!el) return
    const rect = el.getBoundingClientRect()
    setPosition({
      right: window.innerWidth - rect.right,
      bottom: window.innerHeight - rect.top + 2,
    })
  }, [open, anchorRef])

  useEffect(() => {
    if (!open) return

    const onPointerDown = (e: PointerEvent) => {
      const target = e.target as Node
      if (panelRef.current?.contains(target)) return
      if (anchorRef.current?.contains(target)) return
      onClose()
    }

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }

    document.addEventListener('pointerdown', onPointerDown, true)
    document.addEventListener('keydown', onKeyDown)
    return () => {
      document.removeEventListener('pointerdown', onPointerDown, true)
      document.removeEventListener('keydown', onKeyDown)
    }
  }, [open, onClose, anchorRef])

  const timezone = formatWidgetTimezone(now)

  return {
    open,
    trayButtonId,
    panelRef,
    position,
    now,
    time: formatWidgetTime(now),
    date: formatWidgetDate(now),
    timezone,
  }
}

export function ClockWidget(props: ClockWidgetProps) {
  const { open, trayButtonId, panelRef, position, now, time, date, timezone } =
    useClockWidget(props)

  if (!open || !position) return null

  return (
    <WidgetPanel
      ref={panelRef}
      id={CLOCK_WIDGET_ID}
      role="dialog"
      aria-label="Clock"
      aria-labelledby={trayButtonId}
      style={{ right: position.right, bottom: position.bottom }}
    >
      <AnalogClock now={now} />
      <DigitalTime>{time}</DigitalTime>
      <DateLine>{date}</DateLine>
      <TimezoneId>{timezone.iana}</TimezoneId>
      {timezone.short ? (
        <TimezoneShort>({timezone.short})</TimezoneShort>
      ) : null}
    </WidgetPanel>
  )
}
