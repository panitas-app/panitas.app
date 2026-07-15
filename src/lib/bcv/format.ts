export function formatBCV(rate: number): string {
  const truncated = Math.floor(rate * 100) / 100
  return truncated.toLocaleString("es-VE", { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}
