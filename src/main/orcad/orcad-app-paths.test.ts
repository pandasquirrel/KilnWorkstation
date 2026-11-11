import { mkdirSync, mkdtempSync, realpathSync, rmSync, symlinkSync, writeFileSync } from 'node:fs'
import { homedir, tmpdir } from 'node:os'

import { join, sep } from 'node:path'

import { afterEach, describe, expect, it, vi } from 'vitest'

import { resolveOrcadInstallRoot, resolveUserDataPath } from './orcad-app-paths'

const originalPlatform = Object.getOwnPropertyDescriptor(process, 'platform')!

afterEach(() => {
  Object.defineProperty(process, 'platform', originalPlatform)
  vi.unstubAllEnvs()
})

describe('resolveOrcadInstallRoot', () => {
  // Bundle siblings live beside symlink targets, not the link.
  it.skipIf(process.platform === 'win32')('follows a symlinked script to the real bundle', () => {
    const root = realpathSync(mkdtempSync(join(tmpdir(), 'orcad-install-root-')))
    try {
      const bundle = join(root, 'slot')
      const bin = join(root, 'bin')
      mkdirSync(bundle)
      mkdirSync(bin)
      writeFileSync(join(bundle, 'orcad.js'), '')
      symlinkSync(join(bundle, 'orcad.js'), join(bin, 'orcad'))
      expect(resolveOrcadInstallRoot(join(bin, 'orcad'))).toBe(bundle)
    } finally {
      rmSync(root, { recursive: true, force: true })
    }
  })
})

// FORK: upstream removed the path suites in a low-value-test cleanup (#36894); keep
// this one because it guards the fork's isolated data roots.
describe('resolveUserDataPath fork roots', () => {
  it('prefers ORCA_USER_DATA, then XDG_DATA_HOME, then ~/.kiln', () => {
    vi.stubEnv('ORCA_USER_DATA', join(sep, 'srv', 'orca-state'))
    vi.stubEnv('XDG_DATA_HOME', join(sep, 'xdg'))
    expect(resolveUserDataPath()).toBe(join(sep, 'srv', 'orca-state'))

    vi.stubEnv('ORCA_USER_DATA', '')
    expect(resolveUserDataPath()).toBe(join(sep, 'xdg', 'Kiln'))

    vi.stubEnv('XDG_DATA_HOME', '')
    expect(resolveUserDataPath()).toBe(join(homedir(), '.kiln'))
  })
})
