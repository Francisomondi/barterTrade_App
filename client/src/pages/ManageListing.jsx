
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
    5 - images.length;

  // ======================================================
  // UI
  // ======================================================

  const primaryImage =
    images.find((image) => image.isPrimary) || images[0] || null;

  return (
    <div className="min-h-screen bg-[#F8F5F3] px-4 py-5 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-6xl">
        <div className="flex items-center justify-between gap-3">
          <Link to="/my-listings" className="text-sm font-semibold text-[#5B1725] hover:text-[#3D0F18]">
            ← My Listings
          </Link>
          <Link to={`/listings/${listing.id}`} className="rounded-lg border border-[#DCCFD2] bg-white px-4 py-2 text-sm font-semibold text-[#5B1725] transition hover:bg-[#F5E8EB]">
            Preview Listing
          </Link>
        </div>

        <header className="mt-6 flex flex-col gap-3 border-b border-[#E7DDDF] pb-5 sm:flex-row sm:items-end sm:justify-between">
          <div className="min-w-0">
            <p className="text-xs font-bold uppercase tracking-[0.16em] text-[#8A2638]">Manage Listing</p>
            <h1 className="mt-1 text-2xl font-black tracking-tight text-[#21191B] sm:text-3xl">{listing.title}</h1>
            <p className="mt-1 text-sm text-gray-500">Manage your photos, listing visibility and promotions.</p>
          </div>
          <span className={`inline-flex w-fit items-center gap-2 rounded-full px-3 py-1.5 text-xs font-bold ${listing.status === "ACTIVE" ? "bg-green-50 text-green-700" : "bg-gray-100 text-gray-600"}`}>
            <span className={`h-2 w-2 rounded-full ${listing.status === "ACTIVE" ? "bg-green-500" : "bg-gray-400"}`} />
            {listing.status}
          </span>
        </header>

        {error && (
          <div className="mt-5 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">{error}</div>
        )}

        <div className="mt-6 grid gap-6 lg:grid-cols-[minmax(0,1.55fr)_minmax(290px,0.75fr)] lg:items-start">
          <main className="min-w-0">
            <section className="rounded-2xl border border-[#E7DDDF] bg-white p-4 shadow-[0_6px_24px_rgba(61,15,24,0.05)] sm:p-5">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h2 className="text-lg font-black text-[#21191B]">Listing Photos</h2>
                  <p className="mt-1 text-sm text-gray-500">Your main image appears first across BarterConnekt.</p>
                </div>
                <span className="shrink-0 rounded-full bg-[#F5E8EB] px-3 py-1 text-xs font-bold text-[#5B1725]">{images.length} / 8</span>
              </div>

              {primaryImage ? (
                <div className="relative mt-4 overflow-hidden rounded-xl bg-[#F1ECEE]">
                  <img src={primaryImage.url} alt={`${listing.title} main`} className="aspect-[16/9] w-full object-cover" />
                  <span className="absolute left-3 top-3 rounded-lg bg-[#3D0F18]/95 px-3 py-1.5 text-xs font-bold text-white shadow">Main Image</span>
                </div>
              ) : (
                <div className="mt-4 flex aspect-[16/9] items-center justify-center rounded-xl border border-dashed border-[#DCAEB7] bg-[#FBF5F6] text-sm text-gray-500">No listing image yet</div>
              )}

              {images.length > 1 && (
                <div className="mt-3 grid grid-cols-4 gap-2 sm:grid-cols-6">
                  {images.map((image, index) => (
                    <div key={image.id} className={`relative overflow-hidden rounded-lg ${image.isPrimary ? "ring-2 ring-[#5B1725] ring-offset-1" : "border border-[#E7DDDF]"}`}>
                      <img src={image.url} alt={`${listing.title} ${index + 1}`} className="aspect-square w-full object-cover" />
                    </div>
                  ))}
                </div>
              )}

              <div className="mt-5 rounded-xl border border-dashed border-[#DCAEB7] bg-[#FBF5F6] p-4">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <h3 className="text-sm font-bold text-[#3D0F18]">Add more photos</h3>
                    <p className="mt-1 text-xs leading-5 text-gray-500">{remainingSlots > 0 ? `${remainingSlots} slot${remainingSlots === 1 ? "" : "s"} remaining · JPG, PNG or WEBP · Maximum 10MB each` : "Maximum of 8 images reached"}</p>
                  </div>
                  <label htmlFor="listing-images" className={`inline-flex cursor-pointer items-center justify-center rounded-lg bg-[#5B1725] px-4 py-2.5 text-sm font-bold text-white transition hover:bg-[#3D0F18] ${images.length >= 8 || uploadingImages ? "pointer-events-none opacity-50" : ""}`}>
                    + Choose Photos
                  </label>
                  <input id="listing-images" type="file" accept="image/*" multiple onChange={handleImageChange} disabled={uploadingImages || images.length >= 8} className="hidden" />
                </div>

                {selectedImages.length > 0 && (
                  <div className="mt-4 border-t border-[#E7DDDF] pt-4">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <p className="text-sm font-semibold text-[#3D0F18]">{selectedImages.length} image{selectedImages.length === 1 ? "" : "s"} selected</p>
                      <button type="button" disabled={uploadingImages} onClick={() => { setSelectedImages([]); const fileInput = document.getElementById("listing-images"); if (fileInput) fileInput.value = ""; }} className="text-sm font-semibold text-gray-500 hover:text-[#5B1725] disabled:opacity-50">Clear</button>
                    </div>
                    <div className="mt-2 flex flex-wrap gap-2">
                      {selectedImages.map((image) => (
                        <span key={`${image.name}-${image.size}`} className="max-w-56 truncate rounded-lg bg-white px-3 py-1.5 text-xs text-gray-600 ring-1 ring-[#E7DDDF]">{image.name}</span>
                      ))}
                    </div>
                    <button type="button" onClick={handleUploadImages} disabled={uploadingImages} className="mt-4 rounded-lg bg-[#3D0F18] px-4 py-2.5 text-sm font-bold text-white transition hover:bg-[#5B1725] disabled:opacity-50">
                      {uploadingImages ? "Uploading..." : `Upload ${selectedImages.length} Photo${selectedImages.length === 1 ? "" : "s"}`}
                    </button>
                  </div>
                )}
              </div>
            </section>

            <section className="mt-6">
              <div className="mb-3 flex items-end justify-between gap-3">
                <div>
                  <h2 className="text-lg font-black text-[#21191B]">Manage Images</h2>
                  <p className="mt-1 text-sm text-gray-500">Reorder photos, change the main image or remove images.</p>
                </div>
                {reorderingImages && <span className="text-xs font-semibold text-[#8A2638]">Saving order...</span>}
              </div>

              {images.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-[#DCAEB7] bg-white px-6 py-10 text-center text-sm text-gray-500">Add your first photo using the uploader above.</div>
              ) : (
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                  {images.map((image, index) => (
                    <article key={image.id} className={`overflow-hidden rounded-xl bg-white shadow-[0_3px_14px_rgba(61,15,24,0.04)] ${image.isPrimary ? "ring-2 ring-[#5B1725]" : "border border-[#E7DDDF]"}`}>
                      <div className="relative overflow-hidden bg-[#F1ECEE]">
                        <img src={image.url} alt={`${listing.title} ${index + 1}`} className="aspect-[4/3] w-full object-cover" />
                        <span className="absolute bottom-2 left-2 rounded-md bg-black/60 px-2 py-1 text-xs font-semibold text-white">{index + 1}</span>
                        {image.isPrimary && <span className="absolute left-2 top-2 rounded-md bg-[#3D0F18] px-2.5 py-1 text-xs font-bold text-white">Main</span>}
                      </div>
                      <div className="p-3">
                        <div className="grid grid-cols-2 gap-2">
                          <button type="button" onClick={() => handleMoveImage(image.id, "left")} disabled={index === 0 || reorderingImages || deletingImageId === image.id || settingPrimaryId === image.id} className="rounded-lg border border-[#E3D6D8] px-3 py-2 text-sm font-semibold text-[#5B1725] transition hover:bg-[#F9F3F4] disabled:cursor-not-allowed disabled:opacity-30">←</button>
                          <button type="button" onClick={() => handleMoveImage(image.id, "right")} disabled={index === images.length - 1 || reorderingImages || deletingImageId === image.id || settingPrimaryId === image.id} className="rounded-lg border border-[#E3D6D8] px-3 py-2 text-sm font-semibold text-[#5B1725] transition hover:bg-[#F9F3F4] disabled:cursor-not-allowed disabled:opacity-30">→</button>
                        </div>
                        {!image.isPrimary ? (
                          <button type="button" onClick={() => handleSetPrimary(image.id)} disabled={settingPrimaryId === image.id || deletingImageId === image.id || reorderingImages} className="mt-2 w-full rounded-lg bg-[#F5E8EB] px-3 py-2 text-sm font-bold text-[#5B1725] transition hover:bg-[#EEDDE1] disabled:opacity-40">{settingPrimaryId === image.id ? "Setting..." : "Set as main"}</button>
                        ) : (
                          <div className="mt-2 rounded-lg bg-[#F5E8EB] px-3 py-2 text-center text-sm font-bold text-[#5B1725]">✓ Current main</div>
                        )}
                        <button type="button" disabled={deletingImageId === image.id || settingPrimaryId === image.id || reorderingImages} onClick={() => handleDeleteImage(image.id)} className="mt-1.5 w-full rounded-lg px-3 py-2 text-sm font-semibold text-red-500 transition hover:bg-red-50 hover:text-red-600 disabled:opacity-40">{deletingImageId === image.id ? "Deleting..." : "Delete"}</button>
                      </div>
                    </article>
                  ))}
                </div>
              )}
            </section>
          </main>

          <aside className="space-y-4 lg:sticky lg:top-5">
            <section className="rounded-2xl border border-[#E7DDDF] bg-white p-5 shadow-[0_6px_24px_rgba(61,15,24,0.05)]">
              <p className="text-xs font-bold uppercase tracking-[0.14em] text-[#8A2638]">
                Listing Overview
              </p>
              <div className="mt-4">
                <p className="text-sm text-gray-500">Estimated value</p>
                <p className="mt-1 text-2xl font-black text-[#5B1725]">KES {Number(listing.estimatedValue || 0).toLocaleString("en-KE")}</p>
              </div>
              <div className="mt-5 grid grid-cols-2 gap-3 border-y border-[#EEE4E6] py-4">
                <div>
                  <p className="text-xs text-gray-500">Status</p>
                  <p className="mt-1 text-sm font-bold text-[#21191B]">{listing.status}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500">Photos</p>
                  <p className="mt-1 text-sm font-bold text-[#21191B]">{images.length} / 5</p>
                </div>
              </div>
              <Link to={`/listings/${listing.id}`} className="mt-4 flex w-full items-center justify-center rounded-lg border border-[#DCCFD2] px-4 py-2.5 text-sm font-bold text-[#5B1725] transition hover:bg-[#F9F3F4]">View public listing</Link>
            </section>

            {listing.status === "ACTIVE" && (
              <section className="overflow-hidden rounded-2xl bg-[#3D0F18] text-white shadow-[0_8px_28px_rgba(61,15,24,0.16)]">
                <div className="p-5">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/10 text-xl font-black">↑</div>
                  <p className="mt-4 text-xs font-bold uppercase tracking-[0.14em] text-[#D6B15E]">Promote Listing</p>
                  <h2 className="mt-1 text-xl font-black">Reach more traders</h2>
                  <p className="mt-2 text-sm leading-6 text-white/70">Give this listing extra visibility with Boost, Featured or Homepage placement.</p>
                  <button type="button" onClick={openPromotionModal} className="mt-5 w-full rounded-lg bg-white px-4 py-3 text-sm font-black text-[#3D0F18] transition hover:bg-[#F8F5F3]">Promote Listing</button>
                  <Link to="/promotions" className="mt-3 block text-center text-sm font-semibold text-white/75 hover:text-white">My Promotions →</Link>
                </div>
              </section>
            )}
          </aside>
        </div>

        <div className="mt-7 flex items-center justify-between border-t border-[#E7DDDF] pt-5">
          <button type="button" onClick={() => navigate("/my-listings")} className="text-sm font-semibold text-gray-500 transition hover:text-[#5B1725]">← Back to My Listings</button>
          <Link to={`/listings/${listing.id}`} className="rounded-lg bg-[#5B1725] px-5 py-2.5 text-sm font-bold text-white transition hover:bg-[#3D0F18]">Preview Listing →</Link>
        </div>
      </div>

      {/* =================================================== */}
      {/* PROMOTION MODAL */}
      {/* =================================================== */}

      {promotionModalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/65 p-3 backdrop-blur-[2px] sm:p-2.5"
          role="dialog"
          aria-modal="true"
        >
          <div className="max-h-[92vh] w-full max-w-xl overflow-y-auto rounded-[28px] border border-white/20 bg-white shadow-2xl">

            {/* HEADER */}

            <div className="sticky top-0 z-10 flex items-start justify-between gap-2.5 border-b border-[#E7DDDF] bg-[#3D0F18] px-6 py-5 text-white">
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

            <div className="p-2.5 sm:p-5">

              {/* =========================================== */}
              {/* SELECT PLAN */}
              {/* =========================================== */}

              {promotionStep ===
                "SELECT" && (
                <>
                  <h3 className="text-lg font-bold text-[#3D0F18]">
                    Choose a promotion
                  </h3>

                  <p className="mt-1 text-[8px] font-black uppercase tracking-wide text-gray-400">
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
                    <div className="mt-5 rounded-xl border border-yellow-200 bg-yellow-50 p-2.5 text-sm text-yellow-800">
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
                            className="w-full rounded-2xl border border-[#E7DDDF] p-2.5 text-left transition hover:border-[#8A2638] hover:bg-[#FBF5F6]"
                          >
                            <div className="flex items-start justify-between gap-2.5">
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
                      <div className="mb-5 rounded-2xl border border-amber-200 bg-amber-50 p-2.5">
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
                      <div className="flex items-start justify-between gap-2.5">
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

                          <p className="mt-1 text-[8px] font-black uppercase tracking-wide text-gray-400">
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

                  <div className="mt-6 rounded-xl border border-yellow-200 bg-yellow-50 p-2.5 text-sm leading-6 text-yellow-800">
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

                  <h3 className="mt-5 text-lg font-black text-[#21191B]">
                    Promotion
                    Activated!
                  </h3>

                  <p className="mt-2 text-[8px] font-black uppercase tracking-wide text-gray-400">
                    Your listing is
                    now being
                    promoted.
                  </p>

                  {promotionPricing && (
                    <div className="mt-6 rounded-xl border border-[#E7DDDF] bg-[#FBF5F6] p-2.5">
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
                    <div className="mt-6 rounded-xl border border-[#E7DDDF] bg-[#FBF5F6] p-2.5">
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
                    <div className="mt-4 rounded-xl bg-green-50 p-2.5">
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
                    <div className="mt-5 rounded-2xl border border-amber-200 bg-amber-50 p-2.5">
                      <div className="flex items-center justify-between gap-2.5">
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

                  <div className="mt-5 rounded-2xl border border-amber-200 bg-amber-50 p-2.5">
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

