import * as React from 'npm:react@18.3.1'
import { Img, Section } from 'npm:@react-email/components@0.0.22'
import type { TemplateEntry } from './registry.ts'
import { EmailLayout, H1, P, CTAButton, Muted, Divider } from './layout.tsx'

interface Props {
  name?: string
  dealTitle?: string
  dealUrl?: string
  cardImageUrl?: string
  whatsappUrl?: string
}

const Email = ({ name, dealTitle = 'ההצעה שלך', dealUrl = 'https://groupbuild.co.il', cardImageUrl, whatsappUrl }: Props) => (
  <EmailLayout preview={`חומר השיווק להצעה "${dealTitle}" מוכן`}>
    <H1>{name ? `${name}, החומר השיווקי מוכן` : 'החומר השיווקי מוכן'}</H1>
    <P>הכנו עבורך תמונה מעוצבת ומוכנה לפרסום עבור ההצעה <strong style={{ color: '#0F172A' }}>{dealTitle}</strong>.</P>
    {cardImageUrl ? (
      <Section style={{ textAlign: 'center', margin: '20px 0' }}>
        <Img src={cardImageUrl} alt={dealTitle} width="520" style={{ maxWidth: '100%', borderRadius: 14, border: '1px solid #E5E7EB' }} />
      </Section>
    ) : null}
    <P>שיתוף בקבוצות וואטסאפ, סטוריז ולקוחות פוטנציאליים — ככל שיותר מצטרפים, המחיר יורד.</P>
    <CTAButton href={whatsappUrl || dealUrl}>שיתוף בוואטסאפ</CTAButton>
    <CTAButton href={dealUrl} variant="outline">צפייה בהצעה</CTAButton>
    <Divider />
    <Muted>לכלים נוספים והורדת פורמטים — היכנסו ל"כלי שיווק" בחשבון הספק שלכם.</Muted>
  </EmailLayout>
)

export const template = {
  component: Email,
  subject: (d: Props) => `החומר השיווקי להצעה "${d?.dealTitle || 'שלך'}" מוכן`,
  displayName: 'חומר שיווק מוכן',
  previewData: {
    name: 'ישראל', dealTitle: 'ניקיון לובי',
    dealUrl: 'https://groupbuild.co.il/share/deal/123',
    cardImageUrl: 'https://placehold.co/520x520',
    whatsappUrl: 'https://wa.me/?text=...',
  },
} satisfies TemplateEntry
