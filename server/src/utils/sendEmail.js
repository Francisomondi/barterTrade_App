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

transporter.verify((error, success) => {
  if (error) {
    console.error("SMTP CONNECTION ERROR:", error);
  } else {
    console.log("SMTP SERVER READY:", success);
  }
});

export const sendEmail = async ({
  to,
  subject,
  html,
}) => {
  try {
    console.log("=================================");
    console.log("SENDING EMAIL");
    console.log("From:", process.env.SMTP_USER);
    console.log("To:", to);
    console.log("Subject:", subject);
    console.log("=================================");

    const info = await transporter.sendMail({
      from:
        process.env.EMAIL_FROM ||
        `"barter" <${process.env.SMTP_USER}>`,
      to,
      subject,
      html,
    });

    console.log("EMAIL SENT SUCCESSFULLY");
    console.log("Message ID:", info.messageId);
    console.log("Accepted:", info.accepted);
    console.log("Rejected:", info.rejected);
    console.log("Response:", info.response);

    return info;
  } catch (error) {
    console.error("EMAIL SEND ERROR:", error);
    throw error;
  }
};