import * as React from 'npm:react@18.3.1'
import type { TemplateEntry } from './registry.ts'
import { EmailLayout, H1, P, CTAButton, Muted, Divider } from './layout.tsx'

interface Props { businessName?: string; appUrl?: string }

const Email = ({ businessName, appUrl = 'https://groupbuild.co.il/supplier/dashboard' }: Props) => (
  <EmailLayout preview="חשבון הספק שלך אושר ב-GroupBuild">
    <H1>{businessName ? `${businessName}, החשבון שלך אושר 🎉` : 'החשבון שלך אושר'}</H1>
    <P>ברכות — פרופיל הספק שלך אושר ומופיע כעת בפני דיירים בכל הארץ.</P>
    <P>מעכשיו תוכלו לקבל לידים, ליצור הצעות ולנהל רכישות קבוצתיות ישירות מהמערכת.</P>
    <CTAButton href={appUrl}>מעבר לדשבורד הספק</CTAButton>
    <Divider />
    <Muted>קיבלת הודעה זו לאחר אישור פרופיל הספק שלך במערכת GroupBuild.</Muted>
  </EmailLayout>
)

export const template = {
  component: Email,
  subject: (d: Props) => d?.businessName ? `${d.businessName} — אושרת כספק ב-GroupBuild` : 'אושרת כספק ב-GroupBuild',
  displayName: 'אישור ספק',
  previewData: { businessName: 'צביעת דירות דוד', appUrl: 'https://groupbuild.co.il/supplier/dashboard' },
} satisfies TemplateEntry
