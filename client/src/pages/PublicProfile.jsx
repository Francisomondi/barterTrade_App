// CREATE — frontend/src/pages/PublicProfile.jsx

import {
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  Link,
  useNavigate,
  useParams,
} from "react-router-dom";

import {
  ArrowLeft,
  CalendarDays,
  ChevronRight,
  Crown,
  MapPin,
  Package,
  Phone,
  ShieldCheck,
  Star,
  Store,
  UserRound,
} from "lucide-react";

import {
  getPublicUserProfile,
} from "../api/userApi";

import PremiumBadge from "../components/PremiumBadge";

/**
 * ============================================================
 * HELPERS
 * ============================================================
 */

const formatMemberSince = (date) => {
  if (!date) {
    return "—";
  }

  try {
    return new Date(date).toLocaleDateString(
      "en-KE",
      {
        month: "short",
        year: "numeric",
      }
    );
  } catch {
    return "—";
  }
};

const formatListingDate = (date) => {
  if (!date) {
    return "";
  }

  try {
    return new Date(date).toLocaleDateString(
      "en-KE",
      {
        day: "numeric",
        month: "short",
        year: "numeric",
      }
    );
  } catch {
    return "";
  }
};

const formatValue = (value) => {
  const number = Number(value);

  if (!Number.isFinite(number) || number <= 0) {
    return null;
  }

  return new Intl.NumberFormat(
    "en-KE",
    {
      style: "currency",
      currency: "KES",
      maximumFractionDigits: 0,
    }
  ).format(number);
};

const getPrimaryImage = (listing) => {
  if (
    !Array.isArray(listing?.images) ||
    listing.images.length === 0
  ) {
    return null;
  }

  return (
    listing.images.find(
      (image) => image?.isPrimary
    )?.url ||
    listing.images[0]?.url ||
    null
  );
};

/**
 * ============================================================
 * PUBLIC PROFILE
 * ============================================================
 */

