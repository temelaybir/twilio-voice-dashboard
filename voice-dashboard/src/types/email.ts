// Email modülü tipleri

export interface EmailTemplate {
  id: number
  name: string
  subject: string
  htmlContent: string
  textContent?: string
  variables?: string // JSON string
  category: string
  isActive: boolean
  createdAt: string
  updatedAt: string
}

export interface EmailList {
  id: number
  name: string
  description?: string
  subscriberCount: number
  isActive: boolean
  createdAt: string
  updatedAt: string
}

export interface EmailSubscriber {
  id: number
  email?: string
  fullName?: string
  firstName?: string
  lastName?: string
  phone?: string
  city?: string
  eventDate?: string
  eventTime?: string
  stage?: string
  customFields?: string // JSON string
  listId: number
  status: 'active' | 'unsubscribed' | 'bounced' | 'complained'
  unsubscribeToken?: string
  // Randevu onay alanları
  confirmationToken?: string
  confirmationStatus?: 'pending' | 'confirmed' | 'cancelled' | 'rescheduled'
  confirmedAt?: string
  confirmationNote?: string
  emailsSent: number
  emailsOpened: number
  lastEmailAt?: string
  unsubscribedAt?: string
  createdAt: string
  updatedAt: string
}

export interface ListPhoneData {
  phone: string
  name: string
  city: string
}

export interface EmailCampaign {
  id: number
  name: string
  status: 'draft' | 'scheduled' | 'sending' | 'sent' | 'paused' | 'cancelled'
  templateId: number
  listIds: string // comma separated
  subject?: string
  fromName?: string
  fromEmail?: string
  replyTo?: string
  scheduledAt?: string
  startedAt?: string
  completedAt?: string
  totalRecipients: number
  sentCount: number
  deliveredCount: number
  openedCount: number
  clickedCount: number
  bouncedCount: number
  unsubscribedCount: number
  complainedCount: number
  rateLimitSettings?: string // JSON string
  errorLogs?: string // JSON string
  createdAt: string
  updatedAt: string
}

export interface EmailSend {
  id: number
  campaignId: number
  subscriberId: number
  toEmail: string
  status: 'pending' | 'sent' | 'delivered' | 'opened' | 'clicked' | 'bounced' | 'failed'
  messageId?: string
  sentAt?: string
  deliveredAt?: string
  openedAt?: string
  clickedAt?: string
  failedAt?: string
  errorMessage?: string
  bounceType?: 'hard' | 'soft'
  createdAt: string
  updatedAt: string
}

export interface EmailStats {
  templates: number
  lists: number
  activeSubscribers: number
  campaigns: number
  recentCampaigns: EmailCampaign[]
  rateLimit: {
    dailyUsed: number
    dailyLimit: number
    remaining: number
  }
}

export interface CampaignStats {
  campaign: EmailCampaign
  stats: {
    total: number
    sent: number
    delivered: number
    opened: number
    clicked: number
    bounced: number
    failed: number
    deliveryRate?: string
    openRate?: string
    clickRate?: string
    bounceRate?: string
  }
  recentErrors: Array<{ email: string; error: string }>
}

export interface BulkSubscriberResult {
  added: number
  skipped: number
  errors: Array<{ email: string; error: string }>
}

// Form tipleri
export interface TemplateFormData {
  name: string
  subject: string
  htmlContent: string
  textContent?: string
  variables?: string[]
  category?: string
}

export interface ListFormData {
  name: string
  description?: string
}

export interface SubscriberFormData {
  email?: string
  fullName?: string
  firstName?: string
  lastName?: string
  phone?: string
  city?: string
  stage?: string
  eventDate?: string
  eventTime?: string
  customFields?: Record<string, string>
  listId: number
}

export interface CampaignFormData {
  name: string
  templateId: number
  listIds: number[]
  subject?: string
  fromName?: string
  fromEmail?: string
  replyTo?: string
  scheduledAt?: string
}

