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
    const email = req.body.email?.toLowerCase().trim();

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
     * Always return the same response whether the account
     * exists or not. This prevents email enumeration.
     */
    if (!user) {
      return res.json({
        success: true,
        message:
          "If an account exists with this email, a password reset link has been sent.",
      });
    }

    /*
     * Google-only accounts don't have a local password.
     */
    if (!user.password) {
      return res.json({
        success: true,
        message:
          "If an account exists with this email, a password reset link has been sent.",
      });
    }

    /*
     * Delete previous reset tokens.
     */
    await prisma.passwordResetToken.deleteMany({
      where: {
        userId: user.id,
      },
    });

    /*
     * Generate a random token.
     */
    const resetToken = crypto.randomBytes(32).toString("hex");

    /*
     * Store only the hash in the database.
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

    const resetUrl =
      `${process.env.FRONTEND_URL}/reset-password/${resetToken}`;

    await sendEmail({
      to: user.email,
      subject: "Reset your Barter Trade password",
      html: `
        <div style="
          font-family: Arial, sans-serif;
          max-width: 600px;
          margin: 0 auto;
          padding: 30px;
          color: #21191B;
        ">

          <div style="
            background: #3D0F18;
            color: white;
            padding: 25px;
            border-radius: 16px 16px 0 0;
          ">
            <h1 style="margin: 0;">
              Barter Trade
            </h1>

            <p style="
              margin: 8px 0 0;
              color: #DCAEB7;
            ">
              Trade smarter
            </p>
          </div>

          <div style="
            border: 1px solid #E7DDDF;
            border-top: none;
            padding: 30px;
            border-radius: 0 0 16px 16px;
          ">

            <h2>
              Reset your password
            </h2>

            <p>
              Hello ${user.name || "there"},
            </p>

            <p>
              We received a request to reset your
              Barter Trade password.
            </p>

            <p>
              Click the button below to create a new password.
            </p>

            <div style="margin: 30px 0;">
              <a
                href="${resetUrl}"
                style="
                  display: inline-block;
                  background: #5B1725;
                  color: white;
                  text-decoration: none;
                  padding: 14px 24px;
                  border-radius: 10px;
                  font-weight: bold;
                "
              >
                Reset Password
              </a>
            </div>

            <p style="
              color: #666;
              font-size: 14px;
            ">
              This link expires in 1 hour.
            </p>

            <p style="
              color: #666;
              font-size: 14px;
            ">
              If you didn't request a password reset,
              you can safely ignore this email.
            </p>

          </div>

        </div>
      `,
    });

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
     * Hash the token so the raw token never needs
     * to be stored in the database.
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

    if (
      resetRecord.expiresAt.getTime() <
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

    const hashedPassword = await bcrypt.hash(
      password,
      12
    );

    await prisma.$transaction([
      prisma.user.update({
        where: {
          id: resetRecord.userId,
        },
        data: {
          password: hashedPassword,
          authProvider: "LOCAL",
        },
      }),

      /*
       * Delete the token immediately so it cannot
       * be reused.
       */
      prisma.passwordResetToken.delete({
        where: {
          id: resetRecord.id,
        },
      }),

      /*
       * Remove any other outstanding reset tokens
       * belonging to this account.
       */
      prisma.passwordResetToken.deleteMany({
        where: {
          userId: resetRecord.userId,
        },
      }),
    ]);

    return res.json({
      success: true,
      message:
        "Password reset successfully. You can now log in.",
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