import prisma from "../config/prisma.js";

import {
findMatchesForListing,
} from "../services/matchService.js";

const runTest = async () => {
try {
/*
* Get one active listing.
*/


const listing =
  await prisma.listing.findFirst({
    where: {
      status: "ACTIVE",
    },
  });

if (!listing) {
  console.log(
    "No ACTIVE listing found."
  );

  return;
}

console.log(
  `Testing matches for listing: ${listing.id}`
);

const matches =
  await findMatchesForListing(
    listing.id
  );

console.log(
  `Matches found: ${matches.length}`
);

console.dir(
  matches,
  {
    depth: null,
  }
);


} catch (error) {
console.error(
"MATCH SERVICE TEST ERROR:",
error
);
} finally {
await prisma.$disconnect();
}
};

runTest();
