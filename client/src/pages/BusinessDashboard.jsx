import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  Link,
  useNavigate,
} from "react-router-dom";

import {
  AlertTriangle,
  ArrowRight,
  BriefcaseBusiness,
  CheckCircle2,
  ChevronRight,
  Crown,
  ExternalLink,
  Eye,
  Globe,
  Mail,
  MapPin,
  Package,
  Phone,
  RefreshCw,
  Settings,
  ShieldCheck,
  Store,
} from "lucide-react";

import { toast } from "react-toastify";

import {
  getMyBusiness,
  updateMyBusinessStatus,
} from "../api/business";

import {
  getMyListings,
} from "../api/listingApi";

import {
  useAuth,
} from "../context/AuthContext";

import BusinessBadge from "../components/business/BusinessBadge";
import PremiumBadge from "../components/PremiumBadge";

/*
 * ============================================================
 * BUSINESS DASHBOARD
 * ============================================================
 */

const BusinessDashboard = () => {
  const navigate = useNavigate();

  /*
   * Premium remains account-level state.
   * It does not come from BusinessProfile.
   */
  const {
    isPremium,
    premiumEndsAt,
  } = useAuth();

  const [business, setBusiness] =
    useState(null);

  const [listings, setListings] =
    useState([]);

  const [loading, setLoading] =
    useState(true);

  const [
    statusUpdating,
    setStatusUpdating,
  ] = useState(false);

  const [error, setError] =
    useState("");

  /*
   * ==========================================================
   * LOAD DASHBOARD
   * ==========================================================
   */

  const loadDashboard =
    useCallback(async () => {
      try {
        setLoading(true);
        setError("");

        const [
          businessResponse,
          listingsResponse,
        ] = await Promise.all([
          getMyBusiness(),
          getMyListings(),
        ]);

        /*
         * ------------------------------------------------------
         * BUSINESS
         * ------------------------------------------------------
         */

        const currentBusiness =
          businessResponse?.business ||
          null;

        if (
          !businessResponse?.isBusiness ||
          !currentBusiness
        ) {
          setBusiness(null);
          setListings([]);
          return;
        }

        setBusiness(
          currentBusiness
        );

        /*
         * ------------------------------------------------------
         * LISTINGS
         * ------------------------------------------------------
         *
         * Supports either:
         *
         * []
         *
         * or:
         *
         * {
         *   listings: []
         * }
         */

        const currentListings =
          Array.isArray(
            listingsResponse
          )
            ? listingsResponse
            : Array.isArray(
                  listingsResponse
                    ?.listings
                )
              ? listingsResponse
                  .listings
              : [];

        setListings(
          currentListings
        );
      } catch (err) {
        console.error(
          "LOAD BUSINESS DASHBOARD ERROR:",
          err
        );

        setError(
          err?.response?.data
            ?.message ||
            "Unable to load your Business Dashboard."
        );
      } finally {
        setLoading(false);
      }
    }, []);

  /*
   * ==========================================================
   * INITIAL LOAD
   * ==========================================================
   */

  useEffect(() => {
    loadDashboard();
  }, [loadDashboard]);

  /*
   * ==========================================================
   * LISTING IMAGE HELPER
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
   * LISTING SUMMARY
   * ==========================================================
   */

  const listingSummary =
    useMemo(() => {
      return {
        total:
          listings.length,
      };
    }, [listings]);

  /*
   * ==========================================================
   * RECENT LISTINGS
   * ==========================================================
   */

  const recentListings =
    useMemo(() => {
      return [...listings]
        .sort((a, b) => {
          const aDate =
            new Date(
              a.createdAt || 0
            ).getTime();

          const bDate =
            new Date(
              b.createdAt || 0
            ).getTime();

          return bDate - aDate;
        })
        .slice(0, 4);
    }, [listings]);

  /*
   * ==========================================================
   * PREMIUM EXPIRY
   * ==========================================================
   */

  const premiumExpiryLabel =
    useMemo(() => {
      if (
        !isPremium ||
        !premiumEndsAt
      ) {
        return null;
      }

      const date =
        new Date(
          premiumEndsAt
        );

      if (
        Number.isNaN(
          date.getTime()
        )
      ) {
        return null;
      }

      return date.toLocaleDateString(
        "en-KE",
        {
          day: "numeric",
          month: "short",
          year: "numeric",
        }
      );
    }, [
      isPremium,
      premiumEndsAt,
    ]);

  /*
   * ==========================================================
   * UPDATE BUSINESS STATUS
   * ==========================================================
   */

  const handleStatusChange =
    async () => {
      if (
        !business ||
        statusUpdating
      ) {
        return;
      }

      /*
       * Suspended businesses cannot
       * reactivate themselves.
       */
      if (
        business.status ===
        "SUSPENDED"
      ) {
        toast.error(
          "A suspended business cannot be reactivated from the dashboard."
        );

        return;
      }

      const nextStatus =
        business.status ===
        "ACTIVE"
          ? "CLOSED"
          : "ACTIVE";

      const confirmationMessage =
        nextStatus === "CLOSED"
          ? "Temporarily close your Business Storefront?"
          : "Reopen your Business Storefront?";

      const confirmed =
        window.confirm(
          confirmationMessage
        );

      if (!confirmed) {
        return;
      }

      try {
        setStatusUpdating(
          true
        );

        const response =
          await updateMyBusinessStatus(
            nextStatus
          );

        const updatedBusiness =
          response?.business ||
          null;

        /*
         * If the status endpoint returns
         * the complete business object,
         * use it immediately.
         */
        if (updatedBusiness) {
          setBusiness(
            updatedBusiness
          );
        } else {
          /*
           * Otherwise refresh from
           * /business/me.
           */
          const refreshed =
            await getMyBusiness();

          if (
            refreshed?.business
          ) {
            setBusiness(
              refreshed.business
            );
          }
        }

        toast.success(
          nextStatus ===
            "ACTIVE"
            ? "Business Storefront reopened."
            : "Business Storefront closed."
        );
      } catch (err) {
        console.error(
          "UPDATE BUSINESS STATUS ERROR:",
          err
        );

        toast.error(
          err?.response?.data
            ?.message ||
            "Unable to update business status."
        );
      } finally {
        setStatusUpdating(
          false
        );
      }
    };

  /*
   * ==========================================================
   * LOADING
   * ==========================================================
   */

  if (loading) {
    return (
      <div className="min-h-screen bg-[#F8F5F3] font-sans">
        <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
          <div className="animate-pulse">
            <div className="h-5 w-40 rounded bg-[#E8DFDB]" />

            <div className="mt-3 h-9 w-72 max-w-full rounded bg-[#E8DFDB]" />

            <div className="mt-8 h-48 rounded-2xl bg-white shadow-sm" />

            <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {Array.from({
                length: 4,
              }).map(
                (_, index) => (
                  <div
                    key={index}
                    className="h-32 rounded-2xl bg-white shadow-sm"
                  />
                )
              )}
            </div>

            <div className="mt-5 h-20 rounded-2xl bg-white shadow-sm" />

            <div className="mt-6 h-72 rounded-2xl bg-white shadow-sm" />
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

  if (error) {
    return (
      <div className="flex min-h-[70vh] items-center justify-center bg-[#F8F5F3] px-4 font-sans">
        <div className="w-full max-w-md rounded-2xl border border-[#E8DFDB] bg-white p-8 text-center shadow-sm">
          <AlertTriangle
            size={40}
            className="mx-auto text-[#8A2638]"
          />

          <h1 className="mt-4 text-xl font-black text-[#3D0F18]">
            Dashboard unavailable
          </h1>

          <p className="mt-2 text-sm leading-6 text-gray-500">
            {error}
          </p>

          <button
            type="button"
            onClick={
              loadDashboard
            }
            className="mt-6 inline-flex items-center gap-2 rounded-xl bg-[#5B1725] px-5 py-2.5 text-sm font-bold text-white transition hover:bg-[#46111C]"
          >
            <RefreshCw
              size={16}
            />

            Try again
          </button>
        </div>
      </div>
    );
  }

  /*
   * ==========================================================
   * NOT A BUSINESS ACCOUNT
   * ==========================================================
   */

  if (!business) {
    return (
      <div className="min-h-screen bg-[#F8F5F3] px-4 py-12 font-sans">
        <div className="mx-auto max-w-2xl rounded-2xl border border-[#E8DFDB] bg-white p-8 text-center shadow-sm sm:p-10">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-[#F5E8EB]">
            <BriefcaseBusiness
              size={30}
              className="text-[#5B1725]"
            />
          </div>

          <p className="mt-5 text-[10px] font-black uppercase tracking-[0.18em] text-[#9A5D37]">
            Business Accounts
          </p>

          <h1 className="mt-2 text-2xl font-black tracking-tight text-[#3D0F18]">
            Create your Business Account
          </h1>

          <p className="mx-auto mt-3 max-w-lg text-sm leading-6 text-gray-500">
            You need a Business
            Profile before you can
            access the Business
            Dashboard.
          </p>

          {/*
           * Keep this route if your
           * Business creation page uses:
           *
           * /business/create
           */}

          <Link
            to="/business/create"
            className="mt-7 inline-flex items-center gap-2 rounded-xl bg-[#5B1725] px-5 py-3 text-sm font-black text-white transition hover:bg-[#46111C]"
          >
            Create Business Account

            <ArrowRight
              size={16}
            />
          </Link>
        </div>
      </div>
    );
  }

  /*
   * ==========================================================
   * BUSINESS STATE
   * ==========================================================
   */

  const isActive =
    business.status ===
    "ACTIVE";

  const isClosed =
    business.status ===
    "CLOSED";

  const isSuspended =
    business.status ===
    "SUSPENDED";

  const isVerified =
    business.verificationStatus ===
      "VERIFIED" ||
    Boolean(
      business.isVerified
    );

  /*
   * IMPORTANT:
   *
   * The owner still owns a Business
   * Account when it is CLOSED or
   * SUSPENDED.
   *
   * Marketplace listing normalization
   * can hide Business presentation for
   * inactive businesses, but the owner
   * dashboard should still identify
   * this as a Business Account.
   */

  const businessBadgeData = {
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

    isVerified,
  };

  /*
   * ==========================================================
   * PAGE
   * ==========================================================
   */

  return (
    <div className="min-h-screen bg-[#F8F5F3] pb-16 font-sans">
      <main className="mx-auto max-w-7xl px-4 py-7 sm:px-6 lg:px-8">
        {/* ====================================================
            PAGE TITLE
        ==================================================== */}

        <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-[9px] font-black uppercase tracking-[0.18em] text-[#9A5D37]">
              Business Account
            </p>

            <h1 className="mt-1 text-2xl font-black tracking-tight text-[#3D0F18] sm:text-3xl">
              Business Dashboard
            </h1>

            <p className="mt-1 text-xs text-gray-500">
              Manage your Business
              presence on BarterTrade.
            </p>
          </div>

          {business.slug &&
            isActive && (
              <Link
                to={`/business/${business.slug}`}
                className="inline-flex items-center gap-2 rounded-xl border border-[#DCCBC5] bg-white px-4 py-2.5 text-xs font-black text-[#5B1725] transition hover:bg-[#F3ECE9]"
              >
                <Eye
                  size={15}
                />

                View Storefront

                <ExternalLink
                  size={13}
                />
              </Link>
            )}
        </div>

        {/* ====================================================
            BUSINESS HEADER
        ==================================================== */}

        <section className="overflow-hidden rounded-2xl border border-[#E8DFDB] bg-white shadow-sm">
          <div className="h-1 bg-gradient-to-r from-[#5B1725] via-[#8A2638] to-[#D6B15E]" />

          {business.coverImage && (
            <div className="relative h-28 overflow-hidden sm:h-36">
              <img
                src={
                  business.coverImage
                }
                alt={`${business.businessName} cover`}
                className="h-full w-full object-cover"
              />

              <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent" />
            </div>
          )}

          <div className="p-5 sm:p-6">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
              {/* LOGO */}

              <div className="flex h-20 w-20 shrink-0 items-center justify-center overflow-hidden rounded-2xl border border-[#E5D9D5] bg-[#F5ECE9] shadow-sm">
                {business.logo ? (
                  <img
                    src={
                      business.logo
                    }
                    alt={
                      business.businessName
                    }
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <Store
                    size={32}
                    className="text-[#6B1D2C]"
                  />
                )}
              </div>

              {/* BUSINESS IDENTITY */}

              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <h2 className="text-xl font-black tracking-tight text-[#3D0F18] sm:text-2xl">
                    {
                      business.businessName
                    }
                  </h2>

                  <div className="flex flex-wrap items-center gap-1.5">
                    <BusinessBadge
                      business={
                        businessBadgeData
                      }
                      size="sm"
                      showVerified
                    />

                    {isPremium && (
                      <PremiumBadge
                        size="sm"
                        compact
                      />
                    )}
                  </div>
                </div>

                {business.category && (
                  <p className="mt-1.5 text-[10px] font-black uppercase tracking-[0.08em] text-[#9A5D37]">
                    {
                      business.category
                    }
                  </p>
                )}

                {business.description && (
                  <p className="mt-3 max-w-3xl text-xs leading-5 text-gray-500">
                    {
                      business.description
                    }
                  </p>
                )}

                <div className="mt-4 flex flex-wrap gap-2">
                  {isActive && (
                    <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-2.5 py-1 text-[9px] font-black uppercase tracking-wide text-emerald-700">
                      <CheckCircle2
                        size={12}
                      />

                      Active
                    </span>
                  )}

                  {isClosed && (
                    <span className="inline-flex items-center gap-1.5 rounded-full bg-gray-100 px-2.5 py-1 text-[9px] font-black uppercase tracking-wide text-gray-600">
                      <Store
                        size={12}
                      />

                      Closed
                    </span>
                  )}

                  {isSuspended && (
                    <span className="inline-flex items-center gap-1.5 rounded-full bg-red-50 px-2.5 py-1 text-[9px] font-black uppercase tracking-wide text-red-700">
                      <AlertTriangle
                        size={12}
                      />

                      Suspended
                    </span>
                  )}
                </div>
              </div>

              {/* MANAGE */}

              <button
                type="button"
                onClick={() =>
                  navigate(
                    "/business/manage"
                  )
                }
                className="inline-flex shrink-0 items-center justify-center gap-2 rounded-xl border border-[#DCCBC5] bg-white px-4 py-2.5 text-xs font-black text-[#5B1725] transition hover:bg-[#F3ECE9]"
              >
                <Settings
                  size={15}
                />

                Manage Business
              </button>
            </div>
          </div>
        </section>

        {/* ====================================================
            OVERVIEW CARDS
        ==================================================== */}

        <section className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {/* LISTINGS */}

          <Link
            to="/my-listings"
            className="group rounded-2xl border border-[#E8DFDB] bg-white p-4 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
          >
            <div className="flex items-start justify-between">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#F5E8EB]">
                <Package
                  size={18}
                  className="text-[#5B1725]"
                />
              </div>

              <ChevronRight
                size={16}
                className="text-gray-300 transition group-hover:translate-x-0.5 group-hover:text-[#5B1725]"
              />
            </div>

            <p className="mt-4 text-[8px] font-black uppercase tracking-[0.12em] text-gray-400">
              My Listings
            </p>

            <p className="mt-1 text-2xl font-black text-[#3D0F18]">
              {
                listingSummary.total
              }
            </p>

            <p className="mt-1 text-[10px] text-gray-500">
              Manage your listings
            </p>
          </Link>

          {/* BUSINESS STATUS */}

          <div className="rounded-2xl border border-[#E8DFDB] bg-white p-4 shadow-sm">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#F5E8EB]">
              <Store
                size={18}
                className="text-[#5B1725]"
              />
            </div>

            <p className="mt-4 text-[8px] font-black uppercase tracking-[0.12em] text-gray-400">
              Business Status
            </p>

            <p
              className={`mt-1 text-lg font-black ${
                isActive
                  ? "text-emerald-700"
                  : isSuspended
                    ? "text-red-700"
                    : "text-gray-700"
              }`}
            >
              {
                business.status
              }
            </p>

            <p className="mt-1 text-[10px] text-gray-500">
              Storefront availability
            </p>
          </div>

          {/* VERIFICATION */}

          <div className="rounded-2xl border border-[#E8DFDB] bg-white p-4 shadow-sm">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#F5E8EB]">
              <ShieldCheck
                size={18}
                className="text-[#5B1725]"
              />
            </div>

            <p className="mt-4 text-[8px] font-black uppercase tracking-[0.12em] text-gray-400">
              Verification
            </p>

            <p
              className={`mt-1 text-lg font-black capitalize ${
                isVerified
                  ? "text-emerald-700"
                  : "text-[#3D0F18]"
              }`}
            >
              {isVerified
                ? "Verified"
                : (
                    business.verificationStatus ||
                    "UNVERIFIED"
                  )
                    .toLowerCase()
                    .replaceAll(
                      "_",
                      " "
                    )}
            </p>

            <p className="mt-1 text-[10px] text-gray-500">
              Business identity
            </p>
          </div>

          {/* PREMIUM PLAN */}

          <Link
            to={
              isPremium
                ? "/account/subscription"
                : "/premium"
            }
            className="group rounded-2xl border border-[#E8DFDB] bg-white p-4 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
          >
            <div className="flex items-start justify-between">
              <div
                className={`flex h-9 w-9 items-center justify-center rounded-xl ${
                  isPremium
                    ? "bg-amber-50"
                    : "bg-[#F5E8EB]"
                }`}
              >
                <Crown
                  size={18}
                  className={
                    isPremium
                      ? "text-amber-600"
                      : "text-[#5B1725]"
                  }
                />
              </div>

              <ChevronRight
                size={16}
                className="text-gray-300 transition group-hover:translate-x-0.5 group-hover:text-[#5B1725]"
              />
            </div>

            <p className="mt-4 text-[8px] font-black uppercase tracking-[0.12em] text-gray-400">
              Plan
            </p>

            <div className="mt-1 flex flex-wrap items-center gap-2">
              <p
                className={`text-lg font-black ${
                  isPremium
                    ? "text-amber-700"
                    : "text-[#3D0F18]"
                }`}
              >
                {isPremium
                  ? "Premium"
                  : "Free"}
              </p>

              {isPremium && (
                <PremiumBadge
                  size="sm"
                  compact
                />
              )}
            </div>

            <p className="mt-1 text-[10px] text-gray-500">
              {isPremium
                ? "Manage subscription"
                : "Upgrade your account"}
            </p>
          </Link>
        </section>

        {/* ====================================================
            PREMIUM BUSINESS ACCOUNT
        ==================================================== */}

        {isPremium && (
          <section className="mt-4 overflow-hidden rounded-2xl border border-amber-200/70 bg-gradient-to-r from-amber-50 to-white shadow-sm">
            <div className="flex flex-col gap-4 p-4 sm:flex-row sm:items-center sm:justify-between sm:p-5">
              <div className="flex items-start gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white shadow-sm">
                  <Crown
                    size={19}
                    className="text-amber-600"
                  />
                </div>

                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <h2 className="text-sm font-black text-[#3D0F18]">
                      Premium Business Account
                    </h2>

                    <PremiumBadge
                      size="sm"
                      compact
                    />
                  </div>

                  <p className="mt-1 text-[10px] leading-5 text-gray-500">
                    Your Business
                    Account is using
                    your active Premium
                    membership.
                  </p>

                  {premiumExpiryLabel && (
                    <p className="mt-1 text-[10px] font-bold text-amber-700">
                      Active until{" "}
                      {
                        premiumExpiryLabel
                      }
                    </p>
                  )}
                </div>
              </div>

              <Link
                to="/account/subscription"
                className="inline-flex shrink-0 items-center justify-center gap-2 rounded-xl border border-amber-200 bg-white px-4 py-2.5 text-[10px] font-black text-amber-800 transition hover:bg-amber-50"
              >
                Manage Subscription

                <ChevronRight
                  size={14}
                />
              </Link>
            </div>
          </section>
        )}

        {/* ====================================================
            MAIN CONTENT
        ==================================================== */}

        <div className="mt-5 grid gap-5 lg:grid-cols-[minmax(0,1.35fr)_minmax(280px,0.65fr)]">
          {/* RECENT LISTINGS */}

          <section className="rounded-2xl border border-[#E8DFDB] bg-white p-4 shadow-sm sm:p-5">
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="text-[9px] font-black uppercase tracking-[0.14em] text-[#9A5D37]">
                  Inventory
                </p>

                <h2 className="mt-1 text-lg font-black text-[#3D0F18]">
                  Recent Listings
                </h2>
              </div>

              <Link
                to="/my-listings"
                className="inline-flex items-center gap-1 text-[10px] font-black text-[#6B1D2C] hover:underline"
              >
                Manage all

                <ArrowRight
                  size={13}
                />
              </Link>
            </div>

            {recentListings.length ===
            0 ? (
              <div className="py-12 text-center">
                <Package
                  size={36}
                  className="mx-auto text-[#C7B6B0]"
                />

                <p className="mt-3 text-sm font-black text-[#3D0F18]">
                  No listings yet
                </p>

                <p className="mt-1 text-xs text-gray-500">
                  Create your first
                  listing to start
                  trading.
                </p>

                <Link
                  to="/listings/create"
                  className="mt-5 inline-flex items-center gap-2 rounded-xl bg-[#5B1725] px-4 py-2.5 text-xs font-black text-white transition hover:bg-[#46111C]"
                >
                  Create Listing

                  <ArrowRight
                    size={14}
                  />
                </Link>
              </div>
            ) : (
              <div className="mt-4 divide-y divide-[#F0E9E6]">
                {recentListings.map(
                  (listing) => {
                    const image =
                      getPrimaryImage(
                        listing
                      );

                    const rawValue =
                      Number(
                        listing
                          ?.estimatedValue ||
                          0
                      );

                    const value =
                      Number.isFinite(
                        rawValue
                      )
                        ? rawValue.toLocaleString(
                            "en-KE"
                          )
                        : "0";

                    return (
                      <Link
                        key={
                          listing.id
                        }
                        to={`/listings/${listing.id}/manage`}
                        className="group flex items-center gap-3 py-3 first:pt-0 last:pb-0"
                      >
                        <div className="flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-[#F2ECE9]">
                          {image ? (
                            <img
                              src={
                                image
                              }
                              alt={
                                listing.title
                              }
                              loading="lazy"
                              className="h-full w-full object-cover"
                            />
                          ) : (
                            <Package
                              size={22}
                              className="text-[#BDA8A0]"
                            />
                          )}
                        </div>

                        <div className="min-w-0 flex-1">
                          <p className="truncate text-xs font-black text-[#3D0F18] transition group-hover:text-[#6B1D2C]">
                            {
                              listing.title
                            }
                          </p>

                          {listing.category
                            ?.name && (
                            <p className="mt-0.5 truncate text-[9px] font-bold uppercase tracking-wide text-[#9A5D37]">
                              {
                                listing
                                  .category
                                  .name
                              }
                            </p>
                          )}

                          <p className="mt-1 text-[10px] font-black text-[#5B1725]">
                            KES {value}
                          </p>
                        </div>

                        <ChevronRight
                          size={16}
                          className="shrink-0 text-gray-300 transition group-hover:translate-x-0.5 group-hover:text-[#5B1725]"
                        />
                      </Link>
                    );
                  }
                )}
              </div>
            )}
          </section>

          {/* BUSINESS INFORMATION */}

          <section className="rounded-2xl border border-[#E8DFDB] bg-white p-4 shadow-sm sm:p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[9px] font-black uppercase tracking-[0.14em] text-[#9A5D37]">
                  Store Information
                </p>

                <h2 className="mt-1 text-lg font-black text-[#3D0F18]">
                  Business Details
                </h2>
              </div>

              <Settings
                size={17}
                className="text-[#8A2638]"
              />
            </div>

            <div className="mt-5 space-y-4">
              {business.location && (
                <DashboardInfoRow
                  icon={MapPin}
                  label="Location"
                  value={
                    business.location
                  }
                />
              )}

              {business.address && (
                <DashboardInfoRow
                  icon={MapPin}
                  label="Address"
                  value={
                    business.address
                  }
                />
              )}

              {business.phone && (
                <DashboardInfoRow
                  icon={Phone}
                  label="Phone"
                  value={
                    business.phone
                  }
                />
              )}

              {business.email && (
                <DashboardInfoRow
                  icon={Mail}
                  label="Email"
                  value={
                    business.email
                  }
                />
              )}

              {business.website && (
                <DashboardInfoRow
                  icon={Globe}
                  label="Website"
                  value={
                    business.website
                  }
                />
              )}

              {!business.location &&
                !business.address &&
                !business.phone &&
                !business.email &&
                !business.website && (
                  <p className="text-xs leading-5 text-gray-500">
                    No contact
                    information has
                    been added yet.
                  </p>
                )}
            </div>

            <button
              type="button"
              onClick={() =>
                navigate(
                  "/business/manage"
                )
              }
              className="mt-5 inline-flex w-full items-center justify-center gap-2 rounded-xl border border-[#DCCBC5] bg-[#FAF8F7] px-4 py-2.5 text-xs font-black text-[#5B1725] transition hover:bg-[#F3ECE9]"
            >
              <Settings
                size={14}
              />

              Edit Business Details
            </button>
          </section>
        </div>

        {/* ====================================================
            QUICK ACTIONS
        ==================================================== */}

        <section className="mt-5 rounded-2xl border border-[#E8DFDB] bg-white p-4 shadow-sm sm:p-5">
          <p className="text-[9px] font-black uppercase tracking-[0.14em] text-[#9A5D37]">
            Management
          </p>

          <h2 className="mt-1 text-lg font-black text-[#3D0F18]">
            Quick Actions
          </h2>

          <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <DashboardAction
              to="/listings/create"
              icon={Package}
              title="Create Listing"
              description="Add a new item"
            />

            <DashboardAction
              to="/my-listings"
              icon={BriefcaseBusiness}
              title="Manage Listings"
              description="Update your items"
            />

            {business.slug &&
              isActive && (
                <DashboardAction
                  to={`/business/${business.slug}`}
                  icon={Eye}
                  title="View Storefront"
                  description="See your public store"
                />
              )}

            <DashboardAction
              to={
                isPremium
                  ? "/account/subscription"
                  : "/premium"
              }
              icon={Crown}
              title={
                isPremium
                  ? "Premium"
                  : "Upgrade to Premium"
              }
              description={
                isPremium
                  ? "Manage your plan"
                  : "Unlock Premium benefits"
              }
            />
          </div>
        </section>

        {/* ====================================================
            BUSINESS STATUS MANAGEMENT
        ==================================================== */}

        <section className="mt-5 rounded-2xl border border-[#E8DFDB] bg-white p-4 shadow-sm sm:p-5">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-[9px] font-black uppercase tracking-[0.14em] text-[#9A5D37]">
                Business Status
              </p>

              <h2 className="mt-1 text-lg font-black text-[#3D0F18]">
                Storefront Availability
              </h2>

              <p className="mt-1 max-w-2xl text-xs leading-5 text-gray-500">
                {isActive &&
                  "Your Business Storefront is currently visible to marketplace users."}

                {isClosed &&
                  "Your Business Storefront is currently closed. You can reopen it whenever you are ready."}

                {isSuspended &&
                  "Your Business Account is currently suspended and cannot be reactivated from this dashboard."}
              </p>
            </div>

            {!isSuspended && (
              <button
                type="button"
                disabled={
                  statusUpdating
                }
                onClick={
                  handleStatusChange
                }
                className={`inline-flex shrink-0 items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-xs font-black transition disabled:cursor-not-allowed disabled:opacity-60 ${
                  isActive
                    ? "border border-red-200 bg-red-50 text-red-700 hover:bg-red-100"
                    : "bg-[#5B1725] text-white hover:bg-[#46111C]"
                }`}
              >
                {statusUpdating ? (
                  <>
                    <RefreshCw
                      size={14}
                      className="animate-spin"
                    />

                    Updating...
                  </>
                ) : isActive ? (
                  <>
                    <Store
                      size={14}
                    />

                    Close Storefront
                  </>
                ) : (
                  <>
                    <CheckCircle2
                      size={14}
                    />

                    Reopen Storefront
                  </>
                )}
              </button>
            )}
          </div>

          {isSuspended && (
            <div className="mt-4 flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 p-4">
              <AlertTriangle
                size={18}
                className="mt-0.5 shrink-0 text-red-600"
              />

              <div>
                <p className="text-xs font-black text-red-800">
                  Business suspended
                </p>

                <p className="mt-1 text-[11px] leading-5 text-red-700">
                  This status is
                  controlled by
                  BarterTrade. The
                  Business Account
                  cannot be
                  reactivated using
                  the storefront
                  controls.
                </p>
              </div>
            </div>
          )}
        </section>
      </main>
    </div>
  );
};

/*
 * ============================================================
 * INFORMATION ROW
 * ============================================================
 */

const DashboardInfoRow = ({
  icon: Icon,
  label,
  value,
}) => {
  return (
    <div className="flex items-start gap-3">
      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[#F5E8EB]">
        <Icon
          size={14}
          className="text-[#5B1725]"
        />
      </div>

      <div className="min-w-0">
        <p className="text-[8px] font-black uppercase tracking-[0.1em] text-gray-400">
          {label}
        </p>

        <p className="mt-0.5 break-words text-[11px] font-bold leading-5 text-gray-700">
          {value}
        </p>
      </div>
    </div>
  );
};

/*
 * ============================================================
 * QUICK ACTION
 * ============================================================
 */

const DashboardAction = ({
  to,
  icon: Icon,
  title,
  description,
}) => {
  return (
    <Link
      to={to}
      className="group flex items-center gap-3 rounded-xl border border-[#EEE6E2] bg-[#FAF8F7] p-3 transition hover:border-[#D9C7C1] hover:bg-[#F5EFEC]"
    >
      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-white shadow-sm">
        <Icon
          size={16}
          className="text-[#5B1725]"
        />
      </div>

      <div className="min-w-0 flex-1">
        <p className="text-[11px] font-black text-[#3D0F18]">
          {title}
        </p>

        <p className="mt-0.5 text-[9px] text-gray-500">
          {description}
        </p>
      </div>

      <ChevronRight
        size={14}
        className="text-gray-300 transition group-hover:translate-x-0.5 group-hover:text-[#5B1725]"
      />
    </Link>
  );
};

export default BusinessDashboard;