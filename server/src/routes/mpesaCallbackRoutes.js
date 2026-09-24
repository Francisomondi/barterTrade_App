import express from "express";

import {
  promotionPaymentCallback,
} from "../controllers/mpesaCallbackController.js";

const router = express.Router();

/**
 * Safaricom callback.
 *
 * DO NOT put `protect` here.
 */
router.post(
  "/promotions/callback",
  promotionPaymentCallback
);

export default router;