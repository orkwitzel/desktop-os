import { useEffect, useState, type ReactNode } from 'react'
import { useOs } from '@/hooks/useOs'
import { useFsStore } from '@/store/fsStore'
import { basename, extension } from '@/utils/paths'
import { MarkdownView } from '@/components/shared/MarkdownView'
import { openExternalLink } from '@/utils/openExternalLink'
import type { AppFile, WwwFile } from '@/fs/types'
import {
  DetailActions,
  DetailMessage,
  DetailPre,
  PreviewBody,
  PreviewPane,
  ToolbarBtn,
} from '@/apps/computer/computer.style'
import {
  parseApp,
  parseWww,
  type FsPreviewPaneProps,
} from './FsPreviewPane.logic'

function PreviewActionBar({ onOpen, label = 'Open' }: { onOpen: () => void; label?: string }) {
  return (
    <DetailActions>
      <ToolbarBtn type="button" onClick={onOpen}>
        {label}
      </ToolbarBtn>
    </DetailActions>
  )
}

function WwwPreview({ www }: { www: WwwFile }) {
  return (
    <>
      <DetailPre>
        <strong>{www.name ?? 'Link'}</strong>
        {'\n'}
        {www.url}
      </DetailPre>
      <PreviewActionBar onOpen={() => openExternalLink(www.url)} label="Open in new tab" />
    </>
  )
}

function AppPreview({ app, onOpen }: { app: AppFile; onOpen: () => void }) {
  return (
    <>
      <DetailPre>
        App: {app.appId}
        {app.title ? `\nTitle: ${app.title}` : ''}
      </DetailPre>
      <PreviewActionBar onOpen={onOpen} />
    </>
  )
}

function useFsPreviewPane({ selectedPath }: FsPreviewPaneProps) {
  const os = useOs()
  const ready = useFsStore((s) => s.ready)
  const [content, setContent] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!selectedPath || !ready) {
      // Reset preview when selection clears or FS is not ready
      void Promise.resolve().then(() => {
        setContent(null)
        setError(null)
      })
      return
    }

    let cancelled = false
    os.fs
      .read(selectedPath)
      .then((text) => {
        if (!cancelled) {
          setContent(text)
          setError(null)
        }
      })
      .catch(() => {
        if (!cancelled) {
          setContent(null)
          setError('Could not read file.')
        }
      })

    return () => {
      cancelled = true
    }
  }, [ready, os, selectedPath])

  const ext = selectedPath ? extension(selectedPath) : ''

  const openInNotepad = () => {
    if (!selectedPath) return
    os.win.openApp('notepad', {
      title: basename(selectedPath),
      launch: { path: selectedPath },
    })
  }

  return {
    selectedPath,
    content,
    error,
    ext,
    openPath: (path: string) => os.fs.open(path),
    openInNotepad,
  }
}

export default function FsPreviewPane(props: FsPreviewPaneProps) {
  const vm = useFsPreviewPane(props)
  const nodes = useFsStore((s) => s.nodes)
  const node = vm.selectedPath ? nodes.find((n) => n.path === vm.selectedPath) : null

  if (!vm.selectedPath || !node || node.kind !== 'file') return null

  let body: ReactNode = null

  if (vm.error) {
    body = <DetailMessage>{vm.error}</DetailMessage>
  } else if (vm.content !== null) {
    switch (vm.ext) {
      case '.md':
        body = <MarkdownView source={vm.content} />
        break
      case '.www': {
        const www = parseWww(vm.content)
        body = www ? (
          <WwwPreview www={www} />
        ) : (
          <DetailMessage>Invalid .www JSON.</DetailMessage>
        )
        break
      }
      case '.app': {
        const app = parseApp(vm.content)
        body = app ? (
          <AppPreview app={app} onOpen={() => void vm.openPath(vm.selectedPath!)} />
        ) : (
          <DetailMessage>Invalid .app JSON.</DetailMessage>
        )
        break
      }
      case '.desktop':
        body = <DetailPre>{vm.content}</DetailPre>
        break
      case '.txt':
        body = (
          <>
            <DetailMessage>Plain text file — double-click or Open to edit in Notepad.</DetailMessage>
            <PreviewActionBar onOpen={vm.openInNotepad} label="Open in Notepad" />
          </>
        )
        break
      default:
        body = <DetailMessage>Unsupported file type: {vm.ext || '(none)'}</DetailMessage>
    }
  }

  if (!body) return null

  return (
    <PreviewPane>
      <PreviewBody>{body}</PreviewBody>
    </PreviewPane>
  )
}
