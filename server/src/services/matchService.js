import prisma from "../config/prisma.js";
import { calculateMatchScore } from "./matchingService.js";

/**

* Normalize listing pair so A/B ordering is always consistent.
* This prevents duplicate matches for the same two listings.
  */
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

/**

* Get an existing match between two listings.
  */
  export const getMatchByListings = async (listingAId, listingBId) => {
  const pair = normalizePair(listingAId, listingBId);

return prisma.match.findUnique({
where: {
listingAId_listingBId: {
listingAId: pair.listingAId,
listingBId: pair.listingBId,
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
},
});
};

/**

* Create or update a match.
  */
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

const pair = normalizePair(listingA.id, listingB.id);

const scoreData = calculateMatchScore(listingA, listingB);

return prisma.match.upsert({
where: {
listingAId_listingBId: {
listingAId: pair.listingAId,
listingBId: pair.listingBId,
},
},


update: {
  score: scoreData.score,
  valueScore: scoreData.valueScore,
  locationScore: scoreData.locationScore,
  trustScore: scoreData.trustScore ?? null,
  status: "ACTIVE",
},

create: {
  userId,
  listingAId: pair.listingAId,
  listingBId: pair.listingBId,
  score: scoreData.score,
  valueScore: scoreData.valueScore,
  locationScore: scoreData.locationScore,
  trustScore: scoreData.trustScore ?? null,
  status: "ACTIVE",
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
},


});
};

/**

* Get a listing with the fields required by the matching engine.
  */
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

/**

* Generate matches for one listing.
*
* Only ACTIVE listings belonging to other users
* are considered.
  */
  export const findMatchesForListing = async (listingId, userId) => {
  const listing = await getListingForMatching(listingId);

if (!listing) {
throw new Error("Listing not found");
}

if (listing.userId !== userId) {
throw new Error("You can only generate matches for your own listing");
}

if (listing.status !== "ACTIVE") {
throw new Error("Only active listings can generate matches");
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

return matches.sort((a, b) => b.score - a.score);
};

/**

* Get matches belonging to a user.
  */
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

/**

* Get a single match.
  */
  export const getMatchById = async (matchId) => {
  return prisma.match.findUnique({
  where: {
  id: matchId,
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

/**

* Deactivate a match.
  */
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


  /**

* Deactivate stale matches.
*
* A match is stale when either listing is no longer ACTIVE.
  */
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

