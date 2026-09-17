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
  COMPLETION: "COMPLETION",
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

    case "IN_PROGRESS":
      return CONFIRMATION_STAGES.COMPLETION;

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

        verifications: {
          select: {
            id: true,
            userId: true,
            tradeId: true,
            type: true,
            status: true,
            documentUrl: true,
            notes: true,
            createdAt: true,
            updatedAt: true,
          },

          orderBy: {
            createdAt: "asc",
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

  /*
   * Check whether this trader has already confirmed
   * this stage.
   *
   * IMPORTANT:
   * This is idempotent.
   *
   * A repeated request does NOT produce an error.
   * We simply reuse the existing confirmation.
   */
  let confirmation =
    await prisma.tradeConfirmation.findUnique({
      where: {
        tradeId_userId_stage: {
          tradeId,
          userId,
          stage,
        },
      },
    });

  if (!confirmation) {
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
       * Another identical request may have inserted
       * the confirmation first.
       *
       * Re-read it instead of returning an error.
       */
      if (error.code === "P2002") {
        confirmation =
          await prisma.tradeConfirmation.findUnique({
            where: {
              tradeId_userId_stage: {
                tradeId,
                userId,
                stage,
              },
            },
          });

        if (!confirmation) {
          throw error;
        }
      } else {
        throw error;
      }
    }
  }

  /*
   * Get every confirmation for the current stage.
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
      (item) =>
        item.userId === trade.traderAId
    );

  const traderBConfirmed =
    confirmations.some(
      (item) =>
        item.userId === trade.traderBId
    );

  const bothConfirmed =
    traderAConfirmed &&
    traderBConfirmed;

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
 * At VERIFICATION:
 *   - current trader's item is marked VERIFIED
 *   - current trader's HANDOVER confirmation is recorded
 *   - both traders must complete this before
 *     READY_FOR_HANDOVER
 *
 * At READY_FOR_HANDOVER:
 *   - both traders must confirm HANDOVER_STARTED
 *   - then trade becomes IN_PROGRESS
 *
 * At IN_PROGRESS:
 *   - both traders must confirm COMPLETION
 *   - then trade becomes COMPLETED
 */
export const confirmTrade = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    /*
     * Get the current trade.
     *
     * Trade items are loaded here because completion
     * must mark the actual listing records as TRADED.
     */
    const trade = await prisma.trade.findUnique({
      where: {
        id,
      },

      include: {
        items: {
          select: {
            listingId: true,
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
     * Only Trader A or Trader B can confirm.
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
     * Determine the stage from the current
     * trade status.
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
     * =========================================================
     * VERIFICATION + HANDOVER READINESS
     * =========================================================
     *
     * At VERIFICATION, one click does two things:
     *
     * 1. The current trader's item is marked VERIFIED.
     * 2. The current trader's HANDOVER readiness is recorded
     *    by confirmTradeStage() immediately below.
     *
     * The trade moves to READY_FOR_HANDOVER only after both
     * traders have completed this action.
     */
    if (
      trade.status === "VERIFICATION" &&
      stage === CONFIRMATION_STAGES.HANDOVER
    ) {
      let currentVerification =
        await prisma.verification.findFirst({
          where: {
            tradeId: id,
            userId,
          },
        });

      /*
       * Create verification if it does not exist.
       */
      if (!currentVerification) {
        currentVerification =
          await prisma.verification.create({
            data: {
              tradeId: id,
              userId,
              type: "ITEM",
              status: "VERIFIED",
              notes:
                "Item verified by trader before handover.",
            },
          });
      } else if (
        currentVerification.status !== "VERIFIED"
      ) {
        /*
         * Update the trader's existing verification.
         */
        currentVerification =
          await prisma.verification.update({
            where: {
              id: currentVerification.id,
            },

            data: {
              status: "VERIFIED",
              notes:
                "Item verified by trader before handover.",
            },
          });
      }

      /*
       * IMPORTANT:
       *
       * Do NOT return here.
       *
       * confirmTradeStage() below must record the
       * current trader's HANDOVER confirmation.
       */
    }

    /*
     * =========================================================
     * RECORD CONFIRMATION
     * =========================================================
     */
    const result =
      await confirmTradeStage(
        id,
        userId,
        stage
      );

    /*
     * Always declare updatedTrade before any
     * branch can use it.
     */
    let updatedTrade = trade;

    /*
     * =========================================================
     * ONE TRADER ONLY
     * =========================================================
     */
    if (!result.bothConfirmed) {
      const otherTraderId =
        trade.traderAId === userId
          ? trade.traderBId
          : trade.traderAId;

      let stageName =
        stage.toLowerCase();

      if (
        stage ===
        CONFIRMATION_STAGES.HANDOVER
      ) {
        stageName =
          "item verification and handover readiness";
      }

      if (
        stage ===
        CONFIRMATION_STAGES.HANDOVER_STARTED
      ) {
        stageName = "handover started";
      }

      if (
        stage ===
        CONFIRMATION_STAGES.COMPLETION
      ) {
        stageName = "completion";
      }

      await createNotification({
        userId: otherTraderId,
        type: "TRADE",
        title:
          "Trade Confirmation Required",
        referenceId: trade.id,
        referenceType: "TRADE",
        message:
          `Your trade partner has confirmed the ${stageName} stage. Your confirmation is still required for Trade ${trade.tradeNumber}.`,
      });

      /*
       * Return the latest trade, including
       * confirmations and verifications.
       */
      updatedTrade =
        await prisma.trade.findUnique({
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

            verifications: {
              select: {
                id: true,
                userId: true,
                tradeId: true,
                type: true,
                status: true,
                documentUrl: true,
                notes: true,
                createdAt: true,
                updatedAt: true,
              },

              orderBy: {
                createdAt: "asc",
              },
            },
          },
        });

      return res.status(200).json({
        success: true,

        message:
          `Your ${stageName} confirmation has been recorded. Waiting for the other trader.`,

        trade: updatedTrade,

        stage,

        traderAConfirmed:
          result.traderAConfirmed,

        traderBConfirmed:
          result.traderBConfirmed,

        bothConfirmed: false,
      });
    }

    /*
     * =========================================================
     * BOTH TRADERS HAVE CONFIRMED
     * =========================================================
     */

    /*
     * COMPLETION IS SPECIAL.
     *
     * IN_PROGRESS
     *      ↓
     * BOTH COMPLETION CONFIRMATIONS
     *      ↓
     * COMPLETED
     */
    if (
      stage ===
      CONFIRMATION_STAGES.COMPLETION
    ) {
      const completedTrade =
        await prisma.$transaction(
          async (tx) => {
            /*
             * Atomically move the trade to COMPLETED.
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
             * Protect against concurrent completion.
             */
            if (
              tradeUpdate.count !== 1
            ) {
              const error =
                new Error(
                  "The trade was updated by another request. Please refresh and try again."
                );

              error.statusCode =
                409;

              throw error;
            }

            /*
             * Mark all trade listings as TRADED.
             */
            for (const item of trade.items ??
              []) {
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

            /*
             * Increment Trader A completed trades.
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
             * Increment Trader B completed trades.
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
             * Return the complete updated trade.
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

                verifications: {
                  select: {
                    id: true,
                    userId: true,
                    tradeId: true,
                    type: true,
                    status: true,
                    documentUrl: true,
                    notes: true,
                    createdAt: true,
                    updatedAt: true,
                  },

                  orderBy: {
                    createdAt: "asc",
                  },
                },

                ratings: true,

                dispute: true,
              },
            });
          }
        );

      const completionMessage =
        `Both traders have confirmed completion. Trade ${trade.tradeNumber} is now completed.`;

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
          "Both traders confirmed completion. Trade completed successfully.",

        trade: completedTrade,

        stage,

        traderAConfirmed: true,
        traderBConfirmed: true,
        bothConfirmed: true,
      });
    }

    /*
     * =========================================================
     * NORMAL TWO-PARTY TRANSITIONS
     * =========================================================
     */
    let nextStatus = null;

    /*
     * PENDING
     *   ↓
     * AGREED
     */
    if (
      stage ===
      CONFIRMATION_STAGES.AGREEMENT
    ) {
      nextStatus = "AGREED";
    }

    /*
     * AGREED
     *   ↓
     * VERIFICATION
     */
    if (
      stage ===
      CONFIRMATION_STAGES.VERIFICATION
    ) {
      nextStatus = "VERIFICATION";
    }

    /*
     * VERIFICATION
     *   ↓
     * READY_FOR_HANDOVER
     */
    if (
      stage ===
      CONFIRMATION_STAGES.HANDOVER
    ) {
      nextStatus =
        "READY_FOR_HANDOVER";
    }

    /*
     * READY_FOR_HANDOVER
     *   ↓
     * IN_PROGRESS
     */
    if (
      stage ===
      CONFIRMATION_STAGES.HANDOVER_STARTED
    ) {
      nextStatus = "IN_PROGRESS";
    }

    /*
     * Atomically update the status.
     */
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

      if (
        statusUpdate.count !== 1
      ) {
        return res.status(409).json({
          success: false,
          message:
            "The trade was updated by another request. Please refresh and try again.",
        });
      }
    }

    /*
     * Load the final updated trade including
     * confirmations and verifications.
     */
    updatedTrade =
      await prisma.trade.findUnique({
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

          verifications: {
            select: {
              id: true,
              userId: true,
              tradeId: true,
              type: true,
              status: true,
              documentUrl: true,
              notes: true,
              createdAt: true,
              updatedAt: true,
            },

            orderBy: {
              createdAt: "asc",
            },
          },

          ratings: true,

          dispute: true,
        },
      });

    /*
     * Notify both traders.
     */
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

    return res.status(200).json({
      success: true,

      message:
        `Both traders confirmed. Trade moved to ${updatedTrade.status}.`,

      trade: updatedTrade,

      stage,

      traderAConfirmed:
        result.traderAConfirmed,

      traderBConfirmed:
        result.traderBConfirmed,

      bothConfirmed: true,
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
     * =========================================================
     * SECURITY GATE:
     *
     * READY_FOR_HANDOVER
     *        ↓
     * IN_PROGRESS
     *
     * must use HANDOVER_STARTED confirmations.
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

    /*
     * =========================================================
     * SECURITY GATE:
     *
     * Completion must use confirmTrade().
     * =========================================================
     */
    if (
      trade.status === "IN_PROGRESS" &&
      status === "COMPLETED"
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Both traders must confirm completion before the trade can be completed.",
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

          verifications: {
            select: {
              id: true,
              userId: true,
              tradeId: true,
              type: true,
              status: true,
              documentUrl: true,
              notes: true,
              createdAt: true,
              updatedAt: true,
            },

            orderBy: {
              createdAt: "asc",
            },
          },

          ratings: true,

          dispute: true,
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
 * Completion is controlled by the two-party
 * confirmation system.
 */
export const completeTrade = async (req, res) => {
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
        message:
          "You are not a participant in this trade.",
      });
    }

    /*
     * Completion is now controlled by
     * the two-party confirmation system.
     */
    if (trade.status === "IN_PROGRESS") {
      return res.status(400).json({
        success: false,

        message:
          "Both traders must confirm completion before the trade can be completed. Use the trade confirmation action.",
      });
    }

    if (trade.status === "COMPLETED") {
      return res.status(400).json({
        success: false,
        message:
          "This trade has already been completed.",
      });
    }

    return res.status(400).json({
      success: false,

      message:
        "This trade cannot be completed at its current stage.",
    });
  } catch (error) {
    console.error(
      "COMPLETE TRADE ERROR:",
      error
    );

    return res.status(500).json({
      success: false,

      message:
        "Failed to complete trade.",
    });
  }
};