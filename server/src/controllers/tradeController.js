
import prisma from "../config/prisma.js";
import { createNotification } from "../services/notificationService.js";

/**
 * Allowed trade status transitions.
 */
const allowedTransitions = {
  PENDING: ["AGREED", "CANCELLED"],

  AGREED: ["VERIFICATION", "CANCELLED"],

  VERIFICATION: [
    "READY_FOR_HANDOVER",
    "CANCELLED",
    "DISPUTED",
  ],

  READY_FOR_HANDOVER: [
    "IN_PROGRESS",
    "CANCELLED",
    "DISPUTED",
  ],

  IN_PROGRESS: [
    "COMPLETED",
    "DISPUTED",
  ],

  COMPLETED: [],

  CANCELLED: [],

  DISPUTED: [],
};

/**
 * Confirmation stages.
 */
const CONFIRMATION_STAGES = {
  AGREEMENT: "AGREEMENT",
  VERIFICATION: "VERIFICATION",
  HANDOVER: "HANDOVER",
  HANDOVER_STARTED: "HANDOVER_STARTED",
};

/**
 * Determine which confirmation stage is required
 * for the current trade status.
 */
const getConfirmationStageForStatus = (status) => {
  switch (status) {
    case "PENDING":
      return CONFIRMATION_STAGES.AGREEMENT;

    case "AGREED":
      return CONFIRMATION_STAGES.VERIFICATION;

    case "VERIFICATION":
      return CONFIRMATION_STAGES.HANDOVER;

    case "READY_FOR_HANDOVER":
      return CONFIRMATION_STAGES.HANDOVER_STARTED;

    default:
      return null;
  }
};

/**
 * GET ALL USER TRADES
 * GET /api/trades
 */
export const getTrades = async (req, res) => {
  try {
    const userId = req.user.id;

    const trades = await prisma.trade.findMany({
      where: {
        OR: [
          {
            traderAId: userId,
          },
          {
            traderBId: userId,
          },
        ],
      },

      include: {
        traderA: {
          select: {
            id: true,
            name: true,
            email: true,
            avatar: true,
            barterScore: true,
          },
        },

        traderB: {
          select: {
            id: true,
            name: true,
            email: true,
            avatar: true,
            barterScore: true,
          },
        },

        offer: {
          include: {
            offeredListing: {
              include: {
                images: true,
                category: true,
              },
            },

            requestedListing: {
              include: {
                images: true,
                category: true,
              },
            },
          },
        },

        items: {
          include: {
            listing: {
              include: {
                images: true,
                category: true,
              },
            },
          },
        },

        confirmations: {
          select: {
            id: true,
            userId: true,
            stage: true,
            confirmedAt: true,
          },
        },
      },

      orderBy: {
        createdAt: "desc",
      },
    });

    return res.status(200).json({
      success: true,
      trades,
    });
  } catch (error) {
    console.error("GET TRADES ERROR:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to fetch trades.",
    });
  }
};

/**
 * GET SINGLE TRADE
 * GET /api/trades/:id
 */
export const getTradeById = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    const trade = await prisma.trade.findUnique({
      where: {
        id,
      },

      include: {
        traderA: {
          select: {
            id: true,
            name: true,
            email: true,
            avatar: true,
            phone: true,
            location: true,
            barterScore: true,
            completedTrades: true,
          },
        },

        traderB: {
          select: {
            id: true,
            name: true,
            email: true,
            avatar: true,
            phone: true,
            location: true,
            barterScore: true,
            completedTrades: true,
          },
        },

        offer: {
          include: {
            sender: {
              select: {
                id: true,
                name: true,
                avatar: true,
              },
            },

            receiver: {
              select: {
                id: true,
                name: true,
                avatar: true,
              },
            },

            offeredListing: {
              include: {
                images: true,
                category: true,
              },
            },

            requestedListing: {
              include: {
                images: true,
                category: true,
              },
            },
          },
        },

        items: {
          include: {
            listing: {
              include: {
                images: true,
                category: true,
              },
            },
          },
        },

        confirmations: {
          select: {
            id: true,
            userId: true,
            stage: true,
            confirmedAt: true,
          },

          orderBy: {
            confirmedAt: "asc",
          },
        },

        ratings: true,

        dispute: true,
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
        message: "You are not a participant in this trade.",
      });
    }

    return res.status(200).json({
      success: true,
      trade,
    });
  } catch (error) {
    console.error("GET TRADE BY ID ERROR:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to fetch trade.",
    });
  }
};

