import { useEffect, useMemo, useState } from "react";
import { getUserRatings } from "../api/ratingApi";

const formatDate = (date) => {
if (!date) return "—";

return new Date(date).toLocaleDateString("en-KE", {
day: "numeric",
month: "short",
year: "numeric",
});
};

const ReputationCard = ({
userId,
userName = "Trader",
barterScore = 0,
}) => {
const [ratings, setRatings] = useState([]);
const [reputation, setReputation] = useState(null);
const [loading, setLoading] = useState(true);
const [error, setError] = useState("");

const loadRatings = async () => {
if (!userId) return;


try {
  setLoading(true);
  setError("");

  const response = await getUserRatings(userId);

  setRatings(response?.ratings || []);
  setReputation(response?.reputation || null);
} catch (error) {
  console.error(
    "Load user ratings error:",
    error
  );

  setError(
    error.response?.data?.message ||
      "Unable to load trader reputation."
  );
} finally {
  setLoading(false);
}


};

useEffect(() => {
loadRatings();
}, [userId]);

const averageRating = useMemo(() => {
if (reputation?.averageRating !== undefined) {
return Number(
reputation.averageRating
).toFixed(1);
}


if (!ratings.length) {
  return "0.0";
}

const total = ratings.reduce(
  (sum, rating) =>
    sum + Number(rating.rating || 0),
  0
);

return (total / ratings.length).toFixed(1);


}, [ratings, reputation]);

const totalRatings =
reputation?.totalRatings ??
ratings.length;

const completedTrades =
reputation?.completedTrades ?? null;

const displayScore = Number(
reputation?.barterScore ??
barterScore ??
0
).toFixed(1);

if (loading) {
return ( <section className="rounded-2xl border border-[#E7DDDF] bg-white p-6 shadow-sm"> <div className="animate-pulse"> <div className="h-5 w-40 rounded bg-[#E7DDDF]" />


      <div className="mt-5 grid gap-4 sm:grid-cols-3">
        <div className="h-24 rounded-xl bg-[#F5E8EB]" />
        <div className="h-24 rounded-xl bg-[#F5E8EB]" />
        <div className="h-24 rounded-xl bg-[#F5E8EB]" />
      </div>

      <div className="mt-6 space-y-3">
        <div className="h-20 rounded-xl bg-gray-100" />
        <div className="h-20 rounded-xl bg-gray-100" />
      </div>
    </div>
  </section>
);


}

return ( <section className="overflow-hidden rounded-2xl border border-[#E7DDDF] bg-white shadow-sm">
{/* HEADER */} <div className="border-b border-[#E7DDDF] bg-[#FBF5F6] px-6 py-6 md:px-8"> <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between"> <div> <p className="text-sm font-bold uppercase tracking-wider text-[#8A2638]">
Reputation </p>


        <h2 className="mt-1 text-2xl font-extrabold text-[#21191B]">
          {userName}'s Barter Reputation
        </h2>

        <p className="mt-2 text-sm leading-6 text-gray-600">
          Reputation is built from completed barter
          trades and ratings received from trade partners.
        </p>
      </div>

      <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-[#F5E8EB] text-2xl">
        ⭐
      </div>
    </div>
  </div>

  <div className="p-6 md:p-8">
    {error && (
      <div className="mb-6 rounded-xl border border-red-200 bg-red-50 p-4 text-sm font-semibold text-red-700">
        ⚠️ {error}
      </div>
    )}

    {/* REPUTATION SUMMARY */}
    <div className="grid gap-4 sm:grid-cols-3">
      {/* BARTER SCORE */}
      <div className="rounded-2xl border border-[#E7DDDF] bg-white p-5">
        <p className="text-xs font-bold uppercase tracking-wider text-gray-500">
          Barter Score
        </p>

        <div className="mt-3 flex items-end gap-2">
          <span className="text-4xl font-extrabold text-[#5B1725]">
            {displayScore}
          </span>

          <span className="mb-1 text-sm text-gray-400">
            / 5.0
          </span>
        </div>

        <div className="mt-3 h-2 overflow-hidden rounded-full bg-gray-200">
          <div
            className="h-full rounded-full bg-[#8A2638]"
            style={{
              width: `${Math.min(
                Number(displayScore) * 20,
                100
              )}%`,
            }}
          />
        </div>

        <p className="mt-2 text-xs text-gray-500">
          Current reputation score
        </p>
      </div>

      {/* RATING */}
      <div className="rounded-2xl border border-[#E7DDDF] bg-white p-5">
        <p className="text-xs font-bold uppercase tracking-wider text-gray-500">
          Average Rating
        </p>

        <div className="mt-3 flex items-center gap-2">
          <span className="text-4xl font-extrabold text-[#21191B]">
            {averageRating}
          </span>

          <span className="text-yellow-500">
            ★
          </span>
        </div>

        <div className="mt-3 flex items-center gap-1">
          {[1, 2, 3, 4, 5].map((star) => (
            <span
              key={star}
              className={
                star <=
                Math.round(
                  Number(averageRating)
                )
                  ? "text-lg text-yellow-500"
                  : "text-lg text-gray-300"
              }
            >
              ★
            </span>
          ))}
        </div>

        <p className="mt-2 text-xs text-gray-500">
          Based on {totalRatings}{" "}
          {totalRatings === 1
            ? "rating"
            : "ratings"}
        </p>
      </div>

      {/* COMPLETED TRADES */}
      <div className="rounded-2xl border border-[#E7DDDF] bg-white p-5">
        <p className="text-xs font-bold uppercase tracking-wider text-gray-500">
          Completed Trades
        </p>

        <div className="mt-3 text-4xl font-extrabold text-[#21191B]">
          {completedTrades ?? "—"}
        </div>

        <p className="mt-2 text-xs text-gray-500">
          Successfully completed barter exchanges
        </p>
      </div>
    </div>

    {/* RATING HISTORY */}
    <div className="mt-8">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-sm font-bold uppercase tracking-wider text-[#8A2638]">
            Rating History
          </p>

          <h3 className="mt-1 text-xl font-extrabold text-[#21191B]">
            Feedback from trade partners
          </h3>
        </div>

        <span className="w-fit rounded-full bg-[#F5E8EB] px-3 py-1 text-xs font-bold text-[#5B1725]">
          {totalRatings}{" "}
          {totalRatings === 1
            ? "rating"
            : "ratings"}
        </span>
      </div>

      {ratings.length === 0 ? (
        <div className="mt-5 rounded-2xl border border-dashed border-[#DCCED1] bg-[#FBF5F6] p-8 text-center">
          <div className="text-4xl">
            ⭐
          </div>

          <h4 className="mt-3 font-extrabold text-[#21191B]">
            No ratings yet
          </h4>

          <p className="mt-1 text-sm text-gray-500">
            Ratings from completed barter trades will
            appear here.
          </p>
        </div>
      ) : (
        <div className="mt-5 space-y-4">
          {ratings.map((rating) => (
            <div
              key={rating.id}
              className="rounded-2xl border border-[#E7DDDF] bg-white p-5"
            >
              <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                <div className="flex items-center gap-3">
                  {/* REVIEWER AVATAR */}
                  {rating.reviewer?.avatar ? (
                    <img
                      src={rating.reviewer.avatar}
                      alt={
                        rating.reviewer.name ||
                        "Reviewer"
                      }
                      className="h-11 w-11 rounded-full object-cover"
                    />
                  ) : (
                    <div className="flex h-11 w-11 items-center justify-center rounded-full bg-[#F5E8EB] font-bold text-[#8A2638]">
                      {rating.reviewer?.name
                        ?.charAt(0)
                        ?.toUpperCase() || "U"}
                    </div>
                  )}

                  <div>
                    <p className="font-bold text-[#21191B]">
                      {rating.reviewer?.name ||
                        "Trade partner"}
                    </p>

                    <p className="text-xs text-gray-400">
                      {formatDate(
                        rating.createdAt
                      )}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-1">
                  {[1, 2, 3, 4, 5].map(
                    (star) => (
                      <span
                        key={star}
                        className={
                          star <=
                          Number(
                            rating.rating
                          )
                            ? "text-lg text-yellow-500"
                            : "text-lg text-gray-300"
                        }
                      >
                        ★
                      </span>
                    )
                  )}
                </div>
              </div>

              <p className="mt-4 text-sm font-bold text-[#5B1725]">
                {rating.rating}/5
              </p>

              {rating.comment ? (
                <p className="mt-3 rounded-xl bg-[#FBF5F6] p-4 text-sm leading-6 text-gray-600">
                  "{rating.comment}"
                </p>
              ) : (
                <p className="mt-3 text-sm italic text-gray-400">
                  No written comment.
                </p>
              )}
            </div>
          ))}
        </div>
      )}
    </div>

    {/* TRUST INFORMATION */}
    <div className="mt-8 rounded-2xl border border-green-200 bg-green-50 p-5">
      <div className="flex items-start gap-3">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-green-600 text-white">
          ✓
        </div>

        <div>
          <h4 className="font-extrabold text-green-800">
            Verified trade reputation
          </h4>

          <p className="mt-1 text-sm leading-6 text-green-700">
            Ratings are connected to completed barter
            trades, so reputation is built from actual
            exchanges on Barter Trace.
          </p>
        </div>
      </div>
    </div>
  </div>
</section>


);
};

export default ReputationCard;
