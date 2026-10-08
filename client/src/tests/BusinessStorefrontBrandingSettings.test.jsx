
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
  fireEvent,
  waitFor,
  within,
} from "@testing-library/react";

import userEvent from "@testing-library/user-event";

/*
 * ============================================================
 * MOCK BUSINESS API
 * ============================================================
 */

const mocks = vi.hoisted(() => ({
  getBranding: vi.fn(),
  updateBranding: vi.fn(),
}));

vi.mock("../api/business", () => ({
  getMyBusinessStorefrontBranding:
    mocks.getBranding,

  updateMyBusinessStorefrontBranding:
    mocks.updateBranding,
}));

import BusinessStorefrontBrandingSettings from
  "../components/business/BusinessStorefrontBrandingSettings";

/*
 * ============================================================
 * TEST FIXTURES
 * ============================================================
 */

const DEFAULT_BRANDING = {
  primaryColor: "#5B1725",
  secondaryColor: "#D6B15E",
  accentColor: "#8A2638",
  layoutStyle: "CLASSIC",
  tagline: null,
};

const CUSTOM_BRANDING = {
  primaryColor: "#112233",
  secondaryColor: "#AABBCC",
  accentColor: "#445566",
  layoutStyle: "MODERN",
  tagline: "Trade smarter every day",
};

const business = {
  id: "business-001",
  businessName: "BarterConnekt Test Store",
  slug: "barterconnekt-test-store",
  logo: "https://example.com/logo.png",
  coverImage: "https://example.com/cover.png",
};

const proAccess = {
  tier: "BUSINESS_PRO",
  isBusinessPro: true,
  canCustomizeBranding: true,
};

const freeAccess = {
  tier: "BUSINESS_FREE",
  isBusinessPro: false,
  canCustomizeBranding: false,
};

const createResponse = ({
  access = proAccess,
  branding = CUSTOM_BRANDING,
} = {}) => ({
  success: true,
  business,
  access,
  branding,
});

const renderSettings = () =>
  render(
    <BusinessStorefrontBrandingSettings />
  );

const loadSettings = async () => {
  await screen.findByRole("heading", {
    name: "Storefront Branding",
  });
};

/*
 * ============================================================
 * TEST SETUP
 * ============================================================
 */

beforeEach(() => {
  vi.clearAllMocks();

  mocks.getBranding.mockResolvedValue(
    createResponse()
  );

  mocks.updateBranding.mockImplementation(
    async (payload) => ({
      success: true,
      branding: payload,
    })
  );
});

/*
 * ============================================================
 * TEST SUITE
 * ============================================================
 */

