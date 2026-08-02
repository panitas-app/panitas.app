export type ConversationRole = "user" | "assistant"

export type ConversationMessage = {
  role: ConversationRole
  content: string
  timestamp: string
}

export type ConversationAction = {
  tool: string
  result: string
  at: string
}

export type ConversationContext = {
  id: string
  messages: ConversationMessage[]
  intent?: string | null
  toolName?: string | null
  actionsPerformed: ConversationAction[]
}

export function buildConversationContext(
  id: string,
  messages: ConversationMessage[] = []
): ConversationContext {
  return {
    id,
    messages: [...messages],
    intent: null,
    toolName: null,
    actionsPerformed: [],
  }
}

export function addMessage(
  conversation: ConversationContext,
  role: ConversationRole,
  content: string
): ConversationContext {
  const message: ConversationMessage = { role, content, timestamp: new Date().toISOString() }
  return { ...conversation, messages: [...conversation.messages, message] }
}

export function lastMessages(conversation: ConversationContext, take: number): ConversationMessage[] {
  return conversation.messages.slice(-take)
}

export function recordAction(
  conversation: ConversationContext,
  tool: string,
  result: string
): ConversationContext {
  return {
    ...conversation,
    toolName: tool,
    actionsPerformed: [
      ...conversation.actionsPerformed,
      { tool, result, at: new Date().toISOString() },
    ],
  }
}
