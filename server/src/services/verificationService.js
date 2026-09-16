
import prisma from "../config/prisma.js";

const VERIFICATION_TYPE = "ITEM";

/**
 * Check whether a user belongs to a trade.
 */
const isTrader = (trade, userId) => {
  return trade.traderAId === userId || trade.traderBId === userId;
};

/**
 * Get trade with verification records.
 */
const getTradeWithVerifications = async (tradeId) => {
  return prisma.trade.findUnique({
    where: {
      id: tradeId,
    },
    include: {
      verifications: {
        orderBy: {
          createdAt: "asc",
        },
      },
      traderA: {
        select: {
          id: true,
          name: true,
          email: true,
        },
      },
      traderB: {
        select: {
          id: true,
          name: true,
          email: true,
        },
      },
    },
  });
};

/**
 * Create verification records for both traders.
 *
 * IMPORTANT:
 * A trade can only enter verification after BOTH
 * traders have confirmed the VERIFICATION stage.
 *
 * Therefore this function only works when:
 *
 * Trade status = VERIFICATION
 */
export const createTradeVerifications = async ({
  tradeId,
  userId,
}) => {
  const trade = await getTradeWithVerifications(tradeId);

  if (!trade) {
    throw new Error("Trade not found");
  }

  if (!isTrader(trade, userId)) {
    throw new Error("You are not a participant in this trade");
  }

  if (trade.status !== "VERIFICATION") {
    throw new Error(
      "Trade must be in VERIFICATION status before verification records can be created"
    );
  }

  const existingTraderA = trade.verifications.find(
    (verification) =>
      verification.userId === trade.traderAId &&
      verification.type === VERIFICATION_TYPE
  );

  const existingTraderB = trade.verifications.find(
    (verification) =>
      verification.userId === trade.traderBId &&
      verification.type === VERIFICATION_TYPE
  );

  const recordsToCreate = [];

  if (!existingTraderA) {
    recordsToCreate.push({
      userId: trade.traderAId,
      tradeId: trade.id,
      type: VERIFICATION_TYPE,
    });
  }

  if (!existingTraderB) {
    recordsToCreate.push({
      userId: trade.traderBId,
      tradeId: trade.id,
      type: VERIFICATION_TYPE,
    });
  }

  if (recordsToCreate.length > 0) {
    await prisma.verification.createMany({
      data: recordsToCreate,
      skipDuplicates: true,
    });
  }

  return getTradeWithVerifications(tradeId);
};

/**
 * Get all verification records for a trade.
 */
export const getTradeVerifications = async ({
  tradeId,
  userId,
}) => {
  const trade = await getTradeWithVerifications(tradeId);

  if (!trade) {
    throw new Error("Trade not found");
  }

  if (!isTrader(trade, userId)) {
    throw new Error("You are not a participant in this trade");
  }

  return {
    tradeId: trade.id,
    tradeStatus: trade.status,
    verifications: trade.verifications,
  };
};

/**
 * Verify the current user's item.
 *
 * Both traders must verify before the trade can move
 * from VERIFICATION → READY_FOR_HANDOVER.
 */
export const verifyTradeItem = async ({
  tradeId,
  userId,
  notes,
  documentUrl,
}) => {
  const trade = await getTradeWithVerifications(tradeId);

  if (!trade) {
    throw new Error("Trade not found");
  }

  if (!isTrader(trade, userId)) {
    throw new Error("You are not a participant in this trade");
  }

  if (trade.status !== "VERIFICATION") {
    throw new Error(
      "Trade must be in VERIFICATION status before items can be verified"
    );
  }

  // Make sure both verification records exist.
  await createTradeVerifications({
    tradeId,
    userId,
  });

  const verification = await prisma.verification.findFirst({
    where: {
      tradeId,
      userId,
      type: VERIFICATION_TYPE,
    },
  });

  if (!verification) {
    throw new Error("Verification record could not be created");
  }

  if (verification.status === "VERIFIED") {
    throw new Error("Your item has already been verified");
  }

  if (verification.status === "REJECTED") {
    throw new Error(
      "Your previous verification was rejected. Please contact support."
    );
  }

  // Mark this trader's item as verified.
  await prisma.verification.update({
    where: {
      id: verification.id,
    },
    data: {
      status: "VERIFIED",
      notes: notes || null,
      documentUrl: documentUrl || null,
    },
  });

  /**
   * Check whether BOTH traders have now verified.
   */
  const verificationRecords =
    await prisma.verification.findMany({
      where: {
        tradeId,
        type: VERIFICATION_TYPE,
      },
    });

  const traderAVerified = verificationRecords.some(
    (record) =>
      record.userId === trade.traderAId &&
      record.status === "VERIFIED"
  );

  const traderBVerified = verificationRecords.some(
    (record) =>
      record.userId === trade.traderBId &&
      record.status === "VERIFIED"
  );

  /**
   * Only move the trade forward when BOTH traders
   * have verified their items.
   *
   * updateMany makes this concurrency-safe:
   * if both users submit verification at almost
   * exactly the same time, only the first successful
   * status transition will change the trade.
   */
  let tradeAdvanced = false;

  if (traderAVerified && traderBVerified) {
    const result = await prisma.trade.updateMany({
      where: {
        id: tradeId,
        status: "VERIFICATION",
      },
      data: {
        status: "READY_FOR_HANDOVER",
      },
    });

    tradeAdvanced = result.count === 1;
  }

  const updatedTrade =
    await getTradeWithVerifications(tradeId);

  return {
    trade: updatedTrade,
    verification:
      updatedTrade.verifications.find(
        (record) =>
          record.userId === userId &&
          record.type === VERIFICATION_TYPE
      ) || null,
    bothVerified: traderAVerified && traderBVerified,
    tradeAdvanced,
  };
};

/**
 * Reject the current user's item verification.
 */
export const rejectTradeVerification = async ({
  tradeId,
  userId,
  notes,
}) => {
  const trade = await getTradeWithVerifications(tradeId);

  if (!trade) {
    throw new Error("Trade not found");
  }

  if (!isTrader(trade, userId)) {
    throw new Error("You are not a participant in this trade");
  }

  if (trade.status !== "VERIFICATION") {
    throw new Error(
      "Trade must be in VERIFICATION status before verification can be rejected"
    );
  }

  // Ensure both verification records exist.
  await createTradeVerifications({
    tradeId,
    userId,
  });

  const verification = await prisma.verification.findFirst({
    where: {
      tradeId,
      userId,
      type: VERIFICATION_TYPE,
    },
  });

  if (!verification) {
    throw new Error("Verification record could not be created");
  }

  await prisma.verification.update({
    where: {
      id: verification.id,
    },
    data: {
      status: "REJECTED",
      notes: notes || null,
    },
  });

  return getTradeWithVerifications(tradeId);
};

/**
 * Get the current user's verification record.
 */
export const getMyTradeVerification = async ({
  tradeId,
  userId,
}) => {
  const trade = await getTradeWithVerifications(tradeId);

  if (!trade) {
    throw new Error("Trade not found");
  }

  if (!isTrader(trade, userId)) {
    throw new Error("You are not a participant in this trade");
  }

  return (
    trade.verifications.find(
      (verification) =>
        verification.userId === userId &&
        verification.type === VERIFICATION_TYPE
    ) || null
  );
};