/**
 * Record a user's confirmation for a trade stage.
 *
 * Database constraint:
 *
 * [tradeId, userId, stage]
 *
 * prevents duplicate confirmation.
 */
const confirmTradeStage = async (
  tradeId,
  userId,
  stage
) => {
  const trade = await prisma.trade.findUnique({
    where: {
      id: tradeId,
    },

    include: {
      traderA: {
        select: {
          id: true,
          name: true,
        },
      },

      traderB: {
        select: {
          id: true,
          name: true,
        },
      },
    },
  });

  if (!trade) {
    const error = new Error("Trade not found.");
    error.statusCode = 404;
    throw error;
  }

  const isTraderA = trade.traderAId === userId;
  const isTraderB = trade.traderBId === userId;

  if (!isTraderA && !isTraderB) {
    const error = new Error(
      "You are not a participant in this trade."
    );

    error.statusCode = 403;

    throw error;
  }

  /**
   * Prevent duplicate confirmation.
   */
  const existingConfirmation =
    await prisma.tradeConfirmation.findUnique({
      where: {
        tradeId_userId_stage: {
          tradeId,
          userId,
          stage,
        },
      },
    });

  if (existingConfirmation) {
    const error = new Error(
      "You have already confirmed this stage."
    );

    error.statusCode = 400;

    throw error;
  }

  /**
   * Create confirmation.
   */
  let confirmation;

  try {
    confirmation =
      await prisma.tradeConfirmation.create({
        data: {
          tradeId,
          userId,
          stage,
        },
      });
  } catch (error) {
    if (error.code === "P2002") {
      const duplicateError = new Error(
        "You have already confirmed this stage."
      );

      duplicateError.statusCode = 400;

      throw duplicateError;
    }

    throw error;
  }

  /**
   * Fetch confirmations for current stage.
   */
  const confirmations =
    await prisma.tradeConfirmation.findMany({
      where: {
        tradeId,
        stage,
      },

      select: {
        userId: true,
        confirmedAt: true,
      },
    });

  const traderAConfirmed =
    confirmations.some(
      (item) => item.userId === trade.traderAId
    );

  const traderBConfirmed =
    confirmations.some(
      (item) => item.userId === trade.traderBId
    );

  const bothConfirmed =
    traderAConfirmed && traderBConfirmed;

  return {
    trade,
    confirmation,
    traderAConfirmed,
    traderBConfirmed,
    bothConfirmed,
  };
};

/**
 * CONFIRM TRADE STAGE
 * PATCH /api/trades/:id/confirm
 *
 * Both traders must confirm each stage before
 * the trade can progress.
 *
 * Handover confirmation requires BOTH traders
 * to have verified their items.
 */
