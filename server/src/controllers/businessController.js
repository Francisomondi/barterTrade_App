import prisma from "../config/prisma.js";
import cloudinary from "../config/cloudinary.js";
import uploadToCloudinary from "../utils/uploadToCloudinary.js";

import { DEFAULT_BUSINESS_STATE, validateBusinessProfileInput} from "../config/businessConfig.js";
import { generateUniqueBusinessSlug, getBusinessProfileByUserId} from "../services/businessService.js";
import { trackStorefrontView} from "../services/businessAnalyticsTrackingService.js";
import { getBusinessProEntitlement } from "../services/subscriptionService.js";
import { DEFAULT_STOREFRONT_BRANDING} from "../config/businessStorefrontBranding.js";
import { validateBusinessImage} from "../utils/validateBusinessImage.js";

/**
 * Replace a business image safely.
 *
 * Uses optimistic concurrency:
 * the database is updated only if the image has not
 * changed since the business profile was loaded.
 */
const replaceBusinessImageSafely = async ({
  business,
  uploadedImage,
  imageField,
  publicIdField,
}) => {
  let updated = false;

  try {
    const updatedBusiness =
      await prisma.businessProfile.update({
        where: {
          id: business.id,
          status: { not: "SUSPENDED" },
          [publicIdField]:
            business[publicIdField] ?? null,
          [imageField]:
            business[imageField] ?? null,
        },
        data: {
          [imageField]: uploadedImage.secure_url,
          [publicIdField]: uploadedImage.public_id,
        },
      });

    updated = true;

    return {
      success: true,
      business: updatedBusiness,
    };
  } catch (error) {
    if (error.code === "P2025") {
      return {
        success: false,
        conflict: true,
      };
    }

    throw error;
  } finally {
    if (!updated && uploadedImage?.public_id) {
      try {
        await cloudinary.uploader.destroy(
          uploadedImage.public_id
        );
      } catch (cleanupError) {
        console.error(
          "NEW BUSINESS IMAGE CLEANUP ERROR:",
          cleanupError
        );
      }
    }
  }
};

/**
 * Remove an old Cloudinary image after a successful
 * database change.
 */
const cleanupPreviousBusinessImage = async (
  oldPublicId,
  newPublicId = null
) => {
  if (!oldPublicId || oldPublicId === newPublicId) {
    return;
  }

  try {
    await cloudinary.uploader.destroy(oldPublicId);
  } catch (error) {
    console.error(
      "PREVIOUS BUSINESS IMAGE CLEANUP ERROR:",
      error
    );
  }
};

/*
 * ============================================================
 * CREATE / UPGRADE TO BUSINESS ACCOUNT
 * ============================================================
 *
 * POST /api/business
 *
 * Authentication required.
 *
 * This does NOT:
 *
 * - create another User
 * - change authentication
 * - change Premium subscription
 * - automatically verify the business
 * - change existing listings
 *
 * It simply creates a BusinessProfile linked to the
 * authenticated user.
 */

