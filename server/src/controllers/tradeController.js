
import prisma from "../config/prisma.js";



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
  IN_PROGRESS: ["COMPLETED", "DISPUTED"],
  COMPLETED: [],
  CANCELLED: [],
  DISPUTED: [],
};


const isTradeParticipant = (trade, userId) => {
  return (
    trade.traderAId === userId ||
    trade.traderBId === userId
  );
};




export const getTrades = async (req, res) => {
  try {
    const userId = req.user.id;

    const trades = await prisma.trade.findMany({
      where: {
        OR: [
          { traderAId: userId },
          { traderBId: userId },
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

        ratings: true,
        dispute: true,
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
    console.error("Get trades error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to fetch trades.",
    });
  }
};


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
            phone: true,
            avatar: true,
            bio: true,
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
            phone: true,
            avatar: true,
            bio: true,
            location: true,
            barterScore: true,
            completedTrades: true,
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

            trade: false,
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
        message: "You are not a participant in this trade.",
      });
    }

    return res.status(200).json({
      success: true,
      trade,
    });
  } catch (error) {
    console.error("Get trade by ID error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to fetch trade.",
    });
  }
};



export const confirmTrade = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    const trade = await prisma.trade.findUnique({
      where: {
        id,
      },

      select: {
        id: true,
        traderAId: true,
        traderBId: true,
        status: true,
        traderAConfirmed: true,
        traderBConfirmed: true,
        traderAConfirmedAt: true,
        traderBConfirmedAt: true,
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
        message: "You are not a participant in this trade.",
      });
    }

    if (trade.status !== "PENDING") {
      return res.status(400).json({
        success: false,
        message: `This trade cannot be confirmed because its current status is ${trade.status}.`,
      });
    }

    const isTraderA = trade.traderAId === userId;

    const alreadyConfirmed = isTraderA
      ? trade.traderAConfirmed
      : trade.traderBConfirmed;

    if (alreadyConfirmed) {
      return res.status(400).json({
        success: false,
        message: "You have already confirmed this trade.",
      });
    }

  
    const now = new Date();

    let updateData;

    if (isTraderA) {
      updateData = {
        traderAConfirmed: true,
        traderAConfirmedAt: now,
      };
    } else {
      updateData = {
        traderBConfirmed: true,
        traderBConfirmedAt: now,
      };
    }

   

    const bothConfirmed = isTraderA
      ? trade.traderBConfirmed
      : trade.traderAConfirmed;

    if (bothConfirmed) {
      updateData.status = "AGREED";
    }

    const updatedTrade = await prisma.trade.update({
      where: {
        id,
      },

      data: updateData,

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
      },
    });

   

    const otherTraderId = isTraderA
      ? trade.traderBId
      : trade.traderAId;

    await prisma.notification.create({
      data: {
        userId: otherTraderId,
        type: "TRADE",
        title: bothConfirmed
          ? "Trade Agreement Confirmed"
          : "Trader Confirmed the Trade",
        message: bothConfirmed
          ? "Both traders have confirmed the trade. The trade is now agreed."
          : "The other trader has confirmed the trade. Your confirmation is still required.",
      },
    });

    return res.status(200).json({
      success: true,

      message: bothConfirmed
        ? "Both traders have confirmed. Trade is now agreed."
        : "Your confirmation has been recorded. Waiting for the other trader.",

      trade: updatedTrade,

      bothConfirmed,
    });
  } catch (error) {
    console.error("Confirm trade error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to confirm trade.",
    });
  }
};



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

    if (!Object.prototype.hasOwnProperty.call(
      allowedTransitions,
      status
    )) {
      return res.status(400).json({
        success: false,
        message: "Invalid trade status.",
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

    if (!isTradeParticipant(trade, userId)) {
      return res.status(403).json({
        success: false,
        message: "You are not a participant in this trade.",
      });
    }

   

    if (
      trade.status === "PENDING" &&
      status === "AGREED"
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Both traders must confirm the trade before it can become AGREED.",
      });
    }

    const allowedNextStatuses =
      allowedTransitions[trade.status] || [];

    if (!allowedNextStatuses.includes(status)) {
      return res.status(400).json({
        success: false,
        message: `Cannot change trade from ${trade.status} to ${status}.`,
      });
    }

  

    if (status === "COMPLETED") {
      return res.status(400).json({
        success: false,
        message:
          "Use the complete trade endpoint to complete a trade.",
      });
    }


    if (status === "DISPUTED") {
      return res.status(400).json({
        success: false,
        message:
          "Use the dispute process to mark a trade as disputed.",
      });
    }

    const updatedTrade = await prisma.trade.update({
      where: {
        id,
      },

      data: {
        status,
      },
    });


    const otherTraderId =
      trade.traderAId === userId
        ? trade.traderBId
        : trade.traderAId;

    await prisma.notification.create({
      data: {
        userId: otherTraderId,
        type: "TRADE",
        title: "Trade Status Updated",
        message: `Your trade status has changed from ${trade.status} to ${status}.`,
      },
    });

    return res.status(200).json({
      success: true,
      message: `Trade status updated to ${status}.`,
      trade: updatedTrade,
    });
  } catch (error) {
    console.error("Update trade status error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to update trade status.",
    });
  }
};


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

    if (!isTradeParticipant(trade, userId)) {
      return res.status(403).json({
        success: false,
        message: "You are not a participant in this trade.",
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
      const completedTrade = await tx.trade.update({
        where: {
          id,
        },

        data: {
          status: "COMPLETED",
          completedAt: new Date(),
        },
      });

      const tradeItems = await tx.tradeItem.findMany({
        where: {
          tradeId: id,
        },

        select: {
          listingId: true,
        },
      });

      if (tradeItems.length > 0) {
        await tx.listing.updateMany({
          where: {
            id: {
              in: tradeItems.map(
                (item) => item.listingId
              ),
            },
          },

          data: {
            status: "TRADED",
          },
        });
      }

      const userIds = [
        trade.traderAId,
        trade.traderBId,
      ];

      await tx.user.updateMany({
        where: {
          id: {
            in: userIds,
          },
        },

        data: {
          completedTrades: {
            increment: 1,
          },
        },
      });

      return completedTrade;
    });

    const otherTraderId =
      trade.traderAId === userId
        ? trade.traderBId
        : trade.traderAId;

    await prisma.notification.create({
      data: {
        userId: otherTraderId,
        type: "TRADE",
        title: "Trade Completed",
        message:
          "Your barter trade has been marked as completed.",
      },
    });

    return res.status(200).json({
      success: true,
      message:
        "Trade completed successfully. Both listings have been marked as traded.",
      trade: result,
    });
  } catch (error) {
    console.error("Complete trade error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to complete trade.",
    });
  }
};
