import prisma from "../config/prisma.js";

import {
calculateMatchScore,
} from "./matchingService.js";

/**

* ---
* NORMALIZE LISTING PAIR
* ---
*
* Ensures:
*
* A + B
*
* and
*
* B + A
*
* are treated as the same pair.
  */

const normalizeListingPair = (
listingAId,
listingBId
) => {
if (
listingAId < listingBId
) {
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

* ---
* GET MATCH BY LISTING PAIR
* ---

*/

export const getMatchByListings = async (
listingAId,
listingBId
) => {
const pair =
normalizeListingPair(
listingAId,
listingBId
);

return prisma.match.findUnique({
where: {
listingAId_listingBId: {
listingAId:
pair.listingAId,


    listingBId:
      pair.listingBId,
  },
},


});
};

/**

* ---
* CREATE OR UPDATE MATCH
* ---

*/

export const createOrUpdateMatch = async (
listingA,
listingB
) => {
/*

* Never match a listing against itself.
  */

if (
listingA.id === listingB.id
) {
return null;
}

/*

* Never match listings belonging
* to the same user.
  */

if (
listingA.userId &&
listingB.userId &&
listingA.userId === listingB.userId
) {
return null;
}

/*

* Calculate compatibility.
  */

const result =
calculateMatchScore(
listingA,
listingB
);

/*

* Ignore anything below
* the minimum match threshold.
  */

if (!result.isMatch) {
return null;
}

/*

* Normalize the pair.
  */

const pair =
normalizeListingPair(
listingA.id,
listingB.id
);

/*

* Create or update.
*
* upsert prevents duplicate
* records when the same pair
* is processed repeatedly.
  */

const match =
await prisma.match.upsert({
where: {
listingAId_listingBId: {
listingAId:
pair.listingAId,


      listingBId:
        pair.listingBId,
    },
  },

  update: {
    score: result.score,
    level: result.level,
  },

  create: {
    listingAId:
      pair.listingAId,

    listingBId:
      pair.listingBId,

    score: result.score,

    level: result.level,

    status: "PENDING",
  },
});


return {
match,
score: result.score,
level: result.level,
breakdown: result.breakdown,
};
};

/**

* ---
* FIND MATCHES FOR A LISTING
* ---

*/

export const findMatchesForListing = async (
listingId
) => {
const listing =
await prisma.listing.findUnique({
where: {
id: listingId,
},


  include: {
    category: true,
  },
});


if (!listing) {
throw new Error(
"Listing not found"
);
}

/*

* Only ACTIVE listings can
* participate in matching.
  */

if (
listing.status !== "ACTIVE"
) {
return [];
}

/*

* Get other active listings.
  */

const candidates =
await prisma.listing.findMany({
where: {
status: "ACTIVE",


    id: {
      not: listingId,
    },

    userId: {
      not: listing.userId,
    },
  },

  include: {
    category: true,
  },
});


const matches = [];

/*

* Calculate compatibility
* against every candidate.
  */

for (
const candidate of candidates
) {
const result =
await createOrUpdateMatch(
listing,
candidate
);


if (result) {
  matches.push(result);
}


}

/*

* Highest scoring matches first.
  */

matches.sort(
(a, b) =>
b.score - a.score
);

return matches;
};

/**

* ---
* GET MATCHES FOR A USER
* ---

*/

export const getUserMatches = async (
userId
) => {
return prisma.match.findMany({
where: {
OR: [
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

include: {
  listingA: {
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
        take: 1,
      },
    },
  },

  listingB: {
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
        take: 1,
      },
    },
  },
},

orderBy: {
  score: "desc",
},


});
};

/**

* ---
* GET SINGLE MATCH
* ---

*/

export const getMatchById = async (
matchId
) => {
return prisma.match.findUnique({
where: {
id: matchId,
},


include: {
  listingA: {
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
  },

  listingB: {
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
  },
},


});
};
