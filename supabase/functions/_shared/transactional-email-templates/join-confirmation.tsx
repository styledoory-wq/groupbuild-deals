import * as React from 'npm:react@18.3.1'
import type { TemplateEntry } from './registry.ts'
import { EmailLayout, H1, P, CTAButton, InfoCard, KeyValue, Muted, Divider } from './layout.tsx'

interface Props {
  name?: string
  dealTitle?: string
  supplierName?: string
  amount?: number | string
  currency?: string
  paidAt?: string
  reference?: string
  dealUrl?: string
}

const Email = ({
  name,
  dealTitle = 'העסקה שלך',
  supplierName,
  amount,
  currency = '₪',
  paidAt,
  reference,
  dealUrl = 'https://groupbuild.co.il/deals',
}: Props) => (
  <EmailLayout preview={`הצטרפת בהצלחה לעסקה ${dealTitle}`}>
    <H1>{name ? `${name}, הצטרפת בהצלחה לעסקה 🎉` : 'הצטרפת בהצלחה לעסקה 🎉'}</H1>
    <P>הצטרפת בהצלחה לעסקה. דמי ההשתתפות התקבלו, וההצטרפות שלך אושרה.</P>
    <InfoCard>
      <KeyValue label="עסקה" value={dealTitle} />
      {supplierName ? <KeyValue label="ספק" value={supplierName} /> : null}
      {amount !== undefined ? <KeyValue label="דמי השתתפות ששולמו" value={`${currency}${amount}`} /> : null}
      {paidAt ? <KeyValue label="תאריך ושעת התשלום" value={paidAt} /> : null}
      {reference ? <KeyValue label="אסמכתא" value={reference} /> : null}
      <KeyValue label="סטטוס הצטרפות" value="מאושרת" />
    </InfoCard>
    <P>
      מה קורה עכשיו: אנחנו ממשיכים לאסוף משתתפים לעסקה. כשהקבוצה תיסגר, הספק ייצור איתך קשר
      להמשך התיאום. נעדכן אותך בכל שינוי במצב העסקה.
    </P>
    <CTAButton href={dealUrl}>צפייה בעסקה</CTAButton>
    <Divider />
    <Muted>
      אם העסקה לא תצא לפועל, דמי ההשתתפות יוחזרו לך במלואם לכרטיס שבו שילמת.
    </Muted>
  </EmailLayout>
)

export const template = {
  component: Email,
  subject: (d: Props) => `הצטרפת בהצלחה · ${d?.dealTitle || 'העסקה שלך'}`,
  displayName: 'אישור הצטרפות לעסקה',
  previewData: {
    name: 'דנה',
    dealTitle: 'חיפוי WPC',
    supplierName: 'חיפויים בע״מ',
    amount: 19,
    currency: '₪',
    paidAt: '3.8.2026, 16:49',
    reference: '257519344',
    dealUrl: 'https://groupbuild.co.il/deals',
  },
} satisfies TemplateEntry
