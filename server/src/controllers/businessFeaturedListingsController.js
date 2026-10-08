
import prisma from "../config/prisma.js";

import {
  resolveBusinessStorefrontEntitlement,
} from "../services/businessStorefrontEntitlementService.js";

/*
 * ============================================================
 * BUSINESS PRO FEATURED LISTINGS CONTROLLER
 * ============================================================
 *
 * Security:
 * - Authentication is required.
 * - Only ACTIVE businesses can manage featured listings.
 * - Business Pro entitlement is checked server-side.
 * - Only ACTIVE listings owned by the business owner qualify.
 * - Maximum featured listing count comes from entitlement.
 * - Database transactions protect concurrent modifications.
 *
 * Featured storefront placement is separate from
 * paid marketplace listing promotions.
 */

/*
 * ============================================================
 * SHARED SELECT CONFIGURATION
 * ============================================================
 */

const LISTING_SELECT = {
  id: true,
  userId: true,
  title: true,
  description: true,
  status: true,
  condition: true,
  estimatedValue: true,
  location: true,
  createdAt: true,

  category: {
    select: {
      id: true,
      name: true,
    },
  },

  images: {
    orderBy: [
      { isPrimary: "desc" },
      { sortOrder: "asc" },
    ],

    select: {
      id: true,
      url: true,
      isPrimary: true,
      sortOrder: true,
    },
  },
};

/*
 * ============================================================
 * RESPONSE HELPERS
 * ============================================================
 */

const sendError = (
  res,
  status,
  code,
  message,
  extra = {}
) => {
  return res.status(status).json({
    success: false,
    code,
    message,
    ...extra,
  });
};

const handleControllerError = (
  res,
  error,
  operation
) => {
  console.error(
    `BUSINESS FEATURED LISTINGS ${operation} ERROR:`,
    error
  );

  return sendError(
    res,
    500,
    "BUSINESS_FEATURED_LISTINGS_ERROR",
    "Unable to process featured listings request."
  );
};

/*
 * ============================================================
 * BUSINESS ACCESS RESOLVER
 * ============================================================
 */

const resolveAccess = async (req) => {
  const userId = req.user?.id;

  if (!userId) {
    return {
      error: {
        status: 401,
        code: "AUTHENTICATION_REQUIRED",
        message: "Authentication required.",
      },
    };
  }

  const business =
    await prisma.businessProfile.findUnique({
      where: {
        userId,
      },

      select: {
        id: true,
        userId: true,
        businessName: true,
        slug: true,
        status: true,
      },
    });

  if (!business) {
    return {
      error: {
        status: 404,
        code: "BUSINESS_NOT_FOUND",
        message: "Business account not found.",
      },
    };
  }

  if (business.status !== "ACTIVE") {
    return {
      error: {
        status: 403,
        code: "BUSINESS_NOT_ACTIVE",
        message:
          "Your business must be active to manage featured listings.",
      },
    };
  }

  const entitlement =
    await resolveBusinessStorefrontEntitlement(userId);

  const canManage = Boolean(
    entitlement?.businessId === business.id &&
    entitlement?.isBusinessPro === true &&
    entitlement?.features?.featuredListings === true
  );

  const configuredLimit =
    entitlement?.features?.maxFeaturedListings;

  const maxFeaturedListings =
    Number.isInteger(configuredLimit) &&
    configuredLimit >= 0
      ? configuredLimit
      : 0;

  return {
    business,
    entitlement,
    canManage,
    maxFeaturedListings,
  };
};

/*
 * ============================================================
 * REQUIRE BUSINESS PRO
 * ============================================================
 */

const requireBusinessPro = (access, res) => {
  if (access.canManage) {
    return true;
  }

  sendError(
    res,
    403,
    "BUSINESS_PRO_REQUIRED",
    "An active Business Pro subscription is required to manage featured listings.",
    {
      upgradeRequired: true,
    }
  );

  return false;
};

/*
 * ============================================================
 * NORMALIZE FEATURED RECORD
 * ============================================================
 */

const normalizeFeaturedListing = (record) => ({
  id: record.id,
  listingId: record.listingId,
  sortOrder: record.sortOrder,
  createdAt: record.createdAt,
  updatedAt: record.updatedAt,
  listing: record.listing,
});

