import {
calculateMatchScore,
} from "../services/matchingService.js";

const listingA = {
id: "listing-a",
userId: "user-a",

title: "iPhone 13 Pro",
description:
"Excellent condition Apple smartphone",

categoryId: "electronics",

category: {
id: "electronics",
name: "Electronics",
},

wantedCategories: [
"computers",
],

wantedKeywords:
"laptop macbook computer",

estimatedValue: 70000,

condition: "LIKE_NEW",

location: "Nairobi",
};

const listingB = {
id: "listing-b",
userId: "user-b",

title: "MacBook Air M1",
description:
"Apple laptop in excellent condition",

categoryId: "computers",

category: {
id: "computers",
name: "Computers",
},

wantedCategories: [
"electronics",
],

wantedKeywords:
"iphone smartphone apple phone",

estimatedValue: 75000,

condition: "GOOD",

location: "Nairobi",
};

const result =
calculateMatchScore(
listingA,
listingB
);

console.log(
"MATCH RESULT:"
);

console.dir(
result,
{
depth: null,
}
);
