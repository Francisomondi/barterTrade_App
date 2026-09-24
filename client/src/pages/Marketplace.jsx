import {
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";

import {
  Link,
  useLocation,
} from "react-router-dom";

import {
  getListings,
  getHomepagePromotedListings,
} from "../api/listingApi";

import {
  getCategories,
} from "../api/categoryApi";

import ListingCard from "../components/ListingCard";

/*
 * ============================================================
 * CONSTANTS
 * ============================================================
 */

const PAGE_SIZE = 20;

const Marketplace = () => {
  const location =
    useLocation();

  const marketplaceRef =
    useRef(null);

  /*
   * ============================================================
   * MARKETPLACE DATA
   * ============================================================
   */

  const [
    listings,
    setListings,
  ] = useState([]);

  const [
    categories,
    setCategories,
  ] = useState([]);

  const [
    premiumListings,
    setPremiumListings,
  ] = useState([]);

  /*
   * ============================================================
   * FILTERS
   * ============================================================
   */

  const [
    search,
    setSearch,
  ] = useState("");

  const [
    categoryId,
    setCategoryId,
  ] = useState("");

  const [
    condition,
    setCondition,
  ] = useState("");

  /*
   * ============================================================
   * PAGINATION
   * ============================================================
   */

  const [
    page,
    setPage,
  ] = useState(1);

  const [
    pagination,
    setPagination,
  ] = useState({
    page: 1,
    limit: PAGE_SIZE,
    total: 0,
    pages: 1,
  });

  /*
   * ============================================================
   * LOADING
   * ============================================================
   */

  const [
    loading,
    setLoading,
  ] = useState(true);

  const [
    premiumLoading,
    setPremiumLoading,
  ] = useState(true);

  const [
    error,
    setError,
  ] = useState("");

  /*
   * ============================================================
   * LOAD CATEGORIES
   * ============================================================
   */

  useEffect(() => {
    let mounted = true;

    const loadCategories =
      async () => {
        try {
          const data =
            await getCategories();

          if (mounted) {
            setCategories(
              data?.categories ||
                []
            );
          }
        } catch (error) {
          console.error(
            "CATEGORY ERROR:",
            error
          );
        }
      };

    loadCategories();

    return () => {
      mounted = false;
    };
  }, []);

  /*
   * ============================================================
   * LOAD PREMIUM HOMEPAGE LISTINGS
   * ============================================================
   */

  const loadPremiumListings =
    useCallback(
      async () => {
        try {
          setPremiumLoading(
            true
          );

          const data =
            await getHomepagePromotedListings();

          setPremiumListings(
            data?.listings ||
              []
          );
        } catch (error) {
          /*
           * Premium listings failing should
           * never break the marketplace.
           */
          console.error(
            "PREMIUM LISTINGS ERROR:",
            error
          );

          setPremiumListings(
            []
          );
        } finally {
          setPremiumLoading(
            false
          );
        }
      },
      []
    );

  useEffect(() => {
    loadPremiumListings();
  }, [
    loadPremiumListings,
  ]);

  /*
   * ============================================================
   * LOAD MARKETPLACE
   * ============================================================
   */

  const loadListings = useCallback( async (
      requestedPage = 1
    ) => {
      try {
        setLoading(true);
        setError("");

        const params = {
          page:
            requestedPage,

          limit:
            PAGE_SIZE,
        };

        if (search.trim()) {
          params.search =
            search.trim();
        }

        if (categoryId) {
          params.categoryId =
            categoryId;
        }

        if (condition) {
          params.condition =
            condition;
        }

        const data =
          await getListings(
            params
          );

        setListings(
          data?.listings || []
        );

        setPagination({
          page:
            data?.pagination
              ?.page ||
            requestedPage,

          limit:
            data?.pagination
              ?.limit ||
            PAGE_SIZE,

          total:
            data?.pagination
              ?.total ||
            0,

          pages:
            Math.max(
              data?.pagination
                ?.pages || 1,
              1
            ),
        });
      } catch (error) {
        console.error(
          "LISTING ERROR:",
          error
        );

        setListings([]);

        setError(
          error.response
            ?.data?.message ||
            "Unable to load listings."
        );
      } finally {
        setLoading(false);
      }
    },
    [
      search,
      categoryId,
      condition,
    ]
  );
  /*
   * ============================================================
   * FILTER / PAGE LOADING
   * ============================================================
   */

  useEffect(() => {
    const timer =
      setTimeout(() => {
        loadListings(page);
      }, 300);

    return () => {
      clearTimeout(timer);
    };
  }, [
    page,
    search,
    categoryId,
    condition,
    loadListings,
  ]);

  /*
   * ============================================================
   * REFRESH WHEN TAB RETURNS
   * ============================================================
   */

  useEffect(() => {
    const refresh =
      () => {
        if (
          document.visibilityState ===
            "visible" &&
          location.pathname ===
            "/marketplace"
        ) {
          loadListings(page);
          loadPremiumListings();
        }
      };

    document.addEventListener(
      "visibilitychange",
      refresh
    );

    return () => {
      document.removeEventListener(
        "visibilitychange",
        refresh
      );
    };
  }, [
    location.pathname,
    page,
    loadListings,
    loadPremiumListings,
  ]);

  /*
   * ============================================================
   * FILTER HELPERS
   * ============================================================
   */

  const handleSearchChange =
    (value) => {
      setSearch(value);
      setPage(1);
    };

  const handleCategoryChange =
    (value) => {
      setCategoryId(value);
      setPage(1);
    };

  const handleConditionChange =
    (value) => {
      setCondition(value);
      setPage(1);
    };

  const clearFilters = () => {
    setSearch("");
    setCategoryId("");
    setCondition("");
    setPage(1);
  };

  /*
   * ============================================================
   * SCROLL TO MARKETPLACE
   * ============================================================
   */

  const scrollToMarketplace =
    () => {
      marketplaceRef.current
        ?.scrollIntoView({
          behavior:
            "smooth",

          block:
            "start",
        });
    };

  /*
   * ============================================================
   * PAGE CHANGE
   * ============================================================
   */

  const changePage =
    (nextPage) => {
      if (
        nextPage < 1 ||
        nextPage >
          pagination.pages ||
        nextPage === page
      ) {
        return;
      }

      setPage(nextPage);

      /*
       * Scroll after React starts updating.
       */
      window.setTimeout(
        () => {
          marketplaceRef.current
            ?.scrollIntoView({
              behavior:
                "smooth",

              block:
                "start",
            });
        },
        50
      );
    };

  /*
   * ============================================================
   * PAGINATION NUMBERS
   * ============================================================
   */

  const getPageNumbers =
    () => {
      const total =
        pagination.pages;

      const current =
        page;

      if (total <= 5) {
        return Array.from(
          {
            length:
              total,
          },
          (_, index) =>
            index + 1
        );
      }

      if (current <= 3) {
        return [
          1,
          2,
          3,
          4,
          "...",
          total,
        ];
      }

      if (
        current >=
        total - 2
      ) {
        return [
          1,
          "...",
          total - 3,
          total - 2,
          total - 1,
          total,
        ];
      }

      return [
        1,
        "...",
        current - 1,
        current,
        current + 1,
        "...",
        total,
      ];
    };

  /*
   * ============================================================
   * RESULT RANGE
   * ============================================================
   */

  const firstResult =
    pagination.total === 0
      ? 0
      : (page - 1) *
          pagination.limit +
        1;

  const lastResult =
    Math.min(
      page *
        pagination.limit,
      pagination.total
    );

  /*
   * ============================================================
   * UI
   * ============================================================
   */

  return (
    <div
      className="
        min-h-screen
        bg-[#F8F5F3]
        text-[#21191B]
      "
    >
      {/* ======================================================
          HERO
      ======================================================= */}

      <section
        className="
          relative
          isolate
          overflow-hidden
          bg-[#3D0F18]
        "
      >
        <div
          className="
            absolute
            inset-0
            -z-20
            bg-cover
            bg-center
          "
          style={{
            backgroundImage:
              "url('/images/hero.jpeg')",
          }}
        />

        <div
          className="
            absolute
            inset-0
            -z-10
            bg-[#3D0F18]/90
          "
        />

        <div
          className="
            pointer-events-none
            absolute
            -right-32
            -top-32
            h-80
            w-80
            rounded-full
            bg-[#D6B15E]/20
            blur-[90px]
          "
        />

        <div
          className="
            pointer-events-none
            absolute
            -bottom-32
            -left-32
            h-80
            w-80
            rounded-full
            bg-[#8A2638]/40
            blur-[90px]
          "
        />

        <div
          className="
            mx-auto
            max-w-7xl
            px-4
            py-10
            sm:px-6
            sm:py-14
            lg:px-8
            lg:py-16
          "
        >
          <div className="max-w-4xl">
            <div
              className="
                mb-4
                inline-flex
                items-center
                gap-2
                rounded-full
                border
                border-[#D6B15E]/30
                bg-white/10
                px-3
                py-1.5
                text-[10px]
                font-bold
                uppercase
                tracking-[0.12em]
                text-white
                backdrop-blur-md
                sm:text-xs
              "
            >
              <span
                className="
                  h-1.5
                  w-1.5
                  rounded-full
                  bg-[#D6B15E]
                "
              />

              Kenya&apos;s Barter
              Marketplace
            </div>

            <h1
              className="
                max-w-3xl
                text-4xl
                font-black
                leading-[1.03]
                tracking-tight
                text-white
                sm:text-5xl
                md:text-6xl
              "
            >
              Trade what you
              have

              <br />

              <span className="text-[#D6B15E]">
                for what you
                need.
              </span>
            </h1>

            <p
              className="
                mt-4
                max-w-2xl
                text-sm
                leading-6
                text-white/75
                sm:text-base
              "
            >
              Discover items
              around you,
              exchange what you
              no longer need,
              and get something
              valuable in return.
            </p>

            {/* SEARCH */}

            <div
              className="
                mt-6
                max-w-4xl
              "
            >
              <div
                className="
                  flex
                  flex-col
                  gap-2
                  rounded-2xl
                  border
                  border-white/10
                  bg-black/20
                  p-2
                  shadow-2xl
                  backdrop-blur-xl
                  sm:flex-row
                "
              >
                <div
                  className="
                    relative
                    flex-1
                  "
                >
                  <span
                    className="
                      pointer-events-none
                      absolute
                      left-4
                      top-1/2
                      -translate-y-1/2
                      text-base
                      text-gray-500
                    "
                  >
                    🔍
                  </span>

                  <input
                    type="text"
                    value={search}
                    onChange={(
                      event
                    ) =>
                      handleSearchChange(
                        event
                          .target
                          .value
                      )
                    }
                    placeholder="Search phones, laptops, furniture, cars..."
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
                  onClick={
                    scrollToMarketplace
                  }
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
                  Explore
                </button>
              </div>
            </div>

            {/* POPULAR */}

            <div
              className="
                mt-3
                flex
                flex-wrap
                items-center
                gap-2
                text-xs
              "
            >
              <span className="mr-1 text-white/45">
                Popular:
              </span>

              {[
                "iPhone",
                "Laptop",
                "Car",
                "Furniture",
              ].map(
                (item) => (
                  <button
                    key={item}
                    type="button"
                    onClick={() => {
                      handleSearchChange(
                        item
                      );

                      window.setTimeout(
                        scrollToMarketplace,
                        100
                      );
                    }}
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
                )
              )}
            </div>
          </div>
        </div>
      </section>

      {/* ======================================================
          MAIN
      ======================================================= */}

      <main
        className="
          mx-auto
          max-w-7xl
          px-3
          py-6
          sm:px-6
          sm:py-8
          lg:px-8
        "
      >
        {/* ==================================================
            PREMIUM PICKS
        =================================================== */}

        {(premiumLoading ||
          premiumListings.length >
            0) && (
          <section
            className="
              mb-8
              overflow-hidden
              rounded-2xl
              border
              border-[#E4D4B1]
              bg-gradient-to-br
              from-[#FFFDF7]
              via-white
              to-[#FBF5E8]
              p-3
              shadow-sm
              sm:p-5
            "
          >
            <div
              className="
                mb-4
                flex
                items-end
                justify-between
                gap-4
              "
            >
              <div>
                <div
                  className="
                    flex
                    items-center
                    gap-2
                  "
                >
                  <span
                    className="
                      flex
                      h-6
                      w-6
                      items-center
                      justify-center
                      rounded-full
                      bg-[#D6B15E]
                      text-xs
                      text-[#3D0F18]
                    "
                  >
                    ★
                  </span>

                  <p
                    className="
                      text-[9px]
                      font-black
                      uppercase
                      tracking-[0.2em]
                      text-[#9A7529]
                      sm:text-[10px]
                    "
                  >
                    Premium
                    picks
                  </p>
                </div>

                <h2
                  className="
                    mt-1
                    text-lg
                    font-black
                    text-[#21191B]
                    sm:text-2xl
                  "
                >
                  Worth a
                  closer look
                </h2>

                <p
                  className="
                    mt-1
                    text-[11px]
                    text-gray-500
                    sm:text-sm
                  "
                >
                  Premium
                  listings from
                  traders across
                  BarterTrade.
                </p>
              </div>

              <span
                className="
                  hidden
                  rounded-full
                  border
                  border-[#D6B15E]/30
                  bg-[#F8F1DD]
                  px-3
                  py-1.5
                  text-[9px]
                  font-black
                  uppercase
                  tracking-wide
                  text-[#5B1725]
                  sm:block
                "
              >
                Sponsored
              </span>
            </div>

            {premiumLoading ? (
              <CompactSkeleton
                count={5}
              />
            ) : (
              <div
                className="
                  grid
                  grid-cols-2
                  gap-2.5
                  sm:grid-cols-3
                  sm:gap-3
                  lg:grid-cols-4
                  xl:grid-cols-5
                "
              >
                {premiumListings.map(
                  (listing) => (
                    <ListingCard
                      key={
                        listing.id
                      }
                      listing={
                        listing
                      }
                    />
                  )
                )}
              </div>
            )}
          </section>
        )}

        {/* ==================================================
            CATEGORIES
        =================================================== */}

        <section>
          <div
            className="
              mb-3
              flex
              items-end
              justify-between
              gap-3
            "
          >
            <div>
              <p
                className="
                  text-[9px]
                  font-black
                  uppercase
                  tracking-[0.2em]
                  text-[#8A2638]
                  sm:text-[10px]
                "
              >
                Explore
              </p>

              <h2
                className="
                  mt-0.5
                  text-lg
                  font-black
                  text-[#21191B]
                  sm:text-2xl
                "
              >
                Browse
                categories
              </h2>

              <p
                className="
                  mt-1
                  text-[11px]
                  text-gray-500
                  sm:text-sm
                "
              >
                Find something
                worth trading
                for.
              </p>
            </div>

            {categoryId && (
              <button
                type="button"
                onClick={() =>
                  handleCategoryChange(
                    ""
                  )
                }
                className="
                  shrink-0
                  text-xs
                  font-bold
                  text-[#8A2638]
                  hover:text-[#3D0F18]
                "
              >
                Clear
              </button>
            )}
          </div>

          <div
            className="
              flex
              gap-2
              overflow-x-auto
              pb-2
            "
          >
            <button
              type="button"
              onClick={() =>
                handleCategoryChange(
                  ""
                )
              }
              className={`
                shrink-0
                rounded-lg
                border
                px-3
                py-2
                text-[10px]
                font-bold
                transition
                sm:px-4
                sm:text-xs

                ${
                  !categoryId
                    ? "border-[#5B1725] bg-[#5B1725] text-white shadow-sm"
                    : "border-[#E7DDDF] bg-white text-gray-700 hover:border-[#D6B15E] hover:text-[#5B1725]"
                }
              `}
            >
              All Items
            </button>

            {categories.map(
              (category) => (
                <button
                  key={
                    category.id
                  }
                  type="button"
                  onClick={() =>
                    handleCategoryChange(
                      category.id
                    )
                  }
                  className={`
                    shrink-0
                    rounded-lg
                    border
                    px-3
                    py-2
                    text-[10px]
                    font-bold
                    transition
                    sm:px-4
                    sm:text-xs

                    ${
                      categoryId ===
                      category.id
                        ? "border-[#5B1725] bg-[#5B1725] text-white shadow-sm"
                        : "border-[#E7DDDF] bg-white text-gray-700 hover:border-[#D6B15E] hover:text-[#5B1725]"
                    }
                  `}
                >
                  {
                    category.name
                  }
                </button>
              )
            )}
          </div>
        </section>

        {/* ==================================================
            MARKETPLACE
        =================================================== */}

        <section
          ref={marketplaceRef}
          className="
            mt-7
            scroll-mt-24
          "
        >
          <div
            className="
              mb-4
              flex
              items-end
              justify-between
              gap-3
            "
          >
            <div>
              <p
                className="
                  text-[9px]
                  font-black
                  uppercase
                  tracking-[0.2em]
                  text-[#8A2638]
                  sm:text-[10px]
                "
              >
                Marketplace
              </p>

              <h2
                className="
                  mt-0.5
                  text-xl
                  font-black
                  text-[#21191B]
                  sm:text-2xl
                "
              >
                Available for
                barter
              </h2>

              <p
                className="
                  mt-1
                  text-[11px]
                  text-gray-500
                  sm:text-sm
                "
              >
                Discover items
                currently
                available for
                exchange.
              </p>
            </div>

            {!loading && (
              <div
                className="
                  shrink-0
                  rounded-full
                  border
                  border-[#D6B15E]/30
                  bg-[#F8F1DD]
                  px-2.5
                  py-1
                  text-[9px]
                  font-black
                  text-[#5B1725]
                  sm:px-3
                  sm:py-1.5
                  sm:text-xs
                "
              >
                {
                  pagination.total
                }{" "}
                {pagination.total ===
                1
                  ? "item"
                  : "items"}
              </div>
            )}
          </div>

          {/* FILTER BAR */}

          <div
            className="
              mb-4
              rounded-xl
              border
              border-[#E7DDDF]
              bg-white
              p-2.5
              shadow-sm
              sm:p-3
            "
          >
            <div
              className="
                flex
                flex-col
                gap-2
                sm:flex-row
                sm:items-center
              "
            >
              <div
                className="
                  relative
                  flex-1
                "
              >
                <span
                  className="
                    pointer-events-none
                    absolute
                    left-3
                    top-1/2
                    -translate-y-1/2
                    text-xs
                  "
                >
                  🔍
                </span>

                <input
                  value={search}
                  onChange={(
                    event
                  ) =>
                    handleSearchChange(
                      event
                        .target
                        .value
                    )
                  }
                  placeholder="Search marketplace..."
                  className="
                    h-10
                    w-full
                    rounded-lg
                    border
                    border-[#E7DDDF]
                    bg-[#FBF8F8]
                    pl-9
                    pr-3
                    text-xs
                    font-medium
                    outline-none
                    transition
                    focus:border-[#D6B15E]
                    focus:ring-2
                    focus:ring-[#D6B15E]/10
                  "
                />
              </div>

              <select
                value={condition}
                onChange={(
                  event
                ) =>
                  handleConditionChange(
                    event
                      .target
                      .value
                  )
                }
                className="
                  h-10
                  rounded-lg
                  border
                  border-[#E7DDDF]
                  bg-[#FBF8F8]
                  px-3
                  text-xs
                  font-semibold
                  text-gray-700
                  outline-none
                  focus:border-[#D6B15E]
                  sm:w-44
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
                onClick={
                  clearFilters
                }
                className="
                  h-10
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

          {/* LOADING */}

          {loading && (
            <CompactSkeleton
              count={10}
            />
          )}

          {/* ERROR */}

          {!loading &&
            error && (
              <div
                className="
                  rounded-xl
                  border
                  border-red-200
                  bg-red-50
                  p-5
                "
              >
                <div
                  className="
                    flex
                    items-start
                    gap-3
                  "
                >
                  <div
                    className="
                      flex
                      h-9
                      w-9
                      shrink-0
                      items-center
                      justify-center
                      rounded-lg
                      bg-red-100
                    "
                  >
                    ⚠
                  </div>

                  <div>
                    <p
                      className="
                        text-sm
                        font-black
                        text-red-800
                      "
                    >
                      Something
                      went wrong
                    </p>

                    <p
                      className="
                        mt-1
                        text-xs
                        text-red-600
                      "
                    >
                      {error}
                    </p>

                    <button
                      type="button"
                      onClick={() =>
                        loadListings(
                          page
                        )
                      }
                      className="
                        mt-3
                        rounded-lg
                        bg-[#5B1725]
                        px-4
                        py-2
                        text-xs
                        font-bold
                        text-white
                        hover:bg-[#3D0F18]
                      "
                    >
                      Try again
                    </button>
                  </div>
                </div>
              </div>
            )}

          {/* EMPTY */}

          {!loading &&
            !error &&
            listings.length ===
              0 && (
              <div
                className="
                  rounded-2xl
                  border
                  border-[#E7DDDF]
                  bg-white
                  px-5
                  py-12
                  text-center
                  shadow-sm
                "
              >
                <div
                  className="
                    mx-auto
                    flex
                    h-12
                    w-12
                    items-center
                    justify-center
                    rounded-full
                    bg-[#F8F1DD]
                    text-lg
                  "
                >
                  🔎
                </div>

                <h3
                  className="
                    mt-3
                    text-lg
                    font-black
                  "
                >
                  No items found
                </h3>

                <p
                  className="
                    mx-auto
                    mt-1
                    max-w-md
                    text-xs
                    leading-5
                    text-gray-500
                  "
                >
                  Try another
                  search,
                  category or
                  condition.
                </p>

                <button
                  type="button"
                  onClick={
                    clearFilters
                  }
                  className="
                    mt-4
                    rounded-lg
                    bg-[#5B1725]
                    px-5
                    py-2.5
                    text-xs
                    font-black
                    text-white
                    hover:bg-[#3D0F18]
                  "
                >
                  Browse all
                  items
                </button>
              </div>
            )}

          {/* LISTINGS */}

          {!loading &&
            !error &&
            listings.length >
              0 && (
              <>
                <div
                  className="
                    grid
                    grid-cols-2
                    gap-2.5
                    sm:grid-cols-3
                    sm:gap-3
                    lg:grid-cols-4
                    xl:grid-cols-5
                    xl:gap-4
                  "
                >
                  {listings.map(
                    (
                      listing
                    ) => (
                      <ListingCard
                        key={
                          listing.id
                        }
                        listing={
                          listing
                        }
                      />
                    )
                  )}
                </div>

                {/* ==========================================
                    PAGINATION
                =========================================== */}

                {pagination.pages >
                  1 && (
                  <div
                    className="
                      mt-8
                      border-t
                      border-[#E7DDDF]
                      pt-5
                    "
                  >
                    <div
                      className="
                        flex
                        flex-col
                        gap-4
                        sm:flex-row
                        sm:items-center
                        sm:justify-between
                      "
                    >
                      <p
                        className="
                          text-center
                          text-[10px]
                          font-medium
                          text-gray-500
                          sm:text-left
                          sm:text-xs
                        "
                      >
                        Showing{" "}
                        <strong className="text-[#21191B]">
                          {
                            firstResult
                          }
                          –
                          {
                            lastResult
                          }
                        </strong>{" "}
                        of{" "}
                        <strong className="text-[#21191B]">
                          {
                            pagination.total
                          }
                        </strong>{" "}
                        listings
                      </p>

                      <div
                        className="
                          flex
                          items-center
                          justify-center
                          gap-1
                        "
                      >
                        {/* PREVIOUS */}

                        <button
                          type="button"
                          disabled={
                            page ===
                            1
                          }
                          onClick={() =>
                            changePage(
                              page -
                                1
                            )
                          }
                          className="
                            flex
                            h-9
                            items-center
                            justify-center
                            rounded-lg
                            border
                            border-[#E7DDDF]
                            bg-white
                            px-3
                            text-[10px]
                            font-bold
                            text-gray-600
                            transition
                            hover:border-[#5B1725]
                            hover:text-[#5B1725]
                            disabled:cursor-not-allowed
                            disabled:opacity-40
                            sm:text-xs
                          "
                        >
                          ← Prev
                        </button>

                        {/* NUMBERS */}

                        <div
                          className="
                            flex
                            items-center
                            gap-1
                          "
                        >
                          {getPageNumbers().map(
                            (
                              item,
                              index
                            ) =>
                              item ===
                              "..." ? (
                                <span
                                  key={`ellipsis-${index}`}
                                  className="
                                    flex
                                    h-9
                                    w-7
                                    items-center
                                    justify-center
                                    text-xs
                                    text-gray-400
                                  "
                                >
                                  ...
                                </span>
                              ) : (
                                <button
                                  key={
                                    item
                                  }
                                  type="button"
                                  onClick={() =>
                                    changePage(
                                      item
                                    )
                                  }
                                  className={`
                                    flex
                                    h-9
                                    min-w-9
                                    items-center
                                    justify-center
                                    rounded-lg
                                    border
                                    px-2
                                    text-[10px]
                                    font-black
                                    transition
                                    sm:text-xs

                                    ${
                                      page ===
                                      item
                                        ? "border-[#5B1725] bg-[#5B1725] text-white shadow-sm"
                                        : "border-[#E7DDDF] bg-white text-gray-600 hover:border-[#D6B15E] hover:text-[#5B1725]"
                                    }
                                  `}
                                >
                                  {
                                    item
                                  }
                                </button>
                              )
                          )}
                        </div>

                        {/* NEXT */}

                        <button
                          type="button"
                          disabled={
                            page ===
                            pagination.pages
                          }
                          onClick={() =>
                            changePage(
                              page +
                                1
                            )
                          }
                          className="
                            flex
                            h-9
                            items-center
                            justify-center
                            rounded-lg
                            border
                            border-[#E7DDDF]
                            bg-white
                            px-3
                            text-[10px]
                            font-bold
                            text-gray-600
                            transition
                            hover:border-[#5B1725]
                            hover:text-[#5B1725]
                            disabled:cursor-not-allowed
                            disabled:opacity-40
                            sm:text-xs
                          "
                        >
                          Next →
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </>
            )}
        </section>

        {/* ==================================================
            HOW IT WORKS
        =================================================== */}

        <section
          className="
            mt-14
            sm:mt-16
          "
        >
          <div className="text-center">
            <p
              className="
                text-[9px]
                font-black
                uppercase
                tracking-[0.22em]
                text-[#8A2638]
                sm:text-[10px]
              "
            >
              Simple barter
            </p>

            <h2
              className="
                mt-1
                text-2xl
                font-black
                text-[#21191B]
                sm:text-3xl
              "
            >
              How BarterTrade
              works
            </h2>

            <p
              className="
                mx-auto
                mt-2
                max-w-xl
                text-xs
                leading-5
                text-gray-500
                sm:text-sm
              "
            >
              Turn unused items
              into something
              useful in four
              simple steps.
            </p>
          </div>

          <div
            className="
              mt-7
              grid
              grid-cols-2
              gap-3
              lg:grid-cols-4
            "
          >
            <HowItWorksCard
              number="01"
              icon="＋"
              title="List"
              description="Add the item you want to exchange."
            />

            <HowItWorksCard
              number="02"
              icon="⌕"
              title="Discover"
              description="Browse items offered by other traders."
            />

            <HowItWorksCard
              number="03"
              icon="⇄"
              title="Offer"
              description="Offer one of your items for something you want."
            />

            <HowItWorksCard
              number="04"
              icon="✓"
              title="Trade"
              description="Agree on the exchange and complete the barter."
            />
          </div>
        </section>

        {/* ==================================================
            CTA
        =================================================== */}

        <section
          className="
            relative
            mt-14
            overflow-hidden
            rounded-3xl
            bg-[#3D0F18]
            px-5
            py-9
            text-center
            shadow-xl
            sm:px-10
            sm:py-12
          "
        >
          <div
            className="
              pointer-events-none
              absolute
              -right-20
              -top-20
              h-52
              w-52
              rounded-full
              bg-[#D6B15E]/15
              blur-3xl
            "
          />

          <div
            className="
              pointer-events-none
              absolute
              -bottom-20
              -left-20
              h-52
              w-52
              rounded-full
              bg-[#8A2638]/40
              blur-3xl
            "
          />

          <div
            className="
              relative
              mx-auto
              max-w-2xl
            "
          >
            <span
              className="
                inline-flex
                rounded-full
                border
                border-[#D6B15E]/30
                bg-white/5
                px-3
                py-1
                text-[9px]
                font-black
                uppercase
                tracking-[0.2em]
                text-[#D6B15E]
              "
            >
              Start trading
            </span>

            <h2
              className="
                mt-3
                text-2xl
                font-black
                text-white
                sm:text-3xl
              "
            >
              Something sitting
              unused?
            </h2>

            <p
              className="
                mx-auto
                mt-2
                max-w-lg
                text-xs
                leading-5
                text-white/65
                sm:text-sm
              "
            >
              Someone else may
              have exactly what
              you need. List
              your item and
              start exchanging.
            </p>

            <div
              className="
                mt-6
                flex
                flex-col
                justify-center
                gap-2
                sm:flex-row
              "
            >
              {/*
                If your create-listing route has
                a different path, change only
                this "to" value.
              */}

              <Link
                to="/listings/create"
                className="
                  rounded-xl
                  bg-[#D6B15E]
                  px-6
                  py-3
                  text-xs
                  font-black
                  text-[#3D0F18]
                  shadow-lg
                  transition
                  hover:bg-[#E3C878]
                  hover:-translate-y-0.5
                "
              >
                List an Item
              </Link>

              <button
                type="button"
                onClick={
                  scrollToMarketplace
                }
                className="
                  rounded-xl
                  border
                  border-white/15
                  bg-white/5
                  px-6
                  py-3
                  text-xs
                  font-black
                  text-white
                  backdrop-blur
                  transition
                  hover:bg-white/10
                "
              >
                Browse Marketplace
              </button>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
};

/*
 * ============================================================
 * COMPACT SKELETON
 * ============================================================
 */

const CompactSkeleton = ({
  count = 10,
}) => {
  return (
    <div
      className="
        grid
        grid-cols-2
        gap-2.5
        sm:grid-cols-3
        sm:gap-3
        lg:grid-cols-4
        xl:grid-cols-5
        xl:gap-4
      "
    >
      {Array.from({
        length: count,
      }).map(
        (_, index) => (
          <div
            key={index}
            className="
              overflow-hidden
              rounded-xl
              border
              border-[#E9E2E3]
              bg-white
              shadow-sm
            "
          >
            <div
              className="
                aspect-[4/3]
                animate-pulse
                bg-gray-200
              "
            />

            <div
              className="
                space-y-2
                p-2.5
                sm:p-3
              "
            >
              <div
                className="
                  h-2
                  w-14
                  animate-pulse
                  rounded
                  bg-gray-200
                "
              />

              <div
                className="
                  h-3
                  w-3/4
                  animate-pulse
                  rounded
                  bg-gray-200
                "
              />

              <div
                className="
                  h-2
                  w-full
                  animate-pulse
                  rounded
                  bg-gray-100
                "
              />

              <div
                className="
                  h-2
                  w-2/3
                  animate-pulse
                  rounded
                  bg-gray-100
                "
              />

              <div
                className="
                  flex
                  items-center
                  justify-between
                  border-t
                  border-gray-100
                  pt-2
                "
              >
                <div
                  className="
                    h-4
                    w-20
                    animate-pulse
                    rounded
                    bg-gray-200
                  "
                />

                <div
                  className="
                    h-7
                    w-7
                    animate-pulse
                    rounded-lg
                    bg-gray-200
                  "
                />
              </div>
            </div>
          </div>
        )
      )}
    </div>
  );
};

/*
 * ============================================================
 * HOW IT WORKS CARD
 * ============================================================
 */

const HowItWorksCard = ({
  number,
  icon,
  title,
  description,
}) => {
  return (
    <div
      className="
        group
        relative
        overflow-hidden
        rounded-2xl
        border
        border-[#E7DDDF]
        bg-white
        p-4
        shadow-sm
        transition
        duration-300
        hover:-translate-y-1
        hover:border-[#D6B15E]
        hover:shadow-md
        sm:p-5
      "
    >
      <span
        className="
          absolute
          right-3
          top-2
          text-3xl
          font-black
          text-[#5B1725]/5
          sm:text-4xl
        "
      >
        {number}
      </span>

      <div
        className="
          flex
          h-9
          w-9
          items-center
          justify-center
          rounded-xl
          bg-[#F5E8EB]
          text-lg
          font-black
          text-[#5B1725]
          transition
          group-hover:bg-[#5B1725]
          group-hover:text-white
        "
      >
        {icon}
      </div>

      <h3
        className="
          mt-3
          text-sm
          font-black
          text-[#21191B]
          sm:text-base
        "
      >
        {title}
      </h3>

      <p
        className="
          mt-1
          text-[10px]
          leading-4
          text-gray-500
          sm:text-xs
          sm:leading-5
        "
      >
        {description}
      </p>
    </div>
  );
};

export default Marketplace;