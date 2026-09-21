
import prisma from "../config/prisma.js";

/**
 * Record an event in the dispute audit trail.
 *
 * This helper intentionally does not throw when
 * audit logging fails. The main dispute operation
 * should remain the source of truth.
 */
export const createDisputeEvent = async ({
  disputeId,
  userId = null,
  eventType,
  description = null,
  metadata = null,
  client = prisma,
}) => {
  try {
    return await client.disputeEvent.create({
      data: {
        disputeId,
        userId,
        eventType,
        description,
        metadata,
      },
    });
  } catch (error) {
    console.error(
      "CREATE DISPUTE EVENT ERROR:",
      error
    );

    return null;
  }
};
