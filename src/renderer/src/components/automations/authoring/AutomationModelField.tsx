// FORK: 自动化编辑器独立「模型」字段（上游只在智能体行内二级菜单选模型）。
// 决策与触点见 docs/fork/customizations.md §5.2；吸收上游后若出现同类字段应删除本文件。
import { useTranslate } from '@/i18n/use-translate'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select'
import { agentLaunchSetupCatalogState } from '@/components/agent/agent-launch-setup-option-rows'
import { agentPickerModels } from '../../../../../shared/agent-launch/picker/agent-launch-picker-catalog'
import { agentPickerEffectiveChoices } from '../../../../../shared/agent-launch/picker/agent-launch-picker'
import { agentPickerPanelArguments } from '../../../../../shared/agent-launch/picker/agent-launch-picker-arguments'
import { getAgentSessionOptionLaunchCatalog } from '../../../../../shared/agent-session/options/agent-session-option-catalog'
import { automationLaunchChoices } from '../../../../../shared/automations/launch/automation-launch-choices'
import { mergeExtraAgentArgs } from '../../../../../shared/agent-launch/startup/automation-extra-agent-args'
import type {
  AgentPickerDraft,
  AgentPickerEntry
} from '../../../../../shared/agent-launch/picker/agent-launch-picker'
import { AUTOMATION_EDITOR_SECTION_LABEL_CLASS, Field } from '../automation-page-parts'
import type { AutomationDraft } from './AutomationEditorDialog'
import { pickAutomationLaunch } from './automation-launch-draft'

/** Radix Select refuses an empty item value; this sentinel carries the agent's own default. */
const AGENT_DEFAULT_VALUE = '__agent_default__'

type AutomationModelFieldProps = {
  /** Live entry for the draft's agent: its catalog comes from the host listing, not the seed. */
  entry: AgentPickerEntry | undefined
  draft: AutomationDraft
  surface: 'chat' | 'terminal'
  disabled?: boolean
  triggerClassName?: string
  onDraftChange: (updater: (current: AutomationDraft) => AutomationDraft) => void
}

/**
 * Why a field of its own: the automation editor's agent trigger carries a fixed label, so a model
 * chosen inside the picker submenu would never surface here. Showing (and editing) the model beside
 * the agent keeps the launch settings readable before a task is created.
 */
export function AutomationModelField({
  entry,
  draft,
  surface,
  disabled: disabledProp,
  triggerClassName,
  onDraftChange
}: AutomationModelFieldProps): React.JSX.Element | null {
  const t = useTranslate()
  if (!entry) {
    return null
  }
  // Mirror the automation picker's projection: supplemental terminal arguments join the defaults,
  // and null preferences delegate a key back to the agent's own default.
  const mergedArgs =
    surface === 'terminal' && draft.extraAgentArgs
      ? mergeExtraAgentArgs({
          agent: entry.agent,
          defaultArgs: entry.arguments,
          extraAgentArgs: draft.extraAgentArgs,
          shell: 'posix'
        })
      : undefined
  const projectedEntry: AgentPickerEntry = {
    ...entry,
    arguments: mergedArgs?.ok ? mergedArgs.agentArgs : entry.arguments
  }
  const preferences = draft.launchPreferences
  const pickerDraft: AgentPickerDraft = {
    agent: entry.agent,
    surface,
    choices: automationLaunchChoices({ launchPreferences: preferences }),
    ...(draft.agentArgs !== undefined ? { arguments: draft.agentArgs } : {}),
    delegated: [
      ...(preferences?.model === null ? ['model'] : []),
      ...Object.entries(preferences?.options ?? {}).flatMap(([key, value]) =>
        value === null ? [key] : []
      )
    ]
  }
  const models = agentPickerModels(projectedEntry)
  const effective = agentPickerEffectiveChoices(projectedEntry, pickerDraft)
  const view = agentPickerPanelArguments(projectedEntry, pickerDraft)
  const defaultsPending =
    surface === 'chat'
      ? projectedEntry.structuredDefaultsPending === true
      : projectedEntry.defaultsPending === true
  const listedDefaultKnown =
    projectedEntry.catalog.origin !== 'unknown' &&
    (projectedEntry.catalog.listingNamesConfiguredModel ??
      getAgentSessionOptionLaunchCatalog(projectedEntry.agent)?.hostListingNamesConfiguredModel ===
        true)
  const delegated = pickerDraft.delegated?.includes('model') === true
  // Same precedence as the picker's setup panel: explicit choice, resolved default or Arguments.
  const currentModel =
    view.choices.model ??
    effective.model ??
    (!delegated && !defaultsPending && listedDefaultKnown
      ? models.find((model) => model.isDefault)?.id
      : undefined)
  const catalogState = agentLaunchSetupCatalogState(
    projectedEntry,
    models,
    currentModel,
    'select',
    t
  )
  // The seed catalog is not the host's list: keep the field locked until the live listing lands,
  // then the models here match what the agent picker shows.
  const catalogLoading = projectedEntry.catalogRead === 'pending'
  const listed = models.filter((model) => !model.hidden)
  const unlisted =
    currentModel && !listed.some((model) => model.id === currentModel) ? currentModel : undefined
  const disabled =
    disabledProp === true || catalogLoading || catalogState.catalogPending || defaultsPending
  const selectValue = currentModel && currentModel.length > 0 ? currentModel : AGENT_DEFAULT_VALUE
  const fieldLabel = t('auto.components.automations.AutomationModelField.label', 'Model')
  const defaultChoiceLabel = t(
    'auto.components.automations.AutomationModelField.defaultChoice',
    'Agent default'
  )
  const defaultModel = models.find((model) => model.isDefault)
  // Name the agent's default when known: "Agent default" alone hides what will actually run.
  const defaultItemLabel = defaultModel
    ? `${defaultChoiceLabel} · ${defaultModel.label}`
    : defaultChoiceLabel

  const apply = (next: string | null): void => {
    onDraftChange((current) =>
      pickAutomationLaunch(
        current,
        current.agentId,
        { ...pickerDraft, acceptedEdits: { choices: { model: next } } },
        undefined,
        true,
        surface
      )
    )
  }

  return (
    <Field
      className="mt-3"
      labelClassName={AUTOMATION_EDITOR_SECTION_LABEL_CLASS}
      label={fieldLabel}
    >
      <Select
        value={selectValue}
        disabled={disabled}
        onValueChange={(value) => apply(value === AGENT_DEFAULT_VALUE ? null : value)}
      >
        <SelectTrigger className={triggerClassName} aria-label={fieldLabel}>
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={AGENT_DEFAULT_VALUE}>{defaultItemLabel}</SelectItem>
          {listed.map((model) => (
            <SelectItem key={model.id} value={model.id}>
              {model.label}
              {model.isDefault
                ? ` · ${t('auto.components.automations.AutomationModelField.defaultBadge', 'default')}`
                : ''}
            </SelectItem>
          ))}
          {unlisted ? <SelectItem value={unlisted}>{unlisted}</SelectItem> : null}
        </SelectContent>
      </Select>
      {catalogLoading ? (
        <p className="text-xs text-muted-foreground">
          {t('auto.components.automations.AutomationModelField.pending', 'Loading models…')}
        </p>
      ) : catalogState.catalogMessage ? (
        <p className="text-xs text-muted-foreground">{catalogState.catalogMessage}</p>
      ) : null}
    </Field>
  )
}
