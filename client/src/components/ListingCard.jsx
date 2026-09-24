import {
  useEffect,
  useRef,
} from "react";

import {
  Link,
} from "react-router-dom";

import {
  recordPromotionView,
  recordPromotionClick,
} from "../api/promotionApi";

import PremiumBadge from "./PremiumBadge";

const ListingCard = ({
  listing,
}) => {
  const cardRef =
    useRef(null);

  const viewRecordedRef =
    useRef(false);

  /*
   * ============================================================
   * PROMOTION INFORMATION
   * ============================================================
   */

  const promotionId =
    listing?.activePromotion
      ?.id ||
    listing?.promotionId ||
    null;

  const promotionType =
    listing?.promotionType ||
    listing?.activePromotion
      ?.type ||
    null;

  const isPromoted =
    Boolean(
      listing?.isPromoted &&
        promotionId
    );

  /*
   * ============================================================
   * SELLER PREMIUM INFORMATION
   * ============================================================
   */

  const seller =
    listing?.user ||
    null;

  const sellerIsPremium =
    Boolean(
      seller?.isPremium
    );

  /*
   * ============================================================
   * PROMOTION IMPRESSION
   * ============================================================
   */

  useEffect(() => {
    if (
      !promotionId ||
      !isPromoted
    ) {
      return;
    }

    const element =
      cardRef.current;

    if (
      !element ||
      viewRecordedRef.current
    ) {
      return;
    }

    const observer =
      new IntersectionObserver(
        (entries) => {
          const entry =
            entries[0];

          if (
            !entry
              ?.isIntersecting
          ) {
            return;
          }

          viewRecordedRef.current =
            true;

          recordPromotionView(
            promotionId
          ).catch(
            () => {}
          );

          observer.disconnect();
        },
        {
          threshold:
            0.5,
        }
      );

    observer.observe(
      element
    );

    return () => {
      observer.disconnect();
    };
  }, [
    promotionId,
    isPromoted,
  ]);

  /*
   * ============================================================
   * PROMOTION CLICK
   * ============================================================
   */

  const handleListingClick =
    () => {
      if (
        promotionId &&
        isPromoted
      ) {
        recordPromotionClick(
          promotionId
        ).catch(
          () => {}
        );
      }
    };

  /*
   * ============================================================
   * IMAGE
   * ============================================================
   */

  const primaryImage =
    listing?.images?.find(
      (image) =>
        image.isPrimary
    ) ||
    listing?.images?.[0];

  const image =
    primaryImage?.url ||
    "https://placehold.co/600x400?text=Barter+Trade";

  /*
   * ============================================================
   * PROMOTION BADGE
   * ============================================================
   */

  const getPromotionBadge =
    () => {
      switch (
        promotionType
      ) {
        case "HOMEPAGE":
          return {
            icon: "★",
            label:
              "Premium",
            className:
              "bg-[#D6B15E] text-[#3D0F18]",
          };

        case "FEATURED":
          return {
            icon: "★",
            label:
              "Featured",
            className:
              "bg-[#8A2638] text-white",
          };

        case "BOOST":
          return {
            icon: "↑",
            label:
              "Boosted",
            className:
              "bg-[#3D0F18] text-white",
          };

        default:
          return null;
      }
    };

  const promotionBadge =
    getPromotionBadge();

  /*
   * ============================================================
   * DISPLAY DATA
   * ============================================================
   */

  const formattedValue =
    Number(
      listing
        ?.estimatedValue ||
        0
    ).toLocaleString();

  const condition =
    listing?.condition
      ? listing.condition
          .replaceAll(
            "_",
            " "
          )
          .toLowerCase()
      : null;

  return (
    <Link
      ref={cardRef}
      to={`/listings/${listing.id}`}
      onClick={
        handleListingClick
      }
      className={`
        group
        flex
        h-full
        min-w-0
        flex-col
        overflow-hidden
        rounded-xl
        border
        bg-white
        transition-all
        duration-300
        hover:-translate-y-1

        ${
          isPromoted
            ? `
              border-[#D8C3C8]
              shadow-[0_4px_18px_rgba(61,15,24,0.08)]
              hover:border-[#C99DA6]
              hover:shadow-[0_8px_24px_rgba(61,15,24,0.13)]
            `
            : `
              border-[#E9E2E3]
              shadow-sm
              hover:border-[#D4BEC3]
              hover:shadow-md
            `
        }
      `}
    >
      {/* =========================
          IMAGE
      ========================== */}

      <div
        className="
          relative
          aspect-[4/3]
          w-full
          overflow-hidden
          bg-[#F1ECEC]
        "
      >
        <img
          src={image}
          alt={
            listing?.title ||
            "Listing"
          }
          loading="lazy"
          className="
            h-full
            w-full
            object-cover
            transition-transform
            duration-500
            ease-out
            group-hover:scale-105
          "
        />

        <div
          className="
            pointer-events-none
            absolute
            inset-0
            bg-gradient-to-t
            from-black/25
            via-transparent
            to-black/5
          "
        />

        {/* LISTING PROMOTION */}

        {promotionBadge && (
          <div className="absolute left-2 top-2 z-10">
            <span
              className={`
                inline-flex
                items-center
                gap-1
                rounded-md
                px-2
                py-1
                text-[8px]
                font-black
                uppercase
                tracking-wide
                shadow-md
                sm:text-[9px]

                ${promotionBadge.className}
              `}
            >
              <span>
                {
                  promotionBadge.icon
                }
              </span>

              {
                promotionBadge.label
              }
            </span>
          </div>
        )}

        {/* CONDITION */}

        {condition && (
          <div
            className="
              absolute
              bottom-2
              right-2
              rounded-md
              bg-black/60
              px-1.5
              py-0.5
              text-[8px]
              font-bold
              capitalize
              text-white
              shadow-sm
              backdrop-blur-sm
              sm:px-2
              sm:py-1
              sm:text-[9px]
            "
          >
            {condition}
          </div>
        )}
      </div>

      {/* =========================
          CONTENT
      ========================== */}

      <div
        className="
          flex
          flex-1
          flex-col
          p-2.5
          sm:p-3
        "
      >
        {/* CATEGORY */}

        <div
          className="
            flex
            min-w-0
            items-center
            gap-1.5
          "
        >
          <span
            className="
              truncate
              text-[8px]
              font-black
              uppercase
              tracking-[0.08em]
              text-[#8A2638]
              sm:text-[9px]
            "
          >
            {listing
              ?.category
              ?.name ||
              "Other"}
          </span>

          <span
            className="
              h-1
              w-1
              shrink-0
              rounded-full
              bg-[#D6B15E]
            "
          />
        </div>

        {/* TITLE */}

        <h3
          className="
            mt-1.5
            line-clamp-1
            text-[12px]
            font-extrabold
            leading-[1.1rem]
            text-[#21191B]
            transition-colors
            group-hover:text-[#6D1D2D]
            sm:text-[13px]
          "
        >
          {listing?.title}
        </h3>

        {/* DESCRIPTION */}

        <p
          className="
            mt-1
            line-clamp-2
            min-h-[2rem]
            text-[9px]
            leading-4
            text-gray-500
            sm:text-[10px]
          "
        >
          {
            listing
              ?.description
          }
        </p>

        {/* SELLER */}

        {seller && (
          <div
            className="
              mt-2
              flex
              min-w-0
              items-center
              gap-2
            "
          >
            {seller?.avatar ? (
              <img
                src={
                  seller.avatar
                }
                alt={
                  seller?.name ||
                  "Seller"
                }
                className="
                  h-5
                  w-5
                  shrink-0
                  rounded-full
                  object-cover
                "
              />
            ) : (
              <div
                className="
                  flex
                  h-5
                  w-5
                  shrink-0
                  items-center
                  justify-center
                  rounded-full
                  bg-[#F5E8EB]
                  text-[8px]
                  font-black
                  text-[#5B1725]
                "
              >
                {seller?.name
                  ?.charAt(0)
                  ?.toUpperCase() ||
                  "U"}
              </div>
            )}

            <span
              className="
                min-w-0
                truncate
                text-[9px]
                font-bold
                text-stone-600
                sm:text-[10px]
              "
            >
              {seller?.name ||
                "BarterTrade Member"}
            </span>

            {sellerIsPremium && (
              <PremiumBadge
                size="sm"
                compact
              />
            )}
          </div>
        )}

        {/* LOCATION */}

        {listing?.location && (
          <div
            className="
              mt-1.5
              flex
              min-w-0
              items-center
              gap-1
              text-[8px]
              font-medium
              text-gray-400
              sm:text-[9px]
            "
          >
            <span className="shrink-0">
              ◉
            </span>

            <span className="truncate">
              {
                listing.location
              }
            </span>
          </div>
        )}

        {/* VALUE */}

        <div
          className="
            mt-auto
            flex
            items-end
            justify-between
            gap-2
            border-t
            border-[#F0E9EA]
            pt-2.5
          "
        >
          <div className="min-w-0">
            <p
              className="
                text-[7px]
                font-bold
                uppercase
                tracking-[0.08em]
                text-gray-400
                sm:text-[8px]
              "
            >
              Barter value
            </p>

            <p
              className="
                mt-0.5
                truncate
                text-[12px]
                font-black
                leading-none
                text-[#5B1725]
                sm:text-[14px]
              "
            >
              <span
                className="
                  mr-1
                  text-[8px]
                  font-extrabold
                  text-[#8A2638]
                  sm:text-[9px]
                "
              >
                KES
              </span>

              {
                formattedValue
              }
            </p>
          </div>

          <span
            className="
              flex
              h-6
              w-6
              shrink-0
              items-center
              justify-center
              rounded-lg
              bg-[#F5E8EB]
              text-xs
              font-black
              text-[#5B1725]
              transition-all
              duration-300
              group-hover:bg-[#5B1725]
              group-hover:text-white
              sm:h-7
              sm:w-7
            "
          >
            →
          </span>
        </div>
      </div>
    </Link>
  );
};

export default ListingCard;