export const createBusinessProfile = async (
  req,
  res
) => {
  try {
    const userId =
      req.user.id;

    /*
     * ========================================================
     * CHECK EXISTING BUSINESS PROFILE
     * ========================================================
     */

    const existingBusiness =
      await getBusinessProfileByUserId(
        userId
      );

    if (existingBusiness) {
      return res
        .status(409)
        .json({
          success: false,

          code:
            "BUSINESS_ACCOUNT_ALREADY_EXISTS",

          message:
            "You already have a Business Account.",

          business:
            existingBusiness,
        });
    }

    /*
     * ========================================================
     * VALIDATE REQUEST
     * ========================================================
     *
     * IMPORTANT:
     *
     * We intentionally do NOT read:
     *
     * status
     * verificationStatus
     * verifiedAt
     * slug
     * userId
     *
     * from the request body.
     *
     * Those fields are controlled by the backend.
     */

    const {
      businessName,
      description,
      category,
      location,
      address,
      phone,
      email,
      website,
    } = req.body;

    const validation =
      validateBusinessProfileInput({
        businessName,
        description,
        category,
        location,
        address,
        phone,
        email,
        website,
      });

    if (!validation.valid) {
      return res
        .status(400)
        .json({
          success: false,

          code:
            "BUSINESS_VALIDATION_FAILED",

          message:
            "Please correct the Business Account information.",

          errors:
            validation.errors,
        });
    }

    /*
     * ========================================================
     * GENERATE SERVER-CONTROLLED SLUG
     * ========================================================
     */

    const slug =
      await generateUniqueBusinessSlug(
        validation.data
          .businessName
      );

    /*
     * ========================================================
     * CREATE BUSINESS PROFILE
     * ========================================================
     */

    const business =
      await prisma.businessProfile.create({
        data: {
          userId,

          businessName:
            validation.data
              .businessName,

          slug,

          description:
            validation.data
              .description,

          category:
            validation.data
              .category,

          location:
            validation.data
              .location,

          address:
            validation.data
              .address,

          phone:
            validation.data
              .phone,

          email:
            validation.data
              .email,

          website:
            validation.data
              .website,

          /*
           * Backend controlled.
           */

          status:
            DEFAULT_BUSINESS_STATE
              .status,

          verificationStatus:
            DEFAULT_BUSINESS_STATE
              .verificationStatus,

          verifiedAt:
            null,
        },
      });

    /*
     * ========================================================
     * RESPONSE
     * ========================================================
     */

    return res
      .status(201)
      .json({
        success: true,

        message:
          "Business Account created successfully.",

        isBusiness: true,

        business,
      });
  } catch (error) {
    console.error(
      "CREATE BUSINESS PROFILE ERROR:",
      error
    );

    /*
     * ========================================================
     * DATABASE UNIQUE CONSTRAINT SAFETY
     * ========================================================
     *
     * P2002 protects against concurrent requests.
     *
     * userId @unique prevents multiple BusinessProfiles
     * for the same user.
     *
     * slug @unique prevents duplicate storefront URLs.
     */

    if (
      error?.code ===
      "P2002"
    ) {
      const target =
        Array.isArray(
          error?.meta?.target
        )
          ? error.meta.target
          : [];

      if (
        target.includes(
          "userId"
        )
      ) {
        return res
          .status(409)
          .json({
            success: false,

            code:
              "BUSINESS_ACCOUNT_ALREADY_EXISTS",

            message:
              "You already have a Business Account.",
          });
      }

      if (
        target.includes(
          "slug"
        )
      ) {
        return res
          .status(409)
          .json({
            success: false,

            code:
              "BUSINESS_SLUG_CONFLICT",

            message:
              "That business URL was just taken. Please try again.",
          });
      }

      return res
        .status(409)
        .json({
          success: false,

          code:
            "BUSINESS_CONFLICT",

          message:
            "A Business Account with this information already exists.",
        });
    }

    return res
      .status(500)
      .json({
        success: false,

        message:
          "Unable to create Business Account.",
      });
  }
};

/*
 * ============================================================
 * GET MY BUSINESS ACCOUNT
 * ============================================================
 *
 * GET /api/business/me
 *
 * Authentication required.
 */

export const getMyBusinessProfile = async (
  req,
  res
) => {
  try {
    const userId =
      req.user.id;

    const business =
      await prisma.businessProfile.findUnique({
        where: {
          userId,
        },
      });

    /*
     * A normal personal account is not an error.
     */

    if (!business) {
      return res
        .status(200)
        .json({
          success: true,

          isBusiness: false,

          business: null,
        });
    }

    return res
      .status(200)
      .json({
        success: true,

        isBusiness:
          business.status ===
          "ACTIVE",

        business,
      });
  } catch (error) {
    console.error(
      "GET MY BUSINESS PROFILE ERROR:",
      error
    );

    return res
      .status(500)
      .json({
        success: false,

        message:
          "Unable to load Business Account.",
      });
  }
};

/**
 * ============================================================
 * GET PUBLIC BUSINESS PROFILE
 * ============================================================
 *
 * GET /api/business/:slug
 *
 * Public endpoint.
 *
 * Only ACTIVE businesses are publicly accessible.
 *
 * Business analytics:
 *
 * A successful storefront load records STOREFRONT_VIEW.
 *
 * Views from the business owner are ignored by the analytics
 * tracking service.
 *
 * Repeated views from the same visitor/session are deduplicated
 * by the analytics tracking service.
 */
