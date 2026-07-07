/// <reference types="npm:@types/react@18.3.1" />
import * as React from 'npm:react@18.3.1'
import { EmailLayout, H1, P, CTAButton, InfoCard, KeyValue, Muted, Divider } from '../transactional-email-templates/layout.tsx'

interface Props {
  siteName: string
  oldEmail: string
  email: string
  newEmail: string
  confirmationUrl: string
}

export const EmailChangeEmail = ({ oldEmail, newEmail, confirmationUrl }: Props) => (
  <EmailLayout preview="אישור שינוי כתובת המייל שלך ב-GroupBuild">
    <H1>אישור שינוי כתובת מייל</H1>
    <P>התקבלה בקשה לעדכן את כתובת המייל של החשבון שלך ב-GroupBuild.</P>
    <InfoCard>
      <KeyValue label="כתובת קודמת" value={oldEmail} />
      <KeyValue label="כתובת חדשה" value={newEmail} />
    </InfoCard>
    <CTAButton href={confirmationUrl}>אישור השינוי</CTAButton>
    <Divider />
    <Muted>אם לא ביקשת שינוי כתובת מייל, אפשר להתעלם מהודעה זו.</Muted>
  </EmailLayout>
)

export default EmailChangeEmail
