import prisma from "../config/prisma.js";

/**
 * Allowed trade status transitions
 */
const allowedTransitions = {
  PENDING: ["AGREED", "CANCELLED"],
  AGREED: ["VERIFICATION", "CANCELLED"],
  VERIFICATION: ["READY_FOR_HANDOVER", "CANCELLED", "DISPUTED"],
  READY_FOR_HANDOVER: ["IN_PROGRESS", "CANCELLED", "DISPUTED"],
  IN_PROGRESS: ["COMPLETED", "DISPUTED"],
  COMPLETED: [],
  CANCELLED: [],
  DISPUTED: [],
};

/**
 * Check whether a user belongs to a trade
 */
const isTradeParticipant = (trade, userId) => {
  return (
    trade.traderAId === userId ||
    trade.traderBId === userId
  );
};

/**
 * GET USER TRADES
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

        traderA: {
          select: {
            id: true,
            name: true,
            avatar: true,
            barterScore: true,
          },
        },

        traderB: {
          select: {
            id: true,
            name: true,
            avatar: true,
            barterScore: true,
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

        ratings: true,
        dispute: true,
      },

      orderBy: {
        createdAt: "desc",
      },
    });

    return res.status(200).json({
      success: true,
      count: trades.length,
      trades,
    });
  } catch (error) {
    console.error("GET TRADES ERROR:", error);

    return res.status(500).json({
      success: false,
      message: "Unable to load trades.",
    });
  }
};

/**
 * GET SINGLE TRADE
 * GET /api/trades/:id
 */
export const getTradeById = async (req, res) => {
  try {
    const userId = req.user.id;
    const { id } = req.params;

    const trade = await prisma.trade.findUnique({
      where: {
        id,
      },

      include: {
        offer: {
          include: {
            sender: {
              select: {
                id: true,
                name: true,
                avatar: true,
                barterScore: true,
              },
            },

            receiver: {
              select: {
                id: true,
                name: true,
                avatar: true,
                barterScore: true,
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

        traderA: {
          select: {
            id: true,
            name: true,
            email: true,
            phone: true,
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
            phone: true,
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

    if (!isTradeParticipant(trade, userId)) {
      return res.status(403).json({
        success: false,
        message: "You are not authorized to view this trade.",
      });
    }

    return res.status(200).json({
      success: true,
      trade,
    });
  } catch (error) {
    console.error("GET TRADE ERROR:", error);

    return res.status(500).json({
      success: false,
      message: "Unable to load trade.",
    });
  }
};

/**
 * UPDATE TRADE STATUS
 * PATCH /api/trades/:id/status
 */
export const updateTradeStatus = async (req, res) => {
  try {
    const userId = req.user.id;
    const { id } = req.params;
    const { status } = req.body;

    if (!status) {
      return res.status(400).json({
        success: false,
        message: "Trade status is required.",
      });
    }

    const validStatuses = [
      "PENDING",
      "AGREED",
      "VERIFICATION",
      "READY_FOR_HANDOVER",
      "IN_PROGRESS",
      "COMPLETED",
      "CANCELLED",
      "DISPUTED",
    ];

    if (!validStatuses.includes(status)) {
      return res.status(400).json({
        success: false,
        message: "Invalid trade status.",
      });
    }

    const trade = await prisma.trade.findUnique({
      where: {
        id,
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
      return res.status(404).json({
        success: false,
        message: "Trade not found.",
      });
    }

    if (!isTradeParticipant(trade, userId)) {
      return res.status(403).json({
        success: false,
        message: "You are not authorized to update this trade.",
      });
    }

    // Prevent changing completed/cancelled trades
    if (
      trade.status === "COMPLETED" ||
      trade.status === "CANCELLED"
    ) {
      return res.status(400).json({
        success: false,
        message: `This trade is already ${trade.status.toLowerCase()}.`,
      });
    }

    // Check transition
    if (!allowedTransitions[trade.status]?.includes(status)) {
      return res.status(400).json({
        success: false,
        message: `Trade cannot move from ${trade.status} to ${status}.`,
      });
    }

    const updatedTrade = await prisma.trade.update({
      where: {
        id,
      },

      data: {
        status,

        ...(status === "COMPLETED"
          ? {
              completedAt: new Date(),
            }
          : {}),
      },

      include: {
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

        items: {
          include: {
            listing: true,
          },
        },
      },
    });

    // Notify the other trader
    const otherUserId =
      trade.traderAId === userId
        ? trade.traderBId
        : trade.traderAId;

    await prisma.notification.create({
      data: {
        userId: otherUserId,
        type: "TRADE",
        title: "Trade status updated",
        message: `Trade ${trade.tradeNumber} is now ${status
          .toLowerCase()
          .replaceAll("_", " ")}.`,
      },
    });

    // When trade is completed, mark listings as traded
    if (status === "COMPLETED") {
      await prisma.$transaction([
        prisma.listing.updateMany({
          where: {
            id: {
              in: updatedTrade.items.map(
                (item) => item.listingId
              ),
            },
          },

          data: {
            status: "TRADED",
          },
        }),

        prisma.user.update({
          where: {
            id: trade.traderAId,
          },

          data: {
            completedTrades: {
              increment: 1,
            },
          },
        }),

        prisma.user.update({
          where: {
            id: trade.traderBId,
          },

          data: {
            completedTrades: {
              increment: 1,
            },
          },
        }),
      ]);
    }

    return res.status(200).json({
      success: true,
      message: "Trade status updated successfully.",
      trade: updatedTrade,
    });
  } catch (error) {
    console.error("UPDATE TRADE STATUS ERROR:", error);

    return res.status(500).json({
      success: false,
      message: "Unable to update trade status.",
    });
  }
};

/**
 * COMPLETE TRADE
 * PATCH /api/trades/:id/complete
 */
export const completeTrade = async (req, res) => {
  try {
    const userId = req.user.id;
    const { id } = req.params;

    const trade = await prisma.trade.findUnique({
      where: {
        id,
      },

      include: {
        items: true,
      },
    });

    if (!trade) {
      return res.status(404).json({
        success: false,
        message: "Trade not found.",
      });
    }

    if (!isTradeParticipant(trade, userId)) {
      return res.status(403).json({
        success: false,
        message: "You are not authorized to complete this trade.",
      });
    }

    if (trade.status !== "IN_PROGRESS") {
      return res.status(400).json({
        success: false,
        message:
          "Only trades currently in progress can be completed.",
      });
    }

    const result = await prisma.$transaction(async (tx) => {
      const updatedTrade = await tx.trade.update({
        where: {
          id,
        },

        data: {
          status: "COMPLETED",
          completedAt: new Date(),
        },

        include: {
          items: true,
        },
      });

      // Mark both exchanged listings as traded
      await tx.listing.updateMany({
        where: {
          id: {
            in: trade.items.map(
              (item) => item.listingId
            ),
          },
        },

        data: {
          status: "TRADED",
        },
      });

      // Update both traders
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

      return updatedTrade;
    });

    // Notify the other trader
    const otherUserId =
      trade.traderAId === userId
        ? trade.traderBId
        : trade.traderAId;

    await prisma.notification.create({
      data: {
        userId: otherUserId,
        type: "TRADE",
        title: "Trade completed",
        message: `Trade ${trade.tradeNumber} has been completed successfully.`,
      },
    });

    return res.status(200).json({
      success: true,
      message: "Trade completed successfully.",
      trade: result,
    });
  } catch (error) {
    console.error("COMPLETE TRADE ERROR:", error);

    return res.status(500).json({
      success: false,
      message: "Unable to complete trade.",
    });
  }
};
