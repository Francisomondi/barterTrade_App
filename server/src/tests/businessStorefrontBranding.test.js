
import {
  describe,
  it,
  expect,
  vi,
  beforeEach,
} from "vitest";

/*
 * ============================================================
 * MOCK DEPENDENCIES
 * ============================================================
 *
 * vi.hoisted ensures these mocks are available before
 * the controller and its dependencies are imported.
 */

const mocks = vi.hoisted(() => ({
  findFirst: vi.fn(),
  getBusinessProEntitlement: vi.fn(),
  trackStorefrontView: vi.fn(),
}));

vi.mock("../config/prisma.js", () => ({
  default: {
    businessProfile: {
      findFirst: mocks.findFirst,
    },
  },
}));

vi.mock("../config/cloudinary.js", () => ({
  default: {},
}));

vi.mock("../utils/uploadToCloudinary.js", () => ({
  default: vi.fn(),
}));

vi.mock("../config/businessConfig.js", () => ({
  DEFAULT_BUSINESS_STATE: {
    status: "ACTIVE",
    verificationStatus: "UNVERIFIED",
  },
  validateBusinessProfileInput: vi.fn(),
}));

vi.mock("../services/businessService.js", () => ({
  generateUniqueBusinessSlug: vi.fn(),
  getBusinessProfileByUserId: vi.fn(),
}));

vi.mock(
  "../services/businessAnalyticsTrackingService.js",
  () => ({
    trackStorefrontView: mocks.trackStorefrontView,
  })
);

vi.mock("../services/subscriptionService.js", () => ({
  getBusinessProEntitlement:
    mocks.getBusinessProEntitlement,
}));

/*
 * ============================================================
 * IMPORT CONTROLLER
 * ============================================================
 */

import {
  getPublicBusinessProfile,
} from "../controllers/businessController.js";

import {
  DEFAULT_STOREFRONT_BRANDING,
} from "../config/businessStorefrontBranding.js";

/*
 * ============================================================
 * TEST DATA
 * ============================================================
 */

const createBusiness = (overrides = {}) => ({
  id: "business-001",
  userId: "owner-001",
  status: "ACTIVE",

  businessName: "BarterConnekt Test Store",
  slug: "barterconnekt-test-store",
  description: "A test business storefront.",

  logo: "https://example.com/logo.png",
  coverImage: "https://example.com/cover.png",

  phone: "+254712345678",
  email: "store@example.com",
  website: "https://example.com",

  category: "Electronics",
  location: "Nairobi",
  address: "Nairobi, Kenya",

  verificationStatus: "VERIFIED",
  verifiedAt: new Date("2026-01-01T00:00:00Z"),
  createdAt: new Date("2026-01-01T00:00:00Z"),

  storefrontSettings: {
    primaryColor: "#112233",
    secondaryColor: "#AABBCC",
    accentColor: "#445566",
    layoutStyle: "MODERN",
    tagline: "Trade smarter every day",
  },

  user: {
    id: "owner-001",
    _count: {
      listings: 8,
    },
  },

  ...overrides,
});

const createProEntitlement = (overrides = {}) => ({
  isBusinessPro: true,
  businessId: "business-001",
  status: "ACTIVE",
  ...overrides,
});

/*
 * ============================================================
 * MOCK EXPRESS REQUEST / RESPONSE
 * ============================================================
 */

const createRequest = (slug = "barterconnekt-test-store") => ({
  params: { slug },

  analyticsVisitor: {
    visitorUserId: "visitor-001",
    visitorKey: "visitor-key-001",
    sessionKey: "session-key-001",
  },
});

const createResponse = () => {
  const res = {
    status: vi.fn(),
    json: vi.fn(),
  };

  res.status.mockReturnValue(res);
  res.json.mockReturnValue(res);

  return res;
};

const getResponseBody = (res) =>
  res.json.mock.calls[0]?.[0];

/*
 * ============================================================
 * TEST SUITE
 * ============================================================
 */

