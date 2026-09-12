import "dotenv/config";
import bcrypt from "bcryptjs";
import prisma from "../config/prisma.js";
import { generateToken } from "../utils/auth.js";

import crypto from "crypto";
import { sendEmail } from "../utils/sendEmail.js";

export const register = async (req, res) => {
  try {
    const {
      name,
      email,
      password,
      phone,
    } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({
        success: false,
        message: "Name, email and password are required",
      });
    }

    if (password.length < 8) {
      return res.status(400).json({
        success: false,
        message: "Password must be at least 8 characters",
      });
    }

    const normalizedEmail = email.toLowerCase().trim();

    const existingUser = await prisma.user.findUnique({
      where: {
        email: normalizedEmail,
      },
    });

    if (existingUser) {
      return res.status(409).json({
        success: false,
        message: "An account with this email already exists",
      });
    }

    const hashedPassword = await bcrypt.hash(
      password,
      12
    );

    const user = await prisma.user.create({
      data: {
        name: name.trim(),
        email: normalizedEmail,
        password: hashedPassword,
        phone: phone || null,
        authProvider: "LOCAL",
      },
    });

    const token = generateToken(user);

    return res.status(201).json({
      success: true,
      message: "Account created successfully",
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        avatar: user.avatar,
        role: user.role,
      },
    });
  } catch (error) {
    console.error("REGISTER ERROR:", error);

    return res.status(500).json({
      success: false,
      message: "Unable to create account",
    });
  }
};

export const login = async (req, res) => {
  try {
    const {
      email,
      password,
    } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: "Email and password are required",
      });
    }

    const normalizedEmail = email.toLowerCase().trim();

    const user = await prisma.user.findUnique({
      where: {
        email: normalizedEmail,
      },
    });

    if (!user) {
      return res.status(401).json({
        success: false,
        message: "Invalid email or password",
      });
    }

    if (!user.password) {
      return res.status(400).json({
        success: false,
        message:
          "This account uses Google Sign-In. Please continue with Google.",
      });
    }

    const passwordMatches = await bcrypt.compare(
      password,
      user.password
    );

    if (!passwordMatches) {
      return res.status(401).json({
        success: false,
        message: "Invalid email or password",
      });
    }

    if (user.status !== "ACTIVE") {
      return res.status(403).json({
        success: false,
        message: "Your account is not active",
      });
    }

    const token = generateToken(user);

    return res.json({
      success: true,
      message: "Login successful",
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        avatar: user.avatar,
        role: user.role,
      },
    });
  } catch (error) {
    console.error("LOGIN ERROR:", error);

    return res.status(500).json({
      success: false,
      message: "Unable to login",
    });
  }
};

export const getMe = async (req, res) => {
  return res.json({
    success: true,
    user: {
      id: req.user.id,
      name: req.user.name,
      email: req.user.email,
      phone: req.user.phone,
      avatar: req.user.avatar,
      bio: req.user.bio,
      location: req.user.location,
      role: req.user.role,
      barterScore: req.user.barterScore,
      completedTrades: req.user.completedTrades,
      authProvider: req.user.authProvider,
      createdAt: req.user.createdAt,
    },
  });
};



