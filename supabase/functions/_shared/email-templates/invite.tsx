/// <reference types="npm:@types/react@18.3.1" />
import * as React from 'npm:react@18.3.1'
import { EmailLayout, H1, P, CTAButton, Muted, Divider } from '../transactional-email-templates/layout.tsx'

interface Props { siteName: string; siteUrl: string; confirmationUrl: string }

export const InviteEmail = ({ confirmationUrl }: Props) => (
  <EmailLayout preview="קיבלת הזמנה להצטרף ל-GroupBuild">
    <H1>הוזמנת ל-GroupBuild</H1>
    <P>הוזמנת להצטרף לפלטפורמת הרכישות המשותפות של GroupBuild. יש ללחוץ כדי לאשר את ההזמנה וליצור חשבון:</P>
    <CTAButton href={confirmationUrl}>קבלת ההזמנה</CTAButton>
    <Divider />
    <Muted>אם ההזמנה הגיעה אליך בטעות, אפשר להתעלם מההודעה.</Muted>
  </EmailLayout>
)

export default InviteEmail
