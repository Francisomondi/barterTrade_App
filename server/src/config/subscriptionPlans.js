export const SUBSCRIPTION_PLANS = {
  PREMIUM: {
    type: "PREMIUM",

    name: "BarterTrade Premium",

    description:
      "Unlock more tools, insights and benefits across BarterTrade.",

    amount: 299,

    currency: "KES",

    durationDays: 30,

    features: [
      "Premium profile badge",
      "Advanced listing analytics",
      "Higher active listing allowance",
      "Discounts on listing promotions",
      "Priority support",
    ],
  },
};

export const getSubscriptionPlan = (
  type
) => {
  if (!type) {
    return null;
  }

  return (
    SUBSCRIPTION_PLANS[
      String(type).toUpperCase()
    ] || null
  );
};