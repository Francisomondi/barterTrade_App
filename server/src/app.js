// UPDATE — server/src/app.js

import express from "express";
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

const allowedOrigins = [
  "http://localhost:5173",

  process.env.CLIENT_URL,
  process.env.FRONTEND_URL,
].filter(Boolean);

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

      if (
        allowedOrigins.includes(
          origin
        )
      ) {
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

app.use(express.json());

app.use(
  express.urlencoded({
    extended: true,
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

app.get(
  "/api/health",
  (req, res) => {
    res.json({
      success: true,
      message:
        "Barter Trade API is running",
    });
  }
);

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

export default app;