export const forgotPassword = async (req, res) => {
  try {
    console.log("=================================");
    console.log("FORGOT PASSWORD REQUEST");

    const email = req.body.email?.toLowerCase().trim();

    console.log("Email:", email);
    console.log("=================================");

    if (!email) {
      return res.status(400).json({
        success: false,
        message: "Email address is required.",
      });
    }

    const user = await prisma.user.findUnique({
      where: {
        email,
      },
    });

    /*
     * Always return the same response.
     *
     * This prevents attackers from discovering
     * which email addresses have accounts.
     */
    if (!user) {
      console.log("PASSWORD RESET: User not found");

      return res.json({
        success: true,
        message:
          "If an account exists with this email, a password reset link has been sent.",
      });
    }

    /*
     * IMPORTANT:
     *
     * We intentionally DO NOT stop when user.password
     * is null.
     *
     * Google users can now create a local password
     * through this reset flow.
     */
    console.log(
      "PASSWORD RESET: Account provider:",
      user.authProvider
    );

    console.log(
      "PASSWORD RESET: Has local password:",
      Boolean(user.password)
    );

    /*
     * Remove any previous reset tokens.
     */
    await prisma.passwordResetToken.deleteMany({
      where: {
        userId: user.id,
      },
    });

    /*
     * Generate secure random token.
     */
    const resetToken = crypto
      .randomBytes(32)
      .toString("hex");

    /*
     * Store only the SHA-256 hash.
     *
     * The raw token is only sent to the user's email.
     */
    const tokenHash = crypto
      .createHash("sha256")
      .update(resetToken)
      .digest("hex");

    /*
     * Token expires after 1 hour.
     */
    const expiresAt = new Date(
      Date.now() + 60 * 60 * 1000
    );

    await prisma.passwordResetToken.create({
      data: {
        tokenHash,
        userId: user.id,
        expiresAt,
      },
    });

    /*
     * Build frontend reset URL.
     */
   const frontendUrl = (process.env.FRONTEND_URL || "http://localhost:5173").replace(/\/$/, "");

   const resetUrl =`${frontendUrl}/reset-password/${encodeURIComponent(resetToken)}`;

   console.log("PASSWORD RESET URL:", resetUrl);

    /*
     * Tell the user whether this is a Google-only
     * account or an existing local-password account.
     */
    const accountType = user.password
      ? "password"
      : "Google";

    await sendEmail({
        to: user.email,
        subject: "Reset your Barter Trade password",
        html: `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <title>Reset your Barter Trade password</title>
      </head>

      <body style="
        margin: 0;
        padding: 0;
        background-color: #f8f5f3;
        font-family: Arial, Helvetica, sans-serif;
      ">

        <div style="
          max-width: 600px;
          margin: 0 auto;
          padding: 30px 15px;
        ">

          <!-- Header -->
          <div style="
            background-color: #3d0f18;
            padding: 28px;
            border-radius: 16px 16px 0 0;
            color: #ffffff;
          ">

            <h1 style="
              margin: 0;
              font-size: 26px;
              line-height: 1.2;
            ">
              Barter Trade
            </h1>

            <p style="
              margin: 8px 0 0;
              color: #dcaeb7;
              font-size: 14px;
            ">
              Trade smarter
            </p>

          </div>

          <!-- Content -->
          <div style="
            background-color: #ffffff;
            border: 1px solid #e7dddf;
            border-top: none;
            padding: 32px;
            border-radius: 0 0 16px 16px;
          ">

            <h2 style="
              margin: 0 0 20px;
              color: #21191b;
              font-size: 24px;
            ">
              Create a new password
            </h2>

            <p style="
              color: #555555;
              font-size: 15px;
              line-height: 1.7;
            ">
              Hello ${user.name || "there"},
            </p>

            <p style="
              color: #555555;
              font-size: 15px;
              line-height: 1.7;
            ">
              We received a request to reset your Barter Trade password.
            </p>

            <p style="
              color: #555555;
              font-size: 15px;
              line-height: 1.7;
            ">
              Click the button below to create a new password.
            </p>

            <!-- Button -->
            <div style="
              margin: 30px 0;
              text-align: center;
            ">

              <a
                href="${resetUrl}"
                target="_blank"
                rel="noopener noreferrer"
                style="
                  display: inline-block;
                  background-color: #5b1725;
                  color: #ffffff !important;
                  text-decoration: none;
                  padding: 15px 28px;
                  border-radius: 10px;
                  font-size: 15px;
                  font-weight: bold;
                "
              >
                Create New Password
              </a>

            </div>

            <!-- Fallback URL -->
            <p style="
              margin-top: 25px;
              color: #777777;
              font-size: 13px;
              line-height: 1.6;
            ">
              If the button above does not work, copy and paste this link into your
              browser:
            </p>

            <p style="
              word-break: break-all;
              background-color: #f8f5f3;
              border: 1px solid #e7dddf;
              padding: 12px;
              border-radius: 8px;
              font-size: 12px;
            ">
              <a
                href="${resetUrl}"
                target="_blank"
                rel="noopener noreferrer"
                style="
                  color: #5b1725;
                  text-decoration: underline;
                "
              >
                ${resetUrl}
              </a>
            </p>

            <p style="
              margin-top: 25px;
              color: #777777;
              font-size: 13px;
              line-height: 1.6;
            ">
              This password reset link expires in 1 hour.
            </p>

            <p style="
              color: #777777;
              font-size: 13px;
              line-height: 1.6;
            ">
              If you did not request a password reset, you can safely ignore this
              email.
            </p>

          </div>

          <!-- Footer -->
          <div style="
            text-align: center;
            padding: 20px;
            color: #999999;
            font-size: 12px;
          ">
            © ${new Date().getFullYear()} Barter Trade
          </div>

        </div>

      </body>
      </html>
        `,
      });

    console.log(
      "PASSWORD RESET EMAIL SENT:",
      user.email
    );

    return res.json({
      success: true,
      message:
        "If an account exists with this email, a password reset link has been sent.",
    });

  } catch (error) {

    console.error(
      "FORGOT PASSWORD ERROR:",
      error
    );

    return res.status(500).json({
      success: false,
      message:
        "Unable to process password reset request.",
    });
  }
};




