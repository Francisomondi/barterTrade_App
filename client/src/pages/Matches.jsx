import { useEffect, useState } from "react";
import { Link } from "react-router-dom";

import {
getMatches,
deactivateMatch,
generateMatchesForListing,
} from "../api/matchApi";

import { getMyListings } from "../api/listingApi";


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

const numericValue = Number(value);

if (Number.isNaN(numericValue)) {
return "Value not specified";
}

return `KES ${numericValue.toLocaleString()}`;
};

const formatScore = (value) => {
if (value === null || value === undefined) {
return "0%";
}

return `${Number(value).toFixed(0)}%`;
};


const MatchCard = ({
match,
onDeactivate,
deactivatingId,
}) => {
const listingA = match?.listingA;
const listingB = match?.listingB;

const score = Number(match?.score || 0);

const level = getMatchLevel(score);
const label = getMatchLabel(score);

const imageA = getPrimaryImage(listingA);
const imageB = getPrimaryImage(listingB);


const userListing =
listingA?.userId === match?.userId
? listingA
: listingB?.userId === match?.userId
? listingB
: null;

const otherListing =
userListing?.id === listingA?.id
? listingB
: userListing?.id === listingB?.id
? listingA
: listingB;

return ( <div className="overflow-hidden rounded-2xl border border-[#E7DDDF] bg-white shadow-sm transition duration-200 hover:shadow-lg">


  <div className="flex items-center justify-between bg-[#3D0F18] px-5 py-4 text-white">

    <div>
      <p className="text-xs uppercase tracking-wider text-[#DCAEB7]">
        Potential Barter Match
      </p>

      <p className="mt-1 font-bold">
        {label}
      </p>
    </div>

    <div className="text-right">

      <p className="text-2xl font-extrabold">
        {score.toFixed(0)}%
      </p>

      <p className="text-xs text-[#DCAEB7]">
        {level}
      </p>

    </div>

  </div>


  <div className="grid grid-cols-1 gap-4 p-4 sm:grid-cols-2">

    {/* Listing A */}
    <div className="overflow-hidden rounded-xl border border-[#E7DDDF]">

      <div className="aspect-square bg-[#F5E8EB]">

        {imageA?.url ? (
          <img
            src={imageA.url}
            alt={listingA?.title || "Listing"}
            className="h-full w-full object-cover"
          />
        ) : (
          <div className="flex h-full items-center justify-center text-sm text-[#5B1725]/50">
            No image
          </div>
        )}

      </div>

      <div className="p-3">

        <p className="mb-1 text-[10px] font-bold uppercase tracking-wide text-[#8A2638]">
          Item
        </p>

        <h3 className="line-clamp-2 text-sm font-bold text-[#3D0F18]">
          {listingA?.title || "Listing unavailable"}
        </h3>

        <p className="mt-2 text-xs text-[#5B1725]/70">
          Value:{" "}
          <span className="font-semibold text-[#3D0F18]">
            {formatValue(listingA?.estimatedValue)}
          </span>
        </p>

        <p className="mt-1 text-xs text-[#5B1725]/70">
          Condition:{" "}
          <span className="font-semibold text-[#3D0F18]">
            {listingA?.condition || "N/A"}
          </span>
        </p>

        {listingA?.location && (
          <p className="mt-1 line-clamp-1 text-xs text-[#5B1725]/70">
            Location:{" "}
            <span className="font-semibold text-[#3D0F18]">
              {listingA.location}
            </span>
          </p>
        )}

        {listingA?.id && (
          <Link
            to={`/listings/${listingA.id}`}
            className="mt-3 inline-block text-xs font-bold text-[#8A2638] hover:underline"
          >
            View Item →
          </Link>
        )}

      </div>

    </div>

    {/* Swap indicator */}
    <div className="relative sm:hidden">

      <div className="absolute inset-x-0 -top-7 flex justify-center">
        <div className="flex h-9 w-9 items-center justify-center rounded-full bg-[#5B1725] text-lg text-white shadow-md">
          ↕
        </div>
      </div>

    </div>

    {/* Listing B */}
    <div className="overflow-hidden rounded-xl border border-[#E7DDDF]">

      <div className="aspect-square bg-[#F5E8EB]">

        {imageB?.url ? (
          <img
            src={imageB.url}
            alt={listingB?.title || "Listing"}
            className="h-full w-full object-cover"
          />
        ) : (
          <div className="flex h-full items-center justify-center text-sm text-[#5B1725]/50">
            No image
          </div>
        )}

      </div>

      <div className="p-3">

        <p className="mb-1 text-[10px] font-bold uppercase tracking-wide text-[#8A2638]">
          Potential Exchange
        </p>

        <h3 className="line-clamp-2 text-sm font-bold text-[#3D0F18]">
          {listingB?.title || "Listing unavailable"}
        </h3>

        <p className="mt-2 text-xs text-[#5B1725]/70">
          Value:{" "}
          <span className="font-semibold text-[#3D0F18]">
            {formatValue(listingB?.estimatedValue)}
          </span>
        </p>

        <p className="mt-1 text-xs text-[#5B1725]/70">
          Condition:{" "}
          <span className="font-semibold text-[#3D0F18]">
            {listingB?.condition || "N/A"}
          </span>
        </p>

        {listingB?.location && (
          <p className="mt-1 line-clamp-1 text-xs text-[#5B1725]/70">
            Location:{" "}
            <span className="font-semibold text-[#3D0F18]">
              {listingB.location}
            </span>
          </p>
        )}

        {listingB?.id && (
          <Link
            to={`/listings/${listingB.id}`}
            className="mt-3 inline-block text-xs font-bold text-[#8A2638] hover:underline"
          >
            View Item →
          </Link>
        )}

      </div>

    </div>

  </div>


  <div className="border-t border-[#E7DDDF] px-5 py-4">

    <div className="mb-3 flex items-center justify-between">

      <p className="text-sm font-bold text-[#3D0F18]">
        Match Quality
      </p>

      <span className="text-xs font-semibold text-[#8A2638]">
        {score.toFixed(0)}% overall
      </span>

    </div>

    <div className="grid grid-cols-3 gap-3 text-center sm:grid-cols-4">

      <div className="rounded-lg bg-[#FBF5F6] p-2">
        <p className="text-[11px] text-[#5B1725]/60">
          Value
        </p>

        <p className="mt-1 text-sm font-bold text-[#3D0F18]">
          {formatScore(match?.valueScore)}
        </p>
      </div>

      <div className="rounded-lg bg-[#FBF5F6] p-2">
        <p className="text-[11px] text-[#5B1725]/60">
          Location
        </p>

        <p className="mt-1 text-sm font-bold text-[#3D0F18]">
          {formatScore(match?.locationScore)}
        </p>
      </div>

      <div className="rounded-lg bg-[#FBF5F6] p-2">
        <p className="text-[11px] text-[#5B1725]/60">
          Trust
        </p>

        <p className="mt-1 text-sm font-bold text-[#3D0F18]">
          {formatScore(match?.trustScore)}
        </p>
      </div>

      <div className="hidden rounded-lg bg-[#FBF5F6] p-2 sm:block">
        <p className="text-[11px] text-[#5B1725]/60">
          Score
        </p>

        <p className="mt-1 text-sm font-bold text-[#3D0F18]">
          {score.toFixed(0)}%
        </p>
      </div>

    </div>

  </div>


  <div className="border-t border-[#E7DDDF] p-4">

    <div className="grid gap-3 sm:grid-cols-2">

      {/* View Match */}
      <Link
        to={`/matches/${match.id}`}
        className="rounded-xl bg-[#3D0F18] px-4 py-3 text-center text-sm font-bold text-white transition hover:bg-[#5B1725]"
      >
        View Match
      </Link>

      {/* View Other Listing */}
      {otherListing?.id && (
        <Link
          to={`/listings/${otherListing.id}`}
          className="rounded-xl border border-[#5B1725] px-4 py-3 text-center text-sm font-bold text-[#5B1725] transition hover:bg-[#F5E8EB]"
        >
          View Listing
        </Link>
      )}

      {/* Make Offer */}
      {userListing?.id && otherListing?.id && (

        <Link
            to={`/make-offer?requestedListingId=${otherListing.id}&offeredListingId=${userListing.id}`}
            className="rounded-xl bg-[#8A2638] px-4 py-3 text-center text-sm font-bold text-white transition hover:bg-[#5B1725]"
        >
            Make Offer
        </Link>
      )}


      {/* Hide */}
      <button
        type="button"
        onClick={() => onDeactivate(match.id)}
        disabled={deactivatingId === match.id}
        className="rounded-xl border border-[#DCAEB7] px-4 py-3 text-sm font-bold text-[#5B1725] transition hover:bg-[#F5E8EB] disabled:cursor-not-allowed disabled:opacity-50"
      >
        {deactivatingId === match.id
          ? "Hiding..."
          : "Hide Match"}
      </button>

    </div>

  </div>

</div>


);
};

