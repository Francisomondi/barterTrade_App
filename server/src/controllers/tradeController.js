
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
 * The database composite unique constraint:
 *
 * [tradeId, userId, stage]
 *
 * prevents the same trader from confirming the same stage twice.
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

  /*
   * Prevent duplicate confirmation by the same trader.
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

  /*
   * Create the confirmation.
   *
   * The database unique constraint provides the final
   * protection against duplicate confirmations.
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
    /*
     * Prisma unique constraint error.
     *
     * This can happen if two identical confirmation
     * requests arrive at almost exactly the same time.
     */
    if (error.code === "P2002") {
      const duplicateError = new Error(
        "You have already confirmed this stage."
      );

      duplicateError.statusCode = 400;

      throw duplicateError;
    }

    throw error;
  }

  /*
   * Fetch all confirmations for this stage.
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

    /*
     * Determine the confirmation stage from
     * the current trade status.
     */
    const stage =
      getConfirmationStageForStatus(
        trade.status
      );

    if (!stage) {
      return res.status(400).json({
        success: false,
        message:
          "This trade does not currently require confirmation.",
      });
    }

    /*
     * Record the confirmation.
     */
    const result = await confirmTradeStage(
      id,
      userId,
      stage
    );

    let updatedTrade = trade;

    /*
     * If both traders have confirmed,
     * advance the trade.
     */
    if (result.bothConfirmed) {
      let nextStatus = null;

      if (
        stage === CONFIRMATION_STAGES.AGREEMENT
      ) {
        nextStatus = "AGREED";
      }

      if (
        stage === CONFIRMATION_STAGES.VERIFICATION
      ) {
        nextStatus = "VERIFICATION";
      }

      if (
        stage === CONFIRMATION_STAGES.HANDOVER
      ) {
        nextStatus = "READY_FOR_HANDOVER";
      }

      if (nextStatus) {
        /*
         * Only update if the trade is still at the
         * status associated with this confirmation stage.
         *
         * This prevents an outdated confirmation request
         * from moving a trade incorrectly.
         */
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

        /*
         * If another request already advanced the trade,
         * simply load its current state.
         */
        if (statusUpdate.count === 1) {
          updatedTrade =
            await prisma.trade.findUnique({
              where: {
                id,
              },
            });
        } else {
          updatedTrade =
            await prisma.trade.findUnique({
              where: {
                id,
              },
            });
        }
      }
    }

    const otherTraderId =
      trade.traderAId === userId
        ? trade.traderBId
        : trade.traderAId;

    /*
     * Notify the other trader when only one trader
     * has confirmed.
     */
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

    /*
     * Once both traders confirm, notify BOTH traders.
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
export const updateTradeStatus = async (
  req,
  res
) => {
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
        message: "You are not a participant in this trade.",
      });
    }

    /*
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

    /*
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

    /*
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

    /*
     * Completion must use the dedicated endpoint.
     */
    if (status === "COMPLETED") {
      return res.status(400).json({
        success: false,
        message:
          "Use the complete trade endpoint to complete a trade.",
      });
    }

    /*
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

    /*
     * Atomically update the trade only if it is still
     * in the status we originally read.
     *
     * This prevents stale concurrent requests from
     * overwriting a newer trade state.
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

    /*
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
      /*
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
 * The status condition inside the transaction makes
 * completion concurrency-safe.
 */
export const completeTrade = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    /*
     * Get the trade first so we can verify ownership
     * and get the trade information for notifications.
     */
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

    /*
     * Only Trader A or Trader B can complete the trade.
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

    /*
     * Prevent completing an already completed trade.
     */
    if (trade.status === "COMPLETED") {
      return res.status(400).json({
        success: false,
        message:
          "This trade has already been completed.",
      });
    }

    /*
     * Only IN_PROGRESS trades can be completed.
     */
    if (trade.status !== "IN_PROGRESS") {
      return res.status(400).json({
        success: false,
        message:
          "Only trades in progress can be completed.",
      });
    }

    /*
     * Everything that changes because of completion
     * happens inside ONE transaction.
     */
    const completedTrade =
      await prisma.$transaction(
        async (tx) => {
          /*
           * Atomically change:
           *
           * IN_PROGRESS -> COMPLETED
           *
           * Only one concurrent request can update
           * this row successfully.
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

          /*
           * Another request completed the trade first.
           */
          if (tradeUpdate.count !== 1) {
            const error = new Error(
              "This trade has already been completed."
            );

            error.statusCode = 400;

            throw error;
          }

          /*
           * Mark all listings involved in this trade
           * as TRADED.
           */
          for (const item of trade.items) {
            await tx.listing.updateMany({
              where: {
                id: item.listingId,
                status: {
                  in: ["RESERVED", "ACTIVE"],
                },
              },

              data: {
                status: "TRADED",
              },
            });
          }

          /*
           * Increment Trader A's completed trade count.
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

          /*
           * Increment Trader B's completed trade count.
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

          /*
           * Return the final trade.
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

    /*
     * Notify BOTH traders only after the transaction
     * successfully commits.
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

