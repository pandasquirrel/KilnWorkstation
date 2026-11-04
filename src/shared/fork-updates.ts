// FORK: Kiln has no release channel of its own yet. Until it publishes one, the app must never
// query upstream Orca's feed: an accepted "update" downloads the official Orca installer, which
// installs beside Kiln and leaves Kiln's own version untouched (and used to overwrite it outright
// before install-path isolation).
//
// Unit tests keep exercising the upstream plumbing (as before the fork) so re-enabling later stays
// covered; packaged builds run with NODE_ENV=production and never reach the upstream feed. Flip
// this constant once Kiln ships signed release artifacts and the packaging `publish` target points
// at the fork (also rename the updater cache directory, which electron-updater currently derives
// from package.json "name" as `orca-updater`).
// `process` is guaranteed in both the packaged main process and vitest; no guard needed.
const isTestRuntime = process.env.NODE_ENV === 'test'
export const FORK_UPSTREAM_UPDATES_ENABLED = isTestRuntime
