
import {
  describe,
  it,
  expect,
  vi,
  beforeEach,
  afterEach,
} from "vitest";

/*
 * ============================================================
 * 9.11.22.3.7.2
 * PROTECTED BUSINESS PRO BRANDING API TESTS
 * ============================================================
 *
 * Tests:
 * GET   /api/business/me/storefront/branding
 * PATCH /api/business/me/storefront/branding
 *
 * Controller-level tests:
 * - No live PostgreSQL connection
 * - No real subscription payments
 * - No Redis dependency
 *
 * The real branding validator is used.
 */

/*
 * ============================================================
 * HOISTED MOCKS
 * ============================================================
 */

const mocks = vi.hoisted(() => ({
  findBusiness: vi.fn(),
  findSettings: vi.fn(),
  upsertSettings: vi.fn(),
  resolveEntitlement: vi.fn(),
}));

/*
 * ============================================================
 * MOCK PRISMA
 * ============================================================
 */

vi.mock("../config/prisma.js", () => ({
  default: {
    businessProfile: {
      findUnique: mocks.findBusiness,
    },

    businessStorefrontSettings: {
      findUnique: mocks.findSettings,
      upsert: mocks.upsertSettings,
    },
  },
}));

/*
 * ============================================================
 * MOCK STOREFRONT ENTITLEMENT SERVICE
 * ============================================================
 */

vi.mock(
  "../services/businessStorefrontEntitlementService.js",
  () => ({
    resolveBusinessStorefrontEntitlement:
      mocks.resolveEntitlement,
  })
);

/*
 * ============================================================
 * IMPORT CONTROLLERS
 * ============================================================
 */

import {
  getMyBusinessStorefrontBranding,
  updateMyBusinessStorefrontBranding,
} from "../controllers/businessStorefrontBrandingController.js";

import {
  DEFAULT_STOREFRONT_BRANDING,
} from "../config/businessStorefrontBranding.js";

/*
 * ============================================================
 * FIXTURES
 * ============================================================
 */

const business = {
  id: "business-001",
  userId: "owner-001",
  businessName: "BarterConnekt Test Store",
  slug: "barterconnekt-test-store",
  logo: "https://example.com/logo.png",
  coverImage: "https://example.com/cover.png",
};

const savedSettings = {
  id: "settings-001",
  businessId: "business-001",

  primaryColor: "#112233",
  secondaryColor: "#AABBCC",
  accentColor: "#445566",

  layoutStyle: "MODERN",
  tagline: "Trade smarter every day",
};

const proAccess = {
  businessId: "business-001",
  tier: "BUSINESS_PRO",
  isBusinessPro: true,

  features: {
    customBranding: true,
  },
};

const freeAccess = {
  businessId: "business-001",
  tier: "BUSINESS_FREE",
  isBusinessPro: false,

  features: {
    customBranding: false,
  },
};

/*
 * ============================================================
 * EXPRESS REQUEST / RESPONSE HELPERS
 * ============================================================
 */

