import prisma from "../config/prisma.js";
import {
findMatchesForListing,
} from "../services/matchService.js";

const run = async () => {
try {
console.log(
"================================="
);


console.log(
  "BARter Trade - Match Service Test"
);

console.log(
  "================================="
);

const listing =
  await prisma.listing.findFirst({
    where: {
      status: "ACTIVE",
    },

    orderBy: {
      createdAt: "desc",
    },
  });

if (!listing) {
  console.log(
    "No ACTIVE listings found."
  );

  return;
}

console.log(
  `Testing listing: ${listing.title}`
);

console.log(
  `Listing ID: ${listing.id}`
);

const matches =
  await findMatchesForListing(
    listing.id,
    listing.userId
  );

console.log(
  `Matches found: ${matches.length}`
);

for (const match of matches) {
  console.log(
    "---------------------------------"
  );

  console.log(
    `Match ID: ${match.id}`
  );

  console.log(
    `Score: ${match.score}`
  );

  console.log(
    `Listing A: ${match.listingA.title}`
  );

  console.log(
    `Listing B: ${match.listingB.title}`
  );

  console.log(
    `Value Score: ${match.valueScore}`
  );

  console.log(
    `Location Score: ${match.locationScore}`
  );

  console.log(
    `Status: ${match.status}`
  );
}


} catch (error) {
console.error(
"MATCH SERVICE TEST ERROR:"
);


console.error(error);


} finally {
await prisma.$disconnect();
}
};

run();
