export { generateJson, generateText } from "./gemini"
export type { AiResponse, AiGenerateOptions } from "./gemini"

export { generateOnboardingContent, improveBusiness, generateSeo, generateMarketing } from "./services/business.service"
export type { OnboardingInput, OnboardingResult, BusinessImprovementInput, BusinessImprovementResult, SeoInput, SeoResult, MarketingInput, MarketingResult } from "./services/business.service"

export { completeProduct, completeProductWithRetry } from "./services/product.service"
export type { ProductCompletionInput, ProductCompletionResult } from "./services/product.service"

export { generateSocialPost, generateSocialPostForPlatform } from "./services/social.service"
export type { SocialPostInput, SocialPostResult, SocialPlatform, SocialContentType } from "./services/social.service"

export { chatWithPana, chatWithRetry } from "./services/chat.service"
export type { ChatInput, ChatResult } from "./services/chat.service"

export { generateAnalyticsInsights } from "./services/analytics.service"
export type { AnalyticsInsightsInput, AnalyticsInsightsResult } from "./services/analytics.service"

export { truncateText, sanitizeJson, safeParseJson, buildErrorResponse, buildSuccessResponse, getErrorMessage, isStoreType } from "./utils"