const createRequest = ({
  userId = "owner-001",
  authenticated = true,
  body = {},
} = {}) => ({
  user: authenticated
    ? { id: userId }
    : undefined,

  body,
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

const getBody = (res) =>
  res.json.mock.calls[0]?.[0];

/*
 * ============================================================
 * TEST SETUP
 * ============================================================
 */

describe("Protected Business Pro Branding API", () => {
  beforeEach(() => {
    vi.clearAllMocks();

    mocks.findBusiness.mockResolvedValue(
      business
    );

    mocks.findSettings.mockResolvedValue(
      savedSettings
    );

    mocks.upsertSettings.mockResolvedValue(
      savedSettings
    );

    mocks.resolveEntitlement.mockResolvedValue(
      proAccess
    );
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  /*
   * ==========================================================
   * TEST 1 — PRO OWNER CAN READ BRANDING
   * ==========================================================
   */

  it("GET returns saved branding for an active Business Pro owner", async () => {
    const req = createRequest();
    const res = createResponse();

    await getMyBusinessStorefrontBranding(
      req,
      res
    );

    expect(res.status).toHaveBeenCalledWith(
      200
    );

    expect(getBody(res)).toMatchObject({
      success: true,

      business: {
        id: "business-001",
        businessName:
          "BarterConnekt Test Store",
      },

      access: {
        tier: "BUSINESS_PRO",
        isBusinessPro: true,
        canCustomizeBranding: true,
      },

      branding: {
        primaryColor: "#112233",
        secondaryColor: "#AABBCC",
        accentColor: "#445566",
        layoutStyle: "MODERN",
        tagline:
          "Trade smarter every day",
      },
    });

    expect(
      mocks.findBusiness
    ).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          userId: "owner-001",
        },
      })
    );

    expect(
      mocks.findSettings
    ).toHaveBeenCalledWith({
      where: {
        businessId: "business-001",
      },
    });
  });

  /*
   * ==========================================================
   * TEST 2 — FREE OWNER RECEIVES DEFAULT BRANDING
   * ==========================================================
   */

  it("GET returns default branding for a Business Free owner", async () => {
    mocks.resolveEntitlement.mockResolvedValue(
      freeAccess
    );

    const res = createResponse();

    await getMyBusinessStorefrontBranding(
      createRequest(),
      res
    );

    expect(res.status).toHaveBeenCalledWith(
      200
    );

    const body = getBody(res);

    expect(body.access).toMatchObject({
      tier: "BUSINESS_FREE",
      isBusinessPro: false,
      canCustomizeBranding: false,
    });

    expect(body.branding).toEqual(
      DEFAULT_STOREFRONT_BRANDING
    );
  });

  /*
   * ==========================================================
   * TEST 3 — PRO WITHOUT SAVED SETTINGS
   * ==========================================================
   */

  it("GET returns defaults when Pro has no saved settings", async () => {
    mocks.findSettings.mockResolvedValue(
      null
    );

    const res = createResponse();

    await getMyBusinessStorefrontBranding(
      createRequest(),
      res
    );

    expect(res.status).toHaveBeenCalledWith(
      200
    );

    expect(
      getBody(res).branding
    ).toEqual(
      DEFAULT_STOREFRONT_BRANDING
    );

    expect(
      getBody(res).access.isBusinessPro
    ).toBe(true);
  });

  /*
   * ==========================================================
   * TEST 4 — UNAUTHENTICATED GET
   * ==========================================================
   */

  it("GET returns 401 without authentication", async () => {
    const res = createResponse();

    await getMyBusinessStorefrontBranding(
      createRequest({
        authenticated: false,
      }),
      res
    );

    expect(res.status).toHaveBeenCalledWith(
      401
    );

    expect(getBody(res)).toMatchObject({
      success: false,
      code: "AUTHENTICATION_REQUIRED",
    });

    expect(
      mocks.findBusiness
    ).not.toHaveBeenCalled();
  });

  /*
   * ==========================================================
   * TEST 5 — BUSINESS NOT FOUND
   * ==========================================================
   */

  it("GET returns 404 when the owner has no business", async () => {
    mocks.findBusiness.mockResolvedValue(
      null
    );

    const res = createResponse();

    await getMyBusinessStorefrontBranding(
      createRequest(),
      res
    );

    expect(res.status).toHaveBeenCalledWith(
      404
    );

    expect(getBody(res)).toMatchObject({
      success: false,
      code: "BUSINESS_NOT_FOUND",
    });

    expect(
      mocks.findSettings
    ).not.toHaveBeenCalled();
  });

  /*
   * ==========================================================
   * TEST 6 — SUCCESSFUL PRO UPDATE
   * ==========================================================
   */

  it("PATCH saves valid branding for Business Pro", async () => {
    const payload = {
      primaryColor: "#112233",
      secondaryColor: "#AABBCC",
      accentColor: "#445566",
      layoutStyle: "MODERN",
      tagline:
        "Trade smarter every day",
    };

    const res = createResponse();

    await updateMyBusinessStorefrontBranding(
      createRequest({
        body: payload,
      }),
      res
    );

    expect(res.status).toHaveBeenCalledWith(
      200
    );

    expect(
      mocks.upsertSettings
    ).toHaveBeenCalledWith({
      where: {
        businessId: "business-001",
      },

      create: {
        businessId: "business-001",
        ...payload,
      },

      update: payload,
    });

    expect(getBody(res)).toMatchObject({
      success: true,
      message:
        "Storefront branding updated successfully.",

      branding: payload,
    });
  });

  /*
   * ==========================================================
   * TEST 7 — PARTIAL UPDATE
   * ==========================================================
   */

  it("PATCH supports updating only the tagline", async () => {
    const res = createResponse();

    await updateMyBusinessStorefrontBranding(
      createRequest({
        body: {
          tagline:
            "  Welcome to our store  ",
        },
      }),
      res
    );

    expect(res.status).toHaveBeenCalledWith(
      200
    );

    expect(
      mocks.upsertSettings
    ).toHaveBeenCalledWith({
      where: {
        businessId: "business-001",
      },

      create: {
        businessId: "business-001",
        tagline:
          "Welcome to our store",
      },

      update: {
        tagline:
          "Welcome to our store",
      },
    });
  });

  /*
   * ==========================================================
   * TEST 8 — FREE USER CANNOT UPDATE
   * ==========================================================
   */

  it("PATCH returns 403 for Business Free", async () => {
    mocks.resolveEntitlement.mockResolvedValue(
      freeAccess
    );

    const res = createResponse();

    await updateMyBusinessStorefrontBranding(
      createRequest({
        body: {
          primaryColor: "#112233",
        },
      }),
      res
    );

    expect(res.status).toHaveBeenCalledWith(
      403
    );

    expect(getBody(res)).toMatchObject({
      success: false,
      code: "BUSINESS_PRO_REQUIRED",
      upgradeRequired: true,
    });

    expect(
      mocks.upsertSettings
    ).not.toHaveBeenCalled();
  });

  /*
   * ==========================================================
   * TEST 9 — ENTITLEMENT OWNERSHIP
   * ==========================================================
   */

  it("PATCH rejects Pro entitlement belonging to another business", async () => {
    mocks.resolveEntitlement.mockResolvedValue({
      ...proAccess,
      businessId:
        "different-business",
    });

    const res = createResponse();

    await updateMyBusinessStorefrontBranding(
      createRequest({
        body: {
          primaryColor: "#112233",
        },
      }),
      res
    );

    expect(res.status).toHaveBeenCalledWith(
      403
    );

    expect(
      mocks.upsertSettings
    ).not.toHaveBeenCalled();
  });

  /*
   * ==========================================================
   * TEST 10 — INVALID COLOR
   * ==========================================================
   */

  it("PATCH rejects invalid hexadecimal colors", async () => {
    const res = createResponse();

    await updateMyBusinessStorefrontBranding(
      createRequest({
        body: {
          primaryColor: "red",
        },
      }),
      res
    );

    expect(res.status).toHaveBeenCalledWith(
      400
    );

    expect(getBody(res)).toMatchObject({
      success: false,
      code:
        "INVALID_STOREFRONT_BRANDING",
    });

    expect(
      getBody(res).errors
    ).toHaveProperty(
      "primaryColor"
    );

    expect(
      mocks.upsertSettings
    ).not.toHaveBeenCalled();
  });

  /*
   * ==========================================================
   * TEST 11 — INVALID LAYOUT
   * ==========================================================
   */

  it("PATCH rejects unsupported layouts", async () => {
    const res = createResponse();

    await updateMyBusinessStorefrontBranding(
      createRequest({
        body: {
          layoutStyle:
            "CUSTOM_UNKNOWN_LAYOUT",
        },
      }),
      res
    );

    expect(res.status).toHaveBeenCalledWith(
      400
    );

    expect(
      getBody(res).errors
    ).toHaveProperty(
      "layoutStyle"
    );

    expect(
      mocks.upsertSettings
    ).not.toHaveBeenCalled();
  });

  /*
   * ==========================================================
   * TEST 12 — TAGLINE LENGTH
   * ==========================================================
   */

  it("PATCH rejects taglines exceeding 120 characters", async () => {
    const res = createResponse();

    await updateMyBusinessStorefrontBranding(
      createRequest({
        body: {
          tagline: "A".repeat(121),
        },
      }),
      res
    );

    expect(res.status).toHaveBeenCalledWith(
      400
    );

    expect(
      getBody(res).errors
    ).toHaveProperty(
      "tagline"
    );
  });

  /*
   * ==========================================================
   * TEST 13 — UNAUTHENTICATED PATCH
   * ==========================================================
   */

  it("PATCH returns 401 without authentication", async () => {
    const res = createResponse();

    await updateMyBusinessStorefrontBranding(
      createRequest({
        authenticated: false,

        body: {
          tagline: "New tagline",
        },
      }),
      res
    );

    expect(res.status).toHaveBeenCalledWith(
      401
    );

    expect(
      mocks.upsertSettings
    ).not.toHaveBeenCalled();
  });

  /*
   * ==========================================================
   * TEST 14 — EMPTY UPDATE
   * ==========================================================
   */

  it("PATCH rejects an empty branding payload", async () => {
    const res = createResponse();

    await updateMyBusinessStorefrontBranding(
      createRequest({
        body: {},
      }),
      res
    );

    expect(res.status).toHaveBeenCalledWith(
      400
    );

    expect(
      getBody(res).errors
    ).toHaveProperty(
      "body"
    );

    expect(
      mocks.upsertSettings
    ).not.toHaveBeenCalled();
  });

  /*
   * ==========================================================
   * TEST 15 — UNKNOWN FIELDS
   * ==========================================================
   */

  it("PATCH rejects unsupported branding fields", async () => {
    const res = createResponse();

    await updateMyBusinessStorefrontBranding(
      createRequest({
        body: {
          primaryColor: "#112233",
          isBusinessPro: true,
        },
      }),
      res
    );

    expect(res.status).toHaveBeenCalledWith(
      400
    );

    expect(
      getBody(res).errors
    ).toHaveProperty(
      "isBusinessPro"
    );

    expect(
      mocks.upsertSettings
    ).not.toHaveBeenCalled();
  });

  /*
   * ==========================================================
   * TEST 16 — DATABASE FAILURE ON PATCH
   * ==========================================================
   */

  it("PATCH returns 500 when saving settings fails", async () => {
    const consoleSpy = vi
      .spyOn(console, "error")
      .mockImplementation(() => {});

    try {
      mocks.upsertSettings.mockRejectedValue(
        new Error("Database unavailable")
      );

      const res = createResponse();

      await updateMyBusinessStorefrontBranding(
        createRequest({
          body: {
            primaryColor: "#112233",
          },
        }),
        res
      );

      expect(res.status).toHaveBeenCalledWith(
        500
      );

      expect(getBody(res)).toMatchObject({
        success: false,
        code:
          "STOREFRONT_BRANDING_UPDATE_ERROR",
      });
    } finally {
      consoleSpy.mockRestore();
    }
  });

  /*
   * ==========================================================
   * TEST 17 — DATABASE FAILURE ON GET
   * ==========================================================
   */

  it("GET returns 500 when loading settings fails", async () => {
    const consoleSpy = vi
      .spyOn(console, "error")
      .mockImplementation(() => {});

    try {
      mocks.findSettings.mockRejectedValue(
        new Error("Database unavailable")
      );

      const res = createResponse();

      await getMyBusinessStorefrontBranding(
        createRequest(),
        res
      );

      expect(res.status).toHaveBeenCalledWith(
        500
      );

      expect(getBody(res)).toMatchObject({
        success: false,
        code:
          "STOREFRONT_BRANDING_FETCH_ERROR",
      });
    } finally {
      consoleSpy.mockRestore();
    }
  });
});
