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

export const verifyEmailTransporter = async () => {
  try {
    await transporter.verify();

    console.log("✅ Email transporter is ready.");
  } catch (error) { 
    console.error("❌ EMAIL TRANSPORTER ERROR:", error);
  }
};

export const sendEmail = async ({
  to,
  subject,
  html,
}) => {
  if (!process.env.SMTP_HOST) {
    throw new Error("SMTP_HOST is not configured.");
  }

  if (!process.env.SMTP_USER) {
    throw new Error("SMTP_USER is not configured.");
  }

  if (!process.env.SMTP_PASSWORD) {
    throw new Error("SMTP_PASSWORD is not configured.");
  }

  if (!process.env.EMAIL_FROM) {
    throw new Error("EMAIL_FROM is not configured.");
  }

  try {
    const info = await transporter.sendMail({
      from: process.env.EMAIL_FROM,
      to,
      subject,
      html,
    });

    console.log("✅ Password reset email sent:", {
      messageId: info.messageId,
      accepted: info.accepted,
      rejected: info.rejected,
      response: info.response,
    });

    return info;
  } catch (error) {
    console.error("❌ SEND EMAIL ERROR:", error);

    throw error;
  }
};