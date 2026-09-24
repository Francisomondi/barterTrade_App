
import { useEffect, useState } from "react";
import {
  Link,
  useNavigate,
  useParams,
  useSearchParams,
} from "react-router-dom";

import {
  getListingById,
  deleteListingImage,
  addListingImages,
  setPrimaryListingImage,
  reorderListingImages,
} from "../api/listingApi";

import {
  createPromotion,
  getPromotionPlans,
  payForPromotion,
} from "../api/promotionApi";

import {
  pollPromotionPayment,
} from "../utils/pollPromotionPayment";

const ManageListing = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] =
    useSearchParams();

  // ======================================================
  // LISTING STATE
  // ======================================================

  const [listing, setListing] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // ======================================================
  // IMAGE STATE
  // ======================================================

  const [deletingImageId, setDeletingImageId] = useState(null);

  const [settingPrimaryId, setSettingPrimaryId] = useState(null);

  const [reorderingImages, setReorderingImages] = useState(false);

  const [selectedImages, setSelectedImages] =useState([]);

  const [uploadingImages, setUploadingImages] = useState(false);

  // ======================================================
  // PROMOTION STATE
  // ======================================================

  const [promotionPlans, setPromotionPlans] = useState([]);

  const [plansLoading, setPlansLoading] = useState(false);

  const [ promotionModalOpen, setPromotionModalOpen,] = useState(false);

  const [selectedListing, setSelectedListing] = useState(null);

  const [selectedPlan, setSelectedPlan] = useState(null);

  const [phoneNumber, setPhoneNumber] = useState("");

  const [promotionStep, setPromotionStep] = useState("SELECT");

  const [promotionLoading, setPromotionLoading] = useState(false);

  const [promotionError, setPromotionError] = useState("");

  const [promotionResult, setPromotionResult] = useState(null);
  const [promotionPricing, setPromotionPricing] = useState(null);
  const [retryAfterSeconds, setRetryAfterSeconds] = useState(0);
  
  const [continuePaymentHandled, setContinuePaymentHandled] = useState(false);
  

  // ======================================================
  // LOAD LISTING
  // ======================================================

  const loadListing = async () => {
    try {
      setLoading(true);
      setError("");

      const data = await getListingById(id);

      setListing(data.listing || data);
    } catch (error) {
      console.error(
        "LOAD LISTING ERROR:",
        error
      );

      setError(
        error.response?.data?.message ||
          "Unable to load listing."
      );
    } finally {
      setLoading(false);
    }
  };

  // ======================================================
  // LOAD PROMOTION PLANS
  // ======================================================

  const loadPromotionPlans = async () => {
    try {
      setPlansLoading(true);

      const data =
        await getPromotionPlans();

      setPromotionPlans(
        Array.isArray(data?.plans)
          ? data.plans
          : []
      );
    } catch (error) {
      console.error(
        "LOAD PROMOTION PLANS ERROR:",
        error
      );

      setPromotionPlans([]);
    } finally {
      setPlansLoading(false);
    }
  };

  // ======================================================
  // INITIAL LOAD
  // ======================================================

  useEffect(() => {
    loadListing();
  }, [id]);

  useEffect(() => {
    loadPromotionPlans();
  }, []);

  // ======================================================
  // CONTINUE PAYMENT FROM DASHBOARD
  // ======================================================

  useEffect(() => {
    if (
      continuePaymentHandled ||
      !listing ||
      plansLoading ||
      promotionPlans.length === 0
    ) {
      return;
    }

    const shouldContinue =
      searchParams.get("continuePayment") === "1";

    if (!shouldContinue) {
      return;
    }

    const promotionType =
      searchParams.get("promotionType");

    const matchingPlan =
      promotionPlans.find(
        (plan) =>
          plan.type === promotionType
      );

    if (!matchingPlan) {
      setError(
        "The promotion plan for this pending promotion is no longer available."
      );
      setContinuePaymentHandled(true);
      return;
    }

    setSelectedListing(listing);
    setSelectedPlan(matchingPlan);
    setPhoneNumber("");
    setPromotionError("");
    setPromotionResult(null);

    // Reset old Premium pricing
    setPromotionPricing(null);

    setRetryAfterSeconds(0);
    setPromotionStep("PHONE");
    setPromotionLoading(false);
    setPromotionModalOpen(true);
    setContinuePaymentHandled(true);

    // Remove the one-time payment query from the URL so
    // refreshing the page does not reopen the modal forever.
    setSearchParams({}, { replace: true });
  }, [
    continuePaymentHandled,
    listing,
    plansLoading,
    promotionPlans,
    searchParams,
    setSearchParams,
  ]);

  // ======================================================
  // PAYMENT RETRY COUNTDOWN
  // ======================================================

  useEffect(() => {
    if (retryAfterSeconds <= 0) return;

    const timer = window.setInterval(() => {
      setRetryAfterSeconds((current) =>
        current > 0 ? current - 1 : 0
      );
    }, 1000);

    return () => {
      window.clearInterval(timer);
    };
  }, [retryAfterSeconds]);

  // ======================================================
  // PROMOTION MODAL
  // ======================================================

  const openPromotionModal = () => {
    if (!listing) return;

     setSelectedListing(listing);
      setSelectedPlan(null);
      setPhoneNumber("");
      setPromotionError("");
      setPromotionResult(null);
      setPromotionPricing(null);
      setRetryAfterSeconds(0);
      setPromotionStep("SELECT");
      setPromotionLoading(false);
      setPromotionModalOpen(true);
      };

  const closePromotionModal = () => {
    if (
      promotionLoading ||
      promotionStep === "WAITING"
    ) {
      return;
    }
  setPromotionModalOpen(false);
  setSelectedListing(null);
  setSelectedPlan(null);
  setPhoneNumber("");
  setPromotionError("");
  setPromotionResult(null);
  setPromotionPricing(null);
  setRetryAfterSeconds(0);
  setPromotionStep("SELECT");
  setPromotionLoading(false);
  };

  const handleSelectPromotionPlan = (
    plan
  ) => {
    setSelectedPlan(plan);
    setPromotionError("");
    setPromotionStep("PHONE");
  };

  // ======================================================
  // PROMOTION PAYMENT
  // ======================================================

  const handlePromotionPayment = async () => {
      if (!selectedListing) {
        setPromotionError(
          "No listing selected."
        );

        return;
      }

      if (!selectedPlan) {
        setPromotionError(
          "Please select a promotion plan."
        );

        return;
      }

      if (!phoneNumber.trim()) {
        setPromotionError(
          "Enter your M-PESA phone number."
        );

        return;
      }

      try {
        setPromotionLoading(true);
        setPromotionError("");
        setPromotionResult(null);
        setRetryAfterSeconds(0);

        // ----------------------------------------------
        // 1. Create/reuse pending promotion
        // ----------------------------------------------

        const promotionResponse =
          await createPromotion({
            listingId:
              selectedListing.id,

            type: selectedPlan.type,
          });

        const promotion =
          promotionResponse?.promotion;

        const pricing =
          promotionResponse?.pricing || null;

        setPromotionPricing(pricing);

        if (!promotion?.id) {
          throw new Error(
            "Promotion ID was not returned."
          );
        }

        // ----------------------------------------------
        // 2. Initiate M-PESA STK Push
        // ----------------------------------------------

        const paymentResponse =
          await payForPromotion({
            promotionId:
              promotion.id,

            phoneNumber:
              phoneNumber.trim(),
          });

        const payment =
          paymentResponse?.payment;

        if (!payment?.id) {
          throw new Error(
            "Payment ID was not returned."
          );
        }

        // ----------------------------------------------
        // 3. Show waiting screen
        // ----------------------------------------------

        setPromotionStep("WAITING");
        setPromotionLoading(false);

        // ----------------------------------------------
        // 4. Poll payment status
        // ----------------------------------------------

        const result =
          await pollPromotionPayment({
            paymentId: payment.id,

            interval: 3000,

            maxAttempts: 20,

            onStatusChange: ({
              payment:
                currentPayment,
            }) => {
              console.log(
                "M-PESA PAYMENT STATUS:",
                currentPayment.status
              );
            },
          });

        // ----------------------------------------------
        // 5. Payment completed
        // ----------------------------------------------

        if (result.success) {
          setPromotionResult(result);
          setPromotionStep("SUCCESS");

          // Refresh listing after activation.
          await loadListing();

          return;
        }

        // ----------------------------------------------
        // 6. Polling timeout
        // ----------------------------------------------

        if (result.timeout) {
          setPromotionStep("TIMEOUT");

          return;
        }

        // ----------------------------------------------
        // 7. Failed / cancelled
        // ----------------------------------------------

        setPromotionResult(result);

        setPromotionError(
          result.payment
            ?.resultDescription ||
            "The M-PESA payment was not completed."
        );

        setPromotionStep("FAILED");
      } catch (error) {
        console.error(
          "PROMOTION PAYMENT ERROR:",
          error
        );

        const code =
          error.response?.data?.code;

        if (
          code ===
          "PAYMENT_ALREADY_PENDING"
        ) {
          const retryIn = Number(
            error.response?.data?.retryAfterSeconds || 0
          );

          setRetryAfterSeconds(retryIn);

          setPromotionError(
            retryIn > 0
              ? `The previous M-PESA prompt is still active. You can send another prompt in ${retryIn} second${retryIn === 1 ? "" : "s"}.`
              : "The previous M-PESA prompt is still active. Check your phone or M-PESA messages before trying again."
          );

          setPromotionStep("FAILED");

          return;
        }

        if (
          code ===
          "PROMOTION_ALREADY_ACTIVE"
        ) {
          setPromotionError(
            error.response?.data
              ?.message ||
              "This promotion is already active."
          );

          setPromotionStep("FAILED");

          return;
        }

        const message =
          error.response?.data
            ?.message ||
          error.message ||
          "Unable to process promotion payment.";

        setPromotionError(message);

        setPromotionStep("FAILED");
      } finally {
        setPromotionLoading(false);
      }
    };

  // ======================================================
  // DELETE IMAGE
  // ======================================================

  const handleDeleteImage = async (
    imageId
  ) => {
    const confirmed =
      window.confirm(
        "Are you sure you want to delete this image?"
      );

    if (!confirmed) return;

    try {
      setDeletingImageId(imageId);
      setError("");

      await deleteListingImage(
        id,
        imageId
      );

      setListing(
        (currentListing) => ({
          ...currentListing,

          images:
            currentListing.images.filter(
              (image) =>
                image.id !== imageId
            ),
        })
      );
    } catch (error) {
      console.error(
        "DELETE IMAGE ERROR:",
        error
      );

      setError(
        error.response?.data
          ?.message ||
          "Unable to delete image."
      );
    } finally {
      setDeletingImageId(null);
    }
  };

  // ======================================================
  // IMAGE SELECTION
  // ======================================================

  const handleImageChange = (
    event
  ) => {
    const files = Array.from(
      event.target.files || []
    );

    if (files.length === 0) return;

    const currentImages =
      listing?.images || [];

    const remainingSlots =
      8 - currentImages.length;

    if (remainingSlots <= 0) {
      setError(
        "This listing already has the maximum of 8 images."
      );

      event.target.value = "";

      return;
    }

    if (
      files.length >
      remainingSlots
    ) {
      setError(
        `You can only add ${remainingSlots} more image(s).`
      );

      event.target.value = "";

      return;
    }

    const invalidFile =
      files.find(
        (file) =>
          !file.type.startsWith(
            "image/"
          ) ||
          file.size >
            10 * 1024 * 1024
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

  // ======================================================
  // UPLOAD IMAGES
  // ======================================================

  const handleUploadImages =
    async () => {
      if (
        selectedImages.length === 0
      ) {
        setError(
          "Please select at least one image."
        );

        return;
      }

      try {
        setUploadingImages(true);
        setError("");

        const formData =
          new FormData();

        selectedImages.forEach(
          (image) => {
            formData.append(
              "images",
              image
            );
          }
        );

        const data =
          await addListingImages(
            listing.id,
            formData
          );

        setListing(data.listing);

        setSelectedImages([]);

        const fileInput =
          document.getElementById(
            "listing-images"
          );

        if (fileInput) {
          fileInput.value = "";
        }
      } catch (error) {
        console.error(
          "UPLOAD IMAGES ERROR:",
          error
        );

        setError(
          error.response?.data
            ?.message ||
            "Unable to upload images."
        );
      } finally {
        setUploadingImages(false);
      }
    };

  // ======================================================
  // SET PRIMARY IMAGE
  // ======================================================

  const handleSetPrimary = async (
    imageId
  ) => {
    if (
      !listing?.id ||
      !imageId
    ) {
      return;
    }

    try {
      setSettingPrimaryId(imageId);
      setError("");

      const data =
        await setPrimaryListingImage(
          listing.id,
          imageId
        );

      setListing((prev) => ({
        ...prev,
        images: data.images,
      }));
    } catch (error) {
      console.error(
        "SET PRIMARY IMAGE ERROR:",
        error
      );

      setError(
        error.response?.data
          ?.message ||
          "Failed to set main image. Please try again."
      );
    } finally {
      setSettingPrimaryId(null);
    }
  };

  // ======================================================
  // REORDER IMAGES
  // ======================================================

  const handleMoveImage = async (
    imageId,
    direction
  ) => {
    if (
      !listing?.images?.length
    ) {
      return;
    }

    const currentImages = [
      ...listing.images,
    ];

    const currentIndex =
      currentImages.findIndex(
        (image) =>
          image.id === imageId
      );

    if (currentIndex === -1) {
      return;
    }

    const newIndex =
      direction === "left"
        ? currentIndex - 1
        : currentIndex + 1;

    if (
      newIndex < 0 ||
      newIndex >=
        currentImages.length
    ) {
      return;
    }

    [
      currentImages[currentIndex],
      currentImages[newIndex],
    ] = [
      currentImages[newIndex],
      currentImages[currentIndex],
    ];

    const imageIds =
      currentImages.map(
        (image) => image.id
      );

    try {
      setReorderingImages(true);
      setError("");

      const data =
        await reorderListingImages(
          listing.id,
          imageIds
        );

      setListing((prev) => ({
        ...prev,
        images: data.images,
      }));
    } catch (error) {
      console.error(
        "REORDER IMAGES ERROR:",
        error
      );

      setError(
        error.response?.data
          ?.message ||
          "Failed to reorder images. Please try again."
      );
    } finally {
      setReorderingImages(false);
    }
  };

  // ======================================================
  // LOADING
  // ======================================================

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 px-6 py-20 text-center">
        <p className="text-gray-500">
          Loading listing...
        </p>
      </div>
    );
  }

  // ======================================================
  // LOAD ERROR
  // ======================================================

  if (error && !listing) {
    return (
      <div className="min-h-screen bg-gray-50 px-6 py-20">
        <div className="mx-auto max-w-2xl rounded-2xl border bg-white p-8 text-center">
          <h1 className="text-xl font-bold text-red-600">
            Unable to load listing
          </h1>

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

  const images =
    listing.images || [];

  const remainingSlots =
    8 - images.length;

  // ======================================================
  // UI
  // ======================================================

  return (
    <div className="min-h-screen bg-[#F8F5F3] px-6 py-10">
      <div className="mx-auto max-w-6xl">

        {/* ================================================= */}
        {/* HEADER */}
        {/* ================================================= */}

        <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm font-medium text-[#8A2638]">
              Manage Listing
            </p>

            <h1 className="mt-1 text-3xl font-bold text-[#3D0F18]">
              {listing.title}
            </h1>

            <p className="mt-2 text-gray-600">
              Manage your listing,
              images and promotions.
            </p>
          </div>

          <Link
            to="/my-listings"
            className="rounded-xl border border-[#DCAEB7] bg-white px-5 py-3 text-center font-semibold text-[#3D0F18]"
          >
            ← Back to My Listings
          </Link>
        </div>

        {/* ================================================= */}
        {/* ERROR */}
        {/* ================================================= */}

        {error && (
          <div className="mb-6 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        )}

        {/* ================================================= */}
        {/* LISTING SUMMARY */}
        {/* ================================================= */}

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
                  listing.estimatedValue ||
                    0
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

        {/* ================================================= */}
        {/* PROMOTION SECTION */}
        {/* ================================================= */}

        {listing.status ===
          "ACTIVE" && (
          <section className="mb-8 overflow-hidden rounded-3xl border border-[#E7DDDF] bg-white shadow-sm">
            <div className="border-b border-[#E7DDDF] bg-[#FBF5F6] px-6 py-6 sm:px-8">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="text-xs font-extrabold uppercase tracking-[0.18em] text-[#8A2638]">
                    Promote Listing
                  </p>

                  <h2 className="mt-2 text-2xl font-extrabold text-[#3D0F18]">
                    Reach more traders
                  </h2>

                  <p className="mt-2 max-w-2xl text-sm leading-6 text-gray-600">
                    Put your listing in front of more traders with
                    simple, fixed-price promotion plans.
                  </p>
                </div>

                <Link
                  to="/promotions"
                  className="inline-flex items-center justify-center rounded-xl border border-[#DCAEB7] bg-white px-5 py-3 text-sm font-bold text-[#3D0F18] transition hover:bg-[#F5E8EB]"
                >
                  My Promotions
                </Link>
              </div>
            </div>

            <div className="p-6 sm:p-8">
              <div className="mb-6 grid gap-3 sm:grid-cols-3">
                {[
                  ["1", "Choose a plan", "Pick Boost, Featured or Homepage."],
                  ["2", "Pay with M-PESA", "We'll send a secure STK prompt."],
                  ["3", "Go live", "Promotion activates after payment confirmation."],
                ].map(([number, title, description]) => (
                  <div
                    key={number}
                    className="rounded-2xl border border-[#EFE4E6] bg-[#FCF8F9] p-4"
                  >
                    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[#5B1725] text-xs font-extrabold text-white">
                      {number}
                    </div>
                    <p className="mt-3 text-sm font-bold text-[#3D0F18]">
                      {title}
                    </p>
                    <p className="mt-1 text-xs leading-5 text-gray-500">
                      {description}
                    </p>
                  </div>
                ))}
              </div>

              <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <h3 className="font-bold text-[#3D0F18]">
                    Increase your
                    listing visibility
                  </h3>

                  <p className="mt-1 text-sm text-gray-500">
                    Choose Boost,
                    Featured or Homepage
                    placement and pay
                    securely with M-PESA.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={
                    openPromotionModal
                  }
                  className="rounded-xl bg-[#5B1725] px-6 py-3 font-bold text-white shadow-sm transition hover:bg-[#3D0F18]"
                >
                  Promote Listing
                </button>
              </div>
            </div>
          </section>
        )}

        {/* ================================================= */}
        {/* IMAGE MANAGEMENT */}
        {/* ================================================= */}

        <div className="rounded-2xl border border-[#E7DDDF] bg-white p-6 shadow-sm">

          <div className="mb-6">
            <h2 className="text-xl font-bold text-[#3D0F18]">
              Listing Images
            </h2>

            <p className="mt-1 text-sm text-gray-500">
              Manage the photos
              attached to this listing.
            </p>
          </div>

          {/* ADD IMAGES */}

          <div className="mb-8 rounded-2xl border border-dashed border-[#DCAEB7] bg-[#FBF5F6] p-6">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <h3 className="font-semibold text-[#3D0F18]">
                  Add More Images
                </h3>

                <p className="mt-1 text-sm text-gray-500">
                  You can upload up to{" "}
                  {remainingSlots} more
                  image
                  {remainingSlots === 1
                    ? ""
                    : "s"}
                  . Maximum 10MB per
                  image.
                </p>
              </div>

              <label
                htmlFor="listing-images"
                className={`cursor-pointer rounded-xl border border-[#DCAEB7] bg-white px-5 py-3 text-center text-sm font-semibold text-[#3D0F18] transition hover:bg-[#F5E8EB] ${
                  images.length >= 8 ||
                  uploadingImages
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
                onChange={
                  handleImageChange
                }
                disabled={
                  uploadingImages ||
                  images.length >= 8
                }
                className="hidden"
              />
            </div>

            {selectedImages.length >
              0 && (
              <div className="mt-5">
                <p className="text-sm font-medium text-[#3D0F18]">
                  Selected:{" "}
                  {
                    selectedImages.length
                  }{" "}
                  image
                  {selectedImages.length ===
                  1
                    ? ""
                    : "s"}
                </p>

                <div className="mt-3 flex flex-wrap gap-2">
                  {selectedImages.map(
                    (image) => (
                      <span
                        key={`${image.name}-${image.size}`}
                        className="rounded-lg bg-white px-3 py-2 text-xs text-gray-600 shadow-sm"
                      >
                        {image.name}
                      </span>
                    )
                  )}
                </div>

                <div className="mt-4 flex flex-wrap gap-3">
                  <button
                    type="button"
                    onClick={
                      handleUploadImages
                    }
                    disabled={
                      uploadingImages
                    }
                    className="rounded-xl bg-[#3D0F18] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[#5B1725] disabled:opacity-50"
                  >
                    {uploadingImages
                      ? "Uploading..."
                      : "Upload Images"}
                  </button>

                  <button
                    type="button"
                    disabled={
                      uploadingImages
                    }
                    onClick={() => {
                      setSelectedImages(
                        []
                      );

                      const fileInput =
                        document.getElementById(
                          "listing-images"
                        );

                      if (fileInput) {
                        fileInput.value =
                          "";
                      }
                    }}
                    className="rounded-xl border border-[#DCAEB7] bg-white px-5 py-3 text-sm font-semibold text-[#3D0F18]"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* EXISTING IMAGES */}

          {images.length === 0 ? (
            <div className="rounded-xl border border-dashed border-[#DCAEB7] bg-[#FBF5F6] px-6 py-12 text-center">
              <p className="font-medium text-[#3D0F18]">
                No images available.
              </p>

              <p className="mt-1 text-sm text-gray-500">
                Choose images above
                to add photos to this
                listing.
              </p>
            </div>
          ) : (
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {images.map(
                (image, index) => (
                  <div
                    key={image.id}
                    className="overflow-hidden rounded-2xl border border-[#E7DDDF] bg-white"
                  >
                    <div className="relative">
                      <img
                        src={image.url}
                        alt={`${
                          listing.title
                        } ${index + 1}`}
                        className="h-52 w-full object-cover"
                      />

                      {image.isPrimary && (
                        <span className="absolute left-3 top-3 rounded-full bg-[#3D0F18] px-3 py-1 text-xs font-semibold text-white">
                          Main Image
                        </span>
                      )}
                    </div>

                    <div className="p-4">
                      <p className="mb-3 text-sm text-gray-500">
                        Image{" "}
                        {index + 1}
                      </p>

                      <div className="flex flex-col gap-2">

                        <div className="grid grid-cols-2 gap-2">
                          <button
                            type="button"
                            onClick={() =>
                              handleMoveImage(
                                image.id,
                                "left"
                              )
                            }
                            disabled={
                              index ===
                                0 ||
                              reorderingImages ||
                              deletingImageId ===
                                image.id ||
                              settingPrimaryId ===
                                image.id
                            }
                            className="rounded-lg border border-[#DCAEB7] bg-white px-3 py-2.5 text-sm font-semibold text-[#3D0F18] disabled:opacity-40"
                          >
                            ← Move Left
                          </button>

                          <button
                            type="button"
                            onClick={() =>
                              handleMoveImage(
                                image.id,
                                "right"
                              )
                            }
                            disabled={
                              index ===
                                images.length -
                                  1 ||
                              reorderingImages ||
                              deletingImageId ===
                                image.id ||
                              settingPrimaryId ===
                                image.id
                            }
                            className="rounded-lg border border-[#DCAEB7] bg-white px-3 py-2.5 text-sm font-semibold text-[#3D0F18] disabled:opacity-40"
                          >
                            Move Right →
                          </button>
                        </div>

                        {reorderingImages && (
                          <div className="rounded-lg bg-[#F5E8EB] px-3 py-2 text-center text-xs font-medium text-[#8A2638]">
                            Saving image
                            order...
                          </div>
                        )}

                        {!image.isPrimary && (
                          <button
                            type="button"
                            onClick={() =>
                              handleSetPrimary(
                                image.id
                              )
                            }
                            disabled={
                              settingPrimaryId ===
                                image.id ||
                              deletingImageId ===
                                image.id ||
                              reorderingImages
                            }
                            className="w-full rounded-lg border border-[#DCAEB7] bg-white px-4 py-2.5 text-sm font-semibold text-[#8A2638] disabled:opacity-50"
                          >
                            {settingPrimaryId ===
                            image.id
                              ? "Setting as Main..."
                              : "Set as Main Image"}
                          </button>
                        )}

                        {image.isPrimary && (
                          <div className="w-full rounded-lg bg-[#F5E8EB] px-4 py-2.5 text-center text-sm font-semibold text-[#8A2638]">
                            ✓ Current Main
                            Image
                          </div>
                        )}

                        <button
                          type="button"
                          disabled={
                            deletingImageId ===
                              image.id ||
                            settingPrimaryId ===
                              image.id ||
                            reorderingImages
                          }
                          onClick={() =>
                            handleDeleteImage(
                              image.id
                            )
                          }
                          className="w-full rounded-lg bg-red-50 px-4 py-2.5 text-sm font-semibold text-red-600 transition hover:bg-red-100 disabled:opacity-50"
                        >
                          {deletingImageId ===
                          image.id
                            ? "Deleting..."
                            : "Delete Image"}
                        </button>
                      </div>
                    </div>
                  </div>
                )
              )}
            </div>
          )}
        </div>

        {/* ================================================= */}
        {/* BOTTOM ACTIONS */}
        {/* ================================================= */}

        <div className="mt-8 flex flex-col gap-3 sm:flex-row">
          <Link
            to={`/listings/${listing.id}`}
            className="rounded-xl bg-[#3D0F18] px-5 py-3 text-center font-semibold text-white transition hover:bg-[#5B1725]"
          >
            View Listing
          </Link>

          <button
            type="button"
            onClick={() =>
              navigate(
                "/my-listings"
              )
            }
            className="rounded-xl border border-[#DCAEB7] bg-white px-5 py-3 font-semibold text-[#3D0F18]"
          >
            Done
          </button>
        </div>
      </div>

      {/* =================================================== */}
      {/* PROMOTION MODAL */}
      {/* =================================================== */}

      {promotionModalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/65 p-3 backdrop-blur-[2px] sm:p-4"
          role="dialog"
          aria-modal="true"
        >
          <div className="max-h-[92vh] w-full max-w-xl overflow-y-auto rounded-[28px] border border-white/20 bg-white shadow-2xl">

            {/* HEADER */}

            <div className="sticky top-0 z-10 flex items-start justify-between gap-4 border-b border-[#E7DDDF] bg-[#3D0F18] px-6 py-5 text-white">
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#DCAEB7]">
                  Promote Listing
                </p>

                <h2 className="mt-1 text-xl font-extrabold">
                  {selectedListing
                    ?.title ||
                    "Promotion"}
                </h2>
              </div>

              {promotionStep !==
                "WAITING" && (
                <button
                  type="button"
                  onClick={
                    closePromotionModal
                  }
                  className="flex h-9 w-9 items-center justify-center rounded-full bg-white/10 text-xl transition hover:bg-white/20"
                  aria-label="Close promotion"
                >
                  ×
                </button>
              )}
            </div>

            <div className="p-6 sm:p-8">

              {/* =========================================== */}
              {/* SELECT PLAN */}
              {/* =========================================== */}

              {promotionStep ===
                "SELECT" && (
                <>
                  <h3 className="text-lg font-bold text-[#3D0F18]">
                    Choose a promotion
                  </h3>

                  <p className="mt-1 text-sm text-gray-500">
                    Select how you
                    want to promote
                    this listing.
                  </p>

                  {plansLoading ? (
                    <div className="py-10 text-center text-gray-500">
                      Loading
                      promotion
                      plans...
                    </div>
                  ) : promotionPlans.length ===
                    0 ? (
                    <div className="mt-5 rounded-xl border border-yellow-200 bg-yellow-50 p-4 text-sm text-yellow-800">
                      No promotion
                      plans are
                      currently
                      available.
                    </div>
                  ) : (
                    <div className="mt-5 space-y-3">
                      {promotionPlans.map(
                        (plan) => (
                          <button
                            key={
                              plan.type
                            }
                            type="button"
                            onClick={() =>
                              handleSelectPromotionPlan(
                                plan
                              )
                            }
                            className="w-full rounded-2xl border border-[#E7DDDF] p-4 text-left transition hover:border-[#8A2638] hover:bg-[#FBF5F6]"
                          >
                            <div className="flex items-start justify-between gap-4">
                              <div>
                                <h4 className="font-extrabold text-[#3D0F18]">
                                  {
                                    plan.name
                                  }
                                </h4>

                                <p className="mt-1 text-sm leading-5 text-gray-500">
                                  {
                                    plan.description
                                  }
                                </p>
                              </div>

                              <div className="shrink-0 text-right">
                                <p className="font-extrabold text-[#8A2638]">
                                  {
                                    plan.currency
                                  }{" "}
                                  {Number(
                                    plan.amount ||
                                      0
                                  ).toLocaleString()}
                                </p>

                                <p className="mt-1 text-xs text-gray-500">
                                  {
                                    plan.durationDays
                                  }{" "}
                                  days
                                </p>
                              </div>
                            </div>

                            {Array.isArray(
                              plan.features
                            ) &&
                              plan
                                .features
                                .length >
                                0 && (
                                <div className="mt-4 space-y-1.5">
                                  {plan.features.map(
                                    (
                                      feature
                                    ) => (
                                      <div
                                        key={
                                          feature
                                        }
                                        className="flex items-start gap-2 text-sm text-gray-600"
                                      >
                                        <span className="font-bold text-green-600">
                                          ✓
                                        </span>

                                        <span>
                                          {
                                            feature
                                          }
                                        </span>
                                      </div>
                                    )
                                  )}
                                </div>
                              )}
                          </button>
                        )
                      )}
                    </div>
                  )}

                  {promotionError && (
                    <div className="mt-5 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">
                      {
                        promotionError
                      }
                    </div>
                  )}
                </>
              )}

              {/* =========================================== */}
              {/* PHONE */}
              {/* =========================================== */}

              {promotionStep ===
                "PHONE" &&
                selectedPlan && (
                  <>
                    <button
                      type="button"
                      onClick={() => {
                        setPromotionError(
                          ""
                        );

                        setPromotionStep(
                          "SELECT"
                        );
                      }}
                      className="mb-5 text-sm font-bold text-[#8A2638]"
                    >
                      ← Change plan
                    </button>

                    {continuePaymentHandled && (
                      <div className="mb-5 rounded-2xl border border-amber-200 bg-amber-50 p-4">
                        <div className="flex items-start gap-3">
                          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-white text-lg shadow-sm">
                            ↻
                          </div>
                          <div>
                            <p className="text-sm font-extrabold text-amber-900">
                              Continue pending promotion
                            </p>
                            <p className="mt-1 text-xs leading-5 text-amber-800">
                              Your promotion is already saved. Confirm your M-PESA number below to send a new payment prompt.
                            </p>
                          </div>
                        </div>
                      </div>
                    )}

                    <div className="rounded-2xl border border-[#E7DDDF] bg-[#FBF5F6] p-5">
                      <div className="flex items-start justify-between gap-4">
                        <div>
                          <p className="text-xs font-bold uppercase tracking-wide text-gray-500">
                            Selected
                            Plan
                          </p>

                          <h3 className="mt-1 text-lg font-extrabold text-[#3D0F18]">
                            {
                              selectedPlan.name
                            }
                          </h3>

                          <p className="mt-1 text-sm text-gray-500">
                            {
                              selectedPlan.durationDays
                            }{" "}
                            days
                          </p>
                        </div>

                        <p className="text-lg font-extrabold text-[#8A2638]">
                          {
                            selectedPlan.currency
                          }{" "}
                          {Number(
                            selectedPlan.amount ||
                              0
                          ).toLocaleString()}
                        </p>
                        <p className="mt-1 text-right text-[11px] font-medium text-gray-500">
                          Premium discount, if eligible, is applied securely before M-PESA payment.
                        </p>
                      </div>
                    </div>

                    <div className="mt-6">
                      <label
                        htmlFor="promotion-phone"
                        className="mb-2 block text-sm font-bold text-[#21191B]"
                      >
                        M-PESA phone
                        number
                      </label>

                      <input
                        id="promotion-phone"
                        type="tel"
                        inputMode="numeric"
                        autoComplete="tel"
                        value={
                          phoneNumber
                        }
                        onChange={(
                          event
                        ) => {
                          setPhoneNumber(
                            event
                              .target
                              .value
                          );

                          setPromotionError(
                            ""
                          );
                        }}
                        placeholder="0712345678"
                        className="w-full rounded-xl border border-[#DCAEB7] px-4 py-3.5 text-sm font-medium text-[#3D0F18] outline-none transition focus:border-[#8A2638] focus:ring-2 focus:ring-[#DCAEB7]"
                      />

                      <div className="mt-3 rounded-xl bg-[#F8F5F3] px-4 py-3 text-xs leading-5 text-gray-600">
                        An M-PESA STK
                        Push will be
                        sent to this
                        number. Check
                        the amount
                        before entering
                        your PIN.
                      </div>
                    </div>

                    {promotionError && (
                      <div className="mt-5 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">
                        {
                          promotionError
                        }
                      </div>
                    )}

                    <button
                      type="button"
                      onClick={
                        handlePromotionPayment
                      }
                      disabled={
                        promotionLoading ||
                        !phoneNumber.trim()
                      }
                      className="mt-6 w-full rounded-xl bg-[#5B1725] px-5 py-3.5 font-bold text-white transition hover:bg-[#3D0F18] disabled:cursor-not-allowed disabled:opacity-50"
                    >
                     {promotionLoading
                      ? "Applying benefits & sending STK Push..."
                      : "Continue to M-PESA Payment"}
                    </button>
                  </>
                )}

              {/* =========================================== */}
              {/* WAITING */}
              {/* =========================================== */}

              {promotionStep === "WAITING" && (
                <div className="py-8 text-center">

                  {promotionPricing && (
                    <div className="mx-auto mb-7 max-w-sm rounded-2xl border border-[#E7DDDF] bg-[#FBF5F6] p-5">
                      <p className="text-xs font-bold uppercase tracking-wide text-gray-500">
                        M-PESA Amount
                      </p>

                      {promotionPricing.isPremium &&
                        promotionPricing.discountPercent > 0 && (
                          <div className="mt-3">
                            <p className="text-sm text-gray-400 line-through">
                              {promotionPricing.currency || "KES"}{" "}
                              {Number(
                                promotionPricing.baseAmount || 0
                              ).toLocaleString("en-KE")}
                            </p>

                            <span className="mt-2 inline-flex rounded-full bg-amber-100 px-2.5 py-1 text-[10px] font-black uppercase tracking-wide text-amber-700">
                              Premium -{promotionPricing.discountPercent}%
                            </span>
                          </div>
                        )}

                      <p className="mt-3 text-2xl font-extrabold text-[#8A2638]">
                        {promotionPricing.currency || "KES"}{" "}
                        {Number(
                          promotionPricing.finalAmount || 0
                        ).toLocaleString("en-KE")}
                      </p>

                      {promotionPricing.isPremium &&
                        promotionPricing.discountAmount > 0 && (
                          <p className="mt-2 text-xs font-bold text-green-700">
                            You saved{" "}
                            {promotionPricing.currency || "KES"}{" "}
                            {Number(
                              promotionPricing.discountAmount
                            ).toLocaleString("en-KE")}
                          </p>
                        )}
                    </div>
                  )}

                  <div className="mx-auto h-14 w-14 animate-spin rounded-full border-4 border-[#E7DDDF] border-t-[#8A2638]" />

                  <h3 className="mt-6 text-xl font-extrabold text-[#3D0F18]">
                    Waiting for payment
                  </h3>

                  <p className="mx-auto mt-3 max-w-sm text-sm leading-6 text-gray-500">
                    Check your phone for the M-PESA prompt and enter
                    your PIN to complete the payment.
                  </p>

                  <div className="mt-6 rounded-xl border border-yellow-200 bg-yellow-50 p-4 text-sm leading-6 text-yellow-800">
                    Keep this window open while we check the payment.
                    If M-PESA takes longer than expected, you'll get an
                    option to safely send the prompt again.
                  </div>
                </div>
              )}

              {/* =========================================== */}
              {/* SUCCESS */}
              {/* =========================================== */}

              {promotionStep === "SUCCESS" && (
                <div className="py-6 text-center">
                  <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-green-100 text-3xl font-bold text-green-600">
                    ✓
                  </div>

                  <h3 className="mt-5 text-2xl font-extrabold text-[#3D0F18]">
                    Promotion
                    Activated!
                  </h3>

                  <p className="mt-2 text-sm text-gray-500">
                    Your listing is
                    now being
                    promoted.
                  </p>

                  {promotionPricing && (
                    <div className="mt-6 rounded-xl border border-[#E7DDDF] bg-[#FBF5F6] p-4">
                      <p className="text-xs font-bold uppercase tracking-wide text-gray-500">
                        Amount Paid
                      </p>

                      <p className="mt-1 text-xl font-extrabold text-[#3D0F18]">
                        {promotionPricing.currency || "KES"}{" "}
                        {Number(
                          promotionPricing.finalAmount || 0
                        ).toLocaleString("en-KE")}
                      </p>

                      {promotionPricing.isPremium &&
                        promotionPricing.discountAmount > 0 && (
                          <p className="mt-2 text-xs font-bold text-green-700">
                            Premium saved you{" "}
                            {promotionPricing.currency || "KES"}{" "}
                            {Number(
                              promotionPricing.discountAmount
                            ).toLocaleString("en-KE")}
                          </p>
                        )}
                    </div>
                  )}

                  {promotionResult
                    ?.payment
                    ?.receiptNumber && (
                    <div className="mt-6 rounded-xl border border-[#E7DDDF] bg-[#FBF5F6] p-4">
                      <p className="text-xs font-bold uppercase tracking-wide text-gray-500">
                        M-PESA
                        Receipt
                      </p>

                      <p className="mt-1 font-extrabold text-[#3D0F18]">
                        {
                          promotionResult
                            .payment
                            .receiptNumber
                        }
                      </p>
                    </div>
                  )}

                  {promotionResult
                    ?.promotion
                    ?.endsAt && (
                    <div className="mt-4 rounded-xl bg-green-50 p-4">
                      <p className="text-xs font-semibold text-green-800">
                        Active until
                      </p>

                      <p className="mt-1 font-bold text-green-900">
                        {new Date(
                          promotionResult
                            .promotion
                            .endsAt
                        ).toLocaleString()}
                      </p>
                    </div>
                  )}

                  <button
                    type="button"
                    onClick={
                      closePromotionModal
                    }
                    className="mt-6 w-full rounded-xl bg-[#5B1725] px-5 py-3.5 font-bold text-white transition hover:bg-[#3D0F18]"
                  >
                    Done
                  </button>
                </div>
              )}

              {/* =========================================== */}
              {/* FAILED */}
              {/* =========================================== */}

              {promotionStep ===
                "FAILED" && (
                <div className="py-4">
                  <div className="text-center">
                    <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-red-100 text-2xl font-bold text-red-600">
                      !
                    </div>

                    <h3 className="mt-5 text-xl font-extrabold text-[#3D0F18]">
                      Payment Not Completed
                    </h3>

                    <p className="mx-auto mt-3 max-w-sm text-sm leading-6 text-gray-600">
                      {promotionError ||
                        "The M-PESA payment was not completed."}
                    </p>
                  </div>

                  {retryAfterSeconds > 0 && (
                    <div className="mt-5 rounded-2xl border border-amber-200 bg-amber-50 p-4">
                      <div className="flex items-center justify-between gap-4">
                        <div>
                          <p className="text-sm font-bold text-amber-900">
                            Previous prompt still active
                          </p>
                          <p className="mt-1 text-xs leading-5 text-amber-800">
                            To avoid sending duplicate prompts, please wait a moment.
                          </p>
                        </div>

                        <div className="flex h-12 min-w-12 items-center justify-center rounded-full bg-white px-3 text-sm font-extrabold text-amber-900 shadow-sm">
                          {retryAfterSeconds}s
                        </div>
                      </div>
                    </div>
                  )}

                  <button
                    type="button"
                    onClick={handlePromotionPayment}
                    disabled={
                      promotionLoading ||
                      retryAfterSeconds > 0
                    }
                    className="mt-6 w-full rounded-xl bg-[#5B1725] px-5 py-3.5 font-bold text-white transition hover:bg-[#3D0F18] disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {promotionLoading
                      ? "Sending M-PESA Prompt..."
                      : retryAfterSeconds > 0
                        ? `Send Again in ${retryAfterSeconds}s`
                        : "Send M-PESA Prompt Again"}
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setPromotionError("");
                      setPromotionResult(null);
                      setRetryAfterSeconds(0);
                      setPromotionStep("PHONE");
                    }}
                    disabled={promotionLoading}
                    className="mt-3 w-full rounded-xl border border-[#DCAEB7] bg-white px-5 py-3.5 font-bold text-[#3D0F18] transition hover:bg-[#FBF5F6] disabled:opacity-50"
                  >
                    Change Phone Number
                  </button>

                  <button
                    type="button"
                    onClick={closePromotionModal}
                    disabled={promotionLoading}
                    className="mt-3 w-full px-5 py-2.5 text-sm font-semibold text-gray-500 transition hover:text-[#3D0F18] disabled:opacity-50"
                  >
                    Close
                  </button>
                </div>
              )}

              {/* =========================================== */}
              {/* TIMEOUT */}
              {/* =========================================== */}

              {promotionStep ===
                "TIMEOUT" && (
                <div className="py-4">
                  <div className="text-center">
                    <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-amber-100 text-2xl">
                      ⏱
                    </div>

                    <h3 className="mt-5 text-xl font-extrabold text-[#3D0F18]">
                      Still Waiting for Confirmation
                    </h3>

                    <p className="mx-auto mt-3 max-w-sm text-sm leading-6 text-gray-600">
                      We haven't received a final response from M-PESA yet.
                      This does not automatically mean the payment failed.
                    </p>
                  </div>

                  <div className="mt-5 rounded-2xl border border-amber-200 bg-amber-50 p-4">
                    <p className="text-sm font-bold text-amber-900">
                      Before sending another prompt
                    </p>
                    <p className="mt-1 text-sm leading-6 text-amber-800">
                      Check your M-PESA messages first. If you did not complete
                      the previous prompt, you can safely request another one.
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={handlePromotionPayment}
                    disabled={promotionLoading}
                    className="mt-6 w-full rounded-xl bg-[#5B1725] px-5 py-3.5 font-bold text-white shadow-sm transition hover:bg-[#3D0F18] disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {promotionLoading
                      ? "Sending M-PESA Prompt..."
                      : "Send M-PESA Prompt Again"}
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setPromotionError("");
                      setPromotionResult(null);
                      setRetryAfterSeconds(0);
                      setPromotionStep("PHONE");
                    }}
                    disabled={promotionLoading}
                    className="mt-3 w-full rounded-xl border border-[#DCAEB7] bg-white px-5 py-3.5 font-bold text-[#3D0F18] transition hover:bg-[#FBF5F6] disabled:opacity-50"
                  >
                    Change Phone Number
                  </button>

                  <button
                    type="button"
                    onClick={closePromotionModal}
                    disabled={promotionLoading}
                    className="mt-3 w-full px-5 py-2.5 text-sm font-semibold text-gray-500 transition hover:text-[#3D0F18] disabled:opacity-50"
                  >
                    Close
                  </button>
                </div>
              )}

            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ManageListing;

