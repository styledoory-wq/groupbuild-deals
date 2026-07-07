import * as React from 'npm:react@18.3.1'
import type { TemplateEntry } from './registry.ts'
import { EmailLayout, H1, P, CTAButton, InfoCard, KeyValue, Muted, Divider } from './layout.tsx'

interface Props {
  name?: string
  dealTitle?: string
  supplierName?: string
  price?: number | string
  currency?: string
  dealUrl?: string
}

const Email = ({ name, dealTitle = 'הצעה חדשה', supplierName, price, currency = '₪', dealUrl = 'https://groupbuild.co.il' }: Props) => (
  <EmailLayout preview={`הצעה חדשה: ${dealTitle}`}>
    <H1>{name ? `${name}, הצעה חדשה בשבילך ✨` : 'הצעה חדשה בשבילך'}</H1>
    <P>פורסמה הצעה חדשה שמתאימה לביקוש שלך. ככל שיצטרפו יותר משתתפים, המחיר ירד בהתאם.</P>
    <InfoCard>
      <KeyValue label="הצעה" value={dealTitle} />
      {supplierName ? <KeyValue label="ספק" value={supplierName} /> : null}
      {price !== undefined ? <KeyValue label="מחיר התחלתי" value={`${currency}${price}`} /> : null}
    </InfoCard>
    <CTAButton href={dealUrl}>צפייה בהצעה</CTAButton>
    <Divider />
    <Muted>ההצעה תקפה למשך זמן מוגבל. הכניסה למערכת מציגה את המצב המעודכן ביותר.</Muted>
  </EmailLayout>
)

export const template = {
  component: Email,
  subject: (d: Props) => `הצעה חדשה: ${d?.dealTitle || 'ההצעה עבורך'}`,
  displayName: 'הצעה חדשה',
  previewData: { name: 'דנה', dealTitle: 'ניקיון לובי', supplierName: 'צביעת דירות דוד', price: 120, currency: '₪', dealUrl: 'https://groupbuild.co.il' },
} satisfies TemplateEntry
