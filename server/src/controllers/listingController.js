import prisma from "../config/prisma.js";
import uploadToCloudinary from "../utils/uploadToCloudinary.js";
import cloudinary from "../config/cloudinary.js";
import { getCache, setCache } from "../utils/redisCache.js";
import {invalidateListingCache, invalidateAllListingsCache,} from "../utils/listingCache.js";
import { trackListingView} from "../services/businessAnalyticsTrackingService.js";
import { expirePromotions } from "../services/promotionExpiryService.js";
import { getListingLimit } from "../services/premiumEntitlementService.js";

const getActivePremiumSubscriptionSelect = (now) => ({
  where: {
    plan: "PREMIUM",
    status: "ACTIVE",
    startsAt: {
      lte: now,
    },
    endsAt: {
      gt: now,
    },
  },

  orderBy: {
    endsAt: "desc",
  },

  take: 1,

  select: {
    id: true,
    plan: true,
    startsAt: true,
    endsAt: true,
  },
});

/*
 * ============================================================
 * BUSINESS PROFILE SELECT
 * ============================================================
 *
 * Business state is derived from the seller's BusinessProfile.
 *
 * We intentionally select status here because a Business
 * Profile only becomes public Business identity while ACTIVE.
 *
 * We do NOT store isBusiness on Listing.
 */
const getBusinessProfileSelect = () => ({
  select: {
    id: true,
    businessName: true,
    slug: true,
    logo: true,
    category: true,
    location: true,
    status: true,
    verificationStatus: true,
    verifiedAt: true,
  },
});

/*
 * ============================================================
 * NORMALIZE LISTING USER
 * ============================================================
 *
 * This remains the central seller normalizer.
 *
 * It now handles BOTH:
 *
 * - Premium presentation state
 * - Business presentation state
 *
 * Raw subscriptions and raw BusinessProfile are removed from
 * the final public listing response.
 */
const normalizeListingUser = (user) => {
  if (!user) {
    return user;
  }

  const {
    subscriptions = [],
    businessProfile = null,
    ...safeUser
  } = user;

  const activeSubscription =
    subscriptions[0] || null;

  const isBusiness =
    businessProfile?.status ===
    "ACTIVE";

  return {
    ...safeUser,

    /*
     * PREMIUM
     */

    isPremium: Boolean(
      activeSubscription
    ),

    premiumPlan:
      activeSubscription?.plan ||
      null,

    premiumStartedAt:
      activeSubscription?.startsAt ||
      null,

    premiumEndsAt:
      activeSubscription?.endsAt ||
      null,

    /*
     * BUSINESS
     */

    business: isBusiness
      ? {
          isBusiness: true,

          businessName:
            businessProfile.businessName,

          slug:
            businessProfile.slug,

          logo:
            businessProfile.logo,

          category:
            businessProfile.category,

          location:
            businessProfile.location,

          verificationStatus:
            businessProfile.verificationStatus,

          isVerified:
            businessProfile.verificationStatus ===
            "VERIFIED",
        }
      : {
          isBusiness: false,
          businessName: null,
          slug: null,
          logo: null,
          category: null,
          location: null,
          verificationStatus: null,
          isVerified: false,
        },
  };
};

const normalizeListingPremiumUser = (
  listing
) => {
  if (!listing) {
    return listing;
  }

  return {
    ...listing,

    user: normalizeListingUser(
      listing.user
    ),
  };
};

const validConditions = [
  "NEW",
  "LIKE_NEW",
  "GOOD",
  "FAIR",
  "POOR",
];

/* =========================================================
   CREATE LISTING
========================================================= */

