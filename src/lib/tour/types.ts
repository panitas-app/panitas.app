export type TourPosition = "top" | "bottom" | "left" | "right" | "center"

export interface TourStep {
  selector: string
  title: string
  description: string
  icon?: string
  position?: TourPosition
  action?: {
    type: "click" | "navigate" | "input" | "scroll" | "copy"
    selector?: string
    hint?: string
  }
  beforeEnter?: () => boolean | void | Promise<boolean | void>
  afterExit?: () => void | Promise<void>
}

export interface TourPlanConfig {
  id: string
  name: string
  steps: TourStep[]
}
