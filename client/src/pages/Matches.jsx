import { useEffect, useState } from "react";
import { Link } from "react-router-dom";

import {
getMatches,
deactivateMatch,
} from "../api/matchApi";

const getMatchLevel = (score) => {
if (score >= 80) return "EXCELLENT";
if (score >= 65) return "GOOD";
if (score >= 50) return "POSSIBLE";
return "NO MATCH";
};

const getMatchLabel = (score) => {
if (score >= 80) return "Excellent Match";
if (score >= 65) return "Good Match";
if (score >= 50) return "Possible Match";
return "No Match";
};

const getPrimaryImage = (listing) => {
if (!listing?.images?.length) {
return null;
}

return (
listing.images.find((image) => image.isPrimary) ||
listing.images[0]
);
};

const formatValue = (value) => {
if (value === null || value === undefined) {
return "Value not specified";
}

return `KES ${Number(value).toLocaleString()}`;
};

const Matches = () => {
const [matches, setMatches] = useState([]);
const [minScore, setMinScore] = useState(0);
const [loading, setLoading] = useState(true);
const [error, setError] = useState("");
const [deactivatingId, setDeactivatingId] = useState(null);

const loadMatches = async () => {
try {
setLoading(true);
setError("");


  const data = await getMatches({
    minScore,
    limit: 100,
  });

  setMatches(data.matches || []);
} catch (err) {
  console.error("LOAD MATCHES ERROR:", err);

  setError(
    err.response?.data?.message ||
      "Failed to load your matches."
  );
} finally {
  setLoading(false);
}


};

useEffect(() => {
loadMatches();
}, [minScore]);

const handleDeactivate = async (matchId) => {
const confirmed = window.confirm(
"Are you sure you want to hide this match?"
);


if (!confirmed) {
  return;
}

try {
  setDeactivatingId(matchId);

  await deactivateMatch(matchId);

  setMatches((current) =>
    current.filter((match) => match.id !== matchId)
  );
} catch (err) {
  console.error("DEACTIVATE MATCH ERROR:", err);

  alert(
    err.response?.data?.message ||
      "Failed to deactivate match."
  );
} finally {
  setDeactivatingId(null);
}


};

if (loading) {
return ( <div className="min-h-screen bg-[#F8F5F3] px-6 py-10"> <div className="mx-auto max-w-7xl"> <p className="text-[#5B1725]">
Finding your barter matches... </p> </div> </div>
);
}

return ( <div className="min-h-screen bg-[#F8F5F3] px-6 py-10"> <div className="mx-auto max-w-7xl">


    {/* Header */}
    <div className="mb-8 flex flex-col gap-5 md:flex-row md:items-end md:justify-between">
      <div>
        <p className="mb-2 text-sm font-semibold uppercase tracking-wider text-[#8A2638]">
          Barter Trade
        </p>

        <h1 className="text-3xl font-bold text-[#3D0F18]">
          My Matches
        </h1>

        <p className="mt-2 max-w-2xl text-[#5B1725]/70">
          Discover listings that could make a good
          barter exchange with your items.
        </p>
      </div>

      {/* Score filter */}
      <div className="flex items-center gap-3">
        <label
          htmlFor="minScore"
          className="text-sm font-medium text-[#3D0F18]"
        >
          Minimum score
        </label>

        <select
          id="minScore"
          value={minScore}
          onChange={(e) =>
            setMinScore(Number(e.target.value))
          }
          className="rounded-lg border border-[#DCAEB7] bg-white px-4 py-2 text-sm text-[#3D0F18] outline-none focus:border-[#8A2638]"
        >
          <option value={0}>All Matches</option>
          <option value={50}>50+ Possible</option>
          <option value={65}>65+ Good</option>
          <option value={80}>80+ Excellent</option>
        </select>
      </div>
    </div>

    {/* Error */}
    {error && (
      <div className="mb-6 rounded-xl border border-red-200 bg-red-50 p-4 text-red-700">
        {error}
      </div>
    )}

    {/* Empty state */}
    {!error && matches.length === 0 && (
      <div className="rounded-2xl border border-[#E7DDDF] bg-white p-10 text-center shadow-sm">
        <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-[#F5E8EB] text-2xl">
          🔄
        </div>

        <h2 className="text-xl font-bold text-[#3D0F18]">
          No matches found
        </h2>

        <p className="mx-auto mt-2 max-w-md text-[#5B1725]/70">
          Create an active listing and generate matches
          to discover potential barter opportunities.
        </p>

        <Link
          to="/listings/create"
          className="mt-6 inline-flex rounded-lg bg-[#3D0F18] px-5 py-3 font-semibold text-white transition hover:bg-[#5B1725]"
        >
          Create Listing
        </Link>
      </div>
    )}

    {/* Matches */}
    <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
      {matches.map((match) => {
        const imageA = getPrimaryImage(match.listingA);
        const imageB = getPrimaryImage(match.listingB);

        const level = getMatchLevel(match.score);
        const label = getMatchLabel(match.score);

        return (
          <div
            key={match.id}
            className="overflow-hidden rounded-2xl border border-[#E7DDDF] bg-white shadow-sm"
          >
            {/* Match score */}
            <div className="flex items-center justify-between bg-[#3D0F18] px-5 py-4 text-white">
              <div>
                <p className="text-xs uppercase tracking-wider text-[#DCAEB7]">
                  Match
                </p>

                <p className="font-bold">
                  {label}
                </p>
              </div>

              <div className="text-right">
                <p className="text-2xl font-bold">
                  {Number(match.score).toFixed(0)}%
                </p>

                <p className="text-xs text-[#DCAEB7]">
                  {level}
                </p>
              </div>
            </div>

            {/* Listings */}
            <div className="grid grid-cols-2 gap-3 p-4">

              {/* Listing A */}
              <div className="overflow-hidden rounded-xl border border-[#E7DDDF]">
                <div className="aspect-square bg-[#F5E8EB]">
                  {imageA?.url ? (
                    <img
                      src={imageA.url}
                      alt={match.listingA.title}
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <div className="flex h-full items-center justify-center text-sm text-[#5B1725]/50">
                      No image
                    </div>
                  )}
                </div>

                <div className="p-3">
                  <h3 className="line-clamp-2 text-sm font-bold text-[#3D0F18]">
                    {match.listingA.title}
                  </h3>

                  <p className="mt-1 text-xs text-[#5B1725]/70">
                    {formatValue(
                      match.listingA.estimatedValue
                    )}
                  </p>
                </div>
              </div>

              {/* Listing B */}
              <div className="overflow-hidden rounded-xl border border-[#E7DDDF]">
                <div className="aspect-square bg-[#F5E8EB]">
                  {imageB?.url ? (
                    <img
                      src={imageB.url}
                      alt={match.listingB.title}
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <div className="flex h-full items-center justify-center text-sm text-[#5B1725]/50">
                      No image
                    </div>
                  )}
                </div>

                <div className="p-3">
                  <h3 className="line-clamp-2 text-sm font-bold text-[#3D0F18]">
                    {match.listingB.title}
                  </h3>

                  <p className="mt-1 text-xs text-[#5B1725]/70">
                    {formatValue(
                      match.listingB.estimatedValue
                    )}
                  </p>
                </div>
              </div>
            </div>

            {/* Match factors */}
            <div className="border-t border-[#E7DDDF] px-5 py-4">
              <div className="grid grid-cols-3 gap-3 text-center">
                <div>
                  <p className="text-xs text-[#5B1725]/60">
                    Value
                  </p>
                  <p className="font-semibold text-[#3D0F18]">
                    {match.valueScore ?? 0}%
                  </p>
                </div>

                <div>
                  <p className="text-xs text-[#5B1725]/60">
                    Location
                  </p>
                  <p className="font-semibold text-[#3D0F18]">
                    {match.locationScore ?? 0}%
                  </p>
                </div>

                <div>
                  <p className="text-xs text-[#5B1725]/60">
                    Trust
                  </p>
                  <p className="font-semibold text-[#3D0F18]">
                    {match.trustScore ?? 0}%
                  </p>
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="flex gap-3 border-t border-[#E7DDDF] p-4">
              <Link
                to={`/matches/${match.id}`}
                className="flex-1 rounded-lg bg-[#3D0F18] px-4 py-2.5 text-center text-sm font-semibold text-white transition hover:bg-[#5B1725]"
              >
                View Match
              </Link>

              <button
                type="button"
                onClick={() =>
                  handleDeactivate(match.id)
                }
                disabled={
                  deactivatingId === match.id
                }
                className="rounded-lg border border-[#DCAEB7] px-4 py-2.5 text-sm font-semibold text-[#5B1725] transition hover:bg-[#F5E8EB] disabled:cursor-not-allowed disabled:opacity-50"
              >
                {deactivatingId === match.id
                  ? "..."
                  : "Hide"}
              </button>
            </div>
          </div>
        );
      })}
    </div>
  </div>
</div>


);
};

export default Matches;
