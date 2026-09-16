
import prisma from "../config/prisma.js";
import { calculateMatchScore } from "./matchingService.js";


const normalizePair = (listingAId, listingBId) => {
  if (listingAId < listingBId) {
    return {
      listingAId,
      listingBId,
    };
  }

  return {
    listingAId: listingBId,
    listingBId: listingAId,
  };
};


const matchInclude = {
  listingA: {
    include: {
      images: {
        orderBy: [
          { isPrimary: "desc" },
          { sortOrder: "asc" },
        ],
      },
    },
  },

  listingB: {
    include: {
      images: {
        orderBy: [
          { isPrimary: "desc" },
          { sortOrder: "asc" },
        ],
      },
    },
  },
};


export const getMatchByListings = async (
  listingAId,
  listingBId
) => {
  const pair = normalizePair(listingAId, listingBId);

  return prisma.match.findFirst({
    where: {
      OR: [
        {
          listingAId: pair.listingAId,
          listingBId: pair.listingBId,
        },
        {
          listingAId: pair.listingBId,
          listingBId: pair.listingAId,
        },
      ],
    },

    include: matchInclude,
  });
};


export const createOrUpdateMatch = async ({
  userId,
  listingA,
  listingB,
}) => {
  if (!listingA || !listingB) {
    throw new Error("Both listings are required");
  }

  if (listingA.id === listingB.id) {
    throw new Error("A listing cannot match with itself");
  }

  if (listingA.userId === listingB.userId) {
    throw new Error("A user cannot match their own listings");
  }

  
  if (
    listingA.status !== "ACTIVE" ||
    listingB.status !== "ACTIVE"
  ) {
    throw new Error("Only active listings can be matched");
  }

  
  const pair = normalizePair(
    listingA.id,
    listingB.id
  );

 
  const scoreData = calculateMatchScore(
    listingA,
    listingB
  );


  const existingMatch = await prisma.match.findFirst({
    where: {
      OR: [
        {
          listingAId: pair.listingAId,
          listingBId: pair.listingBId,
        },
        {
          listingAId: pair.listingBId,
          listingBId: pair.listingAId,
        },
      ],
    },
  });


  if (existingMatch) {
    return prisma.match.update({
      where: {
        id: existingMatch.id,
      },

      data: {
        score: scoreData.score,
        valueScore: scoreData.valueScore,
        locationScore: scoreData.locationScore,
        trustScore: scoreData.trustScore ?? null,
        status: "ACTIVE",
      },

      include: matchInclude,
    });
  }

  
  try {
    return await prisma.match.create({
      data: {
        userId,

        listingAId: pair.listingAId,
        listingBId: pair.listingBId,

        score: scoreData.score,
        valueScore: scoreData.valueScore,
        locationScore: scoreData.locationScore,
        trustScore: scoreData.trustScore ?? null,

        status: "ACTIVE",
      },

      include: matchInclude,
    });
  } catch (error) {
  
    if (error?.code === "P2002") {
      const concurrentMatch = await prisma.match.findFirst({
        where: {
          OR: [
            {
              listingAId: pair.listingAId,
              listingBId: pair.listingBId,
            },
            {
              listingAId: pair.listingBId,
              listingBId: pair.listingAId,
            },
          ],
        },
      });

      if (concurrentMatch) {
        return prisma.match.update({
          where: {
            id: concurrentMatch.id,
          },

          data: {
            score: scoreData.score,
            valueScore: scoreData.valueScore,
            locationScore: scoreData.locationScore,
            trustScore: scoreData.trustScore ?? null,
            status: "ACTIVE",
          },

          include: matchInclude,
        });
      }
    }

    throw error;
  }
};

export const getListingForMatching = async (listingId) => {
  return prisma.listing.findUnique({
    where: {
      id: listingId,
    },

    include: {
      images: {
        orderBy: [
          { isPrimary: "desc" },
          { sortOrder: "asc" },
        ],
      },

      category: true,

      user: {
        select: {
          id: true,
          name: true,
          location: true,
          barterScore: true,
          completedTrades: true,
        },
      },
    },
  });
};