export const createListing = async (
  req,
  res
) => {
  try {
    const userId = req.user.id;

    /*
     * FREE    = 10 active listings
     * PREMIUM = 30 active listings
     *
     * Business Account does NOT change listing allowance.
     */
    const {
      isPremium,
      tier,
      limit,
    } = await getListingLimit(userId);

    const activeListingCount =
      await prisma.listing.count({
        where: {
          userId,
          status: "ACTIVE",
        },
      });

    if (
      activeListingCount >= limit
    ) {
      return res.status(403).json({
        success: false,

        code:
          "ACTIVE_LISTING_LIMIT_REACHED",

        message: isPremium
          ? `You have reached your Premium limit of ${limit} active listings.`
          : `Free accounts can have up to ${limit} active listings. Upgrade to Premium for up to 30 active listings.`,

        listingLimit: {
          tier,
          isPremium,
          limit,
          active:
            activeListingCount,
          remaining: 0,
        },
      });
    }

    const now = new Date();

    const {
      categoryId,
      title,
      description,
      condition,
      estimatedValue,
      minimumValue,
      maximumValue,
      location,
      latitude,
      longitude,
    } = req.body;

    if (
      !categoryId ||
      !title ||
      !description ||
      !condition ||
      estimatedValue === undefined
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Category, title, description, condition and estimated value are required",
      });
    }

    if (
      !validConditions.includes(
        condition
      )
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Invalid item condition",
      });
    }

    const value =
      Number(estimatedValue);

    if (
      !Number.isFinite(value) ||
      value <= 0
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Estimated value must be greater than zero",
      });
    }

    if (
      minimumValue !== undefined &&
      minimumValue !== null &&
      Number(minimumValue) < 0
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Minimum value cannot be negative",
      });
    }

    if (
      maximumValue !== undefined &&
      maximumValue !== null &&
      Number(maximumValue) < 0
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Maximum value cannot be negative",
      });
    }

    if (
      minimumValue !== undefined &&
      minimumValue !== null &&
      maximumValue !== undefined &&
      maximumValue !== null &&
      Number(minimumValue) >
        Number(maximumValue)
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Minimum value cannot exceed maximum value",
      });
    }

    const category =
      await prisma.category.findUnique({
        where: {
          id: categoryId,
        },
      });

    if (!category) {
      return res.status(404).json({
        success: false,
        message:
          "Category not found",
      });
    }

    let uploadedImages = [];

    if (
      req.files &&
      req.files.length > 0
    ) {
      try {
        uploadedImages =
          await Promise.all(
            req.files.map(
              async (file) => {
                const result =
                  await uploadToCloudinary(
                    file.buffer,
                    "barter-trade/listings"
                  );

                return {
                  url:
                    result.secure_url,

                  publicId:
                    result.public_id,
                };
              }
            )
          );
      } catch (uploadError) {
        console.error(
          "CLOUDINARY UPLOAD ERROR:",
          uploadError
        );

        return res
          .status(500)
          .json({
            success: false,
            message:
              "Unable to upload listing images",
          });
      }
    }

    const listing =
      await prisma.listing.create({
        data: {
          userId,
          categoryId,

          title:
            title.trim(),

          description:
            description.trim(),

          condition,

          estimatedValue:
            value,

          minimumValue:
            minimumValue !==
              undefined &&
            minimumValue !== null
              ? Number(
                  minimumValue
                )
              : null,

          maximumValue:
            maximumValue !==
              undefined &&
            maximumValue !== null
              ? Number(
                  maximumValue
                )
              : null,

          location:
            location?.trim() ||
            null,

          latitude:
            latitude !==
              undefined &&
            latitude !== null
              ? Number(latitude)
              : null,

          longitude:
            longitude !==
              undefined &&
            longitude !== null
              ? Number(longitude)
              : null,

          images:
            uploadedImages.length >
            0
              ? {
                  create:
                    uploadedImages,
                }
              : undefined,
        },

        include: {
          category: true,
          images: true,

          user: {
            select: {
              id: true,
              name: true,
              avatar: true,
              barterScore: true,
              completedTrades:
                true,

              subscriptions:
                getActivePremiumSubscriptionSelect(
                  now
                ),

              businessProfile:
                getBusinessProfileSelect(),
            },
          },
        },
      });

    await invalidateAllListingsCache();

    const updatedActiveCount =
      activeListingCount + 1;

    const remaining =
      Math.max(
        0,
        limit -
          updatedActiveCount
      );

    return res
      .status(201)
      .json({
        success: true,

        message:
          "Listing created successfully",

        listing:
          normalizeListingPremiumUser(
            listing
          ),

        listingLimit: {
          tier,
          isPremium,
          limit,
          active:
            updatedActiveCount,
          remaining,
        },
      });
  } catch (error) {
    console.error(
      "CREATE LISTING ERROR:",
      error
    );

    return res
      .status(500)
      .json({
        success: false,
        message:
          "Unable to create listing",
      });
  }
};

/* =========================================================
   GET MARKETPLACE LISTINGS
========================================================= */

