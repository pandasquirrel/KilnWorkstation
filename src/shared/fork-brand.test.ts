import { describe, expect, it } from 'vitest'

import { isBrandRenameDisabled, rebrandProductName } from './fork-brand'

describe('rebrandProductName', () => {
  it('rewrites the product name at word boundaries only', () => {
    expect(rebrandProductName('Welcome to Orca', false)).toBe('Welcome to Kiln')
    expect(rebrandProductName('ORCA', false)).toBe('KILN')
    expect(rebrandProductName("Orca's settings", false)).toBe("Kiln's settings")
    // German genitive (and the equivalent English plural) keeps the possessive suffix.
    expect(rebrandProductName('Orcas Browser verwenden', false)).toBe('Kilns Browser verwenden')
    // Commands, schemes, and paths keep their upstream spelling.
    expect(rebrandProductName('orca://workspace and orca-cli', false)).toBe(
      'orca://workspace and orca-cli'
    )
    expect(rebrandProductName('Orcadia', false)).toBe('Orcadia')
  })

  it('leaves upstream text untouched when disabled for tests', () => {
    expect(rebrandProductName('Welcome to Orca', true)).toBe('Welcome to Orca')
  })

  it('disables the rename in test and e2e builds only', () => {
    expect(isBrandRenameDisabled('test')).toBe(true)
    expect(isBrandRenameDisabled('e2e')).toBe(true)
    expect(isBrandRenameDisabled('development')).toBe(false)
    expect(isBrandRenameDisabled('production')).toBe(false)
  })
})