export const getPublicBusinessProfile = async (
  req,
  res
) => {
  try {
    const { slug } = req.params;

    /**
     * ========================================================
     * VALIDATE SLUG
     * ========================================================
     */

    if (!slug) {
      return res.status(400).json({
        success: false,
        code: "BUSINESS_SLUG_REQUIRED",
        message:
          "Business slug is required.",
      });
    }

    /**
     * ========================================================
     * FIND ACTIVE BUSINESS
     * ========================================================
     *
     * userId and status are selected because the analytics
     * service needs them internally.
     *
     * They are removed before the public response is sent.
     */

    const business =
      await prisma.businessProfile.findFirst({
        where: {
          slug,
          status: "ACTIVE",
          user: {
            is: {
              status: "ACTIVE",
            },
          },
        },

        select: {
          id: true,
          userId: true,
          status: true,

          businessName: true,
          slug: true,
          description: true,

          logo: true,
          coverImage: true,

          phone: true,
          email: true,
          website: true,

          category: true,
          location: true,
          address: true,

          verificationStatus: true,
          verifiedAt: true,

          createdAt: true,


        storefrontSettings: {
          select: {
            primaryColor: true,
            secondaryColor: true,
            accentColor: true,
            layoutStyle: true,
            tagline: true,
            introduction: true,
          },
        },

        
        promotionalHighlights: {
          where: {
            isActive: true,
          },
          orderBy: [
            {
              sortOrder: "asc",
            },
            {
              createdAt: "asc",
            },
          ],
          select: {
            id: true,
            title: true,
            description: true,
            icon: true,
            sortOrder: true,
          },
        },



          user: {
            select: {
              id: true,

              _count: {
                select: {
                  listings: {
                    where: {
                      status: "ACTIVE",
                    },
                  },
                },
              },
            },
          },
        },
      });

    /**
     * ========================================================
     * BUSINESS NOT FOUND
     * ========================================================
     */

    if (!business) {
      return res.status(404).json({
        success: false,
        code: "BUSINESS_NOT_FOUND",
        message:
          "Business not found.",
      });
    }

        
    /*
    * ============================================================
    * RESOLVE PUBLIC STOREFRONT BRANDING
    * ============================================================
    */

    const entitlement = await getBusinessProEntitlement(
      business.userId
    );

    const isBusinessPro =
      entitlement?.isBusinessPro === true &&
      entitlement?.businessId === business.id;

    const effectiveBranding = isBusinessPro
      ? {
          ...DEFAULT_STOREFRONT_BRANDING,
          ...(business.storefrontSettings
            ? {
                primaryColor:
                  business.storefrontSettings.primaryColor,
                secondaryColor:
                  business.storefrontSettings.secondaryColor,
                accentColor:
                  business.storefrontSettings.accentColor,
                layoutStyle:
                  business.storefrontSettings.layoutStyle,
                tagline:
                  business.storefrontSettings.tagline,
              }
            : {}),
        }
      : { ...DEFAULT_STOREFRONT_BRANDING };

      
    /*
    * ============================================================
    * RESOLVE PUBLIC STOREFRONT CONTENT
    * ============================================================
    *
    * Business Introduction and Promotional Highlights are
    * exclusive to businesses with an active Business Pro plan.
    *
    * Content remains stored when a subscription expires,
    * but must not be included in the public response.
    */

    const effectiveIntroduction = isBusinessPro
      ? business.storefrontSettings?.introduction ?? null
      : null;

    const effectivePromotionalHighlights = isBusinessPro
      ? business.promotionalHighlights ?? []
      : [];



    /**
     * ========================================================
     * TRACK STOREFRONT VIEW
     * ========================================================
     *
     * businessRoutes.js already runs:
     *
     * optionalAuth
     *      ↓
     * analyticsVisitor
     *      ↓
     * getPublicBusinessProfile
     *
     * Therefore req.analyticsVisitor contains:
     *
     * - visitorUserId
     * - visitorKey
     * - sessionKey
     *
     * IMPORTANT:
     *
     * We intentionally do NOT await analytics.
     *
     * Loading the storefront should not become slower because
     * an analytics event needs to be written.
     *
     * Analytics failure must also never cause an otherwise
     * valid storefront request to fail.
     */

    trackStorefrontView({
      business: {
        id: business.id,
        userId: business.userId,
        status: business.status,
      },

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
        source:
          "BUSINESS_STOREFRONT",
      },
    }).catch((error) => {
      console.error(
        "BUSINESS STOREFRONT ANALYTICS ERROR:",
        error
      );
    });

    /**
     * ========================================================
     * BUILD PUBLIC RESPONSE
     * ========================================================
     *
     * userId and status were required internally for analytics.
     *
     * We do not expose them simply because analytics needed
     * them.
     */


  const {
    user,
    userId: _userId,
    status: _status,
    storefrontSettings: _storefrontSettings,
    promotionalHighlights: _promotionalHighlights,
    ...businessData
  } = business;


    /**
     * ========================================================
     * RESPONSE
     * ========================================================
     */

    return res.status(200).json({
      success: true,

    business: {
      ...businessData,

      isVerified:
        business.verificationStatus === "VERIFIED",

      activeListingCount:
        user?._count?.listings || 0,

      storefront: {
        tier: isBusinessPro
          ? "BUSINESS_PRO"
          : "BUSINESS_FREE",

        branding: effectiveBranding,

        introduction: effectiveIntroduction,

        promotionalHighlights: effectivePromotionalHighlights,
      },
    },
    });
  } catch (error) {
    console.error(
      "GET PUBLIC BUSINESS PROFILE ERROR:",
      error
    );

    return res.status(500).json({
      success: false,
      message:
        "Unable to load Business Profile.",
    });
  }
};

