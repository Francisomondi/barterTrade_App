import prisma from "../config/prisma.js";
import { createNotification } from "../services/notificationService.js";

/**
 * Trade stages from which a trader may raise a dispute.
 *
 * This matches the existing Trade lifecycle rules where
 * DISPUTED is allowed from:
 *
 * VERIFICATION
 * READY_FOR_HANDOVER
 * IN_PROGRESS
 */
const disputableStatuses = [
  "VERIFICATION",
  "READY_FOR_HANDOVER",
  "IN_PROGRESS",
];

/**
 * CREATE DISPUTE
 * POST /api/disputes/trades/:tradeId
 */
export const createDispute = async (req, res) => {
  try {
    const { tradeId } = req.params;
    const userId = req.user.id;

    const reason =
      typeof req.body?.reason === "string"
        ? req.body.reason.trim()
        : "";

    const description =
      typeof req.body?.description === "string"
        ? req.body.description.trim()
        : "";

    /* ==========================================
       VALIDATION
    ========================================== */

    if (!tradeId) {
      return res.status(400).json({
        success: false,
        message: "Trade ID is required.",
      });
    }

    if (!reason) {
      return res.status(400).json({
        success: false,
        message: "Please provide a dispute reason.",
      });
    }

    if (reason.length > 100) {
      return res.status(400).json({
        success: false,
        message:
          "Dispute reason cannot exceed 100 characters.",
      });
    }

    if (!description) {
      return res.status(400).json({
        success: false,
        message:
          "Please describe what happened.",
      });
    }

    if (description.length < 10) {
      return res.status(400).json({
        success: false,
        message:
          "Dispute description must be at least 10 characters.",
      });
    }

    if (description.length > 5000) {
      return res.status(400).json({
        success: false,
        message:
          "Dispute description cannot exceed 5000 characters.",
      });
    }

    /* ==========================================
       LOAD TRADE
    ========================================== */

    const trade = await prisma.trade.findUnique({
      where: {
        id: tradeId,
      },

      select: {
        id: true,
        tradeNumber: true,
        status: true,
        traderAId: true,
        traderBId: true,
        dispute: {
          select: {
            id: true,
            status: true,
          },
        },
      },
    });

    if (!trade) {
      return res.status(404).json({
        success: false,
        message: "Trade not found.",
      });
    }

    /* ==========================================
       PARTICIPANT CHECK
    ========================================== */

    const isTraderA =
      trade.traderAId === userId;

    const isTraderB =
      trade.traderBId === userId;

    if (!isTraderA && !isTraderB) {
      return res.status(403).json({
        success: false,
        message:
          "You are not a participant in this trade.",
      });
    }

    /* ==========================================
       STATUS CHECK
    ========================================== */

    if (!disputableStatuses.includes(trade.status)) {
      return res.status(400).json({
        success: false,
        message:
          "A dispute can only be raised during verification, handover readiness, or an active handover.",
      });
    }

    /* ==========================================
       EXISTING DISPUTE CHECK
    ========================================== */

    if (trade.dispute) {
      return res.status(409).json({
        success: false,
        message:
          "This trade already has a dispute.",
        dispute: trade.dispute,
      });
    }

    /* ==========================================
       DETERMINE OTHER TRADER
    ========================================== */

    const otherTraderId = isTraderA
      ? trade.traderBId
      : trade.traderAId;

    /* ==========================================
       ATOMIC CREATE + TRADE STATUS UPDATE
    ========================================== */

    let dispute;

    try {
      dispute = await prisma.$transaction(
        async (tx) => {
          const createdDispute =
            await tx.dispute.create({
              data: {
                tradeId,
                userId,
                reason,
                description,
                status: "OPEN",
              },
              include: {
                user: {
                  select: {
                    id: true,
                    name: true,
                    avatar: true,
                  },
                },
              },
            });

          const statusUpdate =
            await tx.trade.updateMany({
              where: {
                id: tradeId,
                status: trade.status,
              },

              data: {
                status: "DISPUTED",
              },
            });

          if (statusUpdate.count !== 1) {
            const error = new Error(
              "The trade changed before the dispute could be created."
            );

            error.statusCode = 409;

            throw error;
          }

          return createdDispute;
        }
      );
    } catch (error) {
      if (error.code === "P2002") {
        return res.status(409).json({
          success: false,
          message:
            "This trade already has a dispute.",
        });
      }

      if (error.statusCode) {
        return res.status(error.statusCode).json({
          success: false,
          message: error.message,
        });
      }

      throw error;
    }

    /* ==========================================
       NOTIFY OTHER TRADER
    ========================================== */

    try {
      await createNotification({
        userId: otherTraderId,
        type: "DISPUTE",
        title: "Trade Dispute Raised",
        referenceId: trade.id,
        referenceType: "TRADE",
        message:
          `A dispute has been raised for Trade ${trade.tradeNumber}. Further trade progress has been paused while the dispute is reviewed.`,
      });
    } catch (notificationError) {
      console.error(
        "CREATE DISPUTE NOTIFICATION ERROR:",
        notificationError
      );
    }

    return res.status(201).json({
      success: true,
      message:
        "Dispute submitted successfully. This trade is now under dispute.",
      dispute,
      trade: {
        id: trade.id,
        tradeNumber: trade.tradeNumber,
        status: "DISPUTED",
      },
    });
  } catch (error) {
    console.error(
      "CREATE DISPUTE ERROR:",
      error
    );

    return res.status(500).json({
      success: false,
      message:
        "Unable to create trade dispute.",
    });
  }
};

/**
 * GET TRADE DISPUTE
 * GET /api/disputes/trades/:tradeId
 */
export const getTradeDispute = async (
  req,
  res
) => {
  try {
    const { tradeId } = req.params;
    const userId = req.user.id;

    const trade = await prisma.trade.findUnique({
      where: {
        id: tradeId,
      },

      select: {
        id: true,
        tradeNumber: true,
        traderAId: true,
        traderBId: true,

        dispute: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
                avatar: true,
              },
            },
          },
        },
      },
    });

    if (!trade) {
      return res.status(404).json({
        success: false,
        message: "Trade not found.",
      });
    }

    const isParticipant =
      trade.traderAId === userId ||
      trade.traderBId === userId;

    if (!isParticipant) {
      return res.status(403).json({
        success: false,
        message:
          "You are not a participant in this trade.",
      });
    }

    return res.status(200).json({
      success: true,
      dispute: trade.dispute || null,
    });
  } catch (error) {
    console.error(
      "GET TRADE DISPUTE ERROR:",
      error
    );

    return res.status(500).json({
      success: false,
      message:
        "Unable to fetch trade dispute.",
    });
  }
};