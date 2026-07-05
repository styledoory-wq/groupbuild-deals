import * as React from 'npm:react@18.3.1'
import {
  Body, Button, Container, Head, Heading, Html, Preview, Section, Text, Hr,
} from 'npm:@react-email/components@0.0.22'
import type { TemplateEntry } from './registry.ts'

interface Props {
  businessName?: string
  missing?: string[]
  percent?: number
  onboardingUrl?: string
}

const Email = ({
  businessName,
  missing = [],
  percent = 0,
  onboardingUrl = 'https://groupbuild.co.il/supplier/onboarding',
}: Props) => (
  <Html lang="he" dir="rtl">
    <Head />
    <Preview>השלמת פרופיל הספק — {percent}% הושלם</Preview>
    <Body style={main}>
      <Container style={container}>
        <Section style={brandBar}>
          <Text style={brandText}>GroupBuild</Text>
        </Section>
        <Heading style={h1}>
          {businessName ? `${businessName}, נשאר רק לסיים את הפרופיל` : 'נשאר רק לסיים את הפרופיל'}
        </Heading>
        <Text style={p}>
          כדי להתחיל לקבל פניות מדיירים ולפרסם הצעות במערכת, יש להשלים את פרופיל העסק שלך.
          כרגע הפרופיל שלך הושלם ב-<b>{percent}%</b>.
        </Text>
        {missing.length > 0 && (
          <Section style={missingBox}>
            <Text style={missingTitle}>שדות שחסרים:</Text>
            <Text style={missingList}>{missing.map((m) => `• ${m}`).join('\n')}</Text>
          </Section>
        )}
        <Text style={p}>
          עד להשלמת הפרטים החיוניים, ההצעות שלך לא יופיעו לדיירים ולא תוכל לקבל לידים חדשים.
        </Text>
        <Section style={{ textAlign: 'center', margin: '24px 0' }}>
          <Button href={onboardingUrl} style={btn}>השלמת פרופיל</Button>
        </Section>
        <Hr style={hr} />
        <Text style={muted}>קיבלת מייל זה כי נרשמת כספק במערכת GroupBuild וטרם השלמת את הפרופיל.</Text>
      </Container>
    </Body>
  </Html>
)

export const template = {
  component: Email,
  subject: (d: Props) =>
    d?.businessName
      ? `${d.businessName} — נשאר להשלים את פרופיל הספק`
      : 'נשאר להשלים את פרופיל הספק שלך',
  displayName: 'תזכורת השלמת פרופיל ספק',
  previewData: {
    businessName: 'צביעת דירות דוד',
    missing: ['טלפון', 'תחום פעילות', 'אזור/עיר שירות'],
    percent: 50,
    onboardingUrl: 'https://groupbuild.co.il/supplier/onboarding',
  },
} satisfies TemplateEntry

const main = { backgroundColor: '#ffffff', fontFamily: 'Heebo, Arial, sans-serif', color: '#0B1220' }
const container = { padding: '24px', maxWidth: '560px', margin: '0 auto' }
const brandBar = { background: 'linear-gradient(135deg, #0E6B5A 0%, #34A88E 100%)', padding: '14px 18px', borderRadius: '12px', marginBottom: '20px' }
const brandText = { color: '#ffffff', margin: 0, fontSize: '16px', fontWeight: 700 }
const h1 = { fontSize: '22px', margin: '0 0 8px', color: '#0B1220' }
const p = { fontSize: '15px', lineHeight: '24px', color: '#0B1220', margin: '10px 0' }
const missingBox = { background: '#FEF3C7', border: '1px solid #FDE68A', borderRadius: '10px', padding: '12px 14px', margin: '12px 0' }
const missingTitle = { fontSize: '13px', fontWeight: 700, color: '#92400E', margin: '0 0 6px' }
const missingList = { fontSize: '14px', color: '#78350F', margin: 0, whiteSpace: 'pre-line' as const }
const btn = { background: '#0E6B5A', color: '#ffffff', padding: '12px 26px', borderRadius: '12px', textDecoration: 'none', fontWeight: 600, fontSize: '15px', display: 'inline-block' }
const hr = { borderColor: '#E5E7EB', margin: '20px 0' }
const muted = { fontSize: '12px', color: '#6B7280' }