/*
 * ============================================================
 * GET PUBLIC BUSINESS LISTINGS
 * ============================================================
 *
 * GET /api/business/:slug/listings
 *
 * Public endpoint.
 *
 * Returns ACTIVE listings belonging to the Business owner.
 */

export const getPublicBusinessListings = async (req, res) => {
  try {
    const { slug } = req.params;

    if (!slug) {
      return res.status(400).json({
        success: false,
        code: "BUSINESS_SLUG_REQUIRED",
        message: "Business slug is required.",
      });
    }

    /*
     * ========================================================
     * FIND BUSINESS
     * ========================================================
     */

    const business =
      await prisma.businessProfile.findFirst({
        where: {
          slug,
          status: "ACTIVE",
          user: {
            is: {
              status: "ACTIVE",
            },
          },
        },


      select: {
        id: true,
        userId: true,
        businessName: true,
        slug: true,
        logo: true,
        verificationStatus: true,
        status: true,
      },

      });

    if (!business) {
      return res.status(404).json({
        success: false,
        code: "BUSINESS_NOT_FOUND",
        message: "Business not found.",
      });
    }

    /*
     * ========================================================
     * PAGINATION
     * ========================================================
     */

    const rawPage = Number(req.query.page);
    const rawLimit = Number(req.query.limit);

    const page =
      Number.isSafeInteger(rawPage) &&
      rawPage > 0
        ? rawPage
        : 1;

    /*
     * Maximum 50 listings per request.
     */

    const limit =
      Number.isSafeInteger(rawLimit) &&
      rawLimit > 0
        ? Math.min(rawLimit, 50)
        : 12;

    const skip = (page - 1) * limit;

      if (
        !Number.isSafeInteger(skip) ||
        skip > 2_147_483_647
      ) {
        return res.status(400).json({
          success: false,
          code: "INVALID_PAGINATION",
          message:
            "Requested page is too large.",
        });
      }

    /*
     * ========================================================
     * ACTIVE BUSINESS LISTINGS
     * ========================================================
     *
     * We continue using Listing.userId.
     *
     * There is intentionally no businessId on Listing.
     */

    const where = {
      userId: business.userId,
      status: "ACTIVE",
    };
    
      /*
      * ============================================================
      * PUBLIC FEATURED LISTINGS — BUSINESS PRO ONLY
      * ============================================================
      */

      const entitlement = await getBusinessProEntitlement(
        business.userId
      );

      const canShowFeaturedListings =
        business.status === "ACTIVE" &&
        entitlement?.isBusinessPro === true &&
        entitlement?.businessId === business.id;

      let featuredListings = [];

      if (canShowFeaturedListings) {
        const featuredRecords =
          await prisma.businessFeaturedListing.findMany({
            where: {
              businessId: business.id,
              listing: {
                is: {
                  userId: business.userId,
                  status: "ACTIVE",
                },
              },
            },
            orderBy: [
              { sortOrder: "asc" },
              { createdAt: "asc" },
            ],
            take: 6,
            select: {
              listing: {
                include: {
                  images: {
                    orderBy: {
                      sortOrder: "asc",
                    },
                  },
                  category: true,
                },
              },
            },
          });

        featuredListings = featuredRecords.map(
          (record) => record.listing
        );
      }


    const [
      listings,
      totalListings,
    ] = await Promise.all([
      prisma.listing.findMany({
        where,

        orderBy: {
          createdAt: "desc",
        },

        skip,
        take: limit,

        include: {
          images: {
            orderBy: {
              sortOrder: "asc",
            },
          },

          category: true,
        },
      }),

      prisma.listing.count({
        where,
      }),
    ]);

    const totalPages =
      totalListings === 0
        ? 0
        : Math.ceil(
            totalListings /
              limit
          );

    return res.status(200).json({
      success: true,

      business: {
        id: business.id,
        businessName:
          business.businessName,
        slug: business.slug,
        logo: business.logo,

        verificationStatus:
          business.verificationStatus,

        isVerified:
          business.verificationStatus ===
          "VERIFIED",
      },

      listings,

      featuredListings,

      pagination: {
        page,
        limit,
        totalListings,
        totalPages,

        hasNextPage:
          page < totalPages,

        hasPreviousPage:
          page > 1,
      },
    });
  } catch (error) {
    console.error(
      "GET PUBLIC BUSINESS LISTINGS ERROR:",
      error
    );

    return res.status(500).json({
      success: false,
      message:
        "Unable to load Business listings.",
    });
  }
};