/*
 * ============================================================
 * GET FEATURED LISTINGS AND ELIGIBLE LISTINGS
 *
 * GET /api/business/me/storefront/featured-listings
 * ============================================================
 */

export const getMyBusinessFeaturedListings = async (
  req,
  res
) => {
  try {
    const access = await resolveAccess(req);

    if (access.error) {
      return sendError(
        res,
        access.error.status,
        access.error.code,
        access.error.message
      );
    }

    const {
      business,
      canManage,
      maxFeaturedListings,
    } = access;

    const featuredRecords =
      await prisma.businessFeaturedListing.findMany({
        where: {
          businessId: business.id,
        },

        orderBy: [
          { sortOrder: "asc" },
          { createdAt: "asc" },
          { id: "asc" },
        ],

        include: {
          listing: {
            select: LISTING_SELECT,
          },
        },
      });

    const eligibleListings =
      await prisma.listing.findMany({
        where: {
          userId: business.userId,
          status: "ACTIVE",
        },

        orderBy: {
          createdAt: "desc",
        },

        select: LISTING_SELECT,
      });

    const featuredListings = featuredRecords
      .filter(
        (record) =>
          record.listing.userId === business.userId &&
          record.listing.status === "ACTIVE"
      )
      .map(normalizeFeaturedListing);

    const featuredIds = new Set(
      featuredListings.map(
        (record) => record.listingId
      )
    );

    return res.status(200).json({
      success: true,

      business: {
        id: business.id,
        businessName: business.businessName,
        slug: business.slug,
      },

      access: {
        tier: canManage
          ? "BUSINESS_PRO"
          : "BUSINESS_FREE",

        canManageFeaturedListings: canManage,
        maxFeaturedListings,
      },

      featuredListings,

      eligibleListings: eligibleListings.map(
        (listing) => ({
          ...listing,
          isFeatured: featuredIds.has(listing.id),
        })
      ),

      summary: {
        featuredCount: featuredListings.length,
        maxFeaturedListings,
        remainingSlots: canManage
          ? Math.max(
              0,
              maxFeaturedListings -
                featuredListings.length
            )
          : 0,
      },
    });
  } catch (error) {
    return handleControllerError(
      res,
      error,
      "GET"
    );
  }
};

/*
 * ============================================================
 * ADD FEATURED LISTING
 *
 * POST /api/business/me/storefront/featured-listings
 *
 * Body:
 * {
 *   "listingId": "listing-uuid"
 * }
 * ============================================================
 */

