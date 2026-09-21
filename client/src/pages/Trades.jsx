
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { getTrades } from "../api/tradeApi";

const statusStyles = {
  PENDING: "bg-amber-50 text-amber-700 border border-amber-200",
  AGREED: "bg-blue-50 text-blue-700 border border-blue-200",
  VERIFICATION: "bg-purple-50 text-purple-700 border border-purple-200",
  READY_FOR_HANDOVER:
    "bg-indigo-50 text-indigo-700 border border-indigo-200",
  IN_PROGRESS:
    "bg-orange-50 text-orange-700 border border-orange-200",
  COMPLETED: "bg-green-50 text-green-700 border border-green-200",
  CANCELLED: "bg-gray-100 text-gray-700 border border-gray-200",
  DISPUTED: "bg-red-50 text-red-700 border border-red-200",
};

const formatStatus = (status) => {
  return (
    status
      ?.replaceAll("_", " ")
      .toLowerCase()
      .replace(/\b\w/g, (letter) => letter.toUpperCase()) ||
    "Unknown"
  );
};

const formatDate = (date) => {
  if (!date) return "Unknown date";

  return new Date(date).toLocaleDateString("en-KE", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
};

const getListingImage = (listing) => {
  return (
    listing?.images?.[0]?.url ||
    listing?.images?.[0]?.imageUrl ||
    "https://placehold.co/600x400?text=No+Image"
  );
};

const formatCurrency = (value) => {
  const amount = Number(value);

  if (!Number.isFinite(amount) || amount <= 0) {
    return "Value not set";
  }

  return `KES ${amount.toLocaleString("en-KE")}`;
};

const getInitial = (name, fallback = "U") => {
  return (
    name?.trim()?.charAt(0)?.toUpperCase() ||
    fallback
  );
};

const Trades = () => {
  const navigate = useNavigate();

  const [trades, setTrades] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const loadTrades = async () => {
      try {
        setLoading(true);
        setError("");

        const response = await getTrades();

        setTrades(response.trades || []);
      } catch (error) {
        console.error("Load trades error:", error);

        setError(
          error.response?.data?.message ||
            "Unable to load your trades."
        );
      } finally {
        setLoading(false);
      }
    };

    loadTrades();
  }, []);

  /* ============================================================
     LOADING STATE
  ============================================================ */

  if (loading) {
    return (
      <div className="min-h-screen bg-[#F8F5F3]">
        <main className="mx-auto w-full max-w-6xl px-4 py-6 sm:px-6 sm:py-8 lg:px-8 lg:py-10">
          <div className="animate-pulse">

            {/* Header skeleton */}
            <div className="mb-8">
              <div className="h-4 w-32 rounded bg-[#E7DDDF]" />

              <div className="mt-3 h-10 w-52 rounded-lg bg-[#E7DDDF] sm:h-12 sm:w-64" />

              <div className="mt-3 h-4 w-full max-w-xl rounded bg-[#E7DDDF]" />
            </div>

            {/* Cards skeleton */}
            <div className="grid gap-5 md:grid-cols-2">
              {[1, 2, 3, 4].map((item) => (
                <div
                  key={item}
                  className="overflow-hidden rounded-3xl border border-[#E7DDDF] bg-white shadow-sm"
                >
                  <div className="h-20 bg-[#E7DDDF]" />

                  <div className="p-5">
                    <div className="h-10 w-10 rounded-full bg-[#E7DDDF]" />

                    <div className="mt-5 grid grid-cols-2 gap-3">
                      <div>
                        <div className="h-3 w-20 rounded bg-[#E7DDDF]" />
                        <div className="mt-2 h-32 rounded-xl bg-[#E7DDDF]" />
                      </div>

                      <div>
                        <div className="h-3 w-20 rounded bg-[#E7DDDF]" />
                        <div className="mt-2 h-32 rounded-xl bg-[#E7DDDF]" />
                      </div>
                    </div>

                    <div className="mt-5 h-12 rounded-xl bg-[#E7DDDF]" />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F8F5F3]">

      {/* ========================================================
          PAGE HEADER
      ========================================================= */}

      <section className="bg-[#3D0F18]">
        <div className="mx-auto w-full max-w-6xl px-4 py-7 sm:px-6 sm:py-9 lg:px-8 lg:py-10">

          <button
            type="button"
            onClick={() => navigate("/")}
            className="mb-6 inline-flex items-center gap-2 text-sm font-semibold text-white/70 transition hover:text-white"
          >
            <span className="text-lg">←</span>
            Back to marketplace
          </button>

          <div>
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#DCAEB7]">
              Barter Trade
            </p>

            <h1 className="mt-2 text-3xl font-black tracking-tight text-white sm:text-4xl lg:text-5xl">
              My Trades
            </h1>

            <p className="mt-3 max-w-2xl text-sm leading-6 text-white/70 sm:text-base">
              Track your barter exchanges, monitor trade progress,
              and manage your completed trades.
            </p>
          </div>

        </div>
      </section>

      {/* ========================================================
          MAIN CONTENT
      ========================================================= */}

      <main className="mx-auto w-full max-w-6xl px-4 py-7 sm:px-6 sm:py-9 lg:px-8 lg:py-10">

        {/* ERROR */}
        {error && (
          <div className="mb-6 flex items-start gap-3 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm font-semibold leading-6 text-red-700">
            <span className="shrink-0 text-base">⚠️</span>

            <p>{error}</p>
          </div>
        )}

        {/* ======================================================
            EMPTY STATE
        ====================================================== */}

        {!error && trades.length === 0 && (
          <div className="rounded-3xl border border-[#E7DDDF] bg-white px-5 py-14 text-center shadow-sm sm:px-8 sm:py-16">

            <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-3xl bg-[#F5E8EB] text-4xl">
              🔄
            </div>

            <p className="mt-6 text-xs font-bold uppercase tracking-[0.16em] text-[#8A2638]">
              Trading activity
            </p>

            <h2 className="mt-2 text-2xl font-black tracking-tight text-[#21191B] sm:text-3xl">
              No trades yet
            </h2>

            <p className="mx-auto mt-3 max-w-md text-sm leading-6 text-gray-500">
              Once another user accepts your barter offer,
              your trade will appear here so you can track its progress.
            </p>

            <button
              type="button"
              onClick={() => navigate("/")}
              className="mt-7 inline-flex items-center justify-center rounded-xl bg-[#5B1725] px-6 py-3 text-sm font-bold text-white shadow-sm transition hover:bg-[#3D0F18]"
            >
              Browse Marketplace
            </button>

          </div>
        )}

        {/* ======================================================
            TRADES
        ====================================================== */}

        {trades.length > 0 && (
          <>
            {/* SECTION HEADER */}

            <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">

              <div>
                <p className="text-xs font-bold uppercase tracking-[0.16em] text-[#8A2638]">
                  Trading activity
                </p>

                <h2 className="mt-1 text-2xl font-black tracking-tight text-[#21191B] sm:text-3xl">
                  Your trades
                </h2>

                <p className="mt-1 text-sm text-gray-500">
                  {trades.length}{" "}
                  {trades.length === 1 ? "trade" : "trades"} in your account
                </p>
              </div>

            </div>

            {/* TRADE GRID */}

            <div className="grid gap-5 md:grid-cols-2">

              {trades.map((trade) => {
                const currentUserId =
                  localStorage.getItem("userId");

                const isTraderA =
                  trade.traderAId === currentUserId;

                const otherTrader = isTraderA
                  ? trade.traderB
                  : trade.traderA;

                const yourListing = isTraderA
                  ? trade.offer?.offeredListing
                  : trade.offer?.requestedListing;

                const theirListing = isTraderA
                  ? trade.offer?.requestedListing
                  : trade.offer?.offeredListing;

                return (
                  <article
                    key={trade.id}
                    className="group overflow-hidden rounded-3xl border border-[#E7DDDF] bg-white shadow-sm transition duration-200 hover:-translate-y-1 hover:shadow-lg"
                  >

                    {/* =================================================
                        TRADE HEADER
                    ================================================== */}

                    <div className="border-b border-[#EEE5E7] bg-[#FBF5F6] px-5 py-4 sm:px-6">

                      <div className="flex items-start justify-between gap-4">

                        <div className="min-w-0">
                          <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-[#8A2638]">
                            Trade
                          </p>

                          <p className="mt-1 truncate text-sm font-black text-[#21191B]">
                            {trade.tradeNumber || "Trade"}
                          </p>
                        </div>

                        <span
                          className={`shrink-0 rounded-full px-3 py-1.5 text-[10px] font-extrabold uppercase tracking-wide ${
                            statusStyles[trade.status] ||
                            "border border-gray-200 bg-gray-100 text-gray-700"
                          }`}
                        >
                          {formatStatus(trade.status)}
                        </span>

                      </div>

                    </div>

                    {/* =================================================
                        TRADE PARTNER
                    ================================================== */}

                    <div className="px-5 pt-5 sm:px-6">

                      <div className="flex items-center gap-3">

                        {otherTrader?.avatar ? (
                          <img
                            src={otherTrader.avatar}
                            alt={
                              otherTrader?.name ||
                              "Trade partner"
                            }
                            className="h-11 w-11 shrink-0 rounded-full border-2 border-[#F5E8EB] object-cover shadow-sm"
                          />
                        ) : (
                          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-[#F5E8EB] text-sm font-black text-[#8A2638]">
                            {getInitial(
                              otherTrader?.name
                            )}
                          </div>
                        )}

                        <div className="min-w-0">
                          <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-gray-400">
                            Trading with
                          </p>

                          <p className="mt-0.5 truncate text-sm font-bold text-[#21191B]">
                            {otherTrader?.name ||
                              "Unknown user"}
                          </p>
                        </div>

                      </div>

                    </div>

                    {/* =================================================
                        ITEMS
                    ================================================== */}

                    <div className="grid grid-cols-1 gap-4 px-5 py-5 sm:grid-cols-2 sm:px-6">

                      {/* YOUR ITEM */}

                      <div className="min-w-0">

                        <div className="mb-2 flex items-center justify-between gap-2">
                          <p className="text-[10px] font-extrabold uppercase tracking-[0.14em] text-[#8A2638]">
                            Your item
                          </p>
                        </div>

                        <div className="overflow-hidden rounded-2xl border border-[#E7DDDF] bg-white">

                          <div className="aspect-4/3 overflow-hidden bg-[#F5E8EB]">
                            <img
                              src={getListingImage(
                                yourListing
                              )}
                              alt={
                                yourListing?.title ||
                                "Your item"
                              }
                              className="h-full w-full object-cover transition duration-300 group-hover:scale-[1.02]"
                              onError={(event) => {
                                event.currentTarget.src =
                                  "https://placehold.co/600x400?text=No+Image";
                              }}
                            />
                          </div>

                          <div className="p-3.5">

                            <p className="line-clamp-2 min-h-10 text-sm font-bold leading-5 text-[#21191B]">
                              {yourListing?.title ||
                                "Item unavailable"}
                            </p>

                            <p className="mt-2 text-xs font-bold text-[#8A2638]">
                              {formatCurrency(
                                trade.agreedValueA
                              )}
                            </p>

                          </div>

                        </div>

                      </div>

                      {/* THEIR ITEM */}

                      <div className="min-w-0">

                        <div className="mb-2 flex items-center justify-between gap-2">
                          <p className="text-[10px] font-extrabold uppercase tracking-[0.14em] text-[#8A2638]">
                            Their item
                          </p>
                        </div>

                        <div className="overflow-hidden rounded-2xl border border-[#E7DDDF] bg-white">

                          <div className="aspect-4/3 overflow-hidden bg-[#F5E8EB]">
                            <img
                              src={getListingImage(
                                theirListing
                              )}
                              alt={
                                theirListing?.title ||
                                "Their item"
                              }
                              className="h-full w-full object-cover transition duration-300 group-hover:scale-[1.02]"
                              onError={(event) => {
                                event.currentTarget.src =
                                  "https://placehold.co/600x400?text=No+Image";
                              }}
                            />
                          </div>

                          <div className="p-3.5">

                            <p className="line-clamp-2 min-h-10 text-sm font-bold leading-5 text-[#21191B]">
                              {theirListing?.title ||
                                "Item unavailable"}
                            </p>

                            <p className="mt-2 text-xs font-bold text-[#8A2638]">
                              {formatCurrency(
                                trade.agreedValueB
                              )}
                            </p>

                          </div>

                        </div>

                      </div>

                    </div>

                    {/* =================================================
                        FOOTER
                    ================================================== */}

                    <div className="border-t border-[#EEE5E7] bg-[#FCFAFA] px-5 py-4 sm:px-6">

                      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">

                        <div className="min-w-0">
                          <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-gray-400">
                            Created
                          </p>

                          <p className="mt-1 text-sm font-semibold text-[#21191B]">
                            {formatDate(
                              trade.createdAt
                            )}
                          </p>
                        </div>

                        <button
                          type="button"
                          onClick={() =>
                            navigate(
                              `/trades/${trade.id}`
                            )
                          }
                          className="inline-flex w-full items-center justify-center rounded-xl bg-[#5B1725] px-5 py-3 text-sm font-bold text-white shadow-sm transition hover:bg-[#3D0F18] sm:w-auto"
                        >
                          View Trade
                          <span className="ml-2 transition-transform group-hover:translate-x-0.5">
                            →
                          </span>
                        </button>

                      </div>

                    </div>

                  </article>
                );
              })}

            </div>
          </>
        )}

      </main>
    </div>
  );
};

export default Trades;