/*
 * ============================================================
 * UPDATE MY BUSINESS PROFILE
 * ============================================================
 *
 * PATCH /api/business/me
 *
 * Authentication required.
 *
 * Owner-editable:
 * - businessName
 * - description
 * - category
 * - location
 * - address
 * - phone
 * - email
 * - website
 *
 * Server-controlled:
 * - userId
 * - slug
 * - status
 * - verificationStatus
 * - verifiedAt
 * - logo
 * - coverImage
 * - logoPublicId
 * - coverImagePublicId
 */

export const updateMyBusinessProfile = async (req, res) => {
  try {
    const userId = req.user.id;

    /*
     * ========================================================
     * FIND BUSINESS
     * ========================================================
     */

    const existingBusiness =
      await prisma.businessProfile.findUnique({
        where: {
          userId,
        },
      });

    if (!existingBusiness) {
      return res.status(404).json({
        success: false,
        code: "BUSINESS_ACCOUNT_NOT_FOUND",
        message: "You do not have a Business Account.",
      });
    }

    if (existingBusiness.status === "SUSPENDED") {
      return res.status(403).json({
        success: false,
        code: "BUSINESS_ACCOUNT_SUSPENDED",
        message:
          "This Business Account is suspended and cannot be modified.",
      });
    }

    /*
     * ========================================================
     * BUILD COMPLETE VALIDATION INPUT
     * ========================================================
     *
     * PATCH requests may contain only one or two fields.
     *
     * Our validation function validates the whole editable
     * profile, so missing fields fall back to the current
     * database values.
     */

    const input = {
      businessName:
        req.body.businessName !== undefined
          ? req.body.businessName
          : existingBusiness.businessName,

      description:
        req.body.description !== undefined
          ? req.body.description
          : existingBusiness.description,

      category:
        req.body.category !== undefined
          ? req.body.category
          : existingBusiness.category,

      location:
        req.body.location !== undefined
          ? req.body.location
          : existingBusiness.location,

      address:
        req.body.address !== undefined
          ? req.body.address
          : existingBusiness.address,

      phone:
        req.body.phone !== undefined
          ? req.body.phone
          : existingBusiness.phone,

      email:
        req.body.email !== undefined
          ? req.body.email
          : existingBusiness.email,

      website:
        req.body.website !== undefined
          ? req.body.website
          : existingBusiness.website,
    };

    /*
     * ========================================================
     * VALIDATE
     * ========================================================
     */

    const validation =
      validateBusinessProfileInput(input);

    if (!validation.valid) {
      return res.status(400).json({
        success: false,
        code: "BUSINESS_VALIDATION_FAILED",
        message:
          "Please correct the Business Account information.",
        errors: validation.errors,
      });
    }

    /*
     * ========================================================
     * UPDATE
     * ========================================================
     *
     * IMPORTANT:
     *
     * We do NOT spread req.body into Prisma.
     *
     * Doing:
     *
     * data: { ...req.body }
     *
     * would allow clients to attempt to change protected
     * fields such as verificationStatus or status.
     */

      const business =
        await prisma.businessProfile.update({
          where: {
            userId,
            status: existingBusiness.status,
          },

        data: {
          businessName:
            validation.data.businessName,

          description:
            validation.data.description,

          category:
            validation.data.category,

          location:
            validation.data.location,

          address:
            validation.data.address,

          phone:
            validation.data.phone,

          email:
            validation.data.email,

          website:
            validation.data.website,
        },
      });

    return res.status(200).json({
      success: true,
      message:
        "Business Profile updated successfully.",
      isBusiness:
        business.status === "ACTIVE",
      business,
    });
  } catch (error) {
    console.error(
      "UPDATE BUSINESS PROFILE ERROR:",
      error
    );

    return res.status(500).json({
      success: false,
      message:
        "Unable to update Business Profile.",
    });
  }
};

/*
 * ============================================================
 * UPDATE MY BUSINESS STATUS
 * ============================================================
 *
 * PATCH /api/business/me/status
 *
 * Owner may:
 *
 * ACTIVE -> CLOSED
 * CLOSED -> ACTIVE
 *
 * Owner may NOT:
 *
 * set SUSPENDED
 *
 * SUSPENDED is an administrative state.
 */

