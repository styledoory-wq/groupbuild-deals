import * as React from 'npm:react@18.3.1'
import type { TemplateEntry } from './registry.ts'
import { EmailLayout, H1, P, CTAButton, InfoCard, KeyValue, Muted, Divider } from './layout.tsx'

interface Props {
  name?: string
  amount?: number | string
  currency?: string
  creditsUrl?: string
}

const Email = ({
  name,
  amount = 100,
  currency = '₪',
  creditsUrl = 'https://groupbuild.co.il/resident/credits',
}: Props) => (
  <EmailLayout preview={`קיבלת ${currency}${amount} קרדיט ב־GroupBuild`}>
    <H1>{name ? `${name}, קיבלת קרדיט!` : 'קיבלת קרדיט!'}</H1>
    <P>
      הספק שהזמנת אושר ל־GroupBuild.
      קיבלת {currency}
      {amount} קרדיט להצטרפות לעסקאות קבוצתיות.
    </P>
    <InfoCard>
      <KeyValue label="סכום הקרדיט" value={`${currency}${amount}`} />
      <KeyValue label="שימוש" value="דמי השתתפות בעסקאות קבוצתיות בלבד" />
    </InfoCard>
    <CTAButton href={creditsUrl}>הקרדיטים שלי</CTAButton>
    <Divider />
    <Muted>
      הקרדיט אינו ניתן למשיכה במזומן ואינו ניתן להעברה למשתמש אחר.
    </Muted>
  </EmailLayout>
)

export const template = {
  component: Email,
  subject: (d: Props) => `קיבלת ${d?.currency || '₪'}${d?.amount ?? 100} קרדיט · GroupBuild`,
  displayName: 'קרדיט על הפניית ספק',
  previewData: {
    name: 'נועה',
    amount: 100,
    currency: '₪',
    creditsUrl: 'https://groupbuild.co.il/resident/credits',
  },
} satisfies TemplateEntry
