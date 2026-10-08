
import {
  describe,
  it,
  expect,
  vi,
  beforeEach,
} from "vitest";

vi.mock("../config/prisma.js", () => ({
  default: {
    businessProfile: {
      findUnique: vi.fn(),
    },
  },
}));

vi.mock("../services/subscriptionService.js", () => ({
  getBusinessProEntitlement: vi.fn(),
}));

import prisma from "../config/prisma.js";

import {
  getBusinessProEntitlement,
} from "../services/subscriptionService.js";

import {
  resolveBusinessStorefrontEntitlement,
} from "../services/businessStorefrontEntitlementService.js";

const business = {
  id: "business-001",
  userId: "user-001",
  businessName: "Test Business",
  slug: "test-business",
  status: "ACTIVE",
};

describe("Business Storefront Entitlement", () => {
  beforeEach(() => {
    vi.clearAllMocks();

    prisma.businessProfile.findUnique.mockResolvedValue(
      business
    );

    getBusinessProEntitlement.mockResolvedValue(null);
  });

  it("returns null without a user ID", async () => {
    const result =
      await resolveBusinessStorefrontEntitlement(null);

    expect(result).toBeNull();

    expect(
      prisma.businessProfile.findUnique
    ).not.toHaveBeenCalled();
  });

  it("returns null when the business does not exist", async () => {
    prisma.businessProfile.findUnique.mockResolvedValue(
      null
    );

    const result =
      await resolveBusinessStorefrontEntitlement(
        "user-001"
      );

    expect(result).toBeNull();

    expect(
      getBusinessProEntitlement
    ).not.toHaveBeenCalled();
  });

  it("returns Free permissions without Business Pro", async () => {
    const result =
      await resolveBusinessStorefrontEntitlement(
        "user-001"
      );

    expect(result.tier).toBe("BUSINESS_FREE");
    expect(result.isBusinessPro).toBe(false);

    expect(result.features.customBranding).toBe(false);
    expect(result.features.featuredListings).toBe(false);
    expect(result.features.maxFeaturedListings).toBe(0);

    expect(result.subscription).toBeNull();
  });

  it("enables Pro features for a matching entitlement", async () => {
    getBusinessProEntitlement.mockResolvedValue({
      isBusinessPro: true,
      businessId: "business-001",
      plan: "BUSINESS_PRO",
      status: "ACTIVE",
      startedAt: new Date("2026-10-01"),
      expiresAt: new Date("2026-10-31"),
      daysRemaining: 23,
    });

    const result =
      await resolveBusinessStorefrontEntitlement(
        "user-001"
      );

    expect(result.tier).toBe("BUSINESS_PRO");
    expect(result.isBusinessPro).toBe(true);

    expect(result.features.customBranding).toBe(true);
    expect(result.features.featuredListings).toBe(true);
    expect(result.features.promotionalHighlights).toBe(true);
    expect(result.features.enhancedLayout).toBe(true);

    expect(result.features.maxFeaturedListings).toBe(6);
    expect(result.subscription.plan).toBe("BUSINESS_PRO");
  });

  it("rejects entitlement belonging to another business", async () => {
    getBusinessProEntitlement.mockResolvedValue({
      isBusinessPro: true,
      businessId: "another-business",
    });

    const result =
      await resolveBusinessStorefrontEntitlement(
        "user-001"
      );

    expect(result.isBusinessPro).toBe(false);
    expect(result.features.featuredListings).toBe(false);
  });

  it("does not grant Pro when the resolver denies entitlement", async () => {
    getBusinessProEntitlement.mockResolvedValue({
      isBusinessPro: false,
      businessId: "business-001",
      status: "EXPIRED",
    });

    const result =
      await resolveBusinessStorefrontEntitlement(
        "user-001"
      );

    expect(result.tier).toBe("BUSINESS_FREE");
    expect(result.subscription).toBeNull();
  });

  it("looks up the business using the authenticated owner ID", async () => {
    await resolveBusinessStorefrontEntitlement(
      "user-001"
    );

    expect(
      prisma.businessProfile.findUnique
    ).toHaveBeenCalledWith({
      where: {
        userId: "user-001",
      },
      select: {
        id: true,
        userId: true,
        businessName: true,
        slug: true,
        status: true,
      },
    });
  });
});
