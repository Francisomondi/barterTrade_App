import {
  useCallback,
  useEffect,
  useState,
} from "react";
import {
  Link,
  useParams,
} from "react-router-dom";
import {
  BriefcaseBusiness,
  ChevronLeft,
  ChevronRight,
  ExternalLink,
  Globe,
  Mail,
  MapPin,
  Package,
  Phone,
  ShieldCheck,
  Star,
  Store,
  BadgeCheck,
  Gift,
  HeartHandshake,
  Lightbulb,
  Megaphone,
  Sparkles,
  Tag,
  Truck,
  Zap,
} from "lucide-react";
import {
  getPublicBusiness,
  getPublicBusinessListings,
} from "../api/business";
import {
  trackContactClick,
  trackPhoneClick,
  trackWebsiteClick,
} from "../api/businessAnalytics";
import BusinessBadge from "../components/business/BusinessBadge";
const DEFAULT_BRANDING = {
  primaryColor: "#5B1725",
  secondaryColor: "#D6B15E",
  accentColor: "#8A2638",
  layoutStyle: "CLASSIC",
  tagline: null,
};
const VALID_LAYOUTS = [
  "CLASSIC",
  "MODERN",
  "MINIMAL",
];
const HEX_COLOR_REGEX = /^#[0-9a-fA-F]{6}$/;
const resolvePublicBranding = (business) => {
  const custom = business?.storefront?.branding;
  const isBusinessPro =
    business?.storefront?.tier === "BUSINESS_PRO";
  if (!isBusinessPro || !custom) {
    return { ...DEFAULT_BRANDING };
  }
  const branding = { ...DEFAULT_BRANDING };
  for (const field of [
    "primaryColor",
    "secondaryColor",
    "accentColor",
  ]) {
    if (HEX_COLOR_REGEX.test(custom[field] || "")) {
      branding[field] = custom[field];
    }
  }
  if (VALID_LAYOUTS.includes(custom.layoutStyle)) {
    branding.layoutStyle = custom.layoutStyle;
  }
  if (typeof custom.tagline === "string") {
    branding.tagline = custom.tagline.slice(0, 120);
  }
  return branding;
};


/*
 * ============================================================
 * PROMOTIONAL HIGHLIGHT ICONS
 * ============================================================
 */

const PROMOTIONAL_HIGHLIGHT_ICONS = {
  "badge-check": BadgeCheck,
  gift: Gift,
  "heart-handshake": HeartHandshake,
  lightbulb: Lightbulb,
  megaphone: Megaphone,
  sparkles: Sparkles,
  tag: Tag,
  truck: Truck,
  zap: Zap,
};

const resolvePromotionalHighlightIcon = (iconName) => {
  return (
    PROMOTIONAL_HIGHLIGHT_ICONS[iconName] ||
    Sparkles
  );
};

