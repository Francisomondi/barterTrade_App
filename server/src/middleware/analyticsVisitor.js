import crypto from "crypto";

import {
  createSessionKey,
  createVisitorKey,
} from "../services/businessAnalyticsTrackingService.js";

/**
 * =========================================================
 * ANALYTICS VISITOR MIDDLEWARE
 * =========================================================
 *
 * Purpose:
 *
 * Creates privacy-conscious visitor information that can
 * be used by Business Analytics.
 *
 * This middleware works for:
 *
 * - Anonymous visitors
 * - Logged-in users
 *
 * IMPORTANT:
 *
 * optionalAuth should run BEFORE this middleware.
 *
 * Example:
 *
 * router.get(
 *   "/:slug",
 *   optionalAuth,
 *   analyticsVisitor,
 *   getPublicBusinessProfile
 * );
 *
 * If the visitor is authenticated:
 *
 *   req.user.id
 *
 * will be used when creating the visitor key.
 *
 * If the visitor is anonymous:
 *
 *   IP + User-Agent
 *
 * will be used to create an irreversible hash.
 *
 * Raw IP addresses are NEVER stored in the analytics table.
 */

/**
 * =========================================================
 * CONFIGURATION
 * =========================================================
 */

/**
 * Cookie used to maintain an anonymous analytics session.
 *
 * This is NOT an authentication cookie.
 */
const ANALYTICS_SESSION_COOKIE =
  "barter_analytics_session";

/**
 * Analytics session lifetime.
 *
 * 30 days.
 */
const ANALYTICS_SESSION_MAX_AGE =
  30 * 24 * 60 * 60 * 1000;

/**
 * =========================================================
 * GET CLIENT IP
 * =========================================================
 *
 * req.ip is preferred instead of manually reading
 * X-Forwarded-For.
 *
 * In production behind Render / another reverse proxy,
 * Express should have the appropriate trust proxy setting.
 */
const getClientIp = (req) => {
  if (
    typeof req.ip === "string" &&
    req.ip.trim()
  ) {
    return req.ip.trim();
  }

  return "";
};

/**
 * =========================================================
 * GET USER AGENT
 * =========================================================
 */
const getUserAgent = (req) => {
  const userAgent =
    req.get?.("user-agent");

  if (
    typeof userAgent !== "string"
  ) {
    return "";
  }

  return userAgent.trim();
};

/**
 * =========================================================
 * READ ANALYTICS SESSION
 * =========================================================
 */
const getExistingSessionId = (
  req
) => {
  const sessionId =
    req.cookies?.[
      ANALYTICS_SESSION_COOKIE
    ];

  if (
    typeof sessionId !== "string"
  ) {
    return null;
  }

  const normalized =
    sessionId.trim();

  return normalized || null;
};

/**
 * =========================================================
 * CREATE ANALYTICS SESSION
 * =========================================================
 */
const createAnalyticsSessionId =
  () => {
    return crypto.randomUUID();
  };

/**
 * =========================================================
 * SET ANALYTICS SESSION COOKIE
 * =========================================================
 */
const setAnalyticsSessionCookie = (
  res,
  sessionId
) => {
  res.cookie(
    ANALYTICS_SESSION_COOKIE,
    sessionId,
    {
      /**
       * JavaScript in the browser does not need
       * direct access to this cookie.
       */
      httpOnly: true,

      /**
       * HTTPS only in production.
       */
      secure:
        process.env.NODE_ENV ===
        "production",

      /**
       * Your frontend/backend may be deployed on
       * separate origins in production.
       *
       * "none" allows the cookie to be sent in that
       * cross-site production setup, provided HTTPS
       * is being used.
       */
      sameSite:
        process.env.NODE_ENV ===
        "production"
          ? "none"
          : "lax",

      maxAge:
        ANALYTICS_SESSION_MAX_AGE,

      path: "/",
    }
  );
};

/**
 * =========================================================
 * GET OR CREATE SESSION
 * =========================================================
 */
const getOrCreateSessionId = (
  req,
  res
) => {
  const existingSessionId =
    getExistingSessionId(req);

  if (existingSessionId) {
    return existingSessionId;
  }

  const sessionId =
    createAnalyticsSessionId();

  setAnalyticsSessionCookie(
    res,
    sessionId
  );

  return sessionId;
};

/**
 * =========================================================
 * ANALYTICS VISITOR
 * =========================================================
 *
 * Adds:
 *
 * req.analyticsVisitor = {
 *   visitorUserId,
 *   visitorKey,
 *   sessionKey
 * }
 *
 * Analytics middleware is fail-open.
 *
 * If analytics visitor generation fails, the actual
 * marketplace request must still continue.
 */
export const analyticsVisitor = (
  req,
  res,
  next
) => {
  try {
    /**
     * optionalAuth should already have run.
     *
     * Logged-in visitor:
     * req.user.id
     *
     * Anonymous visitor:
     * null
     */
    const visitorUserId =
      req.user?.id || null;

    /**
     * These values are only used to create
     * hashed identifiers.
     *
     * They are NOT persisted directly.
     */
    const ip =
      getClientIp(req);

    const userAgent =
      getUserAgent(req);

    /**
     * Anonymous session identifier.
     *
     * The raw session ID lives in the cookie.
     * Only its hash will be stored in analytics.
     */
    const sessionId =
      getOrCreateSessionId(
        req,
        res
      );

    /**
     * Create irreversible analytics identifiers.
     */
    const visitorKey =
      createVisitorKey({
        userId: visitorUserId,
        ip,
        userAgent,
      });

    const sessionKey =
      createSessionKey(
        sessionId
      );

    /**
     * Attach analytics context to the request.
     *
     * Controllers/services can now use this
     * without needing to understand cookies,
     * IP addresses, hashing, etc.
     */
    req.analyticsVisitor = {
      visitorUserId,
      visitorKey,
      sessionKey,
    };

    return next();
  } catch (error) {
    /**
     * =====================================================
     * FAIL OPEN
     * =====================================================
     *
     * Analytics must NEVER break:
     *
     * - Marketplace browsing
     * - Listing details
     * - Business storefronts
     * - Offers
     * - Trades
     *
     * If visitor identification fails, continue with
     * empty analytics identity.
     */
    console.error(
      "Analytics visitor middleware error:",
      error
    );

    req.analyticsVisitor = {
      visitorUserId:
        req.user?.id || null,

      visitorKey: null,
      sessionKey: null,
    };

    return next();
  }
};

/**
 * =========================================================
 * OPTIONAL EXPORTS
 * =========================================================
 *
 * Exported mainly so future tests can verify cookie
 * configuration without duplicating these constants.
 */
export const ANALYTICS_COOKIE_NAME =
  ANALYTICS_SESSION_COOKIE;

export const ANALYTICS_COOKIE_MAX_AGE =
  ANALYTICS_SESSION_MAX_AGE;