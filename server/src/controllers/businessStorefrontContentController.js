
import prisma from "../config/prisma.js";

import {
  resolveBusinessStorefrontEntitlement,
} from "../services/businessStorefrontEntitlementService.js";

/**
 * Resolve business ownership and Business Pro access.
 */
const resolveAccess = async (req, res) => {
  const userId = req.user?.id;

  if (!userId) {
    res.status(401).json({
      success: false,
      code: "AUTHENTICATION_REQUIRED",
      message: "Authentication required.",
    });
    return null;
  }

  const business = await prisma.businessProfile.findUnique({
    where: { userId },
    select: {
      id: true,
      businessName: true,
      slug: true,
      status: true,
    },
  });

  if (!business) {
    res.status(404).json({
      success: false,
      code: "BUSINESS_NOT_FOUND",
      message: "Business account not found.",
    });
    return null;
  }

  if (business.status !== "ACTIVE") {
    res.status(403).json({
      success: false,
      code: "BUSINESS_NOT_ACTIVE",
      message: "Your business must be active.",
    });
    return null;
  }

  const entitlement =
    await resolveBusinessStorefrontEntitlement(userId);

  const isBusinessPro = Boolean(
    entitlement?.businessId === business.id &&
    entitlement?.isBusinessPro === true
  );

  return {
    business,
    isBusinessPro,
  };
};

/**
 * GET MY BUSINESS INTRODUCTION
 *
 * Intended route:
 * GET /api/business/me/storefront/introduction
 *
 * Business Free can read saved content.
 */
export const getMyBusinessIntroduction = async (req, res) => {
  try {
    const access = await resolveAccess(req, res);
    if (!access) return;

    const settings =
      await prisma.businessStorefrontSettings.findUnique({
        where: {
          businessId: access.business.id,
        },
        select: {
          introduction: true,
        },
      });

    return res.status(200).json({
      success: true,
      access: {
        tier: access.isBusinessPro
          ? "BUSINESS_PRO"
          : "BUSINESS_FREE",
        canManageIntroduction: access.isBusinessPro,
      },
      introduction: settings?.introduction ?? null,
    });
  } catch (error) {
    console.error("GET BUSINESS INTRODUCTION ERROR:", error);

    return res.status(500).json({
      success: false,
      message: "Unable to load business introduction.",
    });
  }
};

/**
 * PATCH MY BUSINESS INTRODUCTION
 *
 * Intended route:
 * PATCH /api/business/me/storefront/introduction
 *
 * Business Pro only.
 */
export const updateMyBusinessIntroduction = async (req, res) => {
  try {
    const access = await resolveAccess(req, res);
    if (!access) return;

    if (!access.isBusinessPro) {
      return res.status(403).json({
        success: false,
        code: "BUSINESS_PRO_REQUIRED",
        message: "Business Pro is required to edit your introduction.",
        upgradeRequired: true,
      });
    }

    const { introduction } = req.body ?? {};

    if (
      introduction !== null &&
      typeof introduction !== "string"
    ) {
      return res.status(400).json({
        success: false,
        code: "INVALID_INTRODUCTION",
        message: "Introduction must be text or null.",
      });
    }

    const cleanedIntroduction =
      typeof introduction === "string"
        ? introduction.trim()
        : null;

    if (cleanedIntroduction?.length > 1000) {
      return res.status(400).json({
        success: false,
        code: "INTRODUCTION_TOO_LONG",
        message: "Introduction cannot exceed 1000 characters.",
      });
    }

    const settings =
      await prisma.businessStorefrontSettings.upsert({
        where: {
          businessId: access.business.id,
        },
        create: {
          businessId: access.business.id,
          introduction: cleanedIntroduction || null,
        },
        update: {
          introduction: cleanedIntroduction || null,
        },
        select: {
          introduction: true,
        },
      });

    return res.status(200).json({
      success: true,
      message: "Business introduction updated successfully.",
      introduction: settings.introduction,
    });
  } catch (error) {
    console.error("UPDATE BUSINESS INTRODUCTION ERROR:", error);

    return res.status(500).json({
      success: false,
      message: "Unable to update business introduction.",
    });
  }
};


/**
 * ============================================================
 * BUSINESS PROMOTIONAL HIGHLIGHTS
 * ============================================================
 *
 * GET: Read saved highlights (Free and Pro).
 * POST: Create a highlight (Pro only).
 * PATCH: Update a highlight (Pro only).
 * DELETE: Remove a highlight (Pro only).
 * PATCH reorder: Change display order (Pro only).
 */

const MAX_PROMOTIONAL_HIGHLIGHTS = 6;

