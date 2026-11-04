import { beforeEach, describe, expect, it, vi } from 'vitest'
import { loadUpdaterModule, warmUpdaterModule } from './testing/updater-test-module-loader'
import { updaterMainWindow } from './testing/updater-test-main-window'

const { appMock, autoUpdaterMock, powerMonitorOnMock, moduleFactories, resetUpdaterMocks } =
  await vi.hoisted(async () =>
    (await import('./testing/updater-test-harness')).createUpdaterMocks()
  )

vi.mock('electron', () => moduleFactories.electron())
vi.mock('electron-updater', () => moduleFactories.electronUpdater())
vi.mock('./electron-updater-loader', () => moduleFactories.electronUpdaterLoader())
vi.mock('../ipc/pty/kill-all', () => moduleFactories.ptyKillAll())
vi.mock('./linux-package/linux-update-package-type', () =>
  moduleFactories.linuxUpdatePackageType()
)
vi.mock('./updater-lifecycle-diagnostics', () => moduleFactories.updaterLifecycleDiagnostics())
vi.mock('./releases/updater-changelog', () => moduleFactories.updaterChangelog())
vi.mock('./nudges/nudge-campaign', () => moduleFactories.updaterNudge())
vi.mock('./update-install-exit-watchdog', () => moduleFactories.updateInstallExitWatchdog())
vi.mock('./releases/updater-prerelease-feed', () => moduleFactories.updaterPrereleaseFeed())
vi.mock('../local-builds/local-build-switch', () => moduleFactories.localBuildSwitch())
vi.mock('../local-builds/local-build-feed-server', () => moduleFactories.localBuildFeedServer())
// FORK: force the fork's shipping value; the other updater suites run with the test-runtime override.
vi.mock('../../shared/fork-updates', () => ({ FORK_UPSTREAM_UPDATES_ENABLED: false }))

warmUpdaterModule()

describe('fork updater disable', () => {
  beforeEach(() => {
    resetUpdaterMocks()
  })

  it('never wires electron-updater against upstream Orca in a packaged build', async () => {
    appMock.isPackaged = true
    const { setupAutoUpdater } = await loadUpdaterModule()

    setupAutoUpdater(updaterMainWindow(vi.fn()))

    expect(autoUpdaterMock.setFeedURL).not.toHaveBeenCalled()
    expect(autoUpdaterMock.checkForUpdates).not.toHaveBeenCalled()
    expect(powerMonitorOnMock).not.toHaveBeenCalled()
  })
})
