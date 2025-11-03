// Call History Types
export interface CallHistoryEvent {
  id: number
  eventType: 'status' | 'dtmf' | 'flow'
  status?: string
  dtmfDigits?: string
  action?: string
  timestamp: number
  eventData?: any
}

export interface DTMFAction {
  digits: string
  action: string | null
  timestamp: number
}

export interface CallHistoryItem {
  executionSid: string
  callSid?: string
  to: string
  from?: string
  status?: string
  lastActivity: number
  createdAt: string
  dtmfActions: DTMFAction[]
  events: CallHistoryEvent[]
}

export interface CallDetails {
  executionSid: string
  callSid?: string
  to: string
  from?: string
  createdAt: string
  timeline: CallHistoryEvent[]
}

// Pagination Types
export interface PaginationInfo {
  total: number
  totalPages: number
  currentPage: number
  limit: number
  offset: number
  hasNextPage: boolean
  hasPreviousPage: boolean
}

// Stats Types
export interface CallStats {
  totalCalls: number
  confirmedAppointments: number
  cancelledAppointments: number
  voicemailRequests: number
  failedCalls: number
}

export interface WeeklyStats {
  date: string
  calls: number
  confirmed: number
  cancelled: number
}

export interface DashboardStats {
  today: CallStats
  weekly: WeeklyStats[]
}

// Socket Event Types
export interface SocketEvent {
  type: 'status' | 'dtmf' | 'flow'
  execution_sid?: string
  CallStatus?: string
  DialCallStatus?: string
  To?: string
  to?: string
  from?: string
  digits?: string
  action?: string
  event?: string
  time?: string
  timestamp?: number
  is_action?: boolean
}

// API Response Types
export interface APIResponse<T = any> {
  success: boolean
  data?: T
  error?: string
  message?: string
  pagination?: PaginationInfo
}

export interface CallHistoryResponse {
  success: boolean
  data: CallHistoryItem[]
  pagination: PaginationInfo
}

// Action Types
export type DTMFActionType = 
  | 'confirm_appointment'
  | 'cancel_appointment' 
  | 'connect_to_representative'

// Call Status Types
export type CallStatus = 
  | 'initiated'
  | 'ringing'
  | 'answered'
  | 'busy'
  | 'no-answer'
  | 'failed'
  | 'completed'
  | 'canceled'

// Daily Summary Types
export interface DailySummaryCall {
  sid: string
  from: string
  to: string
  status: string
  duration: number
  startTime: string
  endTime: string
  direction: string
}

export interface InboundStats {
  total: number
  answered: number
  missed: number
  missedRatio: number
  totalDuration: number
  avgDuration: number
  maxDuration: number
}

export interface OutboundStats {
  total: number
  completed: number
  failed: number
  totalDuration: number
  avgDuration: number
  maxDuration: number
}

export interface OverallStats {
  totalCalls: number
  totalDuration: number
}

export interface DailySummaryStats {
  inbound: InboundStats
  outbound: OutboundStats
  overall: OverallStats
}

export interface DailySummaryCalls {
  inbound: DailySummaryCall[]
  outbound: DailySummaryCall[]
}

export interface DailySummaryResponse {
  success: boolean
  date: string
  stats: DailySummaryStats
  calls: DailySummaryCalls
}

export type CallDirection = 'all' | 'inbound' | 'outbound' 