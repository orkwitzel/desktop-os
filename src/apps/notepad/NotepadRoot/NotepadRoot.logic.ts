import type { AppProps } from '@/store/session/sessionTypes'

export type NotepadFieldAccess = {
  get: () => HTMLTextAreaElement | null
}

export type NotepadRootLogicProps = AppProps & {
  fieldAccess: NotepadFieldAccess
}
