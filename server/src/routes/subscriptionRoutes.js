import express from "express";

import {
  getSubscriptionPlans,
  createSubscription,
  getMySubscription,
  getSubscription,
  payForSubscription,
  getSubscriptionPaymentStatus,
} from "../controllers/subscriptionController.js";

import {
  protect,
} from "../middleware/authMiddleware.js";

const router =
  express.Router();

/*
 * Public plan information.
 */

router.get(
  "/plans",
  getSubscriptionPlans
);

/*
 * Everything below requires login.
 */

router.use(protect);

router.post(
  "/",
  createSubscription
);

router.get(
  "/me",
  getMySubscription
);

/*
 * IMPORTANT:
 *
 * This route must be above /:id.
 */

router.get(
  "/payments/:paymentId/status",
  getSubscriptionPaymentStatus
);

router.post(
  "/:id/pay",
  payForSubscription
);

router.get(
  "/:id",
  getSubscription
);

export default router;