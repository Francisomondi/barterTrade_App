import prisma from "../config/prisma.js";
import cloudinary from "../config/cloudinary.js";
import uploadToCloudinary from "../utils/uploadToCloudinary.js";

import {
  DEFAULT_BUSINESS_STATE,
  validateBusinessProfileInput,
} from "../config/businessConfig.js";

import {
  generateUniqueBusinessSlug,
  getBusinessProfileByUserId,
} from "../services/businessService.js";

import {
  trackStorefrontView,
} from "../services/businessAnalyticsTrackingService.js";

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

/*
 * ============================================================
 * GET PUBLIC BUSINESS PROFILE
 * ============================================================
 *
 * GET /api/business/:slug
 *
 * Public endpoint.
 *
 * Only ACTIVE businesses are publicly accessible.
 */

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
        },

        select: {
          id: true,

          /**
           * Internal analytics fields.
           */
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
          business.verificationStatus ===
          "VERIFIED",

        activeListingCount:
          user?._count?.listings || 0,
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

export const getPublicBusinessListings = async (
  req,
  res
) => {
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
        },

        select: {
          id: true,
          userId: true,
          businessName: true,
          slug: true,
          logo: true,
          verificationStatus: true,
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

    const rawPage =
      Number.parseInt(req.query.page, 10);

    const rawLimit =
      Number.parseInt(req.query.limit, 10);

    const page =
      Number.isFinite(rawPage) &&
      rawPage > 0
        ? rawPage
        : 1;

    /*
     * Maximum 50 listings per request.
     */

    const limit =
      Number.isFinite(rawLimit) &&
      rawLimit > 0
        ? Math.min(rawLimit, 50)
        : 12;

    const skip =
      (page - 1) * limit;

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

    const business =
      await prisma.businessProfile.update({
        where: {
          userId,
        },

        data: {
          status:
            requestedStatus,
        },
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

    let updatedBusiness;

    try {
      updatedBusiness =
        await prisma.businessProfile.update({
          where: {
            userId,
          },

          data: {
            logo:
              uploadedImage.secure_url,

            logoPublicId:
              uploadedImage.public_id,
          },
        });
    } catch (databaseError) {
      /*
       * Database update failed after Cloudinary succeeded.
       *
       * Remove the newly uploaded image so it doesn't become
       * an orphaned Cloudinary asset.
       */

      try {
        await cloudinary.uploader.destroy(
          uploadedImage.public_id
        );
      } catch (cleanupError) {
        console.error(
          "NEW BUSINESS LOGO CLEANUP ERROR:",
          cleanupError
        );
      }

      throw databaseError;
    }

    /*
     * ========================================================
     * DELETE PREVIOUS LOGO
     * ========================================================
     *
     * Database now points to the new image, so the old asset
     * can safely be removed.
     */

    if (
      business.logoPublicId &&
      business.logoPublicId !==
        uploadedImage.public_id
    ) {
      try {
        await cloudinary.uploader.destroy(
          business.logoPublicId
        );
      } catch (cleanupError) {
        /*
         * Do not fail the successful replacement just because
         * old Cloudinary cleanup failed.
         */

        console.error(
          "OLD BUSINESS LOGO CLEANUP ERROR:",
          cleanupError
        );
      }
    }

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

    const updatedBusiness =
      await prisma.businessProfile.update({
        where: {
          userId,
        },

        data: {
          logo: null,
          logoPublicId: null,
        },
      });

    /*
     * ========================================================
     * CLEAN CLOUDINARY
     * ========================================================
     */

    if (oldPublicId) {
      try {
        await cloudinary.uploader.destroy(
          oldPublicId
        );
      } catch (cleanupError) {
        console.error(
          "DELETE BUSINESS LOGO CLOUDINARY ERROR:",
          cleanupError
        );
      }
    }

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

    let updatedBusiness;

    try {
      updatedBusiness =
        await prisma.businessProfile.update({
          where: {
            userId,
          },

          data: {
            coverImage:
              uploadedImage.secure_url,

            coverImagePublicId:
              uploadedImage.public_id,
          },
        });
    } catch (databaseError) {
      /*
       * Remove newly uploaded image if database persistence
       * fails.
       */

      try {
        await cloudinary.uploader.destroy(
          uploadedImage.public_id
        );
      } catch (cleanupError) {
        console.error(
          "NEW BUSINESS COVER CLEANUP ERROR:",
          cleanupError
        );
      }

      throw databaseError;
    }

    /*
     * ========================================================
     * DELETE PREVIOUS COVER
     * ========================================================
     */

    if (
      business.coverImagePublicId &&
      business.coverImagePublicId !==
        uploadedImage.public_id
    ) {
      try {
        await cloudinary.uploader.destroy(
          business.coverImagePublicId
        );
      } catch (cleanupError) {
        console.error(
          "OLD BUSINESS COVER CLEANUP ERROR:",
          cleanupError
        );
      }
    }

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
     * CLEAR DATABASE
     * ========================================================
     */

    const updatedBusiness =
      await prisma.businessProfile.update({
        where: {
          userId,
        },

        data: {
          coverImage: null,
          coverImagePublicId: null,
        },
      });

    /*
     * ========================================================
     * DELETE CLOUDINARY ASSET
     * ========================================================
     */

    if (oldPublicId) {
      try {
        await cloudinary.uploader.destroy(
          oldPublicId
        );
      } catch (cleanupError) {
        console.error(
          "DELETE BUSINESS COVER CLOUDINARY ERROR:",
          cleanupError
        );
      }
    }

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