export const updateMyBusinessStatus = async (
  req,
  res
) => {
  try {
    const userId = req.user.id;

    const requestedStatus =
      String(req.body.status || "")
        .trim()
        .toUpperCase();

    /*
     * ========================================================
     * ALLOWED OWNER STATES
     * ========================================================
     */

    const allowedStatuses = [
      "ACTIVE",
      "CLOSED",
    ];

    if (
      !allowedStatuses.includes(
        requestedStatus
      )
    ) {
      return res.status(400).json({
        success: false,
        code: "INVALID_BUSINESS_STATUS",
        message:
          "Business status must be ACTIVE or CLOSED.",
      });
    }

    /*
     * ========================================================
     * FIND BUSINESS
     * ========================================================
     */

    const existingBusiness =
      await prisma.businessProfile.findUnique({
        where: {
          userId,
        },
      });

    if (!existingBusiness) {
      return res.status(404).json({
        success: false,
        code: "BUSINESS_ACCOUNT_NOT_FOUND",
        message:
          "You do not have a Business Account.",
      });
    }

    /*
     * ========================================================
     * SUSPENDED BUSINESSES CANNOT SELF-REACTIVATE
     * ========================================================
     */

    if (
      existingBusiness.status ===
      "SUSPENDED"
    ) {
      return res.status(403).json({
        success: false,
        code: "BUSINESS_ACCOUNT_SUSPENDED",
        message:
          "This Business Account is suspended and cannot change its status.",
      });
    }

    /*
     * ========================================================
     * IDEMPOTENCY
     * ========================================================
     */

    if (
      existingBusiness.status ===
      requestedStatus
    ) {
      return res.status(200).json({
        success: true,
        message:
          requestedStatus === "ACTIVE"
            ? "Business Account is already active."
            : "Business Account is already closed.",
        isBusiness:
          requestedStatus === "ACTIVE",
        business:
          existingBusiness,
      });
    }

    /*
     * ========================================================
     * UPDATE STATUS
     * ========================================================
     */

   const updateResult =
    await prisma.businessProfile.updateMany({
      where: {
        userId,
        status: existingBusiness.status,
      },

      data: {
        status: requestedStatus,
      },
    });

  if (updateResult.count !== 1) {
    return res.status(409).json({
      success: false,
      code: "BUSINESS_STATUS_CONFLICT",
      message:
        "Business Account status changed. Please refresh and try again.",
    });
  }

  const business =
    await prisma.businessProfile.findUnique({
      where: { userId },
    });

    return res.status(200).json({
      success: true,

      message:
        requestedStatus === "ACTIVE"
          ? "Business Account reactivated successfully."
          : "Business Account closed successfully.",

      isBusiness:
        business.status === "ACTIVE",

      business,
    });
  } catch (error) {
    console.error(
      "UPDATE BUSINESS STATUS ERROR:",
      error
    );

    return res.status(500).json({
      success: false,
      message:
        "Unable to update Business Account status.",
    });
  }
};

/*
 * ============================================================
 * UPLOAD / REPLACE BUSINESS LOGO
 * ============================================================
 *
 * PATCH /api/business/me/logo
 *
 * multipart/form-data
 *
 * Field:
 * logo
 */

export const uploadBusinessLogo = async (req, res) => {
  let uploadedImage = null;

  try {
    const userId = req.user.id;

    /*
     * ========================================================
     * VALIDATE FILE
     * ========================================================
     */

    if (!req.file) {
      return res.status(400).json({
        success: false,
        code: "BUSINESS_LOGO_REQUIRED",
        message: "Please select a Business logo.",
      });
    }

    /*
     * ========================================================
     * FIND BUSINESS
     * ========================================================
     */

    const business =
      await prisma.businessProfile.findUnique({
        where: {
          userId,
        },
      });

    if (!business) {
      return res.status(404).json({
        success: false,
        code: "BUSINESS_ACCOUNT_NOT_FOUND",
        message: "You do not have a Business Account.",
      });
    }

    /*
     * Suspended businesses should not modify their branding.
     */

    if (business.status === "SUSPENDED") {
      return res.status(403).json({
        success: false,
        code: "BUSINESS_ACCOUNT_SUSPENDED",
        message:
          "This Business Account is suspended.",
      });
    }

    await validateBusinessImage(req.file.buffer);

    /*
     * ========================================================
     * UPLOAD NEW IMAGE FIRST
     * ========================================================
     *
     * We upload the replacement BEFORE deleting the old logo.
     *
     * If Cloudinary upload fails, the current logo remains
     * untouched.
     */

    uploadedImage =
      await uploadToCloudinary(
        req.file.buffer,
        "barter-trade/business/logos"
      );

    if (
      !uploadedImage?.secure_url ||
      !uploadedImage?.public_id
    ) {
      throw new Error(
        "Cloudinary did not return the expected logo information."
      );
    }

    /*
     * ========================================================
     * UPDATE DATABASE
     * ========================================================
     */

/*
 * ========================================================
 * UPDATE DATABASE SAFELY
 * ========================================================
 */

const replacement = await replaceBusinessImageSafely({
  business,
  uploadedImage,
  imageField: "logo",
  publicIdField: "logoPublicId",
});

if (!replacement.success) {
  return res.status(409).json({
    success: false,
    code: "BUSINESS_IMAGE_CONFLICT",
    message:
      "Business logo changed during upload. Please try again.",
  });
}

const updatedBusiness = replacement.business;

/*
 * ========================================================
 * DELETE PREVIOUS LOGO
 * ========================================================
 */

await cleanupPreviousBusinessImage(
  business.logoPublicId,
  uploadedImage.public_id
);

    return res.status(200).json({
      success: true,
      message:
        "Business logo updated successfully.",
      business: updatedBusiness,
    });
  } catch (error) {
      console.error(
        "UPLOAD BUSINESS LOGO ERROR:",
        error
      );

  // Handle invalid image content
  if (error.statusCode === 400) {
    return res.status(400).json({
      success: false,
      code: error.code || "INVALID_IMAGE",
      message: error.message,
    });
  }

  // Handle unexpected server errors
  return res.status(500).json({
    success: false,
    message:
      "Unable to update Business logo.",
  });
}
};
/*
 * ============================================================
 * DELETE BUSINESS LOGO
 * ============================================================
 *
 * DELETE /api/business/me/logo
 */

