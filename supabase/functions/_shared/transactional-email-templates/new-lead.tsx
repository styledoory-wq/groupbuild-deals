import * as React from 'npm:react@18.3.1'
import type { TemplateEntry } from './registry.ts'
import { EmailLayout, H1, P, CTAButton, InfoCard, KeyValue, Muted, Divider } from './layout.tsx'

interface Props {
  supplierName?: string
  category?: string
  city?: string
  projectType?: string
  description?: string
  leadUrl?: string
}

const Email = ({ supplierName, category, city, projectType, description, leadUrl = 'https://groupbuild.co.il/supplier/leads' }: Props) => (
  <EmailLayout preview="ליד חדש עבורך ב-GroupBuild">
    <H1>{supplierName ? `${supplierName}, יש לך ליד חדש 📩` : 'יש לך ליד חדש'}</H1>
    <P>התקבל ביקוש שמתאים לתחום ולאזור השירות שלך. כדאי להגיב מהר — הראשונים לענות מקבלים עדיפות.</P>
    <InfoCard>
      {category ? <KeyValue label="קטגוריה" value={category} /> : null}
      {projectType ? <KeyValue label="סוג פרויקט" value={projectType} /> : null}
      {city ? <KeyValue label="עיר / אזור" value={city} /> : null}
      {description ? <KeyValue label="תיאור" value={description} /> : null}
    </InfoCard>
    <CTAButton href={leadUrl}>צפייה בליד</CTAButton>
    <Divider />
    <Muted>קיבלת הודעה זו כי נרשמת כספק פעיל במערכת GroupBuild.</Muted>
  </EmailLayout>
)

export const template = {
  component: Email,
  subject: (d: Props) => `ליד חדש${d?.category ? ' · ' + d.category : ''}`,
  displayName: 'ליד חדש',
  previewData: { supplierName: 'צביעת דירות דוד', category: 'צביעה', city: 'תל אביב', projectType: 'ועד בית', description: 'צביעת חדר מדרגות ולובי', leadUrl: 'https://groupbuild.co.il/supplier/leads' },
} satisfies TemplateEntry