export const getListings = async (
  req,
  res
) => {
  try {
    const {
      search,
      categoryId,
      condition,
      minValue,
      maxValue,
      location,
      page = 1,
      limit = 12,
    } = req.query;

    await expirePromotions();

    const pageNumber =
      Math.max(
        Number(page) || 1,
        1
      );

    const limitNumber =
      Math.min(
        Math.max(
          Number(limit) || 12,
          1
        ),
        50
      );

    const skip =
      (pageNumber - 1) *
      limitNumber;

    const where = {
      status: "ACTIVE",
    };

    if (categoryId) {
      where.categoryId =
        categoryId;
    }

    if (condition) {
      where.condition =
        condition;
    }

    if (location) {
      where.location = {
        contains: location,
        mode: "insensitive",
      };
    }

    if (search) {
      where.OR = [
        {
          title: {
            contains: search,
            mode: "insensitive",
          },
        },
        {
          description: {
            contains: search,
            mode: "insensitive",
          },
        },
      ];
    }

    if (
      minValue ||
      maxValue
    ) {
      where.estimatedValue = {};

      if (minValue) {
        where.estimatedValue.gte =
          Number(minValue);
      }

      if (maxValue) {
        where.estimatedValue.lte =
          Number(maxValue);
      }
    }

    const now = new Date();

    /*
     * ========================================================
     * PROMOTED LISTINGS
     * ========================================================
     */

    const promotedListings =
      await prisma.listing.findMany({
        where: {
          ...where,

          promotions: {
            some: {
              status:
                "ACTIVE",

              startsAt: {
                lte: now,
              },

              endsAt: {
                gt: now,
              },

              type: {
                in: [
                  "FEATURED",
                  "BOOST",
                ],
              },
            },
          },
        },

        include: {
          category: true,

          images: {
            take: 1,

            orderBy: [
              {
                isPrimary:
                  "desc",
              },
              {
                sortOrder:
                  "asc",
              },
            ],
          },

          user: {
            select: {
              id: true,
              name: true,
              avatar: true,
              barterScore:
                true,
              completedTrades:
                true,

              subscriptions:
                getActivePremiumSubscriptionSelect(
                  now
                ),

              businessProfile:
                getBusinessProfileSelect(),
            },
          },

          promotions: {
            where: {
              status:
                "ACTIVE",

              startsAt: {
                lte: now,
              },

              endsAt: {
                gt: now,
              },

              type: {
                in: [
                  "FEATURED",
                  "BOOST",
                ],
              },
            },

            orderBy: {
              endsAt:
                "desc",
            },
          },
        },
      });

    const getPromotionPriority = (
      promotion
    ) => {
      if (
        promotion?.type ===
        "FEATURED"
      ) {
        return 2;
      }

      if (
        promotion?.type ===
        "BOOST"
      ) {
        return 1;
      }

      return 0;
    };

    const promotedListingsWithMeta =
      promotedListings.map(
        (listing) => {
          const activePromotion =
            [
              ...(
                listing.promotions ||
                []
              ),
            ].sort(
              (a, b) =>
                getPromotionPriority(
                  b
                ) -
                getPromotionPriority(
                  a
                )
            )[0] || null;

          const normalizedUser =
            normalizeListingUser(
              listing.user
            );

          if (
            !activePromotion
          ) {
            return {
              ...listing,

              user:
                normalizedUser,

              activePromotion:
                null,

              promotionId:
                null,

              promotionType:
                null,

              isPromoted:
                false,
            };
          }

          return {
            ...listing,

            user:
              normalizedUser,

            activePromotion: {
              id:
                activePromotion.id,

              type:
                activePromotion.type,

              startsAt:
                activePromotion.startsAt,

              endsAt:
                activePromotion.endsAt,

              durationDays:
                activePromotion.durationDays,
            },

            promotionId:
              activePromotion.id,

            promotionType:
              activePromotion.type,

            isPromoted: true,
          };
        }
      );

    promotedListingsWithMeta.sort(
      (a, b) => {
        const priorityDifference =
          getPromotionPriority(
            b.activePromotion
          ) -
          getPromotionPriority(
            a.activePromotion
          );

        if (
          priorityDifference !==
          0
        ) {
          return priorityDifference;
        }

        const endA =
          a.activePromotion
            ?.endsAt
            ? new Date(
                a.activePromotion
                  .endsAt
              ).getTime()
            : 0;

        const endB =
          b.activePromotion
            ?.endsAt
            ? new Date(
                b.activePromotion
                  .endsAt
              ).getTime()
            : 0;

        if (
          endA !== endB
        ) {
          return endB - endA;
        }

        return (
          new Date(
            b.createdAt
          ).getTime() -
          new Date(
            a.createdAt
          ).getTime()
        );
      }
    );

    const promotedListingIds =
      promotedListingsWithMeta
        .filter(
          (listing) =>
            listing.isPromoted
        )
        .map(
          (listing) =>
            listing.id
        );

    /*
     * ========================================================
     * NORMAL LISTINGS
     * ========================================================
     */

    const normalWhere = {
      ...where,

      ...(promotedListingIds
        .length > 0
        ? {
            id: {
              notIn:
                promotedListingIds,
            },
          }
        : {}),
    };

    const normalTotal =
      await prisma.listing.count({
        where:
          normalWhere,
      });

    const promotedPage =
      promotedListingsWithMeta.slice(
        skip,
        skip + limitNumber
      );

    const normalSkip =
      Math.max(
        skip -
          promotedListingsWithMeta
            .length,
        0
      );

    const remainingSlots =
      limitNumber -
      promotedPage.length;

    let normalListings = [];

    if (
      remainingSlots > 0
    ) {
      normalListings =
        await prisma.listing.findMany({
          where:
            normalWhere,

          skip:
            normalSkip,

          take:
            remainingSlots,

          orderBy: {
            createdAt:
              "desc",
          },

          include: {
            category: true,

            images: {
              take: 1,

              orderBy: [
                {
                  isPrimary:
                    "desc",
                },
                {
                  sortOrder:
                    "asc",
                },
              ],
            },

            user: {
              select: {
                id: true,
                name: true,
                avatar: true,
                barterScore:
                  true,
                completedTrades:
                  true,

                subscriptions:
                  getActivePremiumSubscriptionSelect(
                    now
                  ),

                businessProfile:
                  getBusinessProfileSelect(),
              },
            },

            promotions: {
              where: {
                status:
                  "ACTIVE",

                startsAt: {
                  lte: now,
                },

                endsAt: {
                  gt: now,
                },

                type: {
                  in: [
                    "FEATURED",
                    "BOOST",
                  ],
                },
              },

              orderBy: {
                endsAt:
                  "desc",
              },
            },
          },
        });

      normalListings =
        normalListings.map(
          (listing) => ({
            ...listing,

            user:
              normalizeListingUser(
                listing.user
              ),

            activePromotion:
              null,

            promotionId:
              null,

            promotionType:
              null,

            isPromoted:
              false,
          })
        );
    }

    const listings = [
      ...promotedPage,
      ...normalListings,
    ];

    const total =
      promotedListingsWithMeta
        .length +
      normalTotal;

    return res
      .status(200)
      .json({
        success: true,

        listings,

        pagination: {
          page:
            pageNumber,

          limit:
            limitNumber,

          total,

          pages:
            Math.ceil(
              total /
                limitNumber
            ),
        },
      });
  } catch (error) {
    console.error(
      "GET LISTINGS ERROR:",
      error
    );

    return res
      .status(500)
      .json({
        success: false,
        message:
          "Unable to fetch listings",
      });
  }
};
// UPDATE — server/src/controllers/listingController.js