export const findMatchesForListing = async (
  listingId,
  userId
) => {
  const listing = await getListingForMatching(listingId);

  if (!listing) {
    throw new Error("Listing not found");
  }

  if (listing.userId !== userId) {
    throw new Error(
      "You can only generate matches for your own listing"
    );
  }

  if (listing.status !== "ACTIVE") {
    throw new Error(
      "Only active listings can generate matches"
    );
  }

  const candidates = await prisma.listing.findMany({
    where: {
      
      status: "ACTIVE",

     
      userId: {
        not: listing.userId,
      },

    
      id: {
        not: listing.id,
      },
    },

    include: {
      images: {
        orderBy: [
          { isPrimary: "desc" },
          { sortOrder: "asc" },
        ],
      },

      category: true,

      user: {
        select: {
          id: true,
          name: true,
          location: true,
          barterScore: true,
          completedTrades: true,
        },
      },
    },
  });

  const matches = [];

  for (const candidate of candidates) {
    try {
      const match = await createOrUpdateMatch({
        userId,
        listingA: listing,
        listingB: candidate,
      });

      matches.push(match);
    } catch (error) {
      console.error(
        `MATCH ERROR ${listing.id} ↔ ${candidate.id}:`,
        error.message
      );
    }
  }

  return matches.sort(
    (a, b) => b.score - a.score
  );
};


export const getUserMatches = async (userId) => {
  return prisma.match.findMany({
    where: {
      status: "ACTIVE",

      OR: [
        {
          userId,
        },

        {
          listingA: {
            userId,
          },
        },

        {
          listingB: {
            userId,
          },
        },
      ],

      listingA: {
        status: "ACTIVE",
      },

      listingB: {
        status: "ACTIVE",
      },
    },

    orderBy: {
      score: "desc",
    },

    include: {
      listingA: {
        include: {
          images: {
            orderBy: [
              { isPrimary: "desc" },
              { sortOrder: "asc" },
            ],
          },

          category: true,
        },
      },

      listingB: {
        include: {
          images: {
            orderBy: [
              { isPrimary: "desc" },
              { sortOrder: "asc" },
            ],
          },

          category: true,
        },
      },
    },
  });
};

export const getMatchById = async (matchId) => {
  return prisma.match.findFirst({
    where: {
      id: matchId,
      status: "ACTIVE",

    
      listingA: {
        status: "ACTIVE",
      },

      listingB: {
        status: "ACTIVE",
      },
    },

    include: {
      listingA: {
        include: {
          images: {
            orderBy: [
              { isPrimary: "desc" },
              { sortOrder: "asc" },
            ],
          },

          category: true,

          user: {
            select: {
              id: true,
              name: true,
              avatar: true,
              location: true,
              barterScore: true,
              completedTrades: true,
            },
          },
        },
      },

      listingB: {
        include: {
          images: {
            orderBy: [
              { isPrimary: "desc" },
              { sortOrder: "asc" },
            ],
          },

          category: true,

          user: {
            select: {
              id: true,
              name: true,
              avatar: true,
              location: true,
              barterScore: true,
              completedTrades: true,
            },
          },
        },
      },
    },
  });
};


export const deactivateMatch = async (matchId) => {
  return prisma.match.update({
    where: {
      id: matchId,
    },

    data: {
      status: "INACTIVE",
    },
  });
};


export const cleanupStaleMatches = async () => {
  const result = await prisma.match.updateMany({
    where: {
      status: "ACTIVE",

      OR: [
        {
          listingA: {
            status: {
              not: "ACTIVE",
            },
          },
        },

        {
          listingB: {
            status: {
              not: "ACTIVE",
            },
          },
        },
      ],
    },

    data: {
      status: "INACTIVE",
    },
  });

  return result.count;
};


