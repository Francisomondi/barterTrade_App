import {
  useCallback,
  useEffect,
  useState,
} from "react";

import {
  Link,
  useParams,
} from "react-router-dom";

import {
  BriefcaseBusiness,
  ChevronLeft,
  ChevronRight,
  ExternalLink,
  Globe,
  Mail,
  MapPin,
  Package,
  Phone,
  ShieldCheck,
  Store,
} from "lucide-react";

import {
  getPublicBusiness,
  getPublicBusinessListings,
} from "../api/business";

import BusinessBadge from "../components/business/BusinessBadge";

const BusinessStorefront = () => {
  const { slug } = useParams();

  const [business, setBusiness] =
    useState(null);

  const [listings, setListings] =
    useState([]);

  const [pagination, setPagination] =
    useState({
      page: 1,
      limit: 12,
      totalListings: 0,
      totalPages: 0,
      hasNextPage: false,
      hasPreviousPage: false,
    });

  const [page, setPage] =
    useState(1);

  const [loading, setLoading] =
    useState(true);

  const [
    listingsLoading,
    setListingsLoading,
  ] = useState(false);

  const [error, setError] =
    useState("");

  /*
   * ==========================================================
   * LOAD BUSINESS
   * ==========================================================
   */

  const loadBusiness =
    useCallback(async () => {
      try {
        setError("");

        const response =
          await getPublicBusiness(
            slug
          );

        setBusiness(
          response.business
        );
      } catch (err) {
        console.error(
          "LOAD BUSINESS ERROR:",
          err
        );

        if (
          err?.response?.status ===
          404
        ) {
          setError(
            "This Business Storefront could not be found."
          );
        } else {
          setError(
            err?.response?.data
              ?.message ||
              "Unable to load this Business Storefront."
          );
        }
      }
    }, [slug]);

  /*
   * ==========================================================
   * LOAD LISTINGS
   * ==========================================================
   */

  const loadListings =
    useCallback(async () => {
      try {
        setListingsLoading(
          true
        );

        const response =
          await getPublicBusinessListings(
            {
              slug,
              page,
              limit: 12,
            }
          );

        setListings(
          response.listings ||
            []
        );

        setPagination(
          response.pagination ||
            {
              page,
              limit: 12,
              totalListings: 0,
              totalPages: 0,
              hasNextPage: false,
              hasPreviousPage:
                false,
            }
        );
      } catch (err) {
        console.error(
          "LOAD BUSINESS LISTINGS ERROR:",
          err
        );

        setListings([]);
      } finally {
        setListingsLoading(
          false
        );
      }
    }, [slug, page]);

  /*
   * ==========================================================
   * INITIAL LOAD
   * ==========================================================
   */

  useEffect(() => {
    const load =
      async () => {
        setLoading(true);

        await Promise.all([
          loadBusiness(),
          loadListings(),
        ]);

        setLoading(false);
      };

    load();
  }, [
    loadBusiness,
    loadListings,
  ]);

  /*
   * ==========================================================
   * RESET PAGE WHEN STORE CHANGES
   * ==========================================================
   */

  useEffect(() => {
    setPage(1);
  }, [slug]);

  /*
   * ==========================================================
   * HELPERS
   * ==========================================================
   */

  const getPrimaryImage = (
    listing
  ) => {
    if (
      !Array.isArray(
        listing?.images
      ) ||
      listing.images.length ===
        0
    ) {
      return null;
    }

    const primary =
      listing.images.find(
        (image) =>
          image.isPrimary
      );

    return (
      primary?.url ||
      primary?.imageUrl ||
      listing.images[0]?.url ||
      listing.images[0]
        ?.imageUrl ||
      null
    );
  };

  /*
   * ==========================================================
   * LOADING
   * ==========================================================
   */

  if (loading) {
    return (
      <div
        className="
          min-h-screen
          bg-[#F8F5F3]
          font-sans
        "
      >
        <div
          className="
            mx-auto
            max-w-7xl
            px-4
            py-8
            sm:px-6
            lg:px-8
          "
        >
          <div className="animate-pulse">
            <div
              className="
                h-52
                rounded-2xl
                bg-[#E8DFDB]
                sm:h-60
              "
            />

            <div
              className="
                mx-auto
                -mt-12
                h-24
                w-24
                rounded-2xl
                bg-white
                shadow-lg
                sm:h-28
                sm:w-28
              "
            />

            <div
              className="
                mx-auto
                mt-6
                h-7
                w-64
                rounded
                bg-[#E8DFDB]
              "
            />

            <div
              className="
                mx-auto
                mt-3
                h-4
                w-96
                max-w-full
                rounded
                bg-[#E8DFDB]
              "
            />

            <div
              className="
                mt-10
                grid
                gap-4
                sm:grid-cols-2
                lg:grid-cols-3
                xl:grid-cols-4
              "
            >
              {Array.from({
                length: 8,
              }).map(
                (_, index) => (
                  <div
                    key={index}
                    className="
                      overflow-hidden
                      rounded-xl
                      border
                      border-[#E8DFDB]
                      bg-white
                    "
                  >
                    <div
                      className="
                        aspect-4/3
                        bg-[#E8DFDB]
                      "
                    />

                    <div className="p-3">
                      <div
                        className="
                          h-4
                          w-3/4
                          rounded
                          bg-[#E8DFDB]
                        "
                      />

                      <div
                        className="
                          mt-2
                          h-3
                          w-1/2
                          rounded
                          bg-[#E8DFDB]
                        "
                      />
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
   * ==========================================================
   * ERROR
   * ==========================================================
   */

  if (
    error ||
    !business
  ) {
    return (
      <div
        className="
          flex
          min-h-[70vh]
          items-center
          justify-center
          bg-[#F8F5F3]
          px-4
          font-sans
        "
      >
        <div
          className="
            max-w-lg
            rounded-2xl
            border
            border-[#E7DDD9]
            bg-white
            p-8
            text-center
            shadow-sm
          "
        >
          <Store
            size={42}
            className="
              mx-auto
              text-[#6B1D2C]
            "
          />

          <h1
            className="
              mt-4
              text-xl
              font-black
              tracking-tight
              text-[#3D0F18]
            "
          >
            Business unavailable
          </h1>

          <p
            className="
              mt-2
              text-[12px]
              leading-5
              text-gray-500
            "
          >
            {error ||
              "This Business Storefront is currently unavailable."}
          </p>

          <Link
            to="/marketplace"
            className="
              mt-6
              inline-flex
              rounded-xl
              bg-[#6B1D2C]
              px-5
              py-2.5
              text-[11px]
              font-black
              text-white
              transition
              hover:bg-[#541522]
            "
          >
            Browse Marketplace
          </Link>
        </div>
      </div>
    );
  }

  /*
   * ==========================================================
   * BUSINESS BADGE DATA
   * ==========================================================
   */

  const badgeBusiness = {
    isBusiness: true,

    businessName:
      business.businessName,

    slug:
      business.slug,

    logo:
      business.logo,

    category:
      business.category,

    location:
      business.location,

    verificationStatus:
      business.verificationStatus,

    isVerified:
      business.verificationStatus ===
        "VERIFIED" ||
      Boolean(
        business.isVerified
      ),
  };

  /*
   * ==========================================================
   * PAGE
   * ==========================================================
   */

  return (
    <div
      className="
        min-h-screen
        bg-[#F8F5F3]
        pb-14
        font-sans
        text-[#21191B]
      "
    >
      {/* ======================================================
          COVER
      ====================================================== */}

      <section
        className="
          relative
          h-44
          overflow-hidden
          bg-linear-to-br
          from-[#3D0F18]
          via-[#6B1D2C]
          to-[#9A5D37]
          sm:h-56
          lg:h-60
        "
      >
        {business.coverImage ? (
          <>
            <img
              src={
                business.coverImage
              }
              alt={`${business.businessName} cover`}
              className="
                h-full
                w-full
                object-cover
              "
            />

            <div
              className="
                absolute
                inset-0
                bg-linear-to-t
                from-black/50
                via-black/15
                to-black/10
              "
            />
          </>
        ) : (
          <div className="absolute inset-0">
            <div
              className="
                absolute
                -right-20
                -top-24
                h-72
                w-72
                rounded-full
                bg-white/10
              "
            />

            <div
              className="
                absolute
                -bottom-28
                left-1/4
                h-80
                w-80
                rounded-full
                bg-white/5
              "
            />

            <div
              className="
                absolute
                bottom-6
                right-[15%]
                hidden
                text-white/10
                sm:block
              "
            >
              <Store
                size={100}
              />
            </div>
          </div>
        )}
      </section>

      {/* ======================================================
          BUSINESS HEADER
      ====================================================== */}

      <section
        className="
          mx-auto
          max-w-7xl
          px-4
          sm:px-6
          lg:px-8
        "
      >
        <div
          className="
            relative
            -mt-10
            overflow-hidden
            rounded-2xl
            border
            border-[#E8DFDB]
            bg-white
            shadow-[0_8px_30px_rgba(61,15,24,0.08)]
            sm:-mt-12
          "
        >
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

          <div
            className="
              p-4
              sm:p-6
            "
          >
            <div
              className="
                flex
                flex-col
                gap-4
                sm:flex-row
                sm:items-start
              "
            >
              {/* LOGO */}

              <div
                className="
                  flex
                  h-20
                  w-20
                  shrink-0
                  items-center
                  justify-center
                  overflow-hidden
                  rounded-2xl
                  border-4
                  border-white
                  bg-[#F4ECE9]
                  shadow-md
                  sm:h-24
                  sm:w-24
                "
              >
                {business.logo ? (
                  <img
                    src={
                      business.logo
                    }
                    alt={
                      business.businessName
                    }
                    className="
                      h-full
                      w-full
                      object-cover
                    "
                  />
                ) : (
                  <Store
                    size={36}
                    className="
                      text-[#6B1D2C]
                    "
                  />
                )}
              </div>

              {/* DETAILS */}

              <div
                className="
                  min-w-0
                  flex-1
                "
              >
                <div
                  className="
                    flex
                    flex-wrap
                    items-center
                    gap-2
                  "
                >
                  <h1
                    className="
                      min-w-0
                      text-[21px]
                      font-black
                      leading-tight
                      tracking-tight
                      text-[#3D0F18]
                      sm:text-[26px]
                    "
                  >
                    {
                      business.businessName
                    }
                  </h1>

                  {/*
                   * Reusable Business badge.
                   *
                   * We are already on the storefront,
                   * so linkToStore is deliberately omitted.
                   */}

                  <BusinessBadge
                    business={
                      badgeBusiness
                    }
                    size="sm"
                    showVerified
                  />
                </div>

                {business.category && (
                  <div
                    className="
                      mt-2
                      inline-flex
                      items-center
                      gap-1.5
                      text-[10px]
                      font-black
                      uppercase
                      tracking-[0.08em]
                      text-[#8B5E34]
                    "
                  >
                    <BriefcaseBusiness
                      size={12}
                    />

                    {
                      business.category
                    }
                  </div>
                )}

                {business.description && (
                  <p
                    className="
                      mt-3
                      max-w-3xl
                      text-[12px]
                      leading-5
                      text-gray-600
                      sm:text-[13px]
                      sm:leading-6
                    "
                  >
                    {
                      business.description
                    }
                  </p>
                )}

                {/* QUICK STATS */}

                <div
                  className="
                    mt-4
                    flex
                    flex-wrap
                    gap-2
                  "
                >
                  <div
                    className="
                      min-w-25
                      rounded-xl
                      bg-[#F8F5F3]
                      px-3
                      py-2.5
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
                      Listings
                    </p>

                    <div
                      className="
                        mt-1
                        flex
                        items-center
                        gap-1.5
                      "
                    >
                      <Package
                        size={14}
                        className="
                          text-[#8A2638]
                        "
                      />

                      <p
                        className="
                          text-[15px]
                          font-black
                          text-[#3D0F18]
                        "
                      >
                        {business.activeListingCount ??
                          pagination.totalListings ??
                          0}
                      </p>
                    </div>
                  </div>

                  <div
                    className="
                      min-w-25
                      rounded-xl
                      bg-[#F8F5F3]
                      px-3
                      py-2.5
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
                      Status
                    </p>

                    <div
                      className="
                        mt-1
                        flex
                        items-center
                        gap-1.5
                        text-[11px]
                        font-black
                        text-emerald-700
                      "
                    >
                      <ShieldCheck
                        size={14}
                      />

                      Active
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* ==================================================
                CONTACT INFORMATION
            ================================================== */}

            {(business.location ||
              business.phone ||
              business.email ||
              business.website) && (
              <div
                className="
                  mt-5
                  grid
                  gap-2.5
                  border-t
                  border-[#EEE6E2]
                  pt-5
                  sm:grid-cols-2
                  lg:grid-cols-4
                "
              >
                {business.location && (
                  <div
                    className="
                      flex
                      items-start
                      gap-2.5
                      rounded-xl
                      bg-[#FAF8F7]
                      p-3
                    "
                  >
                    <MapPin
                      size={16}
                      className="
                        mt-0.5
                        shrink-0
                        text-[#6B1D2C]
                      "
                    />

                    <div className="min-w-0">
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

                      <p
                        className="
                          mt-1
                          text-[11px]
                          font-bold
                          text-gray-700
                        "
                      >
                        {
                          business.location
                        }
                      </p>

                      {business.address && (
                        <p
                          className="
                            mt-0.5
                            text-[9px]
                            leading-4
                            text-gray-500
                          "
                        >
                          {
                            business.address
                          }
                        </p>
                      )}
                    </div>
                  </div>
                )}

                {business.phone && (
                  <a
                    href={`tel:${business.phone}`}
                    className="
                      flex
                      items-start
                      gap-2.5
                      rounded-xl
                      bg-[#FAF8F7]
                      p-3
                      transition
                      hover:bg-[#F3ECE9]
                    "
                  >
                    <Phone
                      size={16}
                      className="
                        mt-0.5
                        shrink-0
                        text-[#6B1D2C]
                      "
                    />

                    <div className="min-w-0">
                      <p
                        className="
                          text-[8px]
                          font-black
                          uppercase
                          tracking-widest
                          text-gray-400
                        "
                      >
                        Phone
                      </p>

                      <p
                        className="
                          mt-1
                          break-all
                          text-[11px]
                          font-bold
                          text-gray-700
                        "
                      >
                        {
                          business.phone
                        }
                      </p>
                    </div>
                  </a>
                )}

                {business.email && (
                  <a
                    href={`mailto:${business.email}`}
                    className="
                      flex
                      items-start
                      gap-2.5
                      rounded-xl
                      bg-[#FAF8F7]
                      p-3
                      transition
                      hover:bg-[#F3ECE9]
                    "
                  >
                    <Mail
                      size={16}
                      className="
                        mt-0.5
                        shrink-0
                        text-[#6B1D2C]
                      "
                    />

                    <div className="min-w-0">
                      <p
                        className="
                          text-[8px]
                          font-black
                          uppercase
                         tracking-widest
                          text-gray-400
                        "
                      >
                        Email
                      </p>

                      <p
                        className="
                          mt-1
                          break-all
                          text-[11px]
                          font-bold
                          text-gray-700
                        "
                      >
                        {
                          business.email
                        }
                      </p>
                    </div>
                  </a>
                )}

                {business.website && (
                  <a
                    href={
                      business.website
                    }
                    target="_blank"
                    rel="noreferrer"
                    className="
                      flex
                      items-start
                      gap-2.5
                      rounded-xl
                      bg-[#FAF8F7]
                      p-3
                      transition
                      hover:bg-[#F3ECE9]
                    "
                  >
                    <Globe
                      size={16}
                      className="
                        mt-0.5
                        shrink-0
                        text-[#6B1D2C]
                      "
                    />

                    <div className="min-w-0">
                      <p
                        className="
                          text-[8px]
                          font-black
                          uppercase
                          tracking-widest
                          text-gray-400
                        "
                      >
                        Website
                      </p>

                      <p
                        className="
                          mt-1
                          flex
                          items-center
                          gap-1
                          text-[11px]
                          font-bold
                          text-[#6B1D2C]
                        "
                      >
                        Visit website

                        <ExternalLink
                          size={11}
                        />
                      </p>
                    </div>
                  </a>
                )}
              </div>
            )}
          </div>
        </div>
      </section>

      {/* ======================================================
          LISTINGS
      ====================================================== */}

      <section
        className="
          mx-auto
          mt-8
          max-w-7xl
          px-4
          sm:px-6
          lg:px-8
        "
      >
        <div
          className="
            mb-4
            flex
            flex-wrap
            items-end
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
                tracking-[0.16em]
                text-[#9A5D37]
              "
            >
              Storefront
            </p>

            <h2
              className="
                mt-1
                text-xl
                font-black
                tracking-tight
                text-[#3D0F18]
                sm:text-[22px]
              "
            >
              Available listings
            </h2>

            <p
              className="
                mt-1
                text-[11px]
                text-gray-500
                sm:text-[12px]
              "
            >
              Explore items offered
              by{" "}
              <span className="font-bold">
                {
                  business.businessName
                }
              </span>
              .
            </p>
          </div>

          <div
            className="
              flex
              items-center
              gap-1.5
              text-[10px]
              font-bold
              text-gray-500
            "
          >
            <Package
              size={15}
            />

            {
              pagination.totalListings
            }{" "}
            listing
            {pagination.totalListings ===
            1
              ? ""
              : "s"}
          </div>
        </div>

        {listingsLoading ? (
          <div
            className="
              grid
              gap-4
              sm:grid-cols-2
              lg:grid-cols-3
              xl:grid-cols-4
            "
          >
            {Array.from({
              length: 8,
            }).map(
              (_, index) => (
                <div
                  key={index}
                  className="
                    animate-pulse
                    overflow-hidden
                    rounded-xl
                    border
                    border-[#E8DFDB]
                    bg-white
                  "
                >
                  <div
                    className="
                      aspect-4/3
                      bg-[#E8DFDB]
                    "
                  />

                  <div className="p-3">
                    <div
                      className="
                        h-4
                        w-3/4
                        rounded
                        bg-[#E8DFDB]
                      "
                    />

                    <div
                      className="
                        mt-2
                        h-3
                        w-1/2
                        rounded
                        bg-[#E8DFDB]
                      "
                    />
                  </div>
                </div>
              )
            )}
          </div>
        ) : listings.length ===
          0 ? (
          <div
            className="
              rounded-2xl
              border
              border-dashed
              border-[#DCCBC5]
              bg-white
              px-6
              py-14
              text-center
            "
          >
            <Package
              size={40}
              className="
                mx-auto
                text-[#BDA8A0]
              "
            />

            <h3
              className="
                mt-3
                text-base
                font-black
                text-[#3D0F18]
              "
            >
              No active listings
            </h3>

            <p
              className="
                mx-auto
                mt-1.5
                max-w-md
                text-[11px]
                leading-5
                text-gray-500
              "
            >
              This business does
              not currently have
              any active listings.
            </p>
          </div>
        ) : (
          <div
            className="
              grid
              gap-4
              sm:grid-cols-2
              lg:grid-cols-3
              xl:grid-cols-4
            "
          >
            {listings.map(
              (listing) => {
                const image =
                  getPrimaryImage(
                    listing
                  );

                const formattedValue =
                  Number(
                    listing
                      ?.estimatedValue ||
                      0
                  ).toLocaleString();

                return (
                  <Link
                    key={
                      listing.id
                    }
                    to={`/listings/${listing.id}`}
                    className="
                      group
                      flex
                      h-full
                      min-w-0
                      flex-col
                      overflow-hidden
                      rounded-xl
                      border
                      border-[#E9E2E3]
                      bg-white
                      shadow-sm
                      transition-all
                      duration-300
                      hover:-translate-y-1
                      hover:border-[#D4BEC3]
                      hover:shadow-md
                    "
                  >
                    <div
                      className="
                        relative
                        aspect-4/3
                        overflow-hidden
                        bg-[#F0E9E6]
                      "
                    >
                      {image ? (
                        <img
                          src={image}
                          alt={
                            listing.title
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
                      ) : (
                        <div
                          className="
                            flex
                            h-full
                            items-center
                            justify-center
                          "
                        >
                          <Package
                            size={34}
                            className="
                              text-[#BDA8A0]
                            "
                          />
                        </div>
                      )}

                      {listing.condition && (
                        <span
                          className="
                            absolute
                            bottom-2
                            right-2
                            rounded-md
                            bg-black/60
                            px-2
                            py-1
                            text-[8px]
                            font-bold
                            capitalize
                            text-white
                            backdrop-blur-sm
                          "
                        >
                          {listing.condition
                            .replaceAll(
                              "_",
                              " "
                            )
                            .toLowerCase()}
                        </span>
                      )}
                    </div>

                    <div
                      className="
                        flex
                        flex-1
                        flex-col
                        p-3
                      "
                    >
                      {listing.category
                        ?.name && (
                        <p
                          className="
                            text-[8px]
                            font-black
                            uppercase
                            tracking-[0.08em]
                            text-[#8A2638]
                          "
                        >
                          {
                            listing
                              .category
                              .name
                          }
                        </p>
                      )}

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
                        {
                          listing.title
                        }
                      </h3>

                      {listing.description && (
                        <p
                          className="
                            mt-1
                            line-clamp-2
                            min-h-8
                            text-[9px]
                            leading-4
                            text-gray-500
                            sm:text-[10px]
                          "
                        >
                          {
                            listing.description
                          }
                        </p>
                      )}

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
                            group-hover:bg-[#5B1725]
                            group-hover:text-white
                          "
                        >
                          →
                        </span>
                      </div>
                    </div>
                  </Link>
                );
              }
            )}
          </div>
        )}

        {/* ====================================================
            PAGINATION
        ==================================================== */}

        {pagination.totalPages >
          1 && (
          <div
            className="
              mt-8
              flex
              items-center
              justify-center
              gap-2
            "
          >
            <button
              type="button"
              disabled={
                !pagination.hasPreviousPage ||
                listingsLoading
              }
              onClick={() =>
                setPage(
                  (current) =>
                    Math.max(
                      current - 1,
                      1
                    )
                )
              }
              className="
                inline-flex
                items-center
                gap-1.5
                rounded-xl
                border
                border-[#DCCBC5]
                bg-white
                px-3
                py-2
                text-[10px]
                font-black
                text-[#3D0F18]
                transition
                hover:bg-[#F3ECE9]
                disabled:cursor-not-allowed
                disabled:opacity-40
              "
            >
              <ChevronLeft
                size={15}
              />

              Previous
            </button>

            <span
              className="
                rounded-xl
                bg-[#6B1D2C]
                px-3.5
                py-2
                text-[10px]
                font-black
                text-white
              "
            >
              {pagination.page} /{" "}
              {
                pagination.totalPages
              }
            </span>

            <button
              type="button"
              disabled={
                !pagination.hasNextPage ||
                listingsLoading
              }
              onClick={() =>
                setPage(
                  (current) =>
                    current + 1
                )
              }
              className="
                inline-flex
                items-center
                gap-1.5
                rounded-xl
                border
                border-[#DCCBC5]
                bg-white
                px-3
                py-2
                text-[10px]
                font-black
                text-[#3D0F18]
                transition
                hover:bg-[#F3ECE9]
                disabled:cursor-not-allowed
                disabled:opacity-40
              "
            >
              Next

              <ChevronRight
                size={15}
              />
            </button>
          </div>
        )}
      </section>
    </div>
  );
};

export default BusinessStorefront;