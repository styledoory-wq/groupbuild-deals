import type { ComponentType } from 'npm:react@18.3.1'
import { template as adminNotification } from './admin-notification.tsx'
import { template as userWelcome } from './user-welcome.tsx'
import { template as dealUpdate } from './deal-update.tsx'
import { template as marketingCardReady } from './marketing-card-ready.tsx'

export interface TemplateEntry {
  component: ComponentType<any>
  subject: string | ((data: any) => string)
  displayName?: string
  previewData?: Record<string, unknown>
  to?: string | ((data: any) => string)
}

export const TEMPLATES: Record<string, TemplateEntry> = {
  'admin-notification': adminNotification,
  'user-welcome': userWelcome,
  'deal-update': dealUpdate,
  'marketing-card-ready': marketingCardReady,
}
