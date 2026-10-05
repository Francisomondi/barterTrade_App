import nodemailer from "nodemailer";

/**
 * ============================================================
 * EMAIL TRANSPORTER
 * ============================================================
 *
 * Gmail SMTP
 *
 * IMPORTANT:
 * SMTP_PASSWORD should be a Google App Password,
 * NOT the normal Gmail account password.
 */
console.log("SMTP CONFIG CHECK:", {
  host: process.env.SMTP_HOST,
  port: process.env.SMTP_PORT,
  user: process.env.SMTP_USER,
  passwordLoaded: Boolean(process.env.SMTP_PASSWORD),
  passwordLength: process.env.SMTP_PASSWORD?.length,
});

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || "smtp.gmail.com",

  port: Number(
    process.env.SMTP_PORT || 587
  ),

  /*
   * Port 587 uses STARTTLS, therefore secure must be false.
   *
   * Port 465 would use:
   *
   * secure: true
   */
  secure: false,

  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASSWORD,
  },

  /*
   * Require an encrypted TLS connection before authentication.
   */
  requireTLS: true,
});

/**
 * ============================================================
 * VERIFY SMTP CONNECTION
 * ============================================================
 *
 * Runs when the server starts.
 *
 * This lets us immediately know whether the SMTP credentials
 * are valid instead of discovering the problem when somebody
 * requests a password reset.
 */
transporter.verify((error) => {
  if (error) {
    console.error(
      "SMTP CONNECTION ERROR:",
      error?.message || error
    );

    console.error(
      "SMTP ERROR CODE:",
      error?.code
    );

    console.error(
      "SMTP RESPONSE CODE:",
      error?.responseCode
    );

    return;
  }

  console.log("SMTP SERVER READY");
});

/**
 * ============================================================
 * SEND EMAIL
 * ============================================================
 */
export const sendEmail = async ({
  to,
  subject,
  html,
}) => {
  if (!to) {
    throw new Error(
      "Email recipient is required."
    );
  }

  if (!subject) {
    throw new Error(
      "Email subject is required."
    );
  }

  if (!html) {
    throw new Error(
      "Email HTML content is required."
    );
  }

  try {
    console.log(
      "================================="
    );

    console.log("SENDING EMAIL");

    console.log(
      "From:",
      process.env.EMAIL_FROM ||
        process.env.SMTP_USER
    );

    console.log("To:", to);

    console.log("Subject:", subject);

    console.log(
      "================================="
    );

    const info =
      await transporter.sendMail({
        from:
          process.env.EMAIL_FROM ||
          `"BarterConnekt" <${process.env.SMTP_USER}>`,

        to,

        subject,

        html,
      });

    console.log(
      "EMAIL SENT SUCCESSFULLY"
    );

    console.log(
      "Message ID:",
      info.messageId
    );

    console.log(
      "Accepted:",
      info.accepted
    );

    console.log(
      "Rejected:",
      info.rejected
    );

    console.log(
      "Response:",
      info.response
    );

    return info;
  } catch (error) {
    console.error(
      "EMAIL SEND ERROR:",
      error?.message || error
    );

    console.error(
      "EMAIL ERROR CODE:",
      error?.code
    );

    console.error(
      "EMAIL RESPONSE CODE:",
      error?.responseCode
    );

    throw error;
  }
};

export default transporter;