const requirePromotionalHighlightsPro = (access, res) => {
  if (access.isBusinessPro) return true;

  res.status(403).json({
    success: false,
    code: "BUSINESS_PRO_REQUIRED",
    message: "Business Pro is required to manage promotional highlights.",
    upgradeRequired: true,
  });

  return false;
};

const validateHighlightInput = (body, existing = null) => {
  const title = body?.title ?? existing?.title;
  const description =
    body?.description !== undefined
      ? body.description
      : existing?.description ?? null;
  const icon =
    body?.icon !== undefined
      ? body.icon
      : existing?.icon ?? null;
  const isActive =
    body?.isActive !== undefined
      ? body.isActive
      : existing?.isActive ?? true;

  if (
    typeof title !== "string" ||
    !title.trim() ||
    title.trim().length > 100
  ) {
    return {
      error: "Title must contain between 1 and 100 characters.",
    };
  }

  if (
    description !== null &&
    (typeof description !== "string" ||
      description.trim().length > 300)
  ) {
    return {
      error: "Description must be text with at most 300 characters.",
    };
  }

  if (
    icon !== null &&
    (typeof icon !== "string" ||
      icon.trim().length > 50)
  ) {
    return {
      error: "Icon must be text with at most 50 characters.",
    };
  }

  if (typeof isActive !== "boolean") {
    return {
      error: "isActive must be true or false.",
    };
  }

  return {
    data: {
      title: title.trim(),
      description: description?.trim() || null,
      icon: icon?.trim() || null,
      isActive,
    },
  };
};

/**
 * GET /api/business/me/storefront/highlights
 *
 * Free businesses can read saved highlights.
 */
export const getMyBusinessPromotionalHighlights = async (req, res) => {
  try {
    const access = await resolveAccess(req, res);
    if (!access) return;

    const highlights =
      await prisma.businessPromotionalHighlight.findMany({
        where: {
          businessId: access.business.id,
        },
        orderBy: [
          { sortOrder: "asc" },
          { createdAt: "asc" },
        ],
      });

    return res.status(200).json({
      success: true,
      access: {
        tier: access.isBusinessPro
          ? "BUSINESS_PRO"
          : "BUSINESS_FREE",
        canManageHighlights: access.isBusinessPro,
        maxHighlights: access.isBusinessPro
          ? MAX_PROMOTIONAL_HIGHLIGHTS
          : 0,
      },
      highlights,
    });
  } catch (error) {
    console.error("GET PROMOTIONAL HIGHLIGHTS ERROR:", error);

    return res.status(500).json({
      success: false,
      message: "Unable to load promotional highlights.",
    });
  }
};

/**
 * POST /api/business/me/storefront/highlights
 */
export const createMyBusinessPromotionalHighlight = async (req, res) => {
  try {
    const access = await resolveAccess(req, res);
    if (!access) return;
    if (!requirePromotionalHighlightsPro(access, res)) return;

    const validation = validateHighlightInput(req.body);

    if (validation.error) {
      return res.status(400).json({
        success: false,
        code: "INVALID_HIGHLIGHT",
        message: validation.error,
      });
    }

    const result = await prisma.$transaction(async (tx) => {
      // Serialize concurrent changes for the same business.
      await tx.$queryRaw`
        SELECT id FROM "BusinessProfile"
        WHERE id = ${access.business.id}
        FOR UPDATE
      `;

      const count = await tx.businessPromotionalHighlight.count({
        where: {
          businessId: access.business.id,
        },
      });

      if (count >= MAX_PROMOTIONAL_HIGHLIGHTS) {
        return { limitReached: true };
      }

      const lastHighlight =
        await tx.businessPromotionalHighlight.findFirst({
          where: {
            businessId: access.business.id,
          },
          orderBy: {
            sortOrder: "desc",
          },
          select: {
            sortOrder: true,
          },
        });

      const highlight =
        await tx.businessPromotionalHighlight.create({
          data: {
            businessId: access.business.id,
            ...validation.data,
            sortOrder: (lastHighlight?.sortOrder ?? -1) + 1,
          },
        });

      return { highlight };
    });

    if (result.limitReached) {
      return res.status(409).json({
        success: false,
        code: "HIGHLIGHT_LIMIT_REACHED",
        message: "Business Pro allows up to six promotional highlights.",
      });
    }

    return res.status(201).json({
      success: true,
      message: "Promotional highlight created successfully.",
      highlight: result.highlight,
    });
  } catch (error) {
    console.error("CREATE PROMOTIONAL HIGHLIGHT ERROR:", error);

    return res.status(500).json({
      success: false,
      message: "Unable to create promotional highlight.",
    });
  }
};

/**
 * PATCH /api/business/me/storefront/highlights/:highlightId
 */
