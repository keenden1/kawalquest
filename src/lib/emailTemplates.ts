import "server-only";

function logoBlock(origin: string): string {
  // The logo artwork is black-on-transparent, so it needs a light backdrop to
  // read against the dark header bar -- same amber badge treatment used on the
  // site's own header/nav (see PublicHeader.tsx / Nav.tsx).
  const logoUrl = process.env.MAIL_LOGO_URL || `${origin}/logo.png`;
  return `<td style="vertical-align:middle;padding-right:10px;"><table role="presentation" cellpadding="0" cellspacing="0" style="background-color:#fcd34d;border-radius:8px;"><tr><td style="padding:5px;"><img src="${logoUrl}" width="22" height="22" alt="" style="display:block;" /></td></tr></table></td>`;
}

export function passwordResetEmailHtml(link: string, origin: string): string {
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#f4f4f2;padding:32px 16px;font-family:Arial,Helvetica,sans-serif;">
  <tr>
    <td align="center">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:480px;background-color:#ffffff;border-radius:12px;overflow:hidden;border:1px solid #e5e5e5;">
        <tr>
          <td style="background-color:#07110d;padding:20px 24px;">
            <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
              <tr>
                <td align="left" style="vertical-align:middle;">
                  <table role="presentation" cellpadding="0" cellspacing="0">
                    <tr>
                      ${logoBlock(origin)}
                      <td style="vertical-align:middle;">
                        <span style="color:#ffffff;font-size:14px;font-weight:800;letter-spacing:0.08em;text-transform:uppercase;">Kawal Quest</span>
                      </td>
                    </tr>
                  </table>
                </td>
                <td align="right" style="vertical-align:middle;">
                  <span style="color:#9ca3af;font-size:11px;font-weight:700;letter-spacing:0.12em;text-transform:uppercase;">Password reset</span>
                </td>
              </tr>
            </table>
          </td>
        </tr>
        <tr>
          <td style="padding:28px 24px;">
            <h1 style="margin:0 0 12px;color:#111827;font-size:20px;font-weight:800;">Reset your password</h1>
            <p style="margin:0 0 20px;color:#374151;font-size:14px;line-height:22px;">Follow the link below to choose a new password for your Kawal Quest account.</p>
            <table role="presentation" cellpadding="0" cellspacing="0">
              <tr>
                <td style="border-radius:10px;background-color:#fcd34d;">
                  <a href="${link}" style="display:inline-block;padding:12px 24px;color:#172018;font-size:14px;font-weight:800;text-decoration:none;border-radius:10px;">Reset password &rarr;</a>
                </td>
              </tr>
            </table>
            <p style="margin:24px 0 0;color:#9ca3af;font-size:12px;line-height:20px;">If you didn't ask to reset your password, you can safely ignore this email.</p>
          </td>
        </tr>
        <tr>
          <td style="padding:16px 24px;border-top:1px solid #e5e5e5;">
            <p style="margin:0;color:#111827;font-size:12px;font-weight:700;">Kawal Quest</p>
            <p style="margin:2px 0 0;color:#9ca3af;font-size:11px;">This is an automated message &mdash; please don't reply to this email.</p>
          </td>
        </tr>
      </table>
    </td>
  </tr>
</table>`;
}