const BusinessStorefront = () => {
  const { slug } = useParams();
  const [business, setBusiness] = useState(null);
  const [listings, setListings] = useState([]);
  const [featuredListings, setFeaturedListings] = useState([]);
  const [pagination, setPagination] =
    useState({
      page: 1,
      limit: 12,
      totalListings: 0,
      totalPages: 0,
      hasNextPage: false,
      hasPreviousPage: false,
    });
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [ listingsLoading, setListingsLoading] = useState(false);
  const [error, setError] = useState("");
  /*
   * ==========================================================
   * LOAD BUSINESS
   * ==========================================================
   */
  const loadBusiness =
    useCallback(async () => {
      try {
        setError("");
        const response =
          await getPublicBusiness(
            slug
          );
        setBusiness(
          response.business
        );
      } catch (err) {
        console.error(
          "LOAD BUSINESS ERROR:",
          err
        );
        if (
          err?.response?.status ===
          404
        ) {
          setError(
            "This Business Storefront could not be found."
          );
        } else {
          setError(
            err?.response?.data
              ?.message ||
              "Unable to load this Business Storefront."
          );
        }
      }
    }, [slug]);
  /*
   * ==========================================================
   * LOAD LISTINGS
   * ==========================================================
   */
  const loadListings =
    useCallback(async () => {
      try {
        setListingsLoading(
          true
        );
        const response =
          await getPublicBusinessListings(
            {
              slug,
              page,
              limit: 12,
            }
          );
        setListings(
          response.listings ||
            []
        );

        setFeaturedListings(
          Array.isArray(response.featuredListings)
            ? response.featuredListings
            : []
        );
        setPagination(
          response.pagination ||
            {
              page,
              limit: 12,
              totalListings: 0,
              totalPages: 0,
              hasNextPage: false,
              hasPreviousPage:
                false,
            }
        );
      } catch (err) {
        console.error(
          "LOAD BUSINESS LISTINGS ERROR:",
          err
        );
        setListings([]);
        setFeaturedListings([]);
      } finally {
        setListingsLoading(
          false
        );
      }
    }, [slug, page]);
  /*
   * ==========================================================
   * INITIAL LOAD
   * ==========================================================
   */
  useEffect(() => {
    const load =
      async () => {
        setLoading(true);
        await Promise.all([
          loadBusiness(),
          loadListings(),
        ]);
        setLoading(false);
      };
    load();
  }, [
    loadBusiness,
    loadListings,
  ]);
  /*
   * ==========================================================
   * RESET PAGE WHEN STORE CHANGES
   * ==========================================================
   */
  useEffect(() => {
    setPage(1);
  }, [slug]);
  /*
   * ==========================================================
   * HELPERS
   * ==========================================================
   */
  const getPrimaryImage = (
    listing
  ) => {
    if (
      !Array.isArray(
        listing?.images
      ) ||
      listing.images.length ===
        0
    ) {
      return null;
    }
    const primary =
      listing.images.find(
        (image) =>
          image.isPrimary
      );
    return (
      primary?.url ||
      primary?.imageUrl ||
      listing.images[0]?.url ||
      listing.images[0]
        ?.imageUrl ||
      null
    );
  };
  /*
   * ==========================================================
   * BUSINESS ENGAGEMENT ANALYTICS
   * ==========================================================
   *
   * These functions are intentionally fire-and-forget.
   *
   * A visitor must still be able to call, email, or visit the
   * business website even if analytics temporarily fails.
   *
   * The analytics API handles its own errors and does not throw.
   */
  const handlePhoneClick = () => {
    if (!business?.slug) {
      return;
    }
    void trackPhoneClick({
      slug: business.slug,
      source:
        "BUSINESS_STOREFRONT",
    });
  };
  const handleEmailClick = () => {
    if (!business?.slug) {
      return;
    }
    void trackContactClick({
      slug: business.slug,
      source:
        "BUSINESS_STOREFRONT",
    });
  };
  const handleWebsiteClick = () => {
    if (!business?.slug) {
      return;
    }
    void trackWebsiteClick({
      slug: business.slug,
      source:
        "BUSINESS_STOREFRONT",
    });
  };
  /*
   * ==========================================================
   * LOADING
   * ==========================================================
   */
  if (loading) {
    return (
      <div
        className="
          min-h-screen
          bg-[#F8F5F3]
          font-sans
        "
      >
        <div
          className="
            mx-auto
            max-w-7xl
            px-4
            py-8
            sm:px-6
            lg:px-8
          "
        >
          <div className="animate-pulse">
            <div
              className="
                h-52
                rounded-2xl
                bg-[#E8DFDB]
                sm:h-60
              "
            />
            <div
              className="
                mx-auto
                -mt-12
                h-24
                w-24
                rounded-2xl
                bg-white
                shadow-lg
                sm:h-28
                sm:w-28
              "
            />
            <div
              className="
                mx-auto
                mt-6
                h-7
                w-64
                rounded
                bg-[#E8DFDB]
              "
            />
            <div
              className="
                mx-auto
                mt-3
                h-4
                w-96
                max-w-full
                rounded
                bg-[#E8DFDB]
              "
            />
            <div
              className="
                mt-10
                grid
                gap-4
                sm:grid-cols-2
                lg:grid-cols-3
                xl:grid-cols-4
              "
            >
              {Array.from({
                length: 8,
              }).map(
                (_, index) => (
                  <div
                    key={index}
                    className="
                      overflow-hidden
                      rounded-xl
                      border
                      border-[#E8DFDB]
                      bg-white
                    "
                  >
                    <div
                      className="
                        aspect-4/3
                        bg-[#E8DFDB]
                      "
                    />
                    <div className="p-3">
                      <div
                        className="
                          h-4
                          w-3/4
                          rounded
                          bg-[#E8DFDB]
                        "
                      />
                      <div
                        className="
                          mt-2
                          h-3
                          w-1/2
                          rounded
                          bg-[#E8DFDB]
                        "
                      />
                    </div>
                  </div>
                )
              )}
            </div>
          </div>
        </div>
      </div>
    );
  }
  /*
   * ==========================================================
   * ERROR
   * ==========================================================
   */
  if (
    error ||
    !business
  ) {
    return (
      <div
        className="
          flex
          min-h-[70vh]
          items-center
          justify-center
          bg-[#F8F5F3]
          px-4
          font-sans
        "
      >
        <div
          className="
            max-w-lg
            rounded-2xl
            border
            border-[#E7DDD9]
            bg-white
            p-8
            text-center
            shadow-sm
          "
        >
          <Store
            size={42}
            className="
              mx-auto
              text-[#6B1D2C]
            "
          />
          <h1
            className="
              mt-4
              text-xl
              font-black
              tracking-tight
              text-[#3D0F18]
            "
          >
            Business unavailable
          </h1>
          <p
            className="
              mt-2
              text-[12px]
              leading-5
              text-gray-500
            "
          >
            {error ||
              "This Business Storefront is currently unavailable."}
          </p>
          <Link
            to="/marketplace"
            className="
              mt-6
              inline-flex
              rounded-xl
              bg-[#6B1D2C]
              px-5
              py-2.5
              text-[11px]
              font-black
              text-white
              transition
              hover:bg-[#541522]
            "
          >
            Browse Marketplace
          </Link>
        </div>
      </div>
    );
  }
  /*
   * ==========================================================
   * BUSINESS BADGE DATA
   * ==========================================================
   */
  const badgeBusiness = {
    isBusiness: true,
    businessName:
      business.businessName,
    slug:
      business.slug,
    logo:
      business.logo,
    category:
      business.category,
    location:
      business.location,
    verificationStatus:
      business.verificationStatus,
    isVerified:
      business.verificationStatus ===
        "VERIFIED" ||
      Boolean(
        business.isVerified
      ),
  };
  const branding = resolvePublicBranding(business);
const {
  primaryColor,
  secondaryColor,
  accentColor,
  layoutStyle,
  tagline,
} = branding;
const isModern = layoutStyle === "MODERN";
const isMinimal = layoutStyle === "MINIMAL";


/*
 * ============================================================
 * BUSINESS PRO — PUBLIC INTRODUCTION
 * ============================================================
 *
 * Only render introduction content returned for an
 * active Business Pro storefront.
 */

const isBusinessPro =
  business.storefront?.tier === "BUSINESS_PRO";

const businessIntroduction =
  isBusinessPro &&
  typeof business.storefront?.introduction === "string"
    ? business.storefront.introduction.trim()
    : "";

    
/*
 * ============================================================
 * BUSINESS PRO — PUBLIC PROMOTIONAL HIGHLIGHTS
 * ============================================================
 */

const promotionalHighlights =
  isBusinessPro &&
  Array.isArray(business.storefront?.promotionalHighlights)
    ? business.storefront.promotionalHighlights
        .filter(
          (highlight) =>
            highlight &&
            typeof highlight.title === "string" &&
            highlight.title.trim()
        )
        .slice()
        .sort(
          (a, b) =>
            (a.sortOrder ?? 0) -
            (b.sortOrder ?? 0)
        )
        .slice(0, 6)
    : [];


  /*
   * ==========================================================
   * PAGE
   * ==========================================================
   */
  return (
    <div
      className="
        min-h-screen
        bg-[#F8F5F3]
        pb-14
        font-sans
        text-[#21191B]
      "
    >
      {/* ======================================================
          COVER
      ====================================================== */}
      <section


        className={`relative overflow-hidden ${
          isMinimal
            ? "h-28 sm:h-36 lg:h-40"
            : isModern
              ? "h-48 min-[400px]:h-56 sm:h-80 lg:h-96"
              : "h-40 min-[400px]:h-48 sm:h-60 lg:h-68"
        }`}


        style={{
          background: `linear-gradient(135deg, ${primaryColor}, ${accentColor})`,
        }}
      >
        {business.coverImage ? (
          <>
            <img
              src={
                business.coverImage
              }
              alt={`${business.businessName} cover`}
              className="
                h-full
                w-full
                object-cover
              "
            />
            <div
              className="
                absolute
                inset-0
                bg-linear-to-t
                from-black/50
                via-black/15
                to-black/10
              "
            />
          </>
        ) : (
          <div className="absolute inset-0">
            <div
              className="
                absolute
                -right-20
                -top-24
                h-72
                w-72
                rounded-full
                bg-white/10
              "
            />
            <div
              className="
                absolute
                -bottom-28
                left-1/4
                h-80
                w-80
                rounded-full
                bg-white/5
              "
            />
            <div
              className="
                absolute
                bottom-6
                right-[15%]
                hidden
                text-white/10
                sm:block
              "
            >
              <Store
                size={100}
              />
            </div>
          </div>
        )}
      </section>
      {/* ======================================================
          BUSINESS HEADER
      ====================================================== */}
      <section
        className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8"
      >
        <div  
        className={`relative overflow-hidden border border-[#E8DFDB] bg-white ${
          isModern
            ? "-mt-10 rounded-2xl shadow-[0_20px_55px_rgba(61,15,24,0.14)] sm:-mt-20 sm:rounded-3xl"
            : isMinimal
              ? "-mt-4 rounded-lg shadow-[0_4px_18px_rgba(61,15,24,0.05)] sm:-mt-7 sm:rounded-xl"
              : "-mt-8 rounded-xl shadow-[0_12px_36px_rgba(61,15,24,0.10)] sm:-mt-14 sm:rounded-2xl"
        }`}

        >
        <div
          className="h-1 w-full"
          style={{
            background: `linear-gradient(90deg, ${primaryColor}, ${accentColor}, ${secondaryColor})`,
          }}
        />
          <div
            className="
              p-4
              sm:p-6
            "
          >
            <div
              className={`flex min-w-0 flex-col ${
                isModern
                  ? "items-center gap-4 py-2 text-center sm:gap-6 sm:py-5"
                  : isMinimal
                    ? "gap-3 sm:flex-row sm:items-center sm:gap-4"
                    : "gap-4 sm:flex-row sm:items-start sm:gap-6"
              }`}
            >
              {/* LOGO */}
              <div
                className={`flex shrink-0 items-center justify-center overflow-hidden border-4 border-white bg-[#F4ECE9] ${
                  isModern
                    ? "h-24 w-24 rounded-2xl shadow-[0_12px_32px_rgba(61,15,24,0.18)] sm:h-32 sm:w-32 sm:rounded-3xl lg:h-36 lg:w-36"
                    : isMinimal
                      ? "h-14 w-14 rounded-lg shadow-sm sm:h-16 sm:w-16"
                      : "h-20 w-20 rounded-2xl shadow-[0_8px_24px_rgba(61,15,24,0.14)] sm:h-[104px] sm:w-[104px]"
                }`}



              >
                {business.logo ? (
                  <img
                    src={
                      business.logo
                    }
                    alt={
                      business.businessName
                    }
                    className="
                      h-full
                      w-full
                      object-cover
                    "
                  />
                ) : (
                  <Store
                    size={36}
                    className="
                      text-[#6B1D2C]
                    "
                  />
                )}
              </div>
              {/* DETAILS */}
              <div
                className="
                  min-w-0
                  flex-1
                "
              >
                <div
                  className="
                    flex
                    flex-wrap
                    items-center
                    gap-2
                  "
                >
                  <h1
                    style={{ color: primaryColor }}
                    className={`min-w-0 break-words font-black leading-tight tracking-tight ${
                      isModern
                        ? "text-2xl sm:text-4xl lg:text-[42px]"
                        : isMinimal
                          ? "text-xl leading-snug sm:text-2xl"
                          : "text-xl sm:text-[26px]"
                    }`}

                  >
                    {
                      business.businessName
                    }
                  </h1>
                  {/*
                   * Reusable Business badge.
                   *
                   * We are already on the storefront,
                   * so linkToStore is deliberately omitted.
                   */}
                   {business.storefront?.tier === "BUSINESS_PRO" && (
                      <span
                        className="rounded-full px-2.5 py-1 text-[9px] font-black"
                        style={{
                          backgroundColor: secondaryColor,
                          color: "#241515",
                        }}
                      >
                        BUSINESS PRO
                      </span>
                    )}
                  <BusinessBadge
                    business={
                      badgeBusiness
                    }
                    size="sm"
                    showVerified
                  />
                </div>
                {tagline && (
                  <p
                    className={`mt-2 font-semibold ${
                      isModern
                        ? "text-[15px] sm:text-[17px]"
                        : isMinimal
                        ? "text-[11px]"
                        : "text-[12px] sm:text-[13px]"
                    }`}
                    style={{ color: accentColor }}
                  >
                    {tagline}
                  </p>
                )}
                {business.category && (
                  <div
                    className="
                      mt-2
                      inline-flex
                      items-center
                      gap-1.5
                      text-[10px]
                      font-black
                      uppercase
                      tracking-[0.08em]
                      text-[#8B5E34]
                    "
                  >
                    <BriefcaseBusiness
                      size={12}
                    />
                    {
                      business.category
                    }
                  </div>
                )}

                {business.description && (
                  <p
                    className={`min-w-0 break-words text-gray-600 ${
                      isModern
                        ? "mx-auto mt-3 max-w-3xl text-[13px] leading-6 sm:mt-4 sm:text-sm sm:leading-7"
                        : isMinimal
                          ? "mt-2 max-w-2xl text-xs leading-6 sm:text-[13px]"
                          : "mt-3 max-w-3xl border-l-[3px] pl-3 text-[13px] leading-6 sm:mt-4 sm:pl-4 sm:text-sm"
                    }`}
                    style={
                      !isModern && !isMinimal
                        ? { borderLeftColor: secondaryColor }
                        : undefined
                    }
                  >
                    {business.description}
                  </p>
                )}

                {/* QUICK STATS */}
             
                <div
                  className={`flex min-w-0 flex-wrap ${
                    isModern
                      ? "mt-4 justify-center gap-2 sm:mt-5 sm:gap-3"
                      : isMinimal
                        ? "mt-3 gap-2"
                        : "mt-4 gap-2 sm:mt-5 sm:gap-3"
                  }`}
                >

                  <div
                    className="
                      min-w-25
                      rounded-xl
                      bg-[#F8F5F3]
                      px-3
                      py-2.5
                    "
                  >
                    <p
                      className="
                        text-[8px]
                        font-black
                        uppercase
                        tracking-widest
                        text-gray-400
                      "
                    >
                      Listings
                    </p>
                    <div
                      className="
                        mt-1
                        flex
                        items-center
                        gap-1.5
                      "
                    >
                      <Package
                        size={14}
                        className="
                          text-[#8A2638]
                        "
                      />
                      <p
                        className="
                          text-[15px]
                          font-black
                          text-[#3D0F18]
                        "
                      >
                        {business.activeListingCount ??
                          pagination.totalListings ??
                          0}
                      </p>
                    </div>
                  </div>
                  <div
                    className="
                      min-w-25
                      rounded-xl
                      bg-[#F8F5F3]
                      px-3
                      py-2.5
                    "
                  >
                    <p
                      className="
                        text-[8px]
                        font-black
                        uppercase
                        tracking-widest
                        text-gray-400
                      "
                    >
                      Status
                    </p>
                    <div
                      className="
                        mt-1
                        flex
                        items-center
                        gap-1.5
                        text-[11px]
                        font-black
                        text-emerald-700
                      "
                    >
                      <ShieldCheck
                        size={14}
                      />
                      Active
                    </div>
                  </div>
                </div>
              </div>
            </div>
            {/* ==================================================
                CONTACT INFORMATION
            ================================================== */}
            {(business.location ||
              business.phone ||
              business.email ||
              business.website) && (
            <div
              className={`grid min-w-0 grid-cols-1 border-t border-[#EEE6E2] ${
                isModern
                  ? "mt-5 gap-3 pt-5 sm:mt-7 sm:grid-cols-2 sm:gap-4 sm:pt-7 xl:grid-cols-4"
                  : isMinimal
                    ? "mt-4 gap-2 pt-4 sm:grid-cols-2 xl:grid-cols-4"
                    : "mt-5 gap-3 pt-5 sm:mt-6 sm:grid-cols-2 sm:pt-6 xl:grid-cols-4"
              }`}
            >
                {business.location && (
                  <div
                    className={`flex min-w-0 items-start gap-2.5 ${
                      isModern
                        ? "rounded-2xl bg-[#FAF8F7] p-4"
                        : isMinimal
                          ? "rounded-lg bg-[#FAF8F7] p-2.5"
                          : "rounded-xl border border-[#EEE6E2] bg-[#FAF8F7] p-4"
                    }`}
                  >
                    <MapPin
                      size={16}
                      className="
                        mt-0.5
                        shrink-0
                        text-[#6B1D2C]
                      "
                    />
                    <div className="min-w-0">
                      <p
                        className="
                          text-[8px]
                          font-black
                          uppercase
                          tracking-widest
                          text-gray-400
                        "
                      >
                        Location
                      </p>
                      <p
                        className="mt-1 break-words text-[11px] font-bold leading-5 text-gray-700"
                      >
                        {
                          business.location
                        }
                      </p>
                      {business.address && (
                        <p
                          className="
                            mt-0.5
                            text-[9px]
                            leading-4
                            text-gray-500
                          "
                        >
                          {
                            business.address
                          }
                        </p>
                      )}
                    </div>
                  </div>
                )}
                {business.phone && (
                  <a
                  href={`tel:${business.phone}`}
                  onClick={handlePhoneClick}

                    className={`flex items-start gap-2.5 transition-colors hover:bg-[#F3ECE9] ${
                      isModern
                        ? "rounded-2xl bg-[#FAF8F7] p-4"
                        : isMinimal
                          ? "rounded-lg bg-[#FAF8F7] p-2.5"
                          : "rounded-xl border border-[#EEE6E2] bg-[#FAF8F7] p-4 hover:border-[#D6B15E]"
                    }`}

                >
                  <Phone
                    size={16}
                    className="
                      mt-0.5
                      shrink-0
                      text-[#6B1D2C]
                    "
                  />
                  <div className="min-w-0">
                    <p
                      className="
                        text-[8px]
                        font-black
                        uppercase
                        tracking-widest
                        text-gray-400
                      "
                    >
                      Phone
                    </p>
                    <p
                      className="
                        mt-1
                        break-all
                        text-[11px]
                        font-bold
                        text-gray-700
                      "
                    >
                      {business.phone}
                    </p>
                  </div>
                </a>
                )}
                {business.email && (
                  <a
                    href={`mailto:${business.email}`}
                    onClick={handleEmailClick}
                   
                    className="flex min-w-0 items-start gap-2.5 rounded-xl bg-[#FAF8F7] p-3 transition hover:bg-[#F3ECE9] sm:p-4"

                  >
                    <Mail
                      size={16}
                      className="
                        mt-0.5
                        shrink-0
                        text-[#6B1D2C]
                      "
                    />
                    <div className="min-w-0">
                      <p
                        className="
                          text-[8px]
                          font-black
                          uppercase
                          tracking-widest
                          text-gray-400
                        "
                      >
                        Email
                      </p>
                      <p
                        className="
                          mt-1
                          break-all
                          text-[11px]
                          font-bold
                          text-gray-700
                        "
                      >
                        {business.email}
                      </p>
                    </div>
                  </a>
                )}
                {business.website && (
                  <a
                    href={business.website}
                    target="_blank"
                    rel="noreferrer"
                    onClick={handleWebsiteClick}
                    className="
                      flex
                      items-start
                      gap-2.5
                      rounded-xl
                      bg-[#FAF8F7]
                      p-3
                      transition
                      hover:bg-[#F3ECE9]
                    "
                  >
                    <Globe
                      size={16}
                      className="
                        mt-0.5
                        shrink-0
                        text-[#6B1D2C]
                      "
                    />
                    <div className="min-w-0">
                      <p
                        className="
                          text-[8px]
                          font-black
                          uppercase
                          tracking-widest
                          text-gray-400
                        "
                      >
                        Website
                      </p>
                      <p
                        className="
                          mt-1
                          flex
                          items-center
                          gap-1
                          text-[11px]
                          font-bold
                          text-[#6B1D2C]
                        "
                      >
                        Visit website
                        <ExternalLink
                          size={11}
                        />
                      </p>
                    </div>
                  </a>
                )}
              </div>
            )}
          </div>
        </div>
      </section>

      
  {/* ======================================================
      BUSINESS PRO — BUSINESS INTRODUCTION
  ====================================================== */}

    {isBusinessPro && businessIntroduction && (
      <section className="mx-auto mt-8 max-w-7xl px-4 sm:px-6 lg:px-8">
        <div
          className={`relative overflow-hidden border bg-white ${
            isModern
              ? "rounded-2xl border-[#E8DFDB] px-4 py-7 text-center shadow-[0_16px_45px_rgba(61,15,24,0.09)] sm:rounded-3xl sm:px-12 sm:py-14"
              : isMinimal
                ? "rounded-lg border-[#EEE6E2] p-4 shadow-none sm:p-6"
                : "rounded-xl border-[#E8DFDB] p-4 shadow-[0_8px_28px_rgba(61,15,24,0.06)] sm:rounded-2xl sm:p-8"


          }`}
        >
          <div
            className={`flex items-center gap-3 ${
              isModern
                ? "mb-6 justify-center"
                : "mb-4"
            }`}
          >

          <div
            className={`rounded-full ${
              isModern
                ? "h-10 w-1.5"
                : isMinimal
                  ? "h-7 w-1"
                  : "h-11 w-1.5"
            }`}
            style={{ backgroundColor: secondaryColor }}
          />


            <div>
              <p
                className="text-[10px] font-black uppercase tracking-[0.15em]"
                style={{ color: accentColor }}
              >
                Get to Know Us
              </p>


                <h2
                  className={`mt-1 font-black tracking-tight ${
                    isModern
                      ? "text-[26px] leading-tight sm:text-4xl"
                      : isMinimal
                         ? "text-lg font-bold leading-snug tracking-tight sm:text-[22px]"
                        : "text-xl sm:text-[26px]"
                  }`}

                  style={{ color: primaryColor }}
                >
                  About {business.businessName}
                </h2>

            </div>
          </div>

          <p
          className={`whitespace-pre-line wrap-break-word text-gray-600 ${
            isModern
              ? "mx-auto max-w-3xl text-[15px] leading-8 sm:text-[17px] sm:leading-9"
              : isMinimal
                ? "max-w-3xl text-sm leading-7"
                : "max-w-4xl text-sm leading-7 sm:text-[15px]"
          }`}
          >
            {businessIntroduction}
          </p>
        </div>
      </section>
    )}

    
    {/* ======================================================
        BUSINESS PRO — PROMOTIONAL HIGHLIGHTS
    ====================================================== */}

    {isBusinessPro && promotionalHighlights.length > 0 && (
      <section className="mx-auto mt-8 max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="mb-5">
          <div
            className="mb-2 flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.15em]"
            style={{ color: accentColor }}
          >
            <Sparkles size={15} />

            Why Choose Us
          </div>

          <h2
            className="text-xl font-black tracking-tight sm:text-2xl"
            style={{ color: primaryColor }}
          >
            What Makes Us Different
          </h2>

          <p className="mt-1 text-xs text-gray-500">
            Discover what {business.businessName} has to offer.
          </p>
        </div>

        <div
          className={`grid min-w-0 grid-cols-1 ${
            isModern
              ? "gap-4 sm:grid-cols-2 sm:gap-5 lg:grid-cols-3 lg:gap-6"
              : isMinimal
                ? "gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:gap-4"
                : "gap-3 sm:grid-cols-2 sm:gap-4 lg:grid-cols-3"
          }`}

        >
          {promotionalHighlights.map((highlight) => {
            const HighlightIcon =
              resolvePromotionalHighlightIcon(highlight.icon);

            return (
              <article
                key={highlight.id}
                className={`relative overflow-hidden border bg-white transition-all duration-300 ${
                  isModern
                    ? "rounded-3xl border-[#E8DFDB] px-6 py-9 text-center shadow-[0_10px_35px_rgba(61,15,24,0.08)] hover:-translate-y-1 hover:shadow-xl sm:px-8"
                    : isMinimal
                     ? "rounded-lg border-[#EEE6E2] p-4 shadow-none hover:border-[#D6B15E] sm:p-5"
                      : "rounded-2xl border-[#E8DFDB] p-6 shadow-sm hover:-translate-y-1 hover:border-[#D6B15E] hover:shadow-md"
                }`}
              >
                <div
                  className={`mb-4 flex ${
                    isModern ? "justify-center" : ""
                  }`}
                >
                  <div
                    className={`flex items-center justify-center ${
                      isModern
                        ? "h-14 w-14 rounded-2xl"
                        : isMinimal
                          ? "h-10 w-10 rounded-lg"
                          : "h-12 w-12 rounded-xl"
                    }`}
                    style={{
                      backgroundColor: `${primaryColor}12`,
                      color: primaryColor,
                    }}
                  >
                    <HighlightIcon size={23} strokeWidth={1.8} />
                  </div>
                </div>

                <h3                 
                className={`wrap-break-word font-black ${
                  isModern
                    ? "text-base leading-6 sm:text-lg"
                    : isMinimal
                       ? "text-sm font-semibold leading-5"
                      : "text-sm"
                }`}

                  style={{ color: primaryColor }}
                >
                  {highlight.title}
                </h3>

                {highlight.description && (                
                  <p
                    className={`mt-2 whitespace-pre-line wrap-break-word text-gray-600 ${
                      isModern
                        ? "text-[13px] leading-7"
                        : isMinimal
                          ? "text-xs leading-6"
                          : "text-xs leading-6"
                    }`}
                  >
                    {highlight.description}
                  </p>
                )}

                <div
                  className={`mt-5 h-1 w-10 rounded-full ${
                    isModern ? "mx-auto" : ""
                  }`}
                  style={{
                    backgroundColor: secondaryColor,
                  }}
                />
              </article>
            );
          })}
        </div>
      </section>
    )}


      
    {/* ======================================================
        BUSINESS PRO — FEATURED LISTINGS
    ====================================================== */}

    {business.storefront?.tier === "BUSINESS_PRO" &&
      featuredListings.length > 0 && (
        <section className="mx-auto mt-8 max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
            <div>
              <div
                className="mb-2 flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.15em]"
                style={{ color: accentColor }}
              >
                <Star
                  size={15}
                  fill={secondaryColor}
                  strokeWidth={2}
                />
                Business Pro Selection
              </div>

              <h2
                className="text-xl font-black tracking-tight sm:text-2xl"
                style={{ color: primaryColor }}
              >
                Featured Listings
              </h2>

              <p className="mt-1 text-xs text-gray-500">
                Handpicked items from {business.businessName}.
              </p>
            </div>

            <span className="rounded-full border border-amber-200 bg-amber-50 px-3 py-1.5 text-[10px] font-bold text-amber-800">
              {featuredListings.length} featured
            </span>
          </div>

          <div
          className={`grid min-w-0 grid-cols-1 ${
            isModern
              ? "gap-4 sm:grid-cols-2 sm:gap-6 lg:grid-cols-3 xl:gap-8"
              : isMinimal
                ? "gap-3 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4"
                : "gap-4 sm:grid-cols-2 sm:gap-5 lg:grid-cols-3"
          }`}


          >
            {featuredListings.map((listing, index) => {
              const image = getPrimaryImage(listing);

              const formattedValue = Number(
                listing.estimatedValue || 0
              ).toLocaleString("en-KE");

              return (
                <Link
                  key={listing.id}
                  to={`/listings/${listing.id}`}
                  className={`group flex h-full min-w-0 flex-col overflow-hidden border bg-white transition-all duration-300 ${
                    isModern
                      ? "rounded-3xl border-[#E8DFDB] shadow-[0_12px_36px_rgba(61,15,24,0.10)] hover:-translate-y-1.5 hover:border-[#D6B15E] hover:shadow-[0_20px_48px_rgba(61,15,24,0.16)]"
                      : isMinimal
                        ? "rounded-lg border-[#EEE6E2] shadow-none hover:border-[#D6B15E] hover:shadow-sm"
                        : "rounded-2xl border-[#E8DFDB] shadow-sm hover:-translate-y-1 hover:border-[#D6B15E] hover:shadow-md"
                  }`}
                >
                  <div
                    className={`relative overflow-hidden bg-[#F0E9E6] ${
                      isModern
                        ? "aspect-4/3 sm:aspect-5/4"
                        : isMinimal
                          ? "aspect-square" 
                          : "aspect-4/3"
                    }`}

                  >
                    {image ? (
                      <img
                        src={image}
                        alt={listing.title}
                        loading="lazy"
                        className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                      />
                    ) : (
                      <div className="flex h-full items-center justify-center">
                        <Package
                          size={36}
                          className="text-[#BDA8A0]"
                        />
                      </div>
                    )}

                    <span
                      className="absolute left-3 top-3 inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[10px] font-black shadow-sm"
                      style={{
                        backgroundColor: secondaryColor,
                        color: "#241515",
                      }}
                    >
                      <Star size={12} fill="currentColor" />
                      Featured #{index + 1}
                    </span>
                  </div>

                  <div
                    className={
                      isModern
                        ? "flex flex-1 flex-col p-5 sm:p-6 lg:p-7"
                        : isMinimal
                          ? "p-3 sm:p-4"
                          : "p-4 sm:p-5"
                    }
                  >
                    {listing.category?.name && (
                      <p
                        className="text-[9px] font-black uppercase tracking-wide"
                        style={{ color: accentColor }}
                      >
                        {listing.category.name}
                      </p>
                    )}

                    <h3 className="mt-1 line-clamp-2 text-sm font-black text-[#3D0F18] transition-colors group-hover:text-[#8A2638]">
                      {listing.title}
                    </h3>

                    <p className="mt-2 text-base font-black" style={{ color: primaryColor }}>
                      KES {formattedValue}
                    </p>

                    {listing.location && (
                      <p className="mt-2 flex items-center gap-1 text-[11px] text-gray-500">
                        <MapPin size={13} />
                        <span className="truncate">
                          {listing.location}
                        </span>
                      </p>
                    )}

                    <div className="mt-4 flex items-center justify-between border-t border-[#F0E9E6] pt-3">
                      <span className="text-[11px] font-semibold text-gray-600">
                        View listing
                      </span>

                      <span
                        className="flex h-8 w-8 items-center justify-center rounded-full text-white transition-transform group-hover:translate-x-1"
                        style={{ backgroundColor: primaryColor }}
                      >
                        <ChevronRight size={16} />
                      </span>
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        </section>
      )}

      {/* ======================================================
          LISTINGS
      ====================================================== */}
      <section
        className="
          mx-auto
          mt-8
          max-w-7xl
          px-4
          sm:px-6
          lg:px-8
        "
      >
        <div
          className="
            mb-4
            flex
            flex-wrap
            items-end
            justify-between
            gap-4
          "
        >
          <div>
            <p
              style={{ color: accentColor }}
              className="
                text-[9px]
                font-black
                uppercase
                tracking-[0.16em]
                text-[#9A5D37]
              "
            >
              Storefront
            </p>
            <h2
              style={{ color: primaryColor }}
              className="
                mt-1
                text-xl
                font-black
                tracking-tight
                text-[#3D0F18]
                sm:text-[22px]
              "
            >
              Available listings
            </h2>
            <p
              className="
                mt-1
                text-[11px]
                text-gray-500
                sm:text-[12px]
              "
            >
              Explore items offered
              by{" "}
              <span className="font-bold">
                {
                  business.businessName
                }
              </span>
              .
            </p>
          </div>
          <div
            className="
              flex
              items-center
              gap-1.5
              text-[10px]
              font-bold
              text-gray-500
            "
          >
            <Package
              size={15}
            />
            {
              pagination.totalListings
            }{" "}
            listing
            {pagination.totalListings ===
            1
              ? ""
              : "s"}
          </div>
        </div>
        {listingsLoading ? (
          <div
            className={`grid ${
              isModern
                ? "gap-6 sm:grid-cols-2 lg:grid-cols-3"
                : isMinimal
                  ? "gap-3 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 2xl:grid-cols-5"
                  : "gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4"
            }`}
          >
            {Array.from({
              length: 8,
            }).map(
              (_, index) => (
                <div
                  key={index}
                  className="
                    animate-pulse
                    overflow-hidden
                    rounded-xl
                    border
                    border-[#E8DFDB]
                    bg-white
                  "
                >
                  <div
                    className="
                      aspect-4/3
                      bg-[#E8DFDB]
                    "
                  />
                  <div className="p-3">
                    <div
                      className="
                        h-4
                        w-3/4
                        rounded
                        bg-[#E8DFDB]
                      "
                    />
                    <div
                      className="
                        mt-2
                        h-3
                        w-1/2
                        rounded
                        bg-[#E8DFDB]
                      "
                    />
                  </div>
                </div>
              )
            )}
          </div>
        ) : listings.length ===
          0 ? (
          <div
            className="
              rounded-2xl
              border
              border-dashed
              border-[#DCCBC5]
              bg-white
              px-6
              py-14
              text-center
            "
          >
            <Package
              size={40}
              className="
                mx-auto
                text-[#BDA8A0]
              "
            />
            <h3
              className="
                mt-3
                text-base
                font-black
                text-[#3D0F18]
              "
            >
              No active listings
            </h3>
            <p
              className="
                mx-auto
                mt-1.5
                max-w-md
                text-[11px]
                leading-5
                text-gray-500
              "
            >
              This business does
              not currently have
              any active listings.
            </p>
          </div>
        ) : (
          <div
            className="
              grid
              gap-4
              sm:grid-cols-2
              lg:grid-cols-3
              xl:grid-cols-4
            "
          >
            {listings.map(
              (listing) => {
                const image =
                  getPrimaryImage(
                    listing
                  );
                const formattedValue =
                  Number(
                    listing
                      ?.estimatedValue ||
                      0
                  ).toLocaleString();
                return (
                  <Link
                    key={
                      listing.id
                    }
                    to={`/listings/${listing.id}`}
                    
                    className={`group flex h-full min-w-0 flex-col overflow-hidden border bg-white transition-all duration-300 ${
                      isModern
                        ? "rounded-3xl border-[#E8DFDB] shadow-[0_10px_32px_rgba(61,15,24,0.09)] hover:-translate-y-1.5 hover:border-[#D6B15E] hover:shadow-[0_18px_44px_rgba(61,15,24,0.15)]"
                        : isMinimal
                          ? "rounded-lg border-[#EEE6E2] shadow-none hover:border-[#D6B15E] hover:shadow-sm"
                          : "rounded-xl border-[#E9E2E3] shadow-sm hover:-translate-y-1 hover:border-[#D6B15E] hover:shadow-md"
                    }`}


                  >
                    <div
                      className="
                        relative
                        aspect-4/3
                        overflow-hidden
                        bg-[#F0E9E6]
                      "
                    >
                      {image ? (
                        <img
                          src={image}
                          alt={
                            listing.title
                          }
                          loading="lazy"
                          className="
                            h-full
                            w-full
                            object-cover
                            transition-transform
                            duration-500
                            ease-out
                            group-hover:scale-105
                          "
                        />
                      ) : (
                        <div
                          className="
                            flex
                            h-full
                            items-center
                            justify-center
                          "
                        >
                          <Package
                            size={34}
                            className="
                              text-[#BDA8A0]
                            "
                          />
                        </div>
                      )}
                      {listing.condition && (
                        <span
                          className="
                            absolute
                            bottom-2
                            right-2
                            rounded-md
                            bg-black/60
                            px-2
                            py-1
                            text-[8px]
                            font-bold
                            capitalize
                            text-white
                            backdrop-blur-sm
                          "
                        >
                          {listing.condition
                            .replaceAll(
                              "_",
                              " "
                            )
                            .toLowerCase()}
                        </span>
                      )}
                    </div>
                    <div
                      className="
                        flex
                        flex-1
                        flex-col
                        p-3
                      "
                    >
                      {listing.category
                        ?.name && (
                        <p
                          className="
                            text-[8px]
                            font-black
                            uppercase
                            tracking-[0.08em]
                            text-[#8A2638]
                          "
                        >
                          {
                            listing
                              .category
                              .name
                          }
                        </p>
                      )}
                      <h3
                        className="
                          mt-1.5
                          line-clamp-1
                          text-[12px]
                          font-extrabold
                          leading-[1.1rem]
                          text-[#21191B]
                          transition-colors
                          group-hover:text-[#6D1D2D]
                          sm:text-[13px]
                        "
                      >
                        {
                          listing.title
                        }
                      </h3>
                      {listing.description && (
                        <p
                          className="
                            mt-1
                            line-clamp-2
                            min-h-8
                            text-[9px]
                            leading-4
                            text-gray-500
                            sm:text-[10px]
                          "
                        >
                          {
                            listing.description
                          }
                        </p>
                      )}
                      <div
                        className="
                          mt-auto
                          flex
                          items-end
                          justify-between
                          gap-2
                          border-t
                          border-[#F0E9EA]
                          pt-2.5
                        "
                      >
                        <div className="min-w-0">
                          <p
                            className="
                              text-[7px]
                              font-bold
                              uppercase
                              tracking-[0.08em]
                              text-gray-400
                            "
                          >
                            Barter value
                          </p>
                          <p
                            className="
                              mt-0.5
                              truncate
                              text-[12px]
                              font-black
                              leading-none
                              text-[#5B1725]
                              sm:text-[14px]
                            "
                          >
                            <span
                              className="
                                mr-1
                                text-[8px]
                                font-extrabold
                                text-[#8A2638]
                              "
                            >
                              KES
                            </span>
                            {
                              formattedValue
                            }
                          </p>
                        </div>
                        <span
                          className="
                            flex
                            h-6
                            w-6
                            shrink-0
                            items-center
                            justify-center
                            rounded-lg
                            bg-[#F5E8EB]
                            text-xs
                            font-black
                            text-[#5B1725]
                            transition-all
                            group-hover:bg-[#5B1725]
                            group-hover:text-white
                          "
                        >
                          →
                        </span>
                      </div>
                    </div>
                  </Link>
                );
              }
            )}
          </div>
        )}
        {/* ====================================================
            PAGINATION
        ==================================================== */}
        {pagination.totalPages >
          1 && (
          <div            
            className="mt-6 flex flex-wrap items-center justify-center gap-2 px-1 sm:mt-8"
          >
            <button
              type="button"
              disabled={
                !pagination.hasPreviousPage ||
                listingsLoading
              }
              onClick={() =>
                setPage(
                  (current) =>
                    Math.max(
                      current - 1,
                      1
                    )
                )
              }
              className="
                inline-flex
                items-center
                gap-1.5
                rounded-xl
                border
                border-[#DCCBC5]
                bg-white
                px-3
                py-2
                text-[10px]
                font-black
                text-[#3D0F18]
                transition
                hover:bg-[#F3ECE9]
                disabled:cursor-not-allowed
                disabled:opacity-40
              "
            >
              <ChevronLeft
                size={15}
              />
              Previous
            </button>
            <span
              className="
                rounded-xl
                bg-[#6B1D2C]
                px-3.5
                py-2
                text-[10px]
                font-black
                text-white
              "
            >
              {pagination.page} /{" "}
              {
                pagination.totalPages
              }
            </span>
            <button
              type="button"
              disabled={
                !pagination.hasNextPage ||
                listingsLoading
              }
              onClick={() =>
                setPage(
                  (current) =>
                    current + 1
                )
              }
              className="
                inline-flex
                items-center
                gap-1.5
                rounded-xl
                border
                border-[#DCCBC5]
                bg-white
                px-3
                py-2
                text-[10px]
                font-black
                text-[#3D0F18]
                transition
                hover:bg-[#F3ECE9]
                disabled:cursor-not-allowed
                disabled:opacity-40
              "
            >
              Next
              <ChevronRight
                size={15}
              />
            </button>
          </div>
        )}
      </section>
    </div>
  );
};
export default BusinessStorefront;