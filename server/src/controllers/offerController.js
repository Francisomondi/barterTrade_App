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
    if (!receiverId || !offeredListingId || !requestedListingId) {
      return res.status(400).json({
        success: false,
        message:
          "Receiver, offered listing and requested listing are required.",
      });
    }

    // Prevent offering and requesting the same listing
    if (offeredListingId === requestedListingId) {
      return res.status(400).json({
        success: false,
        message: "You cannot offer and request the same item.",
      });
    }

    // Get both listings
    const listings = await prisma.listing.findMany({
      where: {
        id: {
          in: [offeredListingId, requestedListingId],
        },
      },
      include: {
        category: true,
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            avatar: true,
          },
        },
        images: true,
      },
    });

    const offeredListing = listings.find(
      (listing) => listing.id === offeredListingId
    );

    const requestedListing = listings.find(
      (listing) => listing.id === requestedListingId
    );

    // Check listings exist
    if (!offeredListing) {
      return res.status(404).json({
        success: false,
        message: "The item you are offering was not found.",
      });
    }

    if (!requestedListing) {
      return res.status(404).json({
        success: false,
        message: "The item you are requesting was not found.",
      });
    }

    // Sender must own offered listing
    if (offeredListing.userId !== senderId) {
      return res.status(403).json({
        success: false,
        message: "You can only offer items that belong to you.",
      });
    }

    // Prevent requesting own listing
    if (requestedListing.userId === senderId) {
      return res.status(400).json({
        success: false,
        message: "You cannot make a barter offer for your own item.",
      });
    }

    // Receiver must own requested listing
    if (requestedListing.userId !== receiverId) {
      return res.status(400).json({
        success: false,
        message: "The receiver does not own the requested item.",
      });
    }

    // Both listings must be active
    if (offeredListing.status !== "ACTIVE") {
      return res.status(400).json({
        success: false,
        message: "Your offered item is no longer available.",
      });
    }

    if (requestedListing.status !== "ACTIVE") {
      return res.status(400).json({
        success: false,
        message: "The requested item is no longer available.",
      });
    }

    // Prevent duplicate pending offers
    const existingOffer = await prisma.offer.findFirst({
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
        success: false,
        message: "You already have a pending offer for this item.",
      });
    }

    // Create offer
    const offer = await prisma.offer.create({
      data: {
        senderId,
        receiverId,
        offeredListingId,
        requestedListingId,
        message: message?.trim() || null,
      },

      include: {
        sender: {
          select: {
            id: true,
            name: true,
            email: true,
            avatar: true,
          },
        },

        receiver: {
          select: {
            id: true,
            name: true,
            email: true,
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
      success: true,
      message: "Barter offer sent successfully.",
      offer,
    });
  } catch (error) {
    console.error("CREATE OFFER ERROR:", error);

    return res.status(500).json({
      success: false,
      message: "Unable to create barter offer.",
    });
  }
};

/**
 * GET SENT OFFERS
 * GET /api/offers/sent
 */
export const getSentOffers = async (req, res) => {
  try {
    const userId = req.user.id;

    const offers = await prisma.offer.findMany({
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
      success: true,
      offers,
    });
  } catch (error) {
    console.error("GET SENT OFFERS ERROR:", error);

    return res.status(500).json({
      success: false,
      message: "Unable to load sent offers.",
    });
  }
};

/**
 * GET RECEIVED OFFERS
 * GET /api/offers/received
 */
export const getReceivedOffers = async (req, res) => {
  try {
    const userId = req.user.id;

    const offers = await prisma.offer.findMany({
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
      success: true,
      offers,
    });
  } catch (error) {
    console.error("GET RECEIVED OFFERS ERROR:", error);

    return res.status(500).json({
      success: false,
      message: "Unable to load received offers.",
    });
  }
};

/**
 * GET SINGLE OFFER
 * GET /api/offers/:id
 */
export const getOffer = async (req, res) => {
  try {
    const userId = req.user.id;
    const { id } = req.params;

    const offer = await prisma.offer.findUnique({
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
        success: false,
        message: "Offer not found.",
      });
    }

    // Only participants can view offer
    if (
      offer.senderId !== userId &&
      offer.receiverId !== userId
    ) {
      return res.status(403).json({
        success: false,
        message: "You are not authorized to view this offer.",
      });
    }

    return res.status(200).json({
      success: true,
      offer,
    });
  } catch (error) {
    console.error("GET OFFER ERROR:", error);

    return res.status(500).json({
      success: false,
      message: "Unable to load offer.",
    });
  }
};

/**
 * ACCEPT OFFER
 * PATCH /api/offers/:id/accept
 */
