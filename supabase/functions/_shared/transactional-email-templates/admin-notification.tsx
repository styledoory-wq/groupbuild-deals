import * as React from 'npm:react@18.3.1'
import type { TemplateEntry } from './registry.ts'
import { EmailLayout, H1, P, InfoCard, KeyValue, Muted, Divider } from './layout.tsx'

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
  : t === 'new_demand' ? 'ביקוש חדש'
  : t === 'new_lead' ? 'ליד חדש'
  : t === 'new_deposit' ? 'פיקדון חדש'
  : 'אירוע חדש במערכת'

const Email = ({ eventTitle = 'התקבלה פעולה חדשה', eventType, summary, details }: Props) => (
  <EmailLayout preview={eventTitle}>
    <H1>{labelFor(eventType)}</H1>
    <P>{eventTitle}</P>
    {summary ? <P>{summary}</P> : null}
    {details && Object.keys(details).length > 0 ? (
      <InfoCard>
        {Object.entries(details).map(([k, v]) => (
          <KeyValue key={k} label={k} value={String(v ?? '')} />
        ))}
      </InfoCard>
    ) : null}
    <Divider />
    <Muted>הודעה אוטומטית ממערכת GroupBuild — התראת מנהל.</Muted>
  </EmailLayout>
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
