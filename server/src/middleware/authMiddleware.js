import jwt from "jsonwebtoken";
import prisma from "../config/prisma.js";

/**
 * =========================================================
 * PROTECT
 * =========================================================
 *
 * Authentication is REQUIRED.
 *
 * Used for:
 * - User account routes
 * - Creating promotions
 * - Promotion payments
 * - Promotion analytics dashboard
 * - Other private routes
 */
export const protect = async (req, res, next) => {
  try {
    const authHeader =
      req.headers.authorization;

    // Check Authorization header
    if (
      !authHeader ||
      !authHeader.startsWith("Bearer ")
    ) {
      return res.status(401).json({
        success: false,
        message:
          "Not authorized. Please login.",
      });
    }

    // Extract token
    const token =
      authHeader.split(" ")[1];

    if (!token) {
      return res.status(401).json({
        success: false,
        message:
          "Authentication token is missing.",
      });
    }

    // Verify token
    const decoded = jwt.verify(
      token,
      process.env.JWT_SECRET
    );

    if (!decoded?.id) {
      return res.status(401).json({
        success: false,
        message:
          "Invalid authentication token.",
      });
    }

    // Find user
    const user =
      await prisma.user.findUnique({
        where: {
          id: decoded.id,
        },

        select: {
          id: true,
          name: true,
          email: true,
          phone: true,
          role: true,
          status: true,
        },
      });

    if (!user) {
      return res.status(401).json({
        success: false,
        message:
          "User no longer exists.",
      });
    }

    if (user.status !== "ACTIVE") {
      return res.status(403).json({
        success: false,
        message: `Your account is ${user.status.toLowerCase()}.`,
      });
    }

    // Attach authenticated user
    req.user = user;

    return next();
  } catch (error) {
    console.error(
      "Auth middleware error:",
      error
    );

    if (
      error.name === "TokenExpiredError"
    ) {
      return res.status(401).json({
        success: false,
        message:
          "Your session has expired. Please login again.",
      });
    }

    if (
      error.name === "JsonWebTokenError"
    ) {
      return res.status(401).json({
        success: false,
        message:
          "Invalid authentication token.",
      });
    }

    return res.status(500).json({
      success: false,
      message: "Authentication failed.",
    });
  }
};

/**
 * =========================================================
 * OPTIONAL AUTH
 * =========================================================
 *
 * Authentication is NOT required.
 *
 * If a valid Bearer token exists:
 *   req.user = authenticated user
 *
 * If there is no token:
 *   req.user = null
 *
 * If token is expired/invalid:
 *   req.user = null
 *
 * The request is always allowed to continue.
 *
 * Useful for public routes where knowing the authenticated
 * user improves functionality, such as promotion analytics.
 */
export const optionalAuth = async (
  req,
  res,
  next
) => {
  try {
    const authHeader =
      req.headers.authorization;

    /*
     * No Authorization header.
     *
     * Treat visitor as anonymous.
     */
    if (
      !authHeader ||
      !authHeader.startsWith("Bearer ")
    ) {
      req.user = null;

      return next();
    }

    const token =
      authHeader.split(" ")[1];

    if (!token) {
      req.user = null;

      return next();
    }

    let decoded;

    /*
     * Invalid or expired tokens should NOT
     * block public marketplace requests.
     */
    try {
      decoded = jwt.verify(
        token,
        process.env.JWT_SECRET
      );
    } catch (error) {
      req.user = null;

      return next();
    }

    /*
     * Token doesn't contain the expected
     * user ID.
     */
    if (!decoded?.id) {
      req.user = null;

      return next();
    }

    /*
     * Find the user.
     *
     * We only need a few fields for optional
     * authentication.
     */
    const user =
      await prisma.user.findUnique({
        where: {
          id: decoded.id,
        },

        select: {
          id: true,
          name: true,
          role: true,
          status: true,
        },
      });

    /*
     * Missing or inactive users are treated
     * as anonymous visitors.
     */
    if (
      !user ||
      user.status !== "ACTIVE"
    ) {
      req.user = null;

      return next();
    }

    /*
     * Valid authenticated visitor.
     */
    req.user = user;

    return next();
  } catch (error) {
    /*
     * Optional authentication should never
     * make a public route unavailable.
     */
    console.error(
      "Optional auth middleware error:",
      error
    );

    req.user = null;

    return next();
  }
};

/**
 * =========================================================
 * ADMIN ONLY
 * =========================================================
 *
 * Must normally be used AFTER protect.
 *
 * Example:
 *
 * router.delete(
 *   "/users/:id",
 *   protect,
 *   adminOnly,
 *   deleteUser
 * );
 */
export const adminOnly = (
  req,
  res,
  next
) => {
  if (!req.user) {
    return res.status(401).json({
      success: false,
      message:
        "Not authorized. Please login.",
    });
  }

  if (req.user.role !== "ADMIN") {
    return res.status(403).json({
      success: false,
      message:
        "Admin access required.",
    });
  }

  return next();
};