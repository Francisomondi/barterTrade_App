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
  Trophy,
} from "lucide-react";

import {
  getPublicUserProfile,
} from "../api/userApi";

import PremiumBadge from "../components/PremiumBadge";

/*
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

  if (
    !Number.isFinite(number) ||
    number <= 0
  ) {
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

/*
 * ============================================================
 * STAT CARD
 * ============================================================
 */

const StatCard = ({
  icon,
  value,
  label,
}) => {
  return (
    <div className="flex min-w-0 items-center gap-3 p-4 sm:p-5">
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#F7ECEE] text-[#5B1725]">
        {icon}
      </div>

      <div className="min-w-0">
        <p className="truncate text-xl font-black text-[#21191B] sm:text-2xl">
          {value}
        </p>

        <p className="mt-0.5 text-[11px] font-semibold text-gray-500">
          {label}
        </p>
      </div>
    </div>
  );
};

/*
 * ============================================================
 * INFORMATION ROW
 * ============================================================
 */

const InfoRow = ({
  icon,
  label,
  children,
}) => {
  return (
    <div className="flex items-start gap-3 rounded-xl bg-[#FBF8F8] px-4 py-3">
      <div className="mt-0.5 shrink-0 text-[#8A2638]">
        {icon}
      </div>

      <div className="min-w-0">
        <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-gray-400">
          {label}
        </p>

        <div className="mt-0.5 break-words text-sm font-bold text-[#21191B]">
          {children}
        </div>
      </div>
    </div>
  );
};

