/**

* ============================================================
* BARTER TRADE MATCHING SERVICE
* ============================================================
*
* This service calculates compatibility between two listings.
*
* It does NOT:
* * create Match records
* * modify listings
* * create offers
* * create trades
*
* Database persistence will be added in Module 7.3.
  */

/**

* ---
* NORMALIZE TEXT
* ---

*/

const normalizeText = (value = "") => {
return value
.toLowerCase()
.trim()
.replace(/[^a-z0-9\s]/g, "")
.replace(/\s+/g, " ");
};

/**

* ---
* KEYWORD COMPATIBILITY
* ---
*
* Checks whether two pieces of text contain related keywords.
  */

const calculateKeywordCompatibility = (
textA = "",
textB = ""
) => {
const normalizedA = normalizeText(textA);
const normalizedB = normalizeText(textB);

if (!normalizedA || !normalizedB) {
return 0;
}

/*

* Exact text match.
  */

if (normalizedA === normalizedB) {
return 100;
}

/*

* One text contains the other.
  */

if (
normalizedA.includes(normalizedB) ||
normalizedB.includes(normalizedA)
) {
return 85;
}

/*

* Compare individual words.
  */

const wordsA = normalizedA
.split(" ")
.filter((word) => word.length > 2);

const wordsB = normalizedB
.split(" ")
.filter((word) => word.length > 2);

if (
wordsA.length === 0 ||
wordsB.length === 0
) {
return 0;
}

const matchingWords = wordsA.filter(
(word) => wordsB.includes(word)
);

if (matchingWords.length === 0) {
return 0;
}

const largestWordCount = Math.max(
wordsA.length,
wordsB.length
);

return Math.round(
(matchingWords.length /
largestWordCount) *
100
);
};

/**

* ---
* WANTED ITEM COMPATIBILITY
* ---
*
* Compares:
*
* Listing A wanted item/category
* against
* Listing B actual item/category
*
* Version 1 uses:
* * wantedCategories
* * wantedKeywords
* * title
* * description
*
* Missing wanted-item preferences simply return 0.
  */

export const calculateWantedCompatibility = (
sourceListing,
candidateListing
) => {
let bestScore = 0;

/*

* Category compatibility.
*
* Supports either:
* wantedCategories: ["categoryId"]
*
* or category IDs/objects added later.
  */

const wantedCategories =
sourceListing.wantedCategories || [];

if (
Array.isArray(wantedCategories) &&
wantedCategories.length > 0
) {
const candidateCategoryId =
candidateListing.categoryId ||
candidateListing.category?.id;


const candidateCategoryName =
  candidateListing.category?.name;

for (
  const wantedCategory of wantedCategories
) {
  if (
    wantedCategory === candidateCategoryId
  ) {
    bestScore = Math.max(
      bestScore,
      100
    );
  }

  if (
    candidateCategoryName &&
    normalizeText(wantedCategory) ===
      normalizeText(candidateCategoryName)
  ) {
    bestScore = Math.max(
      bestScore,
      95
    );
  }
}


}

/*

* Keyword compatibility.
  */

const wantedKeywords =
sourceListing.wantedKeywords || "";

if (wantedKeywords) {
const candidateText = [
candidateListing.title,
candidateListing.description,
candidateListing.category?.name,
]
.filter(Boolean)
.join(" ");


const keywordScore =
  calculateKeywordCompatibility(
    wantedKeywords,
    candidateText
  );

bestScore = Math.max(
  bestScore,
  keywordScore
);


}

return bestScore;
};

/**

* ---
* CATEGORY COMPATIBILITY
* ---

*/

export const calculateCategoryScore = (
listingA,
listingB
) => {
const categoryA =
listingA.categoryId ||
listingA.category?.id;

const categoryB =
listingB.categoryId ||
listingB.category?.id;

if (
categoryA &&
categoryB &&
categoryA === categoryB
) {
return 100;
}

/*

* Different categories are not automatically rejected.
  */

return 0;
};

