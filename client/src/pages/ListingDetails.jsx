
import { useEffect, useState } from "react";
import { Link, useParams, useNavigate } from "react-router-dom";
import { getListingById } from "../api/listingApi";

const ListingDetails = () => {
  const { id } = useParams();

  const navigate = useNavigate();

  const [listing, setListing] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const loadListing = async () => {
      try {
        const data = await getListingById(id);

        setListing(data.listing);
      } catch (error) {
        console.error(error);

        setError("Unable to load listing.");
      } finally {
        setLoading(false);
      }
    };

    loadListing();
  }, [id]);

  /*
   * ============================================================
   * LOADING STATE
   * ============================================================
   */

  if (loading) {
    return (
      <div className="min-h-screen bg-[#F8F5F3] px-4 py-10 sm:px-6">
        <div className="mx-auto max-w-6xl">

          <div className="animate-pulse">

            <div className="h-4 w-40 rounded bg-gray-200" />

            <div className="mt-6 grid gap-6 lg:grid-cols-2">

              <div className="aspect-[4/3] rounded-2xl bg-gray-200 lg:aspect-square" />

              <div className="space-y-4">

                <div className="h-6 w-24 rounded bg-gray-200" />

                <div className="h-10 w-3/4 rounded bg-gray-200" />

                <div className="h-4 w-full rounded bg-gray-200" />

                <div className="h-4 w-5/6 rounded bg-gray-200" />

                <div className="h-32 rounded-2xl bg-gray-200" />

              </div>

            </div>

          </div>

        </div>
      </div>
    );
  }


  /*
   * ============================================================
   * ERROR STATE
   * ============================================================
   */

  if (error || !listing) {
    return (
      <div className="min-h-screen bg-[#F8F5F3] px-4 py-16 sm:px-6 sm:py-20">

        <div className="mx-auto max-w-lg rounded-2xl border border-[#E7DDDF] bg-white p-8 text-center shadow-sm sm:p-10">

          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-[#F5E8EB] text-xl">
            !
          </div>

          <h1 className="mt-4 text-xl font-bold text-[#21191B] sm:text-2xl">
            Listing not found
          </h1>

          <p className="mt-2 text-sm leading-6 text-gray-500">
            {error || "This listing may have been removed or is no longer available."}
          </p>

          <Link
            to="/"
            className="
              mt-6
              inline-flex
              items-center
              rounded-xl
              bg-[#5B1725]
              px-5
              py-2.5
              text-sm
              font-semibold
              text-white
              shadow-sm
              transition
              hover:bg-[#3D0F18]
            "
          >
            ← Back to marketplace
          </Link>

        </div>

      </div>
    );
  }


  /*
   * ============================================================
   * MAIN IMAGE
   * ============================================================
   */

  const mainImage =
    listing.images?.[0]?.url ||
    "https://placehold.co/800x600?text=No+Image";


  /*
   * ============================================================
   * PAGE
   * ============================================================
   */

  return (
    <div className="min-h-screen bg-[#F8F5F3]">

      {/* ======================================================
          MAIN CONTAINER
      ======================================================= */}

      <div className="mx-auto max-w-6xl px-4 py-6 sm:px-6 sm:py-8 lg:px-8">


        {/* ====================================================
            BACK NAVIGATION
        ===================================================== */}

        <Link
          to="/"
          className="
            inline-flex
            items-center
            gap-1.5
            text-xs
            font-semibold
            text-[#5B1725]
            transition
            hover:text-[#8A2638]
            sm:text-sm
          "
        >
          <span className="text-base">←</span>
          Back to marketplace
        </Link>


        {/* ====================================================
            MAIN PRODUCT AREA
        ===================================================== */}

        <div className="mt-5 grid items-start gap-6 lg:grid-cols-[1.05fr_0.95fr] lg:gap-8">


          {/* ==================================================
              LEFT — IMAGES
          =================================================== */}

          <div>

            {/* MAIN IMAGE */}

            <div
              className="
                overflow-hidden
                rounded-2xl
                border
                border-[#E7DDDF]
                bg-white
                shadow-sm
              "
            >

              <div className="aspect-[4/3] w-full bg-[#F1ECEE] sm:aspect-[5/4] lg:aspect-square">

                <img
                  src={mainImage}
                  alt={listing.title}
                  className="
                    h-full
                    w-full
                    object-cover
                  "
                />

              </div>

            </div>


            {/* =================================================
                THUMBNAILS
            ================================================== */}

            {listing.images?.length > 1 && (
              <div className="mt-3 grid grid-cols-4 gap-2 sm:gap-3">

                {listing.images.map((image) => (
                  <div
                    key={image.id}
                    className="
                      overflow-hidden
                      rounded-lg
                      border
                      border-[#E7DDDF]
                      bg-white
                      shadow-sm
                      transition
                      hover:border-[#8A2638]
                    "
                  >

                    <img
                      src={image.url}
                      alt=""
                      className="
                        aspect-square
                        w-full
                        object-cover
                      "
                    />

                  </div>
                ))}

              </div>
            )}

          </div>


          {/* ==================================================
              RIGHT — LISTING INFORMATION
          =================================================== */}

          <div className="min-w-0">


            {/* =================================================
                CATEGORY + CONDITION
            ================================================== */}

            <div className="flex flex-wrap items-center gap-2">

              <span
                className="
                  rounded-md
                  bg-[#F5E8EB]
                  px-2.5
                  py-1
                  text-[10px]
                  font-bold
                  uppercase
                  tracking-wide
                  text-[#5B1725]
                  sm:text-xs
                "
              >
                {listing.category?.name || "Other"}
              </span>

              {listing.condition && (
                <span
                  className="
                    rounded-md
                    border
                    border-[#E7DDDF]
                    bg-white
                    px-2.5
                    py-1
                    text-[10px]
                    font-semibold
                    capitalize
                    text-gray-600
                    sm:text-xs
                  "
                >
                  {listing.condition.replace("_", " ")}
                </span>
              )}

            </div>


            {/* =================================================
                TITLE
            ================================================== */}

            <h1
              className="
                mt-3
                text-2xl
                font-black
                leading-tight
                tracking-tight
                text-[#21191B]
                sm:text-3xl
                lg:text-4xl
              "
            >
              {listing.title}
            </h1>


            {/* =================================================
                DESCRIPTION
            ================================================== */}

            <p
              className="
                mt-3
                max-w-2xl
                text-sm
                leading-6
                text-gray-600
                sm:text-[15px]
                sm:leading-7
              "
            >
              {listing.description}
            </p>


            {/* =================================================
                VALUE CARD
            ================================================== */}

            <div
              className="
                mt-5
                rounded-2xl
                border
                border-[#E7DDDF]
                bg-white
                p-4
                shadow-sm
                sm:p-5
              "
            >

              <div className="flex items-start justify-between gap-4">

                <div>

                  <p
                    className="
                      text-[10px]
                      font-bold
                      uppercase
                      tracking-[0.14em]
                      text-gray-400
                      sm:text-xs
                    "
                  >
                    Estimated barter value
                  </p>

                  <p
                    className="
                      mt-1
                      text-2xl
                      font-black
                      leading-tight
                      text-[#5B1725]
                      sm:text-3xl
                    "
                  >
                    KES{" "}
                    {Number(
                      listing.estimatedValue
                    ).toLocaleString()}
                  </p>

                </div>

                <div
                  className="
                    flex
                    h-9
                    w-9
                    shrink-0
                    items-center
                    justify-center
                    rounded-full
                    bg-[#F5E8EB]
                    text-[#5B1725]
                  "
                >
                  ⇄
                </div>

              </div>


              {(listing.minimumValue ||
                listing.maximumValue) && (
                <div className="mt-3 border-t border-[#F0E8EA] pt-3">

                  <p className="text-xs text-gray-500">
                    Acceptable trade range
                  </p>

                  <p className="mt-1 text-sm font-semibold text-[#21191B]">

                    KES{" "}
                    {Number(
                      listing.minimumValue || 0
                    ).toLocaleString()}

                    <span className="mx-1 text-gray-400">
                      –
                    </span>

                    KES{" "}
                    {Number(
                      listing.maximumValue ||
                        listing.estimatedValue
                    ).toLocaleString()}

                  </p>

                </div>
              )}

            </div>


            {/* =================================================
                QUICK DETAILS
            ================================================== */}

            <div className="mt-4 grid grid-cols-2 gap-3">


              {/* CONDITION */}

              <div
                className="
                  rounded-xl
                  border
                  border-[#E7DDDF]
                  bg-white
                  p-3.5
                  shadow-sm
                  sm:p-4
                "
              >

                <p className="text-[10px] font-bold uppercase tracking-wide text-gray-400 sm:text-xs">
                  Condition
                </p>

                <p className="mt-1.5 truncate text-sm font-bold capitalize text-[#21191B] sm:text-[15px]">
                  {listing.condition.replace(
                    "_",
                    " "
                  )}
                </p>

              </div>


              {/* LOCATION */}

              <div
                className="
                  rounded-xl
                  border
                  border-[#E7DDDF]
                  bg-white
                  p-3.5
                  shadow-sm
                  sm:p-4
                "
              >

                <p className="text-[10px] font-bold uppercase tracking-wide text-gray-400 sm:text-xs">
                  Location
                </p>

                <p className="mt-1.5 truncate text-sm font-bold text-[#21191B] sm:text-[15px]">
                  {listing.location ||
                    "Not specified"}
                </p>

              </div>

            </div>


            {/* =================================================
                SELLER
            ================================================== */}

            <div
              className="
                mt-4
                rounded-2xl
                border
                border-[#E7DDDF]
                bg-white
                p-4
                shadow-sm
                sm:p-5
              "
            >

              <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-gray-400 sm:text-xs">
                Listed by
              </p>

              <div className="mt-3 flex items-center justify-between gap-3">

                <div className="flex min-w-0 items-center gap-3">

                  {/* Avatar */}

                  {listing.user?.avatar ? (
                    <img
                      src={listing.user?.avatar}
                      alt=""
                      className="
                        h-11
                        w-11
                        shrink-0
                        rounded-full
                        object-cover
                        ring-2
                        ring-[#F5E8EB]
                        sm:h-12
                        sm:w-12
                      "
                    />
                  ) : (
                    <div
                      className="
                        flex
                        h-11
                        w-11
                        shrink-0
                        items-center
                        justify-center
                        rounded-full
                        bg-[#F5E8EB]
                        font-bold
                        text-[#5B1725]
                        ring-2
                        ring-white
                        sm:h-12
                        sm:w-12
                      "
                    >
                      {listing.user?.name
                        ?.charAt(0)
                        ?.toUpperCase()}
                    </div>
                  )}


                  {/* Seller Information */}

                  <div className="min-w-0">

                    <p className="truncate text-sm font-bold text-[#21191B] sm:text-[15px]">
                      {listing.user?.name}
                    </p>

                    <p className="mt-0.5 text-xs text-gray-500">
                      {listing.user
                        ?.completedTrades || 0}{" "}
                      completed trades
                    </p>

                  </div>

                </div>


                {/* Trust Indicator */}

                <div
                  className="
                    hidden
                    shrink-0
                    rounded-full
                    bg-[#F5E8EB]
                    px-2.5
                    py-1
                    text-[10px]
                    font-bold
                    text-[#5B1725]
                    sm:block
                  "
                >
                  Trader
                </div>

              </div>

            </div>


            {/* =================================================
                MAKE OFFER
            ================================================== */}

            <button
              type="button"
              onClick={() =>
                navigate(
                  `/make-offer/${listing.id}`
                )
              }
              className="
                mt-5
                flex
                w-full
                items-center
                justify-center
                gap-2
                rounded-xl
                bg-[#5B1725]
                px-6
                py-3
                text-sm
                font-bold
                text-white
                shadow-md
                shadow-[#5B1725]/15
                transition-all
                duration-200
                hover:bg-[#3D0F18]
                hover:shadow-lg
                active:scale-[0.99]
                sm:py-3.5
                sm:text-base
              "
            >
              Make Trade Offer

              <span className="text-lg leading-none">
                →
              </span>

            </button>


            {/* Small reassurance */}

            <p className="mt-2.5 text-center text-[11px] text-gray-400 sm:text-xs">
              Make an offer based on the value and condition of this item.
            </p>

          </div>

        </div>

      </div>

    </div>
  );
};

export default ListingDetails;

