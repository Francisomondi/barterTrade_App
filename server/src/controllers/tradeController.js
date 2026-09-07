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
IN_PROGRESS: [
"COMPLETED",
"DISPUTED",
],
COMPLETED: [],
CANCELLED: [],
DISPUTED: [],
};



const CONFIRMATION_STAGES = {
AGREEMENT: "AGREEMENT",
VERIFICATION: "VERIFICATION",
HANDOVER: "HANDOVER",
};


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
console.error("Get trade by ID error:", error);


return res.status(500).json({
  success: false,
  message: "Failed to fetch trade.",
});


}
};


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

const confirmation =
await prisma.tradeConfirmation.create({
data: {
tradeId,
userId,
stage,
},
});

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

const result = await confirmTradeStage(
  id,
  userId,
  stage
);

let updatedTrade = trade;



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
    updatedTrade =
      await prisma.trade.update({
        where: {
          id,
        },

        data: {
          status: nextStatus,
        },
      });
  }
}


const otherTraderId =
  trade.traderAId === userId
    ? trade.traderBId
    : trade.traderAId;

await prisma.notification.create({
  data: {
    userId: otherTraderId,
    type: "TRADE",

    title: "Trade Confirmation",

    message: result.bothConfirmed
      ? `Both traders confirmed the ${stage.toLowerCase()} stage. The trade is now ${updatedTrade.status}.`
      : `Your trade partner has confirmed the ${stage.toLowerCase()} stage. Your confirmation is still required.`,
  },
});


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
"Confirm trade error:",
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

const updatedTrade =
  await prisma.trade.update({
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

    message:
      `Trade ${trade.tradeNumber} is now ${status}.`,
  },
});

return res.status(200).json({
  success: true,

  message:
    `Trade status updated to ${status}.`,

  trade: updatedTrade,
});

} catch (error) {
console.error(
"Update trade status error:",
error
);


return res.status(500).json({
  success: false,
  message:
    "Failed to update trade status.",
});


}
};


export const completeTrade = async (
req,
res
) => {
try {
const { id } = req.params;
const userId = req.user.id;


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

const isParticipant =
  trade.traderAId === userId ||
  trade.traderBId === userId;

if (!isParticipant) {
  return res.status(403).json({
    success: false,
    message: "You are not a participant in this trade.",
  });
}



if (trade.status !== "IN_PROGRESS") {
  return res.status(400).json({
    success: false,

    message:
      "Only trades in progress can be completed.",
  });
}



const completedTrade =
  await prisma.$transaction(
    async (tx) => {
      const updatedTrade =
        await tx.trade.update({
          where: {
            id,
          },

          data: {
            status: "COMPLETED",
            completedAt: new Date(),
          },
        });

     
      for (const item of trade.items) {
        await tx.listing.update({
          where: {
            id: item.listingId,
          },

          data: {
            status: "TRADED",
          },
        });
      }


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
    }
  );



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
      `Trade ${trade.tradeNumber} has been completed successfully.`,
  },
});

return res.status(200).json({
  success: true,

  message:
    "Trade completed successfully.",

  trade: completedTrade,
});


} catch (error) {
console.error(
"Complete trade error:",
error
);


return res.status(500).json({
  success: false,

  message:
    "Failed to complete trade.",
});


}
};
