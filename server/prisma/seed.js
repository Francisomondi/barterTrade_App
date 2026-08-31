import "dotenv/config";

import prisma from "../src/config/prisma.js";

const categories = [
  {
    name: "Phones",
    description: "Smartphones and mobile phones",
  },
  {
    name: "Computers",
    description: "Laptops, desktops and computer equipment",
  },
  {
    name: "Electronics",
    description: "TVs, cameras, speakers and electronics",
  },
  {
    name: "Vehicles",
    description: "Cars, motorcycles and other vehicles",
  },
  {
    name: "Furniture",
    description: "Sofas, tables, beds and other furniture",
  },
  {
    name: "Clothing",
    description: "Men's, women's and children's clothing",
  },
  {
    name: "Shoes",
    description: "Shoes, sneakers and footwear",
  },
  {
    name: "Property",
    description: "Land, houses and other property",
  },
  {
    name: "Appliances",
    description: "Fridges, cookers, washing machines and appliances",
  },
  {
    name: "Farm Products",
    description: "Farm produce, livestock and agricultural products",
  },
  {
    name: "Services",
    description: "Professional and personal services",
  },
  {
    name: "Collectibles",
    description: "Rare, vintage and collectible items",
  },
  {
    name: "Sports",
    description: "Sports equipment and sporting goods",
  },
  {
    name: "Books",
    description: "Books, textbooks and educational materials",
  },
  {
    name: "Other",
    description: "Items that do not fit another category",
  },
];

const seed = async () => {
  try {
    for (const category of categories) {
      await prisma.category.upsert({
        where: {
          name: category.name,
        },
        update: {
          description: category.description,
        },
        create: category,
      });
    }

    console.log("✅ Categories seeded successfully");
  } catch (error) {
    console.error("❌ Seed failed:", error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
};

seed();