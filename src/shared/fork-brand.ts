// FORK: the fork ships under a different product name. Upstream locale catalogs and
// hardcoded brand strings churn daily, so instead of rewriting ~1000 strings per locale we
// rebrand at the two translate choke points (renderer `translateUncached`, main `translateMain`).
// Automated suites assert upstream text, so the rename is skipped in test and e2e builds.

// Injected by electron.vite.config.ts for Playwright builds; absent elsewhere (see the typeof guard).
declare const KILN_BRAND_RENAME_DISABLED: boolean

export const FORK_PRODUCT_NAME = 'Kiln'

const BRAND_PATTERNS: readonly (readonly [RegExp, string])[] = [
  [/\bORCA\b/g, 'KILN'],
  // German catalogs use the genitive “Orcas”; English plural reads the same and never appears in UI copy.
  [/\bOrcas\b/g, `${FORK_PRODUCT_NAME}s`],
  [/\bOrca\b/g, FORK_PRODUCT_NAME]
]

function readBuildMode(): string | undefined {
  // Vite substitutes this define at build time; `typeof` keeps plain Node consumers safe.
  // oxlint-disable-next-line unicorn/no-typeof-undefined -- the define is absent outside Vite builds.
  if (typeof KILN_BRAND_RENAME_DISABLED !== 'undefined' && KILN_BRAND_RENAME_DISABLED) {
    return 'e2e'
  }
  return typeof process !== 'undefined' ? process.env.NODE_ENV : undefined
}

/** True for vitest (`test`) and Playwright (`e2e`) builds, which expect upstream brand text. */
export function isBrandRenameDisabled(mode: string | undefined = readBuildMode()): boolean {
  return mode === 'test' || mode === 'e2e'
}

export function rebrandProductName(
  value: string,
  renameDisabled: boolean = isBrandRenameDisabled()
): string {
  if (renameDisabled) {
    return value
  }
  let rebranded = value
  for (const [pattern, replacement] of BRAND_PATTERNS) {
    rebranded = rebranded.replace(pattern, replacement)
  }
  return rebranded
}
