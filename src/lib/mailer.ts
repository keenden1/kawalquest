import "server-only";
import nodemailer, { type Transporter } from "nodemailer";

let transporter: Transporter | null = null;

function getTransporter(): Transporter {
  if (transporter) return transporter;

  const user = process.env.GMAIL_SMTP_USER;
  const pass = process.env.GMAIL_SMTP_APP_PASSWORD;
  if (!user || !pass) {
    throw new Error(
      "Missing Gmail SMTP credentials. Set GMAIL_SMTP_USER and GMAIL_SMTP_APP_PASSWORD in .env.local " +
        "(GMAIL_SMTP_APP_PASSWORD must be a Google Account App Password, not your regular Gmail password)."
    );
  }

  transporter = nodemailer.createTransport({ service: "gmail", auth: { user, pass } });
  return transporter;
}

export async function sendMail(options: { to: string; subject: string; html: string }): Promise<void> {
  const user = process.env.GMAIL_SMTP_USER;
  await getTransporter().sendMail({ from: `"Kawal Quest" <${user}>`, to: options.to, subject: options.subject, html: options.html });
}
