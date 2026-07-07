import * as React from 'npm:react@18.3.1'
import {
  Body, Container, Head, Html, Preview, Section, Text, Hr, Link, Font,
} from 'npm:@react-email/components@0.0.22'

/**
 * Shared GroupBuild email layout.
 * Premium SaaS look, RTL, Hebrew-first, white background, soft shadows,
 * rounded corners, Heebo typography. Reuse across every template.
 */
interface LayoutProps {
  preview: string
  children: React.ReactNode
  footerNote?: string
}

const LOGO_URL = 'https://groupbuild.co.il/icons/icon-192.png'
const SITE_URL = 'https://groupbuild.co.il'

export const EmailLayout = ({ preview, children, footerNote }: LayoutProps) => (
  <Html lang="he" dir="rtl">
    <Head>
      <Font
        fontFamily="Heebo"
        fallbackFontFamily="Arial"
        webFont={{
          url: 'https://fonts.gstatic.com/s/heebo/v26/NGS6v5_NC0k9P9H0TbFzsQ.woff2',
          format: 'woff2',
        }}
        fontWeight={400}
        fontStyle="normal"
      />
      <Font
        fontFamily="Heebo"
        fallbackFontFamily="Arial"
        webFont={{
          url: 'https://fonts.gstatic.com/s/heebo/v26/NGS6v5_NC0k9P9H1TrFzsQ.woff2',
          format: 'woff2',
        }}
        fontWeight={600}
        fontStyle="normal"
      />
      <Font
        fontFamily="Heebo"
        fallbackFontFamily="Arial"
        webFont={{
          url: 'https://fonts.gstatic.com/s/heebo/v26/NGS6v5_NC0k9P9H2TbFzsQ.woff2',
          format: 'woff2',
        }}
        fontWeight={700}
        fontStyle="normal"
      />
    </Head>
    <Preview>{preview}</Preview>
    <Body style={body}>
      <Container style={outer}>
        {/* Header */}
        <Section style={header}>
          <table width="100%" cellPadding={0} cellSpacing={0} role="presentation" style={{ borderCollapse: 'collapse' }}>
            <tr>
              <td style={{ textAlign: 'right' as const, verticalAlign: 'middle' }}>
                <Text style={brand}>GroupBuild</Text>
                <Text style={brandSub}>קונים ביחד. חוסכים ביחד.</Text>
              </td>
            </tr>
          </table>
        </Section>

        {/* Card */}
        <Section style={card}>
          {children}
        </Section>

        {/* Footer */}
        <Section style={footer}>
          <Text style={footerText}>
            {footerNote || 'קיבלת הודעה זו מ-GroupBuild — פלטפורמת הרכישות המשותפות לדיירים, ועדים וספקים.'}
          </Text>
          <Text style={footerText}>
            <Link href={SITE_URL} style={footerLink}>groupbuild.co.il</Link>
            <span style={{ color: '#CBD5E1', margin: '0 8px' }}>·</span>
            <Link href={`${SITE_URL}/support`} style={footerLink}>תמיכה</Link>
            <span style={{ color: '#CBD5E1', margin: '0 8px' }}>·</span>
            <Link href={`${SITE_URL}/privacy`} style={footerLink}>פרטיות</Link>
          </Text>
          <Text style={footerCopy}>© {new Date().getFullYear()} GroupBuild. כל הזכויות שמורות.</Text>
        </Section>
      </Container>
    </Body>
  </Html>
)

/* ============== Shared building blocks ============== */

export const H1: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <Text style={h1}>{children}</Text>
)

export const P: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <Text style={p}>{children}</Text>
)

export const Muted: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <Text style={muted}>{children}</Text>
)

export const InfoCard: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <Section style={infoCard}>{children}</Section>
)