export const deleteBusinessLogo = async (req, res) => {
  try {
    const userId = req.user.id;

    const business =
      await prisma.businessProfile.findUnique({
        where: {
          userId,
        },
      });

    if (!business) {
      return res.status(404).json({
        success: false,
        code: "BUSINESS_ACCOUNT_NOT_FOUND",
        message: "You do not have a Business Account.",
      });
    }

    if (business.status === "SUSPENDED") {
      return res.status(403).json({
        success: false,
        code: "BUSINESS_ACCOUNT_SUSPENDED",
        message:
          "This Business Account is suspended.",
      });
    }

    /*
     * Nothing to remove.
     */

    if (
      !business.logo &&
      !business.logoPublicId
    ) {
      return res.status(200).json({
        success: true,
        message:
          "Business logo is already empty.",
        business,
      });
    }

    const oldPublicId =
      business.logoPublicId;

    /*
     * ========================================================
     * CLEAR DATABASE FIRST
     * ========================================================
     */

  const result = await prisma.businessProfile.updateMany({
    where: {
      userId,
      status: { not: "SUSPENDED" },
      logo: business.logo ?? null,
      logoPublicId: business.logoPublicId ?? null,
    },

    data: {
      logo: null,
      logoPublicId: null,
    },
  });

  if (result.count !== 1) {
    return res.status(409).json({
      success: false,
      code: "BUSINESS_IMAGE_CONFLICT",
      message:
        "Business logo changed. Refresh and try again.",
    });
  }

  const updatedBusiness =
    await prisma.businessProfile.findUnique({
      where: {
        userId,
      },
    });

    /*
     * ========================================================
     * CLEAN CLOUDINARY
     * ========================================================
     */

    await cleanupPreviousBusinessImage(oldPublicId);

    return res.status(200).json({
      success: true,
      message:
        "Business logo removed successfully.",
      business: updatedBusiness,
    });
  } catch (error) {
    console.error(
      "DELETE BUSINESS LOGO ERROR:",
      error
    );

    return res.status(500).json({
      success: false,
      message:
        "Unable to remove Business logo.",
    });
  }
};
/*
 * ============================================================
 * UPLOAD / REPLACE BUSINESS COVER
 * ============================================================
 *
 * PATCH /api/business/me/cover
 *
 * multipart/form-data
 *
 * Field:
 * cover
 */

