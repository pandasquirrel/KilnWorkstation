import type { ManagedPane } from '@/lib/pane-manager/pane-manager-types'
import type { PaneCwdMap } from '../layout/split/resolve-split-cwd'
import { copyAgentSessionContextFromPane } from '../clipboard/terminal-agent-session-context-copy'
import {
  prepareAgentSessionForkFromPane,
  type PreparedAgentSessionFork
} from '../session-fork/terminal-agent-session-fork'
import { prepareAgentSessionContinuationFromPane } from '../session-continuation/terminal-agent-session-continuation'
import { openSideConversationFromPane } from '../terminal-pane-side-conversation'
import type { AgentSessionContinuationRequest } from '@/lib/agent-session/context/agent-session-continuation'

export type TerminalPaneMenuAgentSessionContext = {
  paneCwdRef: React.RefObject<PaneCwdMap>
  tabId: string
  worktreeId: string
  groupId: string | null
  fallbackCwd: string
  onAgentSessionForkReady: (fork: PreparedAgentSessionFork) => void
  onAgentSessionContinuationReady: (request: AgentSessionContinuationRequest) => void
}

export const forkAgentSessionFromMenuPane = async (
  context: TerminalPaneMenuAgentSessionContext,
  pane: ManagedPane | null
): Promise<void> => {
  if (!pane) {
    return
  }
  const { tabId, worktreeId, groupId } = context
  const fork = prepareAgentSessionForkFromPane({ pane, tabId, worktreeId, groupId })
  if (fork) {
    context.onAgentSessionForkReady(fork)
  }
}

export const continueAgentSessionFromMenuPane = (
  context: TerminalPaneMenuAgentSessionContext,
  pane: ManagedPane | null
): void => {
  if (!pane) {
    return
  }
  const { tabId, worktreeId, groupId, fallbackCwd } = context
  const initialCwd = context.paneCwdRef.current.get(pane.id)?.cwd || fallbackCwd
  const request = prepareAgentSessionContinuationFromPane({
    pane,
    tabId,
    worktreeId,
    groupId,
    workspacePath: fallbackCwd,
    initialCwd
  })
  if (request) {
    context.onAgentSessionContinuationReady(request)
  }
}

// Copy standalone bounded context without fork framing or opening the fork dialog (#5020).
export const openSideConversationFromMenuPane = (
  context: Pick<TerminalPaneMenuAgentSessionContext, 'tabId' | 'worktreeId'>,
  pane: ManagedPane | null
): void => {
  if (pane) {
    openSideConversationFromPane({ pane, tabId: context.tabId, worktreeId: context.worktreeId })
  }
}

export const copyAgentSessionContextFromMenuPane = async (
  pane: ManagedPane | null
): Promise<void> => {
  if (!pane) {
    return
  }
  await copyAgentSessionContextFromPane(pane)
}

export function createTerminalPaneMenuAgentSessionActions({
  agentSessionContext,
  resolveMenuPane
}: {
  agentSessionContext: TerminalPaneMenuAgentSessionContext
  resolveMenuPane: () => ManagedPane | null
}) {
  const onForkAgentSession = async (): Promise<void> =>
    forkAgentSessionFromMenuPane(agentSessionContext, resolveMenuPane())

  const onContinueAgentSessionInNewSession = (): void =>
    continueAgentSessionFromMenuPane(agentSessionContext, resolveMenuPane())

  const onCopyAgentSessionContext = async (): Promise<void> =>
    copyAgentSessionContextFromMenuPane(resolveMenuPane())

  // FORK: side conversation forks the pane into a split without opening the fork dialog.
  const onOpenSideConversation = (): void =>
    openSideConversationFromMenuPane(agentSessionContext, resolveMenuPane())

  return {
    onForkAgentSession,
    onContinueAgentSessionInNewSession,
    onCopyAgentSessionContext,
    onOpenSideConversation
  }
}