const Matches = () => {
const [matches, setMatches] = useState([]);
const [minScore, setMinScore] = useState(0);

const [loading, setLoading] = useState(true);
const [error, setError] = useState("");

const [deactivatingId, setDeactivatingId] =
useState(null);

const loadMatches = async () => {
try {
setLoading(true);
setError("");




  const listingsResponse = await getMyListings();

  const listings =
    listingsResponse?.listings ||
    listingsResponse?.data ||
    [];

 

  const activeListings = listings.filter(
    (listing) => listing?.status === "ACTIVE"
  );

  if (activeListings.length > 0) {
    await Promise.allSettled(
      activeListings.map((listing) =>
        generateMatchesForListing(
          listing.id,
          {
            minScore: 0,
          }
        )
      )
    );
  }



  const matchesResponse = await getMatches({
    minScore,
    limit: 100,
  });

  const loadedMatches =
    matchesResponse?.matches ||
    matchesResponse?.data ||
    [];



  const filteredMatches = loadedMatches.filter(
    (match) =>
      Number(match?.score || 0) >= minScore &&
      match?.status !== "INACTIVE"
  );

  setMatches(filteredMatches);

} catch (error) {
  console.error(
    "LOAD MATCHES ERROR:",
    error
  );

  setError(
    error?.response?.data?.message ||
      "Failed to load matches."
  );

  setMatches([]);

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
    current.filter(
      (match) => match.id !== matchId
    )
  );

} catch (err) {
  console.error(
    "DEACTIVATE MATCH ERROR:",
    err
  );

  window.alert(
    err?.response?.data?.message ||
      "Failed to deactivate match."
  );

} finally {
  setDeactivatingId(null);
}


};

