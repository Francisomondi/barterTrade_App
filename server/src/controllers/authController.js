import "dotenv/config";
import bcrypt from "bcryptjs";
import prisma from "../config/prisma.js";
import { generateToken } from "../utils/auth.js";

import cloudinary from "../config/cloudinary.js";
import { invalidateUserListingsCache } from "../utils/listingCache.js";
import uploadToCloudinary from "../utils/uploadToCloudinary.js";
import processAvatarImage from "../utils/processAvatarImage.js";


import crypto from "crypto";
import { sendEmail } from "../utils/sendEmail.js";
import { getPremiumStatus,} from "../services/subscriptionService.js";

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
  try {
    /*
     * ========================================================
     * COMPLETED TRADES
     * ========================================================
     */

    const completedTrades = await prisma.trade.count({
      where: {
        status: "COMPLETED",

        OR: [
          {
            traderAId: req.user.id,
          },

          {
            traderBId: req.user.id,
          },
        ],
      },
    });

    /*
     * ========================================================
     * PREMIUM STATUS
     * ========================================================
     *
     * Premium is calculated from the Subscription table.
     *
     * We DO NOT store isPremium on the User table.
     */

    const premiumStatus = await getPremiumStatus(
      req.user.id
    );

    /*
     * ========================================================
     * RESPONSE
     * ========================================================
     */

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

        /*
         * Always reflects the actual database trades.
         */

        completedTrades,

        authProvider: req.user.authProvider,

        createdAt: req.user.createdAt,

        /*
         * ====================================================
         * PREMIUM
         * ====================================================
         */

        isPremium:
          premiumStatus.isPremium,

        premiumPlan:
          premiumStatus.premiumPlan,

        premiumStartedAt:
          premiumStatus.premiumStartedAt,

        premiumEndsAt:
          premiumStatus.premiumEndsAt,
      },
    });
  } catch (error) {
    console.error(
      "GET ME ERROR:",
      error
    );

    return res.status(500).json({
      success: false,

      message:
        "Unable to fetch user profile.",
    });
  }
};