export const addMyBusinessFeaturedListing = async (
  req,
  res
) => {
  try {
    const access = await resolveAccess(req);

    if (access.error) {
      return sendError(
        res,
        access.error.status,
        access.error.code,
        access.error.message
      );
    }

    if (!requireBusinessPro(access, res)) {
      return;
    }

    const { business, maxFeaturedListings } =
      access;

    const { listingId } = req.body || {};

    if (
      typeof listingId !== "string" ||
      !listingId.trim()
    ) {
      return sendError(
        res,
        400,
        "INVALID_LISTING_ID",
        "A valid listing ID is required."
      );
    }

    const normalizedListingId = listingId.trim();

    const listing = await prisma.listing.findFirst({
      where: {
        id: normalizedListingId,
        userId: business.userId,
        status: "ACTIVE",
      },

      select: {
        id: true,
      },
    });

    if (!listing) {
      return sendError(
        res,
        404,
        "ELIGIBLE_LISTING_NOT_FOUND",
        "An active listing owned by this business was not found."
      );
    }

    const result = await prisma.$transaction(
      async (tx) => {
        /*
         * Serialize featured-list modifications for
         * this business using a row-level lock.
         *
         * The BusinessProfile row is the lock target,
         * ensuring concurrent additions and removals
         * cannot bypass the configured limit.
         */
        await tx.$queryRaw`
          SELECT id
          FROM "BusinessProfile"
          WHERE id = ${business.id}
          FOR UPDATE
        `;

        const existing =
          await tx.businessFeaturedListing.findUnique({
            where: {
              businessId_listingId: {
                businessId: business.id,
                listingId: normalizedListingId,
              },
            },
          });

        if (existing) {
          return {
            error: {
              status: 409,
              code: "LISTING_ALREADY_FEATURED",
              message:
                "This listing is already featured.",
            },
          };
        }

        /*
         * Revalidate listing status and ownership
         * inside the transaction.
         */
        const currentListing =
          await tx.listing.findFirst({
            where: {
              id: normalizedListingId,
              userId: business.userId,
              status: "ACTIVE",
            },

            select: {
              id: true,
            },
          });

        if (!currentListing) {
          return {
            error: {
              status: 404,
              code: "ELIGIBLE_LISTING_NOT_FOUND",
              message:
                "The listing is no longer eligible.",
            },
          };
        }

        const featuredCount =
          await tx.businessFeaturedListing.count({
            where: {
              businessId: business.id,
            },
          });

        if (
          featuredCount >= maxFeaturedListings
        ) {
          return {
            error: {
              status: 409,
              code: "FEATURED_LISTING_LIMIT_REACHED",
              message:
                `You can feature a maximum of ${maxFeaturedListings} listings.`,
              maxFeaturedListings,
            },
          };
        }

        const lastFeatured =
          await tx.businessFeaturedListing.findFirst({
            where: {
              businessId: business.id,
            },

            orderBy: [
              { sortOrder: "desc" },
              { id: "desc" },
            ],

            select: {
              sortOrder: true,
            },
          });

        const sortOrder =
          (lastFeatured?.sortOrder ?? -1) + 1;

        const created =
          await tx.businessFeaturedListing.create({
            data: {
              businessId: business.id,
              listingId: normalizedListingId,
              sortOrder,
            },

            include: {
              listing: {
                select: LISTING_SELECT,
              },
            },
          });

        return {
          created,
        };
      }
    );

    if (result.error) {
      return sendError(
        res,
        result.error.status,
        result.error.code,
        result.error.message,
        result.error.maxFeaturedListings === undefined
          ? {}
          : {
              maxFeaturedListings:
                result.error.maxFeaturedListings,
            }
      );
    }

    return res.status(201).json({
      success: true,
      message:
        "Listing added to featured storefront listings.",
      featuredListing:
        normalizeFeaturedListing(result.created),
    });
  } catch (error) {
    if (error?.code === "P2002") {
      return sendError(
        res,
        409,
        "LISTING_ALREADY_FEATURED",
        "This listing is already featured."
      );
    }

    return handleControllerError(
      res,
      error,
      "ADD"
    );
  }
};

/*
 * ============================================================
 * REMOVE FEATURED LISTING
 *
 * DELETE /api/business/me/storefront/featured-listings/:listingId
 * ============================================================
 */

export const removeMyBusinessFeaturedListing = async (
  req,
  res
) => {
  try {
    const access = await resolveAccess(req);

    if (access.error) {
      return sendError(
        res,
        access.error.status,
        access.error.code,
        access.error.message
      );
    }

    if (!requireBusinessPro(access, res)) {
      return;
    }

    const listingId = req.params?.listingId;

    if (
      typeof listingId !== "string" ||
      !listingId.trim()
    ) {
      return sendError(
        res,
        400,
        "INVALID_LISTING_ID",
        "A valid listing ID is required."
      );
    }

    const deleted =
      await prisma.businessFeaturedListing.deleteMany({
        where: {
          businessId: access.business.id,
          listingId: listingId.trim(),
        },
      });

    if (deleted.count === 0) {
      return sendError(
        res,
        404,
        "FEATURED_LISTING_NOT_FOUND",
        "Featured listing not found."
      );
    }

    return res.status(200).json({
      success: true,
      message:
        "Listing removed from featured storefront listings.",
    });
  } catch (error) {
    return handleControllerError(
      res,
      error,
      "REMOVE"
    );
  }
};

/*
 * ============================================================
 * REORDER FEATURED LISTINGS
 *
 * PATCH /api/business/me/storefront/featured-listings/reorder
 *
 * Body:
 * {
 *   "listingIds": [
 *     "listing-id-1",
 *     "listing-id-2"
 *   ]
 * }
 * ============================================================
 */

