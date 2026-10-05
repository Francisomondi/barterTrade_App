import { useEffect, useState } from "react";
import { Link } from "react-router-dom";

import {
  getMyListings,
  removeListing,
} from "../api/listingApi";

const MyListings = () => {
  const [listings, setListings] = useState([]);
  const [loading, setLoading] = useState(true);

  /*
   * ============================================================
   * LOAD LISTINGS
   * ============================================================
   */

  const loadListings = async () => {
    try {
      const data = await getMyListings();

      setListings(data.listings || []);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadListings();
  }, []);

  /*
   * ============================================================
   * REMOVE LISTING
   * ============================================================
   */

  const handleRemove = async (id) => {
    const confirmed = window.confirm(
      "Remove this listing?"
    );

    if (!confirmed) return;

    try {
      await removeListing(id);

      setListings((currentListings) =>
        currentListings.filter(
          (listing) => listing.id !== id
        )
      );
    } catch (error) {
      console.error(error);

      alert(
        error.response?.data?.message ||
          "Unable to remove listing."
      );
    }
  };

  /*
   * ============================================================
   * HELPERS
   * ============================================================
   */

  const getStatusStyles = (status) => {
    const styles = {
      ACTIVE:
        "border-green-200 bg-green-50 text-green-700",

      TRADED:
        "border-blue-200 bg-blue-50 text-blue-700",

      PENDING:
        "border-amber-200 bg-amber-50 text-amber-700",

      INACTIVE:
        "border-gray-200 bg-gray-100 text-gray-600",
    };

    return (
      styles[status] ||
      "border-gray-200 bg-gray-100 text-gray-600"
    );
  };

  const formatStatus = (status) => {
    if (!status) return "Unknown";

    return status
      .replace(/_/g, " ")
      .toLowerCase()
      .replace(/\b\w/g, (letter) =>
        letter.toUpperCase()
      );
  };

  /*
   * ============================================================
   * LOADING
   * ============================================================
   */

  if (loading) {
    return (
      <div className="min-h-screen bg-[#F8F5F3]">
        <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 sm:py-10 lg:px-8">
          <div className="animate-pulse">
            {/* HEADER */}

            <div className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <div className="h-3 w-28 rounded bg-gray-200" />

                <div className="mt-3 h-9 w-52 rounded-lg bg-gray-200" />

                <div className="mt-3 h-4 w-80 max-w-full rounded bg-gray-200" />
              </div>

              <div className="h-11 w-32 rounded-xl bg-gray-200" />
            </div>

            {/* SUMMARY */}

            <div className="mt-8 h-20 rounded-2xl bg-gray-200" />

            {/* CARDS */}

            <div className="mt-6 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {[1, 2, 3, 4, 5, 6].map(
                (item) => (
                  <div
                    key={item}
                    className="overflow-hidden rounded-2xl border border-gray-100 bg-white"
                  >
                    <div className="aspect-[16/10] bg-gray-200" />

                    <div className="p-4">
                      <div className="h-5 w-3/4 rounded bg-gray-200" />

                      <div className="mt-3 h-3 w-1/2 rounded bg-gray-200" />

                      <div className="mt-5 h-6 w-1/3 rounded bg-gray-200" />

                      <div className="mt-5 grid grid-cols-2 gap-2">
                        <div className="h-10 rounded-lg bg-gray-200" />

                        <div className="h-10 rounded-lg bg-gray-200" />
                      </div>
                    </div>
                  </div>
                )
              )}
            </div>
          </div>
        </main>
      </div>
    );
  }

  /*
   * ============================================================
   * STATS
   * ============================================================
   */

  const activeListings = listings.filter(
    (listing) => listing.status === "ACTIVE"
  ).length;

  const tradedListings = listings.filter(
    (listing) => listing.status === "TRADED"
  ).length;

  const otherListings =
    listings.length -
    activeListings -
    tradedListings;

  /*
   * ============================================================
   * PAGE
   * ============================================================
   */

  return (
    <div className="min-h-screen bg-[#F8F5F3]">
      <main className="mx-auto max-w-7xl px-4 py-7 sm:px-6 sm:py-9 lg:px-8">
        {/* =================================================== */}
        {/* HEADER */}
        {/* =================================================== */}

        <header className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.16em] text-[#8A2638]">
              Your inventory
            </p>

            <div className="mt-1.5 flex flex-wrap items-center gap-3">
              <h1 className="text-3xl font-black tracking-tight text-[#21191B] sm:text-4xl">
                My Listings
              </h1>

              {listings.length > 0 && (
                <span className="rounded-full bg-[#F1E2E5] px-3 py-1 text-xs font-bold text-[#5B1725]">
                  {listings.length}{" "}
                  {listings.length === 1
                    ? "item"
                    : "items"}
                </span>
              )}
            </div>

            <p className="mt-2 max-w-xl text-sm leading-6 text-gray-500">
              Manage your barter items, monitor their
              status and control how they appear to
              other traders.
            </p>
          </div>

          <Link
            to="/listings/create"
            className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-[#5B1725] px-5 py-3 text-sm font-bold text-white shadow-sm transition hover:bg-[#3D0F18] hover:shadow-md sm:w-auto"
          >
            <span className="text-lg leading-none">
              +
            </span>

            Add Item
          </Link>
        </header>

        {/* =================================================== */}
        {/* INVENTORY SUMMARY */}
        {/* =================================================== */}

        {listings.length > 0 && (
          <section className="mt-7 rounded-2xl border border-[#E7DDDF] bg-white px-5 py-4 shadow-[0_4px_18px_rgba(61,15,24,0.04)]">
            <div className="flex flex-wrap items-center gap-y-4">
              {/* TOTAL */}

              <div className="min-w-[120px] flex-1">
                <p className="text-xs font-medium text-gray-500">
                  Total listings
                </p>

                <p className="mt-1 text-xl font-black text-[#21191B]">
                  {listings.length}
                </p>
              </div>

              <div className="hidden h-10 w-px bg-[#E7DDDF] sm:block" />

              {/* ACTIVE */}

              <div className="min-w-[120px] flex-1 sm:px-6">
                <p className="text-xs font-medium text-gray-500">
                  Active
                </p>

                <div className="mt-1 flex items-center gap-2">
                  <span className="h-2 w-2 rounded-full bg-green-500" />

                  <p className="text-xl font-black text-[#21191B]">
                    {activeListings}
                  </p>
                </div>
              </div>

              <div className="hidden h-10 w-px bg-[#E7DDDF] sm:block" />

              {/* TRADED */}

              <div className="min-w-[120px] flex-1 sm:px-6">
                <p className="text-xs font-medium text-gray-500">
                  Traded
                </p>

                <p className="mt-1 text-xl font-black text-[#21191B]">
                  {tradedListings}
                </p>
              </div>

              <div className="hidden h-10 w-px bg-[#E7DDDF] sm:block" />

              {/* OTHER */}

              <div className="min-w-[120px] flex-1 sm:pl-6">
                <p className="text-xs font-medium text-gray-500">
                  Other
                </p>

                <p className="mt-1 text-xl font-black text-[#21191B]">
                  {otherListings}
                </p>
              </div>
            </div>
          </section>
        )}

        {/* =================================================== */}
        {/* EMPTY STATE */}
        {/* =================================================== */}

        {listings.length === 0 ? (
          <section className="mt-8 overflow-hidden rounded-2xl border border-[#E7DDDF] bg-white shadow-[0_4px_20px_rgba(61,15,24,0.04)]">
            <div className="px-6 py-14 text-center sm:px-10 sm:py-20">
              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-[#F5E8EB] text-3xl">
                📦
              </div>

              <p className="mt-6 text-xs font-bold uppercase tracking-[0.14em] text-[#8A2638]">
                Start trading
              </p>

              <h2 className="mt-2 text-2xl font-black text-[#21191B]">
                Your inventory is empty
              </h2>

              <p className="mx-auto mt-3 max-w-md text-sm leading-6 text-gray-500">
                List something you no longer need and
                discover what other BarterConnect
                members are willing to exchange for it.
              </p>

              <Link
                to="/listings/create"
                className="mt-7 inline-flex items-center gap-2 rounded-xl bg-[#5B1725] px-5 py-3 text-sm font-bold text-white shadow-sm transition hover:bg-[#3D0F18] hover:shadow-md"
              >
                List your first item
                <span>→</span>
              </Link>
            </div>
          </section>
        ) : (
          /* ================================================= */
          /* LISTINGS */
          /* ================================================= */

          <section className="mt-7">
            {/* SECTION HEADER */}

            <div className="mb-4 flex items-end justify-between gap-4">
              <div>
                <h2 className="text-lg font-black text-[#21191B]">
                  Your items
                </h2>

                <p className="mt-1 text-sm text-gray-500">
                  Select an item to view or manage it.
                </p>
              </div>
            </div>

            {/* LISTING GRID */}

            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {listings.map((listing) => {
                const primaryImage =
                  listing.images?.find(
                    (image) => image.isPrimary
                  ) ||
                  listing.images?.[0];

                const image =
                  primaryImage?.url ||
                  "https://placehold.co/800x600?text=No+Image";

                const statusClass =
                  getStatusStyles(
                    listing.status
                  );

                return (
                  <article
                    key={listing.id}
                    className="group overflow-hidden rounded-2xl border border-[#E7DDDF] bg-white shadow-[0_3px_14px_rgba(61,15,24,0.04)] transition duration-200 hover:-translate-y-0.5 hover:border-[#D9C5C9] hover:shadow-[0_10px_28px_rgba(61,15,24,0.09)]"
                  >
                    {/* ======================================= */}
                    {/* IMAGE */}
                    {/* ======================================= */}

                    <Link
                      to={`/listings/${listing.id}`}
                      className="block"
                    >
                      <div className="relative aspect-[16/10] overflow-hidden bg-[#EEE8EA]">
                        <img
                          src={image}
                          alt={listing.title}
                          className="h-full w-full object-cover transition duration-500 group-hover:scale-[1.035]"
                        />

                        {/* IMAGE GRADIENT */}

                        <div className="pointer-events-none absolute inset-x-0 bottom-0 h-20 bg-gradient-to-t from-black/35 to-transparent" />

                        {/* STATUS */}

                        <span
                          className={`absolute left-3 top-3 inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-bold shadow-sm backdrop-blur-sm ${statusClass}`}
                        >
                          {formatStatus(
                            listing.status
                          )}
                        </span>

                        {/* IMAGE COUNT */}

                        {listing.images?.length >
                          0 && (
                          <span className="absolute bottom-3 right-3 rounded-lg bg-black/55 px-2.5 py-1 text-xs font-semibold text-white backdrop-blur-sm">
                            📷{" "}
                            {
                              listing.images
                                .length
                            }
                          </span>
                        )}
                      </div>
                    </Link>

                    {/* ======================================= */}
                    {/* CONTENT */}
                    {/* ======================================= */}

                    <div className="p-4 sm:p-5">
                      {/* TITLE */}

                      <div className="flex items-start justify-between gap-4">
                        <div className="min-w-0">
                          <Link
                            to={`/listings/${listing.id}`}
                          >
                            <h3 className="truncate text-base font-extrabold text-[#21191B] transition group-hover:text-[#5B1725] sm:text-lg">
                              {listing.title}
                            </h3>
                          </Link>

                          <p className="mt-1 truncate text-sm text-gray-500">
                            {listing.category
                              ?.name ||
                              "Other"}
                          </p>
                        </div>
                      </div>

                      {/* VALUE */}

                      <div className="mt-4 flex items-end justify-between gap-3 border-b border-[#EFE7E9] pb-4">
                        <div>
                          <p className="text-xs font-medium text-gray-400">
                            Estimated barter value
                          </p>

                          <p className="mt-1 text-xl font-black text-[#5B1725]">
                            KES{" "}
                            {Number(
                              listing.estimatedValue ||
                                0
                            ).toLocaleString(
                              "en-KE"
                            )}
                          </p>
                        </div>

                        {listing.condition && (
                          <span className="max-w-[130px] truncate rounded-lg bg-[#F8F5F3] px-2.5 py-1.5 text-xs font-semibold capitalize text-gray-600">
                            {listing.condition.replace(
                              /_/g,
                              " "
                            )}
                          </span>
                        )}
                      </div>

                      {/* ===================================== */}
                      {/* PRIMARY ACTION */}
                      {/* ===================================== */}

                      <Link
                        to={`/listings/${listing.id}/manage`}
                        className="mt-4 flex w-full items-center justify-between rounded-xl bg-[#3D0F18] px-4 py-3 text-sm font-bold text-white transition hover:bg-[#5B1725]"
                      >
                        <span>
                          Manage listing
                        </span>

                        <span>→</span>
                      </Link>

                      {/* ===================================== */}
                      {/* SECONDARY ACTIONS */}
                      {/* ===================================== */}

                      <div className="mt-2 flex items-center justify-between">
                        <Link
                          to={`/listings/${listing.id}`}
                          className="rounded-lg px-2 py-2 text-sm font-semibold text-gray-500 transition hover:bg-[#F8F5F3] hover:text-[#5B1725]"
                        >
                          View listing
                        </Link>

                        {listing.status !==
                          "TRADED" && (
                          <button
                            type="button"
                            onClick={() =>
                              handleRemove(
                                listing.id
                              )
                            }
                            className="rounded-lg px-2 py-2 text-sm font-semibold text-red-500 transition hover:bg-red-50 hover:text-red-600"
                          >
                            Remove
                          </button>
                        )}
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>
          </section>
        )}
      </main>
    </div>
  );
};

export default MyListings;