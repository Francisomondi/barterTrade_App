
import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { getMyListings } from "../api/listingApi";
import { getReceivedOffers, getSentOffers,} from "../api/offerApi";
import { getTrades } from "../api/tradeApi";
import MyPromotions from "../components/MyPromotions";

const Dashboard = () => {
  const navigate = useNavigate();
  const { user } = useAuth();

  const [listings, setListings] = useState([]);
  const [receivedOffers, setReceivedOffers] = useState([]);
  const [sentOffers, setSentOffers] = useState([]);
  const [trades, setTrades] = useState([]);

  const [loading, setLoading] = useState(true);
  const [dataError, setDataError] = useState("");

  /* =========================================================
     HELPERS
  ========================================================= */

  const getInitials = (name = "") => {
    const parts = name.trim().split(/\s+/).filter(Boolean);

    if (!parts.length) return "U";

    if (parts.length === 1) {
      return parts[0].charAt(0).toUpperCase();
    }

    return (
      parts[0].charAt(0) +
      parts[parts.length - 1].charAt(0)
    ).toUpperCase();
  };

  const formatPrice = (value) => {
    const number = Number(value);

    if (!Number.isFinite(number)) {
      return "KES 0";
    }

    return `KES ${number.toLocaleString("en-KE")}`;
  };

  const formatDate = (date) => {
    if (!date) return "—";

    const parsed = new Date(date);

    if (Number.isNaN(parsed.getTime())) {
      return "—";
    }

    return parsed.toLocaleDateString("en-KE", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  };

  const formatDateTime = (date) => {
    if (!date) return "—";

    const parsed = new Date(date);

    if (Number.isNaN(parsed.getTime())) {
      return "—";
    }

    return parsed.toLocaleString("en-KE", {
      day: "numeric",
      month: "short",
      year: "numeric",
      hour: "numeric",
      minute: "2-digit",
    });
  };

  const formatStatus = (status) => {
    if (!status) return "Unknown";

    return status
      .replaceAll("_", " ")
      .toLowerCase()
      .replace(/\b\w/g, (letter) => letter.toUpperCase());
  };

  const getListingImage = (listing) => {
    return (
      listing?.images?.find((image) => image.isPrimary)?.url ||
      listing?.images?.[0]?.url ||
      listing?.images?.[0]?.imageUrl ||
      listing?.imageUrl ||
      null
    );
  };

  const getStatusClasses = (status) => {
    switch (status) {
      case "ACTIVE":
        return "bg-emerald-50 text-emerald-700 border-emerald-200";

      case "RESERVED":
        return "bg-amber-50 text-amber-700 border-amber-200";

      case "TRADED":
        return "bg-blue-50 text-blue-700 border-blue-200";

      case "PENDING":
        return "bg-amber-50 text-amber-700 border-amber-200";

      case "ACCEPTED":
        return "bg-emerald-50 text-emerald-700 border-emerald-200";

      case "COMPLETED":
        return "bg-green-50 text-green-700 border-green-200";

      case "VERIFICATION":
        return "bg-purple-50 text-purple-700 border-purple-200";

      case "READY_FOR_HANDOVER":
        return "bg-indigo-50 text-indigo-700 border-indigo-200";

      case "IN_PROGRESS":
        return "bg-orange-50 text-orange-700 border-orange-200";

      case "CANCELLED":
      case "REJECTED":
        return "bg-red-50 text-red-700 border-red-200";

      case "DISPUTED":
        return "bg-red-50 text-red-700 border-red-200";

      default:
        return "bg-gray-50 text-gray-600 border-gray-200";
    }
  };

  /* =========================================================
     LOAD DASHBOARD DATA
  ========================================================= */

  useEffect(() => {
    let mounted = true;

    const loadDashboard = async () => {
      if (!user?.id) {
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        setDataError("");

        const results = await Promise.allSettled([
          getMyListings(),
          getReceivedOffers(),
          getSentOffers(),
          getTrades(),
        ]);

        if (!mounted) return;

        const [
          listingsResult,
          receivedResult,
          sentResult,
          tradesResult,
        ] = results;

        if (listingsResult.status === "fulfilled") {
          setListings(
            listingsResult.value?.listings ||
              listingsResult.value?.data?.listings ||
              []
          );
        } else {
          setListings([]);
          console.error(
            "Dashboard listings error:",
            listingsResult.reason
          );
        }

        if (receivedResult.status === "fulfilled") {
          setReceivedOffers(
            receivedResult.value?.offers ||
              receivedResult.value?.data?.offers ||
              []
          );
        } else {
          setReceivedOffers([]);
          console.error(
            "Dashboard received offers error:",
            receivedResult.reason
          );
        }

        if (sentResult.status === "fulfilled") {
          setSentOffers(
            sentResult.value?.offers ||
              sentResult.value?.data?.offers ||
              []
          );
        } else {
          setSentOffers([]);
          console.error(
            "Dashboard sent offers error:",
            sentResult.reason
          );
        }

        if (tradesResult.status === "fulfilled") {
          setTrades(
            tradesResult.value?.trades ||
              tradesResult.value?.data?.trades ||
              []
          );
        } else {
          setTrades([]);
          console.error(
            "Dashboard trades error:",
            tradesResult.reason
          );
        }

        const everythingFailed = results.every(
          (result) => result.status === "rejected"
        );

        if (everythingFailed) {
          setDataError(
            "We could not load your dashboard activity. Please refresh and try again."
          );
        }
      } catch (error) {
        console.error(
          "DASHBOARD LOAD ERROR:",
          error
        );

        if (mounted) {
          setDataError(
            "Unable to load your dashboard data."
          );
        }
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    };

    loadDashboard();

    return () => {
      mounted = false;
    };
  }, [user?.id]);

  /* =========================================================
     DERIVED USER DATA
  ========================================================= */

  const dashboardUser = useMemo(() => {
    /*
     * The authenticated user is the primary source.
     *
     * The trade API also returns the current trader with:
     * phone, location, barterScore and completedTrades.
     *
     * Using that participant record gives the dashboard the
     * latest persisted barter score returned by the backend.
     */
    const participant = trades.find(
      (trade) =>
        trade?.traderA?.id === user?.id ||
        trade?.traderB?.id === user?.id
    );

    const participantUser =
      participant?.traderA?.id === user?.id
        ? participant.traderA
        : participant?.traderB?.id === user?.id
        ? participant.traderB
        : null;

    return {
      ...user,
      ...participantUser,
    };
  }, [user, trades]);

  /*
   * IMPORTANT:
   *
   * Do not calculate Barter Score from frontend activity.
   *
   * barterScore is a persisted backend value and ratings
   * contribute to it. The dashboard displays that persisted
   * value directly.
   */
  const barterScore = Number(
    dashboardUser?.barterScore ?? 0
  );

  const completedTrades = Number(
    dashboardUser?.completedTrades ?? 0
  );

  const initials = getInitials(
    dashboardUser?.name
  );

  /* =========================================================
     DASHBOARD STATISTICS
  ========================================================= */

  const activeListings = useMemo(
    () =>
      listings.filter(
        (listing) => listing.status === "ACTIVE"
      ),
    [listings]
  );

  const reservedListings = useMemo(
    () =>
      listings.filter(
        (listing) => listing.status === "RESERVED"
      ),
    [listings]
  );

  const pendingReceivedOffers = useMemo(
    () =>
      receivedOffers.filter(
        (offer) => offer.status === "PENDING"
      ),
    [receivedOffers]
  );

  const pendingSentOffers = useMemo(
    () =>
      sentOffers.filter(
        (offer) => offer.status === "PENDING"
      ),
    [sentOffers]
  );

  const activeTrades = useMemo(
    () =>
      trades.filter((trade) =>
        [
          "PENDING",
          "AGREED",
          "VERIFICATION",
          "READY_FOR_HANDOVER",
          "IN_PROGRESS",
        ].includes(trade.status)
      ),
    [trades]
  );

  const completedTradeRecords = useMemo(
    () =>
      trades.filter(
        (trade) => trade.status === "COMPLETED"
      ),
    [trades]
  );

  const disputedTrades = useMemo(
    () =>
      trades.filter(
        (trade) => trade.status === "DISPUTED"
      ),
    [trades]
  );

  const totalOffers =
    receivedOffers.length + sentOffers.length;

  const pendingOffers =
    pendingReceivedOffers.length +
    pendingSentOffers.length;

  const actionRequiredCount =
    pendingReceivedOffers.length +
    activeTrades.length +
    disputedTrades.length;

  const totalListingValue = useMemo(
    () =>
      listings.reduce(
        (total, listing) =>
          total +
          (Number(listing.estimatedValue) || 0),
        0
      ),
    [listings]
  );

  const latestListings = useMemo(
    () => listings.slice(0, 3),
    [listings]
  );

  const latestTrades = useMemo(
    () => trades.slice(0, 4),
    [trades]
  );

  const latestOffers = useMemo(() => {
    return [
      ...receivedOffers.map((offer) => ({
        ...offer,
        direction: "received",
      })),
      ...sentOffers.map((offer) => ({
        ...offer,
        direction: "sent",
      })),
    ]
      .sort(
        (a, b) =>
          new Date(b.createdAt || 0) -
          new Date(a.createdAt || 0)
      )
      .slice(0, 4);
  }, [receivedOffers, sentOffers]);

  /* =========================================================
     LOADING
  ========================================================= */

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-[#FAF7F5] via-[#FCFAF9] to-[#F7F1F2]">
        <main className="mx-auto w-full max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
          <div className="animate-pulse">
            <div className="h-56 rounded-3xl bg-[#3D0F18]/15" />

            <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {Array.from({ length: 4 }).map(
                (_, index) => (
                  <div
                    key={index}
                    className="h-32 rounded-2xl bg-white shadow-sm"
                  />
                )
              )}
            </div>

            <div className="mt-6 grid gap-6 lg:grid-cols-3">
              <div className="h-80 rounded-2xl bg-white lg:col-span-2" />
              <div className="h-80 rounded-2xl bg-white" />
            </div>
          </div>
        </main>
      </div>
    );
  }

  /* =========================================================
     UI
  ========================================================= */

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#FAF7F5] via-[#FCFAF9] to-[#F7F1F2]">
      <main className="mx-auto w-full max-w-7xl px-4 py-6 sm:px-6 lg:px-8">

        {/* =====================================================
            HERO
        ====================================================== */}

        <section className="relative overflow-hidden rounded-[2rem] bg-[#3D0F18] shadow-xl">
          <div className="pointer-events-none absolute -right-24 -top-24 h-72 w-72 rounded-full bg-[#C9A227]/15 blur-3xl" />

          <div className="pointer-events-none absolute -bottom-40 left-10 h-80 w-80 rounded-full bg-[#8A2638]/40 blur-3xl" />

          <div className="relative p-6 sm:p-8 lg:p-10">
            <div className="flex flex-col gap-8 lg:flex-row lg:items-center lg:justify-between">

              {/* Welcome */}

              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <span className="h-2 w-2 rounded-full bg-[#D8B84C]" />

                  <p className="text-xs font-bold uppercase tracking-[0.2em] text-[#D8B84C]">
                    Barter Trace
                  </p>
                </div>

                <h1 className="mt-3 max-w-3xl text-3xl font-black tracking-tight text-white sm:text-4xl lg:text-5xl">
                  Welcome back
                  {dashboardUser?.name
                    ? `, ${
                        dashboardUser.name
                          .split(" ")[0]
                      }`
                    : ""}
                  .
                </h1>

                <p className="mt-4 max-w-2xl text-sm leading-7 text-white/70 sm:text-base">
                  Your marketplace activity, trade
                  progress, offers and account
                  performance — all in one place.
                </p>

                <div className="mt-6 flex flex-wrap gap-3">
                  <Link
                    to="/marketplace"
                    className="rounded-xl bg-white px-5 py-3 text-sm font-bold text-[#3D0F18] shadow-lg transition hover:-translate-y-0.5 hover:bg-[#F8F5F3]"
                  >
                    Browse Marketplace
                  </Link>

                  <Link
                    to="/listings/create"
                    className="rounded-xl border border-white/20 bg-white/10 px-5 py-3 text-sm font-bold text-white backdrop-blur transition hover:bg-white/15"
                  >
                    + Create Listing
                  </Link>
                </div>
              </div>

              {/* Profile */}

              <Link
                to="/profile"
                className="group flex shrink-0 items-center gap-4 rounded-2xl border border-white/10 bg-white/5 p-3 pr-5 backdrop-blur transition hover:bg-white/10"
              >
                <div className="relative">
                  {dashboardUser?.avatar ? (
                    <img
                      src={dashboardUser.avatar}
                      alt={`${dashboardUser.name || "User"} avatar`}
                      className="h-16 w-16 rounded-full border-2 border-[#D8B84C] bg-white object-cover shadow-lg"
                      onError={(event) => {
                        event.currentTarget.style.display =
                          "none";

                        const fallback =
                          event.currentTarget
                            .nextElementSibling;

                        if (fallback) {
                          fallback.style.display =
                            "flex";
                        }
                      }}
                    />
                  ) : null}

                  <div
                    className={`${
                      dashboardUser?.avatar
                        ? "hidden"
                        : "flex"
                    } h-16 w-16 items-center justify-center rounded-full border-2 border-[#D8B84C] bg-[#8A2638] text-xl font-black text-white shadow-lg`}
                  >
                    {initials}
                  </div>

                  <span className="absolute bottom-0 right-0 h-4 w-4 rounded-full border-2 border-[#3D0F18] bg-green-500" />
                </div>

                <div className="min-w-0">
                  <p className="truncate text-sm font-black text-white">
                    {dashboardUser?.name ||
                      "Barter Trader"}
                  </p>

                  <p className="mt-1 max-w-[220px] truncate text-xs text-white/50">
                    {dashboardUser?.email ||
                      "Account information"}
                  </p>

                  {dashboardUser?.location && (
                    <p className="mt-1 truncate text-xs text-white/50">
                      📍 {dashboardUser.location}
                    </p>
                  )}
                </div>

                <span className="hidden text-white/50 transition group-hover:translate-x-1 sm:block">
                  →
                </span>
              </Link>
            </div>
          </div>
        </section>

        {/* =====================================================
            ERROR
        ====================================================== */}

        {dataError && (
          <div className="mt-5 rounded-2xl border border-red-200 bg-red-50 p-4">
            <div className="flex items-start gap-3">
              <span className="text-lg">⚠️</span>

              <div>
                <p className="text-sm font-bold text-red-800">
                  Dashboard data unavailable
                </p>

                <p className="mt-1 text-sm leading-6 text-red-700">
                  {dataError}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* =====================================================
            MAIN STATISTICS
        ====================================================== */}

        <section className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">

          {/* Barter Score */}

          <div className="relative overflow-hidden rounded-2xl border border-[#E7DDDF] bg-white p-5 shadow-sm">
            <div className="absolute right-0 top-0 h-20 w-20 rounded-full bg-[#C9A227]/10 blur-2xl" />

            <div className="relative">
              <div className="flex items-center justify-between">
                <p className="text-xs font-bold uppercase tracking-wider text-gray-400">
                  Barter Score
                </p>

                <span className="text-lg">
                  ⭐
                </span>
              </div>

              <div className="mt-3 flex items-end gap-2">
                <span className="text-3xl font-black text-[#5B1725]">
                  {barterScore.toLocaleString()}
                </span>

                <span className="mb-1 text-xs font-semibold text-gray-400">
                  points
                </span>
              </div>

              <p className="mt-2 text-xs leading-5 text-gray-500">
                Your persisted marketplace score.
              </p>
            </div>
          </div>

          {/* Completed Trades */}

          <div className="rounded-2xl border border-[#E7DDDF] bg-white p-5 shadow-sm">
            <div className="flex items-center justify-between">
              <p className="text-xs font-bold uppercase tracking-wider text-gray-400">
                Completed Trades
              </p>

              <span className="text-lg">
                🏆
              </span>
            </div>

            <div className="mt-3 flex items-end gap-2">
              <span className="text-3xl font-black text-[#5B1725]">
                {completedTrades.toLocaleString()}
              </span>

              <span className="mb-1 text-xs font-semibold text-gray-400">
                trades
              </span>
            </div>

            <p className="mt-2 text-xs leading-5 text-gray-500">
              Successfully completed exchanges.
            </p>
          </div>

          {/* Active Listings */}

          <div className="rounded-2xl border border-[#E7DDDF] bg-white p-5 shadow-sm">
            <div className="flex items-center justify-between">
              <p className="text-xs font-bold uppercase tracking-wider text-gray-400">
                Active Listings
              </p>

              <span className="text-lg">
                📦
              </span>
            </div>

            <div className="mt-3 flex items-end gap-2">
              <span className="text-3xl font-black text-[#5B1725]">
                {activeListings.length}
              </span>

              <span className="mb-1 text-xs font-semibold text-gray-400">
                available
              </span>
            </div>

            <p className="mt-2 text-xs leading-5 text-gray-500">
              {formatPrice(totalListingValue)} total listed value.
            </p>
          </div>

          {/* Pending Offers */}

          <div className="rounded-2xl border border-[#E7DDDF] bg-white p-5 shadow-sm">
            <div className="flex items-center justify-between">
              <p className="text-xs font-bold uppercase tracking-wider text-gray-400">
                Pending Offers
              </p>

              <span className="text-lg">
                🤝
              </span>
            </div>

            <div className="mt-3 flex items-end gap-2">
              <span className="text-3xl font-black text-[#5B1725]">
                {pendingOffers}
              </span>

              <span className="mb-1 text-xs font-semibold text-gray-400">
                waiting
              </span>
            </div>

            <p className="mt-2 text-xs leading-5 text-gray-500">
              {pendingReceivedOffers.length} received ·{" "}
              {pendingSentOffers.length} sent
            </p>
          </div>
        </section>
        
      {/* =========================================================
          PROMOTION MANAGEMENT
      ========================================================= */}

        <section className="mt-6 overflow-hidden rounded-2xl border border-[#E7DDDF] bg-white shadow-sm">
          <div className="flex flex-col gap-4 border-b border-[#EEE6E8] bg-[#FCF8F9] px-5 py-5 sm:flex-row sm:items-center sm:justify-between sm:px-6">
            <div>
              <div className="flex items-center gap-2">
                <p className="text-xs font-bold uppercase tracking-wider text-[#8A2638]">
                  Action Center
                </p>
                {actionRequiredCount > 0 && (
                  <span className="rounded-full bg-[#5B1725] px-2.5 py-1 text-[10px] font-black text-white">
                    {actionRequiredCount}
                  </span>
                )}
              </div>
              <h2 className="mt-1 text-xl font-black text-[#21191B]">
                What needs your attention
              </h2>
              <p className="mt-1 text-sm text-gray-500">
                Review pending offers, active trades and disputes without hunting through the app.
              </p>
            </div>

            {actionRequiredCount === 0 && (
              <span className="w-fit rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-xs font-bold text-emerald-700">
                ✓ You're all caught up
              </span>
            )}
          </div>

          <div className="grid gap-px bg-[#EEE6E8] sm:grid-cols-3">
            {[
              {
                to: "/offers",
                icon: "🤝",
                value: pendingReceivedOffers.length,
                title: "Offers to review",
                text: "Pending offers received from other traders.",
                iconClass: "bg-amber-50",
              },
              {
                to: "/trades",
                icon: "🔄",
                value: activeTrades.length,
                title: "Active trades",
                text: "Exchanges currently moving through the trade process.",
                iconClass: "bg-[#F5E8EB]",
              },
              {
                to: "/trades",
                icon: "⚠️",
                value: disputedTrades.length,
                title: "Disputes",
                text: "Trades marked as disputed that may require attention.",
                iconClass: "bg-red-50",
              },
            ].map((item) => (
              <Link
                key={item.title}
                to={item.to}
                className="group bg-white p-5 transition hover:bg-[#FCF8F9]"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className={`flex h-11 w-11 items-center justify-center rounded-xl text-xl ${item.iconClass}`}>
                    {item.icon}
                  </div>
                  <span className="text-[#C9A227] transition group-hover:translate-x-1">
                    →
                  </span>
                </div>
                <p className="mt-4 text-2xl font-black text-[#5B1725]">
                  {item.value}
                </p>
                <p className="mt-1 text-sm font-bold text-[#21191B]">
                  {item.title}
                </p>
                <p className="mt-1 text-xs leading-5 text-gray-500">
                  {item.text}
                </p>
              </Link>
            ))}
          </div>
        </section>

        <section className="mt-6">
          <div className="mb-4">
            <p className="text-xs font-bold uppercase tracking-wider text-[#8A2638]">
              Visibility
            </p>
            <h2 className="mt-1 text-xl font-black text-[#21191B]">
              Promotion performance
            </h2>
            <p className="mt-1 text-sm text-gray-500">
              Manage promoted listings and follow their performance.
            </p>
          </div>

          <MyPromotions />
        </section>
      

        {/* =====================================================
            ACTIVITY OVERVIEW
        ====================================================== */}

        <section className="mt-6 grid gap-6 lg:grid-cols-3">

          {/* Trade Activity */}

          <div className="rounded-2xl border border-[#E7DDDF] bg-white p-6 shadow-sm lg:col-span-2">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-xs font-bold uppercase tracking-wider text-[#8A2638]">
                  Trade Activity
                </p>

                <h2 className="mt-1 text-xl font-black text-[#21191B]">
                  Your barter activity
                </h2>

                <p className="mt-1 text-sm text-gray-500">
                  Keep track of exchanges from offer to completion.
                </p>
              </div>

              <Link
                to="/trades"
                className="text-sm font-bold text-[#5B1725] hover:underline"
              >
                View all trades →
              </Link>
            </div>

            <div className="mt-6 grid gap-3 sm:grid-cols-3">
              <div className="rounded-xl bg-[#FBF5F6] p-4">
                <p className="text-xs font-bold uppercase tracking-wider text-gray-400">
                  Active
                </p>

                <p className="mt-2 text-2xl font-black text-[#5B1725]">
                  {activeTrades.length}
                </p>
              </div>

              <div className="rounded-xl bg-[#F4F8FC] p-4">
                <p className="text-xs font-bold uppercase tracking-wider text-gray-400">
                  Completed
                </p>

                <p className="mt-2 text-2xl font-black text-[#5B1725]">
                  {completedTradeRecords.length}
                </p>
              </div>

              <div className="rounded-xl bg-[#FEF5F5] p-4">
                <p className="text-xs font-bold uppercase tracking-wider text-gray-400">
                  Disputed
                </p>

                <p className="mt-2 text-2xl font-black text-[#5B1725]">
                  {disputedTrades.length}
                </p>
              </div>
            </div>

            {/* Latest trades */}

            {latestTrades.length > 0 ? (
              <div className="mt-6 divide-y divide-[#EEE6E8]">
                {latestTrades.map((trade) => {
                  const isTraderA =
                    trade.traderAId ===
                    dashboardUser?.id;

                  const partner = isTraderA
                    ? trade.traderB
                    : trade.traderA;

                  return (
                    <button
                      key={trade.id}
                      type="button"
                      onClick={() =>
                        navigate(
                          `/trades/${trade.id}`
                        )
                      }
                      className="flex w-full items-center gap-4 py-4 text-left transition hover:bg-[#FCF8F9]"
                    >
                      <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[#F5E8EB]">
                        🤝
                      </div>

                      <div className="min-w-0 flex-1">
                        <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
                          <p className="truncate text-sm font-bold text-[#21191B]">
                            {trade.tradeNumber ||
                              "Barter Trade"}
                          </p>

                          <span
                            className={`w-fit rounded-full border px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide ${getStatusClasses(
                              trade.status
                            )}`}
                          >
                            {formatStatus(
                              trade.status
                            )}
                          </span>
                        </div>

                        <p className="mt-1 truncate text-xs text-gray-500">
                          Trading with{" "}
                          {partner?.name ||
                            "Trade partner"}
                        </p>

                        <p className="mt-1 text-xs text-gray-400">
                          {formatDate(
                            trade.createdAt
                          )}
                        </p>
                      </div>

                      <span className="text-gray-400">
                        →
                      </span>
                    </button>
                  );
                })}
              </div>
            ) : (
              <div className="mt-6 rounded-2xl border border-dashed border-[#D8C5C9] bg-[#FCF8F9] p-8 text-center">
                <div className="text-4xl">
                  🤝
                </div>

                <h3 className="mt-3 text-sm font-black text-[#21191B]">
                  No trades yet
                </h3>

                <p className="mx-auto mt-1 max-w-md text-sm leading-6 text-gray-500">
                  Once an offer is accepted, your
                  trade will appear here.
                </p>

                <Link
                  to="/marketplace"
                  className="mt-5 inline-flex rounded-xl bg-[#5B1725] px-5 py-3 text-sm font-bold text-white transition hover:bg-[#3D0F18]"
                >
                  Find Something to Trade
                </Link>
              </div>
            )}
          </div>

          {/* Account Snapshot */}

          <div className="rounded-2xl border border-[#E7DDDF] bg-white p-6 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-bold uppercase tracking-wider text-[#8A2638]">
                  Account
                </p>

                <h2 className="mt-1 text-xl font-black text-[#21191B]">
                  Profile snapshot
                </h2>
              </div>

              <Link
                to="/profile"
                className="text-sm font-bold text-[#5B1725]"
              >
                Edit
              </Link>
            </div>

            <div className="mt-6 space-y-4">

              <div>
                <p className="text-xs font-bold uppercase tracking-wider text-gray-400">
                  Full name
                </p>

                <p className="mt-1 text-sm font-bold text-[#21191B]">
                  {dashboardUser?.name ||
                    "Not provided"}
                </p>
              </div>

              <div>
                <p className="text-xs font-bold uppercase tracking-wider text-gray-400">
                  Email
                </p>

                <p className="mt-1 break-all text-sm font-semibold text-[#21191B]">
                  {dashboardUser?.email ||
                    "Not provided"}
                </p>
              </div>

              <div>
                <p className="text-xs font-bold uppercase tracking-wider text-gray-400">
                  Phone
                </p>

                <p className="mt-1 text-sm font-semibold text-[#21191B]">
                  {dashboardUser?.phone ||
                    "Not provided"}
                </p>
              </div>

              <div>
                <p className="text-xs font-bold uppercase tracking-wider text-gray-400">
                  Location
                </p>

                <p className="mt-1 text-sm font-semibold text-[#21191B]">
                  {dashboardUser?.location ||
                    "Not provided"}
                </p>
              </div>

              <div>
                <p className="text-xs font-bold uppercase tracking-wider text-gray-400">
                  Account status
                </p>

                <div className="mt-2 flex items-center gap-2">
                  <span className="h-2.5 w-2.5 rounded-full bg-green-500" />

                  <span className="text-sm font-bold capitalize text-[#21191B]">
                    {String(
                      dashboardUser?.status ||
                        "ACTIVE"
                    ).toLowerCase()}
                  </span>
                </div>
              </div>

              {dashboardUser?.createdAt && (
                <div>
                  <p className="text-xs font-bold uppercase tracking-wider text-gray-400">
                    Member since
                  </p>

                  <p className="mt-1 text-sm font-semibold text-[#21191B]">
                    {formatDate(
                      dashboardUser.createdAt
                    )}
                  </p>
                </div>
              )}
            </div>
          </div>
        </section>

        {/* =====================================================
            LISTINGS + OFFERS
        ====================================================== */}

        <section className="mt-6 grid gap-6 lg:grid-cols-2">

          {/* My Listings */}

          <div className="rounded-2xl border border-[#E7DDDF] bg-white p-6 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-bold uppercase tracking-wider text-[#8A2638]">
                  Inventory
                </p>

                <h2 className="mt-1 text-xl font-black text-[#21191B]">
                  My Listings
                </h2>
              </div>

              <Link
                to="/my-listings"
                className="text-sm font-bold text-[#5B1725]"
              >
                Manage →
              </Link>
            </div>

            {latestListings.length > 0 ? (
              <div className="mt-5 space-y-3">
                {latestListings.map((listing) => {
                  const image =
                    getListingImage(listing);

                  return (
                    <Link
                      key={listing.id}
                      to={`/listings/${listing.id}`}
                      className="flex gap-3 rounded-xl border border-[#EEE6E8] bg-[#FCF9F9] p-3 transition hover:border-[#D8B84C]/60 hover:bg-white"
                    >
                      <div className="h-16 w-16 shrink-0 overflow-hidden rounded-lg bg-[#F3E7E9]">
                        {image ? (
                          <img
                            src={image}
                            alt={
                              listing.title ||
                              "Listing"
                            }
                            className="h-full w-full object-cover"
                          />
                        ) : (
                          <div className="flex h-full w-full items-center justify-center text-xl">
                            📦
                          </div>
                        )}
                      </div>

                      <div className="min-w-0 flex-1">
                        <div className="flex items-start justify-between gap-2">
                          <h3 className="truncate text-sm font-bold text-[#21191B]">
                            {listing.title ||
                              "Untitled item"}
                          </h3>

                          <span
                            className={`shrink-0 rounded-full border px-2 py-1 text-[9px] font-bold uppercase ${getStatusClasses(
                              listing.status
                            )}`}
                          >
                            {formatStatus(
                              listing.status
                            )}
                          </span>
                        </div>

                        <p className="mt-1 truncate text-xs text-gray-500">
                          {listing.category?.name ||
                            "Uncategorized"}
                        </p>

                        <p className="mt-1.5 text-xs font-black text-[#5B1725]">
                          {formatPrice(
                            listing.estimatedValue
                          )}
                        </p>
                      </div>
                    </Link>
                  );
                })}
              </div>
            ) : (
              <div className="mt-5 rounded-xl border border-dashed border-[#D8C5C9] p-6 text-center">
                <div className="text-3xl">
                  📦
                </div>

                <p className="mt-2 text-sm font-bold text-[#21191B]">
                  No listings yet
                </p>

                <Link
                  to="/listings/create"
                  className="mt-4 inline-flex rounded-xl bg-[#5B1725] px-4 py-2.5 text-xs font-bold text-white"
                >
                  List Your First Item
                </Link>
              </div>
            )}
          </div>

          {/* Offers */}

          <div className="rounded-2xl border border-[#E7DDDF] bg-white p-6 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-bold uppercase tracking-wider text-[#8A2638]">
                  Marketplace Activity
                </p>

                <h2 className="mt-1 text-xl font-black text-[#21191B]">
                  Recent Offers
                </h2>
              </div>

              <Link
                to="/offers"
                className="text-sm font-bold text-[#5B1725]"
              >
                Manage →
              </Link>
            </div>

            {latestOffers.length > 0 ? (
              <div className="mt-5 divide-y divide-[#EEE6E8]">
                {latestOffers.map((offer) => {
                  const isReceived =
                    offer.direction ===
                    "received";

                  const otherPerson =
                    isReceived
                      ? offer.sender
                      : offer.receiver;

                  const item =
                    isReceived
                      ? offer.offeredListing
                      : offer.requestedListing;

                  const image =
                    getListingImage(item);

                  return (
                    <div
                      key={`${offer.direction}-${offer.id}`}
                      className="flex gap-3 py-4 first:pt-0 last:pb-0"
                    >
                      <div className="h-12 w-12 shrink-0 overflow-hidden rounded-xl bg-[#F3E7E9]">
                        {image ? (
                          <img
                            src={image}
                            alt={
                              item?.title ||
                              "Item"
                            }
                            className="h-full w-full object-cover"
                          />
                        ) : (
                          <div className="flex h-full w-full items-center justify-center">
                            🤝
                          </div>
                        )}
                      </div>

                      <div className="min-w-0 flex-1">
                        <div className="flex items-start justify-between gap-2">
                          <p className="truncate text-sm font-bold text-[#21191B]">
                            {isReceived
                              ? "Offer received"
                              : "Offer sent"}
                          </p>

                          <span
                            className={`shrink-0 rounded-full border px-2 py-1 text-[9px] font-bold uppercase ${getStatusClasses(
                              offer.status
                            )}`}
                          >
                            {formatStatus(
                              offer.status
                            )}
                          </span>
                        </div>

                        <p className="mt-1 truncate text-xs text-gray-500">
                          {otherPerson?.name ||
                            "Trader"}
                          {" · "}
                          {item?.title ||
                            "Item"}
                        </p>

                        <p className="mt-1 text-xs text-gray-400">
                          {formatDate(
                            offer.createdAt
                          )}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="mt-5 rounded-xl border border-dashed border-[#D8C5C9] p-6 text-center">
                <div className="text-3xl">
                  🤝
                </div>

                <p className="mt-2 text-sm font-bold text-[#21191B]">
                  No offers yet
                </p>

                <p className="mt-1 text-xs leading-5 text-gray-500">
                  Offers you send or receive will
                  appear here.
                </p>
              </div>
            )}
          </div>
        </section>

        {/* =====================================================
            QUICK ACTIONS
        ====================================================== */}

        <section className="mt-6">
          <div className="mb-4">
            <p className="text-xs font-bold uppercase tracking-wider text-[#8A2638]">
              Quick access
            </p>

            <h2 className="mt-1 text-xl font-black text-[#21191B]">
              What would you like to do?
            </h2>
          </div>

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">

            <Link
              to="/marketplace"
              className="group rounded-2xl border border-[#E7DDDF] bg-white p-5 shadow-sm transition hover:-translate-y-1 hover:border-[#D8B84C]/60 hover:shadow-lg"
            >
              <div className="flex items-center justify-between">
                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#F5E8EB] text-xl">
                  🛍️
                </div>

                <span className="text-lg text-[#C9A227] transition group-hover:translate-x-1">
                  →
                </span>
              </div>

              <h3 className="mt-4 text-base font-black text-[#21191B]">
                Marketplace
              </h3>

              <p className="mt-1 text-sm leading-5 text-gray-500">
                Discover items available for barter.
              </p>
            </Link>

            <Link
              to="/listings/create"
              className="group rounded-2xl border border-[#E7DDDF] bg-white p-5 shadow-sm transition hover:-translate-y-1 hover:border-[#D8B84C]/60 hover:shadow-lg"
            >
              <div className="flex items-center justify-between">
                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#FBF3D8] text-xl">
                  ➕
                </div>

                <span className="text-lg text-[#C9A227] transition group-hover:translate-x-1">
                  →
                </span>
              </div>

              <h3 className="mt-4 text-base font-black text-[#21191B]">
                List an Item
              </h3>

              <p className="mt-1 text-sm leading-5 text-gray-500">
                Put something up for barter.
              </p>
            </Link>

            <Link
              to="/offers"
              className="group rounded-2xl border border-[#E7DDDF] bg-white p-5 shadow-sm transition hover:-translate-y-1 hover:border-[#D8B84C]/60 hover:shadow-lg"
            >
              <div className="flex items-center justify-between">
                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#F5E8EB] text-xl">
                  🤝
                </div>

                <span className="text-lg text-[#C9A227] transition group-hover:translate-x-1">
                  →
                </span>
              </div>

              <h3 className="mt-4 text-base font-black text-[#21191B]">
                Trade Offers
              </h3>

              <p className="mt-1 text-sm leading-5 text-gray-500">
                Review offers sent and received.
              </p>
            </Link>

            <Link
              to="/trades"
              className="group rounded-2xl border border-[#E7DDDF] bg-white p-5 shadow-sm transition hover:-translate-y-1 hover:border-[#D8B84C]/60 hover:shadow-lg"
            >
              <div className="flex items-center justify-between">
                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#F5E8EB] text-xl">
                  📋
                </div>

                <span className="text-lg text-[#C9A227] transition group-hover:translate-x-1">
                  →
                </span>
              </div>

              <h3 className="mt-4 text-base font-black text-[#21191B]">
                My Trades
              </h3>

              <p className="mt-1 text-sm leading-5 text-gray-500">
                Follow your active and completed trades.
              </p>
            </Link>
          </div>
        </section>

        {/* =====================================================
            ACCOUNT PERFORMANCE
        ====================================================== */}

        <section className="mt-6 overflow-hidden rounded-2xl border border-[#E7DDDF] bg-white shadow-sm">
          <div className="border-b border-[#EEE6E8] bg-[#FCF8F9] px-6 py-5">
            <p className="text-xs font-bold uppercase tracking-wider text-[#8A2638]">
              Account performance
            </p>

            <h2 className="mt-1 text-xl font-black text-[#21191B]">
              Your Barter Trace activity
            </h2>
          </div>

          <div className="grid divide-y divide-[#EEE6E8] sm:grid-cols-2 sm:divide-x sm:divide-y-0 lg:grid-cols-4">

            <div className="p-6">
              <p className="text-xs font-bold uppercase tracking-wider text-gray-400">
                Total listings
              </p>

              <p className="mt-2 text-2xl font-black text-[#5B1725]">
                {listings.length}
              </p>

              <p className="mt-1 text-xs text-gray-500">
                {activeListings.length} active ·{" "}
                {reservedListings.length} reserved
              </p>
            </div>

            <div className="p-6">
              <p className="text-xs font-bold uppercase tracking-wider text-gray-400">
                Total offers
              </p>

              <p className="mt-2 text-2xl font-black text-[#5B1725]">
                {totalOffers}
              </p>

              <p className="mt-1 text-xs text-gray-500">
                {pendingOffers} currently pending
              </p>
            </div>

            <div className="p-6">
              <p className="text-xs font-bold uppercase tracking-wider text-gray-400">
                Active trades
              </p>

              <p className="mt-2 text-2xl font-black text-[#5B1725]">
                {activeTrades.length}
              </p>

              <p className="mt-1 text-xs text-gray-500">
                Across all trade stages
              </p>
            </div>

            <div className="p-6">
              <p className="text-xs font-bold uppercase tracking-wider text-gray-400">
                Barter score
              </p>

              <p className="mt-2 text-2xl font-black text-[#5B1725]">
                {barterScore.toLocaleString()}
              </p>

              <p className="mt-1 text-xs text-gray-500">
                Persisted marketplace score
              </p>
            </div>

          </div>
        </section>

        {/* =====================================================
            FOOTER CTA
        ====================================================== */}

        <section className="mt-6 overflow-hidden rounded-2xl bg-[#3D0F18] p-6 shadow-lg sm:p-8">
          <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#D8B84C]">
                Keep trading
              </p>

              <h2 className="mt-2 text-2xl font-black text-white">
                Trade what you have for what you need.
              </h2>

              <p className="mt-2 max-w-2xl text-sm leading-6 text-white/60">
                Explore the marketplace, discover useful
                items and build your barter reputation.
              </p>
            </div>

            <Link
              to="/marketplace"
              className="shrink-0 rounded-xl bg-white px-6 py-3 text-center text-sm font-black text-[#3D0F18] transition hover:bg-[#F8F5F3]"
            >
              Explore Marketplace →
            </Link>
          </div>
        </section>

      </main>
    </div>
  );
};

export default Dashboard;