/**
 * =========================================================
 * TRACK BUSINESS LISTING VIEW
 * =========================================================
 *
 * Analytics are intentionally fail-open.
 *
 * A listing response must never fail simply because
 * analytics could not be recorded.
 *
 * trackListingView() itself determines whether:
 *
 * - the listing belongs to an ACTIVE business
 * - the visitor is the business owner
 * - the view is a recent duplicate
 *
 * Personal listings therefore pass safely through this
 * helper without creating BusinessAnalyticsEvent records.
 */
const trackBusinessListingView = (
  req,
  listingId
) => {
  if (!listingId) {
    return;
  }

  trackListingView({
    listingId,

    visitorUserId:
      req.analyticsVisitor
        ?.visitorUserId || null,

    visitorKey:
      req.analyticsVisitor
        ?.visitorKey || null,

    sessionKey:
      req.analyticsVisitor
        ?.sessionKey || null,

    metadata: {
      source: "LISTING_DETAILS",
    },
  }).catch((error) => {
    console.error(
      "BUSINESS LISTING VIEW ANALYTICS ERROR:",
      error
    );
  });
};
/* =========================================================
   GET ONE LISTING
========================================================= */

export const getListingById =
  async (req, res) => {
    try {
      const { id } =
        req.params;

      const now =
        new Date();

      const cacheKey =
        `listing:${id}`;

      const cachedListing =
        await getCache(
          cacheKey
        );

      /*
       * IMPORTANT:
       *
       * The listing itself may remain cached for 5 minutes.
       *
       * Premium AND Business state are time/state-sensitive.
       *
       * Therefore, even on a Redis cache hit, we re-check:
       *
       * - Current Premium subscription
       * - Current BusinessProfile
       *
       * This prevents stale badges after:
       *
       * - Premium activation
       * - Premium expiry
       * - Premium renewal
       * - Business creation
       * - Business closure
       * - Business reactivation
       * - Business suspension
       * - Verification status changes
       *
       * without throwing away the useful listing cache.
       */
      if (cachedListing) {
        const cachedSellerId =
          cachedListing
            ?.listing
            ?.user
            ?.id;

        if (cachedSellerId) {
          /*
           * CURRENT PREMIUM STATE
           */

          const activeSubscription =
            await prisma.subscription.findFirst(
              {
                where: {
                  userId:
                    cachedSellerId,

                  plan:
                    "PREMIUM",

                  status:
                    "ACTIVE",

                  startsAt: {
                    lte: now,
                  },

                  endsAt: {
                    gt: now,
                  },
                },

                orderBy: {
                  endsAt:
                    "desc",
                },

                select: {
                  plan: true,

                  startsAt:
                    true,

                  endsAt:
                    true,
                },
              }
            );

          /*
           * CURRENT BUSINESS STATE
           */

          const currentBusinessProfile =
            await prisma.businessProfile.findUnique(
              {
                where: {
                  userId:
                    cachedSellerId,
                },

                select: {
                  id: true,

                  businessName:
                    true,

                  slug:
                    true,

                  logo:
                    true,

                  category:
                    true,

                  location:
                    true,

                  status:
                    true,

                  verificationStatus:
                    true,

                  verifiedAt:
                    true,
                },
              }
            );

          const isBusiness =
            currentBusinessProfile
              ?.status ===
            "ACTIVE";

          /*
           * REFRESH PRESENTATION STATE
           */

          cachedListing.listing.user =
            {
              ...cachedListing
                .listing
                .user,

              /*
               * Premium
               */

              isPremium:
                Boolean(
                  activeSubscription
                ),

              premiumPlan:
                activeSubscription
                  ?.plan ||
                null,

              premiumStartedAt:
                activeSubscription
                  ?.startsAt ||
                null,

              premiumEndsAt:
                activeSubscription
                  ?.endsAt ||
                null,

              /*
               * Business
               */

              business:
                isBusiness
                  ? {
                      isBusiness:
                        true,

                      businessName:
                        currentBusinessProfile
                          .businessName,

                      slug:
                        currentBusinessProfile
                          .slug,

                      logo:
                        currentBusinessProfile
                          .logo,

                      category:
                        currentBusinessProfile
                          .category,

                      location:
                        currentBusinessProfile
                          .location,

                      verificationStatus:
                        currentBusinessProfile
                          .verificationStatus,

                      isVerified:
                        currentBusinessProfile
                          .verificationStatus ===
                        "VERIFIED",
                    }
                  : {
                      isBusiness:
                        false,

                      businessName:
                        null,

                      slug:
                        null,

                      logo:
                        null,

                      category:
                        null,

                      location:
                        null,

                      verificationStatus:
                        null,

                      isVerified:
                        false,
                    },
            };
        }

        trackBusinessListingView(
          req,
          id
        );

        return res.json(
          cachedListing
        );
      }

      /*
       * ======================================================
       * DATABASE LISTING
       * ======================================================
       */

      const listing =
        await prisma.listing.findUnique(
          {
            where: {
              id,
            },

            include: {
              category:
                true,

              images: {
                orderBy: [
                  {
                    isPrimary:
                      "desc",
                  },
                  {
                    sortOrder:
                      "asc",
                  },
                ],
              },

              user: {
                select: {
                  id: true,

                  name:
                    true,

                  avatar:
                    true,

                  bio:
                    true,

                  location:
                    true,

                  barterScore:
                    true,

                  completedTrades:
                    true,

                  createdAt:
                    true,

                  subscriptions:
                    getActivePremiumSubscriptionSelect(
                      now
                    ),

                  businessProfile:
                    getBusinessProfileSelect(),
                },
              },
            },
          }
        );

      if (!listing) {
        return res
          .status(404)
          .json({
            success: false,
            message:
              "Listing not found",
          });
      }

      const normalizedListing =
        normalizeListingPremiumUser(
          listing
        );

      const responseData = {
        success: true,

        listing:
          normalizedListing,
      };

      await setCache(
        cacheKey,
        responseData,
        300
      );
      
      trackBusinessListingView(
        req,
        id
      );

      return res.json(
        responseData
      );
    } catch (error) {
      console.error(
        "GET LISTING ERROR:",
        error
      );

      return res
        .status(500)
        .json({
          success: false,
          message:
            "Unable to fetch listing",
        });
    }
  };

