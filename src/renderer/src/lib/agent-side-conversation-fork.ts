import type { AgentProviderSessionMetadata } from '../../../shared/agent-session/lifecycle/agent-session-resume'
import { isResumableTuiAgent } from '../../../shared/agent-session/lifecycle/agent-session-resume'
import { isAiVaultAgent } from '../../../shared/ai-vault/contracts/ai-vault-types'
import { getAgentForkArgv } from '../../../shared/agent-launch/startup/agent-resume-argv'
import { buildAiVaultForkStartupForWorktree } from './agent-session/resume/history/ai-vault-session-fork-startup'
import { getAiVaultResumeWorkspacePath } from './agent-session/resume/history/ai-vault-resume-shell'
import type { AiVaultResumeWorktreeArgs } from './agent-session/resume/history/ai-vault-resume-command'

/** A side conversation is only safe when the CLI can fork: the copy gets a new id, so the
 *  source pane keeps its conversation as the sole writer. */
export function canForkSideConversation(
  agent: string | null | undefined,
  providerSession: AgentProviderSessionMetadata | null | undefined
): boolean {
  return Boolean(
    agent &&
    providerSession &&
    isResumableTuiAgent(agent) &&
    getAgentForkArgv(agent, providerSession)
  )
}

/** The one-shot command that opens a fork of this pane's conversation in the workspace folder. */
export function buildSideConversationForkCommand(args: {
  state: AiVaultResumeWorktreeArgs['state']
  worktreeId: string
  agent: string | null | undefined
  providerSession: AgentProviderSessionMetadata | null | undefined
}): string | null {
  const { agent, providerSession } = args
  if (
    !agent ||
    !providerSession ||
    !isAiVaultAgent(agent) ||
    !canForkSideConversation(agent, providerSession)
  ) {
    return null
  }
  const cwd = getAiVaultResumeWorkspacePath(args.state, args.worktreeId)
  if (!cwd) {
    return null
  }
  return (
    buildAiVaultForkStartupForWorktree({
      state: args.state,
      worktreeId: args.worktreeId,
      session: {
        agent,
        sessionId: providerSession.id,
        cwd,
        // A live pane has no recorded Codex home; the command must not pin one.
        codexHome: null,
        ...(providerSession.transcriptPath ? { filePath: providerSession.transcriptPath } : {})
      }
    })?.command ?? null
  )
}