describe("Business Storefront Branding Settings", () => {

  /*
   * TEST 1 — INITIAL LOADING
   */

  it("displays a loading state while fetching branding", () => {
    mocks.getBranding.mockReturnValue(
      new Promise(() => {})
    );

    renderSettings();

    expect(
      screen.getByText(
        "Loading storefront branding..."
      )
    ).toBeInTheDocument();
  });

  /*
   * TEST 2 — LOAD SAVED BRANDING
   */

  it("loads existing Business Pro branding", async () => {
    renderSettings();

    await loadSettings();

    expect(
      screen.getByLabelText("Primary color")
    ).toHaveValue("#112233");

    expect(
      screen.getByLabelText("Secondary color")
    ).toHaveValue("#AABBCC");

    expect(
      screen.getByLabelText("Accent color")
    ).toHaveValue("#445566");

    expect(
      screen.getByLabelText("Business Tagline")
    ).toHaveValue(
      "Trade smarter every day"
    );

    expect(
      screen.getByRole("radio", {
        name: /Modern/i,
      })
    ).toBeChecked();
  });

  /*
   * TEST 3 — SAVE BUTTON INITIAL STATE
   */

  it("disables Save when there are no changes", async () => {
    renderSettings();

    await loadSettings();

    expect(
      screen.getByRole("button", {
        name: "Save Branding",
      })
    ).toBeDisabled();
  });

  /*
   * TEST 4 — CHANGE BRAND COLOR
   */

  it("updates the primary color and enables Save", async () => {
    renderSettings();

    await loadSettings();

    fireEvent.change(
      screen.getByLabelText("Primary color"),
      {
        target: {
          value: "#123456",
        },
      }
    );

    expect(
      screen.getByLabelText("Primary color")
    ).toHaveValue("#123456");

    expect(
      screen.getByRole("button", {
        name: "Save Branding",
      })
    ).toBeEnabled();
  });

  /*
   * TEST 5 — LIVE COLOR PREVIEW
   */

  it("updates the live preview when the primary color changes", async () => {
    renderSettings();

    await loadSettings();

    fireEvent.change(
      screen.getByLabelText("Primary color"),
      {
        target: {
          value: "#123456",
        },
      }
    );

    const previewHeading =
      screen.getByRole("heading", {
        name: "BarterConnekt Test Store",
      });

    expect(previewHeading).toHaveStyle({
      color: "#123456",
    });
  });

  /*
   * TEST 6 — CHANGE LAYOUT
   */

  it("allows selecting the Minimal layout", async () => {
    const user = userEvent.setup();

    renderSettings();

    await loadSettings();

    await user.click(
      screen.getByRole("radio", {
        name: /Minimal/i,
      })
    );

    expect(
      screen.getByRole("radio", {
        name: /Minimal/i,
      })
    ).toBeChecked();

    expect(
      screen.getByText("MINIMAL")
    ).toBeInTheDocument();
  });

  
/*
 * TEST 7 — CHANGE TAGLINE
 */

it("updates the tagline in the live preview", async () => {
  renderSettings();

  await loadSettings();

  // Update the tagline field
  fireEvent.change(
    screen.getByLabelText("Business Tagline"),
    {
      target: {
        value: "Swap more, spend less",
      },
    }
  );

  // Confirm the input was updated
  expect(
    screen.getByLabelText("Business Tagline")
  ).toHaveValue("Swap more, spend less");

  // Confirm the live preview displays the tagline
  const previewHeading = screen.getByRole(
    "heading",
    {
      name: "Live Preview",
    }
  );

  const previewContainer =
    previewHeading.parentElement.parentElement;

  expect(
    within(previewContainer).getByText(
      "Swap more, spend less",
      { selector: "p" }
    )
  ).toBeInTheDocument();
});

  /*
   * TEST 8 — SAVE BRANDING
   */

  it("saves valid Business Pro branding", async () => {
    const user = userEvent.setup();

    renderSettings();

    await loadSettings();

    fireEvent.change(
      screen.getByLabelText("Primary color"),
      {
        target: {
          value: "#123456",
        },
      }
    );

    await user.click(
      screen.getByRole("button", {
        name: "Save Branding",
      })
    );

    await waitFor(() => {
      expect(
        mocks.updateBranding
      ).toHaveBeenCalledWith({
        primaryColor: "#123456",
        secondaryColor: "#AABBCC",
        accentColor: "#445566",
        layoutStyle: "MODERN",
        tagline:
          "Trade smarter every day",
      });
    });

    expect(
      await screen.findByRole("status")
    ).toHaveTextContent(
      "Storefront branding saved successfully."
    );

    expect(
      screen.getByRole("button", {
        name: "Save Branding",
      })
    ).toBeDisabled();
  });

  /*
   * TEST 9 — RESET UNSAVED CHANGES
   */

  it("restores saved branding when Reset Changes is clicked", async () => {
    const user = userEvent.setup();

    renderSettings();

    await loadSettings();

    fireEvent.change(
      screen.getByLabelText("Primary color"),
      {
        target: {
          value: "#123456",
        },
      }
    );

    await user.click(
      screen.getByRole("button", {
        name: "Reset Changes",
      })
    );

    expect(
      screen.getByLabelText("Primary color")
    ).toHaveValue("#112233");

    expect(
      screen.getByRole("button", {
        name: "Save Branding",
      })
    ).toBeDisabled();
  });

  /*
   * TEST 10 — BUSINESS FREE RESTRICTIONS
   */

  it("allows Free users to preview but prevents saving", async () => {
    mocks.getBranding.mockResolvedValue(
      createResponse({
        access: freeAccess,
        branding: DEFAULT_BRANDING,
      })
    );

    renderSettings();

    await loadSettings();

    expect(
      screen.getByText(
        "Business Pro Feature"
      )
    ).toBeInTheDocument();

    fireEvent.change(
      screen.getByLabelText("Primary color"),
      {
        target: {
          value: "#123456",
        },
      }
    );

    expect(
      screen.getByLabelText("Primary color")
    ).toHaveValue("#123456");

    expect(
      screen.getByRole("button", {
        name: "Save Branding",
      })
    ).toBeDisabled();

    expect(
      mocks.updateBranding
    ).not.toHaveBeenCalled();
  });

  /*
   * TEST 11 — INVALID COLOR
   */

  it("rejects invalid hexadecimal colors before saving", async () => {
    const user = userEvent.setup();

    renderSettings();

    await loadSettings();

    fireEvent.change(
      screen.getByLabelText("Primary color"),
      {
        target: {
          value: "invalid",
        },
      }
    );

    await user.click(
      screen.getByRole("button", {
        name: "Save Branding",
      })
    );

    expect(
      screen.getByRole("alert")
    ).toHaveTextContent(
      "Primary color must be a valid six-digit hex color."
    );

    expect(
      mocks.updateBranding
    ).not.toHaveBeenCalled();
  });

  /*
   * TEST 12 — FAILED SAVE
   */

  it("displays an error when saving fails", async () => {
    const user = userEvent.setup();

    mocks.updateBranding.mockRejectedValue({
      response: {
        status: 500,
        data: {
          message:
            "Unable to save branding.",
        },
      },
    });

    renderSettings();

    await loadSettings();

    fireEvent.change(
      screen.getByLabelText("Primary color"),
      {
        target: {
          value: "#123456",
        },
      }
    );

    await user.click(
      screen.getByRole("button", {
        name: "Save Branding",
      })
    );

    expect(
      await screen.findByRole("alert")
    ).toHaveTextContent(
      "Unable to save branding."
    );
  });

  /*
   * TEST 13 — SUBSCRIPTION EXPIRES
   */

  it("locks custom branding when the API returns BUSINESS_PRO_REQUIRED", async () => {
    const user = userEvent.setup();

    mocks.updateBranding.mockRejectedValue({
      response: {
        status: 403,
        data: {
          code: "BUSINESS_PRO_REQUIRED",
        },
      },
    });

    renderSettings();

    await loadSettings();

    fireEvent.change(
      screen.getByLabelText("Primary color"),
      {
        target: {
          value: "#123456",
        },
      }
    );

    await user.click(
      screen.getByRole("button", {
        name: "Save Branding",
      })
    );

    expect(
      await screen.findByRole("alert")
    ).toHaveTextContent(
      "Your Business Pro subscription is no longer active."
    );

    expect(
      screen.getByRole("button", {
        name: "Save Branding",
      })
    ).toBeDisabled();

    expect(
      screen.getByLabelText("Primary color")
    ).toHaveValue(
      DEFAULT_BRANDING.primaryColor
    );
  });

  /*
   * TEST 14 — LOAD FAILURE
   */

  it("shows a retry button when loading fails", async () => {
    mocks.getBranding.mockRejectedValue(
      new Error("Network unavailable")
    );

    renderSettings();

    expect(
      await screen.findByText(
        "Network unavailable"
      )
    ).toBeInTheDocument();

    expect(
      screen.getByRole("button", {
        name: "Retry",
      })
    ).toBeInTheDocument();
  });

  /*
   * TEST 15 — RETRY LOADING
   */

  it("retries fetching branding after an error", async () => {
    const user = userEvent.setup();

    mocks.getBranding
      .mockRejectedValueOnce(
        new Error("Temporary failure")
      )
      .mockResolvedValueOnce(
        createResponse()
      );

    renderSettings();

    await screen.findByRole("button", {
      name: "Retry",
    });

    await user.click(
      screen.getByRole("button", {
        name: "Retry",
      })
    );

    await loadSettings();

    expect(
      mocks.getBranding
    ).toHaveBeenCalledTimes(2);
  });
});
