
import { useEffect, useState } from "react";

import { getListings } from "../api/listingApi";
import { getCategories } from "../api/categoryApi";
import ListingCard from "../components/ListingCard";

const Marketplace = () => {
  const [listings, setListings] = useState([]);
  const [categories, setCategories] = useState([]);

  const [search, setSearch] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [condition, setCondition] = useState("");

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  /*
   * ============================================================
   * LOAD CATEGORIES
   * ============================================================
   */

  useEffect(() => {
    const loadCategories = async () => {
      try {
        const data = await getCategories();

        setCategories(data.categories || []);
      } catch (error) {
        console.error("Category error:", error);
      }
    };

    loadCategories();
  }, []);

  /*
   * ============================================================
   * LOAD LISTINGS
   * ============================================================
   */

  useEffect(() => {
    const loadListings = async () => {
      try {
        setLoading(true);
        setError("");

        const params = {};

        if (search.trim()) {
          params.search = search.trim();
        }

        if (categoryId) {
          params.categoryId = categoryId;
        }

        if (condition) {
          params.condition = condition;
        }

        const data = await getListings(params);

        setListings(data.listings || []);
      } catch (error) {
        console.error("Listing error:", error);

        setError("Unable to load listings.");
      } finally {
        setLoading(false);
      }
    };

    const timer = setTimeout(loadListings, 300);

    return () => clearTimeout(timer);
  }, [search, categoryId, condition]);

  /*
   * ============================================================
   * CLEAR FILTERS
   * ============================================================
   */

  const clearFilters = () => {
    setSearch("");
    setCategoryId("");
    setCondition("");
  };

  /*
   * ============================================================
   * UI
   * ============================================================
   */

  return (
    <div className="min-h-screen bg-[#F8F5F3] text-[#21191B]">

      {/* ======================================================
          HERO
      ======================================================= */}

      <section className="relative isolate overflow-hidden]">

        {/* 3D BACKGROUND IMAGE */}

        <div
          className="absolute inset-0 -z-20 bg-cover bg-center bg-no-repeat"
          style={{
            backgroundImage:
              "url('/images/hero.jpeg')",
          }}
        />

        {/* IMAGE OPACITY */}

        <div className="absolute inset-0 -z-10 bg-[#3D0F18]/60" />

        {/* DARK MAROON OVERLAY */}

        <div className="absolute inset-0 -z-10" />

        {/* BOTTOM FADE */}

        <div className="absolute inset-x-0 bottom-0 -z-10 h-40 " />

        {/* DECORATIVE GLOW */}

        <div className="absolute -right-32 -top-32 -z-10 h-96 w-96 rounded-full bg-[#8A2638]/30 blur-3xl" />

        <div className="absolute -bottom-40 left-20 -z-10 h-96 w-96 rounded-full bg-[#701F30]/30 blur-3xl" />

        {/* HERO CONTENT */}

        <div className="mx-auto max-w-7xl px-6 py-20 md:py-28 lg:py-32">

          <div className="max-w-3xl">

            {/* BADGE */}

            <div className="mb-7 inline-flex items-center gap-3 rounded-full border border-white/20 bg-white/10 px-5 py-2.5 text-sm font-semibold text-white shadow-lg backdrop-blur-md">

              <span className="h-2.5 w-2.5 rounded-full bg-[#DCAEB7] shadow-[0_0_12px_rgba(220,174,183,0.8)]" />

              Kenya&apos;s Barter Marketplace

            </div>

            {/* HEADING */}

            <h1 className="text-4xl font-black leading-[1.05] tracking-tight text-white sm:text-5xl md:text-6xl lg:text-7xl">

              Trade what you have

              <br />

              <span className="text-[#DCAEB7]">
                for what you need.
              </span>

            </h1>

            {/* DESCRIPTION */}

            <p className="mt-7 max-w-2xl text-base leading-7 text-white/80 md:text-lg">

              Exchange items of similar value
              with other people without
              traditional buying and selling.

              <span className="block mt-2 text-white/60">
                Find it. Offer it. Trade it.
              </span>

            </p>

            {/* SEARCH CONTAINER */}

            <div className="mt-10 max-w-4xl">

              <div className="flex flex-col gap-3 rounded-2xl border border-white/20 bg-white/10 p-3 shadow-2xl backdrop-blur-xl md:flex-row">

                {/* SEARCH INPUT */}

                <div className="relative flex-1">

                  <span className="pointer-events-none absolute left-5 top-1/2 -translate-y-1/2 text-xl text-gray-400">
                    🔍
                  </span>

                  <input
                    type="text"
                    value={search}
                    onChange={(e) =>
                      setSearch(e.target.value)
                    }
                    placeholder="Search phones, cars, laptops, furniture..."
                    className="w-full rounded-xl border border-white/20 bg-white px-12 py-4 text-gray-900 shadow-lg outline-none transition placeholder:text-gray-400 focus:border-[#8A2638] focus:ring-4 focus:ring-[#8A2638]/20"
                  />

                </div>

                {/* SEARCH BUTTON */}

                <button
                  type="button"
                  className="rounded-xl bg-[#8A2638] px-8 py-4 font-bold text-white shadow-lg transition duration-200 hover:bg-[#701F30] hover:shadow-xl active:scale-[0.98]"
                >
                  Search
                </button>

              </div>

            </div>

            {/* POPULAR SEARCHES */}

            <div className="mt-6 flex flex-wrap items-center gap-3 text-sm">

              <span className="font-medium text-white/50">
                Popular:
              </span>

              {[
                "iPhone",
                "Laptop",
                "Car",
                "Furniture",
              ].map((item) => (
                <button
                  key={item}
                  type="button"
                  onClick={() => setSearch(item)}
                  className="rounded-full border border-white/15 bg-white/10 px-4 py-1.5 text-white/75 backdrop-blur-sm transition hover:border-white/30 hover:bg-white/20 hover:text-white"
                >
                  {item}
                </button>
              ))}

            </div>

          </div>

        </div>

        {/* HERO BOTTOM CURVE */}

        <div className="absolute bottom-0 left-0 right-0 h-8 rounded-t-[50%] bg-[#F8F5F3]" />

      </section>

      {/* ======================================================
          MAIN
      ======================================================= */}

      <main className="mx-auto max-w-7xl px-6 py-10 md:py-14">

        {/* ====================================================
            CATEGORIES
        ===================================================== */}

        <section>

          <div className="mb-6 flex items-end justify-between">

            <div>

              <p className="text-sm font-bold uppercase tracking-[0.2em] text-[#8A2638]">
                Explore
              </p>

              <h2 className="mt-2 text-2xl font-black text-[#21191B] md:text-3xl">
                Browse categories
              </h2>

              <p className="mt-1 text-sm text-gray-500">
                Discover things people are
                willing to exchange.
              </p>

            </div>

            {categoryId && (
              <button
                type="button"
                onClick={() => setCategoryId("")}
                className="font-semibold text-[#8A2638] transition hover:text-[#3D0F18]"
              >
                Clear
              </button>
            )}

          </div>

          {/* CATEGORY BUTTONS */}

          <div className="flex gap-3 overflow-x-auto pb-3">

            {/* ALL */}

            <button
              type="button"
              onClick={() => setCategoryId("")}
              className={`flex-shrink-0 rounded-xl border px-5 py-3 text-sm font-bold shadow-sm transition ${
                !categoryId
                  ? "border-[#5B1725] bg-[#5B1725] text-white shadow-[#5B1725]/20"
                  : "border-[#E7DDDF] bg-white text-gray-700 hover:border-[#8A2638] hover:text-[#5B1725]"
              }`}
            >
              All Items
            </button>

            {/* DYNAMIC CATEGORIES */}

            {categories.map((category) => (
              <button
                key={category.id}
                type="button"
                onClick={() =>
                  setCategoryId(category.id)
                }
                className={`flex-shrink-0 rounded-xl border px-5 py-3 text-sm font-bold shadow-sm transition ${
                  categoryId === category.id
                    ? "border-[#5B1725] bg-[#5B1725] text-white shadow-[#5B1725]/20"
                    : "border-[#E7DDDF] bg-white text-gray-700 hover:border-[#8A2638] hover:text-[#5B1725]"
                }`}
              >
                {category.name}
              </button>
            ))}

          </div>

        </section>

        {/* ====================================================
            FILTERS
        ===================================================== */}

        <section className="mt-8 rounded-2xl border border-[#E7DDDF] bg-white p-5 shadow-sm">

          <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">

            <div>

              <p className="font-bold text-[#21191B]">
                Refine your search
              </p>

              <p className="mt-1 text-sm text-gray-500">
                Filter items by condition.
              </p>

            </div>

            <div className="flex flex-col gap-3 sm:flex-row">

              {/* CONDITION */}

              <select
                value={condition}
                onChange={(e) =>
                  setCondition(e.target.value)
                }
                className="min-w-[200px] rounded-xl border border-[#E7DDDF] bg-[#FBF5F6] px-5 py-3 text-sm font-medium text-gray-700 outline-none transition focus:border-[#8A2638] focus:ring-2 focus:ring-[#8A2638]/10"
              >

                <option value="">
                  Any condition
                </option>

                <option value="NEW">
                  New
                </option>

                <option value="LIKE_NEW">
                  Like New
                </option>

                <option value="GOOD">
                  Good
                </option>

                <option value="FAIR">
                  Fair
                </option>

                <option value="POOR">
                  Poor
                </option>

              </select>

              {/* CLEAR */}

              <button
                type="button"
                onClick={clearFilters}
                className="rounded-xl border border-[#E7DDDF] bg-white px-5 py-3 text-sm font-semibold text-gray-600 transition hover:border-[#8A2638] hover:bg-[#FBF5F6] hover:text-[#5B1725]"
              >
                Clear filters
              </button>

            </div>

          </div>

        </section>

        {/* ====================================================
            LISTINGS
        ===================================================== */}

        <section className="mt-12">

          {/* HEADER */}

          <div className="mb-7 flex items-end justify-between">

            <div>

              <p className="text-sm font-bold uppercase tracking-[0.2em] text-[#8A2638]">
                Marketplace
              </p>

              <h2 className="mt-2 text-2xl font-black text-[#21191B] md:text-3xl">
                Available for barter
              </h2>

              <p className="mt-1 text-sm text-gray-500">
                Items currently available
                for exchange.
              </p>

            </div>

            <div className="rounded-full bg-[#F5E8EB] px-4 py-2 text-sm font-bold text-[#5B1725]">
              {listings.length} items
            </div>

          </div>

          {/* ==================================================
              LOADING
          =================================================== */}

          {loading && (
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">

              {[1, 2, 3, 4].map((item) => (
                <div
                  key={item}
                  className="overflow-hidden rounded-2xl border border-[#E7DDDF] bg-white shadow-sm"
                >

                  {/* IMAGE */}

                  <div className="aspect-[4/3] animate-pulse bg-gray-200" />

                  {/* CONTENT */}

                  <div className="space-y-4 p-5">

                    <div className="h-3 w-20 animate-pulse rounded bg-gray-200" />

                    <div className="h-5 w-3/4 animate-pulse rounded bg-gray-200" />

                    <div className="h-4 w-full animate-pulse rounded bg-gray-200" />

                    <div className="h-4 w-2/3 animate-pulse rounded bg-gray-200" />

                  </div>

                </div>
              ))}

            </div>
          )}

          {/* ==================================================
              ERROR
          =================================================== */}

          {error && (
            <div className="rounded-2xl border border-red-200 bg-red-50 p-6 text-red-700">

              <p className="font-bold">
                Something went wrong
              </p>

              <p className="mt-1 text-sm">
                {error}
              </p>

              <button
                type="button"
                onClick={() => window.location.reload()}
                className="mt-4 rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-700"
              >
                Try again
              </button>

            </div>
          )}

          {/* ==================================================
              NO RESULTS
          =================================================== */}

          {!loading &&
            !error &&
            listings.length === 0 && (
              <div className="rounded-2xl border border-[#E7DDDF] bg-white px-6 py-24 text-center shadow-sm">

                <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-[#F5E8EB] text-2xl">
                  🔎
                </div>

                <h3 className="mt-5 text-xl font-bold text-[#21191B]">
                  No items found
                </h3>

                <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-gray-500">
                  We couldn&apos;t find any items
                  matching your search.
                  Try another category or
                  search term.
                </p>

                <button
                  type="button"
                  onClick={clearFilters}
                  className="mt-6 rounded-xl bg-[#5B1725] px-6 py-3 text-sm font-bold text-white shadow-lg transition hover:bg-[#3D0F18]"
                >
                  Browse all items
                </button>

              </div>
            )}

          {/* ==================================================
              LISTING GRID
          =================================================== */}

          {!loading &&
            !error &&
            listings.length > 0 && (
              <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">

                {listings.map((listing) => (
                  <ListingCard
                    key={listing.id}
                    listing={listing}
                  />
                ))}

              </div>
            )}

        </section>

      </main>

    </div>
  );
};

export default Marketplace;

