import * as React from 'npm:react@18.3.1'
import type { TemplateEntry } from './registry.ts'
import { EmailLayout, H1, P, CTAButton, InfoCard, KeyValue, Muted, Divider } from './layout.tsx'

interface Props {
  name?: string
  dealTitle?: string
  amount?: number | string
  currency?: string
  reason?: string
  refundedAt?: string
  dealUrl?: string
}

const Email = ({
  name,
  dealTitle = 'העסקה',
  amount,
  currency = '₪',
  reason,
  refundedAt,
  dealUrl = 'https://groupbuild.co.il/my-deposits',
}: Props) => (
  <EmailLayout preview={`בוצע החזר דמי השתתפות עבור ${dealTitle}`}>
    <H1>{name ? `${name}, בוצע לך החזר כספי` : 'בוצע לך החזר כספי'}</H1>
    <P>
      העסקה לא יצאה לפועל ולכן הוחזרו לך {currency}
      {amount}. הזיכוי בוצע לכרטיס שבו שילמת.
    </P>
    <InfoCard>
      <KeyValue label="עסקה" value={dealTitle} />
      {amount !== undefined ? <KeyValue label="סכום ההחזר" value={`${currency}${amount}`} /> : null}
      {reason ? <KeyValue label="סיבת ההחזר" value={reason} /> : null}
      {refundedAt ? <KeyValue label="תאריך ההחזר" value={refundedAt} /> : null}
    </InfoCard>
    <CTAButton href={dealUrl}>לאזור האישי</CTAButton>
    <Divider />
    <Muted>
      שים/י לב: הזיכוי עשוי להופיע בכרטיס האשראי שלך בהתאם לזמני העיבוד של חברת האשראי,
      ולעיתים רק במחזור החיוב הבא.
    </Muted>
  </EmailLayout>
)

export const template = {
  component: Email,
  subject: (d: Props) => `החזר דמי השתתפות · ${d?.dealTitle || 'העסקה'}`,
  displayName: 'הודעת החזר כספי',
  previewData: {
    name: 'דנה',
    dealTitle: 'חיפוי WPC',
    amount: 19,
    currency: '₪',
    reason: 'העסקה לא הגיעה למספר המשתתפים הנדרש',
    refundedAt: '3.8.2026, 18:20',
    dealUrl: 'https://groupbuild.co.il/my-deposits',
  },
} satisfies TemplateEntry