export const confirmTrade = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    const trade = await prisma.trade.findUnique({
      where: {
        id,
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
        message: "You are not a participant in this trade.",
      });
    }

    const stage = getConfirmationStageForStatus(
      trade.status
    );

    if (!stage) {
      return res.status(400).json({
        success: false,
        message:
          "This trade does not currently require confirmation.",
      });
    }

    /**
     * VERIFICATION GATE
     *
     * Both traders must verify their items before
     * either trader can confirm handover readiness.
     */
    if (
      trade.status === "VERIFICATION" &&
      stage === CONFIRMATION_STAGES.HANDOVER
    ) {
      const verifications =
        await prisma.verification.findMany({
          where: {
            tradeId: id,
            userId: {
              in: [
                trade.traderAId,
                trade.traderBId,
              ],
            },
          },

          select: {
            userId: true,
            status: true,
          },
        });

      const traderAVerified =
        verifications.some(
          (verification) =>
            verification.userId ===
              trade.traderAId &&
            verification.status === "VERIFIED"
        );

      const traderBVerified =
        verifications.some(
          (verification) =>
            verification.userId ===
              trade.traderBId &&
            verification.status === "VERIFIED"
        );

      if (!traderAVerified || !traderBVerified) {
        return res.status(400).json({
          success: false,
          message:
            "Both traders must verify their items before handover readiness can be confirmed.",

          verification: {
            traderAVerified,
            traderBVerified,
          },
        });
      }
    }

    /**
     * Record current user's confirmation.
     */
    const result = await confirmTradeStage(
      id,
      userId,
      stage
    );

    let updatedTrade = trade;

    /**
     * Advance trade only after BOTH traders
     * have confirmed the current stage.
     */
    if (result.bothConfirmed) {
      let nextStatus = null;

      if (
        stage ===
        CONFIRMATION_STAGES.AGREEMENT
      ) {
        nextStatus = "AGREED";
      }

      if (
        stage ===
        CONFIRMATION_STAGES.VERIFICATION
      ) {
        nextStatus = "VERIFICATION";
      }

      if (
        stage ===
        CONFIRMATION_STAGES.HANDOVER
      ) {
        nextStatus = "READY_FOR_HANDOVER";
      }

      /**
       * STEP 6.8
       *
       * READY_FOR_HANDOVER
       *        ↓
       * Both traders confirm handover started
       *        ↓
       * IN_PROGRESS
       */
      if (
        stage ===
        CONFIRMATION_STAGES.HANDOVER_STARTED
      ) {
        nextStatus = "IN_PROGRESS";
      }

      if (nextStatus) {
        const statusUpdate =
          await prisma.trade.updateMany({
            where: {
              id,
              status: trade.status,
            },

            data: {
              status: nextStatus,
            },
          });

        /**
         * Concurrency protection.
         *
         * If another request changed the trade
         * before this update, do not continue using
         * stale state.
         */
        if (statusUpdate.count !== 1) {
          return res.status(409).json({
            success: false,
            message:
              "The trade was updated by another request. Please refresh and try again.",
          });
        }

        updatedTrade =
          await prisma.trade.findUnique({
            where: {
              id,
            },
          });
      }
    }

    /**
     * Notify other trader when their confirmation
     * is still required.
     */
    const otherTraderId =
      trade.traderAId === userId
        ? trade.traderBId
        : trade.traderAId;

    if (!result.bothConfirmed) {
      await createNotification({
        userId: otherTraderId,
        type: "TRADE",
        title: "Trade Confirmation Required",
        referenceId: trade.id,
        referenceType: "TRADE",

        message:
          `Your trade partner has confirmed the ${stage.toLowerCase()} stage. Your confirmation is still required for Trade ${trade.tradeNumber}.`,
      });
    }

    /**
     * Notify both traders when stage is complete.
     */
    if (result.bothConfirmed) {
      const notificationMessage =
        `Both traders confirmed the ${stage.toLowerCase()} stage. Trade ${trade.tradeNumber} is now ${updatedTrade.status}.`;

      await createNotification({
        userId: trade.traderAId,
        type: "TRADE",
        title: "Trade Stage Confirmed",
        referenceId: trade.id,
        referenceType: "TRADE",
        message: notificationMessage,
      });

      await createNotification({
        userId: trade.traderBId,
        type: "TRADE",
        title: "Trade Stage Confirmed",
        referenceId: trade.id,
        referenceType: "TRADE",
        message: notificationMessage,
      });
    }

    return res.status(200).json({
      success: true,

      message: result.bothConfirmed
        ? `Both traders confirmed. Trade moved to ${updatedTrade.status}.`
        : `Your ${stage.toLowerCase()} confirmation has been recorded. Waiting for the other trader.`,

      trade: updatedTrade,

      stage,

      traderAConfirmed:
        result.traderAConfirmed,

      traderBConfirmed:
        result.traderBConfirmed,

      bothConfirmed:
        result.bothConfirmed,
    });
  } catch (error) {
    console.error(
      "CONFIRM TRADE ERROR:",
      error
    );

    return res.status(
      error.statusCode || 500
    ).json({
      success: false,
      message:
        error.message ||
        "Failed to confirm trade.",
    });
  }
};

