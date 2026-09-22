
import prisma from "../config/prisma.js";

import { createNotification } from "../services/notificationService.js";

/**
 * =========================================================
 * DISPUTE CONTROLLER
 * =========================================================
 *
 * Features:
 *
 * 1. Trader dispute creation
 * 2. Trader dispute retrieval
 * 3. Admin dispute queue
 * 4. Admin dispute status updates
 * 5. Admin dispute outcomes
 * 6. Trade recovery after dispute
 * 7. Confirmation recovery
 * 8. Verification recovery
 * 9. Listing state recovery
 * 10. Dispute audit trail
 * 11. Trader/admin dispute event history
 *
 * Trade lifecycle:
 *
 * VERIFICATION
 * READY_FOR_HANDOVER
 * IN_PROGRESS
 *
 * can enter:
 *
 * DISPUTED
 *
 * Admin outcomes:
 *
 * CANCEL_TRADE
 * REOPEN_TRADE
 */

/**
 * =========================================================
 * DISPUTABLE TRADE STATUSES
 * =========================================================
 */

const disputableStatuses = [
  "VERIFICATION",
  "READY_FOR_HANDOVER",
  "IN_PROGRESS",
];

/**
 * =========================================================
 * VALID DISPUTE STATUSES
 * =========================================================
 */

const validDisputeStatuses = [
  "OPEN",
  "UNDER_REVIEW",
  "RESOLVED",
  "CLOSED",
];

/**
 * =========================================================
 * VALID DISPUTE OUTCOMES
 * =========================================================
 */

const validDisputeOutcomes = [
  "CANCEL_TRADE",
  "REOPEN_TRADE",
];

/**
 * =========================================================
 * REOPENABLE TRADE STATUSES
 * =========================================================
 */

const reopenableTradeStatuses = [
  "VERIFICATION",
  "READY_FOR_HANDOVER",
  "IN_PROGRESS",
];

/**
 * =========================================================
 * CREATE DISPUTE
 *
 * POST /api/disputes/trades/:tradeId
 *
 * A trader may raise a dispute only while the trade is in:
 *
 * VERIFICATION
 * READY_FOR_HANDOVER
 * IN_PROGRESS
 *
 * Creating a dispute atomically:
 *
 * 1. Creates the dispute.
 * 2. Saves previousTradeStatus.
 * 3. Changes trade status to DISPUTED.
 * 4. Creates an audit event.
 * =========================================================
 */