export const uploadBusinessCover = async (req, res) => {
  let uploadedImage = null;

  try {
    const userId = req.user.id;

    if (!req.file) {
      return res.status(400).json({
        success: false,
        code: "BUSINESS_COVER_REQUIRED",
        message:
          "Please select a Business cover image.",
      });
    }

    const business =
      await prisma.businessProfile.findUnique({
        where: {
          userId,
        },
      });

    if (!business) {
      return res.status(404).json({
        success: false,
        code: "BUSINESS_ACCOUNT_NOT_FOUND",
        message: "You do not have a Business Account.",
      });
    }

    if (business.status === "SUSPENDED") {
      return res.status(403).json({
        success: false,
        code: "BUSINESS_ACCOUNT_SUSPENDED",
        message:
          "This Business Account is suspended.",
      });
    }

    await validateBusinessImage(req.file.buffer);

    /*
     * ========================================================
     * UPLOAD NEW COVER
     * ========================================================
     */

    uploadedImage =
      await uploadToCloudinary(
        req.file.buffer,
        "barter-trade/business/covers"
      );

    if (
      !uploadedImage?.secure_url ||
      !uploadedImage?.public_id
    ) {
      throw new Error(
        "Cloudinary did not return the expected cover information."
      );
    }

    /*
     * ========================================================
     * UPDATE DATABASE
     * ========================================================
     */

/*
 * ========================================================
 * UPDATE DATABASE SAFELY
 * ========================================================
 */

const replacement = await replaceBusinessImageSafely({
  business,
  uploadedImage,
  imageField: "coverImage",
  publicIdField: "coverImagePublicId",
});

if (!replacement.success) {
  return res.status(409).json({
    success: false,
    code: "BUSINESS_IMAGE_CONFLICT",
    message:
      "Business cover changed during upload. Please try again.",
  });
}

const updatedBusiness = replacement.business;

/*
 * ========================================================
 * DELETE PREVIOUS COVER
 * ========================================================
 */

await cleanupPreviousBusinessImage(
  business.coverImagePublicId,
  uploadedImage.public_id
);

    return res.status(200).json({
      success: true,
      message:
        "Business cover image updated successfully.",
      business: updatedBusiness,
    });
  } catch (error) {
  console.error(
    "UPLOAD BUSINESS COVER ERROR:",
    error
  );

  // Handle invalid image content
  if (error.statusCode === 400) {
    return res.status(400).json({
      success: false,
      code: error.code || "INVALID_IMAGE",
      message: error.message,
    });
  }

  // Handle unexpected server errors
  return res.status(500).json({
    success: false,
    message:
      "Unable to update Business cover image.",
  });
}
};
/*
 * ============================================================
 * DELETE BUSINESS COVER
 * ============================================================
 *
 * DELETE /api/business/me/cover
 */

export const deleteBusinessCover = async (req, res) => {
  try {
    const userId = req.user.id;

    /*
     * ========================================================
     * FIND BUSINESS
     * ========================================================
     */

    const business =
      await prisma.businessProfile.findUnique({
        where: {
          userId,
        },
      });

    if (!business) {
      return res.status(404).json({
        success: false,
        code: "BUSINESS_ACCOUNT_NOT_FOUND",
        message: "You do not have a Business Account.",
      });
    }

    /*
     * ========================================================
     * BLOCK SUSPENDED BUSINESSES
     * ========================================================
     */

    if (business.status === "SUSPENDED") {
      return res.status(403).json({
        success: false,
        code: "BUSINESS_ACCOUNT_SUSPENDED",
        message:
          "This Business Account is suspended.",
      });
    }

    /*
     * ========================================================
     * NOTHING TO DELETE
     * ========================================================
     */

    if (
      !business.coverImage &&
      !business.coverImagePublicId
    ) {
      return res.status(200).json({
        success: true,
        message:
          "Business cover image is already empty.",
        business,
      });
    }

    const oldPublicId =
      business.coverImagePublicId;

    /*
     * ========================================================
     * CLEAR DATABASE SAFELY
     * ========================================================
     *
     * Only delete the cover if it has not changed
     * since we loaded the business profile.
     */

    const result =
      await prisma.businessProfile.updateMany({
        where: {
          userId,
          status: { not: "SUSPENDED" },
          coverImage: business.coverImage ?? null,
          coverImagePublicId:
            business.coverImagePublicId ?? null,
        },

        data: {
          coverImage: null,
          coverImagePublicId: null,
        },
      });

    /*
     * ========================================================
     * HANDLE CONCURRENT CHANGES
     * ========================================================
     */

    if (result.count !== 1) {
      return res.status(409).json({
        success: false,
        code: "BUSINESS_IMAGE_CONFLICT",
        message:
          "Business cover changed. Refresh and try again.",
      });
    }

    /*
     * ========================================================
     * FETCH UPDATED BUSINESS
     * ========================================================
     */

    const updatedBusiness =
      await prisma.businessProfile.findUnique({
        where: {
          userId,
        },
      });

    /*
     * ========================================================
     * DELETE OLD CLOUDINARY COVER
     * ========================================================
     *
     * Database has already been updated.
     * Cloudinary cleanup should not undo the deletion.
     */

    await cleanupPreviousBusinessImage(oldPublicId);

    /*
     * ========================================================
     * SUCCESS RESPONSE
     * ========================================================
     */

    return res.status(200).json({
      success: true,
      message:
        "Business cover image removed successfully.",
      business: updatedBusiness,
    });
  } catch (error) {
    console.error(
      "DELETE BUSINESS COVER ERROR:",
      error
    );

    return res.status(500).json({
      success: false,
      message:
        "Unable to remove Business cover image.",
    });
  }
};