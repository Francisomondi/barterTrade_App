import prisma from "../config/prisma.js";

const validConditions = [
  "NEW",
  "LIKE_NEW",
  "GOOD",
  "FAIR",
  "POOR",
];

export const createListing = async (req, res) => {
  try {
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
      images,
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

    if (!validConditions.includes(condition)) {
      return res.status(400).json({
        success: false,
        message: "Invalid item condition",
      });
    }

    const value = Number(estimatedValue);

    if (!Number.isFinite(value) || value <= 0) {
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
        message: "Minimum value cannot be negative",
      });
    }

    if (
      maximumValue !== undefined &&
      maximumValue !== null &&
      Number(maximumValue) < 0
    ) {
      return res.status(400).json({
        success: false,
        message: "Maximum value cannot be negative",
      });
    }

    if (
      minimumValue !== undefined &&
      maximumValue !== undefined &&
      Number(minimumValue) > Number(maximumValue)
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Minimum value cannot exceed maximum value",
      });
    }

    const category = await prisma.category.findUnique({
      where: {
        id: categoryId,
      },
    });

    if (!category) {
      return res.status(404).json({
        success: false,
        message: "Category not found",
      });
    }

    const listing = await prisma.listing.create({
      data: {
        userId: req.user.id,
        categoryId,

        title: title.trim(),
        description: description.trim(),

        condition,

        estimatedValue: value,

        minimumValue:
          minimumValue !== undefined &&
          minimumValue !== null
            ? Number(minimumValue)
            : null,

        maximumValue:
          maximumValue !== undefined &&
          maximumValue !== null
            ? Number(maximumValue)
            : null,

        location: location?.trim() || null,

        latitude:
          latitude !== undefined &&
          latitude !== null
            ? Number(latitude)
            : null,

        longitude:
          longitude !== undefined &&
          longitude !== null
            ? Number(longitude)
            : null,

        images:
          Array.isArray(images)
            ? {
                create: images
                  .filter(
                    (image) =>
                      image?.url
                  )
                  .map((image) => ({
                    url: image.url,
                    publicId:
                      image.publicId || null,
                  })),
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
            completedTrades: true,
          },
        },
      },
    });

    return res.status(201).json({
      success: true,
      message: "Listing created successfully",
      listing,
    });
  } catch (error) {
    console.error(
      "CREATE LISTING ERROR:",
      error
    );

    return res.status(500).json({
      success: false,
      message: "Unable to create listing",
    });
  }
};

export const getListings = async (req, res) => {
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

    const pageNumber = Math.max(
      Number(page) || 1,
      1
    );

    const limitNumber = Math.min(
      Math.max(Number(limit) || 12, 1),
      50
    );

    const skip =
      (pageNumber - 1) * limitNumber;

    const where = {
      status: "ACTIVE",
    };

    if (categoryId) {
      where.categoryId = categoryId;
    }

    if (condition) {
      where.condition = condition;
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

    if (minValue || maxValue) {
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

    const [listings, total] =
      await prisma.$transaction([
        prisma.listing.findMany({
          where,

          skip,

          take: limitNumber,

          orderBy: {
            createdAt: "desc",
          },

          include: {
            category: true,

            images: {
              take: 1,
            },

            user: {
              select: {
                id: true,
                name: true,
                avatar: true,
                barterScore: true,
                completedTrades: true,
              },
            },
          },
        }),

        prisma.listing.count({
          where,
        }),
      ]);

    return res.json({
      success: true,
      listings,

      pagination: {
        page: pageNumber,
        limit: limitNumber,
        total,
        pages: Math.ceil(
          total / limitNumber
        ),
      },
    });
  } catch (error) {
    console.error(
      "GET LISTINGS ERROR:",
      error
    );

    return res.status(500).json({
      success: false,
      message: "Unable to fetch listings",
    });
  }
};

export const getListingById = async (req, res) => {
  try {
    const { id } = req.params;

    const listing =
      await prisma.listing.findUnique({
        where: {
          id,
        },

        include: {
          category: true,

          images: true,

          user: {
            select: {
              id: true,
              name: true,
              avatar: true,
              bio: true,
              location: true,
              barterScore: true,
              completedTrades: true,
              createdAt: true,
            },
          },
        },
      });

    if (!listing) {
      return res.status(404).json({
        success: false,
        message: "Listing not found",
      });
    }

    return res.json({
      success: true,
      listing,
    });
  } catch (error) {
    console.error(
      "GET LISTING ERROR:",
      error
    );

    return res.status(500).json({
      success: false,
      message: "Unable to fetch listing",
    });
  }
};
export const getMyListings = async (req,res) => {
  try {
    const listings =
      await prisma.listing.findMany({
        where: {
          userId: req.user.id,
        },

        orderBy: {
          createdAt: "desc",
        },

        include: {
          category: true,
          images: true,
        },
      });

    return res.json({
      success: true,
      listings,
    });
  } catch (error) {
    console.error(
      "GET MY LISTINGS ERROR:",
      error
    );

    return res.status(500).json({
      success: false,
      message: "Unable to fetch your listings",
    });
  }
};

export const removeListing = async (
  req,
  res
) => {
  try {
    const { id } = req.params;

    const listing =
      await prisma.listing.findUnique({
        where: {
          id,
        },
      });

    if (!listing) {
      return res.status(404).json({
        success: false,
        message: "Listing not found",
      });
    }

    if (listing.userId !== req.user.id) {
      return res.status(403).json({
        success: false,
        message:
          "You can only remove your own listings",
      });
    }

    if (listing.status === "TRADED") {
      return res.status(400).json({
        success: false,
        message:
          "A traded listing cannot be removed",
      });
    }

    const updatedListing =
      await prisma.listing.update({
        where: {
          id,
        },

        data: {
          status: "REMOVED",
        },
      });

    return res.json({
      success: true,
      message: "Listing removed successfully",
      listing: updatedListing,
    });
  } catch (error) {
    console.error(
      "REMOVE LISTING ERROR:",
      error
    );

    return res.status(500).json({
      success: false,
      message: "Unable to remove listing",
    });
  }
};