

import { useEffect, useMemo, useState } from "react";

import { Link, useNavigate } from "react-router-dom";

import { useAuth } from "../context/AuthContext";

import { getMyListings } from "../api/listingApi";

import { getReceivedOffers, getSentOffers,} from "../api/offerApi";

import { getTrades } from "../api/tradeApi";

import MyPromotions from "../components/MyPromotions";

import { Crown} from "lucide-react";



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

     \* The authenticated user is the primary source.

     \*

     \* The trade API also returns the current trader with:

     \* phone, location, barterScore and completedTrades.

     \*

     \* Using that participant record gives the dashboard the

     \* latest persisted barter score returned by the backend.

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

   \* IMPORTANT:

   \*

   \* Do not calculate Barter Score from frontend activity.

   \*

   \* barterScore is a persisted backend value and ratings

   \* contribute to it. The dashboard displays that persisted

   \* value directly.

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
    <div className="min-h-screen bg-[#F8F5F3]">
      <main className="mx-auto w-full max-w-7xl px-4 py-5 sm:px-6 sm:py-7 lg:px-8">
        {/* TOP BAR */}
        <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <div className="flex items-center gap-2">
              <span className="h-2 w-2 rounded-full bg-[#D6B15E]" />
              <p className="text-xs font-extrabold uppercase tracking-[0.18em] text-[#8A2638]">Trading workspace</p>
            </div>
            <h1 className="mt-1.5 text-2xl font-black tracking-tight text-[#21191B] sm:text-3xl">Dashboard</h1>
            <p className="mt-1 text-sm text-gray-500">A quick view of your marketplace activity and what needs attention.</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Link to="/marketplace" className="rounded-xl border border-[#D8C9CC] bg-white px-4 py-2.5 text-sm font-bold text-[#5B1725] shadow-sm transition hover:border-[#5B1725]">Browse marketplace</Link>
            <Link to="/listings/create" className="rounded-xl bg-[#5B1725] px-4 py-2.5 text-sm font-bold text-white shadow-sm transition hover:bg-[#3D0F18]">+ Create listing</Link>
          </div>
        </div>

        {/* HERO / ACCOUNT OVERVIEW */}
        <section className="relative overflow-hidden rounded-[1.75rem] border border-[#4D1320] bg-[#3D0F18] shadow-[0_18px_50px_rgba(61,15,24,0.18)]">
          <div className="pointer-events-none absolute -right-24 -top-28 h-72 w-72 rounded-full border border-white/10" />
          <div className="pointer-events-none absolute -right-10 -top-12 h-44 w-44 rounded-full bg-[#D6B15E]/10 blur-2xl" />
          <div className="pointer-events-none absolute -bottom-32 left-1/3 h-64 w-64 rounded-full bg-[#8A2638]/50 blur-3xl" />

          <div className="relative grid gap-6 p-5 sm:p-7 lg:grid-cols-[1.45fr_0.75fr] lg:items-stretch lg:p-8">
            <div className="flex min-w-0 flex-col justify-between">
              <div>
                <div className="flex items-center gap-2 text-[#E5C86E]">
                  <span className="text-sm">✦</span>
                  <p className="text-xs font-extrabold uppercase tracking-[0.2em]">BarterConnekt overview</p>
                </div>
                <h2 className="mt-4 max-w-2xl text-3xl font-black tracking-tight text-white sm:text-4xl">
                  Welcome back{dashboardUser?.name ? `, ${dashboardUser.name.split(" ")[0]}` : ""}.
                </h2>
                <p className="mt-3 max-w-xl text-sm leading-6 text-white/65 sm:text-base">
                  Your trading command center — listings, offers, active exchanges and reputation in one focused view.
                </p>
              </div>

              <div className="mt-7 grid max-w-2xl grid-cols-2 gap-2 sm:grid-cols-4">
                {[
                  ["Barter Score", barterScore.toLocaleString(), "★"],
                  ["Completed", completedTrades.toLocaleString(), "✓"],
                  ["Active Listings", activeListings.length, "□"],
                  ["Pending Offers", pendingOffers, "↔"],
                ].map(([label, value, icon]) => (
                  <div key={label} className="rounded-2xl border border-white/10 bg-white/[0.07] p-3.5 backdrop-blur-sm">
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-[10px] font-bold uppercase tracking-wider text-white/45">{label}</p>
                      <span className="text-xs text-[#E5C86E]">{icon}</span>
                    </div>
                    <p className="mt-2 text-xl font-black text-white">{value}</p>
                  </div>
                ))}
              </div>
            </div>

            <Link to="/profile" className="group relative overflow-hidden rounded-3xl border border-white/10 bg-white/[0.08] p-5 backdrop-blur-md transition hover:bg-white/[0.12]">
              <div className="absolute right-4 top-4 text-white/30 transition group-hover:translate-x-1">→</div>
              <div className="flex items-center gap-4">
                <div className="relative shrink-0">
                  {dashboardUser?.avatar ? (
                    <img src={dashboardUser.avatar} alt={`${dashboardUser.name || "User"} avatar`} className="h-16 w-16 rounded-2xl border-2 border-[#D6B15E] bg-white object-cover shadow-lg" />
                  ) : (
                    <div className="flex h-16 w-16 items-center justify-center rounded-2xl border-2 border-[#D6B15E] bg-[#8A2638] text-xl font-black text-white shadow-lg">{initials}</div>
                  )}
                  <span className="absolute -bottom-1 -right-1 h-4 w-4 rounded-full border-2 border-[#3D0F18] bg-emerald-400" />
                </div>
                <div className="min-w-0 pr-5">
                  <p className="truncate text-base font-black text-white">{dashboardUser?.name || "Barter Trader"}</p>
                  <p className="mt-1 truncate text-xs text-white/50">{dashboardUser?.email || "Account information"}</p>
                  {dashboardUser?.location && <p className="mt-1.5 truncate text-xs text-white/55">📍 {dashboardUser.location}</p>}
                </div>
              </div>

              <div className="mt-5 grid grid-cols-2 gap-2 border-t border-white/10 pt-4">
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-wider text-white/35">Account</p>
                  <p className="mt-1 text-xs font-bold capitalize text-white/80">{String(dashboardUser?.status || "ACTIVE").toLowerCase()}</p>
                </div>
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-wider text-white/35">Member since</p>
                  <p className="mt-1 text-xs font-bold text-white/80">{dashboardUser?.createdAt ? formatDate(dashboardUser.createdAt) : "—"}</p>
                </div>
              </div>
            </Link>
          </div>
        </section>

        {dataError && (
          <div className="mt-5 flex items-start gap-3 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
            <span>⚠️</span><div><p className="font-bold text-red-800">Dashboard data unavailable</p><p className="mt-0.5">{dataError}</p></div>
          </div>
        )}

        {/* ACTION CENTER */}
        <section className="mt-6 grid gap-5 lg:grid-cols-[1.35fr_0.65fr]">
          <div className="overflow-hidden rounded-3xl border border-[#E7DDDF] bg-white shadow-sm">
            <div className="flex flex-col gap-3 border-b border-[#EEE6E8] px-5 py-5 sm:flex-row sm:items-center sm:justify-between sm:px-6">
              <div>
                <div className="flex items-center gap-2">
                  <p className="text-xs font-extrabold uppercase tracking-wider text-[#8A2638]">Action center</p>
                  {actionRequiredCount > 0 && <span className="rounded-full bg-[#5B1725] px-2 py-0.5 text-[10px] font-black text-white">{actionRequiredCount}</span>}
                </div>
                <h2 className="mt-1 text-xl font-black text-[#21191B]">What needs your attention</h2>
              </div>
              {actionRequiredCount === 0 && <span className="w-fit rounded-full bg-emerald-50 px-3 py-1.5 text-xs font-bold text-emerald-700">✓ All caught up</span>}
            </div>

            <div className="grid sm:grid-cols-3">
              {[
                { to: "/offers", icon: "↔", value: pendingReceivedOffers.length, title: "Offers to review", text: "New proposals waiting for your response." },
                { to: "/trades", icon: "⇄", value: activeTrades.length, title: "Active trades", text: "Exchanges currently moving forward." },
                { to: "/trades", icon: "!", value: disputedTrades.length, title: "Disputes", text: "Trades that may require your attention." },
              ].map((item, index) => (
                <Link key={item.title} to={item.to} className={`group p-5 transition hover:bg-[#FCF8F9] ${index !== 0 ? "border-t border-[#EEE6E8] sm:border-l sm:border-t-0" : ""}`}>
                  <div className="flex items-start justify-between">
                    <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#F7ECEE] text-lg font-black text-[#5B1725]">{item.icon}</span>
                    <span className="text-[#B89235] transition group-hover:translate-x-1">→</span>
                  </div>
                  <p className="mt-4 text-2xl font-black text-[#5B1725]">{item.value}</p>
                  <p className="mt-1 text-sm font-bold text-[#21191B]">{item.title}</p>
                  <p className="mt-1 text-xs leading-5 text-gray-500">{item.text}</p>
                </Link>
              ))}
            </div>
          </div>

          <div className="rounded-3xl border border-[#E7DDDF] bg-[#FFFDFB] p-5 shadow-sm sm:p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-extrabold uppercase tracking-wider text-[#8A2638]">Inventory pulse</p>
                <h2 className="mt-1 text-xl font-black text-[#21191B]">Listings value</h2>
              </div>
              <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#F5E8EB]">📦</span>
            </div>
            <p className="mt-6 text-3xl font-black tracking-tight text-[#5B1725]">{formatPrice(totalListingValue)}</p>
            <p className="mt-1 text-xs text-gray-500">Estimated value across {listings.length} listing{listings.length === 1 ? "" : "s"}.</p>
            <div className="mt-5 h-2 overflow-hidden rounded-full bg-[#F1E8EA]">
              <div className="h-full rounded-full bg-[#5B1725]" style={{ width: `${listings.length ? Math.max(12, (activeListings.length / listings.length) * 100) : 0}%` }} />
            </div>
            <div className="mt-3 flex items-center justify-between text-xs">
              <span className="font-semibold text-gray-500">{activeListings.length} active</span>
              <span className="font-semibold text-gray-500">{reservedListings.length} reserved</span>
            </div>
            <Link to="/my-listings" className="mt-5 inline-flex text-sm font-bold text-[#5B1725] hover:underline">Manage listings →</Link>
          </div>
        </section>

        {/* TRADES + PROFILE SNAPSHOT */}
        <section className="mt-6 grid gap-5 lg:grid-cols-[1.45fr_0.55fr]">
          <div className="rounded-3xl border border-[#E7DDDF] bg-white p-5 shadow-sm sm:p-6">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <p className="text-xs font-extrabold uppercase tracking-wider text-[#8A2638]">Trade activity</p>
                <h2 className="mt-1 text-xl font-black text-[#21191B]">Exchange pipeline</h2>
                <p className="mt-1 text-sm text-gray-500">Follow your latest trades from agreement to completion.</p>
              </div>
              <Link to="/trades" className="text-sm font-bold text-[#5B1725] hover:underline">View all →</Link>
            </div>

            <div className="mt-5 grid grid-cols-3 overflow-hidden rounded-2xl border border-[#EEE6E8] bg-[#FCFAF9]">
              {[["Active", activeTrades.length], ["Completed", completedTradeRecords.length], ["Disputed", disputedTrades.length]].map(([label, value], index) => (
                <div key={label} className={`p-3.5 text-center sm:p-4 ${index ? "border-l border-[#EEE6E8]" : ""}`}>
                  <p className="text-xl font-black text-[#5B1725] sm:text-2xl">{value}</p>
                  <p className="mt-1 text-[10px] font-bold uppercase tracking-wider text-gray-400">{label}</p>
                </div>
              ))}
            </div>

            {latestTrades.length > 0 ? (
              <div className="mt-5 space-y-2">
                {latestTrades.map((trade) => {
                  const isTraderA = trade.traderAId === dashboardUser?.id;
                  const partner = isTraderA ? trade.traderB : trade.traderA;
                  return (
                    <button key={trade.id} type="button" onClick={() => navigate(`/trades/${trade.id}`)} className="group flex w-full items-center gap-3 rounded-2xl border border-transparent p-3 text-left transition hover:border-[#E7DDDF] hover:bg-[#FCF8F9]">
                      <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[#F5E8EB] text-lg">🤝</div>
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="truncate text-sm font-bold text-[#21191B]">{trade.tradeNumber || "Barter Trade"}</p>
                          <span className={`rounded-full border px-2 py-0.5 text-[9px] font-bold uppercase ${getStatusClasses(trade.status)}`}>{formatStatus(trade.status)}</span>
                        </div>
                        <p className="mt-1 truncate text-xs text-gray-500">with {partner?.name || "Trade partner"} · {formatDate(trade.createdAt)}</p>
                      </div>
                      <span className="text-gray-300 transition group-hover:translate-x-1 group-hover:text-[#B89235]">→</span>
                    </button>
                  );
                })}
              </div>
            ) : (
              <div className="mt-5 rounded-2xl border border-dashed border-[#D8C5C9] bg-[#FCF8F9] p-7 text-center">
                <div className="text-3xl">🤝</div>
                <p className="mt-2 text-sm font-black text-[#21191B]">No trades yet</p>
                <p className="mt-1 text-sm text-gray-500">Accepted offers will appear here.</p>
                <Link to="/marketplace" className="mt-4 inline-flex rounded-xl bg-[#5B1725] px-4 py-2.5 text-xs font-bold text-white">Explore marketplace</Link>
              </div>
            )}
          </div>

          <div className="rounded-3xl border border-[#E7DDDF] bg-white p-5 shadow-sm sm:p-6">
            <div className="flex items-center justify-between">
              <div><p className="text-xs font-extrabold uppercase tracking-wider text-[#8A2638]">Account</p><h2 className="mt-1 text-xl font-black text-[#21191B]">Profile snapshot</h2></div>
              <Link to="/profile" className="text-sm font-bold text-[#5B1725]">Edit</Link>
            </div>
            <div className="mt-5 divide-y divide-[#EEE6E8]">
              {[
                ["Full name", dashboardUser?.name || "Not provided"],
                ["Phone", dashboardUser?.phone || "Not provided"],
                ["Location", dashboardUser?.location || "Not provided"],
                ["Status", String(dashboardUser?.status || "ACTIVE").toLowerCase()],
              ].map(([label, value]) => (
                <div key={label} className="py-3 first:pt-0 last:pb-0">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-gray-400">{label}</p>
                  <p className="mt-1 truncate text-sm font-bold capitalize text-[#21191B]">{value}</p>
                </div>
              ))}
            </div>
            <Link to="/account/subscription" className="mt-5 flex items-center justify-between rounded-2xl bg-[#FBF5E5] p-4 transition hover:bg-[#F7EDCF]">
              <div className="flex items-center gap-3"><span className="flex h-9 w-9 items-center justify-center rounded-xl bg-white"><Crown size={18} className="text-amber-600" /></span><div><p className="text-xs font-black text-[#21191B]">My subscription</p><p className="mt-0.5 text-[11px] text-gray-500">Manage your plan</p></div></div>
              <span className="text-[#B89235]">→</span>
            </Link>
          </div>
        </section>

        {/* LISTINGS + OFFERS */}
        <section className="mt-6 grid gap-5 lg:grid-cols-2">
          <div className="rounded-3xl border border-[#E7DDDF] bg-white p-5 shadow-sm sm:p-6">
            <div className="flex items-center justify-between gap-4">
              <div><p className="text-xs font-extrabold uppercase tracking-wider text-[#8A2638]">Inventory</p><h2 className="mt-1 text-xl font-black text-[#21191B]">Latest listings</h2></div>
              <Link to="/my-listings" className="text-sm font-bold text-[#5B1725]">Manage →</Link>
            </div>
            {latestListings.length > 0 ? (
              <div className="mt-5 space-y-2.5">
                {latestListings.map((listing) => {
                  const image = getListingImage(listing);
                  return (
                    <Link key={listing.id} to={`/listings/${listing.id}`} className="group flex gap-3 rounded-2xl border border-[#EEE6E8] p-3 transition hover:border-[#D8B84C]/60 hover:bg-[#FFFCFA]">
                      <div className="h-16 w-16 shrink-0 overflow-hidden rounded-xl bg-[#F3E7E9]">{image ? <img src={image} alt={listing.title || "Listing"} className="h-full w-full object-cover transition duration-300 group-hover:scale-105" /> : <div className="flex h-full w-full items-center justify-center text-xl">📦</div>}</div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-start justify-between gap-2"><h3 className="truncate text-sm font-bold text-[#21191B]">{listing.title || "Untitled item"}</h3><span className={`shrink-0 rounded-full border px-2 py-0.5 text-[9px] font-bold uppercase ${getStatusClasses(listing.status)}`}>{formatStatus(listing.status)}</span></div>
                        <p className="mt-1 truncate text-xs text-gray-500">{listing.category?.name || "Uncategorized"}</p>
                        <p className="mt-1.5 text-xs font-black text-[#5B1725]">{formatPrice(listing.estimatedValue)}</p>
                      </div>
                    </Link>
                  );
                })}
              </div>
            ) : (
              <div className="mt-5 rounded-2xl border border-dashed border-[#D8C5C9] p-6 text-center"><div className="text-3xl">📦</div><p className="mt-2 text-sm font-bold text-[#21191B]">No listings yet</p><Link to="/listings/create" className="mt-4 inline-flex rounded-xl bg-[#5B1725] px-4 py-2.5 text-xs font-bold text-white">List your first item</Link></div>
            )}
          </div>

          <div className="rounded-3xl border border-[#E7DDDF] bg-white p-5 shadow-sm sm:p-6">
            <div className="flex items-center justify-between gap-4">
              <div><p className="text-xs font-extrabold uppercase tracking-wider text-[#8A2638]">Marketplace</p><h2 className="mt-1 text-xl font-black text-[#21191B]">Recent offers</h2></div>
              <Link to="/offers" className="text-sm font-bold text-[#5B1725]">Manage →</Link>
            </div>
            {latestOffers.length > 0 ? (
              <div className="mt-5 space-y-2.5">
                {latestOffers.map((offer) => {
                  const isReceived = offer.direction === "received";
                  const otherPerson = isReceived ? offer.sender : offer.receiver;
                  const item = isReceived ? offer.offeredListing : offer.requestedListing;
                  const image = getListingImage(item);
                  return (
                    <div key={`${offer.direction}-${offer.id}`} className="flex gap-3 rounded-2xl border border-[#EEE6E8] p-3">
                      <div className="h-12 w-12 shrink-0 overflow-hidden rounded-xl bg-[#F3E7E9]">{image ? <img src={image} alt={item?.title || "Item"} className="h-full w-full object-cover" /> : <div className="flex h-full w-full items-center justify-center">↔</div>}</div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-start justify-between gap-2"><p className="truncate text-sm font-bold text-[#21191B]">{isReceived ? "Offer received" : "Offer sent"}</p><span className={`shrink-0 rounded-full border px-2 py-0.5 text-[9px] font-bold uppercase ${getStatusClasses(offer.status)}`}>{formatStatus(offer.status)}</span></div>
                        <p className="mt-1 truncate text-xs text-gray-500">{otherPerson?.name || "Trader"} · {item?.title || "Item"}</p>
                        <p className="mt-1 text-[11px] text-gray-400">{formatDateTime(offer.createdAt)}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="mt-5 rounded-2xl border border-dashed border-[#D8C5C9] p-6 text-center"><div className="text-3xl">↔</div><p className="mt-2 text-sm font-bold text-[#21191B]">No offers yet</p><p className="mt-1 text-xs text-gray-500">Offers you send or receive will appear here.</p></div>
            )}
          </div>
        </section>

        {/* PROMOTIONS */}
        <section className="mt-6 overflow-hidden rounded-3xl border border-[#E7DDDF] bg-white shadow-sm">
          <div className="border-b border-[#EEE6E8] bg-gradient-to-r from-[#FCF8F9] to-white px-5 py-5 sm:px-6">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
              <div><p className="text-xs font-extrabold uppercase tracking-wider text-[#8A2638]">Visibility</p><h2 className="mt-1 text-xl font-black text-[#21191B]">Promotion performance</h2><p className="mt-1 text-sm text-gray-500">Manage promoted listings and see how your boosted inventory is performing.</p></div>
              <span className="w-fit rounded-full border border-[#E9DCA9] bg-[#FFF9E8] px-3 py-1.5 text-xs font-bold text-[#8A6A18]">Featured reach</span>
            </div>
          </div>
          <div className="p-4 sm:p-5"><MyPromotions /></div>
        </section>

        {/* QUICK ACCESS */}
        <section className="mt-6">
          <div className="mb-4"><p className="text-xs font-extrabold uppercase tracking-wider text-[#8A2638]">Quick access</p><h2 className="mt-1 text-xl font-black text-[#21191B]">Keep trading</h2></div>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {[
              { to: "/marketplace", icon: "⌕", title: "Marketplace", text: "Discover items to barter." },
              { to: "/listings/create", icon: "+", title: "List an item", text: "Add something you can trade." },
              { to: "/offers", icon: "↔", title: "Trade offers", text: `${totalOffers} total offers.` },
              { to: "/trades", icon: "✓", title: "My trades", text: "Follow every exchange." },
            ].map((item) => (
              <Link key={item.title} to={item.to} className="group flex items-center gap-4 rounded-2xl border border-[#E7DDDF] bg-white p-4 shadow-sm transition hover:-translate-y-0.5 hover:border-[#D6B15E]/70 hover:shadow-md">
                <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[#F6EAEC] text-lg font-black text-[#5B1725]">{item.icon}</span>
                <div className="min-w-0 flex-1"><p className="text-sm font-black text-[#21191B]">{item.title}</p><p className="mt-0.5 truncate text-xs text-gray-500">{item.text}</p></div>
                <span className="text-[#C0A05A] transition group-hover:translate-x-1">→</span>
              </Link>
            ))}
          </div>
        </section>
      </main>
    </div>
  );
};

export default Dashboard;
