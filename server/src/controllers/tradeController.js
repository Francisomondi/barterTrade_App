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
const confirmTradeStage = async (tradeId,userId,stage) => {
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


export const confirmTrade = async (req, res) => {
  try {
    const { id: tradeId } = req.params;
    const userId = req.user?.id;

    /**
     * =======================================================
     * AUTHENTICATION
     * =======================================================
     */

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: "Authentication required.",
      });
    }

    /**
     * =======================================================
     * TRANSACTION
     * =======================================================
     */

    const result = await prisma.$transaction(
      async (tx) => {
        /**
         * ---------------------------------------------------
         * LOAD TRADE
         * ---------------------------------------------------
         */

        const trade =
          await tx.trade.findUnique({
            where: {
              id: tradeId,
            },

            select: {
              id: true,
              tradeNumber: true,
              status: true,

              traderAId: true,
              traderBId: true,

              traderAConfirmed: true,
              traderBConfirmed: true,

              traderAConfirmedAt: true,
              traderBConfirmedAt: true,

              dispute: {
                select: {
                  id: true,
                  status: true,
                },
              },
            },
          });

        if (!trade) {
          const error =
            new Error(
              "Trade not found."
            );

          error.statusCode = 404;

          throw error;
        }

        /**
         * ---------------------------------------------------
         * PARTICIPANT SECURITY
         * ---------------------------------------------------
         */

        const isTraderA =
          trade.traderAId === userId;

        const isTraderB =
          trade.traderBId === userId;

        if (
          !isTraderA &&
          !isTraderB
        ) {
          const error =
            new Error(
              "You are not a participant in this trade."
            );

          error.statusCode = 403;

          throw error;
        }

        /**
         * ---------------------------------------------------
         * DISPUTE SECURITY
         * ---------------------------------------------------
         *
         * A disputed trade must never accept a normal
         * confirmation.
         * ---------------------------------------------------
         */

        if (
          trade.status ===
          "DISPUTED"
        ) {
          const error =
            new Error(
              "This trade is currently under dispute. Confirmation is paused until the dispute is resolved."
            );

          error.statusCode = 409;

          throw error;
        }

        /**
         * ---------------------------------------------------
         * DETERMINE REQUIRED STAGE
         * ---------------------------------------------------
         */

        const stage =
          getConfirmationStageForStatus(
            trade.status
          );

        if (!stage) {
          const error =
            new Error(
              "This trade does not currently require confirmation."
            );

          error.statusCode = 400;

          throw error;
        }

        /**
         * ---------------------------------------------------
         * VERIFY REQUIRED VERIFICATION
         *
         * HANDOVER can only be confirmed after both traders
         * have successfully verified their items.
         * ---------------------------------------------------
         */

        if (
          trade.status ===
            "VERIFICATION" &&
          stage ===
            CONFIRMATION_STAGES.HANDOVER
        ) {
          const verifications =
            await tx.verification.findMany({
              where: {
                tradeId,

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
                verification.status ===
                  "VERIFIED"
            );

          const traderBVerified =
            verifications.some(
              (verification) =>
                verification.userId ===
                  trade.traderBId &&
                verification.status ===
                  "VERIFIED"
            );

          if (
            !traderAVerified ||
            !traderBVerified
          ) {
            const error =
              new Error(
                "Both traders must verify their items before handover readiness can be confirmed."
              );

            error.statusCode = 400;

            error.verification = {
              traderAVerified,
              traderBVerified,
            };

            throw error;
          }
        }

        /**
         * ---------------------------------------------------
         * PREVENT DUPLICATE CONFIRMATION
         * ---------------------------------------------------
         */

        const existingConfirmation =
          await tx.tradeConfirmation.findUnique({
            where: {
              tradeId_userId_stage: {
                tradeId,
                userId,
                stage,
              },
            },
          });

        if (existingConfirmation) {
          const error =
            new Error(
              "You have already confirmed this stage."
            );

          error.statusCode = 400;

          throw error;
        }

        /**
         * ---------------------------------------------------
         * CREATE CONFIRMATION
         * ---------------------------------------------------
         */

        let confirmation;

        try {
          confirmation =
            await tx.tradeConfirmation.create({
              data: {
                tradeId,
                userId,
                stage,
              },
            });
        } catch (error) {
          /**
           * Composite unique constraint:
           *
           * tradeId + userId + stage
           */

          if (
            error.code ===
            "P2002"
          ) {
            const duplicateError =
              new Error(
                "You have already confirmed this stage."
              );

            duplicateError.statusCode =
              400;

            throw duplicateError;
          }

          throw error;
        }

        /**
         * ---------------------------------------------------
         * CHECK BOTH TRADERS
         * ---------------------------------------------------
         */

        const confirmations =
          await tx.tradeConfirmation.findMany({
            where: {
              tradeId,

              stage,
            },

            select: {
              id: true,
              userId: true,
              confirmedAt: true,
            },

            orderBy: {
              confirmedAt:
                "asc",
            },
          });

        const traderAConfirmed =
          confirmations.some(
            (item) =>
              item.userId ===
              trade.traderAId
          );

        const traderBConfirmed =
          confirmations.some(
            (item) =>
              item.userId ===
              trade.traderBId
          );

        const bothConfirmed =
          traderAConfirmed &&
          traderBConfirmed;

        /**
         * ---------------------------------------------------
         * DETERMINE NEXT STATUS
         * ---------------------------------------------------
         */

        let nextStatus =
          trade.status;

        if (
          bothConfirmed
        ) {
          switch (stage) {
            case CONFIRMATION_STAGES.AGREEMENT:
              nextStatus =
                "AGREED";
              break;

            case CONFIRMATION_STAGES.VERIFICATION:
              nextStatus =
                "VERIFICATION";
              break;

            case CONFIRMATION_STAGES.HANDOVER:
              nextStatus =
                "READY_FOR_HANDOVER";
              break;

            case CONFIRMATION_STAGES.HANDOVER_STARTED:
              nextStatus =
                "IN_PROGRESS";
              break;

            case CONFIRMATION_STAGES.COMPLETION:
              nextStatus =
                "COMPLETED";
              break;

            default:
              nextStatus =
                trade.status;
          }
        }

        /**
         * ---------------------------------------------------
         * UPDATE TRADE WHEN BOTH CONFIRMED
         * ---------------------------------------------------
         */

        if (
          bothConfirmed &&
          nextStatus !==
            trade.status
        ) {
          const tradeUpdate =
            await tx.trade.updateMany({
              where: {
                id: tradeId,

                /**
                 * Optimistic concurrency protection.
                 */
                status:
                  trade.status,
              },

              data: {
                status:
                  nextStatus,

                /**
                 * Keep the legacy confirmation flags
                 * synchronized with the current stage.
                 *
                 * These flags are not the source of truth;
                 * TradeConfirmation records remain the
                 * authoritative stage history.
                 */

                ...(stage ===
                  CONFIRMATION_STAGES.AGREEMENT
                  ? {
                      traderAConfirmed:
                        traderAConfirmed,

                      traderBConfirmed:
                        traderBConfirmed,

                      traderAConfirmedAt:
                        traderAConfirmed
                          ? (
                              confirmations.find(
                                (item) =>
                                  item.userId ===
                                  trade.traderAId
                              )?.confirmedAt ||
                              null
                            )
                          : null,

                      traderBConfirmedAt:
                        traderBConfirmed
                          ? (
                              confirmations.find(
                                (item) =>
                                  item.userId ===
                                  trade.traderBId
                              )?.confirmedAt ||
                              null
                            )
                          : null,
                    }
                  : {}),

                /**
                 * COMPLETED is the only point where
                 * completedAt is populated.
                 */

                ...(stage ===
                  CONFIRMATION_STAGES.COMPLETION
                  ? {
                      completedAt:
                        new Date(),

                      traderAConfirmed:
                        traderAConfirmed,

                      traderBConfirmed:
                        traderBConfirmed,

                      traderAConfirmedAt:
                        traderAConfirmed
                          ? (
                              confirmations.find(
                                (item) =>
                                  item.userId ===
                                  trade.traderAId
                              )?.confirmedAt ||
                              null
                            )
                          : null,

                      traderBConfirmedAt:
                        traderBConfirmed
                          ? (
                              confirmations.find(
                                (item) =>
                                  item.userId ===
                                  trade.traderBId
                              )?.confirmedAt ||
                              null
                            )
                          : null,
                    }
                  : {}),
              },
            });

          if (
            tradeUpdate.count !==
            1
          ) {
            const error =
              new Error(
                "The trade changed while confirmation was being processed. Please refresh and try again."
              );

            error.statusCode =
              409;

            throw error;
          }
        }

        /**
         * ---------------------------------------------------
         * LOAD FINAL TRADE
         * ---------------------------------------------------
         *
         * This gives the frontend the latest status and
         * confirmation history immediately.
         * ---------------------------------------------------
         */

        const updatedTrade =
          await tx.trade.findUnique({
            where: {
              id: tradeId,
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
                  barterScore:
                    true,
                  completedTrades:
                    true,
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
                  barterScore:
                    true,
                  completedTrades:
                    true,
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
                  confirmedAt:
                    "asc",
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
                  createdAt:
                    "asc",
                },
              },

              ratings: true,

              dispute: true,
            },
          });

        /**
         * ---------------------------------------------------
         * RETURN TRANSACTION RESULT
         * ---------------------------------------------------
         */

        return {
          trade:
            updatedTrade,

          confirmation,

          stage,

          traderAConfirmed,

          traderBConfirmed,

          bothConfirmed,

          previousStatus:
            trade.status,

          newStatus:
            nextStatus,

          otherTraderId:
            isTraderA
              ? trade.traderBId
              : trade.traderAId,

          tradeNumber:
            trade.tradeNumber,
        };
      },

      {
        isolationLevel:
          "Serializable",
      }
    );

    /**
     * =======================================================
     * NOTIFICATIONS
     *
     * Notifications happen after the transaction commits.
     * A notification failure must not undo the confirmation.
     * =======================================================
     */

    if (
      !result.bothConfirmed
    ) {
      try {
        await createNotification({
          userId:
            result.otherTraderId,

          type: "TRADE",

          title:
            "Trade Confirmation Required",

          referenceId:
            result.trade.id,

          referenceType:
            "TRADE",

          message:
            `Your trade partner has confirmed the ${result.stage.toLowerCase().replace(/_/g, " ")} stage. Your confirmation is still required for Trade ${result.tradeNumber}.`,
        });
      } catch (notificationError) {
        console.error(
          "CONFIRMATION NOTIFICATION ERROR:",
          notificationError
        );
      }
    }

    /**
     * =======================================================
     * BOTH CONFIRMED
     * =======================================================
     */

    if (
      result.bothConfirmed
    ) {
      const message =
        `Both traders confirmed the ${result.stage.toLowerCase().replace(/_/g, " ")} stage. Trade ${result.tradeNumber} is now ${result.newStatus}.`;

      const notificationResults =
        await Promise.allSettled([
          createNotification({
            userId:
              result.trade
                .traderAId,

            type: "TRADE",

            title:
              "Trade Stage Confirmed",

            referenceId:
              result.trade.id,

            referenceType:
              "TRADE",

            message,
          }),

          createNotification({
            userId:
              result.trade
                .traderBId,

            type: "TRADE",

            title:
              "Trade Stage Confirmed",

            referenceId:
              result.trade.id,

            referenceType:
              "TRADE",

            message,
          }),
        ]);

      notificationResults.forEach(
        (notificationResult) => {
          if (
            notificationResult.status ===
            "rejected"
          ) {
            console.error(
              "TRADE STAGE NOTIFICATION ERROR:",
              notificationResult.reason
            );
          }
        }
      );
    }

    /**
     * =======================================================
     * RESPONSE
     * =======================================================
     */

    return res.status(200).json({
      success: true,

      message:
        result.bothConfirmed
          ? `Both traders confirmed. Trade moved to ${result.newStatus}.`
          : `Your ${result.stage.toLowerCase().replace(/_/g, " ")} confirmation has been recorded. Waiting for the other trader.`,

      trade:
        result.trade,

      stage:
        result.stage,

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


export const updateTradeStatus = async (req, res) => {
  try {
    const { id: tradeId } = req.params;
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