const normalizeText = (value = "") =>
String(value)
.toLowerCase()
.replace(/[^\w\s]/g, " ")
.replace(/\s+/g, " ")
.trim();

/**

* Convert text into useful keywords.
  */
  const getKeywords = (value = "") => {
  const stopWords = new Set([
  "the",
  "and",
  "for",
  "with",
  "this",
  "that",
  "from",
  "want",
  "need",
  "looking",
  "trade",
  "trading",
  "item",
  "items",
  "good",
  "used",
  "new",
  ]);

return normalizeText(value)
.split(" ")
.filter((word) => word.length >= 3 && !stopWords.has(word));
};

/**

* Calculate how strongly one listing's description/title
* relates to another listing.
*
* Since the current Listing schema has no wanted-items field,
* title and description are the available compatibility signals.
  */
  const calculateKeywordCompatibility = (listingA, listingB) => {
  const textA = getKeywords(
  `${listingA.title || ""} ${listingA.description || ""}`
  );

const textB = getKeywords(
`${listingB.title || ""} ${listingB.description || ""}`
);

if (!textA.length || !textB.length) {
return 0;
}

const wordsA = new Set(textA);
const wordsB = new Set(textB);

let matches = 0;

for (const word of wordsA) {
if (wordsB.has(word)) {
matches++;
}
}

const smallerSet = Math.min(wordsA.size, wordsB.size);

if (!smallerSet) {
return 0;
}

return Math.min(100, (matches / smallerSet) * 100);
};

/**

* Category compatibility.
  */
  const calculateCategoryScore = (listingA, listingB) => {
  if (
  listingA.categoryId &&
  listingB.categoryId &&
  listingA.categoryId === listingB.categoryId
  ) {
  return 100;
  }

return 0;
};

/**

* Value compatibility.
  */
  const calculateValueScore = (listingA, listingB) => {
  const valueA = Number(listingA.estimatedValue);
  const valueB = Number(listingB.estimatedValue);

if (!valueA || !valueB || valueA <= 0 || valueB <= 0) {
return 0;
}

const difference = Math.abs(valueA - valueB);
const average = (valueA + valueB) / 2;

const percentageDifference = (difference / average) * 100;

if (percentageDifference <= 10) return 100;
if (percentageDifference <= 20) return 85;
if (percentageDifference <= 30) return 70;
if (percentageDifference <= 40) return 50;
if (percentageDifference <= 50) return 30;

return 0;
};

/**

* Condition compatibility.
  */
  const calculateConditionScore = (listingA, listingB) => {
  const conditionValues = {
  NEW: 5,
  LIKE_NEW: 4,
  GOOD: 3,
  FAIR: 2,
  POOR: 1,
  };

const conditionA = conditionValues[listingA.condition];
const conditionB = conditionValues[listingB.condition];

if (!conditionA || !conditionB) {
return 0;
}

const difference = Math.abs(conditionA - conditionB);

if (difference === 0) return 100;
if (difference === 1) return 80;
if (difference === 2) return 60;
if (difference === 3) return 40;

return 20;
};

/**

* Location compatibility.
  */
  const calculateLocationScore = (listingA, listingB) => {
  const locationA = normalizeText(listingA.location);
  const locationB = normalizeText(listingB.location);

if (!locationA || !locationB) {
return 0;
}

if (locationA === locationB) {
return 100;
}

const wordsA = new Set(locationA.split(" "));
const wordsB = new Set(locationB.split(" "));

const commonWords = [...wordsA].filter((word) =>
wordsB.has(word)
);

if (commonWords.length > 0) {
return 60;
}

return 0;
};

/**

* Compatibility signal.
*
* The current schema does not have wantedCategories
* or wantedKeywords, so title + description are used.
  */
  const calculateWantedCompatibility = (listingA, listingB) => {
  const forward = calculateKeywordCompatibility(
  listingA,
  listingB
  );

const reverse = calculateKeywordCompatibility(
listingB,
listingA
);

return (forward + reverse) / 2;
};

/**

* Trust score based on the existing owner's
* barterScore and completedTrades.
  */
  const calculateTrustScore = (listingA, listingB) => {
  const userA = listingA.user || {};
  const userB = listingB.user || {};

const barterScoreA = Number(userA.barterScore || 0);
const barterScoreB = Number(userB.barterScore || 0);

const tradesA = Number(userA.completedTrades || 0);
const tradesB = Number(userB.completedTrades || 0);

const averageBarterScore =
(barterScoreA + barterScoreB) / 2;

const tradeBonus =
Math.min((tradesA + tradesB) * 2, 20);

return Math.min(
100,
averageBarterScore + tradeBonus
);
};

/**

* Final weighted match score.
*
* Weights:
* Compatibility = 40%
* Category      = 20%
* Value         = 25%
* Condition     = 10%
* Location      = 5%
  */
  export const calculateMatchScore = (listingA, listingB) => {
  const wantedCompatibility =
  calculateWantedCompatibility(listingA, listingB);

const categoryScore =
calculateCategoryScore(listingA, listingB);

const valueScore =
calculateValueScore(listingA, listingB);

const conditionScore =
calculateConditionScore(listingA, listingB);

const locationScore =
calculateLocationScore(listingA, listingB);

const trustScore =
calculateTrustScore(listingA, listingB);

const score =
wantedCompatibility * 0.4 +
categoryScore * 0.2 +
valueScore * 0.25 +
conditionScore * 0.1 +
locationScore * 0.05;

return {
score: Number(score.toFixed(2)),
valueScore: Number(valueScore.toFixed(2)),
locationScore: Number(locationScore.toFixed(2)),
trustScore: Number(trustScore.toFixed(2)),
};
};

/**

* Match classification.
  */
  export const getMatchLevel = (score) => {
  if (score >= 80) {
  return "EXCELLENT";
  }

if (score >= 65) {
return "GOOD";
}

if (score >= 50) {
return "POSSIBLE";
}

return "NO_MATCH";
};

export default {
calculateMatchScore,
getMatchLevel,
};