export const resetPassword = async (req, res) => {
  try {
    const { token } = req.params;
    const { password } = req.body;

    if (!token) {
      return res.status(400).json({
        success: false,
        message: "Reset token is required.",
      });
    }

    if (!password) {
      return res.status(400).json({
        success: false,
        message: "New password is required.",
      });
    }

    if (password.length < 8) {
      return res.status(400).json({
        success: false,
        message:
          "Password must be at least 8 characters.",
      });
    }

    /*
     * Hash the token so we can compare it with
     * the hashed token stored in the database.
     */
    const tokenHash = crypto
      .createHash("sha256")
      .update(token)
      .digest("hex");

    const resetRecord =
      await prisma.passwordResetToken.findUnique({
        where: {
          tokenHash,
        },
        include: {
          user: true,
        },
      });

    if (!resetRecord) {
      return res.status(400).json({
        success: false,
        message:
          "This password reset link is invalid.",
      });
    }

    /*
     * Check expiration.
     */
    if (
      resetRecord.expiresAt.getTime() <=
      Date.now()
    ) {
      await prisma.passwordResetToken.delete({
        where: {
          id: resetRecord.id,
        },
      });

      return res.status(400).json({
        success: false,
        message:
          "This password reset link has expired. Please request a new one.",
      });
    }

    /*
     * Hash the new password.
     */
    const hashedPassword = await bcrypt.hash(
      password,
      12
    );

    /*
     * Update password and delete reset tokens
     * atomically.
     *
     * IMPORTANT:
     * We do NOT change authProvider.
     *
     * A Google user keeps:
     *
     * authProvider = "GOOGLE"
     * googleId = existing Google ID
     *
     * while also getting:
     *
     * password = hashed password
     */
    await prisma.$transaction([
      prisma.user.update({
        where: {
          id: resetRecord.userId,
        },

        data: {
          password: hashedPassword,
        },
      }),

      prisma.passwordResetToken.deleteMany({
        where: {
          userId: resetRecord.userId,
        },
      }),
    ]);

    console.log(
      "PASSWORD RESET SUCCESS:",
      resetRecord.user.email
    );

    return res.json({
      success: true,
      message:
        "Password created successfully. You can now sign in with your email and password or Google.",
    });

  } catch (error) {

    console.error(
      "RESET PASSWORD ERROR:",
      error
    );

    return res.status(500).json({
      success: false,
      message:
        "Unable to reset password.",
    });
  }
};

