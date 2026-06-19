import * as React from 'npm:react@18.3.1'
import {
  Body, Button, Container, Head, Heading, Html, Preview, Section, Text, Hr,
} from 'npm:@react-email/components@0.0.22'
import type { TemplateEntry } from './registry.ts'

interface Props {
  name?: string
  appUrl?: string
}

const Email = ({ name, appUrl = 'https://groupbuild.co.il' }: Props) => (
  <Html lang="he" dir="rtl">
    <Head />
    <Preview>ברוכים הבאים ל-GroupBuild</Preview>
    <Body style={main}>
      <Container style={container}>
        <Section style={brandBar}>
          <Text style={brandText}>GroupBuild</Text>
        </Section>
        <Heading style={h1}>{name ? `שלום ${name}, ברוך/ה הבא/ה!` : 'ברוכים הבאים!'}</Heading>
        <Text style={p}>
          הצטרפת ל-GroupBuild — הפלטפורמה שמאחדת דיירים, ועדי בתים וספקים
          כדי לקבל את המחירים הטובים ביותר לשירותי הבית והבניין.
        </Text>
        <Text style={p}>
          תוכל/י לעיין בקטגוריות, להצטרף לעסקאות קבוצתיות פעילות, ולעקוב אחרי
          ההצעות שלך — הכל ממקום אחד.
        </Text>
        <Section style={{ textAlign: 'center', margin: '24px 0' }}>
          <Button href={appUrl} style={btn}>כניסה לאפליקציה</Button>
        </Section>
        <Hr style={hr} />
        <Text style={muted}>קיבלת מייל זה כי נפתח עבורך חשבון במערכת GroupBuild.</Text>
      </Container>
    </Body>
  </Html>
)

export const template = {
  component: Email,
  subject: (d: Props) => d?.name ? `${d.name}, ברוך/ה הבא/ה ל-GroupBuild` : 'ברוכים הבאים ל-GroupBuild',
  displayName: 'אישור הרשמה',
  previewData: { name: 'דנה', appUrl: 'https://groupbuild.co.il' },
} satisfies TemplateEntry

const main = { backgroundColor: '#ffffff', fontFamily: 'Heebo, Arial, sans-serif', color: '#0B1220' }
const container = { padding: '24px', maxWidth: '560px', margin: '0 auto' }
const brandBar = { background: 'linear-gradient(135deg, #0E6B5A 0%, #34A88E 100%)', padding: '14px 18px', borderRadius: '12px', marginBottom: '20px' }
const brandText = { color: '#ffffff', margin: 0, fontSize: '16px', fontWeight: 700 }
const h1 = { fontSize: '24px', margin: '0 0 8px', color: '#0B1220' }
const p = { fontSize: '15px', lineHeight: '24px', color: '#0B1220', margin: '10px 0' }
const btn = { background: '#0E6B5A', color: '#ffffff', padding: '12px 26px', borderRadius: '12px', textDecoration: 'none', fontWeight: 600, fontSize: '15px', display: 'inline-block' }
const hr = { borderColor: '#E5E7EB', margin: '20px 0' }
const muted = { fontSize: '12px', color: '#6B7280' }
