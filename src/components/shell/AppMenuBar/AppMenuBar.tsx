import { useCallback, useEffect, useRef, useState } from 'react'
import {
  Divider,
  DropdownPanel,
  Item,
  ItemLabel,
  List,
  MenuBar,
  MenuTopBtn,
  ShortcutHint,
} from './AppMenuBar.style'
import type { AppMenuDef, AppMenuItemDef } from './AppMenuBar.types'
import { isMenuSeparator } from './AppMenuBar.types'

export type AppMenuBarProps = {
  menus: AppMenuDef[]
}

function useAppMenuBar({ menus, barRef }: AppMenuBarProps & { barRef: React.RefObject<HTMLDivElement | null> }) {
  const [openMenuId, setOpenMenuId] = useState<string | null>(null)
  const [anchorRect, setAnchorRect] = useState<DOMRect | null>(null)

  const closeMenu = useCallback(() => {
    setOpenMenuId(null)
    setAnchorRect(null)
  }, [])

  const openMenuAt = useCallback((menuId: string, el: HTMLElement) => {
    const rect = el.getBoundingClientRect()
    setOpenMenuId(menuId)
    setAnchorRect(rect)
  }, [])

  const toggleMenu = useCallback(
    (menuId: string, el: HTMLElement) => {
      if (openMenuId === menuId) {
        closeMenu()
        return
      }
      openMenuAt(menuId, el)
    },
    [openMenuId, closeMenu, openMenuAt],
  )

  useEffect(() => {
    if (!openMenuId) return

    const onPointerDown = (e: PointerEvent) => {
      const target = e.target as Node
      if (barRef.current?.contains(target)) return
      const panel = document.querySelector('[data-app-menu-dropdown]')
      if (panel?.contains(target)) return
      closeMenu()
    }

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') closeMenu()
    }

    window.addEventListener('pointerdown', onPointerDown, true)
    window.addEventListener('keydown', onKeyDown)
    return () => {
      window.removeEventListener('pointerdown', onPointerDown, true)
      window.removeEventListener('keydown', onKeyDown)
    }
  }, [openMenuId, closeMenu, barRef])

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (!e.altKey || e.ctrlKey || e.metaKey) return
      const key = e.key.toLowerCase()
      if (key.length !== 1) return
      const menu = menus.find((m) => m.label.toLowerCase().startsWith(key))
      if (!menu) return
      const btn = barRef.current?.querySelector<HTMLButtonElement>(
        `[data-menu-id="${menu.id}"]`,
      )
      if (!btn) return
      e.preventDefault()
      openMenuAt(menu.id, btn)
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [menus, openMenuAt, barRef])

  const openMenu = menus.find((m) => m.id === openMenuId)

  const selectItem = useCallback(
    (item: AppMenuItemDef) => {
      if (item.disabled) return
      closeMenu()
      item.onSelect()
    },
    [closeMenu],
  )

  return {
    menus,
    openMenu,
    anchorRect,
    toggleMenu,
    openMenuAt,
    closeMenu,
    selectItem,
    isMenuSeparator,
  }
}

function MenuDropdownItem({
  item,
  onSelect,
}: {
  item: AppMenuItemDef
  onSelect: (item: AppMenuItemDef) => void
}) {
  const label = item.checked ? `✓ ${item.label}` : item.label
  return (
    <Item
      type="button"
      role="menuitem"
      $disabled={item.disabled}
      disabled={item.disabled}
      onClick={() => onSelect(item)}
    >
      <ItemLabel>{label}</ItemLabel>
      {item.shortcut ? <ShortcutHint>{item.shortcut}</ShortcutHint> : null}
    </Item>
  )
}

export default function AppMenuBar({ menus }: AppMenuBarProps) {
  const barRef = useRef<HTMLDivElement>(null)
  const vm = useAppMenuBar({ menus, barRef })

  return (
    <>
      <MenuBar ref={barRef}>
        {vm.menus.map((menu) => (
          <MenuTopBtn
            key={menu.id}
            type="button"
            data-menu-id={menu.id}
            $open={vm.openMenu?.id === menu.id}
            onClick={(e) => vm.toggleMenu(menu.id, e.currentTarget)}
            onMouseEnter={(e) => {
              if (vm.openMenu) vm.openMenuAt(menu.id, e.currentTarget)
            }}
          >
            {menu.label}
          </MenuTopBtn>
        ))}
      </MenuBar>
      {vm.openMenu && vm.anchorRect ? (
        <DropdownPanel
          data-app-menu-dropdown
          $zIndex={25500}
          role="menu"
          style={{ left: vm.anchorRect.left, top: vm.anchorRect.bottom }}
        >
          <List>
            {vm.openMenu.items.map((entry, i) => (
              <li key={vm.isMenuSeparator(entry) ? `sep-${i}` : entry.id}>
                {vm.isMenuSeparator(entry) ? (
                  <Divider role="separator" />
                ) : (
                  <MenuDropdownItem item={entry} onSelect={vm.selectItem} />
                )}
              </li>
            ))}
          </List>
        </DropdownPanel>
      ) : null}
    </>
  )
}
