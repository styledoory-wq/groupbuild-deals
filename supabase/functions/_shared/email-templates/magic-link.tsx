/// <reference types="npm:@types/react@18.3.1" />
import * as React from 'npm:react@18.3.1'
import { EmailLayout, H1, P, CTAButton, Muted, Divider } from '../transactional-email-templates/layout.tsx'

interface Props { siteName: string; confirmationUrl: string }

export const MagicLinkEmail = ({ confirmationUrl }: Props) => (
  <EmailLayout preview="קישור כניסה ל-GroupBuild">
    <H1>קישור הכניסה שלך</H1>
    <P>יש ללחוץ על הכפתור כדי להיכנס ל-GroupBuild. הקישור תקף למשך זמן קצר.</P>
    <CTAButton href={confirmationUrl}>כניסה למערכת</CTAButton>
    <Divider />
    <Muted>אם לא ביקשת קישור זה, אפשר להתעלם מההודעה.</Muted>
  </EmailLayout>
)

export default MagicLinkEmail