export const acceptOffer = async (req, res) => {
  try {
    const userId = req.user.id;
    const { id } = req.params;

    const offer = await prisma.offer.findUnique({
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
        success: false,
        message: "Offer not found.",
      });
    }

    // Only receiver can accept
    if (offer.receiverId !== userId) {
      return res.status(403).json({
        success: false,
        message: "Only the item owner can accept this offer.",
      });
    }

    // Only pending offers can be accepted
    if (offer.status !== "PENDING") {
      return res.status(400).json({
        success: false,
        message: "Only pending offers can be accepted.",
      });
    }

    // Both listings must still be active
    if (offer.offeredListing.status !== "ACTIVE") {
      return res.status(400).json({
        success: false,
        message: "The offered item is no longer available.",
      });
    }

    if (offer.requestedListing.status !== "ACTIVE") {
      return res.status(400).json({
        success: false,
        message: "Your item is no longer available.",
      });
    }

    // Generate unique trade number
    const tradeNumber = `BT-${Date.now()}-${Math.floor(
      1000 + Math.random() * 9000
    )}`;

    /**
     * Everything below happens inside ONE transaction:
     *
     * 1. Accept offer
     * 2. Reserve both listings
     * 3. Reject competing pending offers
     * 4. Create trade
     * 5. Create trade items
     */
    const result = await prisma.$transaction(async (tx) => {
      // Accept offer
      const updatedOffer = await tx.offer.update({
        where: {
          id,
        },

        data: {
          status: "ACCEPTED",
        },
      });

      // Reserve offered listing
      await tx.listing.update({
        where: {
          id: offer.offeredListingId,
        },

        data: {
          status: "RESERVED",
        },
      });

      // Reserve requested listing
      await tx.listing.update({
        where: {
          id: offer.requestedListingId,
        },

        data: {
          status: "RESERVED",
        },
      });

      // Reject competing pending offers involving either listing
      await tx.offer.updateMany({
        where: {
          status: "PENDING",

          NOT: {
            id,
          },

          OR: [
            {
              requestedListingId: offer.requestedListingId,
            },
            {
              offeredListingId: offer.requestedListingId,
            },
            {
              requestedListingId: offer.offeredListingId,
            },
            {
              offeredListingId: offer.offeredListingId,
            },
          ],
        },

        data: {
          status: "REJECTED",
        },
      });

      // Create trade
      const trade = await tx.trade.create({
        data: {
          tradeNumber,
          offerId: offer.id,

          traderAId: offer.senderId,
          traderBId: offer.receiverId,

          status: "PENDING",

          agreedValueA:
            offer.offeredListing.estimatedValue,

          agreedValueB:
            offer.requestedListing.estimatedValue,

          items: {
            create: [
              {
                listingId: offer.offeredListingId,
                ownerId: offer.senderId,
                agreedValue:
                  offer.offeredListing.estimatedValue,
              },

              {
                listingId: offer.requestedListingId,
                ownerId: offer.receiverId,
                agreedValue:
                  offer.requestedListing.estimatedValue,
              },
            ],
          },
        },

        include: {
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

      return {
        offer: updatedOffer,
        trade,
      };
    });

    // Notify sender
    await prisma.notification.create({
      data: {
        userId: offer.senderId,
        type: "TRADE",
        title: "Offer accepted",
        message: `Your barter offer has been accepted. Trade ${result.trade.tradeNumber} has been created.`,
      },
    });

    return res.status(200).json({
      success: true,
      message: "Barter offer accepted successfully.",
      offer: result.offer,
      trade: result.trade,
    });
  } catch (error) {
    console.error("ACCEPT OFFER ERROR:", error);

    return res.status(500).json({
      success: false,
      message: "Unable to accept offer.",
    });
  }
};

/**
 * REJECT OFFER
 * PATCH /api/offers/:id/reject
 */
export const rejectOffer = async (req, res) => {
  try {
    const userId = req.user.id;
    const { id } = req.params;

    const offer = await prisma.offer.findUnique({
      where: {
        id,
      },
    });

    if (!offer) {
      return res.status(404).json({
        success: false,
        message: "Offer not found.",
      });
    }

    // Only receiver can reject
    if (offer.receiverId !== userId) {
      return res.status(403).json({
        success: false,
        message: "Only the receiver can reject this offer.",
      });
    }

    if (offer.status !== "PENDING") {
      return res.status(400).json({
        success: false,
        message: "Only pending offers can be rejected.",
      });
    }

    const updatedOffer = await prisma.offer.update({
      where: {
        id,
      },

      data: {
        status: "REJECTED",
      },
    });

    // Notify sender
    await prisma.notification.create({
      data: {
        userId: offer.senderId,
        type: "OFFER",
        title: "Offer rejected",
        message: "Your barter offer has been rejected.",
      },
    });

    return res.status(200).json({
      success: true,
      message: "Offer rejected successfully.",
      offer: updatedOffer,
    });
  } catch (error) {
    console.error("REJECT OFFER ERROR:", error);

    return res.status(500).json({
      success: false,
      message: "Unable to reject offer.",
    });
  }
};

/**
 * CANCEL OFFER
 * PATCH /api/offers/:id/cancel
 */
export const cancelOffer = async (req, res) => {
  try {
    const userId = req.user.id;
    const { id } = req.params;

    const offer = await prisma.offer.findUnique({
      where: {
        id,
      },
    });

    if (!offer) {
      return res.status(404).json({
        success: false,
        message: "Offer not found.",
      });
    }

    // Only sender can cancel
    if (offer.senderId !== userId) {
      return res.status(403).json({
        success: false,
        message: "Only the sender can cancel this offer.",
      });
    }

    if (offer.status !== "PENDING") {
      return res.status(400).json({
        success: false,
        message: "Only pending offers can be cancelled.",
      });
    }

    const updatedOffer = await prisma.offer.update({
      where: {
        id,
      },

      data: {
        status: "CANCELLED",
      },
    });

    // Notify receiver
    await prisma.notification.create({
      data: {
        userId: offer.receiverId,
        type: "OFFER",
        title: "Offer cancelled",
        message: "A barter offer you received has been cancelled.",
      },
    });

    return res.status(200).json({
      success: true,
      message: "Offer cancelled successfully.",
      offer: updatedOffer,
    });
  } catch (error) {
    console.error("CANCEL OFFER ERROR:", error);

    return res.status(500).json({
      success: false,
      message: "Unable to cancel offer.",
    });
  }
};