/**
 * UPDATE TRADE STATUS
 * PATCH /api/trades/:id/status
 *
 * Used for lifecycle transitions that are NOT
 * controlled by two-party confirmation.
 */
export const updateTradeStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;
    const userId = req.user.id;

    if (!status) {
      return res.status(400).json({
        success: false,
        message: "Trade status is required.",
      });
    }

    const trade = await prisma.trade.findUnique({
      where: {
        id,
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

    /**
     * Agreement requires BOTH traders.
     */
    if (
      trade.status === "PENDING" &&
      status === "AGREED"
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Both traders must confirm the trade before it can be agreed.",
      });
    }

    /**
     * Verification requires BOTH traders.
     */
    if (
      trade.status === "AGREED" &&
      status === "VERIFICATION"
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Both traders must confirm verification before the trade can enter verification.",
      });
    }

    /**
     * Handover readiness requires BOTH traders.
     */
    if (
      trade.status === "VERIFICATION" &&
      status === "READY_FOR_HANDOVER"
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Both traders must confirm handover readiness before proceeding.",
      });
    }

    /**
     * STEP 6.8 SECURITY GATE
     *
     * A trader cannot directly change:
     *
     * READY_FOR_HANDOVER
     *        ↓
     * IN_PROGRESS
     *
     * The only valid way is:
     *
     * Trader A confirms HANDOVER_STARTED
     * Trader B confirms HANDOVER_STARTED
     *        ↓
     * IN_PROGRESS
     */
    if (
      trade.status === "READY_FOR_HANDOVER" &&
      status === "IN_PROGRESS"
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Both traders must confirm that handover has started before the trade can enter progress.",
      });
    }

    /**
     * Completion must use the dedicated endpoint.
     */
    if (status === "COMPLETED") {
      return res.status(400).json({
        success: false,
        message:
          "Use the complete trade endpoint to complete a trade.",
      });
    }

    /**
     * Disputes must use the dispute process.
     */
    if (status === "DISPUTED") {
      return res.status(400).json({
        success: false,
        message:
          "Use the dispute process to dispute a trade.",
      });
    }

    const currentAllowedTransitions =
      allowedTransitions[trade.status] || [];

    if (
      !currentAllowedTransitions.includes(status)
    ) {
      return res.status(400).json({
        success: false,

        message:
          `Trade cannot move from ${trade.status} to ${status}.`,
      });
    }

    /**
     * Atomically update the trade.
     */
    const statusUpdate =
      await prisma.trade.updateMany({
        where: {
          id,
          status: trade.status,
        },

        data: {
          status,
        },
      });

    if (statusUpdate.count !== 1) {
      return res.status(409).json({
        success: false,
        message:
          "The trade was updated by another request. Please refresh and try again.",
      });
    }

    const updatedTrade =
      await prisma.trade.findUnique({
        where: {
          id,
        },
      });

    const otherTraderId =
      trade.traderAId === userId
        ? trade.traderBId
        : trade.traderAId;

    /**
     * Cancellation only notifies the other trader.
     */
    if (status === "CANCELLED") {
      await createNotification({
        userId: otherTraderId,
        type: "TRADE",
        title: "Trade Cancelled",
        referenceId: trade.id,
        referenceType: "TRADE",

        message:
          `Trade ${trade.tradeNumber} has been cancelled.`,
      });
    } else {
      /**
       * Normal lifecycle updates notify both traders.
       */
      const message =
        `Trade ${trade.tradeNumber} is now ${status}.`;

      await createNotification({
        userId: trade.traderAId,
        type: "TRADE",
        title: "Trade Status Updated",
        referenceId: trade.id,
        referenceType: "TRADE",
        message,
      });

      await createNotification({
        userId: trade.traderBId,
        type: "TRADE",
        title: "Trade Status Updated",
        referenceId: trade.id,
        referenceType: "TRADE",
        message,
      });
    }

    return res.status(200).json({
      success: true,

      message:
        `Trade status updated to ${status}.`,

      trade: updatedTrade,
    });
  } catch (error) {
    console.error(
      "UPDATE TRADE STATUS ERROR:",
      error
    );

    return res.status(500).json({
      success: false,
      message:
        "Failed to update trade status.",
    });
  }
};