/* =========================================================
   GET MY LISTINGS
========================================================= */

export const getMyListings =
  async (req, res) => {
    try {
      /*
       * We intentionally keep this endpoint lightweight.
       *
       * The authenticated owner already knows their account
       * identity and this endpoint previously did not include
       * the User relation.
       *
       * Therefore BusinessProfile is NOT unnecessarily added
       * here.
       */
      const listings =
        await prisma.listing.findMany(
          {
            where: {
              userId:
                req.user.id,
            },

            orderBy: {
              createdAt:
                "desc",
            },

            include: {
              category:
                true,

              images: {
                orderBy: [
                  {
                    isPrimary:
                      "desc",
                  },
                  {
                    sortOrder:
                      "asc",
                  },
                ],
              },
            },
          }
        );

      return res.json({
        success: true,
        listings,
      });
    } catch (error) {
      console.error(
        "GET MY LISTINGS ERROR:",
        error
      );

      return res
        .status(500)
        .json({
          success: false,
          message:
            "Unable to fetch your listings",
        });
    }
  };

/* =========================================================
   REMOVE LISTING
========================================================= */

export const removeListing =
  async (req, res) => {
    try {
      const { id } =
        req.params;

      const listing =
        await prisma.listing.findUnique(
          {
            where: {
              id,
            },
          }
        );

      if (!listing) {
        return res
          .status(404)
          .json({
            success: false,
            message:
              "Listing not found",
          });
      }

      if (
        listing.userId !==
        req.user.id
      ) {
        return res
          .status(403)
          .json({
            success: false,
            message:
              "You can only remove your own listings",
          });
      }

      if (
        listing.status ===
        "TRADED"
      ) {
        return res
          .status(400)
          .json({
            success: false,
            message:
              "A traded listing cannot be removed",
          });
      }

      const updatedListing =
        await prisma.listing.update(
          {
            where: {
              id,
            },

            data: {
              status:
                "REMOVED",
            },
          }
        );

      await invalidateListingCache(
        id
      );

      await invalidateAllListingsCache();

      return res.json({
        success: true,

        message:
          "Listing removed successfully",

        listing:
          updatedListing,
      });
    } catch (error) {
      console.error(
        "REMOVE LISTING ERROR:",
        error
      );

      return res
        .status(500)
        .json({
          success: false,
          message:
            "Unable to remove listing",
        });
    }
  };