export const reorderMyBusinessFeaturedListings = async (
  req,
  res
) => {
  try {
    const access = await resolveAccess(req);

    if (access.error) {
      return sendError(
        res,
        access.error.status,
        access.error.code,
        access.error.message
      );
    }

    if (!requireBusinessPro(access, res)) {
      return;
    }

    const { listingIds } = req.body || {};

    if (
      !Array.isArray(listingIds) ||
      listingIds.length === 0 ||
      listingIds.some(
        (id) =>
          typeof id !== "string" ||
          !id.trim()
      )
    ) {
      return sendError(
        res,
        400,
        "INVALID_FEATURED_ORDER",
        "A non-empty array of listing IDs is required."
      );
    }

    const normalizedIds =
      listingIds.map((id) => id.trim());

    if (
      new Set(normalizedIds).size !==
      normalizedIds.length
    ) {
      return sendError(
        res,
        400,
        "DUPLICATE_LISTING_IDS",
        "Duplicate listing IDs are not allowed."
      );
    }

    if (
      normalizedIds.length >
      access.maxFeaturedListings
    ) {
      return sendError(
        res,
        400,
        "FEATURED_LISTING_LIMIT_EXCEEDED",
        "The submitted order exceeds your featured listing limit."
      );
    }

    const result = await prisma.$transaction(
      async (tx) => {
        await tx.$queryRaw`
          SELECT id
          FROM "BusinessProfile"
          WHERE id = ${access.business.id}
          FOR UPDATE
        `;

        const existing =
          await tx.businessFeaturedListing.findMany({
            where: {
              businessId: access.business.id,
            },

            select: {
              listingId: true,
            },
          });

        const existingIds = new Set(
          existing.map((item) => item.listingId)
        );

        /*
         * Reordering must contain exactly the existing
         * featured listings, without adding or omitting.
         */
        const isExactSet =
          existingIds.size ===
            normalizedIds.length &&
          normalizedIds.every((id) =>
            existingIds.has(id)
          );

        if (!isExactSet) {
          return {
            error: {
              status: 400,
              code: "FEATURED_ORDER_MISMATCH",
              message:
                "The order must contain exactly the current featured listings.",
            },
          };
        }

        for (
          let index = 0;
          index < normalizedIds.length;
          index += 1
        ) {
          await tx.businessFeaturedListing.update({
            where: {
              businessId_listingId: {
                businessId: access.business.id,
                listingId: normalizedIds[index],
              },
            },

            data: {
              sortOrder: index,
            },
          });
        }

        const updated =
          await tx.businessFeaturedListing.findMany({
            where: {
              businessId: access.business.id,
            },

            orderBy: [
              { sortOrder: "asc" },
              { id: "asc" },
            ],

            include: {
              listing: {
                select: LISTING_SELECT,
              },
            },
          });

        return {
          updated,
        };
      }
    );

    if (result.error) {
      return sendError(
        res,
        result.error.status,
        result.error.code,
        result.error.message
      );
    }

    return res.status(200).json({
      success: true,
      message:
        "Featured listing order updated successfully.",
      featuredListings:
        result.updated.map(normalizeFeaturedListing),
    });
  } catch (error) {
    return handleControllerError(
      res,
      error,
      "REORDER"
    );
  }
};

/*
 * ============================================================
 * FEATURED LISTING SUMMARY
 *
 * GET /api/business/me/storefront/featured-listings/summary
 * ============================================================
 */

export const getMyBusinessFeaturedListingSummary = async (
  req,
  res
) => {
  try {
    const access = await resolveAccess(req);

    if (access.error) {
      return sendError(
        res,
        access.error.status,
        access.error.code,
        access.error.message
      );
    }

    const featuredCount =
      await prisma.businessFeaturedListing.count({
        where: {
          businessId: access.business.id,

          listing: {
            userId: access.business.userId,
            status: "ACTIVE",
          },
        },
      });

    return res.status(200).json({
      success: true,

      tier: access.canManage
        ? "BUSINESS_PRO"
        : "BUSINESS_FREE",

      canManageFeaturedListings:
        access.canManage,

      featuredCount,

      maxFeaturedListings:
        access.maxFeaturedListings,

      remainingSlots: access.canManage
        ? Math.max(
            0,
            access.maxFeaturedListings -
              featuredCount
          )
        : 0,
    });
  } catch (error) {
    return handleControllerError(
      res,
      error,
      "SUMMARY"
    );
  }
};