const PublicProfile = () => {
  const { userId } = useParams();

  const navigate = useNavigate();

  const [profile, setProfile] =
    useState(null);

  const [listings, setListings] =
    useState([]);

  const [loading, setLoading] =
    useState(true);

  const [error, setError] =
    useState("");

  /**
   * ==========================================================
   * LOAD PUBLIC PROFILE
   * ==========================================================
   */

  useEffect(() => {
    let cancelled = false;

    const loadProfile = async () => {
      if (!userId) {
        setError(
          "This trader profile is unavailable."
        );

        setLoading(false);

        return;
      }

      try {
        setLoading(true);
        setError("");

        const response =
          await getPublicUserProfile(
            userId
          );

        if (cancelled) {
          return;
        }

        /**
         * ====================================================
         * BUSINESS ACCOUNT
         * ====================================================
         *
         * ACTIVE businesses should use their public storefront,
         * not their personal public profile.
         */

        if (
          response?.profileType ===
            "BUSINESS" &&
          response?.redirectToBusiness &&
          response?.business?.slug
        ) {
          navigate(
            `/business/${response.business.slug}`,
            {
              replace: true,
            }
          );

          return;
        }

        /**
         * ====================================================
         * PERSONAL PROFILE
         * ====================================================
         */

        if (
          response?.profileType !==
            "PERSONAL" ||
          !response?.user
        ) {
          throw new Error(
            "This trader profile is unavailable."
          );
        }

        setProfile(response.user);

        setListings(
          Array.isArray(response.listings)
            ? response.listings
            : []
        );
      } catch (err) {
        if (cancelled) {
          return;
        }

        console.error(
          "Load public profile error:",
          err
        );

        setError(
          err?.response?.data?.message ||
            err?.message ||
            "Unable to load this trader profile."
        );

        setProfile(null);
        setListings([]);
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    loadProfile();

    return () => {
      cancelled = true;
    };
  }, [
    userId,
    navigate,
  ]);

  /**
   * ==========================================================
   * DERIVED PROFILE VALUES
   * ==========================================================
   */

  const firstLetter = useMemo(
    () =>
      profile?.name
        ?.charAt(0)
        ?.toUpperCase() || "U",
    [profile?.name]
  );

  const barterScore = Number(
    profile?.barterScore || 0
  );

  const averageRating = Number(
    profile?.averageRating || 0
  );

  const totalRatings = Number(
    profile?.totalRatings || 0
  );

  const completedTrades = Number(
    profile?.completedTrades || 0
  );

  const activeListingCount = Number(
    profile?.activeListingCount ||
      listings.length ||
      0
  );

  const ratingStars = Math.min(
    5,
    Math.max(
      0,
      Math.round(averageRating)
    )
  );

  /**
   * ==========================================================
   * LOADING
   * ==========================================================
   */

  if (loading) {
    return (
      <div className="min-h-screen bg-[#F8F5F3] px-4 py-10 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-6xl">
          <div className="flex min-h-[65vh] items-center justify-center rounded-3xl border border-[#E7DDDF] bg-white shadow-sm">
            <div className="text-center">
              <div className="mx-auto h-10 w-10 animate-spin rounded-full border-4 border-[#E7DDDF] border-t-[#5B1725]" />

              <p className="mt-4 text-sm font-semibold text-gray-500">
                Loading trader profile...
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  /**
   * ==========================================================
   * ERROR
   * ==========================================================
   */

  if (error || !profile) {
    return (
      <div className="min-h-screen bg-[#F8F5F3] px-4 py-10 sm:px-6 lg:px-8">
        <div className="mx-auto flex min-h-[65vh] max-w-6xl items-center justify-center">
          <div className="w-full max-w-lg rounded-3xl border border-[#E7DDDF] bg-white p-8 text-center shadow-sm">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-[#F5E8EB] text-[#5B1725]">
              <UserRound
                size={30}
              />
            </div>

            <h1 className="mt-5 text-2xl font-black text-[#21191B]">
              Profile unavailable
            </h1>

            <p className="mt-2 text-sm leading-6 text-gray-500">
              {error ||
                "This trader profile could not be found."}
            </p>

            <Link
              to="/marketplace"
              className="mt-6 inline-flex items-center justify-center gap-2 rounded-xl bg-[#5B1725] px-5 py-3 text-sm font-bold text-white transition hover:bg-[#3D0F18]"
            >
              <ArrowLeft
                size={17}
              />

              Back to Marketplace
            </Link>
          </div>
        </div>
      </div>
    );
  }

  /**
   * ==========================================================
   * PROFILE
   * ==========================================================
   */

  return (
    <div className="min-h-screen bg-[#F8F5F3]">
      <main className="mx-auto w-full max-w-6xl px-4 py-6 sm:px-6 sm:py-8 lg:px-8 lg:py-10">
        {/* ====================================================
            BREADCRUMB / BACK
        ==================================================== */}

        <div className="mb-5">
          <Link
            to="/marketplace"
            className="inline-flex items-center gap-2 text-sm font-bold text-[#5B1725] transition hover:text-[#8A2638]"
          >
            <ArrowLeft
              size={17}
            />

            Marketplace
          </Link>
        </div>

        {/* ====================================================
            PROFILE HERO
        ==================================================== */}

        <section className="overflow-hidden rounded-3xl border border-[#E7DDDF] bg-white shadow-sm">
          {/* Cover */}

          <div className="relative h-36 overflow-hidden bg-[#3D0F18] sm:h-44 lg:h-48">
            <div className="absolute -right-20 -top-24 h-72 w-72 rounded-full bg-[#8A2638]/50 blur-3xl" />

            <div className="absolute -bottom-32 left-[30%] h-72 w-72 rounded-full bg-[#DCAEB7]/10 blur-3xl" />

            <div className="absolute right-[18%] top-8 h-20 w-20 rounded-full border border-white/10 bg-white/5" />

            <div className="absolute bottom-7 left-[10%] h-12 w-12 rounded-full border border-white/10 bg-white/5" />

            <div className="absolute bottom-0 left-0 h-px w-full bg-white/10" />
          </div>

          <div className="relative px-5 pb-7 sm:px-8 sm:pb-8">
            <div className="-mt-14 flex flex-col gap-5 sm:-mt-16 sm:flex-row sm:items-end sm:justify-between">
              {/* Avatar */}

              <div className="relative shrink-0">
                <div className="flex h-28 w-28 items-center justify-center overflow-hidden rounded-[2rem] border-[5px] border-white bg-[#F4E7EA] text-4xl font-black text-[#5B1725] shadow-xl sm:h-32 sm:w-32 sm:text-5xl">
                  {profile.avatar ? (
                    <img
                      src={
                        profile.avatar
                      }
                      alt={
                        profile.name ||
                        "Trader"
                      }
                      className="h-full w-full object-cover"
                      onError={(
                        event
                      ) => {
                        event.currentTarget.style.display =
                          "none";

                        const parent =
                          event
                            .currentTarget
                            .parentElement;

                        if (parent) {
                          parent.textContent =
                            firstLetter;
                        }
                      }}
                    />
                  ) : (
                    firstLetter
                  )}
                </div>

                <span
                  className="absolute bottom-2 right-2 h-5 w-5 rounded-full border-4 border-white bg-green-500"
                  title="Active trader"
                />
              </div>

              {/* Type */}

              <div className="flex flex-wrap items-center gap-2 pb-1">
                <span className="inline-flex items-center gap-1.5 rounded-full bg-[#F5E8EB] px-3 py-1.5 text-xs font-bold text-[#5B1725]">
                  <UserRound
                    size={14}
                  />

                  Personal Trader
                </span>

                <span className="inline-flex items-center gap-1.5 rounded-full bg-green-50 px-3 py-1.5 text-xs font-bold text-green-700">
                  <ShieldCheck
                    size={14}
                  />

                  Active
                </span>
              </div>
            </div>

            {/* Identity */}

            <div className="mt-5">
              <div className="flex flex-wrap items-center gap-2.5">
                <h1 className="text-2xl font-black tracking-tight text-[#21191B] sm:text-3xl">
                  {profile.name ||
                    "BarterConnect User"}
                </h1>

                {profile.isPremium && (
                  <PremiumBadge
                    size="lg"
                  />
                )}
              </div>

              {/* Location */}

              {profile.location && (
                <div className="mt-3 flex items-center gap-2 text-sm font-medium text-gray-500">
                  <MapPin
                    size={17}
                    className="shrink-0 text-[#8A2638]"
                  />

                  <span>
                    {
                      profile.location
                    }
                  </span>
                </div>
              )}

              {/* Bio */}

              {profile.bio ? (
                <p className="mt-4 max-w-3xl text-sm leading-7 text-gray-600">
                  {profile.bio}
                </p>
              ) : (
                <p className="mt-4 max-w-3xl text-sm italic leading-7 text-gray-400">
                  This trader has not
                  added a bio yet.
                </p>
              )}

              {/* Actions */}

              <div className="mt-6 flex flex-wrap gap-3">
                {profile.phone && (
                  <a
                    href={`tel:${profile.phone}`}
                    className="inline-flex items-center gap-2 rounded-xl bg-[#5B1725] px-5 py-3 text-sm font-bold text-white shadow-sm transition hover:-translate-y-0.5 hover:bg-[#3D0F18]"
                  >
                    <Phone
                      size={18}
                    />

                    Call Seller
                  </a>
                )}

                <Link
                  to="/marketplace"
                  className="inline-flex items-center gap-2 rounded-xl border border-[#E7DDDF] bg-white px-5 py-3 text-sm font-bold text-[#5B1725] shadow-sm transition hover:-translate-y-0.5 hover:bg-[#FBF5F6]"
                >
                  <Store
                    size={18}
                  />

                  Browse Marketplace
                </Link>
              </div>
            </div>
          </div>
        </section>

        {/* ====================================================
            REPUTATION STATS
        ==================================================== */}

        <section className="mt-5 grid grid-cols-2 overflow-hidden rounded-2xl border border-[#E7DDDF] bg-white shadow-sm lg:grid-cols-4">
          {/* Barter Score */}

          <div className="border-b border-r border-[#E7DDDF] p-5 lg:border-b-0">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#F8EED5]">
                <Star
                  size={19}
                  className="text-amber-600"
                />
              </div>

              <div>
                <p className="text-2xl font-black text-[#5B1725]">
                  {barterScore.toFixed(
                    1
                  )}
                </p>

                <p className="text-xs font-medium text-gray-500">
                  Barter Score
                </p>
              </div>
            </div>
          </div>

          {/* Rating */}

          <div className="border-b border-[#E7DDDF] p-5 lg:border-b-0 lg:border-r">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#F8EED5] text-lg">
                ⭐
              </div>

              <div>
                <p className="text-2xl font-black text-[#5B1725]">
                  {averageRating.toFixed(
                    1
                  )}
                </p>

                <p className="text-xs font-medium text-gray-500">
                  {totalRatings}{" "}
                  {totalRatings === 1
                    ? "rating"
                    : "ratings"}
                </p>
              </div>
            </div>
          </div>

          {/* Trades */}

          <div className="border-r border-[#E7DDDF] p-5">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#F5E8EB] text-lg">
                🤝
              </div>

              <div>
                <p className="text-2xl font-black text-[#5B1725]">
                  {
                    completedTrades
                  }
                </p>

                <p className="text-xs font-medium text-gray-500">
                  Completed trades
                </p>
              </div>
            </div>
          </div>

          {/* Listings */}

          <div className="p-5">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#F5E8EB]">
                <Package
                  size={19}
                  className="text-[#5B1725]"
                />
              </div>

              <div>
                <p className="text-2xl font-black text-[#5B1725]">
                  {
                    activeListingCount
                  }
                </p>

                <p className="text-xs font-medium text-gray-500">
                  Active listings
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* ====================================================
            MAIN CONTENT
        ==================================================== */}

        <div className="mt-5 grid gap-5 lg:grid-cols-[1fr_300px]">
          {/* ==================================================
              ACTIVE LISTINGS
          ================================================== */}

          <section className="overflow-hidden rounded-3xl border border-[#E7DDDF] bg-white shadow-sm">
            <div className="border-b border-[#E7DDDF] bg-[#FBF5F6] px-5 py-6 sm:px-7">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="text-xs font-bold uppercase tracking-[0.16em] text-[#8A2638]">
                    Marketplace
                  </p>

                  <h2 className="mt-1 text-xl font-black text-[#21191B] sm:text-2xl">
                    Seller Listings
                  </h2>

                  <p className="mt-1 text-sm leading-6 text-gray-500">
                    Items currently
                    available for barter
                    from this trader.
                  </p>
                </div>

                <div className="rounded-full bg-white px-4 py-2 text-xs font-bold text-[#5B1725] shadow-sm">
                  {
                    activeListingCount
                  }{" "}
                  active
                </div>
              </div>
            </div>

            <div className="p-5 sm:p-7">
              {listings.length ===
              0 ? (
                <div className="rounded-2xl border border-[#EEE5E7] bg-[#FBF8F8] p-8 text-center">
                  <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-[#F5E8EB]">
                    <Package
                      size={25}
                      className="text-[#5B1725]"
                    />
                  </div>

                  <h3 className="mt-4 text-lg font-black text-[#21191B]">
                    No active listings
                  </h3>

                  <p className="mx-auto mt-2 max-w-lg text-sm leading-6 text-gray-500">
                    This trader does not
                    currently have any
                    active items listed
                    for barter.
                  </p>

                  <Link
                    to="/marketplace"
                    className="mt-5 inline-flex rounded-xl bg-[#5B1725] px-5 py-3 text-sm font-bold text-white transition hover:bg-[#3D0F18]"
                  >
                    Browse Marketplace
                  </Link>
                </div>
              ) : (
                <div className="grid gap-4 sm:grid-cols-2">
                  {listings.map(
                    (listing) => {
                      const image =
                        getPrimaryImage(
                          listing
                        );

                      const value =
                        formatValue(
                          listing.estimatedValue
                        );

                      return (
                        <Link
                          key={
                            listing.id
                          }
                          to={`/listings/${listing.id}`}
                          className="group overflow-hidden rounded-2xl border border-[#EEE5E7] bg-white transition hover:-translate-y-0.5 hover:border-[#D9C0C6] hover:shadow-md"
                        >
                          {/* Image */}

                          <div className="relative aspect-[4/3] overflow-hidden bg-[#F4EEEE]">
                            {image ? (
                              <img
                                src={
                                  image
                                }
                                alt={
                                  listing.title ||
                                  "Listing"
                                }
                                className="h-full w-full object-cover transition duration-300 group-hover:scale-[1.03]"
                              />
                            ) : (
                              <div className="flex h-full w-full items-center justify-center">
                                <Package
                                  size={
                                    36
                                  }
                                  className="text-[#B69CA2]"
                                />
                              </div>
                            )}

                            {listing.condition && (
                              <span className="absolute left-3 top-3 rounded-full bg-white/95 px-3 py-1.5 text-[10px] font-bold uppercase tracking-wide text-[#5B1725] shadow-sm">
                                {
                                  listing.condition
                                }
                              </span>
                            )}
                          </div>

                          {/* Details */}

                          <div className="p-4">
                            {listing
                              ?.category
                              ?.name && (
                              <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-[#8A2638]">
                                {
                                  listing
                                    .category
                                    .name
                                }
                              </p>
                            )}

                            <h3 className="mt-1 line-clamp-2 text-base font-black leading-6 text-[#21191B]">
                              {listing.title ||
                                "Untitled listing"}
                            </h3>

                            {listing.description && (
                              <p className="mt-2 line-clamp-2 text-xs leading-5 text-gray-500">
                                {
                                  listing.description
                                }
                              </p>
                            )}

                            <div className="mt-4 flex items-end justify-between gap-3 border-t border-[#F0E8EA] pt-3">
                              <div>
                                {value && (
                                  <>
                                    <p className="text-[10px] font-bold uppercase tracking-wide text-gray-400">
                                      Est.
                                      value
                                    </p>

                                    <p className="mt-0.5 text-sm font-black text-[#5B1725]">
                                      {
                                        value
                                      }
                                    </p>
                                  </>
                                )}

                                {!value &&
                                  listing.createdAt && (
                                    <p className="text-xs text-gray-400">
                                      Listed{" "}
                                      {formatListingDate(
                                        listing.createdAt
                                      )}
                                    </p>
                                  )}
                              </div>

                              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[#F5E8EB] text-[#5B1725] transition group-hover:bg-[#5B1725] group-hover:text-white">
                                <ChevronRight
                                  size={
                                    18
                                  }
                                />
                              </span>
                            </div>
                          </div>
                        </Link>
                      );
                    }
                  )}
                </div>
              )}

              {activeListingCount >
                listings.length &&
                listings.length >
                  0 && (
                  <div className="mt-5 rounded-xl bg-[#FBF8F8] px-4 py-3">
                    <p className="text-center text-xs font-medium leading-5 text-gray-500">
                      Showing the
                      seller's latest{" "}
                      {
                        listings.length
                      }{" "}
                      active listings.
                    </p>
                  </div>
                )}
            </div>
          </section>

          {/* ==================================================
              SELLER INFORMATION
          ================================================== */}

          <aside className="space-y-5">
            {/* Contact */}

            <section className="rounded-3xl border border-[#E7DDDF] bg-white p-5 shadow-sm">
              <p className="text-xs font-bold uppercase tracking-[0.16em] text-[#8A2638]">
                Contact
              </p>

              <h2 className="mt-1 text-xl font-black text-[#21191B]">
                Contact Seller
              </h2>

              <p className="mt-2 text-xs leading-5 text-gray-500">
                Contact this trader
                directly about their
                listed items.
              </p>

              {profile.phone ? (
                <div className="mt-5">
                  <div className="rounded-2xl border border-[#EEE5E7] bg-[#FBF8F8] p-4">
                    <div className="flex items-start gap-3">
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white text-[#5B1725] shadow-sm">
                        <Phone
                          size={18}
                        />
                      </div>

                      <div className="min-w-0">
                        <p className="text-[10px] font-bold uppercase tracking-wide text-gray-400">
                          Phone
                        </p>

                        <a
                          href={`tel:${profile.phone}`}
                          className="mt-1 block break-all text-sm font-black text-[#21191B] transition hover:text-[#8A2638]"
                        >
                          {
                            profile.phone
                          }
                        </a>
                      </div>
                    </div>
                  </div>

                  <a
                    href={`tel:${profile.phone}`}
                    className="mt-3 flex w-full items-center justify-center gap-2 rounded-xl bg-[#5B1725] px-4 py-3 text-sm font-bold text-white transition hover:bg-[#3D0F18]"
                  >
                    <Phone
                      size={17}
                    />

                    Call Seller
                  </a>
                </div>
              ) : (
                <div className="mt-5 rounded-2xl bg-[#FBF8F8] p-4">
                  <p className="text-sm leading-6 text-gray-500">
                    This seller has not
                    added a public phone
                    number.
                  </p>
                </div>
              )}
            </section>

            {/* Reputation */}

            <section className="rounded-3xl border border-[#E7DDDF] bg-white p-5 shadow-sm">
              <p className="text-xs font-bold uppercase tracking-[0.16em] text-[#8A2638]">
                Reputation
              </p>

              <h2 className="mt-1 text-xl font-black text-[#21191B]">
                Trader Reputation
              </h2>

              <div className="mt-5">
                <div className="flex items-end gap-2">
                  <span className="text-4xl font-black text-[#5B1725]">
                    {averageRating.toFixed(
                      1
                    )}
                  </span>

                  <span className="pb-1 text-sm font-semibold text-gray-400">
                    / 5
                  </span>
                </div>

                <div
                  className="mt-2 flex items-center gap-0.5"
                  aria-label={`${averageRating.toFixed(
                    1
                  )} out of 5`}
                >
                  {[
                    1, 2, 3, 4, 5,
                  ].map((star) => (
                    <span
                      key={star}
                      className={`text-xl ${
                        star <=
                        ratingStars
                          ? "text-yellow-500"
                          : "text-gray-300"
                      }`}
                    >
                      ★
                    </span>
                  ))}
                </div>

                <p className="mt-3 text-xs leading-5 text-gray-500">
                  Based on{" "}
                  <strong className="text-[#21191B]">
                    {totalRatings}
                  </strong>{" "}
                  completed trade{" "}
                  {totalRatings === 1
                    ? "rating"
                    : "ratings"}
                  .
                </p>
              </div>
            </section>

            {/* Member information */}

            <section className="rounded-3xl border border-[#E7DDDF] bg-white p-5 shadow-sm">
              <p className="text-xs font-bold uppercase tracking-[0.16em] text-[#8A2638]">
                Trader
              </p>

              <h2 className="mt-1 text-xl font-black text-[#21191B]">
                Member Details
              </h2>

              <div className="mt-5 space-y-3">
                <div className="flex items-center gap-3 rounded-xl bg-[#FBF8F8] px-4 py-3">
                  <CalendarDays
                    size={18}
                    className="shrink-0 text-[#8A2638]"
                  />

                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-wide text-gray-400">
                      Member since
                    </p>

                    <p className="mt-0.5 text-sm font-bold text-[#21191B]">
                      {formatMemberSince(
                        profile.createdAt
                      )}
                    </p>
                  </div>
                </div>

                {profile.location && (
                  <div className="flex items-center gap-3 rounded-xl bg-[#FBF8F8] px-4 py-3">
                    <MapPin
                      size={18}
                      className="shrink-0 text-[#8A2638]"
                    />

                    <div className="min-w-0">
                      <p className="text-[10px] font-bold uppercase tracking-wide text-gray-400">
                        Location
                      </p>

                      <p className="mt-0.5 break-words text-sm font-bold text-[#21191B]">
                        {
                          profile.location
                        }
                      </p>
                    </div>
                  </div>
                )}

                {profile.isPremium && (
                  <div className="flex items-center gap-3 rounded-xl bg-amber-50 px-4 py-3">
                    <Crown
                      size={18}
                      className="shrink-0 text-amber-600"
                    />

                    <div>
                      <p className="text-[10px] font-bold uppercase tracking-wide text-amber-700">
                        Membership
                      </p>

                      <p className="mt-0.5 text-sm font-bold text-[#21191B]">
                        Premium Trader
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </section>

            {/* Safety */}

            <section className="rounded-3xl border border-[#E7DDDF] bg-[#3D0F18] p-5 text-white shadow-sm">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/10">
                <ShieldCheck
                  size={20}
                />
              </div>

              <h2 className="mt-4 text-lg font-black">
                Trade Safely
              </h2>

              <p className="mt-2 text-xs leading-6 text-white/70">
                Review the item
                carefully and keep
                important trade actions
                inside BarterConnect.
              </p>
            </section>
          </aside>
        </div>
      </main>
    </div>
  );
};

export default PublicProfile;