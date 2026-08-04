import type { ComponentType } from 'npm:react@18.3.1'
import { template as adminNotification } from './admin-notification.tsx'
import { template as userWelcome } from './user-welcome.tsx'
import { template as dealUpdate } from './deal-update.tsx'
import { template as marketingCardReady } from './marketing-card-ready.tsx'
import { template as supplierProfileReminder } from './supplier-profile-reminder.tsx'
import { template as supplierApproved } from './supplier-approved.tsx'
import { template as residentApproved } from './resident-approved.tsx'
import { template as depositConfirmation } from './deposit-confirmation.tsx'
import { template as newLead } from './new-lead.tsx'
import { template as newOffer } from './new-offer.tsx'
import { template as voucherCreated } from './voucher-created.tsx'
import { template as joinConfirmation } from './join-confirmation.tsx'
import { template as refundNotice } from './refund-notice.tsx'
import { template as referralReward } from './referral-reward.tsx'

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
  'supplier-profile-reminder': supplierProfileReminder,
  'supplier-approved': supplierApproved,
  'resident-approved': residentApproved,
  'deposit-confirmation': depositConfirmation,
  'new-lead': newLead,
  'new-offer': newOffer,
  'voucher-created': voucherCreated,
  'join-confirmation': joinConfirmation,
  'refund-notice': refundNotice,
  'referral-reward': referralReward,
}