/* =========================================================
   DELETE LISTING IMAGE
========================================================= */

export const deleteListingImage =
  async (req, res) => {
    try {
      const {
        id,
        imageId,
      } = req.params;

      const userId =
        req.user.id;

      const image =
        await prisma.listingImage.findUnique(
          {
            where: {
              id:
                imageId,
            },

            include: {
              listing: {
                select: {
                  id: true,

                  userId:
                    true,
                },
              },
            },
          }
        );

      if (!image) {
        return res
          .status(404)
          .json({
            message:
              "Image not found.",
          });
      }

      if (
        image.listingId !==
        id
      ) {
        return res
          .status(400)
          .json({
            message:
              "Image does not belong to this listing.",
          });
      }

      if (
        image.listing
          .userId !==
        userId
      ) {
        return res
          .status(403)
          .json({
            message:
              "You are not authorized to delete this image.",
          });
      }

      if (image.publicId) {
        try {
          await cloudinary.uploader.destroy(
            image.publicId
          );
        } catch (
          cloudinaryError
        ) {
          console.error(
            "CLOUDINARY DELETE ERROR:",
            cloudinaryError
          );
        }
      }

      await prisma.$transaction(
        async (tx) => {
          await tx.listingImage.delete(
            {
              where: {
                id:
                  imageId,
              },
            }
          );

          const remainingImages =
            await tx.listingImage.findMany(
              {
                where: {
                  listingId:
                    id,
                },

                orderBy: [
                  {
                    sortOrder:
                      "asc",
                  },
                  {
                    createdAt:
                      "asc",
                  },
                ],
              }
            );

          if (
            remainingImages.length ===
            0
          ) {
            return;
          }

          for (
            let index = 0;
            index <
            remainingImages.length;
            index++
          ) {
            await tx.listingImage.update(
              {
                where: {
                  id:
                    remainingImages[
                      index
                    ].id,
                },

                data: {
                  sortOrder:
                    index,

                  isPrimary:
                    index === 0,
                },
              }
            );
          }
        }
      );

      const updatedImages =
        await prisma.listingImage.findMany(
          {
            where: {
              listingId:
                id,
            },

            orderBy: [
              {
                isPrimary:
                  "desc",
              },
              {
                sortOrder:
                  "asc",
              },
            ],
          }
        );

      await invalidateListingCache(
        id
      );

      await invalidateAllListingsCache();

      return res
        .status(200)
        .json({
          message:
            "Image deleted successfully.",

          images:
            updatedImages,
        });
    } catch (error) {
      console.error(
        "DELETE LISTING IMAGE ERROR:",
        error
      );

      return res
        .status(500)
        .json({
          message:
            "Unable to delete image.",

          error:
            error.message,
        });
    }
  };

/* =========================================================
   ADD LISTING IMAGES
========================================================= */

