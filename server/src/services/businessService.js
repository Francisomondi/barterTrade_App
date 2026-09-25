import prisma from "../config/prisma.js";
import {
  BUSINESS_STATUSES,
  generateBusinessSlug,
} from "../config/businessConfig.js";

/*
 * ============================================================
 * GET BUSINESS PROFILE BY USER
 * ============================================================
 */

export const getBusinessProfileByUserId = async (
  userId
) => {
  if (!userId) {
    return null;
  }

  return prisma.businessProfile.findUnique({
    where: {
      userId,
    },
  });
};

/*
 * ============================================================
 * GET BUSINESS PROFILE BY SLUG
 * ============================================================
 */

export const getBusinessProfileBySlug = async (
  slug
) => {
  if (!slug) {
    return null;
  }

  return prisma.businessProfile.findUnique({
    where: {
      slug,
    },
  });
};

/*
 * ============================================================
 * CHECK IF USER HAS BUSINESS ACCOUNT
 * ============================================================
 */

export const isBusinessUser = async (
  userId
) => {
  if (!userId) {
    return false;
  }

  const business =
    await getBusinessProfileByUserId(
      userId
    );

  return Boolean(
    business &&
      business.status ===
        BUSINESS_STATUSES.ACTIVE
  );
};

/*
 * ============================================================
 * GENERATE UNIQUE BUSINESS SLUG
 * ============================================================
 *
 * Examples:
 *
 * Royal Pallets & Interior Decor
 *
 * royal-pallets-and-interior-decor
 *
 * If already taken:
 *
 * royal-pallets-and-interior-decor-2
 * royal-pallets-and-interior-decor-3
 *
 * etc.
 */

export const generateUniqueBusinessSlug =
  async (businessName) => {
    const baseSlug =
      generateBusinessSlug(
        businessName
      );

    if (!baseSlug) {
      throw new Error(
        "Unable to generate business slug."
      );
    }

    /*
     * First try the clean slug.
     */

    const existing =
      await prisma.businessProfile.findUnique({
        where: {
          slug: baseSlug,
        },

        select: {
          id: true,
        },
      });

    if (!existing) {
      return baseSlug;
    }

    /*
     * Generate numbered alternatives.
     */

    let counter = 2;

    while (counter <= 10000) {
      const suffix =
        `-${counter}`;

      /*
       * Keep final slug inside our configured
       * 120-character application limit.
       */

      const maxBaseLength =
        Math.max(
          1,
          120 - suffix.length
        );

      const candidate =
        `${baseSlug
          .slice(
            0,
            maxBaseLength
          )
          .replace(/-$/g, "")}${suffix}`;

      const candidateExists =
        await prisma.businessProfile.findUnique({
          where: {
            slug:
              candidate,
          },

          select: {
            id: true,
          },
        });

      if (!candidateExists) {
        return candidate;
      }

      counter += 1;
    }

    throw new Error(
      "Unable to generate a unique business slug."
    );
  };

/*
 * ============================================================
 * GET BUSINESS ACCOUNT STATUS
 * ============================================================
 */

export const getBusinessStatus = async (
  userId
) => {
  if (!userId) {
    return {
      isBusiness: false,
      businessProfile: null,
    };
  }

  const businessProfile =
    await getBusinessProfileByUserId(
      userId
    );

  if (!businessProfile) {
    return {
      isBusiness: false,
      businessProfile: null,
    };
  }

  return {
    isBusiness:
      businessProfile.status ===
      BUSINESS_STATUSES.ACTIVE,

    businessProfile,
  };
};