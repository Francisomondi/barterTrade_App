import prisma from "../config/prisma.js";

import {
calculateMatchScore,
} from "./matchingService.js";

/**

* ============================================================
* NORMALIZE LISTING PAIR
* ============================================================
*
* Ensures:
*
* Listing A + Listing B
*
* and
*
* Listing B + Listing A
*
* are stored as the same pair.
  */

const normalizeListingPair = (
listingAId,
listingBId
) => {
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

* ============================================================
* GET MATCH BY LISTING PAIR
* ============================================================
  */

export const getMatchByListings = async (
listingAId,
listingBId
) => {
if (
!listingAId ||
!listingBId
) {
throw new Error(
"Both listing IDs are required"
);
}

if (listingAId === listingBId) {
return null;
}

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

* ============================================================
* CREATE OR UPDATE MATCH
* ============================================================
  */

export const createOrUpdateMatch = async ({
userId,
listingA,
listingB,
}) => {
/*

* Basic validation.
  */

if (!userId) {
throw new Error(
"userId is required"
);
}

if (!listingA?.id || !listingB?.id) {
throw new Error(
"Both listings are required"
);
}

/*

* A listing cannot match itself.
  */

if (
listingA.id === listingB.id
) {
return null;
}

/*

* Do not match listings owned
* by the same user.
  */

if (
listingA.userId &&
listingB.userId &&
listingA.userId === listingB.userId
) {
return null;
}

/*

* Both listings must be ACTIVE.
  */

if (
listingA.status !== "ACTIVE" ||
listingB.status !== "ACTIVE"
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
* the minimum matching threshold.
  */

if (!result.isMatch) {
return null;
}

/*

* Normalize the pair so:
*
* A + B
*
* is the same as:
*
* B + A
  */

const pair =
normalizeListingPair(
listingA.id,
listingB.id
);

/*

* Persist the match.
*
* The existing Match model contains:
*
* score
* valueScore
* locationScore
* trustScore
*
* We populate the scores that our
* current matching engine actually calculates.
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

    valueScore:
      result.breakdown.value,

    locationScore:
      result.breakdown.location,

    /*
     * Trust scoring is not yet
     * implemented in 7.2.
     *
     * Therefore we intentionally
     * leave trustScore unchanged.
     */
  },

  create: {
    userId,

    listingAId:
      pair.listingAId,

    listingBId:
      pair.listingBId,

    score:
      result.score,

    valueScore:
      result.breakdown.value,

    locationScore:
      result.breakdown.location,

    /*
     * Trust score will be added
     * when the trust algorithm
     * is implemented.
     */

    status: "ACTIVE",
  },
});


return {
match,


score:
  result.score,

breakdown:
  result.breakdown,


};
};

/**

* ============================================================
* FIND MATCHES FOR A LISTING
* ============================================================
  */

export const findMatchesForListing = async (
listingId,
userId
) => {
if (!listingId) {
throw new Error(
"listingId is required"
);
}

/*

* Find the source listing.
  */

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

* Only ACTIVE listings
* participate in matching.
  */

if (
listing.status !== "ACTIVE"
) {
return [];
}

/*

* Verify the user if supplied.
*
* This prevents another user from
* generating matches on behalf of
* the listing owner.
  */

if (
userId &&
listing.userId !== userId
) {
throw new Error(
"You do not own this listing"
);
}

/*

* Find other ACTIVE listings
* belonging to different users.
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

* Calculate and persist
* compatible listings.
  */

for (
const candidate of candidates
) {
const result =
await createOrUpdateMatch({
userId: listing.userId,
listingA: listing,
listingB: candidate,
});


if (result) {
  matches.push(result);
}


}

/*

* Highest compatibility first.
  */

matches.sort(
(a, b) =>
b.score - a.score
);

return matches;
};

/**

* ============================================================
* GET MATCHES FOR A USER
* ============================================================
  */

export const getUserMatches = async (
userId
) => {
if (!userId) {
throw new Error(
"userId is required"
);
}

return prisma.match.findMany({
where: {
userId,
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

* ============================================================
* GET SINGLE MATCH
* ============================================================
  */

export const getMatchById = async (
matchId,
userId
) => {
if (!matchId) {
throw new Error(
"matchId is required"
);
}

const match =
await prisma.match.findUnique({
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


if (!match) {
return null;
}

/*

* A user can only access a match
* that belongs to them.
  */

if (
userId &&
match.userId !== userId
) {
throw new Error(
"You are not authorized to view this match"
);
}

return match;
};