/**
 * COMPLETE TRADE
 * PATCH /api/trades/:id/complete
 *
 * Only IN_PROGRESS trades can be completed.
 *
 * NOTE:
 * Completion is currently handled by the
 * dedicated endpoint. Two-party completion can
 * be added as the next lifecycle step.
 */
export const completeTrade = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    const trade = await prisma.trade.findUnique({
      where: {
        id,
      },

      include: {
        items: true,

        traderA: {
          select: {
            id: true,
            name: true,
            completedTrades: true,
          },
        },

        traderB: {
          select: {
            id: true,
            name: true,
            completedTrades: true,
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

    /**
     * Only participants can complete.
     */
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

    /**
     * Prevent completing an already completed trade.
     */
    if (trade.status === "COMPLETED") {
      return res.status(400).json({
        success: false,
        message:
          "This trade has already been completed.",
      });
    }

    /**
     * Only IN_PROGRESS trades can be completed.
     */
    if (trade.status !== "IN_PROGRESS") {
      return res.status(400).json({
        success: false,
        message:
          "Only trades in progress can be completed.",
      });
    }

    /**
     * Everything caused by completion happens
     * inside one transaction.
     */
    const completedTrade =
      await prisma.$transaction(
        async (tx) => {
          /**
           * Atomically:
           *
           * IN_PROGRESS → COMPLETED
           */
          const tradeUpdate =
            await tx.trade.updateMany({
              where: {
                id,
                status: "IN_PROGRESS",
              },

              data: {
                status: "COMPLETED",
                completedAt: new Date(),
              },
            });

          if (tradeUpdate.count !== 1) {
            const error = new Error(
              "This trade has already been completed."
            );

            error.statusCode = 400;

            throw error;
          }

          /**
           * Mark listings as TRADED.
           */
          for (const item of trade.items) {
            await tx.listing.updateMany({
              where: {
                id: item.listingId,

                status: {
                  in: [
                    "RESERVED",
                    "ACTIVE",
                  ],
                },
              },

              data: {
                status: "TRADED",
              },
            });
          }

          /**
           * Increment Trader A.
           */
          await tx.user.update({
            where: {
              id: trade.traderAId,
            },

            data: {
              completedTrades: {
                increment: 1,
              },
            },
          });

          /**
           * Increment Trader B.
           */
          await tx.user.update({
            where: {
              id: trade.traderBId,
            },

            data: {
              completedTrades: {
                increment: 1,
              },
            },
          });

          /**
           * Return final trade.
           */
          return tx.trade.findUnique({
            where: {
              id,
            },

            include: {
              traderA: {
                select: {
                  id: true,
                  name: true,
                  email: true,
                  avatar: true,
                  barterScore: true,
                  completedTrades: true,
                },
              },

              traderB: {
                select: {
                  id: true,
                  name: true,
                  email: true,
                  avatar: true,
                  barterScore: true,
                  completedTrades: true,
                },
              },

              items: {
                include: {
                  listing: {
                    include: {
                      images: true,
                      category: true,
                    },
                  },
                },
              },
            },
          });
        }
      );

    /**
     * Notify both traders after successful commit.
     */
    const completionMessage =
      `Trade ${trade.tradeNumber} has been completed successfully.`;

    await createNotification({
      userId: trade.traderAId,
      type: "TRADE",
      title: "Trade Completed",
      message: completionMessage,
      referenceId: trade.id,
      referenceType: "TRADE",
    });

    await createNotification({
      userId: trade.traderBId,
      type: "TRADE",
      title: "Trade Completed",
      message: completionMessage,
      referenceId: trade.id,
      referenceType: "TRADE",
    });

    return res.status(200).json({
      success: true,

      message:
        "Trade completed successfully.",

      trade: completedTrade,
    });
  } catch (error) {
    console.error(
      "COMPLETE TRADE ERROR:",
      error
    );

    return res.status(
      error.statusCode || 500
    ).json({
      success: false,

      message:
        error.message ||
        "Failed to complete trade.",
    });
  }
};

