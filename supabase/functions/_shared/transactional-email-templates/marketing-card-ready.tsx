import * as React from 'npm:react@18.3.1'
import {
  Body, Button, Container, Head, Heading, Html, Img, Preview, Section, Text, Hr, Link,
} from 'npm:@react-email/components@0.0.22'
import type { TemplateEntry } from './registry.ts'

interface Props {
  name?: string
  dealTitle?: string
  dealUrl?: string
  cardImageUrl?: string
  whatsappUrl?: string
}

const Email = ({ name, dealTitle = 'ההצעה שלך', dealUrl = 'https://groupbuild.co.il', cardImageUrl, whatsappUrl }: Props) => (
  <Html lang="he" dir="rtl">
    <Head />
    <Preview>{`חומר השיווק להצעה "${dealTitle}" מוכן`}</Preview>
    <Body style={main}>
      <Container style={container}>
        <Section style={brandBar}>
          <Text style={brandText}>GroupBuild · כלי שיווק</Text>
        </Section>
        <Heading style={h1}>{name ? `שלום ${name},` : 'שלום,'}</Heading>
        <Text style={p}>הכנו עבורך תמונה שיווקית מוכנה לפרסום עבור ההצעה <strong>{dealTitle}</strong>.</Text>
        {cardImageUrl ? (
          <Section style={{ textAlign: 'center', margin: '18px 0' }}>
            <Img src={cardImageUrl} alt={dealTitle} width="520" style={{ maxWidth: '100%', borderRadius: 16, border: '1px solid #E5E7EB' }} />
          </Section>
        ) : null}
        <Text style={p}>שתפו את ההצעה בקבוצות וואטסאפ, סטוריז ולקוחות פוטנציאליים — ככל שיותר מצטרפים, המחיר יורד.</Text>
        <Section style={{ textAlign: 'center', margin: '24px 0' }}>
          <Button href={whatsappUrl || dealUrl} style={btnGreen}>שיתוף בוואטסאפ</Button>
          <Text style={{ ...muted, margin: '10px 0' }}>או:</Text>
          <Button href={dealUrl} style={btnOutline}>צפייה בהצעה</Button>
        </Section>
        <Hr style={hr} />
        <Text style={muted}>לכלים נוספים והורדת הפורמטים — היכנסו ל"כלי שיווק" בחשבון הספק שלכם.</Text>
        <Text style={muted}>
          <Link href={dealUrl} style={{ color: '#0E6B5A' }}>{dealUrl}</Link>
        </Text>
      </Container>
    </Body>
  </Html>
)

export const template = {
  component: Email,
  subject: (d: Props) => `החומר השיווקי להצעה "${d?.dealTitle || 'שלך'}" מוכן`,
  displayName: 'חומר שיווק מוכן',
  previewData: {
    name: 'ישראל',
    dealTitle: 'ניקיון לובי',
    dealUrl: 'https://groupbuild.co.il/share/deal/123',
    cardImageUrl: 'https://placehold.co/520x520',
    whatsappUrl: 'https://wa.me/?text=...',
  },
} satisfies TemplateEntry

const main = { backgroundColor: '#ffffff', fontFamily: 'Heebo, Arial, sans-serif', color: '#0B1220' }
const container = { padding: '24px', maxWidth: '560px', margin: '0 auto' }
const brandBar = { background: 'linear-gradient(135deg, #0E6B5A 0%, #34A88E 100%)', padding: '14px 18px', borderRadius: '12px', marginBottom: '20px' }
const brandText = { color: '#ffffff', margin: 0, fontSize: '14px', fontWeight: 600 }
const h1 = { fontSize: '22px', margin: '0 0 8px', color: '#0B1220' }
const p = { fontSize: '15px', lineHeight: '24px', color: '#0B1220', margin: '8px 0' }
const btnGreen = { background: '#0E6B5A', color: '#ffffff', padding: '12px 26px', borderRadius: '12px', textDecoration: 'none', fontWeight: 700, fontSize: '15px', display: 'inline-block' }
const btnOutline = { background: '#ffffff', color: '#0E6B5A', padding: '11px 24px', borderRadius: '12px', border: '2px solid #0E6B5A', textDecoration: 'none', fontWeight: 700, fontSize: '15px', display: 'inline-block' }
const muted = { color: '#6B7280', fontSize: '13px', margin: '6px 0' }
const hr = { borderTop: '1px solid #E5E7EB', margin: '20px 0' }
