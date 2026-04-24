export type UserRole = 'customer' | 'supplier' | 'admin'

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
  naturalLanguageRequest: string
  jobSpec: JobSpec
  rawTranscript: string
  cleanedTranscript: string
  createdAt: string
}

export type CallStatus = 'idle' | 'planning' | 'queued' | 'dialing' | 'in-progress' | 'extracting' | 'done' | 'error'

export interface Profile {
  id: string
  role: UserRole
  companyName: string | null
}
