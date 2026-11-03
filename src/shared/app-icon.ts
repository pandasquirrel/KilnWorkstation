// FORK: icon options are labelled with the fork's product name.
export const APP_ICON_OPTIONS = [
  { id: 'classic', label: 'Classic Kiln' },
  { id: 'watercolor', label: 'Watercolor Kiln' },
  { id: 'blue', label: 'Blue Kiln' }
] as const

export type AppIconId = (typeof APP_ICON_OPTIONS)[number]['id']

export const DEFAULT_APP_ICON_ID: AppIconId = 'classic'

export function normalizeAppIconId(value: unknown): AppIconId {
  return APP_ICON_OPTIONS.some((option) => option.id === value)
    ? (value as AppIconId)
    : DEFAULT_APP_ICON_ID
}
