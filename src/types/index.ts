export type UserRole = 'customer' | 'supplier' | 'admin'

export interface InventoryItem {
  id: string
  supplierId: string
  itemName: string
  sku: string | null
  category: string | null
  quantity: number
  unitPrice: number | null
  description: string | null
  minStockAlert: number
  updatedAt: string
  createdAt: string
}

export interface SupplierOffer {
  id: string
  supplierId: string
  supplierName: string | null
  title: string
  content: string
  items: InventoryItem[]
  status: 'active' | 'expired' | 'withdrawn'
  expiresAt: string | null
  createdAt: string
}

export interface SupplyMatch {
  itemName: string
  supplierName: string
  quantity: number
  unitPrice: number | null
  relevanceReason: string
}

export interface IntakeRequest {
  naturalLanguageRequest: string
  vendorPhoneNumber: string
}

export interface JobSpec {
  vendor: string
  objective: string
  requiredQuestions: string[]
  escalationGuardrails: string[]
  echoMitigationPrompt: string
}

export type OrderStatus = 'preparing' | 'in_transit' | 'delivered'

export interface RestockItem {
  inventoryItemId: string
  itemName: string
  unitsOrdered: number
}

export interface CallOutcomeSummary {
  vendorName: string
  resolutionStatus: string
  paymentDate: string | null
  confidenceScore: number
  nextStep: 'Needs Human Approval' | 'Mark as Resolved' | 'Draft Email'
}

export interface CallReport extends CallOutcomeSummary {
  id: string
  userId: string
  supplierId: string | null
  naturalLanguageRequest: string
  jobSpec: JobSpec
  rawTranscript: string
  cleanedTranscript: string
  orderStatus: OrderStatus
  restockItems: RestockItem[] | null
  createdAt: string
}

export type CallStatus = 'idle' | 'planning' | 'queued' | 'dialing' | 'in-progress' | 'extracting' | 'done' | 'error'

export interface Profile {
  id: string
  role: UserRole
  companyName: string | null
  phoneNumber: string | null
}

export interface SupplierOption {
  id: string
  companyName: string
  phoneNumber: string  // empty string if not set
}

export type StockLevel = 'critical' | 'warning' | 'caution' | 'healthy' | 'abundant'

export interface CustomerInventoryItem {
  id: string
  companyId: string
  itemName: string
  sku: string | null
  category: string | null
  currentQuantity: number
  restockThreshold: number
  supplierId: string | null
  supplierName: string | null
  supplierPhone: string | null
  unitCost: number | null
  updatedAt: string
  createdAt: string
}

export interface StockSummary {
  critical: number
  warning: number
  caution: number
  healthy: number
  abundant: number
}
