/**
 * Sistema de Atención (FASE 8C) — barrel público.
 */
export { AttentionService, toDTO, parseAction, parseMetadata, type AttentionServiceOptions, type AttentionSyncResult, type AttentionDomainEventPayload } from "./service"
export { registerAttentionListener, syncIfStale, resetAttentionSyncThrottle, attentionTriggerEvents, type AttentionListenerOptions } from "./engine"
export { attentionService } from "./app"
export { AttentionPreferencesService, DEFAULT_ATTENTION_PREFERENCES, type AttentionPreferences } from "./preferences"
export { FilteredAttentionNotifier, NoopExternalAttentionChannel, isWithinQuietHours, type AttentionNotifier, type AttentionNotification, type ExternalAttentionChannel } from "./notifier"
export { createAttentionDataPort, type AttentionDataPort } from "./queries"
export { detectInventory, detectCredits, detectSuppliers, detectOrders, detectConversations, detectChannels } from "./detectors"
export { ATTENTION_RULES, attentionGroupOf, attentionLabel, attentionPluralLabel, attentionDefaultPriority, type AttentionRuleDefinition } from "./rules"
export { ATTENTION_CONFIG } from "./config"
export {
  ATTENTION_TYPES,
  ATTENTION_PRIORITIES,
  OPEN_STATUSES,
  PRIORITY_RANK,
  rankPriority,
  isAtLeastPriority,
  isOpenStatus,
  isOpenQuery,
  isAttentionType,
  type AttentionAction,
  type AttentionGroup,
  type AttentionItemDTO,
  type AttentionListQuery,
  type AttentionOverview,
  type AttentionPriority,
  type AttentionSource,
  type AttentionStatus,
  type AttentionType,
  type Situation,
} from "./types"
