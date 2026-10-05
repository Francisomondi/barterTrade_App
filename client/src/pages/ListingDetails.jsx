// frontend/src/pages/ListingDetails.jsx

import { useEffect, useState } from "react";

import {
  Link,
  useNavigate,
  useParams,
} from "react-router-dom";

import {
  ArrowLeft,
  ArrowRight,
  ChevronRight,
  ImageIcon,
  MapPin,
  Repeat2,
  Share2,
  ShieldCheck,
  Store,
} from "lucide-react";

import { getListingById } from "../api/listingApi";

import { trackListingShare } from "../api/businessAnalytics";

import PremiumBadge from "../components/PremiumBadge";

import BusinessBadge from "../components/business/BusinessBadge";

const ListingDetails = () => {
  const { id } = useParams();

  const navigate = useNavigate();

  const [listing, setListing] =
    useState(null);

  const [loading, setLoading] =
    useState(true);

  const [error, setError] =
    useState("");

  const [
    shareMessage,
    setShareMessage,
  ] = useState("");

  const [
    selectedImageId,
    setSelectedImageId,
  ] = useState(null);

  /*
   * ============================================================
   * LOAD LISTING
   * ============================================================
   */

  useEffect(() => {
    const loadListing = async () => {
      try {
        setLoading(true);
        setError("");

        const data =
          await getListingById(id);

        const loadedListing =
          data.listing || data;

        setListing(loadedListing);

        const primaryImage =
          loadedListing.images?.find(
            (image) =>
              image.isPrimary
          ) ||
          loadedListing.images?.[0];

        setSelectedImageId(
          primaryImage?.id || null
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
   * LOADING
   * ============================================================
   */

  if (loading) {
    return (
      <div className="min-h-screen bg-[#F8F5F3] px-4 py-5 font-sans sm:px-6 lg:px-8">
        <div className="mx-auto max-w-6xl animate-pulse">
          <div className="flex items-center justify-between">
            <div className="h-7 w-36 rounded-lg bg-[#E7DDDF]" />

            <div className="h-8 w-20 rounded-lg bg-[#E7DDDF]" />
          </div>

          <div className="mt-4 grid gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(0,0.95fr)] lg:gap-8">
            <div>
              <div className="aspect-4/3 w-full rounded-2xl bg-[#E7DDDF]" />

              <div className="mt-2 flex gap-2">
                {[1, 2, 3, 4].map(
                  (item) => (
                    <div
                      key={item}
                      className="h-14 w-14 rounded-lg bg-[#E7DDDF] sm:h-16 sm:w-16"
                    />
                  )
                )}
              </div>
            </div>

            <div>
              <div className="h-5 w-32 rounded bg-[#E7DDDF]" />

              <div className="mt-3 h-9 w-4/5 rounded bg-[#E7DDDF]" />

              <div className="mt-3 h-16 w-full rounded bg-[#E7DDDF]" />

              <div className="mt-5 h-12 w-44 rounded bg-[#E7DDDF]" />

              <div className="mt-5 h-px w-full bg-[#E7DDDF]" />

              <div className="mt-4 h-16 w-full rounded-xl bg-[#E7DDDF]" />

              <div className="mt-4 h-12 w-full rounded-xl bg-[#E7DDDF]" />
            </div>
          </div>
        </div>
      </div>
    );
  }

  /*
   * ============================================================
   * ERROR
   * ============================================================
   */

  if (error || !listing) {
    return (
      <div className="min-h-screen bg-[#F8F5F3] px-4 py-16 font-sans sm:px-6 sm:py-20">
        <div className="mx-auto max-w-lg rounded-2xl border border-[#E7DDDF] bg-white p-8 text-center shadow-sm sm:p-10">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-[#F5E8EB] text-xl font-black text-[#5B1725]">
            !
          </div>

          <h1 className="mt-4 text-xl font-black tracking-tight text-[#21191B] sm:text-2xl">
            Listing not found
          </h1>

          <p className="mt-2 text-sm leading-6 text-gray-500">
            {error ||
              "This listing may have been removed or is no longer available."}
          </p>

          <Link
            to="/"
            className="mt-6 inline-flex items-center gap-2 rounded-xl bg-[#5B1725] px-5 py-2.5 text-sm font-bold text-white transition hover:bg-[#3D0F18]"
          >
            <ArrowLeft size={16} />

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
        image.id === selectedImageId
    ) ||
    images.find(
      (image) => image.isPrimary
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
    listing.user || null;

  const business =
    seller?.business || null;

  const isBusiness = Boolean(
    business?.isBusiness
  );

  const isPremium = Boolean(
    seller?.isPremium
  );

  const sellerDisplayName =
    isBusiness &&
    business?.businessName
      ? business.businessName
      : seller?.name ||
        "BarterTrade Member";

  const sellerDisplayImage =
    isBusiness && business?.logo
      ? business.logo
      : seller?.avatar || null;

  const sellerInitial =
    sellerDisplayName
      ?.charAt(0)
      ?.toUpperCase() || "U";

  /*
   * ============================================================
   * SELLER DESTINATION
   * ============================================================
   */

  const businessStorePath =
    isBusiness && business?.slug
      ? `/business/${business.slug}`
      : null;

  const personalProfilePath =
    !isBusiness && seller?.id
      ? `/profile/${seller.id}`
      : null;

  const sellerProfilePath =
    businessStorePath ||
    personalProfilePath;

  /*
   * ============================================================
   * SHARE
   * ============================================================
   */

  const handleShareListing =
    async () => {
      const shareUrl =
        window.location.href;

      const shareData = {
        title: listing.title,

        text: `Check out ${listing.title} on BarterTrade.`,

        url: shareUrl,
      };

      try {
        if (
          typeof navigator.share ===
          "function"
        ) {
          await navigator.share(
            shareData
          );
        } else {
          await navigator.clipboard.writeText(
            shareUrl
          );

          setShareMessage(
            "Listing link copied"
          );

          window.setTimeout(() => {
            setShareMessage("");
          }, 2500);
        }

        /*
         * Business analytics only.
         */
        if (
          isBusiness &&
          business?.slug
        ) {
          void trackListingShare({
            slug: business.slug,

            listingId:
              listing.id,

            source:
              "LISTING_DETAILS",
          });
        }
      } catch (error) {
        if (
          error?.name !==
          "AbortError"
        ) {
          console.error(
            "SHARE LISTING ERROR:",
            error
          );

          setShareMessage(
            "Unable to share listing"
          );

          window.setTimeout(() => {
            setShareMessage("");
          }, 2500);
        }
      }
    };

  /*
   * ============================================================
   * VALUES
   * ============================================================
   */

  const formattedValue = Number(
    listing.estimatedValue || 0
  ).toLocaleString();

  const minimumValue =
    listing.minimumValue !== null &&
    listing.minimumValue !==
      undefined
      ? Number(
          listing.minimumValue
        ).toLocaleString()
      : null;

  const maximumValue =
    listing.maximumValue !== null &&
    listing.maximumValue !==
      undefined
      ? Number(
          listing.maximumValue
        ).toLocaleString()
      : null;

  const condition =
    listing.condition
      ? listing.condition
          .replaceAll("_", " ")
          .toLowerCase()
      : "Not specified";

  /*
   * ============================================================
   * SELLER CONTENT
   * ============================================================
   */

  const sellerContent = (
    <>
      {sellerDisplayImage ? (
        <img
          src={sellerDisplayImage}
          alt={sellerDisplayName}
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
                : "rounded-full ring-[#F5E8EB]"
            }
          `}
        >
          {sellerInitial}
        </div>
      )}

      <div className="min-w-0 flex-1">
        <div className="flex min-w-0 items-center gap-1.5">
          <p className="truncate text-[13px] font-black text-[#21191B] sm:text-sm">
            {sellerDisplayName}
          </p>

          <ChevronRight
            size={14}
            className="shrink-0 text-gray-400 transition-transform group-hover/seller:translate-x-0.5 group-hover/seller:text-[#5B1725]"
          />
        </div>

        <div className="mt-1 flex flex-wrap items-center gap-1">
          {isBusiness && (
            <BusinessBadge
              business={business}
              size="sm"
              showVerified
              linkToStore={false}
            />
          )}

          {isPremium && (
            <PremiumBadge
              size="sm"
              compact
            />
          )}
        </div>

        <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[9px] font-medium text-gray-400 sm:text-[10px]">
          {isBusiness &&
            seller?.name && (
              <>
                <span>
                  Seller:{" "}
                  <span className="font-semibold text-gray-500">
                    {seller.name}
                  </span>
                </span>

                <span className="text-gray-300">
                  •
                </span>
              </>
            )}

          <span>
            {seller
              ?.completedTrades ||
              0}{" "}
            completed{" "}
            {seller
              ?.completedTrades ===
            1
              ? "trade"
              : "trades"}
          </span>
        </div>
      </div>

      <div className="hidden shrink-0 sm:flex">
        <span
          className={`
            inline-flex
            items-center
            gap-1
            rounded-full
            px-2
            py-1
            text-[8px]
            font-black
            uppercase
            tracking-wide

            ${
              isBusiness
                ? "border border-[#D6B15E]/30 bg-[#FFF9EB] text-[#765814]"
                : "bg-[#F5E8EB] text-[#5B1725]"
            }
          `}
        >
          {isBusiness ? (
            <>
              <Store size={10} />
              Business
            </>
          ) : (
            <>
              <ShieldCheck
                size={10}
              />
              Trader
            </>
          )}
        </span>
      </div>
    </>
  );

  /*
   * ============================================================
   * PAGE
   * ============================================================
   */

  return (
    <div className="min-h-screen bg-[#F8F5F3] font-sans text-[#21191B]">
      <div className="mx-auto max-w-6xl px-4 py-4 sm:px-6 sm:py-5 lg:px-8">
        {/*
         * ========================================================
         * TOP BAR
         * ========================================================
         */}

        <div className="flex min-h-9 items-center justify-between gap-4">
          <Link
            to="/"
            className="inline-flex items-center gap-1.5 text-[11px] font-bold text-[#5B1725] transition hover:text-[#8A2638] sm:text-xs"
          >
            <ArrowLeft size={15} />

            <span>
              Marketplace
            </span>
          </Link>

          <div className="relative">
            <button
              type="button"
              onClick={
                handleShareListing
              }
              className="inline-flex items-center gap-1.5 rounded-lg border border-[#E3D6D8] bg-white px-2.5 py-1.5 text-[10px] font-bold text-[#5B1725] transition hover:border-[#CDAEB5] hover:bg-[#F9F3F4] sm:text-[11px]"
            >
              <Share2 size={14} />

              Share
            </button>

            {shareMessage && (
              <div
                role="status"
                className="absolute right-0 top-full z-20 mt-2 whitespace-nowrap rounded-lg bg-[#21191B] px-3 py-1.5 text-[9px] font-bold text-white shadow-lg"
              >
                {shareMessage}
              </div>
            )}
          </div>
        </div>

        {/*
         * ========================================================
         * PRODUCT
         * ========================================================
         */}

        <main className="mt-3 grid items-start gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(0,0.95fr)] lg:gap-8">
          {/*
           * ======================================================
           * IMAGE GALLERY
           * ======================================================
           */}

          <section className="min-w-0">
            <div className="overflow-hidden rounded-2xl border border-[#E7DDDF] bg-white shadow-[0_3px_16px_rgba(61,15,24,0.05)]">
              <div className="group relative aspect-4/3 w-full overflow-hidden bg-[#F1ECEE]">
                <img
                  src={mainImage}
                  alt={
                    listing.title
                  }
                  className="h-full w-full object-cover transition-transform duration-500 ease-out group-hover:scale-[1.015]"
                />

                <div className="pointer-events-none absolute inset-0 bg-linear-to-t from-black/10 via-transparent to-transparent" />

                {selectedImage
                  ?.isPrimary && (
                  <span className="absolute left-2.5 top-2.5 inline-flex items-center gap-1 rounded-md bg-[#3D0F18]/90 px-2 py-1 text-[8px] font-black uppercase tracking-wide text-white shadow-sm backdrop-blur-sm">
                    <ImageIcon
                      size={10}
                    />

                    Main
                  </span>
                )}
              </div>
            </div>

            {/*
             * THUMBNAILS
             */}

            {images.length > 1 && (
              <div className="mt-2 flex gap-1.5 overflow-x-auto pb-1">
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
                          index + 1
                        }`}
                        aria-pressed={
                          isSelected
                        }
                        className={`
                          group
                          relative
                          h-14
                          w-14
                          shrink-0
                          overflow-hidden
                          rounded-lg
                          bg-white
                          transition-all
                          duration-200
                          focus:outline-none
                          focus:ring-2
                          focus:ring-[#8A2638]
                          sm:h-16
                          sm:w-16

                          ${
                            isSelected
                              ? "border-2 border-[#5B1725] ring-1 ring-[#DCAEB7]/60"
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
                          className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                        />

                        {image.isPrimary && (
                          <span className="absolute left-1 top-1 rounded bg-[#3D0F18]/90 px-1 py-0.5 text-[6px] font-black uppercase tracking-wide text-white">
                            Main
                          </span>
                        )}
                      </button>
                    );
                  }
                )}
              </div>
            )}
          </section>

          {/*
           * ======================================================
           * PRODUCT INFORMATION
           * ======================================================
           */}

          <section className="min-w-0">
            {/*
             * CATEGORY + CONDITION
             */}

            <div className="flex flex-wrap items-center gap-1.5">
              <span className="rounded-md bg-[#F5E8EB] px-2 py-1 text-[8px] font-black uppercase tracking-[0.08em] text-[#5B1725] sm:text-[9px]">
                {listing.category
                  ?.name || "Other"}
              </span>

              {listing.condition && (
                <span className="rounded-md border border-[#E7DDDF] bg-white px-2 py-1 text-[8px] font-bold capitalize text-gray-600 sm:text-[9px]">
                  {condition}
                </span>
              )}

              {isBusiness && (
                <span className="inline-flex items-center gap-1 rounded-md border border-[#EAD9B3] bg-[#FFF9EB] px-2 py-1 text-[8px] font-black uppercase tracking-wide text-[#765814] sm:text-[9px]">
                  <Store size={10} />
                  Business listing
                </span>
              )}
            </div>

            {/*
             * TITLE
             */}

            <h1 className="mt-2.5 text-[23px] font-black leading-[1.12] tracking-tight text-[#21191B] sm:text-[28px] lg:text-[31px]">
              {listing.title}
            </h1>

            {/*
             * DESCRIPTION
             */}

            {listing.description && (
              <p className="mt-2 max-w-2xl text-[12px] leading-5 text-gray-600 sm:text-[13px] sm:leading-5.5">
                {
                  listing.description
                }
              </p>
            )}

            {/*
             * ====================================================
             * VALUE
             * ====================================================
             */}

            <div className="mt-4">
              <p className="text-[8px] font-black uppercase tracking-[0.12em] text-gray-400 sm:text-[9px]">
                Estimated barter
                value
              </p>

              <div className="mt-0.5 flex flex-wrap items-end gap-x-3 gap-y-1">
                <p className="text-[25px] font-black leading-none tracking-tight text-[#5B1725] sm:text-[29px]">
                  <span className="mr-1.5 text-[10px] font-black text-[#8A2638] sm:text-[11px]">
                    KES
                  </span>

                  {formattedValue}
                </p>

                <div className="mb-0.5 flex h-7 w-7 items-center justify-center rounded-lg bg-[#F5E8EB] text-[#5B1725]">
                  <Repeat2
                    size={14}
                  />
                </div>
              </div>

              {(minimumValue ||
                maximumValue) && (
                <p className="mt-1.5 text-[10px] font-medium text-gray-500 sm:text-[11px]">
                  Acceptable trade
                  range:{" "}
                  <span className="font-bold text-[#21191B]">
                    KES{" "}
                    {minimumValue ||
                      "0"}{" "}
                    – KES{" "}
                    {maximumValue ||
                      formattedValue}
                  </span>
                </p>
              )}
            </div>

            {/*
             * ====================================================
             * COMPACT META
             * ====================================================
             */}

            <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-2 border-y border-[#E9E0E1] py-2.5">
              <div className="flex items-center gap-1.5">
                <ShieldCheck
                  size={14}
                  className="text-[#8A2638]"
                />

                <span className="text-[10px] font-medium text-gray-400">
                  Condition
                </span>

                <span className="text-[10px] font-bold capitalize text-[#21191B] sm:text-[11px]">
                  {condition}
                </span>
              </div>

              <span className="hidden h-3 w-px bg-[#DDD1D3] sm:block" />

              <div className="flex min-w-0 items-center gap-1.5">
                <MapPin
                  size={14}
                  className="shrink-0 text-[#8A2638]"
                />

                <span className="text-[10px] font-medium text-gray-400">
                  Location
                </span>

                <span className="max-w-48 truncate text-[10px] font-bold text-[#21191B] sm:text-[11px]">
                  {listing.location ||
                    "Not specified"}
                </span>
              </div>
            </div>

            {/*
             * ====================================================
             * SELLER
             * ====================================================
             */}

            <div className="mt-4">
              <p className="mb-2 text-[8px] font-black uppercase tracking-[0.12em] text-gray-400 sm:text-[9px]">
                {isBusiness
                  ? "Listed by business"
                  : "Listed by"}
              </p>

              {sellerProfilePath ? (
                <Link
                  to={
                    sellerProfilePath
                  }
                  className="group/seller flex items-center gap-3 rounded-xl border border-transparent py-1 transition hover:border-[#E7DDDF] hover:bg-white hover:px-2.5"
                >
                  {sellerContent}
                </Link>
              ) : (
                <div className="flex items-center gap-3 py-1">
                  {sellerContent}
                </div>
              )}
            </div>

            {/*
             * ====================================================
             * OFFER CTA
             * ====================================================
             */}

            <button
              type="button"
              onClick={() =>
                navigate(
                  `/make-offer/${listing.id}`
                )
              }
              className="group mt-4 flex w-full items-center justify-between rounded-xl bg-[#5B1725] px-4 py-3 text-white shadow-[0_5px_16px_rgba(91,23,37,0.16)] transition-all duration-200 hover:-translate-y-0.5 hover:bg-[#3D0F18] hover:shadow-[0_8px_20px_rgba(91,23,37,0.2)] active:translate-y-0"
            >
              <span className="flex items-center gap-2">
                <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-white/10">
                  <Repeat2
                    size={14}
                  />
                </span>

                <span className="text-[12px] font-black sm:text-[13px]">
                  Make Trade Offer
                </span>
              </span>

              <ArrowRight
                size={16}
                className="transition-transform group-hover:translate-x-1"
              />
            </button>

            {/*
             * ====================================================
             * SMALL TRUST / DESTINATION FOOTER
             * ====================================================
             */}

            <div className="mt-2.5 flex flex-wrap items-center justify-between gap-2 px-1">
              <div className="flex items-center gap-1.5 text-[9px] font-medium text-gray-400 sm:text-[10px]">
                <ShieldCheck
                  size={12}
                  className="text-[#8A2638]"
                />

                Review the item
                before completing a
                trade.
              </div>

              {sellerProfilePath && (
                <Link
                  to={
                    sellerProfilePath
                  }
                  className="inline-flex items-center gap-1 text-[9px] font-bold text-[#5B1725] transition hover:text-[#8A2638] sm:text-[10px]"
                >
                  {isBusiness
                    ? "View store"
                    : "Seller profile"}

                  <ChevronRight
                    size={12}
                  />
                </Link>
              )}
            </div>
          </section>
        </main>
      </div>
    </div>
  );
};

export default ListingDetails;