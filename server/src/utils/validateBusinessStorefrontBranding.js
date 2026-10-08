
import {
  ALLOWED_STOREFRONT_LAYOUTS,
} from "../config/businessStorefrontBranding.js";

const HEX_COLOR_REGEX = /^#[0-9A-Fa-f]{6}$/;

const ALLOWED_FIELDS = new Set([
  "primaryColor",
  "secondaryColor",
  "accentColor",
  "layoutStyle",
  "tagline",
]);

export const validateBusinessStorefrontBranding = (
  payload
) => {
  const errors = {};
  const data = {};

  if (
    !payload ||
    typeof payload !== "object" ||
    Array.isArray(payload)
  ) {
    return {
      valid: false,
      data,
      errors: {
        body: "A valid JSON object is required.",
      },
    };
  }

  for (const field of Object.keys(payload)) {
    if (!ALLOWED_FIELDS.has(field)) {
      errors[field] = "Unsupported branding field.";
    }
  }

  for (const field of [
    "primaryColor",
    "secondaryColor",
    "accentColor",
  ]) {
    if (!Object.hasOwn(payload, field)) {
      continue;
    }

    const value = payload[field];

    if (
      typeof value !== "string" ||
      !HEX_COLOR_REGEX.test(value)
    ) {
      errors[field] =
        "Color must be a six-digit hexadecimal value.";
      continue;
    }

    data[field] = value.toUpperCase();
  }

  if (Object.hasOwn(payload, "layoutStyle")) {
    if (
      typeof payload.layoutStyle !== "string" ||
      !ALLOWED_STOREFRONT_LAYOUTS.includes(
        payload.layoutStyle
      )
    ) {
      errors.layoutStyle =
        "Unsupported storefront layout.";
    } else {
      data.layoutStyle = payload.layoutStyle;
    }
  }

  if (Object.hasOwn(payload, "tagline")) {
    const tagline = payload.tagline;

    if (tagline === null) {
      data.tagline = null;
    } else if (typeof tagline !== "string") {
      errors.tagline = "Tagline must be text.";
    } else {
      const trimmed = tagline.trim();

      if (trimmed.length > 120) {
        errors.tagline =
          "Tagline cannot exceed 120 characters.";
      } else {
        data.tagline = trimmed || null;
      }
    }
  }

  if (
    Object.keys(errors).length === 0 &&
    Object.keys(data).length === 0
  ) {
    errors.body =
      "At least one branding field is required.";
  }

  return {
    valid: Object.keys(errors).length === 0,
    data,
    errors,
  };
};
