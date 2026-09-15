import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";

import { getMatchById } from "../api/matchApi";

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

const MatchDetails = () => {
const { id } = useParams();
const navigate = useNavigate();

const [match, setMatch] = useState(null);
const [loading, setLoading] = useState(true);
const [error, setError] = useState("");

useEffect(() => {
const loadMatch = async () => {
try {
setLoading(true);
setError("");


    const response = await getMatchById(id);

    const loadedMatch =
      response?.match ||
      response?.data ||
      response;

    if (!loadedMatch?.id) {
      throw new Error("Match not found.");
    }

    setMatch(loadedMatch);
  } catch (err) {
    console.error("LOAD MATCH DETAILS ERROR:", err);

    setError(
      err?.response?.data?.message ||
        err?.message ||
        "Failed to load match details."
    );
  } finally {
    setLoading(false);
  }
};

if (id) {
  loadMatch();
}


}, [id]);

if (loading) {
return ( <div className="min-h-screen bg-[#F8F5F3] px-6 py-10"> <div className="mx-auto max-w-5xl"> <div className="rounded-2xl border border-[#E7DDDF] bg-white p-10 text-center shadow-sm"> <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-[#F5E8EB] text-2xl">
🔄 </div>


        <h2 className="text-xl font-bold text-[#3D0F18]">
          Loading Match
        </h2>

        <p className="mt-2 text-sm text-[#5B1725]/70">
          Loading the details of this barter opportunity...
        </p>
      </div>
    </div>
  </div>
);


}

if (error || !match) {
return ( <div className="min-h-screen bg-[#F8F5F3] px-6 py-10"> <div className="mx-auto max-w-2xl"> <div className="rounded-2xl border border-red-200 bg-white p-10 text-center shadow-sm"> <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-red-50 text-2xl">
⚠️ </div>


        <h2 className="text-xl font-bold text-[#3D0F18]">
          Match Unavailable
        </h2>

        <p className="mt-2 text-sm text-[#5B1725]/70">
          {error || "This match could not be found."}
        </p>

        <button
          type="button"
          onClick={() => navigate("/matches")}
          className="mt-6 rounded-xl bg-[#3D0F18] px-5 py-3 text-sm font-bold text-white transition hover:bg-[#5B1725]"
        >
          ← Back to Matches
        </button>
      </div>
    </div>
  </div>
);


}

const listingA = match.listingA;
const listingB = match.listingB;

const score = Number(match.score || 0);

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

return ( <div className="min-h-screen bg-[#F8F5F3] px-6 py-10"> <div className="mx-auto max-w-6xl">


    {/* Back */}
    <button
      type="button"
      onClick={() => navigate("/matches")}
      className="mb-6 text-sm font-bold text-[#5B1725] hover:underline"
    >
      ← Back to Matches
    </button>

    {/* Header */}
    <div className="mb-6 overflow-hidden rounded-2xl bg-[#3D0F18] text-white shadow-lg">
      <div className="flex flex-col gap-5 px-6 py-7 sm:flex-row sm:items-center sm:justify-between">

        <div>
          <p className="text-xs uppercase tracking-widest text-[#DCAEB7]">
            Barter Trade
          </p>

          <h1 className="mt-2 text-2xl font-extrabold sm:text-3xl">
            {label}
          </h1>

          <p className="mt-2 text-sm text-[#DCAEB7]">
            This listing pair has been identified as a potential barter
            opportunity.
          </p>
        </div>

        <div className="rounded-2xl bg-white/10 px-6 py-4 text-center">
          <p className="text-4xl font-extrabold">
            {score.toFixed(0)}%
          </p>

          <p className="mt-1 text-xs font-bold tracking-wider text-[#DCAEB7]">
            {level}
          </p>
        </div>

      </div>
    </div>

    {/* Listings */}
    <div className="grid gap-6 md:grid-cols-2">

      {/* Your / Listing A */}
      <div className="overflow-hidden rounded-2xl border border-[#E7DDDF] bg-white shadow-sm">

        <div className="border-b border-[#E7DDDF] bg-[#FBF5F6] px-5 py-4">
          <p className="text-xs font-bold uppercase tracking-wider text-[#8A2638]">
            Listing A
          </p>

          <h2 className="mt-1 text-xl font-bold text-[#3D0F18]">
            {listingA?.title || "Listing unavailable"}
          </h2>
        </div>

        <div className="aspect-video bg-[#F5E8EB]">
          {imageA?.url ? (
            <img
              src={imageA.url}
              alt={listingA?.title || "Listing"}
              className="h-full w-full object-cover"
            />
          ) : (
            <div className="flex h-full items-center justify-center text-sm text-[#5B1725]/50">
              No image available
            </div>
          )}
        </div>

        <div className="p-5">

          <p className="text-sm leading-6 text-[#5B1725]/70">
            {listingA?.description ||
              "No description provided."}
          </p>

          <div className="mt-5 grid grid-cols-2 gap-3">

            <div className="rounded-xl bg-[#FBF5F6] p-3">
              <p className="text-xs text-[#5B1725]/60">
                Value
              </p>

              <p className="mt-1 font-bold text-[#3D0F18]">
                {formatValue(listingA?.estimatedValue)}
              </p>
            </div>

            <div className="rounded-xl bg-[#FBF5F6] p-3">
              <p className="text-xs text-[#5B1725]/60">
                Condition
              </p>

              <p className="mt-1 font-bold text-[#3D0F18]">
                {listingA?.condition || "N/A"}
              </p>
            </div>

          </div>

          {listingA?.location && (
            <p className="mt-4 text-sm text-[#5B1725]/70">
              Location:{" "}
              <span className="font-bold text-[#3D0F18]">
                {listingA.location}
              </span>
            </p>
          )}

          {listingA?.id && (
            <Link
              to={`/listings/${listingA.id}`}
              className="mt-5 block rounded-xl border border-[#5B1725] px-4 py-3 text-center text-sm font-bold text-[#5B1725] transition hover:bg-[#F5E8EB]"
            >
              View Listing
            </Link>
          )}

        </div>
      </div>

      {/* Listing B */}
      <div className="overflow-hidden rounded-2xl border border-[#E7DDDF] bg-white shadow-sm">

        <div className="border-b border-[#E7DDDF] bg-[#FBF5F6] px-5 py-4">
          <p className="text-xs font-bold uppercase tracking-wider text-[#8A2638]">
            Potential Exchange
          </p>

          <h2 className="mt-1 text-xl font-bold text-[#3D0F18]">
            {listingB?.title || "Listing unavailable"}
          </h2>
        </div>

        <div className="aspect-video bg-[#F5E8EB]">
          {imageB?.url ? (
            <img
              src={imageB.url}
              alt={listingB?.title || "Listing"}
              className="h-full w-full object-cover"
            />
          ) : (
            <div className="flex h-full items-center justify-center text-sm text-[#5B1725]/50">
              No image available
            </div>
          )}
        </div>

        <div className="p-5">

          <p className="text-sm leading-6 text-[#5B1725]/70">
            {listingB?.description ||
              "No description provided."}
          </p>

          <div className="mt-5 grid grid-cols-2 gap-3">

            <div className="rounded-xl bg-[#FBF5F6] p-3">
              <p className="text-xs text-[#5B1725]/60">
                Value
              </p>

              <p className="mt-1 font-bold text-[#3D0F18]">
                {formatValue(listingB?.estimatedValue)}
              </p>
            </div>

            <div className="rounded-xl bg-[#FBF5F6] p-3">
              <p className="text-xs text-[#5B1725]/60">
                Condition
              </p>

              <p className="mt-1 font-bold text-[#3D0F18]">
                {listingB?.condition || "N/A"}
              </p>
            </div>

          </div>

          {listingB?.location && (
            <p className="mt-4 text-sm text-[#5B1725]/70">
              Location:{" "}
              <span className="font-bold text-[#3D0F18]">
                {listingB.location}
              </span>
            </p>
          )}

          {listingB?.id && (
            <Link
              to={`/listings/${listingB.id}`}
              className="mt-5 block rounded-xl border border-[#5B1725] px-4 py-3 text-center text-sm font-bold text-[#5B1725] transition hover:bg-[#F5E8EB]"
            >
              View Listing
            </Link>
          )}

        </div>
      </div>

    </div>

    {/* Match Analysis */}
    <div className="mt-6 rounded-2xl border border-[#E7DDDF] bg-white p-6 shadow-sm">

      <h2 className="text-xl font-bold text-[#3D0F18]">
        Match Analysis
      </h2>

      <p className="mt-1 text-sm text-[#5B1725]/70">
        Why these two listings were identified as a potential match.
      </p>

      <div className="mt-5 grid gap-4 sm:grid-cols-3">

        <div className="rounded-xl bg-[#FBF5F6] p-4">
          <p className="text-xs font-semibold text-[#5B1725]/60">
            Value Compatibility
          </p>

          <p className="mt-2 text-2xl font-extrabold text-[#3D0F18]">
            {formatScore(match.valueScore)}
          </p>
        </div>

        <div className="rounded-xl bg-[#FBF5F6] p-4">
          <p className="text-xs font-semibold text-[#5B1725]/60">
            Location Compatibility
          </p>

          <p className="mt-2 text-2xl font-extrabold text-[#3D0F18]">
            {formatScore(match.locationScore)}
          </p>
        </div>

        <div className="rounded-xl bg-[#FBF5F6] p-4">
          <p className="text-xs font-semibold text-[#5B1725]/60">
            Trust Score
          </p>

          <p className="mt-2 text-2xl font-extrabold text-[#3D0F18]">
            {formatScore(match.trustScore)}
          </p>
        </div>

      </div>

    </div>

    {/* Actions */}
    <div className="mt-6 rounded-2xl border border-[#E7DDDF] bg-white p-6 shadow-sm">

      <h2 className="text-xl font-bold text-[#3D0F18]">
        What would you like to do?
      </h2>

      <p className="mt-1 text-sm text-[#5B1725]/70">
        Review the other listing or send a barter offer.
      </p>

      <div className="mt-5 grid gap-3 sm:grid-cols-2">

        {otherListing?.id && (
          <Link
            to={`/listings/${otherListing.id}`}
            className="rounded-xl border border-[#5B1725] px-5 py-3 text-center text-sm font-bold text-[#5B1725] transition hover:bg-[#F5E8EB]"
          >
            View Other Listing
          </Link>
        )}

        {userListing?.id && otherListing?.id && (
          <Link
            to={`/make-offer?requestedListingId=${otherListing.id}&offeredListingId=${userListing.id}`}
            className="rounded-xl bg-[#8A2638] px-5 py-3 text-center text-sm font-bold text-white transition hover:bg-[#5B1725]"
          >
            Make Offer →
          </Link>
        )}

      </div>

    </div>

  </div>
</div>


);
};

export default MatchDetails;
