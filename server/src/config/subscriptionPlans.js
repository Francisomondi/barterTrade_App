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

  BUSINESS_PRO: {
    type: "BUSINESS_PRO",
    name: "BarterTrade Business Pro",
    description:
      "Unlock advanced business intelligence, reporting and export tools for your BarterTrade business.",
    amount: 599,
    currency: "KES",
    durationDays: 30,
    features: [
      "Advanced business analytics",
      "Extended reporting history",
      "Custom report date ranges",
      "Business performance reports",
      "Listing performance reports",
      "Conversion intelligence",
      "Demand intelligence",
      "Category benchmarks",
      "Growth recommendations",
      "Promotion intelligence",
      "JSON report exports",
      "CSV report exports",
      "PDF-ready report exports",
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