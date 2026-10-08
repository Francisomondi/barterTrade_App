
import React from "react";
import {
  describe,
  it,
  expect,
  vi,
  beforeEach,
} from "vitest";
import {
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";

const mocks = vi.hoisted(() => ({
  getPublicBusiness: vi.fn(),
  getPublicBusinessListings: vi.fn(),
  trackContactClick: vi.fn(),
  trackPhoneClick: vi.fn(),
  trackWebsiteClick: vi.fn(),
}));

vi.mock("../api/business", () => ({
  getPublicBusiness: mocks.getPublicBusiness,
  getPublicBusinessListings:
    mocks.getPublicBusinessListings,
}));

vi.mock("../api/businessAnalytics", () => ({
  trackContactClick: mocks.trackContactClick,
  trackPhoneClick: mocks.trackPhoneClick,
  trackWebsiteClick: mocks.trackWebsiteClick,
}));

vi.mock("react-router-dom", async (importOriginal) => {
  const actual = await importOriginal();

  return {
    ...actual,
    useParams: () => ({
      slug: "test-business",
    }),
  };
});

vi.mock(
  "../components/business/BusinessBadge",
  () => ({
    default: () => (
      <span data-testid="verification-badge">
        Verified Business
      </span>
    ),
  })
);

import BusinessStorefront from
  "../pages/BusinessStorefront";

const defaultBranding = {
  primaryColor: "#5B1725",
  secondaryColor: "#D6B15E",
  accentColor: "#8A2638",
  layoutStyle: "CLASSIC",
  tagline: null,
};

const customBranding = {
  primaryColor: "#112233",
  secondaryColor: "#AABBCC",
  accentColor: "#445566",
  layoutStyle: "MODERN",
  tagline: "Trade smarter every day",
};

const createBusiness = (overrides = {}) => ({
  id: "business-001",
  businessName: "Test Business",
  slug: "test-business",
  description: "Quality items for barter",
  logo: "https://example.com/logo.png",
  coverImage: "https://example.com/cover.png",
  category: "Electronics",
  location: "Nairobi",
  address: "Nairobi, Kenya",
  phone: "+254712345678",
  email: "store@example.com",
  website: "https://example.com",
  verificationStatus: "VERIFIED",
  isVerified: true,
  activeListingCount: 1,
  storefront: {
    tier: "BUSINESS_PRO",
    branding: customBranding,
  },
  ...overrides,
});

const listing = {
  id: "listing-001",
  title: "Samsung Television",
  description: "A working television",
  estimatedValue: 25000,
  condition: "USED",
  category: {
    name: "Electronics",
  },
  images: [],
};

const renderStorefront = () =>
  render(
    <MemoryRouter>
      <BusinessStorefront />
    </MemoryRouter>
  );

beforeEach(() => {
  vi.clearAllMocks();

  mocks.getPublicBusiness.mockResolvedValue({
    success: true,
    business: createBusiness(),
  });

  mocks.getPublicBusinessListings.mockResolvedValue({
    success: true,
    listings: [listing],
    pagination: {
      page: 1,
      limit: 12,
      totalListings: 1,
      totalPages: 1,
      hasNextPage: false,
      hasPreviousPage: false,
    },
  });

  mocks.trackContactClick.mockResolvedValue();
  mocks.trackPhoneClick.mockResolvedValue();
  mocks.trackWebsiteClick.mockResolvedValue();
});

describe("Public Business Storefront", () => {
  it("loads the business and listings", async () => {
    renderStorefront();

    expect(
      await screen.findByRole("heading", {
        name: "Test Business",
      })
    ).toBeInTheDocument();

    expect(
      await screen.findByText("Samsung Television")
    ).toBeInTheDocument();

    expect(
      mocks.getPublicBusiness
    ).toHaveBeenCalledWith("test-business");

    expect(
      mocks.getPublicBusinessListings
    ).toHaveBeenCalledWith({
      slug: "test-business",
      page: 1,
      limit: 12,
    });
  });

  it("displays the Business Pro badge", async () => {
    renderStorefront();

    expect(
      await screen.findByText("BUSINESS PRO")
    ).toBeInTheDocument();
  });

  it("displays the custom Business Pro tagline", async () => {
    renderStorefront();

    expect(
      await screen.findByText(
        "Trade smarter every day"
      )
    ).toBeInTheDocument();
  });

  it("applies the custom primary color to the business heading", async () => {
    renderStorefront();

    const heading = await screen.findByRole(
      "heading",
      { name: "Test Business" }
    );

    expect(heading).toHaveStyle({
      color: "#112233",
    });
  });

  it("renders the saved business cover image", async () => {
    renderStorefront();

    const cover = await screen.findByAltText(
      "Test Business cover"
    );

    expect(cover).toHaveAttribute(
      "src",
      "https://example.com/cover.png"
    );
  });

  it("uses default branding for Business Free", async () => {
    mocks.getPublicBusiness.mockResolvedValue({
      success: true,
      business: createBusiness({
        storefront: {
          tier: "BUSINESS_FREE",
          // Deliberately include custom values.
          // The frontend must ignore them for Free.
          branding: customBranding,
        },
      }),
    });

    renderStorefront();

    const heading = await screen.findByRole(
      "heading",
      { name: "Test Business" }
    );

    expect(heading).toHaveStyle({
      color: defaultBranding.primaryColor,
    });

    expect(
      screen.queryByText("BUSINESS PRO")
    ).not.toBeInTheDocument();

    expect(
      screen.queryByText(
        "Trade smarter every day"
      )
    ).not.toBeInTheDocument();
  });

  it("uses default branding when storefront data is missing", async () => {
    mocks.getPublicBusiness.mockResolvedValue({
      success: true,
      business: createBusiness({
        storefront: undefined,
      }),
    });

    renderStorefront();

    const heading = await screen.findByRole(
      "heading",
      { name: "Test Business" }
    );

    expect(heading).toHaveStyle({
      color: defaultBranding.primaryColor,
    });
  });

  it("falls back when the API returns an invalid custom color", async () => {
    mocks.getPublicBusiness.mockResolvedValue({
      success: true,
      business: createBusiness({
        storefront: {
          tier: "BUSINESS_PRO",
          branding: {
            ...customBranding,
            primaryColor: "not-a-color",
          },
        },
      }),
    });

    renderStorefront();

    const heading = await screen.findByRole(
      "heading",
      { name: "Test Business" }
    );

    expect(heading).toHaveStyle({
      color: defaultBranding.primaryColor,
    });
  });

  it("preserves the business verification badge", async () => {
    renderStorefront();

    expect(
      await screen.findByTestId(
        "verification-badge"
      )
    ).toBeInTheDocument();
  });

  it("preserves public contact links", async () => {
    renderStorefront();

    await screen.findByRole("heading", {
      name: "Test Business",
    });

    expect(
      screen.getByRole("link", {
        name: /phone/i,
      })
    ).toHaveAttribute(
      "href",
      "tel:+254712345678"
    );

    expect(
      screen.getByRole("link", {
        name: /email/i,
      })
    ).toHaveAttribute(
      "href",
      "mailto:store@example.com"
    );
  });

  it("displays an error when the business is unavailable", async () => {
    mocks.getPublicBusiness.mockRejectedValue({
      response: {
        status: 404,
      },
    });

    renderStorefront();

    expect(
      await screen.findByText(
        "Business unavailable"
      )
    ).toBeInTheDocument();

    expect(
      screen.getByText(
        "This Business Storefront could not be found."
      )
    ).toBeInTheDocument();
  });

  it("renders an empty listing state", async () => {
    mocks.getPublicBusinessListings.mockResolvedValue({
      success: true,
      listings: [],
      pagination: {
        page: 1,
        limit: 12,
        totalListings: 0,
        totalPages: 0,
        hasNextPage: false,
        hasPreviousPage: false,
      },
    });

    renderStorefront();

    expect(
      await screen.findByText(
        "No active listings"
      )
    ).toBeInTheDocument();
  });

  it("renders Minimal branding without the custom tagline when absent", async () => {
    mocks.getPublicBusiness.mockResolvedValue({
      success: true,
      business: createBusiness({
        storefront: {
          tier: "BUSINESS_PRO",
          branding: {
            ...customBranding,
            layoutStyle: "MINIMAL",
            tagline: null,
          },
        },
      }),
    });

    renderStorefront();

    await screen.findByRole("heading", {
      name: "Test Business",
    });

    expect(
      screen.queryByText(
        "Trade smarter every day"
      )
    ).not.toBeInTheDocument();

    expect(
      screen.getByText("BUSINESS PRO")
    ).toBeInTheDocument();
  });
});