export const KeyValue: React.FC<{ label: string; value: React.ReactNode }> = ({ label, value }) => (
  <table width="100%" cellPadding={0} cellSpacing={0} role="presentation" style={{ borderCollapse: 'collapse', margin: '4px 0' }}>
    <tr>
      <td style={{ padding: '6px 0', fontSize: 14, color: '#64748B', width: '40%', verticalAlign: 'top' }}>{label}</td>
      <td style={{ padding: '6px 0', fontSize: 14, color: '#0F172A', fontWeight: 600, verticalAlign: 'top' }}>{value}</td>
    </tr>
  </table>
)

export const CTAButton: React.FC<{ href: string; children: React.ReactNode; variant?: 'primary' | 'outline' }> = ({
  href, children, variant = 'primary',
}) => (
  <Section style={{ textAlign: 'center', margin: '28px 0 8px' }}>
    <a href={href} style={variant === 'primary' ? btnPrimary : btnOutline}>{children}</a>
  </Section>
)

export const Divider: React.FC = () => <Hr style={hr} />

/* ============== Design tokens (inline styles) ============== */

const BRAND = '#0E6B5A'
const BRAND_DARK = '#0A5646'
const INK = '#0F172A'
const INK_SOFT = '#334155'
const MUTED = '#64748B'
const SURFACE = '#F8FAFC'
const BORDER = '#E5E7EB'

const body = {
  backgroundColor: '#ffffff',
  fontFamily: 'Heebo, "Segoe UI", Arial, sans-serif',
  color: INK,
  margin: 0,
  padding: '24px 12px',
}

const outer = {
  maxWidth: '600px',
  margin: '0 auto',
  padding: 0,
}

const header = {
  padding: '4px 4px 20px',
}

const brand = {
  margin: 0,
  fontSize: 22,
  fontWeight: 700,
  color: BRAND,
  letterSpacing: '-0.01em',
}

const brandSub = {
  margin: '2px 0 0',
  fontSize: 12,
  color: MUTED,
  fontWeight: 400,
}

const card = {
  background: '#ffffff',
  border: `1px solid ${BORDER}`,
  borderRadius: 16,
  padding: '32px 28px',
  boxShadow: '0 2px 8px rgba(15,23,42,0.04), 0 12px 32px rgba(15,23,42,0.06)',
}

const h1 = {
  fontSize: 24,
  lineHeight: '32px',
  fontWeight: 700,
  color: INK,
  margin: '0 0 12px',
  letterSpacing: '-0.01em',
}

const p = {
  fontSize: 15,
  lineHeight: '26px',
  color: INK_SOFT,
  margin: '10px 0',
}

const muted = {
  fontSize: 13,
  lineHeight: '22px',
  color: MUTED,
  margin: '8px 0',
}

const infoCard = {
  background: SURFACE,
  border: `1px solid ${BORDER}`,
  borderRadius: 12,
  padding: '16px 18px',
  margin: '18px 0',
}

const btnPrimary = {
  background: BRAND,
  color: '#ffffff',
  padding: '14px 32px',
  borderRadius: 12,
  textDecoration: 'none',
  fontWeight: 700,
  fontSize: 15,
  display: 'inline-block',
  boxShadow: `0 6px 16px ${BRAND_DARK}33`,
}

const btnOutline = {
  background: '#ffffff',
  color: BRAND,
  padding: '13px 30px',
  borderRadius: 12,
  border: `2px solid ${BRAND}`,
  textDecoration: 'none',
  fontWeight: 700,
  fontSize: 15,
  display: 'inline-block',
}

const hr = {
  border: 'none',
  borderTop: `1px solid ${BORDER}`,
  margin: '24px 0',
}

const footer = {
  padding: '24px 8px 8px',
  textAlign: 'center' as const,
}

const footerText = {
  fontSize: 12,
  color: MUTED,
  margin: '4px 0',
  lineHeight: '20px',
}

const footerLink = {
  color: BRAND,
  textDecoration: 'none',
  fontWeight: 600,
}

const footerCopy = {
  fontSize: 11,
  color: '#94A3B8',
  margin: '12px 0 0',
}

export const tokens = { BRAND, BRAND_DARK, INK, INK_SOFT, MUTED, SURFACE, BORDER }
