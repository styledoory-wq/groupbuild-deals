import * as React from 'npm:react@18.3.1'
import type { TemplateEntry } from './registry.ts'
import { EmailLayout, H1, P, CTAButton, Muted, Divider } from './layout.tsx'

interface Props {
  name?: string
  appUrl?: string
  role?: 'supplier' | 'resident'
  whatsappUrl?: string
}

const Email = ({
  name,
  appUrl = 'https://groupbuild.co.il',
  role = 'resident',
  whatsappUrl = 'https://wa.me/972526247941',
}: Props) => {
  const isSupplier = role === 'supplier'
  return (
    <EmailLayout preview={name ? `${name}, ברוכים הבאים ל-GroupBuild` : 'ברוכים הבאים ל-GroupBuild'}>
      <H1>{name ? `שלום ${name}, ברוכים הבאים 👋` : 'ברוכים הבאים ל-GroupBuild 👋'}</H1>
      <P>
        שמחים שהצטרפת ל-GroupBuild — הפלטפורמה שמחברת דיירים, ועדי בתים וספקים
        לרכישות משותפות במחירים הכי טובים.
      </P>
      {isSupplier ? (
        <P>
          כספק, כדאי להשלים את הפרופיל העסקי שלך (תחומים, אזורי שירות, לוגו ותיאור) —
          כך תופיע ללקוחות רלוונטיים ותקבל פניות ישירות מדיירים וועדי בתים.
        </P>
      ) : (
        <P>
          אפשר לעיין בקטגוריות, להצטרף לרכישות קבוצתיות פעילות ולעקוב אחרי ההצעות שלך —
          הכל ממקום אחד באפליקציה.
        </P>
      )}
      <CTAButton href={isSupplier ? `${appUrl}/supplier/onboarding` : appUrl}>
        {isSupplier ? 'השלמת פרופיל ספק' : 'כניסה לאפליקציה'}
      </CTAButton>
      <Divider />
      <P>
        <strong>יש שאלות?</strong> אנחנו כאן בשבילך.
      </P>
      <P>
        אפשר לפנות אלינו ישירות ב־WhatsApp ונחזור אליך מהר:
      </P>
      <CTAButton href={whatsappUrl}>💬 דברו איתנו בוואטסאפ</CTAButton>
      <Divider />
      <Muted>קיבלת הודעה זו כי נפתח עבורך חשבון במערכת GroupBuild.</Muted>
    </EmailLayout>
  )
}

export const template = {
  component: Email,
  subject: (d: Props) =>
    d?.name ? `${d.name}, ברוכים הבאים ל-GroupBuild` : 'ברוכים הבאים ל-GroupBuild',
  displayName: 'ברוכים הבאים',
  previewData: {
    name: 'דנה',
    appUrl: 'https://groupbuild.co.il',
    role: 'resident',
    whatsappUrl: 'https://wa.me/972526247941',
  },
} satisfies TemplateEntry
