import { useCallback, useEffect, useState } from 'react'
import { useOs } from '@/hooks/useOs'
import { useFsStore } from '@/store/fsStore'
import type { FsNode } from '@/fs/types'
import { basename, dirname, extension, join, normalizePath } from '@/utils/paths'
import {
  Body,
  ButtonRow,
  Dialog,
  DialogBtn,
  FileBtn,
  FileList,
  FileRow,
  NameField,
  NameRow,
  NavBtn,
  Overlay,
  PathRow,
  TitleBar,
  TitleClose,
  TitleText,
} from './ShellFilePicker.style'
import { sortNodes, type ShellFilePickerProps } from './ShellFilePicker.logic'

function useShellFilePicker({
  mode,
  initialDir = '/docs',
  defaultFileName = '',
  onSelect,
  onCancel,
}: Omit<ShellFilePickerProps, 'open'>) {
  const os = useOs()
  const ready = useFsStore((s) => s.ready)
  const [currentDir, setCurrentDir] = useState(() => normalizePath(initialDir))
  const [listing, setListing] = useState<{ dir: string; entries: FsNode[] } | null>(null)
  const [selectedPath, setSelectedPath] = useState<string | null>(null)
  const [fileName, setFileName] = useState(defaultFileName)

  useEffect(() => {
    if (!ready) return
    let cancelled = false
    const dir = currentDir
    void os.fs
      .listChildren(dir)
      .then((children) => {
        if (cancelled) return
        const filtered =
          mode === 'open'
            ? children.filter(
                (n) => n.kind === 'directory' || extension(n.name).toLowerCase() === '.txt',
              )
            : children.filter((n) => n.kind === 'directory')
        setListing({ dir, entries: sortNodes(filtered) })
      })
      .catch(() => {
        if (!cancelled) setListing({ dir, entries: [] })
      })
    return () => {
      cancelled = true
    }
  }, [ready, os, currentDir, mode])

  const loading = !listing || listing.dir !== currentDir
  const entries = loading ? [] : listing.entries

  const goUp = useCallback(() => {
    const parent = dirname(currentDir)
    setCurrentDir(parent)
    setSelectedPath(null)
  }, [currentDir])

  const openEntry = useCallback(
    (node: FsNode) => {
      if (node.kind === 'directory') {
        setCurrentDir(normalizePath(node.path))
        setSelectedPath(null)
        return
      }
      setSelectedPath(node.path)
      setFileName(basename(node.path))
    },
    [],
  )

  const confirm = useCallback(() => {
    if (mode === 'open') {
      if (selectedPath) {
        onSelect(selectedPath)
        return
      }
      return
    }
    const trimmed = fileName.trim().replace(/[/\\]/g, '')
    if (!trimmed) return
    let name = trimmed
    if (extension(name).toLowerCase() !== '.txt') {
      name = `${name}.txt`
    }
    const dest = join(currentDir, name)
    onSelect(normalizePath(dest))
  }, [mode, selectedPath, fileName, currentDir, onSelect])

  const canConfirm =
    mode === 'open' ? selectedPath !== null : fileName.trim().length > 0

  const title = mode === 'open' ? 'Open' : 'Save As'

  return {
    title,
    currentDir,
    entries,
    selectedPath,
    fileName,
    setFileName,
    loading,
    canConfirm,
    goUp,
    openEntry,
    confirm,
    onCancel,
    canGoUp: currentDir !== '/',
  }
}

export default function ShellFilePicker(props: ShellFilePickerProps) {
  if (!props.open) return null

  return <ShellFilePickerOpen {...props} />
}

function ShellFilePickerOpen(props: ShellFilePickerProps) {
  const vm = useShellFilePicker(props)

  return (
    <Overlay
      role="presentation"
      data-shell-modal
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) vm.onCancel()
      }}
    >
      <Dialog role="dialog" aria-labelledby="shell-filepicker-title" onMouseDown={(e) => e.stopPropagation()}>
        <TitleBar>
          <TitleText id="shell-filepicker-title">{vm.title}</TitleText>
          <TitleClose type="button" aria-label="Close" onClick={vm.onCancel}>
            ×
          </TitleClose>
        </TitleBar>
        <PathRow>
          <NavBtn type="button" disabled={!vm.canGoUp} onClick={vm.goUp} aria-label="Up">
            ↑
          </NavBtn>
          <span>{vm.currentDir}</span>
        </PathRow>
        <Body>
          <FileList>
            {vm.loading ? (
              <FileRow>
                <FileBtn type="button" disabled>
                  Loading…
                </FileBtn>
              </FileRow>
            ) : !vm.entries || vm.entries.length === 0 ? (
              <FileRow>
                <FileBtn type="button" disabled>
                  (empty)
                </FileBtn>
              </FileRow>
            ) : (
              vm.entries.map((node) => (
                <FileRow key={node.path}>
                  <FileBtn
                    type="button"
                    $selected={vm.selectedPath === node.path}
                    onClick={() => vm.openEntry(node)}
                    onDoubleClick={() => {
                      if (node.kind === 'directory') return
                      vm.openEntry(node)
                      if (props.mode === 'open') vm.confirm()
                    }}
                  >
                    {node.kind === 'directory' ? `📁 ${node.name}` : `📄 ${node.name}`}
                  </FileBtn>
                </FileRow>
              ))
            )}
          </FileList>
          {props.mode === 'saveAs' ? (
            <NameRow>
              <label htmlFor="shell-filepicker-name">File name:</label>
              <NameField
                id="shell-filepicker-name"
                value={vm.fileName}
                onChange={(e) => vm.setFileName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && vm.canConfirm) {
                    e.preventDefault()
                    vm.confirm()
                  }
                }}
              />
            </NameRow>
          ) : null}
        </Body>
        <ButtonRow>
          <DialogBtn type="button" $default disabled={!vm.canConfirm} onClick={vm.confirm}>
            {props.mode === 'open' ? 'Open' : 'Save'}
          </DialogBtn>
          <DialogBtn type="button" onClick={vm.onCancel}>
            Cancel
          </DialogBtn>
        </ButtonRow>
      </Dialog>
    </Overlay>
  )
}
