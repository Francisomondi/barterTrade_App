import { useEffect, useState } from "react";
import {Link,useParams,useNavigate} from "react-router-dom";
import {getListingById} from "../api/listingApi";


const ListingDetails = () => {
  const { id } = useParams();

  const navigate = useNavigate();

  const [listing, setListing] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const loadListing = async () => {
      try {
        const data =
          await getListingById(id);

        setListing(data.listing);
      } catch (error) {
        console.error(error);

        setError(
          "Unable to load listing."
        );
      } finally {
        setLoading(false);
      }
    };

    loadListing();
  }, [id]);

  if (loading) {
    return (
      <div className="py-20 text-center">
        Loading listing...
      </div>
    );
  }

  if (error || !listing) {
    return (
      <div className="mx-auto max-w-4xl px-6 py-20 text-center">
        <h1 className="text-2xl font-bold">
          Listing not found
        </h1>

        <Link
          to="/"
          className="mt-4 inline-block text-green-600"
        >
          Back to marketplace
        </Link>
      </div>
    );
  }

  const mainImage =
    listing.images?.[0]?.url ||
    "https://placehold.co/800x600?text=No+Image";

  return (
    <div className="min-h-screen bg-gray-50 px-6 py-10">
      <div className="mx-auto max-w-6xl">
        <Link
          to="/"
          className="text-sm font-medium text-green-600"
        >
          ← Back to marketplace
        </Link>

        <div className="mt-6 grid gap-8 lg:grid-cols-2">
          <div>
            <div className="overflow-hidden rounded-3xl bg-white">
              <img
                src={mainImage}
                alt={listing.title}
                className="aspect-square w-full object-cover"
              />
            </div>

            {listing.images?.length > 1 && (
              <div className="mt-4 grid grid-cols-4 gap-3">
                {listing.images.map(
                  (image) => (
                    <img
                      key={image.id}
                      src={image.url}
                      alt=""
                      className="aspect-square rounded-xl object-cover"
                    />
                  )
                )}
              </div>
            )}
          </div>

          <div>
            <span className="rounded-full bg-green-100 px-3 py-1 text-sm font-medium text-green-700">
              {listing.category?.name}
            </span>

            <h1 className="mt-4 text-4xl font-bold">
              {listing.title}
            </h1>

            <p className="mt-5 leading-7 text-gray-600">
              {listing.description}
            </p>

            <div className="mt-8 rounded-2xl border bg-white p-6">
              <p className="text-sm text-gray-500">
                Estimated barter value
              </p>

              <p className="mt-1 text-3xl font-bold">
                KES{" "}
                {Number(
                  listing.estimatedValue
                ).toLocaleString()}
              </p>

              {(listing.minimumValue ||
                listing.maximumValue) && (
                <p className="mt-2 text-sm text-gray-500">
                  Acceptable range: KES{" "}
                  {Number(
                    listing.minimumValue || 0
                  ).toLocaleString()}{" "}
                  – KES{" "}
                  {Number(
                    listing.maximumValue ||
                      listing.estimatedValue
                  ).toLocaleString()}
                </p>
              )}
            </div>

            <div className="mt-5 grid grid-cols-2 gap-4">
              <div className="rounded-xl bg-white p-4">
                <p className="text-xs text-gray-500">
                  Condition
                </p>

                <p className="mt-1 font-semibold">
                  {listing.condition.replace(
                    "_",
                    " "
                  )}
                </p>
              </div>

              <div className="rounded-xl bg-white p-4">
                <p className="text-xs text-gray-500">
                  Location
                </p>

                <p className="mt-1 font-semibold">
                  {listing.location ||
                    "Not specified"}
                </p>
              </div>
            </div>

            <div className="mt-6 rounded-2xl border bg-white p-6">
              <p className="text-sm text-gray-500">
                Listed by
              </p>

              <div className="mt-3 flex items-center gap-3">
                {listing.user?.avatar ? (
                  <img
                    src={listing.user.avatar}
                    alt=""
                    className="h-12 w-12 rounded-full object-cover"
                  />
                ) : (
                  <div className="flex h-12 w-12 items-center justify-center rounded-full bg-green-100 font-bold text-green-700">
                    {listing.user?.name
                      ?.charAt(0)
                      ?.toUpperCase()}
                  </div>
                )}

                <div>
                  <p className="font-semibold">
                    {listing.user?.name}
                  </p>

                  <p className="text-sm text-gray-500">
                    {listing.user
                      ?.completedTrades || 0}{" "}
                    completed trades
                  </p>
                </div>
              </div>
            </div>

            <button
              type="button"
              onClick={() => navigate(`/make-offer/${listing.id}`)}
              className="rounded-xl bg-[#5B1725] px-6 py-3 font-bold text-white shadow-lg transition hover:bg-[#3D0F18]"
            >
              Make Trade Offer
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ListingDetails;