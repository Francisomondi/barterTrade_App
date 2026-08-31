import prisma from "../config/prisma.js";

export const getCategories = async (req, res) => {
  try {
    const categories = await prisma.category.findMany({
      orderBy: {
        name: "asc",
      },
      include: {
        _count: {
          select: {
            listings: true,
          },
        },
      },
    });

    return res.json({
      success: true,
      categories,
    });
  } catch (error) {
    console.error(
      "GET CATEGORIES ERROR:",
      error
    );

    return res.status(500).json({
      success: false,
      message: "Unable to fetch categories",
    });
  }
};