// UPDATE — server/src/app.js

import express from "express";
import multer from "multer";
import cors from "cors";
import cookieParser from "cookie-parser";

import passport from "./config/passport.js";

import authRoutes from "./routes/authRoutes.js";
import categoryRoutes from "./routes/categoryRoutes.js";
import listingRoutes from "./routes/listingRoutes.js";
import offerRoutes from "./routes/offerRoutes.js";
import tradeRoutes from "./routes/tradeRoutes.js";
import uploadRoutes from "./routes/uploadRoutes.js";
import matchRoutes from "./routes/matchRoutes.js";
import notificationRoutes from "./routes/notificationRoutes.js";
import ratingRoutes from "./routes/ratingRoutes.js";
import disputeRoutes from "./routes/disputeRoutes.js";
import paymentRoutes from "./routes/paymentRoutes.js";
import promotionRoutes from "./routes/promotionRoutes.js";
import promotionAnalyticsRoutes from "./routes/promotionAnalyticsRoutes.js";
import mpesaCallbackRoutes from "./routes/mpesaCallbackRoutes.js";
import subscriptionRoutes from "./routes/subscriptionRoutes.js";
import entitlementRoutes from "./routes/entitlementRoutes.js";
import premiumAnalyticsRoutes from "./routes/premiumAnalyticsRoutes.js";
import businessRoutes from "./routes/businessRoutes.js";
import userRoutes from "./routes/userRoutes.js";

const app = express();
app.disable("x-powered-by");
/**
 * =========================================================
 * TRUST PROXY
 * =========================================================
 *
 * Your API is deployed behind a reverse proxy in production.
 *
 * This allows Express req.ip to represent the originating
 * client correctly when running behind that proxy.
 *
 * We only enable it in production.
 */
if (process.env.NODE_ENV === "production") {
  app.set("trust proxy", 1);
}

/**
 * =========================================================
 * CORS
 * =========================================================
 */

const normalizeOrigin = (origin) =>
 origin.trim().replace(/\/+$/, "");

const configuredOrigins = [
  process.env.CLIENT_URL,
  process.env.FRONTEND_URL,
  process.env.ALLOWED_ORIGINS,
]
  .filter(Boolean)
  .flatMap((value) => value.split(","))
  .map(normalizeOrigin)
  .filter(Boolean);

const allowedOrigins = new Set([
  ...configuredOrigins,

  ...(process.env.NODE_ENV !== "production"
    ? ["http://localhost:5173"]
    : []),
]);

app.use(
  cors({
    origin(origin, callback) {
      /*
       * Allow requests without an Origin header.
       *
       * Examples:
       * - Postman
       * - server-to-server requests
       * - some health checks
       */
      if (!origin) {
        return callback(
          null,
          true
        );
      }

      if (allowedOrigins.has(normalizeOrigin(origin))) {
        return callback(
          null,
          true
        );
      }

      console.warn(
        `CORS blocked origin: ${origin}`
      );

      return callback(
        new Error(
          `Origin ${origin} is not allowed by CORS`
        )
      );
    },

    credentials: true,

    methods: [
      "GET",
      "POST",
      "PUT",
      "PATCH",
      "DELETE",
      "OPTIONS",
    ],

  allowedHeaders: [
    "Content-Type",
    "Authorization",
    "Cache-Control",
    "Pragma",
    "Expires",
  ],
  })
);
/**
 * =========================================================
 * BODY PARSERS
 * =========================================================
 */

app.use(
  express.json({
    limit: "1mb",
  })
);

app.use(
  express.urlencoded({
    extended: true,
    limit: "1mb",
    parameterLimit: 1000,
  })
);

/**
 * =========================================================
 * COOKIE PARSER
 * =========================================================
 *
 * Required by analyticsVisitor.js.
 *
 * It allows the middleware to read:
 *
 * req.cookies.barter_analytics_session
 */
app.use(cookieParser());

/**
 * =========================================================
 * PASSPORT
 * =========================================================
 */

app.use(passport.initialize());

