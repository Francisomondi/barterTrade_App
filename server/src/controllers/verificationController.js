
import {
  createTradeVerifications,
  getTradeVerifications,
  getMyTradeVerification,
  verifyTradeItem,
  rejectTradeVerification,
} from "../services/verificationService.js";

/**
 * POST /api/trades/:tradeId/verifications
 *
 * Creates verification records for both traders.
 */
export const createVerifications = async (req, res) => {
  try {
    const { tradeId } = req.params;
    const userId = req.user.id;

    const result = await createTradeVerifications({
      tradeId,
      userId,
    });

    return res.status(201).json({
      success: true,
      message: "Trade verification records created",
      data: result,
    });
  } catch (error) {
    console.error("CREATE VERIFICATIONS ERROR:", error);

    if (error.message === "Trade not found") {
      return res.status(404).json({
        success: false,
        message: error.message,
      });
    }

    if (
      error.message ===
      "You are not a participant in this trade"
    ) {
      return res.status(403).json({
        success: false,
        message: error.message,
      });
    }

    return res.status(400).json({
      success: false,
      message: error.message,
    });
  }
};

/**
 * GET /api/trades/:tradeId/verifications
 *
 * Gets both traders' verification records.
 */
export const getVerifications = async (req, res) => {
  try {
    const { tradeId } = req.params;
    const userId = req.user.id;

    const result = await getTradeVerifications({
      tradeId,
      userId,
    });

    return res.status(200).json({
      success: true,
      data: result,
    });
  } catch (error) {
    console.error("GET VERIFICATIONS ERROR:", error);

    if (error.message === "Trade not found") {
      return res.status(404).json({
        success: false,
        message: error.message,
      });
    }

    if (
      error.message ===
      "You are not a participant in this trade"
    ) {
      return res.status(403).json({
        success: false,
        message: error.message,
      });
    }

    return res.status(400).json({
      success: false,
      message: error.message,
    });
  }
};

/**
 * GET /api/trades/:tradeId/verifications/me
 *
 * Gets the logged-in user's verification record.
 */
export const getMyVerification = async (req, res) => {
  try {
    const { tradeId } = req.params;
    const userId = req.user.id;

    const result = await getMyTradeVerification({
      tradeId,
      userId,
    });

    return res.status(200).json({
      success: true,
      data: result,
    });
  } catch (error) {
    console.error("GET MY VERIFICATION ERROR:", error);

    if (error.message === "Trade not found") {
      return res.status(404).json({
        success: false,
        message: error.message,
      });
    }

    if (
      error.message ===
      "You are not a participant in this trade"
    ) {
      return res.status(403).json({
        success: false,
        message: error.message,
      });
    }

    return res.status(400).json({
      success: false,
      message: error.message,
    });
  }
};

/**
 * PATCH /api/trades/:tradeId/verifications/verify
 *
 * Verifies the logged-in user's item.
 */
export const verifyItem = async (req, res) => {
  try {
    const { tradeId } = req.params;
    const userId = req.user.id;

    const {
      notes,
      documentUrl,
    } = req.body || {};

    const result = await verifyTradeItem({
      tradeId,
      userId,
      notes,
      documentUrl,
    });

    return res.status(200).json({
      success: true,
      message: result.tradeAdvanced
        ? "Item verified. Both traders have verified the trade."
        : "Your item has been verified successfully.",
      data: result,
    });
  } catch (error) {
    console.error("VERIFY ITEM ERROR:", error);

    if (error.message === "Trade not found") {
      return res.status(404).json({
        success: false,
        message: error.message,
      });
    }

    if (
      error.message ===
      "You are not a participant in this trade"
    ) {
      return res.status(403).json({
        success: false,
        message: error.message,
      });
    }

    return res.status(400).json({
      success: false,
      message: error.message,
    });
  }
};

/**
 * PATCH /api/trades/:tradeId/verifications/reject
 *
 * Rejects the logged-in user's item verification.
 */
export const rejectItem = async (req, res) => {
  try {
    const { tradeId } = req.params;
    const userId = req.user.id;

    const { notes } = req.body || {};

    const result = await rejectTradeVerification({
      tradeId,
      userId,
      notes,
    });

    return res.status(200).json({
      success: true,
      message: "Item verification rejected",
      data: result,
    });
  } catch (error) {
    console.error("REJECT VERIFICATION ERROR:", error);

    if (error.message === "Trade not found") {
      return res.status(404).json({
        success: false,
        message: error.message,
      });
    }

    if (
      error.message ===
      "You are not a participant in this trade"
    ) {
      return res.status(403).json({
        success: false,
        message: error.message,
      });
    }

    return res.status(400).json({
      success: false,
      message: error.message,
    });
  }
};

