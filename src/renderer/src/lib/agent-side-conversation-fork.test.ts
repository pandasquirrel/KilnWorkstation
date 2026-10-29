import { getDefaultSettings } from '../../../shared/constants'
import type { AgentProviderSessionMetadata } from '../../../shared/agent-session-resume'
import { TEST_REPO, makeWorktree } from '../store/slices/worktrees-slice-test-fixtures'
import { describe, expect, it, vi } from 'vitest'

vi.mock('@/lib/new-workspace', () => ({
  CLIENT_PLATFORM: 'darwin'
}))

import {
  buildSideConversationForkCommand,
  canForkSideConversation
} from './agent-side-conversation-fork'

type SideConversationState = Parameters<typeof buildSideConversationForkCommand>[0]['state']

const WORKTREE_ID = 'repo-1::worktree-1'

function makeState(): SideConversationState {
  return {
    activeRepoId: 'repo-1',
    activeWorktreeId: WORKTREE_ID,
    folderWorkspaces: [],
    projectGroups: [],
    repos: [{ ...TEST_REPO, id: 'repo-1', path: '/home/alice/repo' }],
    projects: [
      {
        displayName: 'repo',
        badgeColor: '',
        createdAt: 0,
        updatedAt: 0,
        id: 'repo-1',
        sourceRepoIds: ['repo-1']
      }
    ],
    settings: { ...getDefaultSettings('/tmp'), agentDefaultArgs: {}, agentDefaultEnv: {} },
    worktreesByRepo: {
      'repo-1': [makeWorktree({ id: WORKTREE_ID, repoId: 'repo-1', path: '/home/alice/repo' })]
    }
  }
}

function command(
  agent: string,
  providerSession: AgentProviderSessionMetadata = { key: 'session_id', id: 'session-1' }
) {
  return buildSideConversationForkCommand({
    state: makeState(),
    worktreeId: WORKTREE_ID,
    agent,
    providerSession
  })
}

describe('side conversation fork command', () => {
  it('forks a Claude conversation into a new id', () => {
    const line = command('claude')?.replaceAll("'", '')
    expect(line).toContain('claude ')
    expect(line).toContain('--resume session-1 --fork-session')
  })

  it('forks a Codex conversation in the pane folder', () => {
    const line = command('codex')?.replaceAll("'", '')
    expect(line).toContain('codex ')
    expect(line).toContain('tui.resume_cwd=current')
    expect(line).toContain('fork session-1')
  })

  it('refuses agents whose CLI resume would keep the same conversation id', () => {
    expect(command('opencode')).toBeNull()
    expect(canForkSideConversation('opencode', { key: 'session_id', id: 'session-1' })).toBe(false)
  })

  it('refuses a fork without a live provider session', () => {
    expect(canForkSideConversation('claude', null)).toBe(false)
    expect(
      buildSideConversationForkCommand({
        state: makeState(),
        worktreeId: WORKTREE_ID,
        agent: 'claude',
        providerSession: null
      })
    ).toBeNull()
  })
})