export const updateMe = async (req, res) => {
  try {
    const userId = req.user.id;

    const {
      name,
      phone,
      bio,
      location,
    } = req.body;

    /* =====================================================
       LOAD CURRENT USER
    ====================================================== */

    const existingUser = await prisma.user.findUnique({
      where: {
        id: userId,
      },

      select: {
        id: true,
        name: true,
        phone: true,
        bio: true,
        location: true,
      },
    });

    if (!existingUser) {
      return res.status(404).json({
        success: false,
        message: "User account could not be found.",
      });
    }

    /* =====================================================
       BUILD SAFE UPDATE DATA
    ====================================================== */

    const updateData = {};

    /* =====================================================
       NAME
    ====================================================== */

    if (name !== undefined) {
      const normalizedName = String(name).trim();

      if (!normalizedName) {
        return res.status(400).json({
          success: false,
          message: "Name cannot be empty.",
        });
      }

      if (normalizedName.length > 100) {
        return res.status(400).json({
          success: false,
          message: "Name cannot exceed 100 characters.",
        });
      }

      updateData.name = normalizedName;
    }

    /* =====================================================
       PHONE
    ====================================================== */

    if (phone !== undefined) {
      const normalizedPhone = String(phone)
        .trim()
        .replace(/\s+/g, "");

      // Allow user to remove optional phone number.
      if (!normalizedPhone) {
        updateData.phone = null;
      } else {
        /*
         * Accepted Kenyan formats:
         *
         * 0712345678
         * 0112345678
         * 254712345678
         * 254112345678
         * +254712345678
         * +254112345678
         */

        const kenyaPhoneRegex =
          /^(?:\+254|254|0)(?:7\d{8}|1\d{8})$/;

        if (!kenyaPhoneRegex.test(normalizedPhone)) {
          return res.status(400).json({
            success: false,
            message: "Enter a valid Kenyan phone number.",
          });
        }

        let canonicalPhone = normalizedPhone;

        if (canonicalPhone.startsWith("+254")) {
          canonicalPhone = canonicalPhone.slice(1);
        } else if (canonicalPhone.startsWith("0")) {
          canonicalPhone = `254${canonicalPhone.slice(1)}`;
        }

        /*
         * User.phone is unique.
         * Make sure another account doesn't already own it.
         */

        const phoneOwner = await prisma.user.findUnique({
          where: {
            phone: canonicalPhone,
          },

          select: {
            id: true,
          },
        });

        if (
          phoneOwner &&
          phoneOwner.id !== userId
        ) {
          return res.status(409).json({
            success: false,
            message:
              "This phone number is already associated with another account.",
          });
        }

        updateData.phone = canonicalPhone;
      }
    }

    /* =====================================================
       BIO
    ====================================================== */

    if (bio !== undefined) {
      const normalizedBio = String(bio).trim();

      if (normalizedBio.length > 500) {
        return res.status(400).json({
          success: false,
          message: "Bio cannot exceed 500 characters.",
        });
      }

      updateData.bio = normalizedBio || null;
    }

    /* =====================================================
       LOCATION
    ====================================================== */

    if (location !== undefined) {
      const normalizedLocation =
        String(location).trim();

      if (normalizedLocation.length > 150) {
        return res.status(400).json({
          success: false,
          message:
            "Location cannot exceed 150 characters.",
        });
      }

      updateData.location =
        normalizedLocation || null;
    }

    /* =====================================================
       NOTHING TO UPDATE
    ====================================================== */

    if (Object.keys(updateData).length === 0) {
      return res.status(400).json({
        success: false,
        message:
          "No profile changes were provided.",
      });
    }

    /* =====================================================
       UPDATE USER
    ====================================================== */

    const updatedUser = await prisma.user.update({
      where: {
        id: userId,
      },

      data: updateData,

      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        avatar: true,
        bio: true,
        location: true,
        role: true,
        authProvider: true,
        barterScore: true,
        completedTrades: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    /* =====================================================
       INVALIDATE USER LISTING CACHE
    ====================================================== */

    /*
     * Seller information is embedded inside listing
     * responses.
     *
     * Cache invalidation is deliberately best-effort.
     *
     * If Redis/cache invalidation fails, the database
     * update has still succeeded and we should NOT return
     * a false 500 response to the frontend.
     */

    const cacheInvalidated =
      await invalidateUserListingsCache(userId);

    if (!cacheInvalidated) {
      console.warn(
        `AVATAR UPDATED BUT LISTING CACHE INVALIDATION FAILED: ${userId}`
      );
    }
    /* =====================================================
       RESPONSE
    ====================================================== */

    return res.status(200).json({
      success: true,
      message: "Profile updated successfully.",
      user: updatedUser,
    });
  } catch (error) {
    console.error(
      "UPDATE PROFILE ERROR:",
      error
    );

    if (error?.code === "P2002") {
      return res.status(409).json({
        success: false,
        message:
          "This phone number is already associated with another account.",
      });
    }

    return res.status(500).json({
      success: false,
      message:
        "Unable to update your profile.",
    });
  }
};

export const uploadMyAvatar = async (req, res) => {
  const startedAt = Date.now();

  let uploadedImage = null;

  const elapsed = () =>
    `${Date.now() - startedAt}ms`;

  try {
    const userId = req.user.id;

    console.log(
      "[AVATAR] 1. Request received:",
      elapsed()
    );

    /* =====================================================
       VALIDATE FILE
    ====================================================== */

    if (!req.file) {
      return res.status(400).json({
        success: false,
        code: "AVATAR_REQUIRED",
        message:
          "Please select a profile photo.",
      });
    }

    console.log(
      "[AVATAR] File:",
      req.file.originalname,
      req.file.mimetype,
      `${(
        req.file.size /
        1024 /
        1024
      ).toFixed(2)} MB`
    );

    if (
      !req.file.mimetype?.startsWith(
        "image/"
      )
    ) {
      return res.status(400).json({
        success: false,
        code: "INVALID_AVATAR_TYPE",
        message:
          "Profile photo must be an image.",
      });
    }

    console.log(
      "[AVATAR] 2. Validation finished:",
      elapsed()
    );

    /* =====================================================
       FIND CURRENT USER
    ====================================================== */

    const existingUser =
      await prisma.user.findUnique({
        where: {
          id: userId,
        },

        select: {
          id: true,
          avatar: true,
          avatarPublicId: true,
        },
      });

    console.log(
      "[AVATAR] 3. User query finished:",
      elapsed()
    );

    if (!existingUser) {
      return res.status(404).json({
        success: false,
        code: "USER_NOT_FOUND",
        message:
          "User account could not be found.",
      });
    }

    /* =====================================================
       PROCESS AVATAR LOCALLY
    ====================================================== */

    console.log(
      "[AVATAR] 4. Starting local image processing:",
      elapsed()
    );

    const processedAvatarBuffer =
      await processAvatarImage(
        req.file.buffer
      );

    console.log(
      "[AVATAR] 5. Local image processing finished:",
      elapsed()
    );

    /* =====================================================
       UPLOAD PROCESSED IMAGE TO CLOUDINARY
    ====================================================== */

    console.log(
      "[AVATAR] 6. Starting Cloudinary:",
      elapsed()
    );

    uploadedImage =
      await uploadToCloudinary(
        processedAvatarBuffer,
        "barter-trade/users/avatars"
      );

    console.log(
      "[AVATAR] 7. Cloudinary finished:",
      elapsed()
    );

    if (
      !uploadedImage?.secure_url ||
      !uploadedImage?.public_id
    ) {
      throw new Error(
        "Cloudinary did not return the expected avatar information."
      );
    }

    /* =====================================================
       UPDATE DATABASE
    ====================================================== */

    let updatedUser;

    console.log(
      "[AVATAR] 8. Starting Prisma update:",
      elapsed()
    );

    try {
      updatedUser =
        await prisma.user.update({
          where: {
            id: userId,
          },

          data: {
            avatar:
              uploadedImage.secure_url,

            avatarPublicId:
              uploadedImage.public_id,
          },

          select: {
            id: true,
            name: true,
            email: true,
            phone: true,
            avatar: true,
            avatarPublicId: true,
            bio: true,
            location: true,
            role: true,
            authProvider: true,
            barterScore: true,
            completedTrades: true,
            createdAt: true,
            updatedAt: true,
          },
        });

      console.log(
        "[AVATAR] 9. Prisma update finished:",
        elapsed()
      );
    } catch (databaseError) {
      console.error(
        "[AVATAR] Prisma failed:",
        elapsed()
      );

      /*
       * Cloudinary succeeded but Prisma failed.
       *
       * Remove the newly uploaded image so we don't
       * leave an orphaned Cloudinary asset.
       */
      if (uploadedImage?.public_id) {
        try {
          await cloudinary.uploader.destroy(
            uploadedImage.public_id
          );
        } catch (cleanupError) {
          console.error(
            "NEW AVATAR CLEANUP ERROR:",
            cleanupError
          );
        }
      }

      throw databaseError;
    }

    /* =====================================================
       DELETE PREVIOUS CLOUDINARY AVATAR
    ====================================================== */

    console.log(
      "[AVATAR] 10. Starting old avatar cleanup:",
      elapsed()
    );

    /*
     * The database already points to the new avatar.
     *
     * Failure to remove the old Cloudinary image should
     * therefore NOT make the avatar update fail.
     */
    if (
      existingUser.avatarPublicId &&
      existingUser.avatarPublicId !==
        uploadedImage.public_id
    ) {
      try {
        await cloudinary.uploader.destroy(
          existingUser.avatarPublicId
        );
      } catch (cleanupError) {
        console.error(
          "OLD AVATAR CLEANUP ERROR:",
          cleanupError
        );
      }
    }

    console.log(
      "[AVATAR] 11. Old avatar cleanup finished:",
      elapsed()
    );

    /* =====================================================
       INVALIDATE USER LISTING CACHE
    ====================================================== */

    console.log(
      "[AVATAR] 12. Starting Redis invalidation:",
      elapsed()
    );

    const cacheInvalidated =
      await invalidateUserListingsCache(
        userId
      );

    console.log(
      "[AVATAR] 13. Redis invalidation finished:",
      elapsed(),
      "success:",
      cacheInvalidated
    );

    if (!cacheInvalidated) {
      console.warn(
        `AVATAR UPDATED BUT LISTING CACHE INVALIDATION FAILED: ${userId}`
      );
    }

    /* =====================================================
       RESPONSE
    ====================================================== */

    console.log(
      "[AVATAR] SUCCESS - TOTAL:",
      elapsed()
    );

    return res.status(200).json({
      success: true,
      message:
        "Profile photo updated successfully.",
      user: updatedUser,
    });
  } catch (error) {
    console.error(
      "[AVATAR] FAILED AFTER:",
      elapsed()
    );

    console.error(
      "UPLOAD PROFILE AVATAR ERROR:",
      error
    );

    return res.status(500).json({
      success: false,
      code: "AVATAR_UPLOAD_FAILED",
      message:
        "Unable to update your profile photo.",
    });
  }
};



export const deleteMyAvatar = async (req, res) => {
  try {
    const userId = req.user.id;

    /* =====================================================
       FIND CURRENT USER
    ====================================================== */

    const existingUser =
      await prisma.user.findUnique({
        where: {
          id: userId,
        },

        select: {
          id: true,
          avatar: true,
          avatarPublicId: true,
        },
      });

    if (!existingUser) {
      return res.status(404).json({
        success: false,
        code: "USER_NOT_FOUND",
        message:
          "User account could not be found.",
      });
    }

    /* =====================================================
       NOTHING TO REMOVE
    ====================================================== */

    if (
      !existingUser.avatar &&
      !existingUser.avatarPublicId
    ) {
      return res.status(400).json({
        success: false,
        code: "AVATAR_NOT_FOUND",
        message:
          "You do not currently have a profile photo.",
      });
    }

    /* =====================================================
       CLEAR DATABASE FIRST
    ====================================================== */

    /*
     * The database is our source of truth.
     *
     * Clear the association first so the account no
     * longer references the old avatar.
     */

    const updatedUser =
      await prisma.user.update({
        where: {
          id: userId,
        },

        data: {
          avatar: null,
          avatarPublicId: null,
        },

        select: {
          id: true,
          name: true,
          email: true,
          phone: true,
          avatar: true,
          bio: true,
          location: true,
          role: true,
          authProvider: true,
          barterScore: true,
          completedTrades: true,
          createdAt: true,
          updatedAt: true,
        },
      });

    /* =====================================================
       DELETE CLOUDINARY IMAGE
    ====================================================== */

    /*
     * Only delete from Cloudinary when we actually have
     * a Cloudinary public ID.
     *
     * This protects external avatars such as Google
     * profile pictures.
     */

    if (existingUser.avatarPublicId) {
      try {
        await cloudinary.uploader.destroy(
          existingUser.avatarPublicId
        );
      } catch (cloudinaryError) {
        /*
         * The database update already succeeded.
         *
         * Do not make the user-facing operation fail
         * because Cloudinary cleanup failed.
         */

        console.error(
          "DELETE OLD PROFILE AVATAR FROM CLOUDINARY ERROR:",
          cloudinaryError
        );
      }
    }

    /* =====================================================
       INVALIDATE USER LISTING CACHE
    ====================================================== */

    /*
     * Cached listing responses can still contain the old
     * seller avatar.
     *
     * Remove the relevant caches so future listing reads
     * obtain the updated seller information.
     */

    const cacheInvalidated =
      await invalidateUserListingsCache(userId);

    if (!cacheInvalidated) {
      console.warn(
        `PROFILE UPDATED BUT LISTING CACHE INVALIDATION FAILED: ${userId}`
      );
    }

    /* =====================================================
       RESPONSE
    ====================================================== */

    return res.status(200).json({
      success: true,
      message:
        "Profile photo removed successfully.",
      user: updatedUser,
    });
  } catch (error) {
    console.error(
      "DELETE PROFILE AVATAR ERROR:",
      error
    );

    return res.status(500).json({
      success: false,
      code: "AVATAR_DELETE_FAILED",
      message:
        "Unable to remove your profile photo.",
    });
  }
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

