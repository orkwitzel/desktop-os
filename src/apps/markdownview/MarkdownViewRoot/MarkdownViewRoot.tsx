import type { AppProps } from '@/store/session/sessionTypes'
import { MarkdownView } from '@/components/shared/MarkdownView'
import { useMarkdownViewRoot } from './MarkdownViewRoot.logic'
import { AppBody } from './MarkdownViewRoot.style'

export default function MarkdownViewRoot(props: AppProps) {
  const { source } = useMarkdownViewRoot(props)

  return (
    <AppBody>
      <MarkdownView source={source} />
    </AppBody>
  )
}
