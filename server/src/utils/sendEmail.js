import nodemailer from "nodemailer";

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: Number(process.env.SMTP_PORT || 587),
  secure: process.env.SMTP_SECURE === "true",
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASSWORD,
  },
});

export const sendEmail = async ({
  to,
  subject,
  html,
}) => {
  await transporter.sendMail({
    from:
      process.env.EMAIL_FROM ||
      `"Barter Trade" <no-reply@bartertrade.com>`,
    to,
    subject,
    html,
  });
};