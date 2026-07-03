export const BANKS_VENEZUELA = [
  { code: "0001", name: "Banco Central de Venezuela" },
  { code: "0102", name: "Banco de Venezuela" },
  { code: "0104", name: "Venezolano de Crédito" },
  { code: "0105", name: "Mercantil" },
  { code: "0108", name: "BBVA Provincial" },
  { code: "0114", name: "Bancaribe" },
  { code: "0115", name: "Banco Exterior" },
  { code: "0128", name: "Banco Caroní" },
  { code: "0134", name: "Banesco" },
  { code: "0137", name: "Sofitasa" },
  { code: "0138", name: "Banco Plaza" },
  { code: "0146", name: "Bangente" },
  { code: "0151", name: "BFC Banco Fondo Común" },
  { code: "0156", name: "100% Banco" },
  { code: "0157", name: "DelSur" },
  { code: "0163", name: "Banco del Tesoro" },
  { code: "0166", name: "Banco Agrícola de Venezuela" },
  { code: "0168", name: "Bancrecer" },
  { code: "0169", name: "Mi Banco" },
  { code: "0171", name: "Banco Activo" },
  { code: "0172", name: "Bancamiga" },
  { code: "0174", name: "Banplus" },
  { code: "0175", name: "Bicentenario" },
  { code: "0177", name: "BanFANB" },
  { code: "0190", name: "Citibank" },
  { code: "0191", name: "BNC" },
] as const

export const DOCUMENT_TYPES = [
  { value: "V", label: "V - Venezolano" },
  { value: "E", label: "E - Extranjero" },
  { value: "J", label: "J - Jurídico" },
  { value: "P", label: "P - Pasaporte" },
  { value: "G", label: "G - Gobierno" },
] as const

export const ACCOUNT_TYPES = [
  { value: "corriente", label: "Corriente" },
  { value: "ahorro", label: "Ahorro" },
] as const

export const SHIPPING_AGENCIES = ["MRW", "Zoom", "Tealca", "Liberty Express", "Domesa"] as const

export const PLAN_LIMITS = {
  free: { products: 30, orders: true },
  basic: { products: 100, orders: true },
  advanced: { products: -1, orders: true },
} as const
