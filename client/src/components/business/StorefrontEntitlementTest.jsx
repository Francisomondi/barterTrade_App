
import {
  useBusinessStorefrontEntitlement,
} from "../../hooks/useBusinessStorefrontEntitlement";

export default function StorefrontEntitlementTest() {
  const {
    tier,
    isBusinessPro,
    features,
    loading,
    error,
    refreshEntitlement,
  } = useBusinessStorefrontEntitlement();

  if (loading) {
    return (
      <p className="text-sm text-gray-500">
        Loading storefront permissions...
      </p>
    );
  }

  if (error) {
    return (
      <div className="space-y-3 rounded-xl border p-4">
        <p className="text-sm text-red-600">
          {error}
        </p>

        <button
          type="button"
          onClick={refreshEntitlement}
          className="rounded-lg bg-[#5B1725] px-4 py-2 text-sm text-white"
        >
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className="rounded-xl border bg-white p-5 shadow-sm">
      <h2 className="text-lg font-bold text-[#5B1725]">
        Storefront Entitlement Test
      </h2>

      <p className="mt-2 text-sm">
        Tier: <strong>{tier}</strong>
      </p>

      <p className="text-sm">
        Business Pro:{" "}
        <strong>{isBusinessPro ? "Yes" : "No"}</strong>
      </p>

      <div className="mt-4 space-y-2 text-sm">
        <p>
          Custom Branding:{" "}
          {features.customBranding ? "Enabled" : "Locked"}
        </p>

        <p>
          Featured Listings:{" "}
          {features.featuredListings ? "Enabled" : "Locked"}
        </p>

        <p>
          Promotional Highlights:{" "}
          {features.promotionalHighlights
            ? "Enabled"
            : "Locked"}
        </p>

        <p>
          Enhanced Layout:{" "}
          {features.enhancedLayout ? "Enabled" : "Locked"}
        </p>

        <p>
          Maximum Featured Listings:{" "}
          {features.maxFeaturedListings}
        </p>
      </div>
    </div>
  );
}
