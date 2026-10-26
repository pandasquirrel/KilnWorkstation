import { mergeConfig, type UserConfig } from 'vitest/config'
import base from '../../config/vitest.config'

// Fork unit shards: same config as upstream, minus tests that audit
// upstream's own workflow inventory (the fork replaces those workflows).
// Run with ORCA_BALANCE_UNIT_SHARDS=1 so base.test.exclude is UNIT_EXCLUDE.
export default mergeConfig(base as unknown as UserConfig, {
  test: {
    exclude: [
      'config/scripts/ci-pr-concurrency-keys.test.mjs',
      'config/scripts/ci-draft-pr-admission.test.mjs'
    ]
  }
})
