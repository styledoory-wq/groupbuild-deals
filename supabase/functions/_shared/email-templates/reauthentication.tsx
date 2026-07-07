/// <reference types="npm:@types/react@18.3.1" />
import * as React from 'npm:react@18.3.1'
import { EmailLayout, H1, P, Muted, Divider } from '../transactional-email-templates/layout.tsx'

interface Props { token: string }

export const ReauthenticationEmail = ({ token }: Props) => (
  <EmailLayout preview="קוד אימות ל-GroupBuild">
    <H1>קוד אימות</H1>
    <P>יש להזין את הקוד הבא לאישור הזהות שלך:</P>
    <P>
      <span style={{
        display: 'inline-block',
        fontSize: 32,
        fontWeight: 700,
        letterSpacing: '0.4em',
        color: '#0E6B5A',
        background: '#F8FAFC',
        border: '1px solid #E5E7EB',
        borderRadius: 12,
        padding: '16px 28px',
        fontFamily: 'monospace',
      }}>
        {token}
      </span>
    </P>
    <Divider />
    <Muted>הקוד תקף למספר דקות בלבד. אם לא ביקשת אותו — אפשר להתעלם מההודעה.</Muted>
  </EmailLayout>
)

export default ReauthenticationEmail