/**
 * =========================================================
 * HEALTH CHECK
 * =========================================================
 */

app.get("/api/health", (req, res) => {
  res.status(200).json({
    success: true,
    service: "BarterConnekt API",
    status: "running",
    timestamp: new Date().toISOString(),
  });
});

/**
 * =========================================================
 * ROUTES
 * =========================================================
 */

app.use(
  "/api/auth",
  authRoutes
);

/**
 * =========================================================
 * PUBLIC USER / TRADER PROFILES
 * =========================================================
 *
 * Example:
 *
 * GET /api/users/:userId/public-profile
 *
 * This is separate from /api/auth/me.
 *
 * /api/auth/me
 *   -> private authenticated account information
 *
 * /api/users/:userId/public-profile
 *   -> safe public marketplace profile
 */
app.use(
  "/api/users",
  userRoutes
);

app.use(
  "/api/categories",
  categoryRoutes
);

app.use(
  "/api/listings",
  listingRoutes
);

app.use(
  "/api/offers",
  offerRoutes
);

app.use(
  "/api/trades",
  tradeRoutes
);

app.use(
  "/api/uploads",
  uploadRoutes
);

app.use(
  "/api/matches",
  matchRoutes
);

app.use(
  "/api/notifications",
  notificationRoutes
);

app.use(
  "/api/ratings",
  ratingRoutes
);

app.use(
  "/api/disputes",
  disputeRoutes
);

app.use(
  "/api/payments",
  paymentRoutes
);

app.use(
  "/api/promotions",
  promotionRoutes
);

app.use(
  "/api/promotions",
  promotionAnalyticsRoutes
);

app.use(
  "/api/mpesa",
  mpesaCallbackRoutes
);

app.use(
  "/api/subscriptions",
  subscriptionRoutes
);

app.use(
  "/api/entitlements",
  entitlementRoutes
);

app.use(
  "/api/premium-analytics",
  premiumAnalyticsRoutes
);

app.use(
  "/api/business",
  businessRoutes
);

/**
 * =========================================================
 * API 404 HANDLER
 * =========================================================
 */

app.use("/api", (req, res) => {
  return res.status(404).json({
    success: false,
    message: "API endpoint not found.",
  });
});


/**
 * ============================================================
 * GLOBAL ERROR HANDLER
 * ============================================================
 *
 * Handles:
 * - Multer upload errors
 * - Invalid image types
 * - Other application errors
 *
 * Must be registered AFTER all API routes.
 */
app.use((error, req, res, next) => {
  console.error("EXPRESS ERROR:", error);

  // 1. Handle Multer upload errors
  if (error instanceof multer.MulterError) {
    const messages = {
      LIMIT_FILE_SIZE:
        "Image must not exceed 5 MB.",

      LIMIT_FILE_COUNT:
        "Too many images uploaded.",

      LIMIT_UNEXPECTED_FILE:
        "Unexpected image field or too many files.",

      LIMIT_FIELD_COUNT:
        "Too many form fields.",

      LIMIT_PART_COUNT:
        "Too many multipart fields or files.",
    };

    return res.status(400).json({
      success: false,
      code: error.code,
      message:
        messages[error.code] ||
        "Invalid image upload.",
    });
  }

  // 2. Handle invalid image types from upload.js
  if (error.code === "INVALID_IMAGE_TYPE") {
    return res.status(400).json({
      success: false,
      code: "INVALID_IMAGE_TYPE",
      message: error.message,
    });
  }

  // 3. Handle other known application errors
  const statusCode =
    Number.isInteger(error.statusCode) &&
    error.statusCode >= 400 &&
    error.statusCode <= 599
      ? error.statusCode
      : 500;

  return res.status(statusCode).json({
    success: false,
    code:
      statusCode >= 500
        ? "INTERNAL_SERVER_ERROR"
        : error.code || "REQUEST_ERROR",
    message:
      statusCode >= 500
        ? "An unexpected server error occurred."
        : error.message || "Request failed.",
  });
});
export default app;