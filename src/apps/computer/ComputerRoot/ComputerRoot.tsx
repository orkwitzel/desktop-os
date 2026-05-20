import { useCallback, useEffect, useLayoutEffect, useMemo, useReducer, useRef } from 'react'
import type { AppProps } from '@/store/session/sessionTypes'
import {
  AppBody,
  ExplorerColumn,
  MainColumn,
  TreePane,
} from '@/apps/computer/computer.style'
import FsExplorerToolbar from '@/apps/computer/FsExplorerToolbar'
import FsFolderView from '@/apps/computer/FsFolderView'
import FsPlaces from '@/apps/computer/FsPlaces'
import FsPreviewPane from '@/apps/computer/FsPreviewPane'
import FsTree from '@/apps/computer/FsTree'
import { nextUntitledPath } from '@/fs/fsOperations'
import { useOs } from '@/hooks/useOs'
import { useFsStore } from '@/store/fsStore'
import { dirname, parentPath } from '@/utils/paths'
import {
  registerComputerNavigator,
  unregisterComputerNavigator,
} from '@/apps/computer/computerNavigation'
import { childrenOf } from '@/apps/computer/FsTree/FsTree.logic'
import { explorerReducer, resolveLaunch } from './ComputerRoot.logic'

function useComputerRoot({ windowId, launch }: AppProps) {
  const os = useOs()
  const nodes = useFsStore((s) => s.nodes)
  const fs = useFsStore((s) => s.fs)
  const ready = useFsStore((s) => s.ready)

  const [explorer, dispatch] = useReducer(explorerReducer, undefined, () => {
    const entry = resolveLaunch(launch, [])
    return {
      currentDir: entry.dir,
      selectedPath: entry.selected,
      history: [entry],
      historyIndex: 0,
    }
  })

  const hydrated = useRef(false)
  const explorerRef = useRef({ currentDir: '/', selectedPath: null as string | null, nodes })
  useEffect(() => {
    if (!ready || hydrated.current) return
    hydrated.current = true
    dispatch({ type: 'RESET', entry: resolveLaunch(launch, nodes) })
  }, [ready, launch, nodes])

  const { currentDir, selectedPath, history, historyIndex } = explorer

  useLayoutEffect(() => {
    explorerRef.current = { currentDir, selectedPath, nodes }
  })

  const getCreateParentDir = useCallback(
    () =>
      os.explorer.resolveCreateParentDir(
        explorerRef.current.currentDir,
        explorerRef.current.selectedPath,
        explorerRef.current.nodes,
      ),
    [os],
  )

  const canGoBack = historyIndex > 0
  const canGoForward = historyIndex < history.length - 1
  const canGoUp = parentPath(currentDir) !== null

  const folderChildren = useMemo(
    () => childrenOf(nodes, currentDir),
    [nodes, currentDir],
  )

  const goTo = useCallback((dir: string, selected: string | null = null) => {
    dispatch({ type: 'GO_TO', dir, selected })
  }, [])

  const goBack = useCallback(() => dispatch({ type: 'BACK' }), [])
  const goForward = useCallback(() => dispatch({ type: 'FORWARD' }), [])

  const goUp = useCallback(() => {
    const parent = parentPath(currentDir)
    if (parent) goTo(parent)
  }, [currentDir, goTo])

  const goHome = useCallback(() => goTo('/'), [goTo])

  const selectFile = useCallback((path: string | null) => {
    dispatch({ type: 'SELECT', path })
  }, [])

  const openItem = useCallback(
    (path: string) => {
      const node = nodes.find((n) => n.path === path)
      if (node?.kind === 'directory') {
        goTo(path)
        return
      }
      void os.fs.open(path)
    },
    [nodes, goTo, os],
  )

  const onSelectFolder = useCallback(
    (path: string) => {
      goTo(path)
    },
    [goTo],
  )

  const onSelectFile = useCallback(
    (path: string) => {
      selectFile(path)
    },
    [selectFile],
  )

  const onTreeSelectFile = useCallback(
    (path: string) => {
      goTo(dirname(path), path)
    },
    [goTo],
  )

  const onOpenItem = useCallback(
    (path: string) => {
      openItem(path)
    },
    [openItem],
  )

  const revealCreated = useCallback(
    (finalPath: string) => {
      goTo(dirname(finalPath), finalPath)
    },
    [goTo],
  )

  const onNewFolder = useCallback(() => {
    const parentDir = getCreateParentDir()
    void (async () => {
      const final = await os.fs.create.folderWithRename(parentDir)
      revealCreated(final)
    })()
  }, [os, getCreateParentDir, revealCreated])

  const onNewTextDocument = useCallback(() => {
    const parentDir = getCreateParentDir()
    void (async () => {
      const final = await os.fs.create.textDocument(parentDir)
      revealCreated(final)
    })()
  }, [os, getCreateParentDir, revealCreated])

  const onNewShortcut = useCallback(() => {
    if (!fs) return
    void (async () => {
      const target = await nextUntitledPath(fs, '/docs')
      await fs.writeFile(target, '')
      await os.fs.create.shortcutOnDesktop(target)
    })()
  }, [fs, os])

  useEffect(() => {
    registerComputerNavigator(windowId, {
      navigate: goTo,
      openItem,
      getCreateParentDir,
    })
    return () => unregisterComputerNavigator(windowId)
  }, [windowId, goTo, openItem, getCreateParentDir])

  return {
    nodes,
    currentDir,
    selectedPath,
    folderChildren,
    canGoBack,
    canGoForward,
    canGoUp,
    goBack,
    goForward,
    goUp,
    goHome,
    goTo,
    onSelectFolder,
    onSelectFile,
    onTreeSelectFile,
    onOpenItem,
    selectFile,
    openItem,
    onNewFolder,
    onNewTextDocument,
    onNewShortcut,
  }
}

export default function ComputerRoot(props: AppProps) {
  const vm = useComputerRoot(props)

  const onFolderSelect = (path: string) => {
    vm.selectFile(path)
  }

  const onFolderOpen = (path: string) => {
    vm.onOpenItem(path)
  }

  return (
    <ExplorerColumn data-computer-explorer>
      <FsExplorerToolbar
        currentDir={vm.currentDir}
        canGoBack={vm.canGoBack}
        canGoForward={vm.canGoForward}
        canGoUp={vm.canGoUp}
        onBack={vm.goBack}
        onForward={vm.goForward}
        onUp={vm.goUp}
        onHome={vm.goHome}
        onNewFolder={vm.onNewFolder}
        onNewTextDocument={vm.onNewTextDocument}
        onNewShortcut={vm.onNewShortcut}
      />
      <AppBody>
        <TreePane>
          <FsPlaces currentDir={vm.currentDir} onNavigate={vm.goTo} />
          <FsTree
            nodes={vm.nodes}
            currentDir={vm.currentDir}
            selectedPath={vm.selectedPath}
            onNavigate={vm.onSelectFolder}
            onSelectFile={vm.onTreeSelectFile}
          />
        </TreePane>
        <MainColumn>
          <FsFolderView
            currentDir={vm.currentDir}
            children={vm.folderChildren}
            selectedPath={vm.selectedPath}
            onSelect={onFolderSelect}
            onOpen={onFolderOpen}
          />
          <FsPreviewPane selectedPath={vm.selectedPath} />
        </MainColumn>
      </AppBody>
    </ExplorerColumn>
  )
}
