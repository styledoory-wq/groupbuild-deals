import * as React from 'npm:react@18.3.1'
import type { TemplateEntry } from './registry.ts'
import { EmailLayout, H1, P, CTAButton, InfoCard, KeyValue, Muted, Divider } from './layout.tsx'

interface Props {
  name?: string
  dealTitle?: string
  status?: string
  message?: string
  dealUrl?: string
}

const Email = ({ name, dealTitle = 'העסקה שלך', status, message, dealUrl = 'https://groupbuild.co.il' }: Props) => (
  <EmailLayout preview={`עדכון: ${dealTitle}`}>
    <H1>{name ? `שלום ${name},` : 'שלום,'}</H1>
    <P>יש עדכון חדש בעסקה <strong style={{ color: '#0F172A' }}>{dealTitle}</strong>.</P>
    <InfoCard>
      <KeyValue label="עסקה" value={dealTitle} />
      {status ? <KeyValue label="סטטוס" value={status} /> : null}
      {message ? <KeyValue label="פרטים" value={message} /> : null}
    </InfoCard>
    <CTAButton href={dealUrl}>צפייה בעסקה</CTAButton>
    <Divider />
    <Muted>קיבלת הודעה זו כי הצטרפת לעסקה זו ב-GroupBuild.</Muted>
  </EmailLayout>
)

export const template = {
  component: Email,
  subject: (d: Props) => `עדכון עסקה: ${d?.dealTitle || 'העסקה שלך'}`,
  displayName: 'עדכון סטטוס עסקה',
  previewData: { name: 'דנה', dealTitle: 'ניקיון לובי', status: 'פעילה', message: 'נותרו 3 ימים לסגירת העסקה.', dealUrl: 'https://groupbuild.co.il' },
} satisfies TemplateEntry