if (loading) {
return ( <div className="min-h-screen bg-[#F8F5F3] px-6 py-10">


    <div className="mx-auto max-w-7xl">

      <div className="rounded-2xl border border-[#E7DDDF] bg-white p-10 text-center shadow-sm">

        <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-[#F5E8EB] text-2xl">
          🔄
        </div>

        <h2 className="text-xl font-bold text-[#3D0F18]">
          Finding your barter matches...
        </h2>

        <p className="mt-2 text-sm text-[#5B1725]/70">
          We are comparing your active listings
          with available items.
        </p>

      </div>

    </div>

  </div>
);


}


return ( <div className="min-h-screen bg-[#F8F5F3] px-6 py-10">


  <div className="mx-auto max-w-7xl">



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

      {/* Score Filter */}
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
          onChange={(event) =>
            setMinScore(
              Number(event.target.value)
            )
          }
          className="rounded-lg border border-[#DCAEB7] bg-white px-4 py-2 text-sm text-[#3D0F18] outline-none focus:border-[#8A2638]"
        >
          <option value={0}>
            All Matches
          </option>

          <option value={50}>
            50+ Possible
          </option>

          <option value={65}>
            65+ Good
          </option>

          <option value={80}>
            80+ Excellent
          </option>
        </select>

      </div>

    </div>


    {error && (
      <div className="mb-6 rounded-xl border border-red-200 bg-red-50 p-4 text-red-700">

        <p className="font-semibold">
          Unable to load matches
        </p>

        <p className="mt-1 text-sm">
          {error}
        </p>

        <button
          type="button"
          onClick={loadMatches}
          className="mt-3 rounded-lg bg-red-700 px-4 py-2 text-sm font-semibold text-white hover:bg-red-800"
        >
          Try Again
        </button>

      </div>
    )}


    {!error && matches.length === 0 && (
      <div className="rounded-2xl border border-[#E7DDDF] bg-white p-10 text-center shadow-sm">

        <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-[#F5E8EB] text-2xl">
          🔄
        </div>

        <h2 className="text-xl font-bold text-[#3D0F18]">
          No matches found
        </h2>

        <p className="mx-auto mt-2 max-w-md text-[#5B1725]/70">
          We couldn't find a suitable barter
          opportunity for your active listings yet.
        </p>

        <div className="mt-6 flex flex-col justify-center gap-3 sm:flex-row">

          <Link
            to="/listings/create"
            className="inline-flex justify-center rounded-lg bg-[#3D0F18] px-5 py-3 font-semibold text-white transition hover:bg-[#5B1725]"
          >
            Create Listing
          </Link>

          <button
            type="button"
            onClick={loadMatches}
            className="inline-flex justify-center rounded-lg border border-[#5B1725] px-5 py-3 font-semibold text-[#5B1725] transition hover:bg-[#F5E8EB]"
          >
            Refresh Matches
          </button>

        </div>

      </div>
    )}


    {matches.length > 0 && (
      <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">

        {matches.map((match) => (
          <MatchCard
            key={match.id}
            match={match}
            onDeactivate={handleDeactivate}
            deactivatingId={deactivatingId}
          />
        ))}

      </div>
    )}

  </div>

</div>


);
};

export default Matches;
