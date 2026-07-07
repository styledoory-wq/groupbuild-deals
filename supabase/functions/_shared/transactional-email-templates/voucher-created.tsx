import * as React from 'npm:react@18.3.1'
import type { TemplateEntry } from './registry.ts'
import { EmailLayout, H1, P, CTAButton, InfoCard, KeyValue, Muted, Divider } from './layout.tsx'

interface Props {
  name?: string
  voucherCode?: string
  dealTitle?: string
  supplierName?: string
  expiresAt?: string
  voucherUrl?: string
}

const Email = ({ name, voucherCode, dealTitle, supplierName, expiresAt, voucherUrl = 'https://groupbuild.co.il/my-vouchers' }: Props) => (
  <EmailLayout preview="השובר שלך נוצר ב-GroupBuild">
    <H1>{name ? `${name}, השובר שלך מוכן 🎟️` : 'השובר שלך מוכן'}</H1>
    <P>נוצר עבורך שובר למימוש. הצגת השובר אצל הספק תסיים את התהליך.</P>
    <InfoCard>
      {dealTitle ? <KeyValue label="עסקה" value={dealTitle} /> : null}
      {supplierName ? <KeyValue label="ספק" value={supplierName} /> : null}
      {voucherCode ? <KeyValue label="קוד שובר" value={<span style={{ fontFamily: 'monospace', letterSpacing: '0.05em' }}>{voucherCode}</span>} /> : null}
      {expiresAt ? <KeyValue label="בתוקף עד" value={expiresAt} /> : null}
    </InfoCard>
    <CTAButton href={voucherUrl}>צפייה בשובר</CTAButton>
    <Divider />
    <Muted>שמור את השובר עד למועד המימוש. פרטים מלאים תמצא באזור "השוברים שלי".</Muted>
  </EmailLayout>
)

export const template = {
  component: Email,
  subject: (d: Props) => `השובר שלך מוכן${d?.dealTitle ? ' · ' + d.dealTitle : ''}`,
  displayName: 'יצירת שובר',
  previewData: { name: 'דנה', voucherCode: 'GB-4821-77', dealTitle: 'ניקיון לובי', supplierName: 'צביעת דירות דוד', expiresAt: '31.12.2026', voucherUrl: 'https://groupbuild.co.il/my-vouchers' },
} satisfies TemplateEntry