export const addListingImages =
  async (req, res) => {
    try {
      const { id } =
        req.params;

      const userId =
        req.user.id;

      const listing =
        await prisma.listing.findUnique(
          {
            where: {
              id,
            },

            include: {
              images:
                true,
            },
          }
        );

      if (!listing) {
        return res
          .status(404)
          .json({
            message:
              "Listing not found",
          });
      }

      if (
        listing.userId !==
        userId
      ) {
        return res
          .status(403)
          .json({
            message:
              "You are not authorized to modify this listing",
          });
      }

      const files =
        req.files || [];

      if (
        files.length === 0
      ) {
        return res
          .status(400)
          .json({
            message:
              "Please select at least one image",
          });
      }

      const currentImageCount =
        listing.images.length;

      const newImageCount =
        currentImageCount +
        files.length;

      if (
        newImageCount > 8
      ) {
        return res
          .status(400)
          .json({
            message:
              `A listing can have a maximum of 8 images. You currently have ${currentImageCount} image(s).`,
          });
      }

      const uploadedImages =
        await Promise.all(
          files.map(
            async (
              file,
              index
            ) => {
              const result =
                await uploadToCloudinary(
                  file.buffer,
                  "barter-trade/listings"
                );

              return {
                listingId:
                  id,

                url:
                  result.secure_url,

                publicId:
                  result.public_id,

                isPrimary:
                  currentImageCount ===
                    0 &&
                  index === 0,

                sortOrder:
                  currentImageCount +
                  index,
              };
            }
          )
        );

      await prisma.listingImage.createMany(
        {
          data:
            uploadedImages,
        }
      );

      const updatedListing =
        await prisma.listing.findUnique(
          {
            where: {
              id,
            },

            include: {
              images:
                true,
            },
          }
        );

      await invalidateListingCache(
        id
      );

      await invalidateAllListingsCache();

      return res
        .status(201)
        .json({
          message:
            "Images added successfully",

          listing:
            updatedListing,
        });
    } catch (error) {
      console.error(
        "ADD LISTING IMAGES ERROR:",
        error
      );

      return res
        .status(500)
        .json({
          message:
            "Failed to add listing images",

          error:
            error.message,
        });
    }
  };

/* =========================================================
   SET PRIMARY IMAGE
========================================================= */

export const setPrimaryListingImage =
  async (req, res) => {
    try {
      const {
        id,
        imageId,
      } = req.params;

      const userId =
        req.user.id;

      const listing =
        await prisma.listing.findUnique(
          {
            where: {
              id,
            },

            include: {
              images: {
                orderBy: {
                  sortOrder:
                    "asc",
                },
              },
            },
          }
        );

      if (!listing) {
        return res
          .status(404)
          .json({
            message:
              "Listing not found",
          });
      }

      if (
        listing.userId !==
        userId
      ) {
        return res
          .status(403)
          .json({
            message:
              "You are not authorized to modify this listing",
          });
      }

      const selectedImage =
        listing.images.find(
          (image) =>
            image.id ===
            imageId
        );

      if (!selectedImage) {
        return res
          .status(404)
          .json({
            message:
              "Image not found for this listing",
          });
      }

      if (
        selectedImage.isPrimary &&
        selectedImage.sortOrder ===
          0
      ) {
        return res
          .status(200)
          .json({
            message:
              "Image is already the main image",

            images:
              listing.images,
          });
      }

      const reorderedImages =
        [
          selectedImage,

          ...listing.images.filter(
            (image) =>
              image.id !==
              imageId
          ),
        ];

      await prisma.$transaction(
        reorderedImages.map(
          (
            image,
            index
          ) =>
            prisma.listingImage.update(
              {
                where: {
                  id:
                    image.id,
                },

                data: {
                  isPrimary:
                    index === 0,

                  sortOrder:
                    index,
                },
              }
            )
        )
      );

      const updatedImages =
        await prisma.listingImage.findMany(
          {
            where: {
              listingId:
                id,
            },

            orderBy: {
              sortOrder:
                "asc",
            },
          }
        );

      await invalidateListingCache(
        id
      );

      await invalidateAllListingsCache();

      return res
        .status(200)
        .json({
          message:
            "Main image updated successfully",

          images:
            updatedImages,
        });
    } catch (error) {
      console.error(
        "SET PRIMARY IMAGE ERROR:",
        error
      );

      return res
        .status(500)
        .json({
          message:
            "Failed to set main image",

          error:
            error.message,
        });
    }
  };

/* =========================================================
   REORDER LISTING IMAGES
========================================================= */

