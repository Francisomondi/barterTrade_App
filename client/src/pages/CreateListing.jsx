
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

import { getCategories } from "../api/categoryApi";
import { createListing } from "../api/listingApi";

const MAX_IMAGES = 8;
const MAX_IMAGE_SIZE = 10 * 1024 * 1024;

const CreateListing = () => {
  const navigate = useNavigate();

  const [categories, setCategories] = useState([]);

  const [form, setForm] = useState({
    title: "",
    description: "",
    categoryId: "",
    condition: "GOOD",
    estimatedValue: "",
    minimumValue: "",
    maximumValue: "",
    location: "",
  });

  const [images, setImages] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    const loadCategories = async () => {
      try {
        const data = await getCategories();
        setCategories(data.categories || []);
      } catch (error) {
        console.error(error);
        setError("Unable to load categories.");
      }
    };

    loadCategories();
  }, []);

  const handleChange = (e) => {
    setForm({
      ...form,
      [e.target.name]: e.target.value,
    });
  };

  const handleImageChange = (e) => {
    const selectedFiles = Array.from(e.target.files || []);

    if (selectedFiles.length === 0) return;

    setError("");

    if (images.length + selectedFiles.length > MAX_IMAGES) {
      setError(`You can upload a maximum of ${MAX_IMAGES} images.`);
      e.target.value = "";
      return;
    }

    const invalidFile = selectedFiles.find(
      (file) => !file.type.startsWith("image/")
    );

    if (invalidFile) {
      setError("Only image files are allowed.");
      e.target.value = "";
      return;
    }

    const oversizedFile = selectedFiles.find(
      (file) => file.size > MAX_IMAGE_SIZE
    );

    if (oversizedFile) {
      setError("Each image must be smaller than 10 MB.");
      e.target.value = "";
      return;
    }

    setImages((previousImages) => [
      ...previousImages,
      ...selectedFiles,
    ]);

    e.target.value = "";
  };

  const removeImage = (index) => {
    setImages((previousImages) =>
      previousImages.filter((_, imageIndex) => imageIndex !== index)
    );
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    setError("");

    if (!form.categoryId) {
      setError("Please select a category.");
      return;
    }

    if (!form.title.trim()) {
      setError("Please enter an item title.");
      return;
    }

    if (!form.description.trim()) {
      setError("Please enter an item description.");
      return;
    }

    if (Number(form.estimatedValue) <= 0) {
      setError("Estimated value must be greater than zero.");
      return;
    }

    if (
      form.minimumValue &&
      form.maximumValue &&
      Number(form.minimumValue) > Number(form.maximumValue)
    ) {
      setError("Minimum value cannot exceed maximum value.");
      return;
    }

    try {
      setLoading(true);

      const formData = new FormData();

      formData.append("title", form.title);
      formData.append("description", form.description);
      formData.append("categoryId", form.categoryId);
      formData.append("condition", form.condition);
      formData.append("estimatedValue", form.estimatedValue);

      if (form.minimumValue) {
        formData.append("minimumValue", form.minimumValue);
      }

      if (form.maximumValue) {
        formData.append("maximumValue", form.maximumValue);
      }

      if (form.location) {
        formData.append("location", form.location);
      }

      images.forEach((image) => {
        formData.append("images", image);
      });

      const data = await createListing(formData);

      navigate(`/listings/${data.listing.id}`);
    } catch (error) {
      console.error("CREATE LISTING ERROR:", error);

      setError(
        error.response?.data?.message || "Unable to create listing."
      );
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#F8F5F3] px-4 py-6 sm:px-6">
        <div className="mx-auto max-w-6xl">
          <div className="animate-pulse">
            <div className="mx-auto h-12 w-12 rounded-xl bg-[#E7DDDF]" />

            <div className="mx-auto mt-4 h-7 w-56 rounded bg-[#E7DDDF]" />

            <div className="mx-auto mt-2 h-4 w-72 rounded bg-[#E7DDDF]" />

            <div className="mt-7 grid gap-5 lg:grid-cols-2">
              {[1, 2, 3, 4].map((item) => (
                <div
                  key={item}
                  className="overflow-hidden rounded-2xl border border-[#E7DDDF] bg-white"
                >
                  <div className="h-4 bg-[#E7DDDF]" />

                  <div className="space-y-3 p-5">
                    <div className="h-4 w-32 rounded bg-[#E7DDDF]" />
                    <div className="h-10 w-full rounded bg-[#E7DDDF]" />
                    <div className="h-10 w-full rounded bg-[#E7DDDF]" />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F8F5F3] px-4 py-5 sm:px-6 lg:py-7">
      <div className="mx-auto max-w-6xl">

        {/* =====================================================
            HEADER + LOGO
        ====================================================== */}
        <div className="mb-6 text-center">

          <div className="mx-auto flex h-14 w-14 items-center justify-center overflow-hidden rounded-2xl border border-[#E7DDDF] bg-white shadow-md">
            <img
              src="/images/logo4.png"
              alt="BarterConnect"
              className="h-full w-full object-contain p-1.5"
            />
          </div>

          <p className="mt-3 text-[11px] font-extrabold uppercase tracking-[0.25em] text-[#A47C19]">
            BarterConnect
          </p>

          <h1 className="mt-1 text-2xl font-black tracking-tight text-[#3D0F18] sm:text-3xl">
            List an item for barter
          </h1>

          <p className="mx-auto mt-1.5 max-w-xl text-sm leading-5 text-gray-500">
            Add the details below so people can understand what you have
            and find a fair trade.
          </p>
        </div>

        {/* =====================================================
            ERROR
        ====================================================== */}
        {error && (
          <div className="mb-5 flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 shadow-sm">
            <span className="mt-0.5 text-base">⚠</span>
            <p>{error}</p>
          </div>
        )}

        <form onSubmit={handleSubmit}>

          {/* ===================================================
              MAIN FORM GRID
          ==================================================== */}
          <div className="grid gap-5 lg:grid-cols-2">

            {/* =================================================
                ITEM INFORMATION
            ================================================== */}
            <section className="rounded-2xl border border-[#E7DDDF] bg-white p-5 shadow-sm sm:p-6">
              <div className="mb-5 flex items-center gap-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#F5E8EB] text-[#5B1725]">
                  ✦
                </div>

                <div>
                  <h2 className="text-base font-extrabold text-[#3D0F18]">
                    Item information
                  </h2>

                  <p className="text-xs text-gray-500">
                    Describe what you are offering.
                  </p>
                </div>
              </div>

              <div className="space-y-4">

                {/* TITLE */}
                <div>
                  <label
                    htmlFor="title"
                    className="mb-1.5 block text-xs font-bold text-[#21191B]"
                  >
                    Item title
                  </label>

                  <input
                    id="title"
                    name="title"
                    value={form.title}
                    onChange={handleChange}
                    placeholder="e.g. iPhone 14 Pro 256GB"
                    required
                    className="w-full rounded-xl border border-[#E7DDDF] bg-[#FBF8F8] px-4 py-3 text-sm text-[#21191B] outline-none transition placeholder:text-gray-400 focus:border-[#8A2638] focus:bg-white focus:ring-4 focus:ring-[#8A2638]/10"
                  />
                </div>

                {/* CATEGORY + CONDITION */}
                <div className="grid gap-4 sm:grid-cols-2">

                  <div>
                    <label
                      htmlFor="categoryId"
                      className="mb-1.5 block text-xs font-bold text-[#21191B]"
                    >
                      Category
                    </label>

                    <select
                      id="categoryId"
                      name="categoryId"
                      value={form.categoryId}
                      onChange={handleChange}
                      required
                      className="w-full rounded-xl border border-[#E7DDDF] bg-[#FBF8F8] px-4 py-3 text-sm text-[#21191B] outline-none transition focus:border-[#8A2638] focus:bg-white focus:ring-4 focus:ring-[#8A2638]/10"
                    >
                      <option value="">Select category</option>

                      {categories.map((category) => (
                        <option key={category.id} value={category.id}>
                          {category.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label
                      htmlFor="condition"
                      className="mb-1.5 block text-xs font-bold text-[#21191B]"
                    >
                      Condition
                    </label>

                    <select
                      id="condition"
                      name="condition"
                      value={form.condition}
                      onChange={handleChange}
                      className="w-full rounded-xl border border-[#E7DDDF] bg-[#FBF8F8] px-4 py-3 text-sm text-[#21191B] outline-none transition focus:border-[#8A2638] focus:bg-white focus:ring-4 focus:ring-[#8A2638]/10"
                    >
                      <option value="NEW">New</option>
                      <option value="LIKE_NEW">Like New</option>
                      <option value="GOOD">Good</option>
                      <option value="FAIR">Fair</option>
                      <option value="POOR">Poor</option>
                    </select>
                  </div>
                </div>

                {/* DESCRIPTION */}
                <div>
                  <div className="mb-1.5 flex items-center justify-between">
                    <label
                      htmlFor="description"
                      className="block text-xs font-bold text-[#21191B]"
                    >
                      Description
                    </label>

                    <span className="text-[11px] text-gray-400">
                      Be clear & specific
                    </span>
                  </div>

                  <textarea
                    id="description"
                    name="description"
                    value={form.description}
                    onChange={handleChange}
                    placeholder="Describe the item's age, features, condition and anything a trader should know..."
                    rows={4}
                    required
                    className="w-full resize-none rounded-xl border border-[#E7DDDF] bg-[#FBF8F8] px-4 py-3 text-sm leading-5 text-[#21191B] outline-none transition placeholder:text-gray-400 focus:border-[#8A2638] focus:bg-white focus:ring-4 focus:ring-[#8A2638]/10"
                  />
                </div>
              </div>
            </section>

            {/* =================================================
                BARTER VALUE
            ================================================== */}
            <section className="rounded-2xl border border-[#E7DDDF] bg-white p-5 shadow-sm sm:p-6">
              <div className="mb-5 flex items-center gap-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#F8F0D8] text-[#A47C19]">
                  KES
                </div>

                <div>
                  <h2 className="text-base font-extrabold text-[#3D0F18]">
                    Barter value
                  </h2>

                  <p className="text-xs text-gray-500">
                    Help traders find items of similar value.
                  </p>
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-3 lg:grid-cols-1 xl:grid-cols-3">

                {/* ESTIMATED */}
                <div>
                  <label
                    htmlFor="estimatedValue"
                    className="mb-1.5 block text-xs font-bold text-[#21191B]"
                  >
                    Estimated value
                  </label>

                  <div className="relative">
                    <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-xs font-bold text-[#A47C19]">
                      KES
                    </span>

                    <input
                      id="estimatedValue"
                      name="estimatedValue"
                      type="number"
                      min="1"
                      value={form.estimatedValue}
                      onChange={handleChange}
                      placeholder="85000"
                      required
                      className="w-full rounded-xl border border-[#E7DDDF] bg-[#FBF8F8] py-3 pl-12 pr-3 text-sm text-[#21191B] outline-none transition focus:border-[#8A2638] focus:bg-white focus:ring-4 focus:ring-[#8A2638]/10"
                    />
                  </div>
                </div>

                {/* MINIMUM */}
                <div>
                  <label
                    htmlFor="minimumValue"
                    className="mb-1.5 block text-xs font-bold text-[#21191B]"
                  >
                    Minimum value
                  </label>

                  <div className="relative">
                    <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-xs font-bold text-gray-400">
                      KES
                    </span>

                    <input
                      id="minimumValue"
                      name="minimumValue"
                      type="number"
                      min="0"
                      value={form.minimumValue}
                      onChange={handleChange}
                      placeholder="75000"
                      className="w-full rounded-xl border border-[#E7DDDF] bg-[#FBF8F8] py-3 pl-12 pr-3 text-sm text-[#21191B] outline-none transition focus:border-[#8A2638] focus:bg-white focus:ring-4 focus:ring-[#8A2638]/10"
                    />
                  </div>
                </div>

                {/* MAXIMUM */}
                <div>
                  <label
                    htmlFor="maximumValue"
                    className="mb-1.5 block text-xs font-bold text-[#21191B]"
                  >
                    Maximum value
                  </label>

                  <div className="relative">
                    <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-xs font-bold text-gray-400">
                      KES
                    </span>

                    <input
                      id="maximumValue"
                      name="maximumValue"
                      type="number"
                      min="0"
                      value={form.maximumValue}
                      onChange={handleChange}
                      placeholder="95000"
                      className="w-full rounded-xl border border-[#E7DDDF] bg-[#FBF8F8] py-3 pl-12 pr-3 text-sm text-[#21191B] outline-none transition focus:border-[#8A2638] focus:bg-white focus:ring-4 focus:ring-[#8A2638]/10"
                    />
                  </div>
                </div>
              </div>

              <div className="mt-5 rounded-xl border border-[#E8D9A8] bg-[#FFF9E8] px-4 py-3">
                <p className="text-xs leading-5 text-[#765A13]">
                  <span className="font-bold">Tip:</span> A realistic value
                  range makes it easier to find fair barter matches.
                </p>
              </div>
            </section>

            {/* =================================================
                LOCATION
            ================================================== */}
            <section className="rounded-2xl border border-[#E7DDDF] bg-white p-5 shadow-sm sm:p-6">
              <div className="mb-5 flex items-center gap-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#F5E8EB] text-lg text-[#5B1725]">
                  ⌖
                </div>

                <div>
                  <h2 className="text-base font-extrabold text-[#3D0F18]">
                    Location
                  </h2>

                  <p className="text-xs text-gray-500">
                    Let nearby traders know where the item is.
                  </p>
                </div>
              </div>

              <label
                htmlFor="location"
                className="mb-1.5 block text-xs font-bold text-[#21191B]"
              >
                Location
              </label>

              <input
                id="location"
                name="location"
                value={form.location}
                onChange={handleChange}
                placeholder="e.g. Nairobi, Westlands"
                className="w-full rounded-xl border border-[#E7DDDF] bg-[#FBF8F8] px-4 py-3 text-sm text-[#21191B] outline-none transition placeholder:text-gray-400 focus:border-[#8A2638] focus:bg-white focus:ring-4 focus:ring-[#8A2638]/10"
              />
            </section>

            {/* =================================================
                IMAGES
            ================================================== */}
            <section className="rounded-2xl border border-[#E7DDDF] bg-white p-5 shadow-sm sm:p-6">
              <div className="mb-4 flex items-center justify-between gap-3">

                <div className="flex items-center gap-3">
                  <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#F8F0D8] text-lg">
                    📷
                  </div>

                  <div>
                    <h2 className="text-base font-extrabold text-[#3D0F18]">
                      Item images
                    </h2>

                    <p className="text-xs text-gray-500">
                      Add clear photos of your item.
                    </p>
                  </div>
                </div>

                <span className="shrink-0 rounded-full bg-[#F5E8EB] px-3 py-1 text-xs font-extrabold text-[#5B1725]">
                  {images.length}/{MAX_IMAGES}
                </span>
              </div>

              <label
                htmlFor="images"
                className={`flex cursor-pointer items-center justify-center gap-4 rounded-xl border-2 border-dashed px-4 py-5 text-center transition ${
                  images.length >= MAX_IMAGES
                    ? "cursor-not-allowed border-gray-200 bg-gray-50 opacity-60"
                    : "border-[#DCAEB7] bg-[#FBF5F6] hover:border-[#8A2638] hover:bg-[#F5E8EB]"
                }`}
              >
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white text-xl shadow-sm">
                  📷
                </div>

                <div className="text-left">
                  <p className="text-sm font-bold text-[#3D0F18]">
                    {images.length >= MAX_IMAGES
                      ? "Maximum images reached"
                      : "Add item photos"}
                  </p>

                  <p className="mt-0.5 text-[11px] text-gray-500">
                    PNG, JPG, JPEG or WEBP • Up to 10 MB each
                  </p>
                </div>
              </label>

              <input
                id="images"
                type="file"
                accept="image/*"
                multiple
                onChange={handleImageChange}
                disabled={images.length >= MAX_IMAGES}
                className="hidden"
              />

              {images.length > 0 ? (
                <div className="mt-4 grid grid-cols-4 gap-2">
                  {images.map((image, index) => (
                    <div
                      key={`${image.name}-${index}`}
                      className="group relative aspect-square overflow-hidden rounded-xl border border-[#E7DDDF] bg-gray-100"
                    >
                      <img
                        src={URL.createObjectURL(image)}
                        alt={`Listing image ${index + 1}`}
                        className="h-full w-full object-cover"
                      />

                      {index === 0 && (
                        <span className="absolute left-1.5 top-1.5 rounded-full bg-[#5B1725] px-2 py-1 text-[9px] font-bold text-white shadow">
                          Main
                        </span>
                      )}

                      <button
                        type="button"
                        onClick={() => removeImage(index)}
                        className="absolute right-1.5 top-1.5 rounded-full bg-black/70 px-2 py-1 text-[9px] font-bold text-white opacity-0 shadow transition group-hover:opacity-100 hover:bg-[#8A2638]"
                      >
                        Remove
                      </button>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="mt-3 text-center text-[11px] text-gray-400">
                  No images selected yet.
                </p>
              )}
            </section>
          </div>

          {/* ===================================================
              SUBMIT BAR
          ==================================================== */}
          <div className="mt-5 rounded-2xl border border-[#E7DDDF] bg-white p-4 shadow-sm sm:flex sm:items-center sm:justify-between sm:gap-5">

            <div className="mb-3 sm:mb-0">
              <p className="text-sm font-bold text-[#3D0F18]">
                Ready to list your item?
              </p>

              <p className="mt-0.5 text-xs text-gray-500">
                Review your details before publishing.
              </p>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-xl bg-[#5B1725] px-6 py-3.5 text-sm font-extrabold text-white shadow-lg shadow-[#5B1725]/20 transition duration-200 hover:bg-[#3D0F18] hover:shadow-xl disabled:cursor-not-allowed disabled:opacity-50 sm:w-auto sm:min-w-[230px]"
            >
              {loading ? (
                <span className="flex items-center justify-center gap-3">
                  <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                  Creating listing...
                </span>
              ) : (
                "Publish item for barter"
              )}
            </button>
          </div>

        </form>
      </div>
    </div>
  );
};

export default CreateListing;