/**

* ---
* VALUE SIMILARITY
* ---

*/

export const calculateValueScore = (
listingA,
listingB
) => {
const valueA = Number(
listingA.estimatedValue
);

const valueB = Number(
listingB.estimatedValue
);

if (
!Number.isFinite(valueA) ||
!Number.isFinite(valueB) ||
valueA <= 0 ||
valueB <= 0
) {
return 0;
}

const difference =
Math.abs(valueA - valueB);

const largerValue = Math.max(
valueA,
valueB
);

const differencePercent =
(difference / largerValue) * 100;

if (differencePercent <= 10) {
return 100;
}

if (differencePercent <= 20) {
return 80;
}

if (differencePercent <= 30) {
return 60;
}

return 0;
};

/**

* ---
* CONDITION COMPATIBILITY
* ---

*/

const conditionValues = {
NEW: 5,
LIKE_NEW: 4,
GOOD: 3,
FAIR: 2,
POOR: 1,
};

export const calculateConditionScore = (
listingA,
listingB
) => {
const conditionA =
conditionValues[listingA.condition];

const conditionB =
conditionValues[listingB.condition];

if (
!conditionA ||
!conditionB
) {
return 0;
}

const difference = Math.abs(
conditionA - conditionB
);

if (difference === 0) {
return 100;
}

if (difference === 1) {
return 75;
}

if (difference === 2) {
return 50;
}

return 0;
};

/**

* ---
* LOCATION COMPATIBILITY
* ---

*/

export const calculateLocationScore = (
listingA,
listingB
) => {
const locationA = normalizeText(
listingA.location || ""
);

const locationB = normalizeText(
listingB.location || ""
);

if (!locationA || !locationB) {
return 0;
}

if (locationA === locationB) {
return 100;
}

/*

* Partial location match.
*
* Example:
* "Nairobi, Kenya"
* "Nairobi"
  */

if (
locationA.includes(locationB) ||
locationB.includes(locationA)
) {
return 70;
}

return 0;
};

/**

* ---
* MATCH LEVEL
* ---

*/

export const getMatchLevel = (
score
) => {
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

/**

* ---
* CALCULATE COMPLETE MATCH SCORE
* ---
*
* We check compatibility in both directions:
*
* A wants → B provides
* B wants → A provides
  */

export const calculateMatchScore = (
listingA,
listingB
) => {
/*

* Prevent matching a user's listing
* with another one of their own listings.
  */

if (
listingA.userId &&
listingB.userId &&
listingA.userId === listingB.userId
) {
return {
score: 0,
level: "NO_MATCH",
isMatch: false,
breakdown: {
wantedCompatibility: 0,
category: 0,
value: 0,
condition: 0,
location: 0,
},
};
}

/*

* A wants something B has.
  */

const wantedScoreA =
calculateWantedCompatibility(
listingA,
listingB
);

/*

* B wants something A has.
  */

const wantedScoreB =
calculateWantedCompatibility(
listingB,
listingA
);

/*

* Reciprocal compatibility.
*
* Average both directions.
  */

const wantedCompatibility =
(wantedScoreA + wantedScoreB) / 2;

const categoryScore =
calculateCategoryScore(
listingA,
listingB
);

const valueScore =
calculateValueScore(
listingA,
listingB
);

const conditionScore =
calculateConditionScore(
listingA,
listingB
);

const locationScore =
calculateLocationScore(
listingA,
listingB
);

/*

* FINAL WEIGHTED SCORE
  */

const score = Math.round(
wantedCompatibility * 0.4 +
categoryScore * 0.2 +
valueScore * 0.25 +
conditionScore * 0.1 +
locationScore * 0.05
);

const level = getMatchLevel(score);

return {
score,
level,
isMatch: score >= 50,


breakdown: {
  wantedCompatibility:
    Math.round(wantedCompatibility),

  category:
    categoryScore,

  value:
    valueScore,

  condition:
    conditionScore,

  location:
    locationScore,
},


};
};
