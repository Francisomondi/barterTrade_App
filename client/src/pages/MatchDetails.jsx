
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

const getMatchColor = (score) => {
  if (score >= 80) {
    return {
      text: "text-emerald-700",
      bg: "bg-emerald-50",
      border: "border-emerald-200",
      bar: "bg-emerald-500",
      ring: "ring-emerald-100",
    };
  }

  if (score >= 65) {
    return {
      text: "text-blue-700",
      bg: "bg-blue-50",
      border: "border-blue-200",
      bar: "bg-blue-500",
      ring: "ring-blue-100",
    };
  }

  if (score >= 50) {
    return {
      text: "text-amber-700",
      bg: "bg-amber-50",
      border: "border-amber-200",
      bar: "bg-amber-500",
      ring: "ring-amber-100",
    };
  }

  return {
    text: "text-red-700",
    bg: "bg-red-50",
    border: "border-red-200",
    bar: "bg-red-500",
    ring: "ring-red-100",
  };
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

const formatCondition = (condition) => {
  if (!condition) return "Not specified";

  return condition
    .toLowerCase()
    .replace(/_/g, " ")
    .replace(/\b\w/g, (char) => char.toUpperCase());
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

  /* --------------------------------------------------
   * LOADING
   * -------------------------------------------------- */

  if (loading) {
    return (
      <div className="min-h-screen bg-[#F8F5F3] px-4 py-6 sm:px-6">
        <div className="mx-auto max-w-5xl">
          <div className="rounded-2xl border border-[#E7DDDF] bg-white p-8 text-center shadow-sm">
            <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-[#F5E8EB] text-xl">
              🔄
            </div>

            <h2 className="text-lg font-bold text-[#3D0F18]">
              Loading Match
            </h2>

            <p className="mt-1 text-sm text-[#5B1725]/65">
              Loading the details of this barter opportunity...
            </p>
          </div>
        </div>
      </div>
    );
  }

  /* --------------------------------------------------
   * ERROR
   * -------------------------------------------------- */

  if (error || !match) {
    return (
      <div className="min-h-screen bg-[#F8F5F3] px-4 py-6 sm:px-6">
        <div className="mx-auto max-w-xl">
          <div className="rounded-2xl border border-red-200 bg-white p-8 text-center shadow-sm">
            <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-red-50 text-xl">
              ⚠️
            </div>

            <h2 className="text-lg font-bold text-[#3D0F18]">
              Match Unavailable
            </h2>

            <p className="mt-2 text-sm text-[#5B1725]/65">
              {error || "This match could not be found."}
            </p>

            <button
              type="button"
              onClick={() => navigate("/matches")}
              className="mt-5 rounded-xl bg-[#3D0F18] px-5 py-2.5 text-sm font-bold text-white transition hover:bg-[#5B1725]"
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

  const score = Math.min(
    Math.max(Number(match.score || 0), 0),
    100
  );

  const level = getMatchLevel(score);
  const label = getMatchLabel(score);
  const matchColors = getMatchColor(score);

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

  return (
    <div className="min-h-screen bg-[#F8F5F3] px-4 py-5 sm:px-6 lg:py-7">
      <div className="mx-auto max-w-6xl">

        {/* --------------------------------------------------
         * TOP NAVIGATION
         * -------------------------------------------------- */}

        <div className="mb-5 flex items-center justify-between">
          <button
            type="button"
            onClick={() => navigate("/matches")}
            className="inline-flex items-center gap-1.5 text-sm font-bold text-[#5B1725] transition hover:text-[#8A2638]"
          >
            ← Back to Matches
          </button>

          <span className="hidden rounded-full bg-white px-3 py-1.5 text-xs font-semibold text-[#5B1725]/60 shadow-sm sm:inline-flex">
            Barter Opportunity
          </span>
        </div>

        {/* --------------------------------------------------
         * MATCH HEADER
         * -------------------------------------------------- */}

        <section className="mb-5 overflow-hidden rounded-2xl bg-[#3D0F18] text-white shadow-md">
          <div className="flex flex-col gap-5 px-5 py-5 sm:flex-row sm:items-center sm:justify-between sm:px-6">

            <div className="min-w-0">
              <div className="mb-2 flex items-center gap-2">
                <span className="rounded-full bg-white/10 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-[#E8C5CB]">
                  Match Found
                </span>

                <span className="text-xs text-[#DCAEB7]">
                  #{match.id?.slice?.(-6) || "MATCH"}
                </span>
              </div>

              <h1 className="text-2xl font-extrabold tracking-tight sm:text-3xl">
                {label}
              </h1>

              <p className="mt-1.5 max-w-xl text-sm leading-5 text-[#DCAEB7]">
                These listings appear compatible based on value,
                location and trader trust.
              </p>
            </div>

            {/* Score */}
            <div
              className={`shrink-0 rounded-2xl bg-white px-6 py-4 text-center shadow-sm ring-4 ${matchColors.ring}`}
            >
              <p className={`text-3xl font-black ${matchColors.text}`}>
                {score.toFixed(0)}%
              </p>

              <p
                className={`mt-0.5 text-[10px] font-extrabold tracking-widest ${matchColors.text}`}
              >
                {level}
              </p>
            </div>
          </div>

          {/* Match Progress */}
          <div className="border-t border-white/10 px-5 py-3 sm:px-6">
            <div className="flex items-center justify-between text-[10px] font-semibold text-[#DCAEB7]">
              <span>Match strength</span>
              <span>{score.toFixed(0)} / 100</span>
            </div>

            <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-white/10">
              <div
                className="h-full rounded-full bg-[#DCAEB7] transition-all duration-700"
                style={{ width: `${score}%` }}
              />
            </div>
          </div>
        </section>

        {/* --------------------------------------------------
         * LISTINGS
         * -------------------------------------------------- */}

        <div className="grid gap-5 md:grid-cols-2">

          {/* LISTING A */}
          <article className="overflow-hidden rounded-2xl border border-[#E7DDDF] bg-white shadow-sm transition duration-200 hover:-translate-y-0.5 hover:shadow-md">

            <div className="flex items-center justify-between border-b border-[#E7DDDF] bg-[#FBF5F6] px-4 py-3">
              <div>
                <p className="text-[10px] font-extrabold uppercase tracking-widest text-[#8A2638]">
                  Listing A
                </p>

                <h2 className="mt-0.5 line-clamp-1 text-base font-bold text-[#3D0F18]">
                  {listingA?.title || "Listing unavailable"}
                </h2>
              </div>

              <span className="rounded-full bg-[#F5E8EB] px-2.5 py-1 text-[10px] font-bold text-[#5B1725]">
                Item
              </span>
            </div>

            {/* Image */}
            <div className="relative aspect-[16/8.5] bg-[#F5E8EB]">
              {imageA?.url ? (
                <img
                  src={imageA.url}
                  alt={listingA?.title || "Listing"}
                  className="h-full w-full object-cover"
                />
              ) : (
                <div className="flex h-full items-center justify-center text-sm text-[#5B1725]/45">
                  No image available
                </div>
              )}

              {listingA?.category?.name && (
                <span className="absolute left-3 top-3 rounded-full bg-white/95 px-2.5 py-1 text-[10px] font-bold text-[#5B1725] shadow-sm">
                  {listingA.category.name}
                </span>
              )}
            </div>

            <div className="p-4">

              <p className="line-clamp-3 text-sm leading-5 text-[#5B1725]/65">
                {listingA?.description ||
                  "No description provided."}
              </p>

              {/* Details */}
              <div className="mt-4 grid grid-cols-2 gap-2.5">

                <div className="rounded-xl bg-[#FBF5F6] px-3 py-2.5">
                  <p className="text-[10px] font-medium uppercase tracking-wide text-[#5B1725]/50">
                    Estimated value
                  </p>

                  <p className="mt-0.5 text-sm font-extrabold text-[#3D0F18]">
                    {formatValue(listingA?.estimatedValue)}
                  </p>
                </div>

                <div className="rounded-xl bg-[#FBF5F6] px-3 py-2.5">
                  <p className="text-[10px] font-medium uppercase tracking-wide text-[#5B1725]/50">
                    Condition
                  </p>

                  <p className="mt-0.5 text-sm font-extrabold text-[#3D0F18]">
                    {formatCondition(listingA?.condition)}
                  </p>
                </div>

              </div>

              {listingA?.location && (
                <div className="mt-3 flex items-center gap-2 text-xs text-[#5B1725]/65">
                  <span>📍</span>

                  <span className="truncate">
                    {listingA.location}
                  </span>
                </div>
              )}

              {listingA?.id && (
                <Link
                  to={`/listings/${listingA.id}`}
                  className="mt-4 block rounded-xl border border-[#5B1725] px-4 py-2.5 text-center text-xs font-bold text-[#5B1725] transition hover:bg-[#F5E8EB]"
                >
                  View Listing
                </Link>
              )}
            </div>
          </article>

          {/* LISTING B */}
          <article className="overflow-hidden rounded-2xl border border-[#E7DDDF] bg-white shadow-sm transition duration-200 hover:-translate-y-0.5 hover:shadow-md">

            <div className="flex items-center justify-between border-b border-[#E7DDDF] bg-[#FBF5F6] px-4 py-3">
              <div>
                <p className="text-[10px] font-extrabold uppercase tracking-widest text-[#8A2638]">
                  Listing B
                </p>

                <h2 className="mt-0.5 line-clamp-1 text-base font-bold text-[#3D0F18]">
                  {listingB?.title || "Listing unavailable"}
                </h2>
              </div>

              <span className="rounded-full bg-[#F5E8EB] px-2.5 py-1 text-[10px] font-bold text-[#5B1725]">
                Exchange
              </span>
            </div>

            {/* Image */}
            <div className="relative aspect-[16/8.5] bg-[#F5E8EB]">
              {imageB?.url ? (
                <img
                  src={imageB.url}
                  alt={listingB?.title || "Listing"}
                  className="h-full w-full object-cover"
                />
              ) : (
                <div className="flex h-full items-center justify-center text-sm text-[#5B1725]/45">
                  No image available
                </div>
              )}

              {listingB?.category?.name && (
                <span className="absolute left-3 top-3 rounded-full bg-white/95 px-2.5 py-1 text-[10px] font-bold text-[#5B1725] shadow-sm">
                  {listingB.category.name}
                </span>
              )}
            </div>

            <div className="p-4">

              <p className="line-clamp-3 text-sm leading-5 text-[#5B1725]/65">
                {listingB?.description ||
                  "No description provided."}
              </p>

              {/* Details */}
              <div className="mt-4 grid grid-cols-2 gap-2.5">

                <div className="rounded-xl bg-[#FBF5F6] px-3 py-2.5">
                  <p className="text-[10px] font-medium uppercase tracking-wide text-[#5B1725]/50">
                    Estimated value
                  </p>

                  <p className="mt-0.5 text-sm font-extrabold text-[#3D0F18]">
                    {formatValue(listingB?.estimatedValue)}
                  </p>
                </div>

                <div className="rounded-xl bg-[#FBF5F6] px-3 py-2.5">
                  <p className="text-[10px] font-medium uppercase tracking-wide text-[#5B1725]/50">
                    Condition
                  </p>

                  <p className="mt-0.5 text-sm font-extrabold text-[#3D0F18]">
                    {formatCondition(listingB?.condition)}
                  </p>
                </div>

              </div>

              {listingB?.location && (
                <div className="mt-3 flex items-center gap-2 text-xs text-[#5B1725]/65">
                  <span>📍</span>

                  <span className="truncate">
                    {listingB.location}
                  </span>
                </div>
              )}

              {listingB?.id && (
                <Link
                  to={`/listings/${listingB.id}`}
                  className="mt-4 block rounded-xl border border-[#5B1725] px-4 py-2.5 text-center text-xs font-bold text-[#5B1725] transition hover:bg-[#F5E8EB]"
                >
                  View Listing
                </Link>
              )}
            </div>
          </article>
        </div>

        {/* --------------------------------------------------
         * MATCH ANALYSIS
         * -------------------------------------------------- */}

        <section className="mt-5 rounded-2xl border border-[#E7DDDF] bg-white p-4 shadow-sm sm:p-5">

          <div className="flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <h2 className="text-lg font-extrabold text-[#3D0F18]">
                Match Analysis
              </h2>

              <p className="text-xs text-[#5B1725]/60">
                Factors contributing to this barter match.
              </p>
            </div>

            <span
              className={`w-fit rounded-full px-2.5 py-1 text-[10px] font-bold ${matchColors.bg} ${matchColors.text}`}
            >
              {label}
            </span>
          </div>

          <div className="mt-4 grid gap-3 sm:grid-cols-3">

            {/* Value */}
            <div className="rounded-xl border border-[#E7DDDF] bg-[#FBF5F6] p-3.5">
              <div className="flex items-center justify-between">
                <p className="text-[10px] font-bold uppercase tracking-wide text-[#5B1725]/55">
                  Value
                </p>

                <span className="text-sm">💰</span>
              </div>

              <p className="mt-1.5 text-xl font-black text-[#3D0F18]">
                {formatScore(match.valueScore)}
              </p>

              <div className="mt-2 h-1 overflow-hidden rounded-full bg-[#E7DDDF]">
                <div
                  className="h-full rounded-full bg-[#8A2638]"
                  style={{
                    width: `${Math.min(
                      Math.max(Number(match.valueScore || 0), 0),
                      100
                    )}%`,
                  }}
                />
              </div>
            </div>

            {/* Location */}
            <div className="rounded-xl border border-[#E7DDDF] bg-[#FBF5F6] p-3.5">
              <div className="flex items-center justify-between">
                <p className="text-[10px] font-bold uppercase tracking-wide text-[#5B1725]/55">
                  Location
                </p>

                <span className="text-sm">📍</span>
              </div>

              <p className="mt-1.5 text-xl font-black text-[#3D0F18]">
                {formatScore(match.locationScore)}
              </p>

              <div className="mt-2 h-1 overflow-hidden rounded-full bg-[#E7DDDF]">
                <div
                  className="h-full rounded-full bg-[#8A2638]"
                  style={{
                    width: `${Math.min(
                      Math.max(Number(match.locationScore || 0), 0),
                      100
                    )}%`,
                  }}
                />
              </div>
            </div>

            {/* Trust */}
            <div className="rounded-xl border border-[#E7DDDF] bg-[#FBF5F6] p-3.5">
              <div className="flex items-center justify-between">
                <p className="text-[10px] font-bold uppercase tracking-wide text-[#5B1725]/55">
                  Trust
                </p>

                <span className="text-sm">⭐</span>
              </div>

              <p className="mt-1.5 text-xl font-black text-[#3D0F18]">
                {formatScore(match.trustScore)}
              </p>

              <div className="mt-2 h-1 overflow-hidden rounded-full bg-[#E7DDDF]">
                <div
                  className="h-full rounded-full bg-[#8A2638]"
                  style={{
                    width: `${Math.min(
                      Math.max(Number(match.trustScore || 0), 0),
                      100
                    )}%`,
                  }}
                />
              </div>
            </div>
          </div>
        </section>

        {/* --------------------------------------------------
         * QUICK EXCHANGE SUMMARY
         * -------------------------------------------------- */}

        <section className="mt-5 rounded-2xl border border-[#E7DDDF] bg-white p-4 shadow-sm sm:p-5">

          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-[#F5E8EB]">
              🔄
            </div>

            <div>
              <h2 className="text-base font-extrabold text-[#3D0F18]">
                Exchange Summary
              </h2>

              <p className="text-xs text-[#5B1725]/60">
                Review both items before making an offer.
              </p>
            </div>
          </div>

          <div className="mt-4 grid items-center gap-3 sm:grid-cols-[1fr_auto_1fr]">

            <div className="rounded-xl bg-[#FBF5F6] p-3">
              <p className="text-[10px] font-bold uppercase tracking-wide text-[#5B1725]/50">
                Listing A
              </p>

              <p className="mt-1 line-clamp-1 text-sm font-bold text-[#3D0F18]">
                {listingA?.title || "Unavailable"}
              </p>

              <p className="mt-1 text-xs font-semibold text-[#8A2638]">
                {formatValue(listingA?.estimatedValue)}
              </p>
            </div>

            <div className="mx-auto flex h-9 w-9 items-center justify-center rounded-full bg-[#3D0F18] text-sm text-white shadow-sm">
              ⇄
            </div>

            <div className="rounded-xl bg-[#FBF5F6] p-3">
              <p className="text-[10px] font-bold uppercase tracking-wide text-[#5B1725]/50">
                Listing B
              </p>

              <p className="mt-1 line-clamp-1 text-sm font-bold text-[#3D0F18]">
                {listingB?.title || "Unavailable"}
              </p>

              <p className="mt-1 text-xs font-semibold text-[#8A2638]">
                {formatValue(listingB?.estimatedValue)}
              </p>
            </div>

          </div>
        </section>

        {/* --------------------------------------------------
         * ACTIONS
         * -------------------------------------------------- */}

        <section className="mt-5 mb-4 rounded-2xl bg-[#3D0F18] p-5 text-white shadow-md">

          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">

            <div>
              <div className="flex items-center gap-2">
                <span className="text-lg">🤝</span>

                <h2 className="text-lg font-extrabold">
                  Ready to trade?
                </h2>
              </div>

              <p className="mt-1 text-xs leading-5 text-[#DCAEB7]">
                Review the other listing and send an offer if
                the exchange works for you.
              </p>
            </div>

            <div className="grid gap-2.5 sm:grid-cols-2 lg:w-auto">

              {otherListing?.id && (
                <Link
                  to={`/listings/${otherListing.id}`}
                  className="rounded-xl border border-white/25 bg-white/5 px-5 py-2.5 text-center text-xs font-bold text-white transition hover:bg-white/10"
                >
                  View Other Listing
                </Link>
              )}

              {userListing?.id && otherListing?.id && (
                <Link
                  to={`/make-offer?requestedListingId=${otherListing.id}&offeredListingId=${userListing.id}`}
                  className="rounded-xl bg-white px-5 py-2.5 text-center text-xs font-extrabold text-[#3D0F18] shadow-sm transition hover:bg-[#F5E8EB]"
                >
                  Make Offer →
                </Link>
              )}

            </div>
          </div>
        </section>

      </div>
    </div>
  );
};

export default MatchDetails;

