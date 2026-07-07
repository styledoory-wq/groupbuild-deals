import * as React from 'npm:react@18.3.1'
import type { TemplateEntry } from './registry.ts'
import { EmailLayout, H1, P, CTAButton, InfoCard, KeyValue, Muted, Divider } from './layout.tsx'

interface Props {
  name?: string
  dealTitle?: string
  amount?: number | string
  currency?: string
  reference?: string
  receiptUrl?: string
}

const Email = ({ name, dealTitle = 'העסקה שלך', amount, currency = '₪', reference, receiptUrl = 'https://groupbuild.co.il/my-deposits' }: Props) => (
  <EmailLayout preview={`אישור פיקדון עבור ${dealTitle}`}>
    <H1>{name ? `${name}, הפיקדון התקבל ✅` : 'הפיקדון התקבל'}</H1>
    <P>קיבלנו את הפיקדון שלך והמקום שלך בעסקה נשמר.</P>
    <InfoCard>
      <KeyValue label="עסקה" value={dealTitle} />
      {amount !== undefined ? <KeyValue label="סכום" value={`${currency}${amount}`} /> : null}
      {reference ? <KeyValue label="אסמכתא" value={reference} /> : null}
    </InfoCard>
    <CTAButton href={receiptUrl}>צפייה בקבלה</CTAButton>
    <Divider />
    <Muted>הפיקדון מוחזק בנאמנות עד למימוש העסקה. פרטים מלאים באזור האישי.</Muted>
  </EmailLayout>
)

export const template = {
  component: Email,
  subject: (d: Props) => `אישור פיקדון · ${d?.dealTitle || 'העסקה שלך'}`,
  displayName: 'אישור פיקדון',
  previewData: { name: 'דנה', dealTitle: 'ניקיון לובי', amount: 150, currency: '₪', reference: 'DEP-00123', receiptUrl: 'https://groupbuild.co.il/my-deposits' },
} satisfies TemplateEntry
