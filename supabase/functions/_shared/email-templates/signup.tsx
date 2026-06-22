/// <reference types="npm:@types/react@18.3.1" />

import * as React from 'npm:react@18.3.1'

import {
  Body,
  Button,
  Container,
  Head,
  Heading,
  Html,
  Link,
  Preview,
  Text,
} from 'npm:@react-email/components@0.0.22'

interface SignupEmailProps {
  siteName: string
  siteUrl: string
  recipient: string
  confirmationUrl: string
}

export const SignupEmail = ({
  siteName,
  siteUrl,
  recipient,
  confirmationUrl,
}: SignupEmailProps) => (
  <Html lang="he" dir="rtl">
    <Head />
    <Preview>אישור כתובת המייל שלך ב-{siteName}</Preview>
    <Body style={main}>
      <Container style={container}>
        <Heading style={h1}>ברוכים הבאים ל-{siteName} 👋</Heading>
        <Text style={text}>
          תודה שנרשמת ל-
          <Link href={siteUrl} style={link}>
            <strong>{siteName}</strong>
          </Link>
          .
        </Text>
        <Text style={text}>
          כדי להפעיל את החשבון שלך, נא לאשר את כתובת המייל (
          <Link href={`mailto:${recipient}`} style={link}>
            {recipient}
          </Link>
          ) באמצעות לחיצה על הכפתור:
        </Text>
        <Button style={button} href={confirmationUrl}>
          אישור כתובת המייל
        </Button>
        <Text style={text}>
          אם הכפתור לא עובד, אפשר להעתיק את הקישור הבא לדפדפן:
          <br />
          <Link href={confirmationUrl} style={link}>{confirmationUrl}</Link>
        </Text>
        <Text style={footer}>
          אם לא נרשמת ל-{siteName}, אפשר להתעלם מהמייל הזה.
        </Text>
      </Container>
    </Body>
  </Html>
)

export default SignupEmail

const main = { backgroundColor: '#ffffff', fontFamily: 'Arial, sans-serif', direction: 'rtl' as const }
const container = { padding: '24px 28px', textAlign: 'right' as const }
const h1 = {
  fontSize: '22px',
  fontWeight: 'bold' as const,
  color: '#0B1220',
  margin: '0 0 20px',
}
const text = {
  fontSize: '15px',
  color: '#374151',
  lineHeight: '1.7',
  margin: '0 0 20px',
}
const link = { color: '#0E6B5A', textDecoration: 'underline' }
const button = {
  backgroundColor: '#0E6B5A',
  color: '#ffffff',
  fontSize: '15px',
  fontWeight: 'bold' as const,
  borderRadius: '12px',
  padding: '14px 28px',
  textDecoration: 'none',
  display: 'inline-block',
}
const footer = { fontSize: '12px', color: '#9CA3AF', margin: '30px 0 0' }
