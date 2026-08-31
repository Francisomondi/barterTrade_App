import { useEffect, useState } from "react";
import { Link } from "react-router-dom";

import {
  getMyListings,
  removeListing,
} from "../api/listingApi";

const MyListings = () => {
  const [listings, setListings] =
    useState([]);

  const [loading, setLoading] =
    useState(true);

  const loadListings = async () => {
    try {
      const data =
        await getMyListings();

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
    const confirmed =
      window.confirm(
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

  if (loading) {
    return (
      <div className="py-20 text-center">
        Loading your listings...
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 px-6 py-10">
      <div className="mx-auto max-w-7xl">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">
              My Listings
            </h1>

            <p className="mt-1 text-gray-500">
              Manage the items you've put up
              for barter.
            </p>
          </div>

          <Link
            to="/listings/create"
            className="rounded-xl bg-green-600 px-5 py-3 font-semibold text-white"
          >
            + Add Item
          </Link>
        </div>

        {listings.length === 0 ? (
          <div className="mt-10 rounded-2xl border bg-white py-20 text-center">
            <h2 className="text-xl font-semibold">
              You haven't listed anything yet.
            </h2>

            <Link
              to="/listings/create"
              className="mt-5 inline-block text-green-600"
            >
              List your first item →
            </Link>
          </div>
        ) : (
          <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {listings.map((listing) => {
              const image =
                listing.images?.[0]?.url ||
                "https://placehold.co/600x400?text=No+Image";

              return (
                <div
                  key={listing.id}
                  className="overflow-hidden rounded-2xl border bg-white"
                >
                  <img
                    src={image}
                    alt={listing.title}
                    className="aspect-[4/3] w-full object-cover"
                  />

                  <div className="p-4">
                    <div className="flex items-start justify-between gap-3">
                      <h2 className="font-semibold">
                        {listing.title}
                      </h2>

                      <span className="rounded-full bg-gray-100 px-2 py-1 text-xs">
                        {listing.status}
                      </span>
                    </div>

                    <p className="mt-2 font-bold">
                      KES{" "}
                      {Number(
                        listing.estimatedValue
                      ).toLocaleString()}
                    </p>

                    <div className="mt-4 flex gap-2">
                      <Link
                        to={`/listings/${listing.id}`}
                        className="flex-1 rounded-lg border py-2 text-center text-sm font-medium"
                      >
                        View
                      </Link>

                      {listing.status !==
                        "TRADED" && (
                        <button
                          onClick={() =>
                            handleRemove(
                              listing.id
                            )
                          }
                          className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600"
                        >
                          Remove
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default MyListings;