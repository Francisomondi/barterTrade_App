
import { useCallback, useEffect, useState } from "react";
import {
  getMyBusinessStorefrontBranding,
  updateMyBusinessStorefrontBranding,
} from "../../api/business";

const DEFAULT_BRANDING = {
  primaryColor: "#5B1725",
  secondaryColor: "#D6B15E",
  accentColor: "#8A2638",
  layoutStyle: "CLASSIC",
  tagline: "",
};

const COLOR_FIELDS = [
  { key: "primaryColor", label: "Primary color" },
  { key: "secondaryColor", label: "Secondary color" },
  { key: "accentColor", label: "Accent color" },
];

const LAYOUTS = [
  {
    value: "CLASSIC",
    label: "Classic",
    description: "Traditional business presentation",
  },
  {
    value: "MODERN",
    label: "Modern",
    description: "Bold, contemporary storefront",
  },
  {
    value: "MINIMAL",
    label: "Minimal",
    description: "Clean and understated layout",
  },
];

const HEX_REGEX = /^#[0-9a-fA-F]{6}$/;

const normalizeBranding = (branding = {}) => ({
  ...DEFAULT_BRANDING,
  ...branding,
  tagline: branding?.tagline ?? "",
});

const preparePayload = (branding) => ({
  primaryColor: branding.primaryColor.toUpperCase(),
  secondaryColor: branding.secondaryColor.toUpperCase(),
  accentColor: branding.accentColor.toUpperCase(),
  layoutStyle: branding.layoutStyle,
  tagline: branding.tagline.trim() || null,
});

