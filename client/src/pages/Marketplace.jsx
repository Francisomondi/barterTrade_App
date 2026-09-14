
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

      {/* ========================================================
          HERO
      ========================================================= */}

      <section className="relative isolate overflow-hidden bg-[#3D0F18]">

        {/* Background image */}
        <div
          className="absolute inset-0 -z-20 bg-cover bg-center"
          style={{
            backgroundImage: "url('/images/hero.jpeg')",
          }}
        />

        {/* Overlay */}
        <div className="absolute inset-0 -z-10 bg-[#3D0F18]/85" />

        {/* Gold glow */}
        <div className="pointer-events-none absolute -right-32 -top-32 h-80 w-80 rounded-full bg-[#D6B15E]/15 blur-[90px]" />

        <div className="pointer-events-none absolute -bottom-32 -left-32 h-80 w-80 rounded-full bg-[#8A2638]/30 blur-[90px]" />

        {/* Hero content */}
        <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 sm:py-12 lg:px-8 lg:py-14">

          <div className="max-w-4xl">

            {/* Badge */}
            <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-[#D6B15E]/30 bg-white/10 px-3 py-1.5 text-xs font-semibold text-white backdrop-blur-md">

              <span className="h-1.5 w-1.5 rounded-full bg-[#D6B15E]" />

              Kenya&apos;s Barter Marketplace

            </div>

            {/* Heading */}
            <h1 className="max-w-3xl text-4xl font-black leading-[1.05] tracking-tight text-white sm:text-5xl md:text-6xl">

              Trade what you have

              <br />

              <span className="text-[#D6B15E]">
                for what you need.
              </span>

            </h1>

            {/* Description */}
            <p className="mt-4 max-w-2xl text-sm leading-6 text-white/75 sm:text-base">

              Exchange items of similar value with people around you.
              Find something you need, make an offer and trade.

            </p>

            {/* Search */}
            <div className="mt-6 max-w-4xl">

              <div className="flex flex-col gap-2 rounded-2xl border border-white/10 bg-black/20 p-2 shadow-2xl backdrop-blur-xl sm:flex-row">

                <div className="relative flex-1">

                  <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-base text-gray-500">
                    🔍
                  </span>

                  <input
                    type="text"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Search phones, cars, laptops, furniture..."
                    className="
                      h-12
                      w-full
                      rounded-xl
                      border
                      border-transparent
                      bg-white
                      px-11
                      text-sm
                      text-[#21191B]
                      outline-none
                      transition
                      placeholder:text-gray-400
                      focus:border-[#D6B15E]
                      focus:ring-4
                      focus:ring-[#D6B15E]/15
                    "
                  />

                </div>

                <button
                  type="button"
                  className="
                    h-12
                    rounded-xl
                    bg-[#D6B15E]
                    px-7
                    text-sm
                    font-black
                    text-[#3D0F18]
                    shadow-md
                    transition
                    hover:bg-[#E3C878]
                    hover:shadow-lg
                  "
                >
                  Search
                </button>

              </div>

            </div>

            {/* Popular searches */}
            <div className="mt-3 flex flex-wrap items-center gap-2 text-xs">

              <span className="mr-1 text-white/45">
                Popular:
              </span>

              {["iPhone", "Laptop", "Car", "Furniture"].map((item) => (
                <button
                  key={item}
                  type="button"
                  onClick={() => setSearch(item)}
                  className="
                    rounded-full
                    border
                    border-white/10
                    bg-white/5
                    px-3
                    py-1.5
                    font-medium
                    text-white/70
                    backdrop-blur
                    transition
                    hover:border-[#D6B15E]/40
                    hover:bg-[#D6B15E]/10
                    hover:text-[#D6B15E]
                  "
                >
                  {item}
                </button>
              ))}

            </div>

          </div>

        </div>

        {/* Bottom curve */}
        <div className="absolute bottom-0 left-0 right-0 h-4 rounded-t-[50%] bg-[#F8F5F3] sm:h-5" />

      </section>


      {/* ========================================================
          MAIN CONTENT
      ========================================================= */}

      <main className="mx-auto max-w-7xl px-4 py-6 sm:px-6 sm:py-8 lg:px-8">

        {/* ======================================================
            CATEGORY SECTION
        ======================================================= */}

        <section>

          <div className="mb-3 flex items-end justify-between gap-3">

            <div>

              <p className="text-[10px] font-black uppercase tracking-[0.2em] text-[#8A2638]">
                Explore
              </p>

              <h2 className="mt-0.5 text-xl font-black text-[#21191B] sm:text-2xl">
                Browse categories
              </h2>

              <p className="mt-1 text-xs text-gray-500 sm:text-sm">
                Find items people are willing to exchange.
              </p>

            </div>

            {categoryId && (
              <button
                type="button"
                onClick={() => setCategoryId("")}
                className="
                  shrink-0
                  text-xs
                  font-bold
                  text-[#8A2638]
                  transition
                  hover:text-[#3D0F18]
                "
              >
                Clear
              </button>
            )}

          </div>

          {/* Category buttons */}
          <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-thin">

            <button
              type="button"
              onClick={() => setCategoryId("")}
              className={`
                flex-shrink-0
                rounded-lg
                border
                px-3
                py-2
                text-xs
                font-bold
                transition
                sm:px-4
                ${
                  !categoryId
                    ? "border-[#5B1725] bg-[#5B1725] text-white shadow-sm"
                    : "border-[#E7DDDF] bg-white text-gray-700 hover:border-[#D6B15E] hover:text-[#5B1725]"
                }
              `}
            >
              All Items
            </button>

            {categories.map((category) => (
              <button
                key={category.id}
                type="button"
                onClick={() => setCategoryId(category.id)}
                className={`
                  flex-shrink-0
                  rounded-lg
                  border
                  px-3
                  py-2
                  text-xs
                  font-bold
                  transition
                  sm:px-4
                  ${
                    categoryId === category.id
                      ? "border-[#5B1725] bg-[#5B1725] text-white shadow-sm"
                      : "border-[#E7DDDF] bg-white text-gray-700 hover:border-[#D6B15E] hover:text-[#5B1725]"
                  }
                `}
              >
                {category.name}
              </button>
            ))}

          </div>

        </section>


        {/* ======================================================
            FILTERS
        ======================================================= */}

        <section className="mt-4 rounded-xl border border-[#E7DDDF] bg-white p-3 shadow-sm sm:p-4">

          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">

            <div>

              <p className="text-sm font-black text-[#21191B]">
                Refine results
              </p>

              <p className="text-xs text-gray-500">
                Filter listings by condition.
              </p>

            </div>

            <div className="flex w-full gap-2 sm:w-auto">

              <select
                value={condition}
                onChange={(e) => setCondition(e.target.value)}
                className="
                  h-10
                  min-w-0
                  flex-1
                  rounded-lg
                  border
                  border-[#E7DDDF]
                  bg-[#FBF8F8]
                  px-3
                  text-xs
                  font-semibold
                  text-gray-700
                  outline-none
                  transition
                  focus:border-[#D6B15E]
                  focus:ring-2
                  focus:ring-[#D6B15E]/10
                  sm:min-w-[170px]
                  sm:flex-none
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

              <button
                type="button"
                onClick={clearFilters}
                className="
                  h-10
                  shrink-0
                  rounded-lg
                  border
                  border-[#E7DDDF]
                  bg-white
                  px-4
                  text-xs
                  font-bold
                  text-gray-600
                  transition
                  hover:border-[#D6B15E]
                  hover:bg-[#FBF5F6]
                  hover:text-[#5B1725]
                "
              >
                Clear
              </button>

            </div>

          </div>

        </section>


        {/* ======================================================
            LISTINGS
        ======================================================= */}

        <section className="mt-6 sm:mt-8">

          {/* Section header */}
          <div className="mb-4 flex items-end justify-between gap-3">

            <div>

              <p className="text-[10px] font-black uppercase tracking-[0.2em] text-[#8A2638]">
                Marketplace
              </p>

              <h2 className="mt-0.5 text-xl font-black text-[#21191B] sm:text-2xl">
                Available for barter
              </h2>

              <p className="mt-1 text-xs text-gray-500 sm:text-sm">
                Items currently available for exchange.
              </p>

            </div>

            <div className="shrink-0 rounded-full border border-[#D6B15E]/30 bg-[#F8F1DD] px-3 py-1.5 text-xs font-black text-[#5B1725]">
              {listings.length} {listings.length === 1 ? "item" : "items"}
            </div>

          </div>


          {/* ==================================================
              LOADING
          =================================================== */}

          {loading && (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">

              {[1, 2, 3, 4].map((item) => (
                <div
                  key={item}
                  className="
                    overflow-hidden
                    rounded-xl
                    border
                    border-[#E7DDDF]
                    bg-white
                    shadow-sm
                  "
                >

                  <div className="aspect-[4/3] animate-pulse bg-gray-200" />

                  <div className="space-y-3 p-4">

                    <div className="h-3 w-16 animate-pulse rounded bg-gray-200" />

                    <div className="h-4 w-3/4 animate-pulse rounded bg-gray-200" />

                    <div className="h-3 w-full animate-pulse rounded bg-gray-200" />

                    <div className="h-3 w-2/3 animate-pulse rounded bg-gray-200" />

                  </div>

                </div>
              ))}

            </div>
          )}


          {/* ==================================================
              ERROR
          =================================================== */}

          {error && (
            <div className="rounded-xl border border-red-200 bg-red-50 p-5">

              <div className="flex items-start gap-3">

                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-red-100 text-sm">
                  ⚠
                </div>

                <div>

                  <p className="text-sm font-black text-red-800">
                    Something went wrong
                  </p>

                  <p className="mt-1 text-xs text-red-600 sm:text-sm">
                    {error}
                  </p>

                  <button
                    type="button"
                    onClick={() => window.location.reload()}
                    className="
                      mt-3
                      rounded-lg
                      bg-[#5B1725]
                      px-4
                      py-2
                      text-xs
                      font-bold
                      text-white
                      transition
                      hover:bg-[#3D0F18]
                    "
                  >
                    Try again
                  </button>

                </div>

              </div>

            </div>
          )}


          {/* ==================================================
              NO RESULTS
          =================================================== */}

          {!loading &&
            !error &&
            listings.length === 0 && (
              <div className="rounded-xl border border-[#E7DDDF] bg-white px-5 py-12 text-center shadow-sm sm:py-14">

                <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-[#F8F1DD] text-lg">
                  🔎
                </div>

                <h3 className="mt-3 text-lg font-black text-[#21191B]">
                  No items found
                </h3>

                <p className="mx-auto mt-1.5 max-w-md text-xs leading-5 text-gray-500 sm:text-sm">
                  We couldn&apos;t find any items matching your search.
                  Try another category or search term.
                </p>

                <button
                  type="button"
                  onClick={clearFilters}
                  className="
                    mt-4
                    rounded-lg
                    bg-[#5B1725]
                    px-5
                    py-2.5
                    text-xs
                    font-black
                    text-white
                    shadow-sm
                    transition
                    hover:bg-[#3D0F18]
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
                  lg:grid-cols-3
                  xl:grid-cols-4
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

