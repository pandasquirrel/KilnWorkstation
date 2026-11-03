import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

const hooks = readFileSync(
  new URL('../nsis/orca-installer-hooks.nsh', import.meta.url),
  'utf8'
).replaceAll('\r\n', '\n')

describe('NSIS install isolation', () => {
  // electron-builder's one-click installer names the install directory, the updater cache and the
  // --delete-app-data target after package.json "name" ("orca"). Without these overrides Kiln
  // installs over a stock Orca install and can remove its app data on uninstall.
  it('moves the install directory and app-data cleanup onto the fork name', () => {
    expect(hooks).toMatch(
      /^!ifdef APP_FILENAME\n  !undef APP_FILENAME\n  !define APP_FILENAME "Kiln"$/m
    )
    expect(hooks).toMatch(
      /^!ifdef APP_PACKAGE_NAME\n  !undef APP_PACKAGE_NAME\n  !define APP_PACKAGE_NAME "Kiln"$/m
    )
  })

  it('moves the updater installer cache off the shared orca-updater directory', () => {
    expect(hooks).toMatch(
      /^!ifdef APP_INSTALLER_STORE_FILE\n  !undef APP_INSTALLER_STORE_FILE\n  !define APP_INSTALLER_STORE_FILE "Kiln-updater\\installer\.exe"$/m
    )
  })
})
