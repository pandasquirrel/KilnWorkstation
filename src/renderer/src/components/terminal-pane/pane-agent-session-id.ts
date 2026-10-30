import type { AgentStatusEntry } from '../../../../shared/agent-status-types'
import type {
  AgentProviderSessionMetadata,
  SleepingAgentSessionRecord
} from '../../../../shared/agent-session-resume'
import type { PaneForegroundAgentEntry } from '../../store/slices/pane-foreground-agent'

export type PaneAgentSessionIdState = {
  agentStatusByPaneKey: Record<string, AgentStatusEntry | undefined>
  sleepingAgentSessionsByPaneKey: Record<string, SleepingAgentSessionRecord | undefined>
  paneForegroundAgentByPaneKey: Record<string, PaneForegroundAgentEntry | undefined>
}

// FORK: the side-conversation fork needs the agent beside the session; id-only callers keep resolvePaneAgentSessionId.
export type PaneAgentSession = {
  agent: string | undefined
  providerSession: AgentProviderSessionMetadata
}

/** Resolves the agent and provider session owned by one exact terminal pane. */
export function resolvePaneAgentSession(
  state: PaneAgentSessionIdState,
  paneKey: string
): PaneAgentSession | null {
  // Gate durable resume records on shell return too; they intentionally outlive the agent for cold restore.
  if (state.paneForegroundAgentByPaneKey[paneKey]?.shellForeground === true) {
    return null
  }
  const live = state.agentStatusByPaneKey[paneKey]
  if (live && live.restoredUnconfirmed !== true) {
    return live.providerSession
      ? { agent: live.agentType, providerSession: live.providerSession }
      : null
  }
  const sleeping = state.sleepingAgentSessionsByPaneKey[paneKey]
  return sleeping ? { agent: sleeping.agent, providerSession: sleeping.providerSession } : null
}

/** Resolves the provider session owned by one exact terminal pane, while its agent is still live. */
export function resolvePaneAgentSessionId(
  state: PaneAgentSessionIdState,
  paneKey: string
): string | null {
  return resolvePaneAgentSession(state, paneKey)?.providerSession.id ?? null
}
