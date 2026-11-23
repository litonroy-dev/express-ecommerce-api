const nodemailer = require("nodemailer");

let transporter;
const getTransporter = () => {
  if (!transporter) {
    transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: Number(process.env.SMTP_PORT) || 587,
      secure: Number(process.env.SMTP_PORT) === 465, // 465 = SSL, 587 = STARTTLS
      auth: process.env.SMTP_USER
        ? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS }
        : undefined,
    });
  }
  return transporter;
};

// Sends an email. In development with no SMTP_HOST set, it only PRINTS the email
// in the terminal, so you can test forgot-password without an email account.
exports.sendEmail = async ({ to, subject, text }) => {
  if (!process.env.SMTP_HOST) {
    console.log(`\n--- EMAIL (SMTP not configured, not sent) ---\nTo: ${to}\nSubject: ${subject}\n${text}\n---\n`);
    return;
  }
  await getTransporter().sendMail({
    from: process.env.EMAIL_FROM || process.env.SMTP_USER,
    to,
    subject,
    text,
  });
};
