/// <reference types="npm:@types/react@18.3.1" />
import * as React from 'npm:react@18.3.1'
import { EmailLayout, H1, P, CTAButton, Muted, Divider } from '../transactional-email-templates/layout.tsx'

interface Props { siteName: string; confirmationUrl: string }

export const RecoveryEmail = ({ confirmationUrl }: Props) => (
  <EmailLayout preview="איפוס סיסמה ל-GroupBuild">
    <H1>איפוס סיסמה</H1>
    <P>קיבלנו בקשה לאיפוס הסיסמה לחשבון שלך ב-GroupBuild. יש ללחוץ על הכפתור כדי לבחור סיסמה חדשה:</P>
    <CTAButton href={confirmationUrl}>איפוס הסיסמה</CTAButton>
    <P>אם הכפתור לא עובד, אפשר להעתיק את הקישור לדפדפן:</P>
    <P><a href={confirmationUrl} style={{ color: '#0E6B5A', wordBreak: 'break-all' }}>{confirmationUrl}</a></P>
    <Divider />
    <Muted>אם לא ביקשת איפוס סיסמה, אפשר להתעלם מהודעה זו — הסיסמה שלך לא תשתנה.</Muted>
  </EmailLayout>
)

export default RecoveryEmail