export const updateMyBusinessPromotionalHighlight = async (req, res) => {
  try {
    const access = await resolveAccess(req, res);
    if (!access) return;
    if (!requirePromotionalHighlightsPro(access, res)) return;

    const { highlightId } = req.params;

    const existing =
      await prisma.businessPromotionalHighlight.findFirst({
        where: {
          id: highlightId,
          businessId: access.business.id,
        },
      });

    if (!existing) {
      return res.status(404).json({
        success: false,
        code: "HIGHLIGHT_NOT_FOUND",
        message: "Promotional highlight not found.",
      });
    }

    const validation = validateHighlightInput(req.body, existing);

    if (validation.error) {
      return res.status(400).json({
        success: false,
        code: "INVALID_HIGHLIGHT",
        message: validation.error,
      });
    }

    const updated = await prisma.businessPromotionalHighlight.update({
      where: {
        id: existing.id,
        businessId: access.business.id,
      },
      data: validation.data,
    });

    return res.status(200).json({
      success: true,
      message: "Promotional highlight updated successfully.",
      highlight: updated,
    });
  } catch (error) {
    console.error("UPDATE PROMOTIONAL HIGHLIGHT ERROR:", error);

    return res.status(500).json({
      success: false,
      message: "Unable to update promotional highlight.",
    });
  }
};

/**
 * DELETE /api/business/me/storefront/highlights/:highlightId
 */
export const deleteMyBusinessPromotionalHighlight = async (req, res) => {
  try {
    const access = await resolveAccess(req, res);
    if (!access) return;
    if (!requirePromotionalHighlightsPro(access, res)) return;

    const result =
      await prisma.businessPromotionalHighlight.deleteMany({
        where: {
          id: req.params.highlightId,
          businessId: access.business.id,
        },
      });

    if (result.count === 0) {
      return res.status(404).json({
        success: false,
        code: "HIGHLIGHT_NOT_FOUND",
        message: "Promotional highlight not found.",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Promotional highlight deleted successfully.",
    });
  } catch (error) {
    console.error("DELETE PROMOTIONAL HIGHLIGHT ERROR:", error);

    return res.status(500).json({
      success: false,
      message: "Unable to delete promotional highlight.",
    });
  }
};

/**
 * PATCH /api/business/me/storefront/highlights/reorder
 *
 * Body:
 * { "highlightIds": ["id1", "id2", "id3"] }
 */
export const reorderMyBusinessPromotionalHighlights = async (req, res) => {
  try {
    const access = await resolveAccess(req, res);
    if (!access) return;
    if (!requirePromotionalHighlightsPro(access, res)) return;

    const { highlightIds } = req.body ?? {};

    if (
      !Array.isArray(highlightIds) ||
      highlightIds.length > MAX_PROMOTIONAL_HIGHLIGHTS ||
      highlightIds.some(
        (id) => typeof id !== "string" || !id.trim()
      ) ||
      new Set(highlightIds).size !== highlightIds.length
    ) {
      return res.status(400).json({
        success: false,
        code: "INVALID_HIGHLIGHT_ORDER",
        message: "Provide a valid list of unique highlight IDs.",
      });
    }

    const result = await prisma.$transaction(async (tx) => {
      await tx.$queryRaw`
        SELECT id FROM "BusinessProfile"
        WHERE id = ${access.business.id}
        FOR UPDATE
      `;

      const existing =
        await tx.businessPromotionalHighlight.findMany({
          where: {
            businessId: access.business.id,
          },
          select: {
            id: true,
          },
        });

      const existingIds = new Set(existing.map((item) => item.id));

      if (
        existing.length !== highlightIds.length ||
        highlightIds.some((id) => !existingIds.has(id))
      ) {
        return { invalidOrder: true };
      }

      for (const [index, id] of highlightIds.entries()) {
        await tx.businessPromotionalHighlight.update({
          where: {
            id,
            businessId: access.business.id,
          },
          data: {
            sortOrder: index,
          },
        });
      }

      const highlights =
        await tx.businessPromotionalHighlight.findMany({
          where: {
            businessId: access.business.id,
          },
          orderBy: {
            sortOrder: "asc",
          },
        });

      return { highlights };
    });

    if (result.invalidOrder) {
      return res.status(400).json({
        success: false,
        code: "HIGHLIGHT_ORDER_MISMATCH",
        message: "The order must include all your saved highlights.",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Promotional highlights reordered successfully.",
      highlights: result.highlights,
    });
  } catch (error) {
    console.error("REORDER PROMOTIONAL HIGHLIGHTS ERROR:", error);

    return res.status(500).json({
      success: false,
      message: "Unable to reorder promotional highlights.",
    });
  }
};
