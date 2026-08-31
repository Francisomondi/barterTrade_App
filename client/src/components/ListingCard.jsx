import { Link } from "react-router-dom";

const ListingCard = ({
  listing,
}) => {
  const image =
    listing.images?.[0]?.url ||
    "https://placehold.co/600x400?text=Barter+Trade";

  return (
    <Link
      to={`/listings/${listing.id}`}
      className="group overflow-hidden rounded-2xl border bg-white shadow-sm transition hover:-translate-y-1 hover:shadow-lg"
    >

      <div className="aspect-[4/3] overflow-hidden bg-gray-100">

        <img
          src={image}
          alt={listing.title}
          className="h-full w-full object-cover transition duration-300 group-hover:scale-105"
        />

      </div>

      <div className="p-4">

        <div className="flex items-center justify-between">

          <span className="rounded-full bg-green-100 px-3 py-1 text-xs font-medium text-green-700">
            {listing.category?.name ||
              "Other"}
          </span>

          <span className="text-xs text-gray-500">
            {listing.condition
              ?.replace(
                "_",
                " "
              )}
          </span>

        </div>

        <h3 className="mt-3 truncate text-lg font-semibold">
          {listing.title}
        </h3>

        <p className="mt-1 line-clamp-2 text-sm text-gray-500">
          {listing.description}
        </p>

        <div className="mt-4 flex items-end justify-between">

          <div>

            <p className="text-xs text-gray-500">
              Barter value
            </p>

            <p className="text-lg font-bold">
              KES{" "}
              {Number(
                listing.estimatedValue
              ).toLocaleString()}
            </p>

          </div>

          <span className="text-sm font-semibold text-green-600">
            View →
          </span>

        </div>

      </div>

    </Link>
  );
};

export default ListingCard;