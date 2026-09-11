
import { Link } from "react-router-dom";

const ListingCard = ({ listing }) => {
  const image =
    listing.images?.[0]?.url ||
    "https://placehold.co/600x400?text=Barter+Trade";

  return (
    <Link
      to={`/listings/${listing.id}`}
      className="
        group flex h-full flex-col
        overflow-hidden
        rounded-xl
        border border-[#E7DDDF]
        bg-white
        shadow-sm
        transition-all duration-200
        hover:-translate-y-0.5
        hover:border-[#C9A3AB]
        hover:shadow-md
      "
    >

      {/* =====================================================
          IMAGE
      ====================================================== */}

      <div
        className="
          relative
          aspect-[4/3]
          w-full
          overflow-hidden
          bg-[#F3EEEF]
        "
      >

        <img
          src={image}
          alt={listing.title}
          className="
            h-full
            w-full
            object-cover
            transition-transform
            duration-300
            ease-out
            group-hover:scale-[1.03]
          "
        />

        {/* Subtle image overlay */}
        <div
          className="
            pointer-events-none
            absolute inset-0
            bg-gradient-to-t
            from-black/10
            via-transparent
            to-transparent
            opacity-0
            transition-opacity
            duration-300
            group-hover:opacity-100
          "
        />

      </div>


      {/* =====================================================
          CONTENT
      ====================================================== */}

      <div className="flex flex-1 flex-col p-3.5 sm:p-4">

        {/* CATEGORY + CONDITION */}

        <div className="flex items-center justify-between gap-2">

          <span
            className="
              max-w-[65%]
              truncate
              rounded-md
              bg-[#F5E8EB]
              px-2.5 py-1
              text-[10px]
              font-bold
              uppercase
              tracking-wide
              text-[#5B1725]
              sm:text-[11px]
            "
          >
            {listing.category?.name || "Other"}
          </span>

          <span
            className="
              shrink-0
              text-[10px]
              font-medium
              capitalize
              text-gray-500
              sm:text-[11px]
            "
          >
            {listing.condition?.replace("_", " ")}
          </span>

        </div>


        {/* TITLE */}

        <h3
          className="
            mt-2.5
            truncate
            text-sm
            font-bold
            leading-5
            text-[#21191B]
            transition-colors
            group-hover:text-[#5B1725]
            sm:text-[15px]
          "
        >
          {listing.title}
        </h3>


        {/* DESCRIPTION */}

        <p
          className="
            mt-1
            line-clamp-2
            min-h-[2.25rem]
            text-xs
            leading-[1.125rem]
            text-gray-500
            sm:text-[13px]
          "
        >
          {listing.description}
        </p>


        {/* =================================================
            BOTTOM INFORMATION
        ================================================== */}

        <div
          className="
            mt-auto
            flex
            items-end
            justify-between
            gap-3
            border-t
            border-[#F0E8EA]
            pt-3
          "
        >

          {/* VALUE */}

          <div className="min-w-0">

            <p
              className="
                text-[10px]
                font-medium
                uppercase
                tracking-wide
                text-gray-400
              "
            >
              Barter value
            </p>

            <p
              className="
                mt-0.5
                truncate
                text-base
                font-extrabold
                leading-5
                text-[#5B1725]
                sm:text-lg
              "
            >
              KES{" "}
              {Number(listing.estimatedValue).toLocaleString()}
            </p>

          </div>


          {/* VIEW */}

          <span
            className="
              flex
              shrink-0
              items-center
              gap-1
              rounded-lg
              bg-[#5B1725]
              px-2.5
              py-1.5
              text-[11px]
              font-bold
              text-white
              transition-all
              duration-200
              group-hover:bg-[#3D0F18]
              sm:px-3
              sm:text-xs
            "
          >
            View
            <span className="text-sm leading-none transition-transform duration-200 group-hover:translate-x-0.5">
              →
            </span>
          </span>

        </div>

      </div>

    </Link>
  );
};

export default ListingCard;

