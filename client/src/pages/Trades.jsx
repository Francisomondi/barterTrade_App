import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

import { getTrades } from "../api/tradeApi";

const statusStyles = {
  PENDING: "bg-yellow-100 text-yellow-800",
  AGREED: "bg-blue-100 text-blue-800",
  VERIFICATION: "bg-purple-100 text-purple-800",
  READY_FOR_HANDOVER: "bg-indigo-100 text-indigo-800",
  IN_PROGRESS: "bg-orange-100 text-orange-800",
  COMPLETED: "bg-green-100 text-green-800",
  CANCELLED: "bg-gray-100 text-gray-700",
  DISPUTED: "bg-red-100 text-red-800",
};

const formatStatus = (status) => {
  return status
    ?.replaceAll("_", " ")
    .toLowerCase()
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
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

  if (loading) {
    return (
      <div className="min-h-screen bg-[#F8F5F3] px-6 py-12">
        <div className="mx-auto max-w-6xl">
          <div className="animate-pulse">
            <div className="h-10 w-48 rounded-lg bg-[#E7DDDF]" />

            <div className="mt-3 h-5 w-72 rounded bg-[#E7DDDF]" />

            <div className="mt-10 grid gap-6 md:grid-cols-2">
              {[1, 2, 3, 4].map((item) => (
                <div
                  key={item}
                  className="overflow-hidden rounded-2xl border border-[#E7DDDF] bg-white"
                >
                  <div className="h-52 bg-[#E7DDDF]" />

                  <div className="space-y-3 p-6">
                    <div className="h-5 w-32 rounded bg-[#E7DDDF]" />
                    <div className="h-4 w-48 rounded bg-[#E7DDDF]" />
                    <div className="h-10 w-full rounded bg-[#E7DDDF]" />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F8F5F3]">
      {/* HEADER */}
      <section className="bg-[#3D0F18] px-6 py-12 text-white">
        <div className="mx-auto max-w-6xl">
          <button
            type="button"
            onClick={() => navigate("/")}
            className="mb-6 text-sm font-semibold text-white/70 transition hover:text-white"
          >
            ← Back to marketplace
          </button>

          <p className="text-sm font-bold uppercase tracking-widest text-[#DCAEB7]">
            Barter Trade
          </p>

          <h1 className="mt-2 text-4xl font-extrabold md:text-5xl">
            My Trades
          </h1>

          <p className="mt-3 max-w-2xl text-white/70">
            Track your active barter exchanges, manage
            trade progress, and complete successful trades.
          </p>
        </div>
      </section>

      {/* CONTENT */}
      <main className="mx-auto max-w-6xl px-6 py-10">
        {error && (
          <div className="mb-6 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
            {error}
          </div>
        )}

        {/* EMPTY STATE */}
        {!error && trades.length === 0 && (
          <div className="rounded-2xl border border-[#E7DDDF] bg-white px-6 py-16 text-center shadow-sm">
            <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-[#F5E8EB] text-4xl">
              🔄
            </div>

            <h2 className="mt-5 text-2xl font-extrabold text-[#21191B]">
              No trades yet
            </h2>

            <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-gray-500">
              Once another user accepts your barter offer,
              your trade will appear here.
            </p>

            <button
              type="button"
              onClick={() => navigate("/")}
              className="mt-6 rounded-xl bg-[#5B1725] px-6 py-3 font-bold text-white transition hover:bg-[#3D0F18]"
            >
              Browse Marketplace
            </button>
          </div>
        )}

        {/* TRADES */}
        {trades.length > 0 && (
          <>
            <div className="mb-6 flex items-center justify-between">
              <div>
                <h2 className="text-2xl font-extrabold text-[#21191B]">
                  Your trades
                </h2>

                <p className="mt-1 text-sm text-gray-500">
                  {trades.length}{" "}
                  {trades.length === 1 ? "trade" : "trades"}
                </p>
              </div>
            </div>

            <div className="grid gap-6 lg:grid-cols-2">
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
                  <div
                    key={trade.id}
                    className="overflow-hidden rounded-2xl border border-[#E7DDDF] bg-white shadow-sm transition hover:-translate-y-1 hover:shadow-lg"
                  >
                    {/* TRADE HEADER */}
                    <div className="flex items-center justify-between border-b border-[#E7DDDF] bg-[#FBF5F6] px-5 py-4">
                      <div>
                        <p className="text-xs font-bold uppercase tracking-wider text-[#8A2638]">
                          Trade
                        </p>

                        <p className="mt-1 font-bold text-[#21191B]">
                          {trade.tradeNumber}
                        </p>
                      </div>

                      <span
                        className={`rounded-full px-3 py-1 text-xs font-bold ${
                          statusStyles[trade.status] ||
                          "bg-gray-100 text-gray-700"
                        }`}
                      >
                        {formatStatus(trade.status)}
                      </span>
                    </div>

                    {/* TRADERS */}
                    <div className="px-5 pt-5">
                      <div className="flex items-center gap-3">
                        {otherTrader?.avatar ? (
                          <img
                            src={otherTrader.avatar}
                            alt=""
                            className="h-10 w-10 rounded-full object-cover"
                          />
                        ) : (
                          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[#F5E8EB] font-bold text-[#8A2638]">
                            {otherTrader?.name
                              ?.charAt(0)
                              ?.toUpperCase() || "U"}
                          </div>
                        )}

                        <div>
                          <p className="text-xs text-gray-500">
                            Trading with
                          </p>

                          <p className="font-bold text-[#21191B]">
                            {otherTrader?.name ||
                              "Unknown user"}
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* ITEMS */}
                    <div className="grid grid-cols-2 gap-4 p-5">
                      {/* YOUR ITEM */}
                      <div>
                        <p className="mb-2 text-xs font-bold uppercase tracking-wider text-[#8A2638]">
                          Your item
                        </p>

                        <div className="overflow-hidden rounded-xl border border-[#E7DDDF]">
                          <img
                            src={getListingImage(
                              yourListing
                            )}
                            alt={
                              yourListing?.title ||
                              "Your item"
                            }
                            className="h-32 w-full object-cover"
                          />

                          <div className="p-3">
                            <p className="line-clamp-2 text-sm font-bold text-[#21191B]">
                              {yourListing?.title ||
                                "Item unavailable"}
                            </p>

                            <p className="mt-1 text-xs font-semibold text-[#8A2638]">
                              KES{" "}
                              {Number(
                                trade.agreedValueA || 0
                              ).toLocaleString()}
                            </p>
                          </div>
                        </div>
                      </div>

                      {/* THEIR ITEM */}
                      <div>
                        <p className="mb-2 text-xs font-bold uppercase tracking-wider text-[#8A2638]">
                          Their item
                        </p>

                        <div className="overflow-hidden rounded-xl border border-[#E7DDDF]">
                          <img
                            src={getListingImage(
                              theirListing
                            )}
                            alt={
                              theirListing?.title ||
                              "Their item"
                            }
                            className="h-32 w-full object-cover"
                          />

                          <div className="p-3">
                            <p className="line-clamp-2 text-sm font-bold text-[#21191B]">
                              {theirListing?.title ||
                                "Item unavailable"}
                            </p>

                            <p className="mt-1 text-xs font-semibold text-[#8A2638]">
                              KES{" "}
                              {Number(
                                trade.agreedValueB || 0
                              ).toLocaleString()}
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* FOOTER */}
                    <div className="flex items-center justify-between border-t border-[#E7DDDF] px-5 py-4">
                      <div>
                        <p className="text-xs text-gray-500">
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
                        className="rounded-xl bg-[#5B1725] px-5 py-2.5 text-sm font-bold text-white transition hover:bg-[#3D0F18]"
                      >
                        View Trade →
                      </button>
                    </div>
                  </div>
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
