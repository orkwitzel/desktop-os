import { useCallback, useMemo, useState } from 'react'
import type { AppProps } from '@/store/session/sessionTypes'
import type { ColorSchemeId } from '@/theme/tokens'
import { useOs } from '@/hooks/useOs'
import { useOsSettings } from '@/hooks/useOsSettings'
import { COLOR_SCHEME_PRESETS } from '@/theme/presets'
import type { SettingsSection } from './SettingsRoot.logic'
import {
  AppBody,
  BrowseBtn,
  ColorRow,
  ContentPane,
  FieldGroup,
  HexInput,
  Hint,
  Legend,
  NavButton,
  NavItem,
  NavList,
  NavPane,
  OptionRow,
  SchemePreview,
  SectionTitle,
} from './SettingsRoot.style'

const SECTIONS: { id: SettingsSection; label: string }[] = [
  { id: 'appearance', label: 'Appearance' },
  { id: 'display', label: 'Display' },
]

function useSettingsRoot(props: AppProps) {
  void props.windowId
  const os = useOs()
  const settings = useOsSettings()
  const [section, setSection] = useState<SettingsSection>('appearance')

  const colorSchemes = useMemo(() => os.settings.listColorSchemes(), [os])
  const fontSizes = useMemo(() => os.settings.listFontSizes(), [os])

  const schemePreviews = useMemo(
    () =>
      colorSchemes.map(({ id }) => {
        const tokens = COLOR_SCHEME_PRESETS[id as ColorSchemeId]
        return {
          id,
          from: tokens.titlebarActiveFrom,
          to: tokens.titlebarActiveTo,
        }
      }),
    [colorSchemes],
  )

  const wallpaperHex =
    settings.wallpaper.kind === 'color' ? settings.wallpaper.value : '#018281'

  const onColorScheme = useCallback(
    (id: ColorSchemeId) => os.settings.setColorScheme(id),
    [os],
  )

  const onCursorMode = useCallback(
    (mode: 'winxp' | 'system') => os.settings.setCursorMode(mode),
    [os],
  )

  const onWallpaperColor = useCallback(
    (value: string) => os.settings.setWallpaperColor(value),
    [os],
  )

  const onFontSize = useCallback(
    (size: 'small' | 'medium' | 'large') => os.settings.setFontSize(size),
    [os],
  )

  return {
    section,
    setSection,
    settings,
    colorSchemes,
    schemePreviews,
    fontSizes,
    wallpaperHex,
    onColorScheme,
    onCursorMode,
    onWallpaperColor,
    onFontSize,
  }
}

export default function SettingsRoot(props: AppProps) {
  const vm = useSettingsRoot(props)

  return (
    <AppBody>
      <NavPane>
        <NavList>
          {SECTIONS.map(({ id, label }) => (
            <NavItem key={id}>
              <NavButton
                type="button"
                $active={vm.section === id}
                onClick={() => vm.setSection(id)}
              >
                {label}
              </NavButton>
            </NavItem>
          ))}
        </NavList>
      </NavPane>

      <ContentPane>
        {vm.section === 'appearance' && (
          <>
            <SectionTitle>Appearance</SectionTitle>
            <FieldGroup>
              <Legend>Color scheme</Legend>
              {vm.colorSchemes.map(({ id, label }) => {
                const preview = vm.schemePreviews.find((p) => p.id === id)
                return (
                  <OptionRow key={id}>
                    <input
                      type="radio"
                      name="colorScheme"
                      checked={vm.settings.colorScheme === id}
                      onChange={() => vm.onColorScheme(id as ColorSchemeId)}
                    />
                    {preview && (
                      <SchemePreview $from={preview.from} $to={preview.to} />
                    )}
                    <span>{label}</span>
                  </OptionRow>
                )
              })}
            </FieldGroup>

            <FieldGroup>
              <Legend>Cursor</Legend>
              <OptionRow>
                <input
                  type="radio"
                  name="cursorMode"
                  checked={vm.settings.cursorMode === 'winxp'}
                  onChange={() => vm.onCursorMode('winxp')}
                />
                <span>Windows XP (in-app)</span>
              </OptionRow>
              <OptionRow>
                <input
                  type="radio"
                  name="cursorMode"
                  checked={vm.settings.cursorMode === 'system'}
                  onChange={() => vm.onCursorMode('system')}
                />
                <span>System default</span>
              </OptionRow>
            </FieldGroup>
          </>
        )}

        {vm.section === 'display' && (
          <>
            <SectionTitle>Display</SectionTitle>
            <FieldGroup>
              <Legend>Desktop wallpaper</Legend>
              <ColorRow>
                <input
                  type="color"
                  value={vm.wallpaperHex}
                  onChange={(e) => vm.onWallpaperColor(e.target.value)}
                  aria-label="Wallpaper color"
                />
                <HexInput
                  type="text"
                  value={vm.wallpaperHex}
                  onChange={(e) => vm.onWallpaperColor(e.target.value)}
                  spellCheck={false}
                />
                <BrowseBtn type="button" disabled title="Image wallpapers coming soon">
                  Browse…
                </BrowseBtn>
              </ColorRow>
              <Hint>Image wallpapers coming soon.</Hint>
            </FieldGroup>

            <FieldGroup>
              <Legend>Font size</Legend>
              {vm.fontSizes.map(({ id, label }) => (
                <OptionRow key={id}>
                  <input
                    type="radio"
                    name="fontSize"
                    checked={vm.settings.fontSize === id}
                    onChange={() => vm.onFontSize(id)}
                  />
                  <span>
                    {label} ({id === 'small' ? '10' : id === 'medium' ? '11' : '13'}px)
                  </span>
                </OptionRow>
              ))}
            </FieldGroup>
          </>
        )}
      </ContentPane>
    </AppBody>
  )
}