export default function BusinessStorefrontBrandingSettings() {
  const [business, setBusiness] = useState(null);
  const [access, setAccess] = useState(null);
  const [branding, setBranding] = useState(DEFAULT_BRANDING);
  const [savedBranding, setSavedBranding] =
    useState(DEFAULT_BRANDING);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const loadBranding = useCallback(async () => {
    setLoading(true);
    setError("");
    setSuccess("");

    try {
      const response = await getMyBusinessStorefrontBranding();

      if (response?.success !== true || !response.branding) {
        throw new Error("Invalid branding response.");
      }

      const current = normalizeBranding(response.branding);

      setBusiness(response.business || null);
      setAccess(response.access || null);
      setBranding(current);
      setSavedBranding(current);
    } catch (err) {
      setError(
        err?.response?.data?.message ||
          err?.message ||
          "Unable to load storefront branding."
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadBranding();
  }, [loadBranding]);

  const isBusinessPro =
    access?.isBusinessPro === true &&
    access?.canCustomizeBranding === true;

  const updateField = (field, value) => {
    setBranding((current) => ({
      ...current,
      [field]: value,
    }));

    setError("");
    setSuccess("");
  };

  const isDirty =
    JSON.stringify(preparePayload(branding)) !==
    JSON.stringify(preparePayload(savedBranding));

  const validate = () => {
    for (const field of COLOR_FIELDS) {
      if (!HEX_REGEX.test(branding[field.key])) {
        return `${field.label} must be a valid six-digit hex color.`;
      }
    }

    if (!LAYOUTS.some((layout) => layout.value === branding.layoutStyle)) {
      return "Select a valid storefront layout.";
    }

    if (branding.tagline.trim().length > 120) {
      return "Tagline cannot exceed 120 characters.";
    }

    return "";
  };

  const handleSave = async (event) => {
    event.preventDefault();

    if (!isBusinessPro || saving) return;

    const validationError = validate();

    if (validationError) {
      setError(validationError);
      return;
    }

    setSaving(true);
    setError("");
    setSuccess("");

    try {
      const response = await updateMyBusinessStorefrontBranding(
        preparePayload(branding)
      );

      if (response?.success !== true || !response.branding) {
        throw new Error("Invalid save response.");
      }

      const updated = normalizeBranding(response.branding);

      setBranding(updated);
      setSavedBranding(updated);
      setSuccess("Storefront branding saved successfully.");
    } catch (err) {
      const status = err?.response?.status;
      const code = err?.response?.data?.code;

      if (status === 403 && code === "BUSINESS_PRO_REQUIRED") {
        setAccess({
          tier: "BUSINESS_FREE",
          isBusinessPro: false,
          canCustomizeBranding: false,
        });

        setBranding(DEFAULT_BRANDING);
        setSavedBranding(DEFAULT_BRANDING);

        setError(
          "Your Business Pro subscription is no longer active. Custom branding has been locked."
        );
      } else {
        setError(
          err?.response?.data?.message ||
            err?.message ||
            "Failed to save storefront branding."
        );
      }
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="rounded-2xl border bg-white p-8 text-center">
        <p className="text-sm text-gray-500">
          Loading storefront branding...
        </p>
      </div>
    );
  }

  if (!access || !business) {
    return (
      <div className="rounded-2xl border bg-white p-6">
        <p className="mb-4 text-sm text-red-600">
          {error || "Storefront branding is unavailable."}
        </p>
        <button
          type="button"
          onClick={loadBranding}
          className="rounded-lg bg-[#5B1725] px-4 py-2 text-white"
        >
          Retry
        </button>
      </div>
    );
  }

  return (
    <section className="mx-auto max-w-6xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-[#3D0F18]">
          Storefront Branding
        </h1>
        <p className="mt-1 text-sm text-gray-600">
          Personalize how customers see your business on BarterConnekt.
        </p>
      </div>

      {!isBusinessPro && (
        <div className="rounded-2xl border border-[#D6B15E] bg-[#FFF9EA] p-5">
          <h2 className="font-bold text-[#5B1725]">
            Business Pro Feature
          </h2>
          <p className="mt-2 text-sm text-gray-700">
            Upgrade to Business Pro to save custom colors,
            layouts, and a storefront tagline.
          </p>
          <p className="mt-2 text-xs text-gray-600">
            Your existing business logo and cover image remain available
            through standard business profile settings.
          </p>
        </div>
      )}

      {error && (
        <div role="alert" className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          {error}
        </div>
      )}

      {success && (
        <div role="status" className="rounded-xl border border-green-200 bg-green-50 p-4 text-sm text-green-700">
          {success}
        </div>
      )}

      <form onSubmit={handleSave} className="grid gap-6 lg:grid-cols-2">
        <div className="space-y-6">
          {/* BRAND COLORS */}
          <div className="rounded-2xl border bg-white p-5 shadow-sm">
            <h2 className="text-lg font-bold text-[#5B1725]">
              Brand Colors
            </h2>
            <p className="mt-1 text-sm text-gray-500">
              Choose colors that represent your business.
            </p>

            <div className="mt-5 space-y-5">
              {COLOR_FIELDS.map(({ key, label }) => (
                <div key={key}>
                  <label
                    htmlFor={key}
                    className="mb-2 block text-sm font-semibold text-gray-700"
                  >
                    {label}
                  </label>

                  <div className="flex items-center gap-3">
                    <input
                      aria-label={`${label} picker`}
                      type="color"
                      value={
                        HEX_REGEX.test(branding[key])
                          ? branding[key]
                          : DEFAULT_BRANDING[key]
                      }
                      onChange={(e) => updateField(key, e.target.value)}
                      disabled={saving}
                      className="h-11 w-14 cursor-pointer rounded-lg border bg-white p-1"
                    />

                    <input
                      id={key}
                      type="text"
                      value={branding[key]}
                      onChange={(e) => updateField(key, e.target.value)}
                      maxLength={7}
                      disabled={saving}
                      className="w-full rounded-xl border px-4 py-3 text-sm outline-none focus:border-[#8A2638]"
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* LAYOUT OPTIONS */}
          <div className="rounded-2xl border bg-white p-5 shadow-sm">
            <h2 className="text-lg font-bold text-[#5B1725]">
              Storefront Layout
            </h2>

            <div className="mt-4 grid gap-3">
              {LAYOUTS.map((layout) => {
                const selected =
                  branding.layoutStyle === layout.value;

                return (
                  <label
                    key={layout.value}
                    className={`flex cursor-pointer items-center gap-3 rounded-xl border p-4 ${
                      selected
                        ? "border-[#8A2638] bg-[#F8F5F3]"
                        : "border-gray-200"
                    }`}
                  >
                    <input
                      type="radio"
                      name="layoutStyle"
                      value={layout.value}
                      checked={selected}
                      disabled={saving}
                      onChange={() =>
                        updateField("layoutStyle", layout.value)
                      }
                      className="accent-[#5B1725]"
                    />
                    <span>
                      <span className="block font-semibold text-gray-900">
                        {layout.label}
                      </span>
                      <span className="text-xs text-gray-500">
                        {layout.description}
                      </span>
                    </span>
                  </label>
                );
              })}
            </div>
          </div>

          {/* TAGLINE */}
          <div className="rounded-2xl border bg-white p-5 shadow-sm">
            <label
              htmlFor="storefrontTagline"
              className="block text-lg font-bold text-[#5B1725]"
            >
              Business Tagline
            </label>

            <textarea
              id="storefrontTagline"
              value={branding.tagline}
              onChange={(e) =>
                updateField("tagline", e.target.value)
              }
              maxLength={120}
              rows={3}
              disabled={saving}
              placeholder="Tell customers what makes your business special..."
              className="mt-3 w-full resize-none rounded-xl border p-3 text-sm outline-none focus:border-[#8A2638]"
            />

            <p className="mt-1 text-right text-xs text-gray-500">
              {branding.tagline.length}/120
            </p>
          </div>

          {/* ACTIONS */}
          <div className="flex flex-wrap gap-3">
            <button
              type="submit"
              disabled={!isBusinessPro || saving || !isDirty}
              className="rounded-xl bg-[#5B1725] px-6 py-3 font-semibold text-white transition hover:bg-[#3D0F18] disabled:cursor-not-allowed disabled:opacity-50"
            >
              {saving ? "Saving..." : "Save Branding"}
            </button>

            <button
              type="button"
              disabled={saving || !isDirty}
              onClick={() => {
                setBranding({ ...savedBranding });
                setError("");
                setSuccess("");
              }}
              className="rounded-xl border px-6 py-3 font-semibold text-gray-700 disabled:opacity-50"
            >
              Reset Changes
            </button>
          </div>
        </div>

        {/* LIVE PREVIEW */}
        <div className="lg:sticky lg:top-6 lg:self-start">
          <div className="rounded-2xl border bg-white p-5 shadow-sm">
            <div className="mb-4 flex items-center justify-between gap-2">
              <h2 className="text-lg font-bold text-[#5B1725]">
                Live Preview
              </h2>
              <span className="rounded-full bg-[#F8F5F3] px-3 py-1 text-xs font-semibold text-[#5B1725]">
                {branding.layoutStyle}
              </span>
            </div>

            <p className="mb-4 text-xs text-gray-500">
              Preview only. Changes are not public until saved and
              public storefront rendering is implemented.
            </p>

            <div className="overflow-hidden rounded-2xl border">
              <div
                className={`relative overflow-hidden ${
                  branding.layoutStyle === "MINIMAL"
                    ? "h-32"
                    : branding.layoutStyle === "MODERN"
                    ? "h-56"
                    : "h-44"
                }`}
                style={{
                  backgroundColor: branding.primaryColor,
                }}
              >
                {business.coverImage && (
                  <img
                    src={business.coverImage}
                    alt="Business cover"
                    className="h-full w-full object-cover"
                  />
                )}

                <div
                  className="absolute inset-x-0 bottom-0 h-2"
                  style={{
                    backgroundColor: branding.secondaryColor,
                  }}
                />
              </div>

              <div
                className={`p-5 ${
                  branding.layoutStyle === "MODERN"
                    ? "text-center"
                    : ""
                }`}
              >
                {business.logo && (
                  <img
                    src={business.logo}
                    alt="Business logo"
                    className={`mb-4 h-16 w-16 rounded-xl border bg-white object-cover ${
                      branding.layoutStyle === "MODERN"
                        ? "mx-auto"
                        : ""
                    }`}
                  />
                )}

                <h3
                  className="text-xl font-bold"
                  style={{
                    color: branding.primaryColor,
                  }}
                >
                  {business.businessName}
                </h3>

                {branding.tagline && (
                  <p className="mt-2 text-sm text-gray-600">
                    {branding.tagline}
                  </p>
                )}

                <div
                  className={`mt-5 flex gap-2 ${
                    branding.layoutStyle === "MODERN"
                      ? "justify-center"
                      : ""
                  }`}
                >
                  <span
                    className="rounded-lg px-4 py-2 text-xs font-semibold"
                    style={{
                      backgroundColor: branding.secondaryColor,
                      color: "#241515",
                    }}
                  >
                    Browse Listings
                  </span>

                  <span
                    className="rounded-lg border px-4 py-2 text-xs font-semibold"
                    style={{
                      borderColor: branding.accentColor,
                      color: branding.accentColor,
                    }}
                  >
                    Business Profile
                  </span>
                </div>
              </div>
            </div>

            {!isBusinessPro && (
              <p className="mt-4 text-xs text-amber-800">
                You can experiment with this preview, but saving
                requires an active Business Pro subscription.
              </p>
            )}
          </div>
        </div>
      </form>
    </section>
  );
}
