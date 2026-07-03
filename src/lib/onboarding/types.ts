export type ProfessionalType = "independiente" | "negocio" | "ambos" | "mayorista"

export type GoalType = "publico" | "mayorista" | "ambos"

export interface QuizAnswers {
  professionalType?: ProfessionalType
  profession?: string
  storeType?: string
  goal?: GoalType
}

export interface BusinessConfig {
  name: string
  description?: string
  whatsapp?: string
  pais?: string
  estado?: string
  municipio?: string
  direccion?: string
}

export interface AiSetupResult {
  categories: string[]
  suggestedDescription: string
  suggestedHours: { day: string; open: string; close: string }[]
  colors: { primary: string; secondary: string }
  logoInitials: string
}

export type OnboardingStep =
  | "welcome"
  | "quiz"
  | "plan"
  | "config"
  | "ai"
  | "celebration"

export interface OnboardingProgress {
  step: OnboardingStep
  quizStep: number
  answers: QuizAnswers
  selectedPlan: string | null
  businessConfig: BusinessConfig | null
  completed: boolean
  updatedAt: string
}

export interface PlanInfo {
  id: string
  name: string
  price: number
  description: string
  features: string[]
  badge?: string
}

export interface QuizQuestion {
  id: string
  title: string
  subtitle?: string
  options: QuizOption[]
  condition?: (answers: QuizAnswers) => boolean
}

export interface QuizOption {
  value: string
  label: string
  description?: string
  icon?: string
}

export type OnboardingEvent =
  | "welcome_viewed"
  | "welcome_cta_clicked"
  | "quiz_started"
  | "quiz_step_completed"
  | "quiz_completed"
  | "plan_recommended"
  | "plan_selected"
  | "config_step_completed"
  | "config_completed"
  | "ai_setup_started"
  | "ai_setup_completed"
  | "business_created"
  | "celebration_viewed"
  | "dashboard_loaded"
  | "tour_started"
  | "tour_completed"
  | "first_product_created"
  | "store_shared"
  | "first_order_received"
  | "profile_completed"
  | "pay_now_clicked"
  | "pay_later_clicked"