describe("Business Storefront Branding — Public API", () => {
  beforeEach(() => {
    vi.clearAllMocks();

    mocks.findFirst.mockResolvedValue(
      createBusiness()
    );

    mocks.getBusinessProEntitlement.mockResolvedValue(
      createProEntitlement()
    );

    mocks.trackStorefrontView.mockResolvedValue(
      undefined
    );
  });

  /*
   * TEST 1 — ACTIVE BUSINESS PRO
   */

  it("returns custom branding for an active Business Pro account", async () => {
    const req = createRequest();
    const res = createResponse();

    await getPublicBusinessProfile(req, res);

    expect(res.status).toHaveBeenCalledWith(200);

    const body = getResponseBody(res);

    expect(body.success).toBe(true);

    expect(body.business.storefront.tier).toBe(
      "BUSINESS_PRO"
    );

    expect(body.business.storefront.branding).toEqual({
      primaryColor: "#112233",
      secondaryColor: "#AABBCC",
      accentColor: "#445566",
      layoutStyle: "MODERN",
      tagline: "Trade smarter every day",
    });
  });

  /*
   * TEST 2 — BUSINESS FREE
   */

  it("returns default branding for Business Free accounts", async () => {
    mocks.getBusinessProEntitlement.mockResolvedValue(
      {
        isBusinessPro: false,
        businessId: "business-001",
      }
    );

    const res = createResponse();

    await getPublicBusinessProfile(
      createRequest(),
      res
    );

    expect(res.status).toHaveBeenCalledWith(200);

    const body = getResponseBody(res);

    expect(body.business.storefront.tier).toBe(
      "BUSINESS_FREE"
    );

    expect(body.business.storefront.branding).toEqual(
      DEFAULT_STOREFRONT_BRANDING
    );
  });

  /*
   * TEST 3 — EXPIRED SUBSCRIPTION
   */

  it("reverts to default branding when Business Pro expires", async () => {
    mocks.getBusinessProEntitlement.mockResolvedValue(
      {
        isBusinessPro: false,
        businessId: "business-001",
        status: "EXPIRED",
      }
    );

    const res = createResponse();

    await getPublicBusinessProfile(
      createRequest(),
      res
    );

    const body = getResponseBody(res);

    expect(res.status).toHaveBeenCalledWith(200);

    expect(body.business.storefront.tier).toBe(
      "BUSINESS_FREE"
    );

    expect(body.business.storefront.branding).toEqual(
      DEFAULT_STOREFRONT_BRANDING
    );
  });

  /*
   * TEST 4 — NO SAVED SETTINGS
   */

  it("returns defaults when Business Pro has no saved branding", async () => {
    mocks.findFirst.mockResolvedValue(
      createBusiness({
        storefrontSettings: null,
      })
    );

    const res = createResponse();

    await getPublicBusinessProfile(
      createRequest(),
      res
    );

    const body = getResponseBody(res);

    expect(res.status).toHaveBeenCalledWith(200);

    expect(body.business.storefront.tier).toBe(
      "BUSINESS_PRO"
    );

    expect(body.business.storefront.branding).toEqual(
      DEFAULT_STOREFRONT_BRANDING
    );
  });

  /*
   * TEST 5 — ENTITLEMENT BELONGS TO ANOTHER BUSINESS
   */

  it("rejects branding entitlement belonging to another business", async () => {
    mocks.getBusinessProEntitlement.mockResolvedValue(
      createProEntitlement({
        businessId: "different-business",
      })
    );

    const res = createResponse();

    await getPublicBusinessProfile(
      createRequest(),
      res
    );

    const body = getResponseBody(res);

    expect(res.status).toHaveBeenCalledWith(200);

    expect(body.business.storefront.tier).toBe(
      "BUSINESS_FREE"
    );

    expect(body.business.storefront.branding).toEqual(
      DEFAULT_STOREFRONT_BRANDING
    );
  });

  /*
   * TEST 6 — BUSINESS NOT FOUND
   */

  it("returns 404 when the business does not exist", async () => {
    mocks.findFirst.mockResolvedValue(null);

    const res = createResponse();

    await getPublicBusinessProfile(
      createRequest("unknown-business"),
      res
    );

    expect(res.status).toHaveBeenCalledWith(404);

    expect(getResponseBody(res)).toMatchObject({
      success: false,
      code: "BUSINESS_NOT_FOUND",
    });

    expect(
      mocks.getBusinessProEntitlement
    ).not.toHaveBeenCalled();

    expect(
      mocks.trackStorefrontView
    ).not.toHaveBeenCalled();
  });

  /*
   * TEST 7 — MISSING SLUG
   */

  it("returns 400 when the business slug is missing", async () => {
    const res = createResponse();

    await getPublicBusinessProfile(
      createRequest(""),
      res
    );

    expect(res.status).toHaveBeenCalledWith(400);

    expect(getResponseBody(res)).toMatchObject({
      success: false,
      code: "BUSINESS_SLUG_REQUIRED",
    });

    expect(
      mocks.findFirst
    ).not.toHaveBeenCalled();
  });

  /*
   * TEST 8 — PUBLIC DATA SANITIZATION
   */

  it("does not expose internal business fields or raw branding settings", async () => {
    const res = createResponse();

    await getPublicBusinessProfile(
      createRequest(),
      res
    );

    const body = getResponseBody(res);
    const publicBusiness = body.business;

    expect(res.status).toHaveBeenCalledWith(200);

    expect(publicBusiness).not.toHaveProperty(
      "userId"
    );

    expect(publicBusiness).not.toHaveProperty(
      "status"
    );

    expect(publicBusiness).not.toHaveProperty(
      "user"
    );

    expect(publicBusiness).not.toHaveProperty(
      "storefrontSettings"
    );

    expect(publicBusiness).toHaveProperty(
      "storefront.branding"
    );

    expect(publicBusiness.activeListingCount).toBe(
      8
    );

    expect(publicBusiness.isVerified).toBe(true);
  });

  /*
   * TEST 9 — ANALYTICS TRACKING
   */

  it("tracks successful storefront views with the correct business and visitor", async () => {
    const res = createResponse();

    await getPublicBusinessProfile(
      createRequest(),
      res
    );

    expect(res.status).toHaveBeenCalledWith(200);

    expect(
      mocks.trackStorefrontView
    ).toHaveBeenCalledWith({
      business: {
        id: "business-001",
        userId: "owner-001",
        status: "ACTIVE",
      },

      visitorUserId: "visitor-001",
      visitorKey: "visitor-key-001",
      sessionKey: "session-key-001",

      metadata: {
        source: "BUSINESS_STOREFRONT",
      },
    });
  });

  /*
   * TEST 10 — ANALYTICS FAILURE
   */

  it("still returns 200 when analytics tracking fails", async () => {
    const consoleSpy = vi
      .spyOn(console, "error")
      .mockImplementation(() => {});

    try {
      mocks.trackStorefrontView.mockRejectedValue(
        new Error("Analytics unavailable")
      );

      const res = createResponse();

      await getPublicBusinessProfile(
        createRequest(),
        res
      );

      // Analytics is intentionally fire-and-forget.
      // Allow its rejection handler to execute.
      await Promise.resolve();

      expect(res.status).toHaveBeenCalledWith(200);

      expect(getResponseBody(res).success).toBe(
        true
      );
    } finally {
      consoleSpy.mockRestore();
    }
  });

  /*
   * TEST 11 — DATABASE FAILURE
   */

  it("returns 500 when the database query fails", async () => {
    const consoleSpy = vi
      .spyOn(console, "error")
      .mockImplementation(() => {});

    try {
      mocks.findFirst.mockRejectedValue(
        new Error("Database unavailable")
      );

      const res = createResponse();

      await getPublicBusinessProfile(
        createRequest(),
        res
      );

      expect(res.status).toHaveBeenCalledWith(500);

      expect(getResponseBody(res)).toMatchObject({
        success: false,
        message:
          "Unable to load Business Profile.",
      });

      expect(
        mocks.trackStorefrontView
      ).not.toHaveBeenCalled();
    } finally {
      consoleSpy.mockRestore();
    }
  });
});
