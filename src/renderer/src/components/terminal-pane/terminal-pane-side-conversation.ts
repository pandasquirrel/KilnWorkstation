import { toast } from 'sonner'
import type { ManagedPane } from '@/lib/pane-manager/pane-manager'
import type { AppState } from '@/store/types'
import { useAppStore } from '@/store'
import { makePaneKey } from '../../../../shared/stable-pane-id'
import { translate } from '@/i18n/i18n'
import {
  buildSideConversationForkCommand,
  canForkSideConversation
} from '@/lib/agent-side-conversation-fork'
import { resolvePaneAgentSession } from './pane-agent-session-id'
import { dispatchTerminalPaneSplitRequest } from './terminal-pane-split-request-routing'

export function canOpenSideConversation(
  state: AppState,
  tabId: string,
  leafId: string | null
): boolean {
  const session = leafId ? resolvePaneAgentSession(state, makePaneKey(tabId, leafId)) : null
  return Boolean(session && canForkSideConversation(session.agent, session.providerSession))
}

/** Splits the pane right and starts a CLI fork of its conversation there; the source keeps its writer. */
export function openSideConversationFromPane(args: {
  pane: ManagedPane
  tabId: string
  worktreeId: string
}): void {
  const state = useAppStore.getState()
  const session = resolvePaneAgentSession(state, makePaneKey(args.tabId, args.pane.leafId))
  const command = session
    ? buildSideConversationForkCommand({
        state,
        worktreeId: args.worktreeId,
        agent: session.agent,
        providerSession: session.providerSession
      })
    : null
  if (!command) {
    toast.error(
      translate(
        'components.terminalPane.sideConversation.unsupported',
        'This pane has no agent conversation that can be forked.'
      )
    )
    args.pane.terminal.focus()
    return
  }
  // The tab's mount handler owns the split and starts the command in the new leaf.
  dispatchTerminalPaneSplitRequest({
    tabId: args.tabId,
    worktreeId: args.worktreeId,
    paneRuntimeId: args.pane.id,
    direction: 'vertical',
    command
  })
}
