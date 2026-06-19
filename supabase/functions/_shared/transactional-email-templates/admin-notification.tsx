import * as React from 'npm:react@18.3.1'
import {
  Body, Container, Head, Heading, Html, Preview, Section, Text, Hr,
} from 'npm:@react-email/components@0.0.22'
import type { TemplateEntry } from './registry.ts'

interface Props {
  eventTitle?: string
  eventType?: string
  summary?: string
  details?: Record<string, string | number | undefined>
}

const labelFor = (t?: string) =>
  t === 'new_resident' ? 'דייר חדש'
  : t === 'new_supplier' ? 'ספק חדש'
  : t === 'deal_interest' ? 'התעניינות בעסקה'
  : t === 'waitlist_lead' ? 'הרשמה לרשימת המתנה'
  : 'אירוע חדש במערכת'

const Email = ({ eventTitle = 'התקבלה פעולה חדשה', eventType, summary, details }: Props) => (
  <Html lang="he" dir="rtl">
    <Head />
    <Preview>{eventTitle}</Preview>
    <Body style={main}>
      <Container style={container}>
        <Section style={brandBar}>
          <Text style={brandText}>GroupBuild · התראת מנהל</Text>
        </Section>
        <Heading style={h1}>{labelFor(eventType)}</Heading>
        <Text style={p}>{eventTitle}</Text>
        {summary ? <Text style={p}>{summary}</Text> : null}
        {details && Object.keys(details).length > 0 ? (
          <Section style={card}>
            {Object.entries(details).map(([k, v]) => (
              <Text key={k} style={kv}>
                <span style={kLabel}>{k}: </span>
                <span>{String(v ?? '')}</span>
              </Text>
            ))}
          </Section>
        ) : null}
        <Hr style={hr} />
        <Text style={muted}>הודעה אוטומטית ממערכת GroupBuild.</Text>
      </Container>
    </Body>
  </Html>
)

export const template = {
  component: Email,
  subject: (d: Props) => `[GroupBuild] ${labelFor(d?.eventType)}${d?.eventTitle ? ' — ' + d.eventTitle : ''}`,
  displayName: 'התראת מנהל',
  previewData: {
    eventType: 'new_resident',
    eventTitle: 'נרשם דייר חדש',
    summary: 'דייר חדש הצטרף לפרויקט.',
    details: { פרויקט: 'רמת אביב 12', עיר: 'תל אביב' },
  },
} satisfies TemplateEntry

const main = { backgroundColor: '#ffffff', fontFamily: 'Heebo, Arial, sans-serif', color: '#0B1220' }
const container = { padding: '24px', maxWidth: '560px', margin: '0 auto' }
const brandBar = { background: 'linear-gradient(135deg, #0E6B5A 0%, #34A88E 100%)', padding: '14px 18px', borderRadius: '12px', marginBottom: '20px' }
const brandText = { color: '#ffffff', margin: 0, fontSize: '14px', fontWeight: 600 }
const h1 = { fontSize: '22px', margin: '0 0 8px', color: '#0B1220' }
const p = { fontSize: '15px', lineHeight: '24px', color: '#0B1220', margin: '8px 0' }
const card = { background: '#F7F5F0', border: '1px solid #E5E7EB', borderRadius: '12px', padding: '14px 16px', margin: '12px 0' }
const kv = { fontSize: '14px', margin: '4px 0', color: '#0B1220' }
const kLabel = { color: '#0E6B5A', fontWeight: 600 }
const hr = { borderColor: '#E5E7EB', margin: '20px 0' }
const muted = { fontSize: '12px', color: '#6B7280' }
