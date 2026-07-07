import * as React from 'npm:react@18.3.1'
import type { TemplateEntry } from './registry.ts'
import { EmailLayout, H1, P, CTAButton, Muted, Divider } from './layout.tsx'

interface Props { name?: string; appUrl?: string }

const Email = ({ name, appUrl = 'https://groupbuild.co.il' }: Props) => (
  <EmailLayout preview="חשבון הדייר שלך אושר ב-GroupBuild">
    <H1>{name ? `${name}, החשבון שלך אושר 🎉` : 'החשבון שלך אושר'}</H1>
    <P>אישרנו את חשבון הדייר שלך — כעת ניתן להצטרף לרכישות קבוצתיות, לפתוח ביקושים ולעקוב אחרי הצעות פעילות.</P>
    <CTAButton href={appUrl}>כניסה לאזור האישי</CTAButton>
    <Divider />
    <Muted>קיבלת הודעה זו לאחר אישור חשבון הדייר במערכת GroupBuild.</Muted>
  </EmailLayout>
)

export const template = {
  component: Email,
  subject: (d: Props) => d?.name ? `${d.name} — החשבון שלך אושר ב-GroupBuild` : 'החשבון שלך אושר ב-GroupBuild',
  displayName: 'אישור דייר',
  previewData: { name: 'דנה', appUrl: 'https://groupbuild.co.il' },
} satisfies TemplateEntry
