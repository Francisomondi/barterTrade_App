
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

      <section className="relative isolate overflow-hidden bg-[#3D0F18]">

        {/* HERO BACKGROUND */}
        <div
          className="absolute inset-0 -z-20 bg-cover bg-center bg-no-repeat"
          style={{
            backgroundImage: "url('/images/hero.jpeg')",
          }}
        />

        {/* DARK OVERLAY */}
        <div className="absolute inset-0 -z-10 bg-[#3D0F18]/80" />

        {/* DECORATIVE GLOW */}
        <div className="pointer-events-none absolute -right-40 -top-40 -z-10 h-[420px] w-[420px] rounded-full bg-[#A83A50]/20 blur-[100px]" />

        <div className="pointer-events-none absolute -bottom-40 -left-40 -z-10 h-[420px] w-[420px] rounded-full bg-[#701F30]/30 blur-[100px]" />

        {/* HERO CONTENT */}
        <div className="mx-auto max-w-7xl px-4 py-14 sm:px-6 sm:py-16 md:px-8 md:py-20">

          <div className="max-w-4xl">

            {/* BADGE */}
            <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-3 py-1.5 text-xs font-semibold text-white shadow-lg backdrop-blur-md sm:text-sm">

              <span className="h-1.5 w-1.5 rounded-full bg-[#DCAEB7]" />

              Kenya&apos;s Barter Marketplace

            </div>

            {/* TITLE */}
            <h1 className="max-w-3xl text-4xl font-extrabold leading-[1.05] tracking-tight text-white sm:text-5xl md:text-6xl lg:text-7xl">

              Trade what you have

              <br />

              <span className="text-[#DCAEB7]">
                for what you need.
              </span>

            </h1>

            {/* DESCRIPTION */}
            <p className="mt-5 max-w-xl text-sm leading-6 text-white/80 sm:text-base sm:leading-7 md:text-lg">

              Exchange items of similar value with people around you.

              <br className="hidden sm:block" />

              No complicated buying process. Just find an item, make an offer
              and trade.

            </p>

            {/* SEARCH */}
            <div className="mt-7 max-w-4xl sm:mt-8">

              <div className="flex flex-col gap-2 rounded-2xl border border-white/10 bg-black/20 p-2 shadow-2xl backdrop-blur-xl sm:flex-row">

                <div className="relative flex-1">

                  <div className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-lg">
                    🔍
                  </div>

                  <input
                    type="text"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Search phones, cars, laptops, furniture..."
                    className="
                      h-12 w-full rounded-xl
                      border border-white/10
                      bg-white
                      px-11
                      text-sm text-gray-900
                      outline-none
                      transition
                      placeholder:text-gray-400
                      focus:border-[#8A2638]
                      focus:ring-4
                      focus:ring-[#8A2638]/20
                      sm:h-13
                    "
                  />

                </div>

                <button
                  type="button"
                  className="
                    h-12 rounded-xl
                    bg-[#8A2638]
                    px-7
                    text-sm font-bold
                    text-white
                    shadow-md
                    transition
                    hover:bg-[#701F30]
                    hover:shadow-lg
                    sm:h-13
                  "
                >
                  Search
                </button>

              </div>

            </div>

            {/* POPULAR SEARCHES */}
            <div className="mt-4 flex flex-wrap items-center gap-2 text-xs sm:text-sm">

              <span className="mr-1 text-white/50">
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
                  className="
                    rounded-full
                    border border-white/10
                    bg-white/5
                    px-3 py-1.5
                    font-medium
                    text-white/75
                    backdrop-blur
                    transition
                    hover:border-white/25
                    hover:bg-white/10
                    hover:text-white
                  "
                >
                  {item}
                </button>
              ))}

            </div>

          </div>

        </div>

        {/* BOTTOM CURVE */}
        <div className="absolute bottom-0 left-0 right-0 h-6 rounded-t-[50%] bg-[#F8F5F3] sm:h-8" />

      </section>


      {/* ======================================================
          MAIN
      ======================================================= */}

      <main className="mx-auto max-w-7xl px-4 py-7 sm:px-6 sm:py-9 md:px-8 md:py-10">


        {/* ====================================================
            CATEGORIES
        ===================================================== */}

        <section>

          <div className="mb-4 flex items-end justify-between gap-4">

            <div>

              <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-[#8A2638]">
                Explore
              </p>

              <h2 className="mt-1 text-xl font-black text-[#21191B] sm:text-2xl">
                Browse categories
              </h2>

              <p className="mt-1 text-xs text-gray-500 sm:text-sm">
                Discover things people are willing to exchange.
              </p>

            </div>

            {categoryId && (
              <button
                type="button"
                onClick={() => setCategoryId("")}
                className="
                  shrink-0
                  text-xs font-semibold
                  text-[#8A2638]
                  transition
                  hover:text-[#3D0F18]
                  sm:text-sm
                "
              >
                Clear
              </button>
            )}

          </div>


          {/* CATEGORY BUTTONS */}

          <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-thin">

            {/* ALL */}

            <button
              type="button"
              onClick={() => setCategoryId("")}
              className={`
                flex-shrink-0
                rounded-lg
                border
                px-3.5 py-2
                text-xs font-bold
                shadow-sm
                transition
                sm:px-4 sm:py-2.5 sm:text-sm
                ${
                  !categoryId
                    ? "border-[#5B1725] bg-[#5B1725] text-white shadow-[#5B1725]/20"
                    : "border-[#E7DDDF] bg-white text-gray-700 hover:border-[#8A2638] hover:text-[#5B1725]"
                }
              `}
            >
              All Items
            </button>


            {/* DYNAMIC CATEGORIES */}

            {categories.map((category) => (
              <button
                key={category.id}
                type="button"
                onClick={() => setCategoryId(category.id)}
                className={`
                  flex-shrink-0
                  rounded-lg
                  border
                  px-3.5 py-2
                  text-xs font-bold
                  shadow-sm
                  transition
                  sm:px-4 sm:py-2.5 sm:text-sm
                  ${
                    categoryId === category.id
                      ? "border-[#5B1725] bg-[#5B1725] text-white shadow-[#5B1725]/20"
                      : "border-[#E7DDDF] bg-white text-gray-700 hover:border-[#8A2638] hover:text-[#5B1725]"
                  }
                `}
              >
                {category.name}
              </button>
            ))}

          </div>

        </section>


        {/* ====================================================
            FILTERS
        ===================================================== */}

        <section className="mt-5 rounded-xl border border-[#E7DDDF] bg-white p-3.5 shadow-sm sm:mt-6 sm:p-4">

          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">

            <div className="min-w-0">

              <p className="text-sm font-bold text-[#21191B]">
                Refine your search
              </p>

              <p className="mt-0.5 text-xs text-gray-500">
                Filter by item condition.
              </p>

            </div>


            <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row">

              {/* CONDITION */}

              <select
                value={condition}
                onChange={(e) => setCondition(e.target.value)}
                className="
                  h-10
                  min-w-0
                  rounded-lg
                  border border-[#E7DDDF]
                  bg-[#FBF5F6]
                  px-3
                  text-xs font-medium
                  text-gray-700
                  outline-none
                  transition
                  focus:border-[#8A2638]
                  focus:ring-2
                  focus:ring-[#8A2638]/10
                  sm:min-w-[170px]
                  sm:text-sm
                "
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
                className="
                  h-10
                  rounded-lg
                  border border-[#E7DDDF]
                  bg-white
                  px-4
                  text-xs font-semibold
                  text-gray-600
                  transition
                  hover:border-[#8A2638]
                  hover:bg-[#FBF5F6]
                  hover:text-[#5B1725]
                  sm:text-sm
                "
              >
                Clear filters
              </button>

            </div>

          </div>

        </section>


        {/* ====================================================
            LISTINGS
        ===================================================== */}

        <section className="mt-8 sm:mt-10">


          {/* HEADER */}

          <div className="mb-4 flex items-end justify-between gap-4 sm:mb-5">

            <div>

              <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-[#8A2638]">
                Marketplace
              </p>

              <h2 className="mt-1 text-xl font-black text-[#21191B] sm:text-2xl">
                Available for barter
              </h2>

              <p className="mt-1 text-xs text-gray-500 sm:text-sm">
                Items currently available for exchange.
              </p>

            </div>


            <div className="shrink-0 rounded-full bg-[#F5E8EB] px-3 py-1.5 text-xs font-bold text-[#5B1725] sm:px-4 sm:py-2 sm:text-sm">
              {listings.length} items
            </div>

          </div>


          {/* ==================================================
              LOADING
          =================================================== */}

          {loading && (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">

              {[1, 2, 3, 4].map((item) => (
                <div
                  key={item}
                  className="
                    overflow-hidden
                    rounded-xl
                    border border-[#E7DDDF]
                    bg-white
                    shadow-sm
                  "
                >

                  {/* IMAGE */}

                  <div className="aspect-[4/3] animate-pulse bg-gray-200" />


                  {/* CONTENT */}

                  <div className="space-y-3 p-4">

                    <div className="h-3 w-16 animate-pulse rounded bg-gray-200" />

                    <div className="h-4 w-3/4 animate-pulse rounded bg-gray-200" />

                    <div className="h-3.5 w-full animate-pulse rounded bg-gray-200" />

                    <div className="h-3.5 w-2/3 animate-pulse rounded bg-gray-200" />

                  </div>

                </div>
              ))}

            </div>
          )}


          {/* ==================================================
              ERROR
          =================================================== */}

          {error && (
            <div className="rounded-xl border border-red-200 bg-red-50 p-5 text-red-700 sm:p-6">

              <p className="text-sm font-bold">
                Something went wrong
              </p>

              <p className="mt-1 text-xs text-red-600 sm:text-sm">
                {error}
              </p>

              <button
                type="button"
                onClick={() => window.location.reload()}
                className="
                  mt-4
                  rounded-lg
                  bg-[#8A2638]
                  px-4 py-2
                  text-xs font-semibold
                  text-white
                  transition
                  hover:bg-[#701F30]
                  sm:text-sm
                "
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
              <div className="rounded-xl border border-[#E7DDDF] bg-white px-5 py-16 text-center shadow-sm sm:px-6 sm:py-20">

                <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-[#F5E8EB] text-xl">
                  🔎
                </div>

                <h3 className="mt-4 text-lg font-bold text-[#21191B] sm:text-xl">
                  No items found
                </h3>

                <p className="mx-auto mt-2 max-w-md text-xs leading-5 text-gray-500 sm:text-sm sm:leading-6">
                  We couldn&apos;t find any items matching your search.
                  Try another category or search term.
                </p>

                <button
                  type="button"
                  onClick={clearFilters}
                  className="
                    mt-5
                    rounded-lg
                    bg-[#5B1725]
                    px-5 py-2.5
                    text-xs font-bold
                    text-white
                    shadow-md
                    transition
                    hover:bg-[#3D0F18]
                    sm:text-sm
                  "
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
              <div
                className="
                  grid
                  grid-cols-1
                  gap-4
                  sm:grid-cols-2
                  sm:gap-4
                  md:grid-cols-3
                  lg:grid-cols-4
                  xl:gap-5
                "
              >

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

