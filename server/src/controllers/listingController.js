import prisma from "../config/prisma.js";
import uploadToCloudinary from "../utils/uploadToCloudinary.js";
import cloudinary from "../config/cloudinary.js";

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
    message: "Minimum value cannot exceed maximum value",
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

/*
 * Upload images to Cloudinary
 */
let uploadedImages = [];

if (req.files && req.files.length > 0) {
  try {
    uploadedImages = await Promise.all(
      req.files.map(async (file) => {
        const result = await uploadToCloudinary(
          file.buffer,
          "barter-trade/listings"
        );

        return {
          url: result.secure_url,
          publicId: result.public_id,
        };
      })
    );
  } catch (uploadError) {
    console.error(
      "CLOUDINARY UPLOAD ERROR:",
      uploadError
    );

    return res.status(500).json({
      success: false,
      message:
        "Unable to upload listing images",
    });
  }
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
      uploadedImages.length > 0
        ? {
            create: uploadedImages,
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
        orderBy: [
        {
        isPrimary: "desc",
        },
        {
        sortOrder: "asc",
        },
        ],
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

      images: {
        orderBy: [
        {
        isPrimary: "desc",
        },
        {
        sortOrder: "asc",
        },
        ],
      },


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

export const getMyListings = async (req, res) => {
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
      images: {
      orderBy: [
      {
      isPrimary: "desc",
      },
      {
      sortOrder: "asc",
      },
      ],
      },

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

export const deleteListingImage = async (req, res) => {
try {
const { id, imageId } = req.params;
const userId = req.user.id;

const image = await prisma.listingImage.findUnique({
  where: {
    id: imageId,
  },
  include: {
    listing: {
      select: {
        id: true,
        userId: true,
      },
    },
  },
});

if (!image) {
  return res.status(404).json({
    message: "Listing image not found",
  });
}

if (image.listing.id !== id) {
  return res.status(400).json({
    message: "Image does not belong to this listing",
  });
}

if (image.listing.userId !== userId) {
  return res.status(403).json({
    message: "You are not authorized to delete this image",
  });
}

// Delete from Cloudinary if a publicId exists
if (image.publicId) {
  try {
    await cloudinary.uploader.destroy(image.publicId, {
      resource_type: "image",
    });
  } catch (cloudinaryError) {
    console.error(
      "CLOUDINARY DELETE ERROR:",
      cloudinaryError
    );

    return res.status(500).json({
      message: "Failed to delete image from Cloudinary",
    });
  }
}

// Delete from database
await prisma.listingImage.delete({
  where: {
    id: imageId,
  },
});

return res.status(200).json({
  message: "Listing image deleted successfully",
  imageId,
});


} catch (error) {
console.error("DELETE LISTING IMAGE ERROR:", error);


return res.status(500).json({
  message: "Failed to delete listing image",
  error: error.message,
});

}
};


export const addListingImages = async (req, res) => {
try {
const { id } = req.params;
const userId = req.user.id;


const listing = await prisma.listing.findUnique({
  where: {
    id,
  },
  include: {
    images: true,
  },
});

if (!listing) {
  return res.status(404).json({
    message: "Listing not found",
  });
}

if (listing.userId !== userId) {
  return res.status(403).json({
    message: "You are not authorized to modify this listing",
  });
}

const files = req.files || [];

if (files.length === 0) {
  return res.status(400).json({
    message: "Please select at least one image",
  });
}

const currentImageCount = listing.images.length;
const newImageCount = currentImageCount + files.length;

if (newImageCount > 8) {
  return res.status(400).json({
    message: `A listing can have a maximum of 8 images. You currently have ${currentImageCount} image(s).`,
  });
}


const uploadedImages = await Promise.all(
req.files.map(async (file, index) => {
const result = await uploadToCloudinary(
file.buffer,
"barter-trade/listings"
);

return {
  listingId: id,
  url: result.secure_url,
  publicId: result.public_id,
  isPrimary: currentImageCount === 0 && index === 0,
  sortOrder: currentImageCount + index,
};


})
);




await prisma.listingImage.createMany({
  data: uploadedImages,
});

const updatedListing = await prisma.listing.findUnique({
  where: {
    id,
  },
  include: {
    images: true,
  },
});

return res.status(201).json({
  message: "Images added successfully",
  listing: updatedListing,
});


} catch (error) {
console.error("ADD LISTING IMAGES ERROR:", error);


return res.status(500).json({
  message: "Failed to add listing images",
  error: error.message,
});


}
};

export const setPrimaryListingImage = async (req, res) => {
try {
const { id, imageId } = req.params;
const userId = req.user.id;


// Check that the listing exists and belongs to the logged-in user
const listing = await prisma.listing.findUnique({
  where: { id },
  include: {
    images: {
      orderBy: {
        sortOrder: "asc",
      },
    },
  },
});

if (!listing) {
  return res.status(404).json({
    message: "Listing not found",
  });
}

if (listing.userId !== userId) {
  return res.status(403).json({
    message: "You are not authorized to modify this listing",
  });
}

// Check that the selected image belongs to this listing
const selectedImage = listing.images.find(
  (image) => image.id === imageId
);

if (!selectedImage) {
  return res.status(404).json({
    message: "Image not found for this listing",
  });
}

// Already primary
if (selectedImage.isPrimary && selectedImage.sortOrder === 0) {
  return res.status(200).json({
    message: "Image is already the main image",
    images: listing.images,
  });
}

// Move selected image to the front
const reorderedImages = [
  selectedImage,
  ...listing.images.filter((image) => image.id !== imageId),
];

// Update all images in a transaction
await prisma.$transaction(
  reorderedImages.map((image, index) =>
    prisma.listingImage.update({
      where: {
        id: image.id,
      },
      data: {
        isPrimary: index === 0,
        sortOrder: index,
      },
    })
  )
);

// Get the final image list
const updatedImages = await prisma.listingImage.findMany({
  where: {
    listingId: id,
  },
  orderBy: {
    sortOrder: "asc",
  },
});

return res.status(200).json({
  message: "Main image updated successfully",
  images: updatedImages,
});


} catch (error) {
console.error("SET PRIMARY IMAGE ERROR:", error);


return res.status(500).json({
  message: "Failed to set main image",
  error: error.message,
});

}
};

export const reorderListingImages = async (req, res) => {
try {
const { id } = req.params;
const userId = req.user.id;
const { imageIds } = req.body;

// Validate imageIds
if (!Array.isArray(imageIds) || imageIds.length === 0) {
  return res.status(400).json({
    message: "imageIds must be a non-empty array",
  });
}

// Find listing
const listing = await prisma.listing.findUnique({
  where: { id },
  include: {
    images: true,
  },
});

if (!listing) {
  return res.status(404).json({
    message: "Listing not found",
  });
}

// Check ownership
if (listing.userId !== userId) {
  return res.status(403).json({
    message: "You are not authorized to modify this listing",
  });
}

// Ensure every existing image is included
const existingImageIds = listing.images.map(
  (image) => image.id
);

if (imageIds.length !== existingImageIds.length) {
  return res.status(400).json({
    message: "All listing images must be included when reordering",
  });
}

const allImagesIncluded = existingImageIds.every(
  (imageId) => imageIds.includes(imageId)
);

if (!allImagesIncluded) {
  return res.status(400).json({
    message: "Invalid image list",
  });
}

// Prevent duplicate image IDs
const uniqueImageIds = new Set(imageIds);

if (uniqueImageIds.size !== imageIds.length) {
  return res.status(400).json({
    message: "Duplicate image IDs are not allowed",
  });
}

// Update image order
await prisma.$transaction(
  imageIds.map((imageId, index) =>
    prisma.listingImage.update({
      where: {
        id: imageId,
      },
      data: {
        sortOrder: index,
        isPrimary: index === 0,
      },
    })
  )
);

// Return updated images
const updatedImages = await prisma.listingImage.findMany({
  where: {
    listingId: id,
  },
  orderBy: {
    sortOrder: "asc",
  },
});

return res.status(200).json({
  message: "Listing images reordered successfully",
  images: updatedImages,
});


} catch (error) {
console.error("REORDER LISTING IMAGES ERROR:", error);


return res.status(500).json({
  message: "Failed to reorder listing images",
  error: error.message,
});

}
};




