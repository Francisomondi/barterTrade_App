import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";

import {
getListingById,
deleteListingImage,
addListingImages,
setPrimaryListingImage,
} from "../api/listingApi";

const ManageListing = () => {
const { id } = useParams();
const navigate = useNavigate();

const [listing, setListing] = useState(null);
const [loading, setLoading] = useState(true);

const [deletingImageId, setDeletingImageId] = useState(null);
const [settingPrimaryId, setSettingPrimaryId] = useState(null);

const [selectedImages, setSelectedImages] = useState([]);
const [uploadingImages, setUploadingImages] = useState(false);

const [error, setError] = useState("");

const loadListing = async () => {
try {
setLoading(true);
setError("");


  const data = await getListingById(id);

  setListing(data.listing || data);
} catch (error) {
  console.error("LOAD LISTING ERROR:", error);

  setError(
    error.response?.data?.message ||
      "Unable to load listing."
  );
} finally {
  setLoading(false);
}


};

useEffect(() => {
loadListing();
}, [id]);

const handleDeleteImage = async (imageId) => {
const confirmed = window.confirm(
"Are you sure you want to delete this image?"
);


if (!confirmed) return;

try {
  setDeletingImageId(imageId);
  setError("");

  await deleteListingImage(id, imageId);

  setListing((currentListing) => ({
    ...currentListing,
    images: currentListing.images.filter(
      (image) => image.id !== imageId
    ),
  }));
} catch (error) {
  console.error("DELETE IMAGE ERROR:", error);

  setError(
    error.response?.data?.message ||
      "Unable to delete image."
  );
} finally {
  setDeletingImageId(null);
}


};

const handleImageChange = (event) => {
const files = Array.from(event.target.files || []);


if (files.length === 0) return;

const currentImages = listing?.images || [];
const remainingSlots = 8 - currentImages.length;

if (remainingSlots <= 0) {
  setError(
    "This listing already has the maximum of 8 images."
  );

  event.target.value = "";
  return;
}

if (files.length > remainingSlots) {
  setError(
    `You can only add ${remainingSlots} more image(s).`
  );

  event.target.value = "";
  return;
}

const invalidFile = files.find(
  (file) =>
    !file.type.startsWith("image/") ||
    file.size > 10 * 1024 * 1024
);

if (invalidFile) {
  setError(
    "Only image files up to 10MB each are allowed."
  );

  event.target.value = "";
  return;
}

setError("");
setSelectedImages(files);


};

const handleUploadImages = async () => {
if (selectedImages.length === 0) {
setError("Please select at least one image.");
return;
}


try {
  setUploadingImages(true);
  setError("");

  const formData = new FormData();

  selectedImages.forEach((image) => {
    formData.append("images", image);
  });

  const data = await addListingImages(
    listing.id,
    formData
  );

  setListing(data.listing);
  setSelectedImages([]);

  const fileInput =
    document.getElementById("listing-images");

  if (fileInput) {
    fileInput.value = "";
  }
} catch (error) {
  console.error("UPLOAD IMAGES ERROR:", error);

  setError(
    error.response?.data?.message ||
      "Unable to upload images."
  );
} finally {
  setUploadingImages(false);
}


};

const handleSetPrimary = async (imageId) => {
if (!listing?.id || !imageId) return;


try {
  setSettingPrimaryId(imageId);
  setError("");

  const data = await setPrimaryListingImage(
    listing.id,
    imageId
  );

  setListing((prev) => ({
    ...prev,
    images: data.images,
  }));
} catch (error) {
  console.error("SET PRIMARY IMAGE ERROR:", error);

  setError(
    error.response?.data?.message ||
      "Failed to set main image. Please try again."
  );
} finally {
  setSettingPrimaryId(null);
}


};

if (loading) {
return ( <div className="min-h-screen bg-gray-50 px-6 py-20 text-center"> <p className="text-gray-500">
Loading listing... </p> </div>
);
}

if (error && !listing) {
return ( <div className="min-h-screen bg-gray-50 px-6 py-20"> <div className="mx-auto max-w-2xl rounded-2xl border bg-white p-8 text-center"> <h1 className="text-xl font-bold text-red-600">
Unable to load listing </h1>


      <p className="mt-3 text-gray-600">
        {error}
      </p>

      <Link
        to="/my-listings"
        className="mt-6 inline-block rounded-xl bg-[#3D0F18] px-5 py-3 font-semibold text-white"
      >
        Back to My Listings
      </Link>
    </div>
  </div>
);


}

if (!listing) return null;

const images = listing.images || [];
const remainingSlots = 8 - images.length;

return ( <div className="min-h-screen bg-[#F8F5F3] px-6 py-10"> <div className="mx-auto max-w-6xl">


    {/* Header */}
    <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <p className="text-sm font-medium text-[#8A2638]">
          Manage Listing
        </p>

        <h1 className="mt-1 text-3xl font-bold text-[#3D0F18]">
          {listing.title}
        </h1>

        <p className="mt-2 text-gray-600">
          Manage the photos attached to your listing.
        </p>
      </div>

      <Link
        to="/my-listings"
        className="rounded-xl border border-[#DCAEB7] bg-white px-5 py-3 text-center font-semibold text-[#3D0F18]"
      >
        ← Back to My Listings
      </Link>
    </div>

    {/* Error */}
    {error && (
      <div className="mb-6 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
        {error}
      </div>
    )}

    {/* Listing summary */}
    <div className="mb-8 rounded-2xl border border-[#E7DDDF] bg-white p-6 shadow-sm">
      <div className="grid gap-4 sm:grid-cols-3">

        <div>
          <p className="text-sm text-gray-500">
            Status
          </p>

          <p className="mt-1 font-semibold text-[#3D0F18]">
            {listing.status}
          </p>
        </div>

        <div>
          <p className="text-sm text-gray-500">
            Estimated Value
          </p>

          <p className="mt-1 font-semibold text-[#3D0F18]">
            KES{" "}
            {Number(
              listing.estimatedValue || 0
            ).toLocaleString()}
          </p>
        </div>

        <div>
          <p className="text-sm text-gray-500">
            Images
          </p>

          <p className="mt-1 font-semibold text-[#3D0F18]">
            {images.length} / 8
          </p>
        </div>

      </div>
    </div>

    {/* Images */}
    <div className="rounded-2xl border border-[#E7DDDF] bg-white p-6 shadow-sm">

      {/* Section heading */}
      <div className="mb-6">
        <h2 className="text-xl font-bold text-[#3D0F18]">
          Listing Images
        </h2>

        <p className="mt-1 text-sm text-gray-500">
          Manage the photos attached to this listing.
        </p>
      </div>

      {/* Add More Images */}
      <div className="mb-8 rounded-2xl border border-dashed border-[#DCAEB7] bg-[#FBF5F6] p-6">

        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">

          <div>
            <h3 className="font-semibold text-[#3D0F18]">
              Add More Images
            </h3>

            <p className="mt-1 text-sm text-gray-500">
              You can upload up to{" "}
              {remainingSlots} more image
              {remainingSlots === 1 ? "" : "s"}.
              Maximum 10MB per image.
            </p>
          </div>

          <label
            htmlFor="listing-images"
            className={`cursor-pointer rounded-xl border border-[#DCAEB7] bg-white px-5 py-3 text-center text-sm font-semibold text-[#3D0F18] transition hover:bg-[#F5E8EB] ${
              images.length >= 8 || uploadingImages
                ? "pointer-events-none opacity-50"
                : ""
            }`}
          >
            Choose Images
          </label>

          <input
            id="listing-images"
            type="file"
            accept="image/*"
            multiple
            onChange={handleImageChange}
            disabled={
              uploadingImages ||
              images.length >= 8
            }
            className="hidden"
          />
        </div>

        {/* Selected images */}
        {selectedImages.length > 0 && (
          <div className="mt-5">

            <p className="text-sm font-medium text-[#3D0F18]">
              Selected: {selectedImages.length} image
              {selectedImages.length === 1
                ? ""
                : "s"}
            </p>

            <div className="mt-3 flex flex-wrap gap-2">
              {selectedImages.map((image) => (
                <span
                  key={`${image.name}-${image.size}`}
                  className="rounded-lg bg-white px-3 py-2 text-xs text-gray-600 shadow-sm"
                >
                  {image.name}
                </span>
              ))}
            </div>

            <div className="mt-4 flex flex-wrap gap-3">

              <button
                type="button"
                onClick={handleUploadImages}
                disabled={uploadingImages}
                className="rounded-xl bg-[#3D0F18] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[#5B1725] disabled:cursor-not-allowed disabled:opacity-50"
              >
                {uploadingImages
                  ? "Uploading..."
                  : "Upload Images"}
              </button>

              <button
                type="button"
                onClick={() => {
                  setSelectedImages([]);

                  const fileInput =
                    document.getElementById(
                      "listing-images"
                    );

                  if (fileInput) {
                    fileInput.value = "";
                  }
                }}
                disabled={uploadingImages}
                className="rounded-xl border border-[#DCAEB7] bg-white px-5 py-3 text-sm font-semibold text-[#3D0F18] disabled:cursor-not-allowed disabled:opacity-50"
              >
                Cancel
              </button>

            </div>
          </div>
        )}
      </div>

      {/* Existing Images */}
      {images.length === 0 ? (
        <div className="rounded-xl border border-dashed border-[#DCAEB7] bg-[#FBF5F6] px-6 py-12 text-center">

          <p className="font-medium text-[#3D0F18]">
            No images available.
          </p>

          <p className="mt-1 text-sm text-gray-500">
            Choose images above to add photos to
            this listing.
          </p>

        </div>
      ) : (
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">

          {images.map((image, index) => (
            <div
              key={image.id}
              className="overflow-hidden rounded-2xl border border-[#E7DDDF] bg-white"
            >

              {/* Image */}
              <div className="relative">

                <img
                  src={image.url}
                  alt={`${listing.title} ${
                    index + 1
                  }`}
                  className="h-52 w-full object-cover"
                />

                {/* Main image badge */}
                {image.isPrimary && (
                  <span className="absolute left-3 top-3 rounded-full bg-[#3D0F18] px-3 py-1 text-xs font-semibold text-white">
                    Main Image
                  </span>
                )}

              </div>

              {/* Image controls */}
              <div className="p-4">

                <p className="mb-3 text-sm text-gray-500">
                  Image {index + 1}
                </p>

                <div className="flex flex-col gap-2">

                  {/* Set as Main */}
                  {!image.isPrimary && (
                    <button
                      type="button"
                      onClick={() =>
                        handleSetPrimary(image.id)
                      }
                      disabled={
                        settingPrimaryId === image.id ||
                        deletingImageId === image.id
                      }
                      className="w-full rounded-lg border border-[#DCAEB7] bg-white px-4 py-2.5 text-sm font-semibold text-[#8A2638] transition hover:bg-[#F5E8EB] disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      {settingPrimaryId === image.id
                        ? "Setting as Main..."
                        : "Set as Main Image"}
                    </button>
                  )}

                  {/* Main image status */}
                  {image.isPrimary && (
                    <div className="w-full rounded-lg bg-[#F5E8EB] px-4 py-2.5 text-center text-sm font-semibold text-[#8A2638]">
                      ✓ Current Main Image
                    </div>
                  )}

                  {/* Delete */}
                  <button
                    type="button"
                    disabled={
                      deletingImageId === image.id ||
                      settingPrimaryId === image.id
                    }
                    onClick={() =>
                      handleDeleteImage(image.id)
                    }
                    className="w-full rounded-lg bg-red-50 px-4 py-2.5 text-sm font-semibold text-red-600 transition hover:bg-red-100 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {deletingImageId === image.id
                      ? "Deleting..."
                      : "Delete Image"}
                  </button>

                </div>
              </div>

            </div>
          ))}

        </div>
      )}
    </div>

    {/* Bottom actions */}
    <div className="mt-8 flex flex-col gap-3 sm:flex-row">

      <Link
        to={`/listings/${listing.id}`}
        className="rounded-xl bg-[#3D0F18] px-5 py-3 text-center font-semibold text-white transition hover:bg-[#5B1725]"
      >
        View Listing
      </Link>

      <button
        type="button"
        onClick={() => navigate("/my-listings")}
        className="rounded-xl border border-[#DCAEB7] bg-white px-5 py-3 font-semibold text-[#3D0F18]"
      >
        Done
      </button>

    </div>

  </div>
</div>


);
};

export default ManageListing;
