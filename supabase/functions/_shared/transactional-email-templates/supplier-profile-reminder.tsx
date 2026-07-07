import * as React from 'npm:react@18.3.1'
import type { TemplateEntry } from './registry.ts'
import { EmailLayout, H1, P, CTAButton, InfoCard, Muted, Divider } from './layout.tsx'

interface Props {
  businessName?: string
  missing?: string[]
  percent?: number
  onboardingUrl?: string
}

const Email = ({ businessName, missing = [], percent = 0, onboardingUrl = 'https://groupbuild.co.il/supplier/onboarding' }: Props) => (
  <EmailLayout preview={`השלמת פרופיל הספק — ${percent}% הושלמו`}>
    <H1>{businessName ? `${businessName}, נשאר לסיים את הפרופיל` : 'נשאר לסיים את הפרופיל'}</H1>
    <P>
      כדי להתחיל לקבל פניות מדיירים ולפרסם הצעות במערכת, יש להשלים את פרופיל העסק.
      כרגע הפרופיל שלך הושלם ב-<strong style={{ color: '#0F172A' }}>{percent}%</strong>.
    </P>
    {missing.length > 0 && (
      <InfoCard>
        <P><strong style={{ color: '#0F172A' }}>שדות שחסרים:</strong></P>
        {missing.map((m) => (
          <P key={m}>• {m}</P>
        ))}
      </InfoCard>
    )}
    <P>עד להשלמת הפרטים החיוניים, ההצעות שלך לא יופיעו לדיירים ולא תוכל לקבל לידים חדשים.</P>
    <CTAButton href={onboardingUrl}>השלמת פרופיל</CTAButton>
    <Divider />
    <Muted>קיבלת הודעה זו כי נרשמת כספק במערכת GroupBuild וטרם השלמת את הפרופיל.</Muted>
  </EmailLayout>
)

export const template = {
  component: Email,
  subject: (d: Props) => d?.businessName ? `${d.businessName} — נשאר להשלים את פרופיל הספק` : 'נשאר להשלים את פרופיל הספק שלך',
  displayName: 'תזכורת השלמת פרופיל ספק',
  previewData: {
    businessName: 'צביעת דירות דוד',
    missing: ['טלפון', 'תחום פעילות', 'אזור/עיר שירות'],
    percent: 50,
    onboardingUrl: 'https://groupbuild.co.il/supplier/onboarding',
  },
} satisfies TemplateEntry
