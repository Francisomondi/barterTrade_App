import {
  useEffect,
  useState,
} from "react";

import {
  Link,
  useParams,
  useNavigate,
} from "react-router-dom";

import {
  ArrowLeft,
  ArrowRight,
  ChevronRight,
  ImageIcon,
  MapPin,
  Repeat2,
  ShieldCheck,
  Store,
} from "lucide-react";

import {
  getListingById,
} from "../api/listingApi";

import PremiumBadge from "../components/PremiumBadge";
import BusinessBadge from "../components/business/BusinessBadge";

const ListingDetails = () => {
  const { id } = useParams();

  const navigate =
    useNavigate();

  const [listing, setListing] =
    useState(null);

  const [loading, setLoading] =
    useState(true);

  const [error, setError] =
    useState("");

  /*
   * Selected gallery image
   */
  const [
    selectedImageId,
    setSelectedImageId,
  ] = useState(null);

  useEffect(() => {
    const loadListing =
      async () => {
        try {
          setLoading(true);
          setError("");

          const data =
            await getListingById(
              id
            );

          const loadedListing =
            data.listing ||
            data;

          setListing(
            loadedListing
          );

          /*
           * Select primary image first.
           */
          const primaryImage =
            loadedListing.images?.find(
              (image) =>
                image.isPrimary
            ) ||
            loadedListing.images?.[0];

          setSelectedImageId(
            primaryImage?.id ||
              null
          );
        } catch (error) {
          console.error(
            "LOAD LISTING ERROR:",
            error
          );

          setError(
            error.response?.data
              ?.message ||
              "Unable to load listing."
          );
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
      <div
        className="
          min-h-screen
          bg-[#F8F5F3]
          px-4
          py-8
          font-sans
          sm:px-6
        "
      >
        <div className="mx-auto max-w-6xl">
          <div className="animate-pulse">
            <div
              className="
                h-8
                w-40
                rounded-lg
                bg-[#E7DDDF]
              "
            />

            <div
              className="
                mt-6
                grid
                gap-7
                lg:grid-cols-[minmax(0,0.82fr)_minmax(0,1.18fr)]
              "
            >
              <div>
                <div
                  className="
                    aspect-4/3
                    max-h-118
                    rounded-2xl
                    bg-[#E7DDDF]
                  "
                />

                <div
                  className="
                    mt-3
                    flex
                    gap-2
                  "
                >
                  {[1, 2, 3, 4].map(
                    (item) => (
                      <div
                        key={item}
                        className="
                          h-16
                          w-16
                          rounded-xl
                          bg-[#E7DDDF]
                        "
                      />
                    )
                  )}
                </div>
              </div>

              <div className="space-y-4">
                <div
                  className="
                    h-6
                    w-32
                    rounded
                    bg-[#E7DDDF]
                  "
                />

                <div
                  className="
                    h-10
                    w-3/4
                    rounded
                    bg-[#E7DDDF]
                  "
                />

                <div
                  className="
                    h-20
                    w-full
                    rounded
                    bg-[#E7DDDF]
                  "
                />

                <div
                  className="
                    h-28
                    w-full
                    rounded-2xl
                    bg-[#E7DDDF]
                  "
                />

                <div
                  className="
                    h-28
                    w-full
                    rounded-2xl
                    bg-[#E7DDDF]
                  "
                />
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

  if (
    error ||
    !listing
  ) {
    return (
      <div
        className="
          min-h-screen
          bg-[#F8F5F3]
          px-4
          py-16
          font-sans
          sm:px-6
          sm:py-20
        "
      >
        <div
          className="
            mx-auto
            max-w-lg
            rounded-2xl
            border
            border-[#E7DDDF]
            bg-white
            p-8
            text-center
            shadow-sm
            sm:p-10
          "
        >
          <div
            className="
              mx-auto
              flex
              h-14
              w-14
              items-center
              justify-center
              rounded-full
              bg-[#F5E8EB]
              text-xl
              font-black
              text-[#5B1725]
            "
          >
            !
          </div>

          <h1
            className="
              mt-4
              text-xl
              font-black
              tracking-tight
              text-[#21191B]
              sm:text-2xl
            "
          >
            Listing not found
          </h1>

          <p
            className="
              mt-2
              text-sm
              leading-6
              text-gray-500
            "
          >
            {error ||
              "This listing may have been removed or is no longer available."}
          </p>

          <Link
            to="/"
            className="
              mt-6
              inline-flex
              items-center
              gap-2
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
            <ArrowLeft
              size={16}
            />

            Back to marketplace
          </Link>
        </div>
      </div>
    );
  }

  /*
   * ============================================================
   * IMAGES
   * ============================================================
   */

  const images =
    listing.images || [];

  const selectedImage =
    images.find(
      (image) =>
        image.id ===
        selectedImageId
    ) ||
    images.find(
      (image) =>
        image.isPrimary
    ) ||
    images[0];

  const mainImage =
    selectedImage?.url ||
    "https://placehold.co/800x600?text=No+Image";

  /*
   * ============================================================
   * SELLER
   * ============================================================
   */

  const seller =
    listing.user ||
    null;

  const business =
    seller?.business ||
    null;

  const isBusiness =
    Boolean(
      business?.isBusiness
    );

  const isPremium =
    Boolean(
      seller?.isPremium
    );

  /*
   * Business identity takes priority visually while the actual
   * listing continues to belong to the underlying User.
   */
  const sellerDisplayName =
    isBusiness &&
    business?.businessName
      ? business.businessName
      : seller?.name ||
        "BarterTrade Member";

  const sellerDisplayImage =
    isBusiness &&
    business?.logo
      ? business.logo
      : seller?.avatar ||
        null;

  const sellerInitial =
    sellerDisplayName
      ?.charAt(0)
      ?.toUpperCase() ||
    "U";

  const businessStorePath =
    isBusiness &&
    business?.slug
      ? `/business/${business.slug}`
      : null;

  /*
   * ============================================================
   * VALUES
   * ============================================================
   */

  const formattedValue =
    Number(
      listing.estimatedValue ||
        0
    ).toLocaleString();

  const minimumValue =
    listing.minimumValue !==
      null &&
    listing.minimumValue !==
      undefined
      ? Number(
          listing.minimumValue
        ).toLocaleString()
      : null;

  const maximumValue =
    listing.maximumValue !==
      null &&
    listing.maximumValue !==
      undefined
      ? Number(
          listing.maximumValue
        ).toLocaleString()
      : null;

  const condition =
    listing.condition
      ? listing.condition
          .replaceAll(
            "_",
            " "
          )
          .toLowerCase()
      : "Not specified";

  /*
   * ============================================================
   * PAGE
   * ============================================================
   */

  return (
    <div
      className="
        min-h-screen
        bg-[#F8F5F3]
        font-sans
        text-[#21191B]
      "
    >
      <div
        className="
          mx-auto
          max-w-6xl
          px-4
          py-5
          sm:px-6
          sm:py-7
          lg:px-8
        "
      >
        {/* ====================================================
            BACK NAVIGATION
        ===================================================== */}

        <Link
          to="/"
          className="
            inline-flex
            items-center
            gap-1.5
            text-[11px]
            font-bold
            text-[#5B1725]
            transition
            hover:text-[#8A2638]
            sm:text-xs
          "
        >
          <ArrowLeft
            size={15}
          />

          Back to marketplace
        </Link>

        {/* ====================================================
            MAIN PRODUCT AREA
        ===================================================== */}

        <div
          className="
            mt-4
            grid
            items-start
            gap-6
            lg:grid-cols-[minmax(0,0.82fr)_minmax(0,1.18fr)]
            lg:gap-8
          "
        >
          {/* ==================================================
              LEFT — IMAGES
          =================================================== */}

          <div
            className="
              min-w-0
              lg:max-w-125
            "
          >
            {/* =================================================
                MAIN IMAGE
            ================================================== */}

            <div
              className="
                overflow-hidden
                rounded-2xl
                border
                border-[#E7DDDF]
                bg-white
                shadow-[0_4px_18px_rgba(61,15,24,0.06)]
              "
            >
              <div
                className="
                  group
                  relative
                  aspect-4/3
                  w-full
                  max-h-118
                  overflow-hidden
                  bg-[#F1ECEE]
                "
              >
                <img
                  src={mainImage}
                  alt={
                    listing.title
                  }
                  className="
                    h-full
                    w-full
                    object-cover
                    transition-transform
                    duration-500
                    ease-out
                    group-hover:scale-[1.035]
                  "
                />

                <div
                  className="
                    pointer-events-none
                    absolute
                    inset-0
                    bg-linear-to-t
                    from-black/10
                    via-transparent
                    to-black/2
                  "
                />

                {/* MAIN IMAGE BADGE */}

                {selectedImage
                  ?.isPrimary && (
                  <span
                    className="
                      absolute
                      left-3
                      top-3
                      inline-flex
                      items-center
                      gap-1.5
                      rounded-lg
                      bg-[#3D0F18]/90
                      px-2.5
                      py-1.5
                      text-[9px]
                      font-black
                      uppercase
                      tracking-wide
                      text-white
                      shadow-md
                      backdrop-blur-sm
                    "
                  >
                    <ImageIcon
                      size={12}
                    />

                    Main
                  </span>
                )}
              </div>
            </div>

            {/* =================================================
                THUMBNAILS
            ================================================== */}

            {images.length > 0 && (
              <div className="mt-3">
                <div
                  className="
                    flex
                    gap-2
                    overflow-x-auto
                    pb-1
                  "
                >
                  {images.map(
                    (
                      image,
                      index
                    ) => {
                      const isSelected =
                        image.id ===
                        selectedImageId;

                      return (
                        <button
                          key={
                            image.id
                          }
                          type="button"
                          onClick={() =>
                            setSelectedImageId(
                              image.id
                            )
                          }
                          aria-label={`View image ${
                            index +
                            1
                          }`}
                          aria-pressed={
                            isSelected
                          }
                          className={`
                            group
                            relative
                            h-16
                            w-16
                            shrink-0
                            overflow-hidden
                            rounded-xl
                            bg-white
                            shadow-sm
                            transition-all
                            duration-200
                            focus:outline-none
                            focus:ring-2
                            focus:ring-[#8A2638]
                            sm:h-18
                            sm:w-18

                            ${
                              isSelected
                                ? "border-2 border-[#5B1725] ring-2 ring-[#DCAEB7]/60"
                                : "border border-[#E7DDDF] hover:border-[#8A2638]"
                            }
                          `}
                        >
                          <img
                            src={
                              image.url
                            }
                            alt={`${listing.title} image ${
                              index +
                              1
                            }`}
                            className="
                              h-full
                              w-full
                              object-cover
                              transition-transform
                              duration-300
                              group-hover:scale-105
                            "
                          />

                          {image.isPrimary && (
                            <span
                              className="
                                absolute
                                left-1
                                top-1
                                rounded
                                bg-[#3D0F18]/90
                                px-1.5
                                py-0.5
                                text-[7px]
                                font-black
                                uppercase
                                tracking-wide
                                text-white
                              "
                            >
                              Main
                            </span>
                          )}

                          {isSelected && (
                            <span
                              className="
                                absolute
                                inset-x-0
                                bottom-0
                                bg-[#5B1725]/90
                                py-0.5
                                text-center
                                text-[7px]
                                font-bold
                                text-white
                              "
                            >
                              Selected
                            </span>
                          )}
                        </button>
                      );
                    }
                  )}
                </div>

                {images.length >
                  1 && (
                  <p
                    className="
                      mt-1.5
                      text-[9px]
                      font-medium
                      text-gray-400
                    "
                  >
                    Select an image
                    to preview
                  </p>
                )}
              </div>
            )}
          </div>

          {/* ==================================================
              RIGHT — LISTING INFORMATION
          =================================================== */}

          <div className="min-w-0">
            {/* CATEGORY + CONDITION */}

            <div
              className="
                flex
                flex-wrap
                items-center
                gap-2
              "
            >
              <span
                className="
                  rounded-md
                  bg-[#F5E8EB]
                  px-2.5
                  py-1
                  text-[9px]
                  font-black
                  uppercase
                  tracking-[0.08em]
                  text-[#5B1725]
                  sm:text-[10px]
                "
              >
                {listing.category
                  ?.name ||
                  "Other"}
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
                    text-[9px]
                    font-bold
                    capitalize
                    text-gray-600
                    sm:text-[10px]
                  "
                >
                  {condition}
                </span>
              )}
            </div>

            {/* TITLE */}

            <h1
              className="
                mt-3
                text-[22px]
                font-black
                leading-[1.15]
                tracking-tight
                text-[#21191B]
                sm:text-[28px]
                lg:text-[32px]
              "
            >
              {listing.title}
            </h1>

            {/* DESCRIPTION */}

            <p
              className="
                mt-2.5
                max-w-2xl
                text-[12px]
                leading-5
                text-gray-600
                sm:text-[13px]
                sm:leading-6
              "
            >
              {
                listing.description
              }
            </p>

            {/* =================================================
                VALUE CARD
            ================================================== */}

            <div
              className="
                mt-4
                rounded-2xl
                border
                border-[#E7DDDF]
                bg-white
                p-4
                shadow-[0_4px_18px_rgba(61,15,24,0.05)]
              "
            >
              <div
                className="
                  flex
                  items-start
                  justify-between
                  gap-4
                "
              >
                <div>
                  <p
                    className="
                      text-[9px]
                      font-black
                      uppercase
                      tracking-[0.12em]
                      text-gray-400
                    "
                  >
                    Estimated barter
                    value
                  </p>

                  <p
                    className="
                      mt-1
                      text-[22px]
                      font-black
                      leading-tight
                      tracking-tight
                      text-[#5B1725]
                      sm:text-[26px]
                    "
                  >
                    <span
                      className="
                        mr-1.5
                        text-[11px]
                        font-black
                        text-[#8A2638]
                      "
                    >
                      KES
                    </span>

                    {
                      formattedValue
                    }
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
                    rounded-xl
                    bg-[#F5E8EB]
                    text-[#5B1725]
                  "
                >
                  <Repeat2
                    size={17}
                  />
                </div>
              </div>

              {(minimumValue ||
                maximumValue) && (
                <div
                  className="
                    mt-3
                    border-t
                    border-[#F0E8EA]
                    pt-3
                  "
                >
                  <p
                    className="
                      text-[9px]
                      font-bold
                      uppercase
                      tracking-wide
                      text-gray-400
                    "
                  >
                    Acceptable trade
                    range
                  </p>

                  <p
                    className="
                      mt-1
                      text-[12px]
                      font-bold
                      text-[#21191B]
                      sm:text-[13px]
                    "
                  >
                    KES{" "}
                    {minimumValue ||
                      "0"}

                    <span
                      className="
                        mx-1.5
                        text-gray-400
                      "
                    >
                      –
                    </span>

                    KES{" "}
                    {maximumValue ||
                      formattedValue}
                  </p>
                </div>
              )}
            </div>

            {/* =================================================
                QUICK DETAILS
            ================================================== */}

            <div
              className="
                mt-3
                grid
                grid-cols-2
                gap-2.5
              "
            >
              <div
                className="
                  rounded-xl
                  border
                  border-[#E7DDDF]
                  bg-white
                  p-3
                  shadow-sm
                "
              >
                <p
                  className="
                    text-[8px]
                    font-black
                    uppercase
                    tracking-widest
                    text-gray-400
                  "
                >
                  Condition
                </p>

                <p
                  className="
                    mt-1
                    truncate
                    text-[12px]
                    font-bold
                    capitalize
                    text-[#21191B]
                  "
                >
                  {condition}
                </p>
              </div>

              <div
                className="
                  rounded-xl
                  border
                  border-[#E7DDDF]
                  bg-white
                  p-3
                  shadow-sm
                "
              >
                <p
                  className="
                    text-[8px]
                    font-black
                    uppercase
                    tracking-widest
                    text-gray-400
                  "
                >
                  Location
                </p>

                <div
                  className="
                    mt-1
                    flex
                    min-w-0
                    items-center
                    gap-1
                  "
                >
                  <MapPin
                    size={12}
                    className="
                      shrink-0
                      text-[#8A2638]
                    "
                  />

                  <p
                    className="
                      truncate
                      text-[12px]
                      font-bold
                      text-[#21191B]
                    "
                  >
                    {listing.location ||
                      "Not specified"}
                  </p>
                </div>
              </div>
            </div>

            {/* =================================================
                SELLER / BUSINESS
            ================================================== */}

            <div
              className="
                mt-3
                overflow-hidden
                rounded-2xl
                border
                border-[#E7DDDF]
                bg-white
                shadow-[0_4px_18px_rgba(61,15,24,0.05)]
              "
            >
              {/* BUSINESS ACCENT */}

              {isBusiness && (
                <div
                  className="
                    h-1
                    w-full
                    bg-linear-to-r
                    from-[#5B1725]
                    via-[#8A2638]
                    to-[#D6B15E]
                  "
                />
              )}

              <div className="p-4">
                <div
                  className="
                    flex
                    items-center
                    justify-between
                    gap-3
                  "
                >
                  <p
                    className="
                      text-[9px]
                      font-black
                      uppercase
                      tracking-[0.12em]
                      text-gray-400
                    "
                  >
                    {isBusiness
                      ? "Listed by business"
                      : "Listed by"}
                  </p>

                  {isBusiness ? (
                    <Store
                      size={15}
                      className="
                        text-[#8A2638]
                      "
                    />
                  ) : (
                    <ShieldCheck
                      size={15}
                      className="
                        text-[#8A2638]
                      "
                    />
                  )}
                </div>

                <div
                  className="
                    mt-3
                    flex
                    items-start
                    justify-between
                    gap-3
                  "
                >
                  <div
                    className="
                      flex
                      min-w-0
                      flex-1
                      items-start
                      gap-3
                    "
                  >
                    {/* SELLER / BUSINESS IMAGE */}

                    {sellerDisplayImage ? (
                      <img
                        src={
                          sellerDisplayImage
                        }
                        alt={
                          sellerDisplayName
                        }
                        className={`
                          h-11
                          w-11
                          shrink-0
                          object-cover
                          ring-2
                          sm:h-12
                          sm:w-12

                          ${
                            isBusiness
                              ? "rounded-xl border border-[#D6B15E]/30 ring-[#F6EEDB]"
                              : "rounded-full ring-[#F5E8EB]"
                          }
                        `}
                      />
                    ) : (
                      <div
                        className={`
                          flex
                          h-11
                          w-11
                          shrink-0
                          items-center
                          justify-center
                          bg-[#F5E8EB]
                          text-sm
                          font-black
                          text-[#5B1725]
                          ring-2
                          sm:h-12
                          sm:w-12

                          ${
                            isBusiness
                              ? "rounded-xl border border-[#D6B15E]/30 ring-[#F6EEDB]"
                              : "rounded-full ring-white"
                          }
                        `}
                      >
                        {
                          sellerInitial
                        }
                      </div>
                    )}

                    {/* SELLER INFORMATION */}

                    <div className="min-w-0 flex-1">
                      {businessStorePath ? (
                        <Link
                          to={
                            businessStorePath
                          }
                          className="
                            group/business
                            inline-flex
                            max-w-full
                            items-center
                            gap-1
                            text-[13px]
                            font-black
                            text-[#21191B]
                            transition
                            hover:text-[#6D1D2D]
                            sm:text-[14px]
                          "
                        >
                          <span className="truncate">
                            {
                              sellerDisplayName
                            }
                          </span>

                          <ChevronRight
                            size={14}
                            className="
                              shrink-0
                              transition-transform
                              group-hover/business:translate-x-0.5
                            "
                          />
                        </Link>
                      ) : (
                        <p
                          className="
                            truncate
                            text-[13px]
                            font-black
                            text-[#21191B]
                            sm:text-[14px]
                          "
                        >
                          {
                            sellerDisplayName
                          }
                        </p>
                      )}

                      <div
                        className="
                          mt-1.5
                          flex
                          flex-wrap
                          items-center
                          gap-1
                        "
                      >
                        <BusinessBadge
                          business={
                            business
                          }
                          size="sm"
                          showVerified
                          linkToStore
                        />

                        {isPremium && (
                          <PremiumBadge
                            size="sm"
                            compact
                          />
                        )}
                      </div>

                      {isBusiness &&
                        seller?.name && (
                          <p
                            className="
                              mt-1.5
                              truncate
                              text-[9px]
                              font-medium
                              text-gray-400
                              sm:text-[10px]
                            "
                          >
                            Seller:{" "}
                            <span
                              className="
                                font-semibold
                                text-gray-500
                              "
                            >
                              {
                                seller.name
                              }
                            </span>
                          </p>
                        )}

                      <p
                        className="
                          mt-1
                          text-[9px]
                          font-medium
                          text-gray-400
                          sm:text-[10px]
                        "
                      >
                        {seller
                          ?.completedTrades ||
                          0}{" "}
                        completed{" "}
                        {seller
                          ?.completedTrades ===
                        1
                          ? "trade"
                          : "trades"}
                      </p>
                    </div>
                  </div>

                  {/* ACCOUNT TYPE */}

                  <div
                    className="
                      hidden
                      shrink-0
                      sm:block
                    "
                  >
                    {isBusiness ? (
                      <span
                        className="
                          inline-flex
                          items-center
                          gap-1
                          rounded-full
                          border
                          border-[#D6B15E]/30
                          bg-[#FFF9EB]
                          px-2.5
                          py-1
                          text-[9px]
                          font-black
                          uppercase
                          tracking-wide
                          text-[#765814]
                        "
                      >
                        <Store
                          size={11}
                        />

                        Business
                      </span>
                    ) : (
                      <span
                        className="
                          inline-flex
                          items-center
                          gap-1
                          rounded-full
                          bg-[#F5E8EB]
                          px-2.5
                          py-1
                          text-[9px]
                          font-black
                          uppercase
                          tracking-wide
                          text-[#5B1725]
                        "
                      >
                        Trader
                      </span>
                    )}
                  </div>
                </div>

                {/* BUSINESS STORE CTA */}

                {businessStorePath && (
                  <Link
                    to={
                      businessStorePath
                    }
                    className="
                      mt-3
                      flex
                      items-center
                      justify-between
                      rounded-xl
                      border
                      border-[#EFE3D1]
                      bg-[#FFFCF5]
                      px-3
                      py-2.5
                      text-[10px]
                      font-bold
                      text-[#5B1725]
                      transition
                      hover:border-[#D6B15E]/60
                      hover:bg-[#FFF9EB]
                    "
                  >
                    <span
                      className="
                        flex
                        items-center
                        gap-2
                      "
                    >
                      <Store
                        size={14}
                      />

                      Visit business
                      storefront
                    </span>

                    <ArrowRight
                      size={14}
                    />
                  </Link>
                )}
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
                mt-4
                flex
                w-full
                items-center
                justify-center
                gap-2
                rounded-xl
                bg-[#5B1725]
                px-6
                py-3
                text-[12px]
                font-black
                text-white
                shadow-md
                shadow-[#5B1725]/15
                transition-all
                duration-200
                hover:-translate-y-0.5
                hover:bg-[#3D0F18]
                hover:shadow-lg
                active:translate-y-0
                sm:text-[13px]
              "
            >
              Make Trade Offer

              <ArrowRight
                size={16}
              />
            </button>

            <p
              className="
                mt-2
                text-center
                text-[9px]
                font-medium
                text-gray-400
                sm:text-[10px]
              "
            >
              Make an offer based
              on the value and
              condition of this
              item.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ListingDetails;