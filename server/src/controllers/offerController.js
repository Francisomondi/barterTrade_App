
import prisma from "../config/prisma.js";

/**
 * CREATE OFFER
 * POST /api/offers
 */
export const createOffer = async (req, res) => {
  try {
    const senderId = req.user.id;

    const {
      receiverId,
      offeredListingId,
      requestedListingId,
      message,
    } = req.body;

    // Validate required fields
    if (
      !receiverId ||
      !offeredListingId ||
      !requestedListingId
    ) {
      return res.status(400).json({
        message:
          "Receiver, offered listing and requested listing are required.",
      });
    }

    // Get both listings
    const listings = await prisma.listing.findMany({
      where: {
        id: {
          in: [
            offeredListingId,
            requestedListingId,
          ],
        },
      },
      include: {
        category: true,
        user: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        images: true,
      },
    });

    const offeredListing = listings.find(
      (listing) =>
        listing.id === offeredListingId
    );

    const requestedListing = listings.find(
      (listing) =>
        listing.id === requestedListingId
    );

    // Check listings exist
    if (!offeredListing) {
      return res.status(404).json({
        message:
          "The item you are offering was not found.",
      });
    }

    if (!requestedListing) {
      return res.status(404).json({
        message:
          "The item you are requesting was not found.",
      });
    }

    // Prevent offering your own item
    if (
      offeredListing.userId !== senderId
    ) {
      return res.status(403).json({
        message:
          "You can only offer items that belong to you.",
      });
    }

    // Prevent requesting your own item
    if (
      requestedListing.userId === senderId
    ) {
      return res.status(400).json({
        message:
          "You cannot make a barter offer for your own item.",
      });
    }

    // Verify receiver
    if (
      requestedListing.userId !== receiverId
    ) {
      return res.status(400).json({
        message:
          "The receiver does not own the requested item.",
      });
    }

    // Both listings must be active
    if (
      offeredListing.status !== "ACTIVE"
    ) {
      return res.status(400).json({
        message:
          "Your offered item is no longer available.",
      });
    }

    if (
      requestedListing.status !== "ACTIVE"
    ) {
      return res.status(400).json({
        message:
          "The requested item is no longer available.",
      });
    }

    // Prevent duplicate pending offers
    const existingOffer =
      await prisma.offer.findFirst({
        where: {
          senderId,
          receiverId,
          offeredListingId,
          requestedListingId,
          status: "PENDING",
        },
      });

    if (existingOffer) {
      return res.status(409).json({
        message:
          "You already have a pending offer for this item.",
      });
    }

    // Create offer
    const offer = await prisma.offer.create({
      data: {
        senderId,
        receiverId,
        offeredListingId,
        requestedListingId,
        message:
          message?.trim() || null,
      },

      include: {
        sender: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },

        receiver: {
          select: {
            id: true,
            name: true,
            email: true,
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
    });

    // Notify receiver
    await prisma.notification.create({
      data: {
        userId: receiverId,
        type: "OFFER",
        title: "New barter offer",
        message: `${offer.sender.name} has offered "${offeredListing.title}" for your "${requestedListing.title}".`,
      },
    });

    return res.status(201).json({
      message:
        "Barter offer sent successfully.",
      offer,
    });
  } catch (error) {
    console.error(
      "CREATE OFFER ERROR:",
      error
    );

    return res.status(500).json({
      message:
        "Unable to create barter offer.",
    });
  }
};


/**
 * GET SENT OFFERS
 * GET /api/offers/sent
 */
export const getSentOffers = async (
  req,
  res
) => {
  try {
    const userId = req.user.id;

    const offers =
      await prisma.offer.findMany({
        where: {
          senderId: userId,
        },

        include: {
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

          trade: true,
        },

        orderBy: {
          createdAt: "desc",
        },
      });

    return res.status(200).json({
      offers,
    });
  } catch (error) {
    console.error(
      "GET SENT OFFERS ERROR:",
      error
    );

    return res.status(500).json({
      message:
        "Unable to load sent offers.",
    });
  }
};


/**
 * GET RECEIVED OFFERS
 * GET /api/offers/received
 */
export const getReceivedOffers = async (
  req,
  res
) => {
  try {
    const userId = req.user.id;

    const offers =
      await prisma.offer.findMany({
        where: {
          receiverId: userId,
        },

        include: {
          sender: {
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

          trade: true,
        },

        orderBy: {
          createdAt: "desc",
        },
      });

    return res.status(200).json({
      offers,
    });
  } catch (error) {
    console.error(
      "GET RECEIVED OFFERS ERROR:",
      error
    );

    return res.status(500).json({
      message:
        "Unable to load received offers.",
    });
  }
};


/**
 * GET SINGLE OFFER
 * GET /api/offers/:id
 */
export const getOfferById = async (
  req,
  res
) => {
  try {
    const userId = req.user.id;
    const { id } = req.params;

    const offer =
      await prisma.offer.findUnique({
        where: {
          id,
        },

        include: {
          sender: {
            select: {
              id: true,
              name: true,
              email: true,
              avatar: true,
              barterScore: true,
            },
          },

          receiver: {
            select: {
              id: true,
              name: true,
              email: true,
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

          trade: true,
        },
      });

    if (!offer) {
      return res.status(404).json({
        message: "Offer not found.",
      });
    }

    // Only participants can view offer
    if (
      offer.senderId !== userId &&
      offer.receiverId !== userId
    ) {
      return res.status(403).json({
        message:
          "You are not authorized to view this offer.",
      });
    }

    return res.status(200).json({
      offer,
    });
  } catch (error) {
    console.error(
      "GET OFFER ERROR:",
      error
    );

    return res.status(500).json({
      message:
        "Unable to load offer.",
    });
  }
};


/**
 * ACCEPT OFFER
 * PATCH /api/offers/:id/accept
 */
export const acceptOffer = async (
  req,
  res
) => {
  try {
    const userId = req.user.id;
    const { id } = req.params;

    const offer =
      await prisma.offer.findUnique({
        where: {
          id,
        },

        include: {
          offeredListing: true,
          requestedListing: true,
        },
      });

    if (!offer) {
      return res.status(404).json({
        message: "Offer not found.",
      });
    }

    // Only receiver can accept
    if (
      offer.receiverId !== userId
    ) {
      return res.status(403).json({
        message:
          "Only the item owner can accept this offer.",
      });
    }

    if (offer.status !== "PENDING") {
      return res.status(400).json({
        message:
          "Only pending offers can be accepted.",
      });
    }

    // Make sure both items are still active
    if (
      offer.offeredListing.status !==
      "ACTIVE"
    ) {
      return res.status(400).json({
        message:
          "The offered item is no longer available.",
      });
    }

    if (
      offer.requestedListing.status !==
      "ACTIVE"
    ) {
      return res.status(400).json({
        message:
          "Your item is no longer available.",
      });
    }

    // Accept offer and reserve both items
    const result =
      await prisma.$transaction(
        async (tx) => {
          const updatedOffer =
            await tx.offer.update({
              where: {
                id,
              },

              data: {
                status: "ACCEPTED",
              },

              include: {
                sender: {
                  select: {
                    id: true,
                    name: true,
                  },
                },

                receiver: {
                  select: {
                    id: true,
                    name: true,
                  },
                },

                offeredListing: true,
                requestedListing: true,
              },
            });

          await tx.listing.update({
            where: {
              id: offer.offeredListingId,
            },

            data: {
              status: "RESERVED",
            },
          });

          await tx.listing.update({
            where: {
              id: offer.requestedListingId,
            },

            data: {
              status: "RESERVED",
            },
          });

          // Reject other pending offers
          await tx.offer.updateMany({
            where: {
              OR: [
                {
                  requestedListingId:
                    offer.requestedListingId,
                },

                {
                  offeredListingId:
                    offer.offeredListingId,
                },
              ],

              status: "PENDING",

              NOT: {
                id,
              },
            },

            data: {
              status: "REJECTED",
            },
          });

          return updatedOffer;
        }
      );

    // Notify sender
    await prisma.notification.create({
      data: {
        userId: offer.senderId,
        type: "OFFER",
        title: "Offer accepted",
        message:
          "Your barter offer has been accepted. Your trade can now proceed.",
      },
    });

    return res.status(200).json({
      message:
        "Barter offer accepted successfully.",
      offer: result,
    });
  } catch (error) {
    console.error(
      "ACCEPT OFFER ERROR:",
      error
    );

    return res.status(500).json({
      message:
        "Unable to accept offer.",
    });
  }
};


/**
 * REJECT OFFER
 * PATCH /api/offers/:id/reject
 */
export const rejectOffer = async (
  req,
  res
) => {
  try {
    const userId = req.user.id;
    const { id } = req.params;

    const offer =
      await prisma.offer.findUnique({
        where: {
          id,
        },
      });

    if (!offer) {
      return res.status(404).json({
        message: "Offer not found.",
      });
    }

    if (
      offer.receiverId !== userId
    ) {
      return res.status(403).json({
        message:
          "Only the receiver can reject this offer.",
      });
    }

    if (offer.status !== "PENDING") {
      return res.status(400).json({
        message:
          "Only pending offers can be rejected.",
      });
    }

    const updatedOffer =
      await prisma.offer.update({
        where: {
          id,
        },

        data: {
          status: "REJECTED",
        },
      });

    await prisma.notification.create({
      data: {
        userId: offer.senderId,
        type: "OFFER",
        title: "Offer rejected",
        message:
          "Your barter offer has been rejected.",
      },
    });

    return res.status(200).json({
      message:
        "Offer rejected successfully.",
      offer: updatedOffer,
    });
  } catch (error) {
    console.error(
      "REJECT OFFER ERROR:",
      error
    );

    return res.status(500).json({
      message:
        "Unable to reject offer.",
    });
  }
};


/**
 * CANCEL OFFER
 * PATCH /api/offers/:id/cancel
 */
export const cancelOffer = async (
  req,
  res
) => {
  try {
    const userId = req.user.id;
    const { id } = req.params;

    const offer =
      await prisma.offer.findUnique({
        where: {
          id,
        },
      });

    if (!offer) {
      return res.status(404).json({
        message: "Offer not found.",
      });
    }

    if (
      offer.senderId !== userId
    ) {
      return res.status(403).json({
        message:
          "Only the sender can cancel this offer.",
      });
    }

    if (offer.status !== "PENDING") {
      return res.status(400).json({
        message:
          "Only pending offers can be cancelled.",
      });
    }

    const updatedOffer =
      await prisma.offer.update({
        where: {
          id,
        },

        data: {
          status: "CANCELLED",
        },
      });

    await prisma.notification.create({
      data: {
        userId: offer.receiverId,
        type: "OFFER",
        title: "Offer cancelled",
        message:
          "A barter offer you received has been cancelled.",
      },
    });

    return res.status(200).json({
      message:
        "Offer cancelled successfully.",
      offer: updatedOffer,
    });
  } catch (error) {
    console.error(
      "CANCEL OFFER ERROR:",
      error
    );

    return res.status(500).json({
      message:
        "Unable to cancel offer.",
    });
  }
};