/*
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

  /*
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

        /*
         * ====================================================
         * BUSINESS PROFILE
         * ====================================================
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

        /*
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

        setProfile(
          response.user
        );

        setListings(
          Array.isArray(
            response.listings
          )
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

  /*
   * ==========================================================
   * DERIVED VALUES
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

  /*
   * ==========================================================
   * LOADING
   * ==========================================================
   */

  if (loading) {
    return (
      <div className="min-h-screen bg-[#F8F5F3] px-4 py-10 sm:px-6">
        <div className="mx-auto max-w-6xl">
          <div className="overflow-hidden rounded-3xl border border-[#E7DDDF] bg-white shadow-sm">
            <div className="h-36 animate-pulse bg-[#3D0F18]/90" />

            <div className="p-6">
              <div className="-mt-16 h-28 w-28 animate-pulse rounded-[2rem] border-4 border-white bg-[#E7DDDF]" />

              <div className="mt-5 h-7 w-52 animate-pulse rounded-lg bg-[#E7DDDF]" />

              <div className="mt-3 h-4 w-36 animate-pulse rounded bg-[#EEE7E8]" />

              <div className="mt-7 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                {[1, 2, 3, 4].map(
                  (item) => (
                    <div
                      key={item}
                      className="h-20 animate-pulse rounded-2xl bg-[#F3EEEE]"
                    />
                  )
                )}
              </div>
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
    !profile
  ) {
    return (
      <div className="min-h-screen bg-[#F8F5F3] px-4 py-10 sm:px-6">
        <div className="mx-auto flex min-h-[65vh] max-w-xl items-center justify-center">
          <div className="w-full rounded-3xl border border-[#E7DDDF] bg-white p-8 text-center shadow-sm">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-[#F5E8EB] text-[#5B1725]">
              <UserRound
                size={30}
              />
            </div>

            <h1 className="mt-5 text-2xl font-black text-[#21191B]">
              Profile unavailable
            </h1>

            <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-gray-500">
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

  /*
   * ==========================================================
   * PROFILE
   * ==========================================================
   */

  return (
    <div className="min-h-screen bg-[#F8F5F3]">
      <main className="mx-auto w-full max-w-6xl px-4 py-6 sm:px-6 sm:py-8 lg:px-8">
        {/* ==================================================
            BACK
        ================================================== */}

        <Link
          to="/marketplace"
          className="mb-5 inline-flex items-center gap-2 text-sm font-bold text-[#5B1725] transition hover:text-[#8A2638]"
        >
          <ArrowLeft
            size={17}
          />

          Marketplace
        </Link>

        {/* ==================================================
            PROFILE HERO
        ================================================== */}

        <section className="overflow-hidden rounded-3xl border border-[#E7DDDF] bg-white shadow-sm">
          {/* Cover */}

          <div className="relative h-32 overflow-hidden bg-[#3D0F18] sm:h-40">
            <div className="absolute -right-24 -top-28 h-72 w-72 rounded-full bg-[#8A2638]/50 blur-3xl" />

            <div className="absolute -bottom-32 left-[25%] h-72 w-72 rounded-full bg-[#D6B15E]/10 blur-3xl" />

            <div className="absolute right-[18%] top-7 h-20 w-20 rounded-full border border-white/10 bg-white/5" />

            <div className="absolute inset-x-0 bottom-0 h-px bg-white/10" />
          </div>

          <div className="relative px-5 pb-6 sm:px-7">
            {/* Avatar + status */}

            <div className="-mt-12 flex flex-col gap-4 sm:-mt-14 sm:flex-row sm:items-end sm:justify-between">
              <div className="relative w-fit">
                <div className="flex h-24 w-24 items-center justify-center overflow-hidden rounded-[1.7rem] border-[5px] border-white bg-[#F4E7EA] text-4xl font-black text-[#5B1725] shadow-lg sm:h-28 sm:w-28">
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

                        if (
                          parent
                        ) {
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
                  className="absolute bottom-1.5 right-1.5 h-5 w-5 rounded-full border-4 border-white bg-green-500"
                  title="Active trader"
                />
              </div>

              <div className="flex flex-wrap gap-2 pb-1">
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

            <div className="mt-4 grid gap-5 lg:grid-cols-[1fr_auto] lg:items-end">
              <div>
                <div className="flex flex-wrap items-center gap-2.5">
                  <h1 className="text-2xl font-black tracking-tight text-[#21191B] sm:text-3xl">
                    {profile.name ||
                      "BarterConnekt User"}
                  </h1>

                  {profile.isPremium && (
                    <PremiumBadge
                      size="lg"
                    />
                  )}
                </div>

                <div className="mt-2 flex flex-wrap items-center gap-x-5 gap-y-2 text-sm text-gray-500">
                  {profile.location && (
                    <div className="flex items-center gap-1.5">
                      <MapPin
                        size={16}
                        className="text-[#8A2638]"
                      />

                      <span>
                        {
                          profile.location
                        }
                      </span>
                    </div>
                  )}

                  <div className="flex items-center gap-1.5">
                    <CalendarDays
                      size={16}
                      className="text-[#8A2638]"
                    />

                    <span>
                      Member since{" "}
                      {formatMemberSince(
                        profile.createdAt
                      )}
                    </span>
                  </div>
                </div>

                {profile.bio ? (
                  <p className="mt-3 max-w-3xl text-sm leading-6 text-gray-600">
                    {profile.bio}
                  </p>
                ) : (
                  <p className="mt-3 text-sm italic text-gray-400">
                    This trader has not added
                    a bio yet.
                  </p>
                )}
              </div>

              {/* Primary actions */}

              <div className="flex flex-wrap gap-2 lg:justify-end">
                {profile?.phone && (
                  <a
                    href={`tel:${profile.phone}`}
                    className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#5B1725] px-5 py-3 text-sm font-bold text-white shadow-sm transition hover:bg-[#3D0F18]"
                  >
                    <Phone
                      size={17}
                    />

                    Call Trader
                  </a>
                )}

                <Link
                  to="/marketplace"
                  className="inline-flex items-center justify-center gap-2 rounded-xl border border-[#E7DDDF] bg-white px-5 py-3 text-sm font-bold text-[#5B1725] transition hover:bg-[#FBF5F6]"
                >
                  <Store
                    size={17}
                  />

                  Marketplace
                </Link>
              </div>
            </div>
          </div>
        </section>

        {/* ==================================================
            STATS
        ================================================== */}

        <section className="mt-4 grid grid-cols-2 overflow-hidden rounded-2xl border border-[#E7DDDF] bg-white shadow-sm lg:grid-cols-4">
          <div className="border-b border-r border-[#EEE5E7] lg:border-b-0">
            <StatCard
              icon={
                <Star
                  size={19}
                />
              }
              value={
                barterScore.toFixed(
                  1
                )
              }
              label="Barter Score"
            />
          </div>

          <div className="border-b border-[#EEE5E7] lg:border-b-0 lg:border-r">
            <StatCard
              icon={
                <Star
                  size={19}
                />
              }
              value={
                averageRating.toFixed(
                  1
                )
              }
              label={`${totalRatings} ${
                totalRatings === 1
                  ? "rating"
                  : "ratings"
              }`}
            />
          </div>

          <div className="border-r border-[#EEE5E7]">
            <StatCard
              icon={
                <Trophy
                  size={19}
                />
              }
              value={
                completedTrades
              }
              label="Completed trades"
            />
          </div>

          <StatCard
            icon={
              <Package
                size={19}
              />
            }
            value={
              activeListingCount
            }
            label="Active listings"
          />
        </section>

        {/* ==================================================
            CONTENT
        ================================================== */}

        <div className="mt-4 grid gap-4 lg:grid-cols-[1fr_320px]">
          {/* =================================================
              LISTINGS
          ================================================= */}

          <section className="overflow-hidden rounded-3xl border border-[#E7DDDF] bg-white shadow-sm">
            <div className="flex items-center justify-between gap-4 border-b border-[#EEE5E7] px-5 py-5 sm:px-6">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-[#8A2638]">
                  Marketplace
                </p>

                <h2 className="mt-1 text-xl font-black text-[#21191B]">
                  Available for Barter
                </h2>

                <p className="mt-1 text-xs text-gray-500">
                  Active items from this
                  trader.
                </p>
              </div>

              <span className="shrink-0 rounded-full bg-[#F5E8EB] px-3 py-1.5 text-xs font-black text-[#5B1725]">
                {activeListingCount} active
              </span>
            </div>

            <div className="p-4 sm:p-5">
              {listings.length ===
              0 ? (
                <div className="rounded-2xl bg-[#FBF8F8] px-6 py-10 text-center">
                  <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-[#F5E8EB] text-[#5B1725]">
                    <Package
                      size={23}
                    />
                  </div>

                  <h3 className="mt-4 font-black text-[#21191B]">
                    No active listings
                  </h3>

                  <p className="mx-auto mt-1 max-w-md text-sm leading-6 text-gray-500">
                    This trader currently
                    has no items available
                    for barter.
                  </p>
                </div>
              ) : (
                <div className="grid gap-3 sm:grid-cols-2">
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
                          className="group flex min-w-0 overflow-hidden rounded-2xl border border-[#EEE5E7] bg-white transition hover:border-[#D9C0C6] hover:shadow-md"
                        >
                          {/* Image */}

                          <div className="relative h-32 w-32 shrink-0 overflow-hidden bg-[#F4EEEE] sm:h-36 sm:w-36">
                            {image ? (
                              <img
                                src={
                                  image
                                }
                                alt={
                                  listing.title ||
                                  "Listing"
                                }
                                className="h-full w-full object-cover transition duration-300 group-hover:scale-105"
                              />
                            ) : (
                              <div className="flex h-full w-full items-center justify-center">
                                <Package
                                  size={
                                    30
                                  }
                                  className="text-[#B69CA2]"
                                />
                              </div>
                            )}

                            {listing.condition && (
                              <span className="absolute left-2 top-2 max-w-[90%] truncate rounded-full bg-white/95 px-2 py-1 text-[9px] font-bold uppercase text-[#5B1725] shadow-sm">
                                {
                                  listing.condition
                                }
                              </span>
                            )}
                          </div>

                          {/* Listing details */}

                          <div className="flex min-w-0 flex-1 flex-col p-3">
                            {listing
                              ?.category
                              ?.name && (
                              <p className="truncate text-[9px] font-bold uppercase tracking-[0.12em] text-[#8A2638]">
                                {
                                  listing
                                    .category
                                    .name
                                }
                              </p>
                            )}

                            <h3 className="mt-1 line-clamp-2 text-sm font-black leading-5 text-[#21191B]">
                              {listing.title ||
                                "Untitled listing"}
                            </h3>

                            {listing.description && (
                              <p className="mt-1 line-clamp-2 text-[11px] leading-5 text-gray-500">
                                {
                                  listing.description
                                }
                              </p>
                            )}

                            <div className="mt-auto flex items-end justify-between gap-2 pt-3">
                              <div className="min-w-0">
                                {value ? (
                                  <>
                                    <p className="text-[9px] font-bold uppercase text-gray-400">
                                      Est.
                                      value
                                    </p>

                                    <p className="truncate text-xs font-black text-[#5B1725]">
                                      {
                                        value
                                      }
                                    </p>
                                  </>
                                ) : (
                                  <p className="text-[10px] text-gray-400">
                                    Listed{" "}
                                    {formatListingDate(
                                      listing.createdAt
                                    )}
                                  </p>
                                )}
                              </div>

                              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[#F5E8EB] text-[#5B1725] transition group-hover:bg-[#5B1725] group-hover:text-white">
                                <ChevronRight
                                  size={
                                    16
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
                  <p className="mt-4 text-center text-xs text-gray-400">
                    Showing the latest{" "}
                    {listings.length} of{" "}
                    {activeListingCount}{" "}
                    active listings.
                  </p>
                )}
            </div>
          </section>

          {/* =================================================
              SIDEBAR
          ================================================= */}

          <aside className="space-y-4">
            {/* Trader details */}

            <section className="rounded-3xl border border-[#E7DDDF] bg-white p-5 shadow-sm">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-[#8A2638]">
                    Trader
                  </p>

                  <h2 className="mt-1 text-lg font-black text-[#21191B]">
                    Trader Information
                  </h2>
                </div>

                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#F5E8EB] text-[#5B1725]">
                  <UserRound
                    size={19}
                  />
                </div>
              </div>

              <div className="mt-4 space-y-2.5">
                {/* Phone */}

                <InfoRow
                  icon={
                    <Phone
                      size={17}
                    />
                  }
                  label="Phone number"
                >
                  {profile?.phone ? (
                    <a
                      href={`tel:${profile.phone}`}
                      className="transition hover:text-[#8A2638]"
                    >
                      {profile.phone}
                    </a>
                  ) : (
                    <span className="font-medium text-gray-400">
                      Not provided
                    </span>
                  )}
                </InfoRow>

                {/* Location */}

                <InfoRow
                  icon={
                    <MapPin
                      size={17}
                    />
                  }
                  label="Location"
                >
                  {profile.location || (
                    <span className="font-medium text-gray-400">
                      Not provided
                    </span>
                  )}
                </InfoRow>

                {/* Joined */}

                <InfoRow
                  icon={
                    <CalendarDays
                      size={17}
                    />
                  }
                  label="Member since"
                >
                  {formatMemberSince(
                    profile.createdAt
                  )}
                </InfoRow>

                {/* Membership */}

                <InfoRow
                  icon={
                    <Crown
                      size={17}
                    />
                  }
                  label="Membership"
                >
                  {profile.isPremium
                    ? "Premium Trader"
                    : "Standard Trader"}
                </InfoRow>
              </div>

              {profile.phone && (
                <a
                  href={`tel:${profile.phone}`}
                  className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl bg-[#5B1725] px-4 py-3 text-sm font-bold text-white transition hover:bg-[#3D0F18]"
                >
                  <Phone
                    size={17}
                  />

                  Call Trader
                </a>
              )}
            </section>

            {/* Reputation */}

            <section className="rounded-3xl border border-[#E7DDDF] bg-white p-5 shadow-sm">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-[#8A2638]">
                    Trust
                  </p>

                  <h2 className="mt-1 text-lg font-black text-[#21191B]">
                    Reputation
                  </h2>
                </div>

                <ShieldCheck
                  size={22}
                  className="text-green-600"
                />
              </div>

              <div className="mt-4 flex items-center gap-4">
                <div>
                  <div className="flex items-end gap-1">
                    <span className="text-4xl font-black text-[#5B1725]">
                      {averageRating.toFixed(
                        1
                      )}
                    </span>

                    <span className="pb-1 text-xs font-bold text-gray-400">
                      / 5
                    </span>
                  </div>

                  <div className="mt-1 flex gap-0.5">
                    {[
                      1, 2, 3, 4, 5,
                    ].map(
                      (star) => (
                        <span
                          key={
                            star
                          }
                          className={`text-lg ${
                            star <=
                            ratingStars
                              ? "text-yellow-500"
                              : "text-gray-300"
                          }`}
                        >
                          ★
                        </span>
                      )
                    )}
                  </div>
                </div>

                <div className="border-l border-[#EEE5E7] pl-4">
                  <p className="text-xl font-black text-[#21191B]">
                    {
                      completedTrades
                    }
                  </p>

                  <p className="text-xs text-gray-500">
                    successful trades
                  </p>

                  <p className="mt-2 text-xs font-semibold text-[#8A2638]">
                    {totalRatings}{" "}
                    {totalRatings === 1
                      ? "review"
                      : "reviews"}
                  </p>
                </div>
              </div>
            </section>

            {/* Safety */}

            <section className="overflow-hidden rounded-3xl bg-[#3D0F18] p-5 text-white shadow-sm">
              <div className="flex items-start gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white/10">
                  <ShieldCheck
                    size={20}
                  />
                </div>

                <div>
                  <h2 className="font-black">
                    Trade Safely
                  </h2>

                  <p className="mt-1 text-xs leading-5 text-white/65">
                    Inspect items before
                    completing an exchange
                    and keep confirmations
                    inside BarterConnekt.
                  </p>
                </div>
              </div>
            </section>
          </aside>
        </div>
      </main>
    </div>
  );
};

export default PublicProfile;