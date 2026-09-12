
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  getMyListings,
  removeListing,
} from "../api/listingApi";

const MyListings = () => {
  const [listings, setListings] = useState([]);
  const [loading, setLoading] = useState(true);

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

  const handleRemove = async (id) => {
    const confirmed = window.confirm(
      "Remove this listing?"
    );

    if (!confirmed) return;

    try {
      await removeListing(id);

      setListings(
        listings.filter(
          (listing) =>
            listing.id !== id
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
   * LOADING
   * ============================================================
   */

  if (loading) {
    return (
      <div className="min-h-screen bg-[#F8F5F3] px-4 py-10 sm:px-6 sm:py-14">

        <div className="mx-auto max-w-7xl">

          <div className="animate-pulse">

            <div className="h-4 w-28 rounded bg-gray-200" />

            <div className="mt-3 h-9 w-56 rounded bg-gray-200" />

            <div className="mt-2 h-4 w-80 max-w-full rounded bg-gray-200" />

            <div className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">

              {[1, 2, 3, 4].map(
                (item) => (
                  <div
                    key={item}
                    className="overflow-hidden rounded-2xl bg-white"
                  >
                    <div className="aspect-[4/3] bg-gray-200" />

                    <div className="space-y-3 p-4">

                      <div className="h-4 w-3/4 rounded bg-gray-200" />

                      <div className="h-3 w-1/2 rounded bg-gray-200" />

                      <div className="h-5 w-1/3 rounded bg-gray-200" />

                      <div className="h-9 w-full rounded bg-gray-200" />

                    </div>
                  </div>
                )
              )}

            </div>

          </div>

        </div>

      </div>
    );
  }


  /*
   * ============================================================
   * PAGE
   * ============================================================
   */

  return (
    <div className="min-h-screen bg-[#F8F5F3]">

      <main className="mx-auto max-w-7xl px-4 py-7 sm:px-6 sm:py-9 lg:px-8">


        {/* ======================================================
            HEADER
        ======================================================= */}

        <div className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">

          <div>

            <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-[#8A2638] sm:text-xs">
              Your inventory
            </p>

            <div className="mt-1 flex flex-wrap items-center gap-3">

              <h1 className="text-2xl font-black tracking-tight text-[#21191B] sm:text-3xl">
                My Listings
              </h1>

              {listings.length > 0 && (
                <span className="rounded-full bg-[#F5E8EB] px-2.5 py-1 text-[10px] font-bold text-[#5B1725] sm:text-xs">
                  {listings.length}{" "}
                  {listings.length === 1
                    ? "item"
                    : "items"}
                </span>
              )}

            </div>

            <p className="mt-1.5 max-w-xl text-sm leading-5 text-gray-500">
              Manage the items you've put up for barter.
            </p>

          </div>


          {/* ADD ITEM */}

          <Link
            to="/listings/create"
            className="
              inline-flex
              w-full
              items-center
              justify-center
              rounded-xl
              bg-[#5B1725]
              px-5
              py-2.5
              text-sm
              font-bold
              text-white
              shadow-sm
              transition
              hover:bg-[#3D0F18]
              hover:shadow-md
              sm:w-auto
            "
          >
            <span className="mr-1.5 text-base">
              +
            </span>
            Add Item
          </Link>

        </div>


        {/* ======================================================
            EMPTY STATE
        ======================================================= */}

        {listings.length === 0 ? (

          <div className="mt-8 overflow-hidden rounded-2xl border border-[#E7DDDF] bg-white shadow-sm">

            <div className="px-5 py-12 text-center sm:px-8 sm:py-16">

              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-[#F5E8EB] text-3xl">
                📦
              </div>

              <h2 className="mt-5 text-xl font-extrabold text-[#21191B]">
                You haven't listed anything yet
              </h2>

              <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-gray-500">
                Add an item you'd like to exchange and start discovering useful trades on BarterConnect.
              </p>

              <Link
                to="/listings/create"
                className="
                  mt-6
                  inline-flex
                  items-center
                  rounded-xl
                  bg-[#5B1725]
                  px-5
                  py-2.5
                  text-sm
                  font-bold
                  text-white
                  shadow-sm
                  transition
                  hover:bg-[#3D0F18]
                "
              >
                List your first item
                <span className="ml-1.5">
                  →
                </span>
              </Link>

            </div>

          </div>

        ) : (

          /* ====================================================
             LISTINGS
          ===================================================== */

          <div className="mt-7 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">

            {listings.map((listing) => {

              const image =
                listing.images?.[0]?.url ||
                "https://placehold.co/600x450?text=No+Image";


              /*
               * Status styling
               */

              const statusStyles = {
                ACTIVE:
                  "bg-green-50 text-green-700 border-green-100",

                TRADED:
                  "bg-blue-50 text-blue-700 border-blue-100",

                PENDING:
                  "bg-amber-50 text-amber-700 border-amber-100",

                INACTIVE:
                  "bg-gray-100 text-gray-600 border-gray-200",
              };

              const statusClass =
                statusStyles[
                  listing.status
                ] ||
                "bg-gray-100 text-gray-600 border-gray-200";


              return (
                <article
                  key={listing.id}
                  className="
                    group
                    overflow-hidden
                    rounded-2xl
                    border
                    border-[#E7DDDF]
                    bg-white
                    shadow-sm
                    transition-all
                    duration-200
                    hover:-translate-y-0.5
                    hover:shadow-md
                  "
                >

                  {/* ==================================================
                      IMAGE
                  =================================================== */}

                  <Link
                    to={`/listings/${listing.id}`}
                    className="block"
                  >

                    <div className="relative aspect-[4/3] overflow-hidden bg-[#F3EEEF]">

                      <img
                        src={image}
                        alt={listing.title}
                        className="
                          h-full
                          w-full
                          object-cover
                          transition
                          duration-300
                          group-hover:scale-[1.025]
                        "
                      />


                      {/* Status */}

                      <div className="absolute right-3 top-3">

                        <span
                          className={`
                            inline-flex
                            items-center
                            rounded-full
                            border
                            px-2.5
                            py-1
                            text-[10px]
                            font-bold
                            capitalize
                            shadow-sm
                            backdrop-blur-sm
                            ${statusClass}
                          `}
                        >
                          {listing.status
                            ?.replace(
                              /_/g,
                              " "
                            )}
                        </span>

                      </div>

                    </div>

                  </Link>


                  {/* ==================================================
                      CONTENT
                  =================================================== */}

                  <div className="p-4">

                    <div className="min-w-0">

                      <Link
                        to={`/listings/${listing.id}`}
                        className="block"
                      >

                        <h2 className="truncate text-sm font-bold text-[#21191B] transition group-hover:text-[#5B1725] sm:text-base">
                          {listing.title}
                        </h2>

                      </Link>

                      <p className="mt-1 truncate text-xs text-gray-500">
                        {listing.category?.name ||
                          "Other"}
                      </p>

                    </div>


                    {/* VALUE */}

                    <div className="mt-3 flex items-end justify-between gap-3">

                      <div>

                        <p className="text-[10px] font-medium uppercase tracking-wide text-gray-400">
                          Barter value
                        </p>

                        <p className="mt-0.5 text-base font-extrabold text-[#5B1725]">
                          KES{" "}
                          {Number(
                            listing.estimatedValue
                          ).toLocaleString()}
                        </p>

                      </div>

                      {listing.condition && (
                        <span className="max-w-[100px] truncate rounded-md bg-[#F8F5F3] px-2 py-1 text-[10px] font-semibold capitalize text-gray-500">
                          {listing.condition.replace(
                            /_/g,
                            " "
                          )}
                        </span>
                      )}

                    </div>


                    {/* ==================================================
                        ACTIONS
                    =================================================== */}

                    <div className="mt-4 grid grid-cols-2 gap-2">

                      <Link
                        to={`/listings/${listing.id}`}
                        className="
                          flex
                          items-center
                          justify-center
                          rounded-lg
                          border
                          border-[#E7DDDF]
                          bg-white
                          px-3
                          py-2
                          text-xs
                          font-bold
                          text-gray-600
                          transition
                          hover:border-[#C9A3AB]
                          hover:bg-[#FBF5F6]
                          hover:text-[#5B1725]
                        "
                      >
                        View
                      </Link>


                      <Link
                        to={`/listings/${listing.id}/manage`}
                        className="
                          flex
                          items-center
                          justify-center
                          rounded-lg
                          bg-[#3D0F18]
                          px-3
                          py-2
                          text-xs
                          font-bold
                          text-white
                          transition
                          hover:bg-[#5B1725]
                        "
                      >
                        Manage
                      </Link>

                    </div>


                    {/* REMOVE */}

                    {listing.status !== "TRADED" && (
                      <button
                        type="button"
                        onClick={() =>
                          handleRemove(
                            listing.id
                          )
                        }
                        className="
                          mt-2
                          w-full
                          rounded-lg
                          px-3
                          py-2
                          text-[11px]
                          font-semibold
                          text-red-500
                          transition
                          hover:bg-red-50
                          hover:text-red-600
                        "
                      >
                        Remove listing
                      </button>
                    )}

                  </div>

                </article>
              );
            })}

          </div>

        )}

      </main>

    </div>
  );
};

export default MyListings;