export const reorderListingImages =
  async (req, res) => {
    try {
      const { id } =
        req.params;

      const userId =
        req.user.id;

      const {
        imageIds,
      } = req.body;

      if (
        !Array.isArray(
          imageIds
        ) ||
        imageIds.length === 0
      ) {
        return res
          .status(400)
          .json({
            message:
              "imageIds must be a non-empty array",
          });
      }

      const listing =
        await prisma.listing.findUnique(
          {
            where: {
              id,
            },

            include: {
              images:
                true,
            },
          }
        );

      if (!listing) {
        return res
          .status(404)
          .json({
            message:
              "Listing not found",
          });
      }

      if (
        listing.userId !==
        userId
      ) {
        return res
          .status(403)
          .json({
            message:
              "You are not authorized to modify this listing",
          });
      }

      const existingImageIds =
        listing.images.map(
          (image) =>
            image.id
        );

      if (
        imageIds.length !==
        existingImageIds.length
      ) {
        return res
          .status(400)
          .json({
            message:
              "All listing images must be included when reordering",
          });
      }

      const allImagesIncluded =
        existingImageIds.every(
          (imageId) =>
            imageIds.includes(
              imageId
            )
        );

      if (
        !allImagesIncluded
      ) {
        return res
          .status(400)
          .json({
            message:
              "Invalid image list",
          });
      }

      const uniqueImageIds =
        new Set(
          imageIds
        );

      if (
        uniqueImageIds.size !==
        imageIds.length
      ) {
        return res
          .status(400)
          .json({
            message:
              "Duplicate image IDs are not allowed",
          });
      }

      await prisma.$transaction(
        imageIds.map(
          (
            imageId,
            index
          ) =>
            prisma.listingImage.update(
              {
                where: {
                  id:
                    imageId,
                },

                data: {
                  sortOrder:
                    index,

                  isPrimary:
                    index === 0,
                },
              }
            )
        )
      );

      const updatedImages =
        await prisma.listingImage.findMany(
          {
            where: {
              listingId:
                id,
            },

            orderBy: {
              sortOrder:
                "asc",
            },
          }
        );

      await invalidateListingCache(
        id
      );

      await invalidateAllListingsCache();

      return res
        .status(200)
        .json({
          message:
            "Listing images reordered successfully",

          images:
            updatedImages,
        });
    } catch (error) {
      console.error(
        "REORDER LISTING IMAGES ERROR:",
        error
      );

      return res
        .status(500)
        .json({
          message:
            "Failed to reorder listing images",

          error:
            error.message,
        });
    }
  };

/* =========================================================
   HOMEPAGE PROMOTED LISTINGS
========================================================= */

export const getHomepagePromotedListings =
  async (req, res) => {
    try {
      await expirePromotions();

      const now =
        new Date();

      const listings =
        await prisma.listing.findMany(
          {
            where: {
              status:
                "ACTIVE",

              promotions: {
                some: {
                  type:
                    "HOMEPAGE",

                  status:
                    "ACTIVE",

                  startsAt: {
                    lte: now,
                  },

                  endsAt: {
                    gt: now,
                  },
                },
              },
            },

            take: 8,

            orderBy: {
              createdAt:
                "desc",
            },

            include: {
              category:
                true,

              images: {
                take: 1,

                orderBy: [
                  {
                    isPrimary:
                      "desc",
                  },
                  {
                    sortOrder:
                      "asc",
                  },
                ],
              },

              user: {
                select: {
                  id: true,

                  name:
                    true,

                  avatar:
                    true,

                  barterScore:
                    true,

                  completedTrades:
                    true,

                  subscriptions:
                    getActivePremiumSubscriptionSelect(
                      now
                    ),

                  businessProfile:
                    getBusinessProfileSelect(),
                },
              },

              promotions: {
                where: {
                  type:
                    "HOMEPAGE",

                  status:
                    "ACTIVE",

                  startsAt: {
                    lte: now,
                  },

                  endsAt: {
                    gt: now,
                  },
                },

                orderBy: {
                  endsAt:
                    "desc",
                },

                take: 1,
              },
            },
          }
        );

      const promotedListings =
        listings
          .map(
            (listing) => {
              const activePromotion =
                listing
                  .promotions
                  ?.[0] ||
                null;

              if (
                !activePromotion
              ) {
                return null;
              }

              const normalizedUser =
                normalizeListingUser(
                  listing.user
                );

              return {
                ...listing,

                user:
                  normalizedUser,

                activePromotion: {
                  id:
                    activePromotion.id,

                  type:
                    activePromotion.type,

                  startsAt:
                    activePromotion.startsAt,

                  endsAt:
                    activePromotion.endsAt,

                  durationDays:
                    activePromotion.durationDays,
                },

                promotionId:
                  activePromotion.id,

                promotionType:
                  "HOMEPAGE",

                isPromoted:
                  true,
              };
            }
          )
          .filter(Boolean);

      return res
        .status(200)
        .json({
          success: true,

          listings:
            promotedListings,

          count:
            promotedListings.length,
        });
    } catch (error) {
      console.error(
        "GET HOMEPAGE PROMOTED LISTINGS ERROR:",
        error
      );

      return res
        .status(500)
        .json({
          success: false,

          message:
            "Unable to fetch homepage promoted listings.",
        });
    }
  };