/// <reference types="npm:@types/react@18.3.1" />
import * as React from 'npm:react@18.3.1'
import { EmailLayout, H1, P, CTAButton, Muted, Divider } from '../transactional-email-templates/layout.tsx'

interface Props {
  siteName: string
  siteUrl: string
  recipient: string
  confirmationUrl: string
}

export const SignupEmail = ({ recipient, confirmationUrl }: Props) => (
  <EmailLayout preview="אישור כתובת המייל שלך ב-GroupBuild">
    <H1>ברוכים הבאים ל-GroupBuild 👋</H1>
    <P>תודה שנרשמת. כדי להפעיל את החשבון, נא לאשר את כתובת המייל:</P>
    <P><strong style={{ color: '#0F172A' }}>{recipient}</strong></P>
    <CTAButton href={confirmationUrl}>אישור כתובת המייל</CTAButton>
    <P>אם הכפתור לא עובד, אפשר להעתיק את הקישור לדפדפן:</P>
    <P><a href={confirmationUrl} style={{ color: '#0E6B5A', wordBreak: 'break-all' }}>{confirmationUrl}</a></P>
    <Divider />
    <Muted>אם לא נרשמת ל-GroupBuild, אפשר להתעלם מהודעה זו.</Muted>
  </EmailLayout>
)

export default SignupEmail
