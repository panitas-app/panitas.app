/**
 * Factories de la capa de Business Intelligence (FASE 4B).
 *
 * Instancias por defecto con dependencias reales. Permiten inyectar
 * dependencias en tests y en las tools del agente.
 */
import { BusinessHealthMonitor } from "./monitors/business-health-monitor"
import { BusinessSummaryGenerator } from "./generators/business-summary-generator"

export function createBusinessMonitor(): BusinessHealthMonitor {
  return new BusinessHealthMonitor()
}

export function createBusinessSummaryGenerator(): BusinessSummaryGenerator {
  return new BusinessSummaryGenerator()
}
