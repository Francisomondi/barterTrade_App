export const PROMOTION_PLANS = {
  BOOST: {
    type: "BOOST",
    name: "Boost",
    description: "Boost your listing higher in marketplace results.",
    amount: 100,
    currency: "KES",
    durationDays: 3,
    features: [
      "Higher marketplace visibility",
      "Priority over standard listings",
      "3 days of promotion",
    ],
  },

  FEATURED: {
    type: "FEATURED",
    name: "Featured",
    description: "Feature your listing prominently in the marketplace.",
    amount: 250,
    currency: "KES",
    durationDays: 7,
    features: [
      "Featured listing badge",
      "Higher marketplace visibility",
      "Priority placement",
      "7 days of promotion",
    ],
  },

  HOMEPAGE: {
    type: "HOMEPAGE",
    name: "Homepage",
    description: "Show your listing in premium homepage promotion areas.",
    amount: 500,
    currency: "KES",
    durationDays: 7,
    features: [
      "Homepage exposure",
      "Premium listing placement",
      "Featured listing badge",
      "7 days of promotion",
    ],
  },
};

export const getPromotionPlan = (type) => {
  if (!type) {
    return null;
  }

  return PROMOTION_PLANS[String(type).toUpperCase()] || null;
};

export const isValidPromotionType = (type) => {
  return Boolean(getPromotionPlan(type));
};

export const getPublicPromotionPlans = () => {
  return Object.values(PROMOTION_PLANS);
};