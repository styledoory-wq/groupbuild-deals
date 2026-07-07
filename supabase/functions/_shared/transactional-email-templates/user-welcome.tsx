import * as React from 'npm:react@18.3.1'
import type { TemplateEntry } from './registry.ts'
import { EmailLayout, H1, P, CTAButton, Muted, Divider } from './layout.tsx'

interface Props { name?: string; appUrl?: string }

const Email = ({ name, appUrl = 'https://groupbuild.co.il' }: Props) => (
  <EmailLayout preview={name ? `${name}, ברוכים הבאים ל-GroupBuild` : 'ברוכים הבאים ל-GroupBuild'}>
    <H1>{name ? `שלום ${name}, ברוכים הבאים 👋` : 'ברוכים הבאים ל-GroupBuild'}</H1>
    <P>
      הצטרפת לפלטפורמה שמאחדת דיירים, ועדי בתים וספקים —
      כדי לקבל את המחירים הטובים ביותר לשירותי הבית והבניין.
    </P>
    <P>
      אפשר לעיין בקטגוריות, להצטרף לרכישות קבוצתיות פעילות ולעקוב אחרי ההצעות שלך — הכול ממקום אחד.
    </P>
    <CTAButton href={appUrl}>כניסה לאפליקציה</CTAButton>
    <Divider />
    <Muted>קיבלת הודעה זו כי נפתח עבורך חשבון במערכת GroupBuild.</Muted>
  </EmailLayout>
)

export const template = {
  component: Email,
  subject: (d: Props) => d?.name ? `${d.name}, ברוכים הבאים ל-GroupBuild` : 'ברוכים הבאים ל-GroupBuild',
  displayName: 'ברוכים הבאים',
  previewData: { name: 'דנה', appUrl: 'https://groupbuild.co.il' },
} satisfies TemplateEntry