export const createDispute = async (req, res) => {
  try {
    const { tradeId } = req.params;
    const userId = req.user?.id;

    /**
     * Never accept userId from req.body.
     * The authenticated user is always the dispute reporter.
     */
    const reason =
      typeof req.body?.reason === "string"
        ? req.body.reason.trim()
        : "";

    const description =
      typeof req.body?.description === "string"
        ? req.body.description.trim()
        : "";

    /* ==========================================
       AUTHENTICATION
    ========================================== */

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: "Authentication required.",
      });
    }

    /* ==========================================
       BASIC VALIDATION
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
            outcome: true,
            previousTradeStatus: true,
            resolution: true,
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
       PARTICIPANT SECURITY
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
       TRADE STATUS SECURITY
    ========================================== */

    if (!disputableStatuses.includes(trade.status)) {
      return res.status(400).json({
        success: false,
        message:
          "A dispute can only be raised during verification, handover readiness, or an active handover.",
      });
    }

    /* ==========================================
       ACTIVE / RE-DISPUTE GUARD
    ========================================== */

    if (trade.dispute) {
      const previousDispute = trade.dispute;

      /**
       * Current architecture allows one dispute per trade.
       *
       * Therefore:
       *
       * OPEN
       * UNDER_REVIEW
       * RESOLVED
       * CLOSED
       *
       * all block creation of another dispute.
       */

      if (
        previousDispute.status === "OPEN" ||
        previousDispute.status === "UNDER_REVIEW"
      ) {
        return res.status(409).json({
          success: false,
          message:
            "This trade already has an active dispute.",
          dispute: previousDispute,
        });
      }

      if (
        previousDispute.status === "RESOLVED" ||
        previousDispute.status === "CLOSED"
      ) {
        return res.status(409).json({
          success: false,
          message:
            "This trade already has a resolved dispute. A second dispute cannot be opened for this trade under the current dispute policy.",
          dispute: previousDispute,
        });
      }

      return res.status(409).json({
        success: false,
        message:
          "This trade already has a dispute.",
        dispute: previousDispute,
      });
    }

    /* ==========================================
       DETERMINE OTHER TRADER
    ========================================== */

    const otherTraderId = isTraderA
      ? trade.traderBId
      : trade.traderAId;

    /* ==========================================
       ATOMIC CREATE + STATUS CHANGE
    ========================================== */

    let result;

    try {
      result = await prisma.$transaction(
        async (tx) => {
          /**
           * Re-read the trade inside the transaction.
           *
           * This protects against a stale trade read
           * between the initial request and transaction.
           */
          const currentTrade =
            await tx.trade.findUnique({
              where: {
                id: trade.id,
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

          if (!currentTrade) {
            const error = new Error(
              "Trade no longer exists."
            );

            error.statusCode = 404;

            throw error;
          }

          /**
           * Re-check participant ownership inside
           * the transaction.
           */
          const stillParticipant =
            currentTrade.traderAId === userId ||
            currentTrade.traderBId === userId;

          if (!stillParticipant) {
            const error = new Error(
              "You are not a participant in this trade."
            );

            error.statusCode = 403;

            throw error;
          }

          /**
           * Re-check trade stage inside the transaction.
           */
          if (
            !disputableStatuses.includes(
              currentTrade.status
            )
          ) {
            const error = new Error(
              "This trade is no longer in a disputable stage."
            );

            error.statusCode = 409;

            throw error;
          }

          /**
           * Final re-dispute guard.
           *
           * This catches a dispute created by another
           * request after the original read.
           */
          if (currentTrade.dispute) {
            const error = new Error(
              "This trade already has a dispute."
            );

            error.statusCode = 409;

            throw error;
          }

          /**
           * Create the dispute.
           */
          const createdDispute = await tx.dispute.create({
              data: {
                tradeId: currentTrade.id,
                userId,

                reason,
                description,

                previousTradeStatus:
                  currentTrade.status,

                status: "OPEN",
              },
            });

          /**
           * Critical audit event must use tx so that
           * the audit entry rolls back if the transaction
           * fails.
           */
          await tx.disputeEvent.create({
            data: {
              disputeId: createdDispute.id,
              userId,
              eventType: "DISPUTE_CREATED",

              description:
                "Trader opened a dispute for this trade.",

              metadata: {
                tradeId: currentTrade.id,
                tradeNumber:
                  currentTrade.tradeNumber,

                previousTradeStatus:
                  currentTrade.status,

                reason,
              },
            },
          });

          /**
           * Move trade into DISPUTED only if it has not
           * changed since our transaction started.
           */
          const updatedTrade =
            await tx.trade.updateMany({
              where: {
                id: currentTrade.id,
                status: currentTrade.status,
              },

              data: {
                status: "DISPUTED",
              },
            });

          if (updatedTrade.count !== 1) {
            const error = new Error(
              "Trade status changed before the dispute could be created."
            );

            error.statusCode = 409;

            throw error;
          }

          return {
            dispute: createdDispute,

            trade: {
              id: currentTrade.id,
              tradeNumber:
                currentTrade.tradeNumber,
              status: "DISPUTED",

              traderAId:
                currentTrade.traderAId,
              traderBId:
                currentTrade.traderBId,
            },
          };
        },

        {
          isolationLevel: "Serializable",
        }
      );
    } catch (error) {
      /**
       * Prisma unique constraint:
       * Dispute.tradeId is unique.
       *
       * This is another protection against two
       * simultaneous dispute requests.
       */
      if (error.code === "P2002") {
        return res.status(409).json({
          success: false,
          message:
            "This trade already has a dispute. A second dispute cannot be created.",
        });
      }

      if (error.statusCode) {
        return res
          .status(error.statusCode)
          .json({
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

        referenceId: result.trade.id,

        referenceType: "TRADE",

        message:
          `A dispute has been raised for Trade ${result.trade.tradeNumber}. Further trade progress has been paused while the dispute is reviewed.`,
      });
    } catch (notificationError) {
      /**
       * The dispute was already committed successfully.
       * Notification failure must not undo the dispute.
       */
      console.error(
        "CREATE DISPUTE NOTIFICATION ERROR:",
        notificationError
      );
    }

    /* ==========================================
       RESPONSE
    ========================================== */

    return res.status(201).json({
      success: true,

      message:
        "Dispute submitted successfully. This trade is now under dispute.",

      dispute: result.dispute,

      trade: result.trade,
    });
  } catch (error) {
    console.error(
      "CREATE DISPUTE ERROR:",
      error
    );

    return res.status(
      error.statusCode || 500
    ).json({
      success: false,
      message:
        error.message ||
        "Unable to create trade dispute.",
    });
  }
};

/**
 * =========================================================
 * GET TRADE DISPUTE
 *
 * GET /api/disputes/trades/:tradeId
 *
 * Only trade participants can view the dispute.
 * =========================================================
 */

export const getTradeDispute = async (
  req,
  res
) => {
  try {
    const { tradeId } =
      req.params;

    const userId =
      req.user.id;

    const trade =
      await prisma.trade.findUnique({
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
        message:
          "Trade not found.",
      });
    }

    const isParticipant =
      trade.traderAId ===
        userId ||
      trade.traderBId ===
        userId;

    if (!isParticipant) {
      return res.status(403).json({
        success: false,
        message:
          "You are not a participant in this trade.",
      });
    }

    return res.status(200).json({
      success: true,

      dispute:
        trade.dispute ||
        null,
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


export const getAdminDisputes =
  async (req, res) => {
    try {
      /**
       * -----------------------------------------------
       * AUTHENTICATION
       * -----------------------------------------------
       */

      if (!req.user) {
        return res.status(401).json({
          success: false,
          message:
            "Authentication required.",
        });
      }

      /**
       * -----------------------------------------------
       * ADMIN SECURITY
       * -----------------------------------------------
       */

      if (
        req.user.role !==
        "ADMIN"
      ) {
        return res.status(403).json({
          success: false,
          message:
            "Administrator access required.",
        });
      }

      const { status } =
        req.query;

      /**
       * -----------------------------------------------
       * STATUS VALIDATION
       * -----------------------------------------------
       */

      if (
        status &&
        !validDisputeStatuses.includes(
          status
        )
      ) {
        return res.status(400).json({
          success: false,
          message:
            "Invalid dispute status.",
        });
      }

      /**
       * -----------------------------------------------
       * LOAD DISPUTES
       * -----------------------------------------------
       */

      const disputes =
        await prisma.dispute.findMany(
          {
            where: status
              ? {
                  status,
                }
              : undefined,

            include: {
              user: {
                select: {
                  id: true,
                  name: true,
                  email: true,
                  phone: true,
                  avatar: true,
                },
              },

              events: {
                orderBy: {
                  createdAt:
                    "asc",
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
              },

              trade: {
                select: {
                  id: true,

                  tradeNumber:
                    true,

                  status: true,

                  createdAt:
                    true,

                  updatedAt:
                    true,

                  traderA: {
                    select: {
                      id: true,
                      name: true,
                      email: true,
                      phone: true,
                      avatar: true,
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
                      phone: true,
                      avatar: true,
                      barterScore:
                        true,
                      completedTrades:
                        true,
                    },
                  },

                  offer: {
                    select: {
                      id: true,

                      offeredListing: {
                        select: {
                          id: true,
                          title: true,
                          estimatedValue:
                            true,
                          condition: true,
                        },
                      },

                      requestedListing: {
                        select: {
                          id: true,
                          title: true,
                          estimatedValue:
                            true,
                          condition: true,
                        },
                      },
                    },
                  },

                  items: {
                    select: {
                      id: true,

                      listing: {
                        select: {
                          id: true,
                          title: true,
                          estimatedValue:
                            true,
                          condition: true,
                        },
                      },
                    },
                  },
                },
              },
            },

            orderBy: [
              {
                status:
                  "asc",
              },

              {
                createdAt:
                  "desc",
              },
            ],
          }
        );

      return res.status(200).json({
        success: true,

        disputes,

        total:
          disputes.length,
      });
    } catch (error) {
      console.error(
        "GET ADMIN DISPUTES ERROR:",
        error
      );

      return res.status(500).json({
        success: false,

        message:
          "Unable to load disputes.",
      });
    }
  };

/**
 * =========================================================
 * UPDATE DISPUTE — ADMIN
 *
 * PATCH /api/disputes/admin/:disputeId
 *
 * Allowed workflow:
 *
 * OPEN
 *   ↓
 * UNDER_REVIEW
 *
 * UNDER_REVIEW
 *   ↓
 * no direct RESOLVED/CLOSED here
 *
 * RESOLVED
 *   ↓
 * CLOSED
 *
 * Final trade outcome MUST use:
 *
 * PATCH /api/disputes/admin/:disputeId/outcome
 * =========================================================
 */

export const updateDispute =
  async (req, res) => {
    try {
      /**
       * -----------------------------------------------
       * AUTHENTICATION
       * -----------------------------------------------
       */

      if (!req.user) {
        return res.status(401).json({
          success: false,
          message:
            "Authentication required.",
        });
      }

      /**
       * -----------------------------------------------
       * ADMIN SECURITY
       * -----------------------------------------------
       */

      if (
        req.user.role !==
        "ADMIN"
      ) {
        return res.status(403).json({
          success: false,
          message:
            "Administrator access required.",
        });
      }

      const {
        disputeId,
      } = req.params;

      const status =
        typeof req.body?.status ===
        "string"
          ? req.body.status.trim()
          : "";

      const resolution =
        typeof req.body?.resolution ===
        "string"
          ? req.body.resolution.trim()
          : "";

      /**
       * -----------------------------------------------
       * STATUS VALIDATION
       * -----------------------------------------------
       */

      if (
        !validDisputeStatuses.includes(
          status
        )
      ) {
        return res.status(400).json({
          success: false,
          message:
            "Invalid dispute status.",
        });
      }

      /**
       * -----------------------------------------------
       * RESOLUTION VALIDATION
       * -----------------------------------------------
       */

      if (
        resolution.length > 5000
      ) {
        return res.status(400).json({
          success: false,
          message:
            "Resolution cannot exceed 5000 characters.",
        });
      }

      /**
       * IMPORTANT:
       *
       * UNDER_REVIEW → RESOLVED
       *
       * is intentionally blocked.
       *
       * The final resolution must happen
       * through applyDisputeOutcome().
       */

      if (
        ["RESOLVED", "CLOSED"].includes(
          status
        ) &&
        !resolution
      ) {
        return res.status(400).json({
          success: false,
          message:
            "A resolution is required before resolving or closing a dispute.",
        });
      }

      /**
       * -----------------------------------------------
       * LOAD DISPUTE
       * -----------------------------------------------
       */

      const dispute =
        await prisma.dispute.findUnique(
          {
            where: {
              id: disputeId,
            },

            include: {
              trade: {
                select: {
                  id: true,

                  tradeNumber:
                    true,

                  status: true,

                  traderAId:
                    true,

                  traderBId:
                    true,

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
              },
            },
          }
        );

      if (!dispute) {
        return res.status(404).json({
          success: false,
          message:
            "Dispute not found.",
        });
      }

      /**
       * -----------------------------------------------
       * STATUS TRANSITIONS
       * -----------------------------------------------
       */

      const allowedTransitions = {
        OPEN: [
          "UNDER_REVIEW",
        ],

        UNDER_REVIEW: [],

        RESOLVED: [
          "CLOSED",
        ],

        CLOSED: [],
      };

      if (
        dispute.status !==
          status &&
        !allowedTransitions[
          dispute.status
        ]?.includes(status)
      ) {
        return res.status(400).json({
          success: false,

          message:
            `Dispute cannot move from ${dispute.status} to ${status}.`,
        });
      }

      /**
       * -----------------------------------------------
       * KEEP EXISTING RESOLUTION
       * -----------------------------------------------
       */

      const finalResolution =
        resolution ||
        dispute.resolution ||
        null;

      /**
       * -----------------------------------------------
       * ATOMIC STATUS UPDATE + AUDIT EVENT
       * -----------------------------------------------
       */

      const updatedDispute =
        await prisma.$transaction(
          async (tx) => {
            const updated =
              await tx.dispute.update({
                where: {
                  id: disputeId,
                },

                data: {
                  status,

                  resolution:
                    finalResolution,
                },

                include: {
                  user: {
                    select: {
                      id: true,
                      name: true,
                      email: true,
                      avatar: true,
                    },
                  },

                  trade: {
                    select: {
                      id: true,

                      tradeNumber:
                        true,

                      status:
                        true,
                    },
                  },
                },
              });

            /**
             * -----------------------------------------
             * AUDIT EVENT
             * -----------------------------------------
             */

            if (
              dispute.status !==
              status
            ) {
              await tx.disputeEvent.create({
                data: {
                  disputeId:
                    dispute.id,

                  userId:
                    req.user.id,

                  eventType:
                    `STATUS_CHANGED_${status}`,

                  description:
                    `Administrator changed dispute status from ${dispute.status} to ${status}.`,

                  metadata: {
                    previousStatus:
                      dispute.status,

                    newStatus:
                      status,

                    resolution:
                      finalResolution,
                  },
                },
              });
            }

            return updated;
          }
        );

      /**
       * -----------------------------------------------
       * NOTIFY BOTH TRADERS
       * -----------------------------------------------
       */

      const notificationMessage =
        finalResolution
          ? `Dispute ${dispute.status} → ${status}. Resolution: ${finalResolution}`
          : `The dispute for Trade ${dispute.trade.tradeNumber} is now ${status}.`;

      const notificationResults =
        await Promise.allSettled([
          createNotification({
            userId:
              dispute.trade
                .traderAId,

            type: "DISPUTE",

            title:
              "Trade Dispute Updated",

            referenceId:
              dispute.trade.id,

            referenceType:
              "TRADE",

            message:
              notificationMessage,
          }),

          createNotification({
            userId:
              dispute.trade
                .traderBId,

            type: "DISPUTE",

            title:
              "Trade Dispute Updated",

            referenceId:
              dispute.trade.id,

            referenceType:
              "TRADE",

            message:
              notificationMessage,
          }),
        ]);

      notificationResults.forEach(
        (notificationResult) => {
          if (
            notificationResult.status ===
            "rejected"
          ) {
            console.error(
              "ADMIN DISPUTE NOTIFICATION ERROR:",
              notificationResult.reason
            );
          }
        }
      );

      return res.status(200).json({
        success: true,

        message:
          `Dispute updated to ${status}.`,

        dispute:
          updatedDispute,
      });
    } catch (error) {
      console.error(
        "UPDATE DISPUTE ERROR:",
        error
      );

      return res.status(
        error.statusCode || 500
      ).json({
        success: false,

        message:
          error.message ||
          "Unable to update dispute.",
      });
    }
  };

/**
 * =========================================================
 * APPLY ADMIN DISPUTE OUTCOME
 *
 * PATCH /api/disputes/admin/:disputeId/outcome
 *
 * Outcomes:
 *
 * CANCEL_TRADE
 * REOPEN_TRADE
 *
 * This endpoint performs the complete state recovery.
 * =========================================================
 */

export const applyDisputeOutcome = async (req, res) => {
  try {
    /**
     * =======================================================
     * AUTHENTICATION + ADMIN SECURITY
     * =======================================================
     */

    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: "Authentication required.",
      });
    }

    if (req.user.role !== "ADMIN") {
      return res.status(403).json({
        success: false,
        message: "Administrator access is required.",
      });
    }

    const { disputeId } = req.params;

    const adminId = req.user.id;

    /**
     * =======================================================
     * REQUEST DATA
     * =======================================================
     */

    const {
      outcome,
      resolution,
    } = req.body || {};

    /**
     * =======================================================
     * VALIDATE OUTCOME
     * =======================================================
     */

    if (!validDisputeOutcomes.includes(outcome)) {
      return res.status(400).json({
        success: false,
        message:
          "Invalid dispute outcome. Use CANCEL_TRADE or REOPEN_TRADE.",
      });
    }

    /**
     * =======================================================
     * VALIDATE RESOLUTION
     * =======================================================
     */

    const trimmedResolution =
      typeof resolution === "string"
        ? resolution.trim()
        : "";

    if (!trimmedResolution) {
      return res.status(400).json({
        success: false,
        message:
          "A resolution is required before applying a dispute outcome.",
      });
    }

    if (trimmedResolution.length > 5000) {
      return res.status(400).json({
        success: false,
        message:
          "Resolution cannot exceed 5000 characters.",
      });
    }

    /**
     * =======================================================
     * TRANSACTION
     *
     * All trade-state changes happen together.
     *
     * If ANY operation fails:
     *
     * - trade status rolls back
     * - listing changes roll back
     * - confirmation changes roll back
     * - verification changes roll back
     * - dispute outcome rolls back
     * - audit event rolls back
     * =======================================================
     */

    const result = await prisma.$transaction(
      async (tx) => {
        /**
         * ===================================================
         * LOAD DISPUTE + TRADE
         * ===================================================
         */

        const dispute =
          await tx.dispute.findUnique({
            where: {
              id: disputeId,
            },

            include: {
              trade: {
                include: {
                  items: {
                    select: {
                      listingId: true,
                    },
                  },
                },
              },
            },
          });

        /**
         * ===================================================
         * DISPUTE EXISTS
         * ===================================================
         */

        if (!dispute) {
          const error = new Error(
            "Dispute not found."
          );

          error.statusCode = 404;

          throw error;
        }

        /**
         * ===================================================
         * DISPUTE MUST BE UNDER REVIEW
         * ===================================================
         */

        if (
          dispute.status !==
          "UNDER_REVIEW"
        ) {
          const error = new Error(
            "The dispute must be under review before an outcome can be applied."
          );

          error.statusCode = 400;

          throw error;
        }

        /**
         * ===================================================
         * TRADE MUST STILL BE DISPUTED
         * ===================================================
         */

        if (
          dispute.trade.status !==
          "DISPUTED"
        ) {
          const error = new Error(
            "This trade is no longer in dispute."
          );

          error.statusCode = 409;

          throw error;
        }

        /**
         * ===================================================
         * DETERMINE PREVIOUS STATUS
         * ===================================================
         */

        const previousTradeStatus =
          dispute.previousTradeStatus;

        /**
         * ===================================================
         * DETERMINE TARGET STATUS
         * ===================================================
         */

        let targetTradeStatus;

        if (
          outcome ===
          "CANCEL_TRADE"
        ) {
          targetTradeStatus =
            "CANCELLED";
        }

        if (
          outcome ===
          "REOPEN_TRADE"
        ) {
          if (
            !reopenableTradeStatuses.includes(
              previousTradeStatus
            )
          ) {
            const error = new Error(
              "This dispute cannot reopen the trade because its previous trade status is invalid."
            );

            error.statusCode = 400;

            throw error;
          }

          targetTradeStatus =
            previousTradeStatus;
        }

        /**
         * ===================================================
         * RECOVERY STATE
         * ===================================================
         */

        let stagesToReset = [];

        let verificationReset = false;

        let listingsReleased = false;

        let listingsReserved = false;

        /**
         * ===================================================
         * CONFIRMATION RECOVERY
         *
         * IMPORTANT:
         *
         * These are the actual confirmation stages
         * used by the existing trade system.
         * ===================================================
         */

        if (
          outcome ===
            "REOPEN_TRADE" &&
          previousTradeStatus ===
            "VERIFICATION"
        ) {
          stagesToReset = [
            "HANDOVER",
            "HANDOVER_STARTED",
            "COMPLETION",
          ];

          verificationReset = true;
        }

        if (
          outcome ===
            "REOPEN_TRADE" &&
          previousTradeStatus ===
            "READY_FOR_HANDOVER"
        ) {
          stagesToReset = [
            "HANDOVER_STARTED",
            "COMPLETION",
          ];
        }

        if (
          outcome ===
            "REOPEN_TRADE" &&
          previousTradeStatus ===
            "IN_PROGRESS"
        ) {
          stagesToReset = [
            "COMPLETION",
          ];
        }

        /**
         * ===================================================
         * RESET DOWNSTREAM CONFIRMATIONS
         * ===================================================
         *
         * Historical confirmation records that belong
         * to the invalidated downstream stages are removed.
         *
         * The trade can then require fresh confirmation.
         */

        if (
          outcome ===
            "REOPEN_TRADE" &&
          stagesToReset.length > 0
        ) {
          await tx.tradeConfirmation.deleteMany({
            where: {
              tradeId:
                dispute.tradeId,

              stage: {
                in: stagesToReset,
              },
            },
          });
        }

        /**
         * ===================================================
         * RESET VERIFICATION
         * ===================================================
         *
         * If the dispute occurred during verification,
         * previous verification must no longer count as
         * completed.
         */

        if (verificationReset) {
          await tx.verification.updateMany({
            where: {
              tradeId:
                dispute.tradeId,
            },

            data: {
              status: "PENDING",

              documentUrl: null,

              notes:
                "Verification reset after dispute review. Re-verification is required.",
            },
          });
        }

        /**
         * ===================================================
         * LOAD TRADE LISTINGS
         * ===================================================
         */

        const listingIds =
          dispute.trade.items.map(
            (item) =>
              item.listingId
          );

        /**
         * ===================================================
         * LISTING RECOVERY
         * ===================================================
         */

        if (listingIds.length > 0) {
          /**
           * -----------------------------------------------
           * CANCEL TRADE
           *
           * Only currently RESERVED listings are released.
           * -----------------------------------------------
           */

          if (
            outcome ===
            "CANCEL_TRADE"
          ) {
            const released =
              await tx.listing.updateMany({
                where: {
                  id: {
                    in: listingIds,
                  },

                  status:
                    "RESERVED",
                },

                data: {
                  status:
                    "ACTIVE",
                },
              });

            listingsReleased =
              released.count > 0;
          }

          /**
           * -----------------------------------------------
           * REOPEN TRADE
           *
           * The trade must have its listings reserved
           * again before continuing.
           *
           * We intentionally only convert ACTIVE listings.
           *
           * Any other state causes the recovery to stop
           * rather than silently overwriting an unexpected
           * listing state.
           * -----------------------------------------------
           */

          if (
            outcome ===
            "REOPEN_TRADE"
          ) {
            const listings =
              await tx.listing.findMany({
                where: {
                  id: {
                    in: listingIds,
                  },
                },

                select: {
                  id: true,
                  status: true,
                },
              });

            const invalidListing =
              listings.find(
                (listing) =>
                  ![
                    "ACTIVE",
                    "RESERVED",
                  ].includes(
                    listing.status
                  )
              );

            if (invalidListing) {
              const error =
                new Error(
                  "The trade cannot be reopened because one or more trade listings are no longer in a recoverable state."
                );

              error.statusCode =
                409;

              throw error;
            }

            const reserved =
              await tx.listing.updateMany({
                where: {
                  id: {
                    in: listingIds,
                  },

                  status:
                    "ACTIVE",
                },

                data: {
                  status:
                    "RESERVED",
                },
              });

            listingsReserved =
              reserved.count > 0;
          }
        }

        /**
         * ===================================================
         * UPDATE TRADE
         * ===================================================
         *
         * The WHERE clause protects against another
         * request changing the trade while the admin
         * decision is being processed.
         */

        const tradeUpdate =
          await tx.trade.updateMany({
            where: {
              id: dispute.tradeId,

              status:
                "DISPUTED",
            },

            data: {
              status:
                targetTradeStatus,

              /**
               * These flags represent the current
               * confirmation state.
               *
               * They must not survive a recovery.
               */

              traderAConfirmed:
                false,

              traderBConfirmed:
                false,

              traderAConfirmedAt:
                null,

              traderBConfirmedAt:
                null,

              /**
               * A reopened trade can never remain
               * marked as completed.
               */

              completedAt:
                null,
            },
          });

        if (
          tradeUpdate.count !==
          1
        ) {
          const error =
            new Error(
              "The trade was changed by another request. Please refresh and try again."
            );

          error.statusCode =
            409;

          throw error;
        }

        /**
         * ===================================================
         * UPDATE DISPUTE
         * ===================================================
         */

        const updatedDispute =
          await tx.dispute.update({
            where: {
              id: disputeId,
            },

            data: {
              status:
                "RESOLVED",

              resolution:
                trimmedResolution,

              outcome,

              outcomeAt:
                new Date(),
            },

            include: {
              user: {
                select: {
                  id: true,
                  name: true,
                  avatar: true,
                },
              },

              trade: {
                select: {
                  id: true,

                  tradeNumber:
                    true,

                  status:
                    true,

                  traderAId:
                    true,

                  traderBId:
                    true,
                },
              },
            },
          });

        /**
         * ===================================================
         * AUDIT EVENT
         * ===================================================
         */

        await tx.disputeEvent.create({
          data: {
            disputeId:
              dispute.id,

            userId:
              adminId,

            eventType:
              outcome ===
              "CANCEL_TRADE"
                ? "TRADE_CANCELLED"
                : "TRADE_REOPENED",

            description:
              outcome ===
              "CANCEL_TRADE"
                ? "Administrator cancelled the trade after dispute review."
                : "Administrator reopened the trade after dispute review.",

            metadata: {
              previousTradeStatus,

              newTradeStatus:
                targetTradeStatus,

              confirmationStagesReset:
                stagesToReset,

              verificationReset,

              listingsReleased,

              listingsReserved,

              resolution:
                trimmedResolution,

              outcome,
            },
          },
        });

        /**
         * ===================================================
         * LOAD FINAL TRADE
         * ===================================================
         *
         * IMPORTANT:
         * Include traderAId/traderBId because notifications
         * after the transaction need those IDs.
         * ===================================================
         */

        const updatedTrade =
          await tx.trade.findUnique({
            where: {
              id:
                dispute.tradeId,
            },

            select: {
              id: true,

              tradeNumber:
                true,

              status:
                true,

              traderAId:
                true,

              traderBId:
                true,

              traderA: {
                select: {
                  id: true,
                  name: true,
                  avatar: true,
                },
              },

              traderB: {
                select: {
                  id: true,
                  name: true,
                  avatar: true,
                },
              },

              completedAt:
                true,

              traderAConfirmed:
                true,

              traderBConfirmed:
                true,

              traderAConfirmedAt:
                true,

              traderBConfirmedAt:
                true,

              confirmations: {
                select: {
                  id: true,
                  userId: true,
                  stage: true,
                  confirmedAt:
                    true,
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

        if (!updatedTrade) {
          const error =
            new Error(
              "Trade could not be loaded after dispute recovery."
            );

          error.statusCode =
            500;

          throw error;
        }

        return {
          dispute:
            updatedDispute,

          trade:
            updatedTrade,

          recovery: {
            outcome,

            previousTradeStatus,

            currentTradeStatus:
              targetTradeStatus,

            confirmationStagesReset:
              stagesToReset,

            verificationReset,

            listingsReleased,

            listingsReserved,

            requiresReconfirmation:
              outcome ===
              "REOPEN_TRADE",
          },
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
     * These happen AFTER the transaction commits.
     *
     * Notification failure must never undo a successful
     * trade recovery.
     * =======================================================
     */

    let notificationMessage;

    if (
      outcome ===
      "CANCEL_TRADE"
    ) {
      notificationMessage =
        `Trade ${result.trade.tradeNumber} has been cancelled after dispute review.`;

      if (
        result.recovery
          .listingsReleased
      ) {
        notificationMessage +=
          " The reserved listings have been released.";
      }
    }

    if (
      outcome ===
      "REOPEN_TRADE"
    ) {
      notificationMessage =
        `Trade ${result.trade.tradeNumber} has been reopened at ${result.recovery.previousTradeStatus}.`;

      if (
        result.recovery
          .verificationReset
      ) {
        notificationMessage +=
          " Previous verification has been reset and re-verification is required.";
      }

      if (
        result.recovery
          .confirmationStagesReset
          .length > 0
      ) {
        notificationMessage +=
          " Required trade confirmations have been reset and must be completed again.";
      }
    }

    const notificationResults =
      await Promise.allSettled([
        createNotification({
          userId:
            result.trade
              .traderAId,

          type: "TRADE",

          title:
            outcome ===
            "CANCEL_TRADE"
              ? "Trade Cancelled After Dispute Review"
              : "Trade Reopened After Dispute Review",

          referenceId:
            result.trade.id,

          referenceType:
            "TRADE",

          message:
            notificationMessage,
        }),

        createNotification({
          userId:
            result.trade
              .traderBId,

          type: "TRADE",

          title:
            outcome ===
            "CANCEL_TRADE"
              ? "Trade Cancelled After Dispute Review"
              : "Trade Reopened After Dispute Review",

          referenceId:
            result.trade.id,

          referenceType:
            "TRADE",

          message:
            notificationMessage,
        }),
      ]);

    notificationResults.forEach(
      (notificationResult) => {
        if (
          notificationResult.status ===
          "rejected"
        ) {
          console.error(
            "DISPUTE OUTCOME NOTIFICATION ERROR:",
            notificationResult.reason
          );
        }
      }
    );

    /**
     * =======================================================
     * RESPONSE
     * =======================================================
     */

    return res.status(200).json({
      success: true,

      message:
        outcome ===
        "CANCEL_TRADE"
          ? "Dispute resolved and trade cancelled successfully."
          : "Dispute resolved and trade reopened successfully.",

      dispute:
        result.dispute,

      trade:
        result.trade,

      recovery:
        result.recovery,
    });
  } catch (error) {
    console.error(
      "APPLY DISPUTE OUTCOME ERROR:",
      error
    );

    return res.status(
      error.statusCode || 500
    ).json({
      success: false,

      message:
        error.message ||
        "Failed to apply dispute outcome.",
    });
  }
};


/**
 * =========================================================
 * GET DISPUTE AUDIT EVENTS
 *
 * GET /api/disputes/:disputeId/events
 *
 * Accessible to:
 *
 * - dispute reporter
 * - Trader A
 * - Trader B
 * - ADMIN
 * =========================================================
 */

export const getDisputeEvents =
  async (req, res) => {
    try {
      const {
        disputeId,
      } = req.params;

      const userId =
        req.user.id;

      /**
       * -----------------------------------------------
       * LOAD DISPUTE
       * -----------------------------------------------
       */

      const dispute =
        await prisma.dispute.findUnique(
          {
            where: {
              id: disputeId,
            },

            select: {
              id: true,

              userId: true,

              trade: {
                select: {
                  id: true,

                  traderAId:
                    true,

                  traderBId:
                    true,
                },
              },
            },
          }
        );

      if (!dispute) {
        return res.status(404).json({
          success: false,
          message:
            "Dispute not found.",
        });
      }

      /**
       * -----------------------------------------------
       * AUTHORIZATION
       * -----------------------------------------------
       */

      const isParticipant =
        dispute.userId ===
          userId ||
        dispute.trade.traderAId ===
          userId ||
        dispute.trade.traderBId ===
          userId;

      const isAdmin =
        req.user.role ===
        "ADMIN";

      if (
        !isParticipant &&
        !isAdmin
      ) {
        return res.status(403).json({
          success: false,
          message:
            "You are not authorized to view this dispute history.",
        });
      }

      /**
       * -----------------------------------------------
       * LOAD EVENTS
       * -----------------------------------------------
       */

      const events =
        await prisma.disputeEvent.findMany(
          {
            where: {
              disputeId,
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

            orderBy: {
              createdAt:
                "asc",
            },
          }
        );

      return res.status(200).json({
        success: true,

        events,
      });
    } catch (error) {
      console.error(
        "GET DISPUTE EVENTS ERROR:",
        error
      );

      return res.status(500).json({
        success: false,

        message:
          "Unable to load dispute history.",
      });
    }
  };
