
import {useCallback, useEffect, useState,} from "react";
import { Link, useLocation, } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { getUserRatings } from "../api/ratingApi";

const formatRatingDate = (date) => {  
  if (!date) return "—";

  return new Date(date).toLocaleDateString("en-KE", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
};

const Profile = () => {
  const { user, loading } = useAuth();
  const location = useLocation();
  const [reputation, setReputation] = useState(null);
  const [ratings, setRatings] = useState([]);
  const [reputationLoading, setReputationLoading] = useState(false);
  const [reputationError, setReputationError] = useState("");

  /* =====================================================
     LOAD USER REPUTATION + RATING HISTORY
  ====================================================== */

  const loadReputation = useCallback(async () => {
    if (!user?.id) {
      return;
    }

    try {
      setReputationLoading(true);
      setReputationError("");

      const response = await getUserRatings(user.id);

      /* -------------------------------------------------
         REPUTATION
      ------------------------------------------------- */

      if (response?.reputation) {
        setReputation(response.reputation);
      } else {
        setReputation({
          averageRating: 0,
          totalRatings: 0,
          completedTrades:
            Number(user.completedTrades) || 0,
          barterScore:
            Number(user.barterScore) || 0,
        });

        setRatings([]);
      }

      /* -------------------------------------------------
         RATING HISTORY
      ------------------------------------------------- */

      setRatings(
        Array.isArray(response?.ratings)
          ? response.ratings
          : []
      );
    } catch (error) {
      console.error(
        "Load profile reputation error:",
        error
      );

      setReputationError(
        error.response?.data?.message || "Unable to load your reputation information."
      );

      setReputation({
        averageRating: 0,
        totalRatings: 0,
        completedTrades: Number(user.completedTrades) || 0,
        barterScore: Number(user.barterScore) || 0,
      });

      setRatings([]);
    } finally {
      setReputationLoading(false);
    }
  }, [
    user?.id,
    user?.completedTrades,
    user?.barterScore,
  ]);

  useEffect(() => {
    if (user?.id) {
      loadReputation();
    }
  }, [
    user?.id,
    location.pathname,
    loadReputation,
  ]);

    /* =====================================================
    REFRESH REPUTATION WHEN PAGE BECOMES ACTIVE
    ====================================================== */

    useEffect(() => {
      if (!user?.id) {
        return;
      }

      const refreshWhenActive = () => {
        if (
          document.visibilityState === "visible"
        ) {
          loadReputation();
        }
      };

      window.addEventListener(
        "focus",
        refreshWhenActive
      );

      document.addEventListener(
        "visibilitychange",
        refreshWhenActive
      );

      return () => {
        window.removeEventListener(
          "focus",
          refreshWhenActive
        );

        document.removeEventListener(
          "visibilitychange",
          refreshWhenActive
        );
      };
    }, [user?.id, loadReputation]);
  /* =====================================================
     LOADING
  ====================================================== */

  if (loading) {
    return (
      <div className="min-h-screen bg-[#F8F5F3] px-4 py-8 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-5xl">
          <div className="flex min-h-[60vh] items-center justify-center rounded-3xl border border-[#E7DDDF] bg-white shadow-sm">
            <div className="text-center">
              <div className="mx-auto h-9 w-9 animate-spin rounded-full border-4 border-[#E7DDDF] border-t-[#5B1725]" />

              <p className="mt-4 text-sm font-medium text-gray-500">
                Loading your profile...
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  /* =====================================================
     NO USER
  ====================================================== */

  if (!user) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#F8F5F3] px-4">
        <div className="w-full max-w-md rounded-3xl border border-[#E7DDDF] bg-white p-8 text-center shadow-sm">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-[#F5E8EB] text-2xl">
            👤
          </div>

          <h1 className="mt-5 text-2xl font-black text-[#21191B]">
            Profile unavailable
          </h1>

          <p className="mt-2 text-sm leading-6 text-gray-500">
            Please sign in to view your BarterConnect profile.
          </p>

          <Link
            to="/login"
            className="mt-6 inline-flex rounded-xl bg-[#5B1725] px-6 py-3 text-sm font-bold text-white shadow-sm transition hover:bg-[#3D0F18]"
          >
            Sign in
          </Link>
        </div>
      </div>
    );
  }

  /* =====================================================
     PROFILE DATA
  ====================================================== */

  const firstLetter = user.name?.charAt(0)?.toUpperCase() || "U";

  const completedTrades = Number(
      reputation?.completedTrades ??
        user.completedTrades ??
        0
    ) || 0;

  const barterScore = Number(
    reputation?.barterScore ??
      user.barterScore ??
      0
  );

  const averageRating = Number(
    reputation?.averageRating || 0
  );

  const totalRatings = Number(
    reputation?.totalRatings ?? ratings.length ?? 0
  );

  const scoreStars = Math.min(
  5,
  Math.max(0, Math.round(barterScore))
);

  const accountType =
    user.authProvider === "GOOGLE"
      ? "Google"
      : "Email & Password";

  return (
    <div className="min-h-screen bg-[#F8F5F3]">
      <main className="mx-auto w-full max-w-6xl px-4 py-6 sm:px-6 sm:py-8 lg:px-8 lg:py-10">

        {/* =====================================================
            PAGE HEADER
        ====================================================== */}

        <div className="mb-6 flex flex-col gap-4 sm:mb-8 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#8A2638]">
              Your account
            </p>

            <h1 className="mt-1 text-3xl font-black tracking-tight text-[#21191B] sm:text-4xl">
              My Profile
            </h1>

            <p className="mt-2 max-w-xl text-sm leading-6 text-gray-500">
              Manage your profile and see your activity on BarterConnect.
            </p>
          </div>

          <Link
            to="/dashboard"
            className="hidden items-center justify-center rounded-xl border border-[#E7DDDF] bg-white px-4 py-2.5 text-sm font-semibold text-[#5B1725] shadow-sm transition hover:bg-[#F9F1F3] sm:inline-flex"
          >
            ← Dashboard
          </Link>
        </div>

        {/* =====================================================
            PROFILE HEADER
        ====================================================== */}

        <section className="overflow-hidden rounded-3xl border border-[#E7DDDF] bg-white shadow-sm">

          {/* Cover */}

          <div className="relative h-32 overflow-hidden bg-[#3D0F18] sm:h-40 lg:h-44">
            <div className="absolute -right-16 -top-24 h-64 w-64 rounded-full bg-[#8A2638]/50 blur-3xl" />

            <div className="absolute -bottom-28 left-[35%] h-64 w-64 rounded-full bg-[#DCAEB7]/10 blur-3xl" />

            <div className="absolute right-[20%] top-8 h-16 w-16 rounded-full border border-white/10 bg-white/5" />

            <div className="absolute bottom-8 left-[12%] h-10 w-10 rounded-full border border-white/10 bg-white/5" />

            <div className="absolute bottom-0 left-0 h-px w-full bg-white/10" />
          </div>

          {/* Profile Identity */}

          <div className="relative px-5 pb-6 sm:px-8 sm:pb-8">
            <div className="-mt-14 flex flex-col gap-5 sm:-mt-16 sm:flex-row sm:items-end sm:justify-between">

              {/* Avatar */}

              <div className="relative shrink-0">
                <div
                  className="
                    flex h-28 w-28
                    items-center justify-center
                    overflow-hidden
                    rounded-[2rem]
                    border-[5px] border-white
                    bg-[#F4E7EA]
                    text-4xl font-black
                    text-[#5B1725]
                    shadow-xl
                    sm:h-32 sm:w-32 sm:text-5xl
                  "
                >
                  {user?.avatar ? (
                    <img
                      src={user?.avatar}
                      alt={
                        user.name ||
                        "Profile photo"
                      }
                      className="h-full w-full object-cover"
                      onError={(event) => {
                        event.currentTarget.style.display =
                          "none";

                        event.currentTarget.parentElement.innerHTML =
                          `<span>${firstLetter}</span>`;
                      }}
                    />
                  ) : (
                    firstLetter
                  )}
                </div>

                <span
                  className="
                    absolute bottom-2 right-2
                    h-5 w-5
                    rounded-full
                    border-4 border-white
                    bg-green-500
                  "
                  title="Active"
                />
              </div>

              {/* Account badges */}

              <div className="flex items-center gap-2">
                <span className="rounded-full bg-[#F5E8EB] px-3 py-1.5 text-xs font-bold text-[#5B1725]">
                  {accountType} account
                </span>

                <span className="rounded-full bg-green-50 px-3 py-1.5 text-xs font-bold text-green-700">
                  Active
                </span>
              </div>
            </div>

            {/* Identity */}

            <div className="mt-5">
              <h2 className="text-2xl font-black tracking-tight text-[#21191B] sm:text-3xl">
                {user.name || "BarterConnect User"}
              </h2>

              <p className="mt-1 break-all text-sm text-gray-500">
                {user.email}
              </p>

              {user.location && (
                <p className="mt-2 flex items-center gap-1.5 text-sm font-medium text-gray-500">
                  <span>📍</span>
                  <span>{user.location}</span>
                </p>
              )}

              {user.bio ? (
                <p className="mt-4 max-w-2xl text-sm leading-6 text-gray-600">
                  {user.bio}
                </p>
              ) : (
                <p className="mt-4 max-w-2xl text-sm italic leading-6 text-gray-400">
                  You haven't added a bio yet. Add a short description to
                  help other traders know more about you.
                </p>
              )}
            </div>
          </div>
        </section>

        {/* =====================================================
            QUICK STATS
        ====================================================== */}

        <section className="mt-5 grid grid-cols-2 overflow-hidden rounded-2xl border border-[#E7DDDF] bg-white shadow-sm sm:grid-cols-3">

          {/* Completed Trades */}

          <div className="border-r border-[#E7DDDF] p-5 sm:p-6">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#F5E8EB] text-lg">
                🤝
              </div>

              <div>
                <p className="text-2xl font-black text-[#5B1725]">
                  {completedTrades}
                </p>

                <p className="text-xs font-medium text-gray-500">
                  Completed trades
                </p>
              </div>
            </div>
          </div>


          {/* Barter Score Summary */}
          <div className="rounded-2xl border border-[#EEE5E7] bg-[#FBF8F8] p-5">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-xs font-bold uppercase tracking-wide text-gray-400">
                  Barter Score
                </p>

                <div className="mt-3 flex items-end gap-2">
                  <span className="text-3xl font-black text-[#8A2638]">
                    {barterScore.toFixed(1)}
                  </span>

                  <span className="pb-1 text-sm font-semibold text-gray-400">
                    / 5
                  </span>
                </div>
              </div>

              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#F8EED5] text-lg">
                ⭐
              </div>
            </div>

            <div
              className="mt-4 flex items-center gap-0.5"
              aria-label={`${barterScore.toFixed(1)} out of 5 Barter Score`}
            >
              {[1, 2, 3, 4, 5].map((star) => (
                <span
                  key={star}
                  className={`text-xl ${
                    star <= scoreStars
                      ? "text-yellow-500"
                      : "text-gray-300"
                  }`}
                >
                  ★
                </span>
              ))}
            </div>

            <p className="mt-3 text-xs leading-5 text-gray-500">
              Based on feedback received from completed barter trades.
            </p>

            <div className="mt-4 grid grid-cols-2 gap-2">
              <div className="rounded-xl bg-white px-3 py-2">
                <p className="text-[10px] font-bold uppercase tracking-wide text-gray-400">
                  Ratings
                </p>

                <p className="mt-1 text-sm font-black text-[#21191B]">
                  {totalRatings}
                </p>
              </div>

              <div className="rounded-xl bg-white px-3 py-2">
                <p className="text-[10px] font-bold uppercase tracking-wide text-gray-400">
                  Trades
                </p>

                <p className="mt-1 text-sm font-black text-[#21191B]">
                  {completedTrades}
                </p>
              </div>
            </div>
          </div>
          {/* Account */}

          <div className="col-span-2 p-5 sm:col-span-1 sm:p-6">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#F5E8EB] text-lg">
                🔐
              </div>

              <div>
                <p className="text-sm font-black text-[#21191B]">
                  {accountType}
                </p>

                <p className="text-xs font-medium text-gray-500">
                  Login method
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* =====================================================
            REPUTATION OVERVIEW — STEP 6.10.5.1
        ====================================================== */}

        <section className="mt-5 overflow-hidden rounded-3xl border border-[#E7DDDF] bg-white shadow-sm">

          <div className="border-b border-[#E7DDDF] bg-[#FBF5F6] px-5 py-6 sm:px-7">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.16em] text-[#8A2638]">
                  Reputation
                </p>

                <h2 className="mt-1 text-xl font-black text-[#21191B] sm:text-2xl">
                  Your Barter Reputation
                </h2>

                <p className="mt-1 text-sm leading-6 text-gray-500">
                  Your reputation grows through completed trades and
                  feedback from other traders.
                </p>
              </div>

              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-[#F5E8EB] text-2xl">
                ⭐
              </div>
            </div>
          </div>

          <div className="p-5 sm:p-7">

            {reputationError && (
              <div className="mb-5 rounded-xl border border-amber-200 bg-amber-50 p-4">
                <p className="text-sm font-semibold leading-6 text-amber-700">
                  {reputationError}
                </p>
              </div>
            )}

            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">

              {/* Barter Score */}

              <div className="rounded-2xl border border-[#EEE5E7] bg-[#FBF8F8] p-5">
                <p className="text-xs font-bold uppercase tracking-wide text-gray-400">
                  Barter Score
                </p>

                <div className="mt-3 flex items-end gap-2">
                  <span className="text-3xl font-black text-[#8A2638]">
                    {barterScore.toFixed(1)}
                  </span>

                  <span className="pb-1 text-sm text-gray-400">
                    / 5
                  </span>
                </div>

                <p className="mt-2 text-xs text-gray-500">
                  Overall reputation score
                </p>
              </div>

              {/* Average Rating */}

              <div className="rounded-2xl border border-[#EEE5E7] bg-[#FBF8F8] p-5">
                <p className="text-xs font-bold uppercase tracking-wide text-gray-400">
                  Average Rating
                </p>

                <div className="mt-3 flex items-center gap-2">
                  <span className="text-3xl font-black text-[#5B1725]">
                    {averageRating.toFixed(1)}
                  </span>

                  <span className="text-2xl text-yellow-500">
                    ★
                  </span>
                </div>

                <p className="mt-2 text-xs text-gray-500">
                  Average feedback received
                </p>
              </div>

              {/* Total Ratings */}

              <div className="rounded-2xl border border-[#EEE5E7] bg-[#FBF8F8] p-5">
                <p className="text-xs font-bold uppercase tracking-wide text-gray-400">
                  Ratings
                </p>

                <p className="mt-3 text-3xl font-black text-[#21191B]">
                  {totalRatings}
                </p>

                <p className="mt-2 text-xs text-gray-500">
                  Completed trade ratings
                </p>
              </div>

              {/* Completed Trades */}

              <div className="rounded-2xl border border-[#EEE5E7] bg-[#FBF8F8] p-5">
                <p className="text-xs font-bold uppercase tracking-wide text-gray-400">
                  Completed Trades
                </p>

                <p className="mt-3 text-3xl font-black text-[#21191B]">
                  {completedTrades}
                </p>

                <p className="mt-2 text-xs text-gray-500">
                  Successfully completed exchanges
                </p>
              </div>
            </div>

            {reputationLoading && (
              <div className="mt-5 flex items-center gap-3 rounded-xl bg-gray-50 px-4 py-3">
                <div className="h-4 w-4 animate-spin rounded-full border-2 border-[#DCCED1] border-t-[#5B1725]" />

                <p className="text-xs font-semibold text-gray-500">
                  Refreshing reputation...
                </p>
              </div>
            )}

            {!reputationLoading &&
              totalRatings === 0 && (
                <div className="mt-5 rounded-2xl border border-amber-200 bg-amber-50 p-5">
                  <div className="flex items-start gap-3">
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-amber-100 text-lg">
                      ⭐
                    </div>

                    <div>
                      <h3 className="font-extrabold text-amber-800">
                        No ratings yet
                      </h3>

                      <p className="mt-1 text-sm leading-6 text-amber-700">
                        Complete barter trades and receive feedback
                        from your trade partners to build your reputation.
                      </p>
                    </div>
                  </div>
                </div>
              )}
          </div>
        </section>

        {/* =====================================================
            RATING HISTORY — STEP 6.10.5.2
        ====================================================== */}

        <section className="mt-5 overflow-hidden rounded-3xl border border-[#E7DDDF] bg-white shadow-sm">

          <div className="border-b border-[#E7DDDF] bg-[#FBF5F6] px-5 py-6 sm:px-7">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.16em] text-[#8A2638]">
                  Feedback history
                </p>

                <h2 className="mt-1 text-xl font-black text-[#21191B] sm:text-2xl">
                  Ratings You Have Received
                </h2>

                <p className="mt-1 text-sm leading-6 text-gray-500">
                  See the feedback other traders have left after
                  completing trades with you.
                </p>
              </div>

              <div className="rounded-full bg-[#F5E8EB] px-4 py-2 text-xs font-bold text-[#5B1725]">
                {totalRatings}{" "}
                {totalRatings === 1
                  ? "rating"
                  : "ratings"}
              </div>
            </div>
          </div>

          <div className="p-5 sm:p-7">

            {reputationLoading ? (
              <div className="space-y-4">
                {[1, 2, 3].map((item) => (
                  <div
                    key={item}
                    className="animate-pulse rounded-2xl border border-[#EEE5E7] bg-[#FBF8F8] p-5"
                  >
                    <div className="flex items-start gap-4">
                      <div className="h-12 w-12 rounded-full bg-[#E7DDDF]" />

                      <div className="flex-1">
                        <div className="h-4 w-32 rounded bg-[#E7DDDF]" />

                        <div className="mt-3 h-4 w-40 rounded bg-[#E7DDDF]" />

                        <div className="mt-4 h-16 w-full rounded-xl bg-[#E7DDDF]" />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : ratings.length === 0 ? (
              <div className="rounded-2xl border border-[#EEE5E7] bg-[#FBF8F8] p-8 text-center">
                <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-[#F5E8EB] text-2xl">
                  ⭐
                </div>

                <h3 className="mt-4 text-lg font-black text-[#21191B]">
                  Your rating history is empty
                </h3>

                <p className="mx-auto mt-2 max-w-lg text-sm leading-6 text-gray-500">
                  Ratings from completed barter trades will appear
                  here after your trade partners leave feedback.
                </p>

                <Link
                  to="/trades"
                  className="mt-5 inline-flex rounded-xl bg-[#5B1725] px-5 py-3 text-sm font-bold text-white shadow-sm transition hover:bg-[#3D0F18]"
                >
                  View My Trades
                </Link>
              </div>
            ) : (
              <div className="space-y-4">

                {ratings.map((rating) => {
                const reviewerName =
                  rating?.reviewer?.name ||
                  "Barter Trace Trader";

                const reviewerInitial =
                  reviewerName
                    ?.charAt(0)
                    ?.toUpperCase() || "U";

                const ratingNumber = Number(
                  rating?.rating || 0
                );

                const tradeId =
                  rating?.trade?.id ||
                  rating?.tradeId;

                const tradeNumber =
                  rating?.trade?.tradeNumber ||
                  "Completed Barter Trade";

                const completedAt =
                  rating?.trade?.completedAt ||
                  rating?.createdAt;

                const tradeItems =
                  Array.isArray(rating?.trade?.items)
                    ? rating.trade.items
                    : [];

                const tradeItemNames = tradeItems
                  .map(
                    (item) =>
                      item?.listing?.title
                  )
                  .filter(Boolean);

                return (
                  <article
                    key={rating.id}
                    className="rounded-2xl border border-[#EEE5E7] bg-[#FBF8F8] p-5 transition hover:border-[#D9C0C6] hover:bg-[#FBF5F6]"
                  >

                    {/* =================================================
                        TOP ROW
                    ================================================== */}

                    <div className="flex flex-col gap-5">

                      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">

                        {/* REVIEWER */}

                        <div className="flex min-w-0 items-start gap-4">

                          <div className="h-12 w-12 shrink-0 overflow-hidden rounded-full bg-[#F5E8EB]">

                            {rating?.reviewer?.avatar ? (
                              <img
                                src={rating.reviewer.avatar}
                                alt={reviewerName}
                                className="h-full w-full object-cover"
                                onError={(event) => {
                                  event.currentTarget.style.display =
                                    "none";

                                  event.currentTarget.parentElement.innerHTML =
                                    `<span class="flex h-full w-full items-center justify-center text-sm font-black text-[#5B1725]">${reviewerInitial}</span>`;
                                }}
                              />
                            ) : (
                              <div className="flex h-full w-full items-center justify-center text-sm font-black text-[#5B1725]">
                                {reviewerInitial}
                              </div>
                            )}

                          </div>

                          <div className="min-w-0">

                            <p className="text-xs font-bold uppercase tracking-wide text-gray-400">
                              Reviewed by
                            </p>

                            <h3 className="mt-1 truncate text-base font-black text-[#21191B]">
                              {reviewerName}
                            </h3>

                            <p className="mt-1 text-xs text-gray-400">
                              {formatRatingDate(
                                rating?.createdAt
                              )}
                            </p>

                          </div>

                        </div>

                        {/* RATING */}

                        <div className="sm:text-right">

                          <div className="flex items-center gap-0.5 sm:justify-end">
                            {[1, 2, 3, 4, 5].map(
                              (star) => (
                                <span
                                  key={star}
                                  className={`text-xl ${
                                    star <= ratingNumber
                                      ? "text-yellow-500"
                                      : "text-gray-300"
                                  }`}
                                >
                                  ★
                                </span>
                              )
                            )}
                          </div>

                          <p className="mt-1 text-xs font-bold text-[#5B1725]">
                            {ratingNumber}/5
                          </p>

                        </div>

                      </div>

                      {/* =================================================
                          TRADE CONTEXT
                      ================================================== */}

                      <div className="rounded-2xl border border-[#E7DDDF] bg-white p-4">

                        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">

                          <div className="min-w-0">

                            <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-[#8A2638]">
                              Completed trade
                            </p>

                            <h4 className="mt-1 truncate text-sm font-black text-[#21191B]">
                              {tradeNumber}
                            </h4>

                            <p className="mt-1 text-xs text-gray-400">
                              Completed{" "}
                              {formatRatingDate(
                                completedAt
                              )}
                            </p>

                          </div>

                          {tradeId && (
                            <Link
                              to={`/trades/${tradeId}`}
                              className="inline-flex shrink-0 items-center justify-center rounded-xl bg-[#5B1725] px-4 py-2.5 text-xs font-bold text-white transition hover:bg-[#3D0F18]"
                            >
                              View Trade →
                            </Link>
                          )}

                        </div>

                        {/* TRADED ITEMS */}

                        {tradeItemNames.length > 0 && (
                          <div className="mt-4">

                            <p className="text-[11px] font-bold uppercase tracking-wide text-gray-400">
                              Items exchanged
                            </p>

                            <div className="mt-2 flex flex-wrap gap-2">

                              {tradeItemNames.map(
                                (itemName, index) => (
                                  <span
                                    key={`${itemName}-${index}`}
                                    className="rounded-full bg-[#F5E8EB] px-3 py-1.5 text-xs font-semibold text-[#5B1725]"
                                  >
                                    {itemName}
                                  </span>
                                )
                              )}

                            </div>

                          </div>
                        )}

                      </div>

                      {/* =================================================
                          COMMENT
                      ================================================== */}

                      {rating?.comment ? (
                        <div className="rounded-xl border border-[#EEE5E7] bg-white p-4">

                          <p className="text-xs font-bold uppercase tracking-wide text-gray-400">
                            Feedback
                          </p>

                          <p className="mt-2 text-sm leading-7 text-gray-600">
                            "{rating.comment}"
                          </p>

                        </div>
                      ) : (
                        <div className="rounded-xl bg-white px-4 py-3">

                          <p className="text-sm italic text-gray-400">
                            No written comment was provided.
                          </p>

                        </div>
                      )}

                    </div>
                  </article>
                );
              })}

              </div>
            )}

            {!reputationLoading &&
              ratings.length > 0 && (
                <div className="mt-5 rounded-xl bg-gray-50 p-4">
                  <p className="text-xs font-bold uppercase tracking-wide text-gray-500">
                    Reputation history
                  </p>

                  <p className="mt-2 text-sm leading-6 text-gray-600">
                    These ratings come from completed barter trades
                    where another trader reviewed your trade experience.
                  </p>
                </div>
              )}
          </div>
        </section>

        {/* =====================================================
            MAIN CONTENT
        ====================================================== */}

        <div className="mt-5 grid gap-5 lg:grid-cols-[1.35fr_0.65fr]">

          {/* =================================================
              PROFILE DETAILS
          ================================================== */}

          <section className="rounded-3xl border border-[#E7DDDF] bg-white p-5 shadow-sm sm:p-7">

            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.16em] text-[#8A2638]">
                  Personal information
                </p>

                <h2 className="mt-1 text-xl font-black text-[#21191B]">
                  Profile Details
                </h2>

                <p className="mt-1 text-sm text-gray-500">
                  Information associated with your account.
                </p>
              </div>
            </div>

            <div className="mt-6 grid gap-3 sm:grid-cols-2">

              {/* Name */}

              <div className="rounded-2xl border border-[#EEE5E7] bg-[#FBF8F8] p-4">
                <div className="flex items-center gap-3">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-white text-sm shadow-sm">
                    👤
                  </div>

                  <div className="min-w-0">
                    <p className="text-[11px] font-bold uppercase tracking-wide text-gray-400">
                      Full name
                    </p>

                    <p className="mt-1 truncate text-sm font-bold text-[#21191B]">
                      {user.name || "Not provided"}
                    </p>
                  </div>
                </div>
              </div>

              {/* Email */}

              <div className="rounded-2xl border border-[#EEE5E7] bg-[#FBF8F8] p-4">
                <div className="flex items-center gap-3">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-white text-sm shadow-sm">
                    ✉️
                  </div>

                  <div className="min-w-0">
                    <p className="text-[11px] font-bold uppercase tracking-wide text-gray-400">
                      Email
                    </p>

                    <p className="mt-1 break-all text-sm font-bold text-[#21191B]">
                      {user.email || "Not provided"}
                    </p>
                  </div>
                </div>
              </div>

              {/* Phone */}

              <div className="rounded-2xl border border-[#EEE5E7] bg-[#FBF8F8] p-4">
                <div className="flex items-center gap-3">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-white text-sm shadow-sm">
                    📞
                  </div>

                  <div className="min-w-0">
                    <p className="text-[11px] font-bold uppercase tracking-wide text-gray-400">
                      Phone
                    </p>

                    <p className="mt-1 truncate text-sm font-bold text-[#21191B]">
                      {user?.phone || "Not provided"}
                    </p>
                  </div>
                </div>
              </div>

              {/* Location */}

              <div className="rounded-2xl border border-[#EEE5E7] bg-[#FBF8F8] p-4">
                <div className="flex items-center gap-3">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-white text-sm shadow-sm">
                    📍
                  </div>

                  <div className="min-w-0">
                    <p className="text-[11px] font-bold uppercase tracking-wide text-gray-400">
                      Location
                    </p>

                    <p className="mt-1 truncate text-sm font-bold text-[#21191B]">
                      {user.location || "Not provided"}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Bio */}

            <div className="mt-3 rounded-2xl border border-[#EEE5E7] bg-[#FBF8F8] p-4">
              <div className="flex items-start gap-3">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-white text-sm shadow-sm">
                  💬
                </div>

                <div className="min-w-0">
                  <p className="text-[11px] font-bold uppercase tracking-wide text-gray-400">
                    About you
                  </p>

                  <p className="mt-2 text-sm leading-6 text-gray-600">
                    {user.bio ||
                      "No bio added yet. Add a short description about yourself to make your profile more personal."}
                  </p>
                </div>
              </div>
            </div>
          </section>

          {/* =================================================
              ACCOUNT SUMMARY
          ================================================== */}

          <aside className="space-y-5">

            {/* Profile status */}

            <div className="rounded-3xl border border-[#E7DDDF] bg-white p-5 shadow-sm sm:p-6">

              <p className="text-xs font-bold uppercase tracking-[0.16em] text-[#8A2638]">
                Account
              </p>

              <h2 className="mt-1 text-xl font-black text-[#21191B]">
                Account Status
              </h2>

              <div className="mt-5 space-y-3">

                <div className="flex items-center justify-between rounded-xl bg-[#FBF8F8] px-4 py-3">
                  <span className="text-sm text-gray-500">
                    Status
                  </span>

                  <span className="rounded-full bg-green-50 px-2.5 py-1 text-xs font-bold text-green-700">
                    Active
                  </span>
                </div>

                <div className="flex items-center justify-between rounded-xl bg-[#FBF8F8] px-4 py-3">
                  <span className="text-sm text-gray-500">
                    Sign-in
                  </span>

                  <span className="text-sm font-bold text-[#21191B]">
                    {accountType}
                  </span>
                </div>

                {user.createdAt && (
                  <div className="flex items-center justify-between rounded-xl bg-[#FBF8F8] px-4 py-3">
                    <span className="text-sm text-gray-500">
                      Member since
                    </span>

                    <span className="text-sm font-bold text-[#21191B]">
                      {new Date(
                        user.createdAt
                      ).toLocaleDateString(
                        undefined,
                        {
                          month: "short",
                          year: "numeric",
                        }
                      )}
                    </span>
                  </div>
                )}
              </div>
            </div>

            {/* Trading links */}

            <div className="rounded-3xl border border-[#E7DDDF] bg-white p-5 shadow-sm sm:p-6">

              <p className="text-xs font-bold uppercase tracking-[0.16em] text-[#8A2638]">
                Quick access
              </p>

              <h2 className="mt-1 text-xl font-black text-[#21191B]">
                Trading Activity
              </h2>

              <div className="mt-4 space-y-2">

                <Link
                  to="/my-listings"
                  className="group flex items-center justify-between rounded-xl border border-[#EEE5E7] px-4 py-3 transition hover:border-[#D9C0C6] hover:bg-[#FBF5F6]"
                >
                  <div className="flex items-center gap-3">
                    <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-[#F5E8EB]">
                      📦
                    </div>

                    <div>
                      <p className="text-sm font-bold text-[#21191B]">
                        My Listings
                      </p>

                      <p className="text-xs text-gray-500">
                        Manage your items
                      </p>
                    </div>
                  </div>

                  <span className="text-[#5B1725] transition group-hover:translate-x-1">
                    →
                  </span>
                </Link>

                <Link
                  to="/offers"
                  className="group flex items-center justify-between rounded-xl border border-[#EEE5E7] px-4 py-3 transition hover:border-[#D9C0C6] hover:bg-[#FBF5F6]"
                >
                  <div className="flex items-center gap-3">
                    <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-[#F8EED5]">
                      🤝
                    </div>

                    <div>
                      <p className="text-sm font-bold text-[#21191B]">
                        My Offers
                      </p>

                      <p className="text-xs text-gray-500">
                        Review trade offers
                      </p>
                    </div>
                  </div>

                  <span className="text-[#5B1725] transition group-hover:translate-x-1">
                    →
                  </span>
                </Link>

                <Link
                  to="/trades"
                  className="group flex items-center justify-between rounded-xl border border-[#EEE5E7] px-4 py-3 transition hover:border-[#D9C0C6] hover:bg-[#FBF5F6]"
                >
                  <div className="flex items-center gap-3">
                    <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-[#F5E8EB]">
                      🔄
                    </div>

                    <div>
                      <p className="text-sm font-bold text-[#21191B]">
                        My Trades
                      </p>

                      <p className="text-xs text-gray-500">
                        Track your trades
                      </p>
                    </div>
                  </div>

                  <span className="text-[#5B1725] transition group-hover:translate-x-1">
                    →
                  </span>
                </Link>

              </div>
            </div>
          </aside>
        </div>

        {/* =====================================================
            MOBILE DASHBOARD
        ====================================================== */}

        <div className="mt-5 sm:hidden">
          <Link
            to="/dashboard"
            className="flex w-full items-center justify-center rounded-xl border border-[#5B1725] bg-white px-4 py-3 text-sm font-bold text-[#5B1725] shadow-sm transition hover:bg-[#F9F1F3]"
          >
            ← Back to Dashboard
          </Link>
        </div>

      </main>
    </div>
  );
};

export default Profile;

