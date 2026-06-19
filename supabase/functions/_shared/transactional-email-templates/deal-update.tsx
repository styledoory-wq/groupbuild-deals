import * as React from 'npm:react@18.3.1'
import {
  Body, Button, Container, Head, Heading, Html, Preview, Section, Text, Hr,
} from 'npm:@react-email/components@0.0.22'
import type { TemplateEntry } from './registry.ts'

interface Props {
  name?: string
  dealTitle?: string
  message?: string
  dealUrl?: string
}

const Email = ({ name, dealTitle = 'העסקה שלך', message, dealUrl = 'https://groupbuild.co.il' }: Props) => (
  <Html lang="he" dir="rtl">
    <Head />
    <Preview>{`עדכון על ${dealTitle}`}</Preview>
    <Body style={main}>
      <Container style={container}>
        <Section style={brandBar}>
          <Text style={brandText}>GroupBuild · עדכון עסקה</Text>
        </Section>
        <Heading style={h1}>{name ? `שלום ${name},` : 'שלום,'}</Heading>
        <Text style={p}>יש עדכון חדש בעסקה <strong>{dealTitle}</strong>.</Text>
        {message ? <Section style={card}><Text style={p}>{message}</Text></Section> : null}
        <Section style={{ textAlign: 'center', margin: '24px 0' }}>
          <Button href={dealUrl} style={btn}>צפייה בעסקה</Button>
        </Section>
        <Hr style={hr} />
        <Text style={muted}>קיבלת מייל זה כי הצטרפת לעסקה זו ב-GroupBuild.</Text>
      </Container>
    </Body>
  </Html>
)

export const template = {
  component: Email,
  subject: (d: Props) => `עדכון: ${d?.dealTitle || 'העסקה שלך'}`,
  displayName: 'עדכון עסקה',
  previewData: { name: 'דנה', dealTitle: 'ניקיון לובי', message: 'נותרו 3 ימים לסגירת העסקה.', dealUrl: 'https://groupbuild.co.il' },
} satisfies TemplateEntry

const main = { backgroundColor: '#ffffff', fontFamily: 'Heebo, Arial, sans-serif', color: '#0B1220' }
const container = { padding: '24px', maxWidth: '560px', margin: '0 auto' }
const brandBar = { background: 'linear-gradient(135deg, #0E6B5A 0%, #34A88E 100%)', padding: '14px 18px', borderRadius: '12px', marginBottom: '20px' }
const brandText = { color: '#ffffff', margin: 0, fontSize: '14px', fontWeight: 600 }
const h1 = { fontSize: '22px', margin: '0 0 8px', color: '#0B1220' }
const p = { fontSize: '15px', lineHeight: '24px', color: '#0B1220', margin: '8px 0' }
const card = { background: '#F7F5F0', border: '1px solid #E5E7EB', borderRadius: '12px', padding: '14px 16px', margin: '12px 0' }
const btn = { background: '#0E6B5A', color: '#ffffff', padding: '12px 26px', borderRadius: '12px', textDecoration: 'none', fontWeight: 600, fontSize: '15px', display: 'inline-block' }
const hr = { borderColor: '#E5E7EB', margin: '20px 0' }
const muted = { fontSize: '12px', color: '#6B7280' }
