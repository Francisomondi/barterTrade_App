import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

import {
  getCategories,
} from "../api/categoryApi";

import {
  createListing,
} from "../api/listingApi";

const CreateListing = () => {
  const navigate = useNavigate();

  const [categories, setCategories] =
    useState([]);

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

  const [imageUrl, setImageUrl] =
    useState("");

  const [images, setImages] =
    useState([]);

  const [loading, setLoading] =
    useState(false);

  const [error, setError] =
    useState("");

  useEffect(() => {
    const loadCategories = async () => {
      try {
        const data = await getCategories();

        setCategories(data.categories || []);
      } catch (error) {
        console.error(error);
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

  const addImage = () => {
    const url = imageUrl.trim();

    if (!url) return;

    setImages([
      ...images,
      {
        url,
      },
    ]);

    setImageUrl("");
  };

  const removeImage = (index) => {
    setImages(
      images.filter(
        (_, imageIndex) =>
          imageIndex !== index
      )
    );
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    setError("");

    if (!form.categoryId) {
      setError("Please select a category.");
      return;
    }

    if (
      Number(form.estimatedValue) <= 0
    ) {
      setError(
        "Estimated value must be greater than zero."
      );
      return;
    }

    if (
      form.minimumValue &&
      form.maximumValue &&
      Number(form.minimumValue) >
        Number(form.maximumValue)
    ) {
      setError(
        "Minimum value cannot exceed maximum value."
      );
      return;
    }

    try {
      setLoading(true);

      const data = await createListing({
        ...form,

        estimatedValue:
          Number(form.estimatedValue),

        minimumValue:
          form.minimumValue
            ? Number(form.minimumValue)
            : null,

        maximumValue:
          form.maximumValue
            ? Number(form.maximumValue)
            : null,

        images,
      });

      navigate(
        `/listings/${data.listing.id}`
      );
    } catch (error) {
      console.error(error);

      setError(
        error.response?.data?.message ||
          "Unable to create listing."
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 px-6 py-10">
      <div className="mx-auto max-w-4xl">
        <div className="mb-8">
          <p className="text-sm font-medium text-green-600">
            BARter TRADE
          </p>

          <h1 className="mt-2 text-3xl font-bold">
            List an item for barter
          </h1>

          <p className="mt-2 text-gray-500">
            Tell the community what you have
            and what value you believe it has.
          </p>
        </div>

        <form
          onSubmit={handleSubmit}
          className="space-y-6"
        >
          <section className="rounded-2xl border bg-white p-6">
            <h2 className="text-xl font-semibold">
              Item information
            </h2>

            <div className="mt-6 space-y-5">
              <div>
                <label className="mb-2 block text-sm font-medium">
                  Item title
                </label>

                <input
                  name="title"
                  value={form.title}
                  onChange={handleChange}
                  placeholder="e.g. iPhone 14 Pro 256GB"
                  required
                  className="w-full rounded-xl border px-4 py-3"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium">
                  Description
                </label>

                <textarea
                  name="description"
                  value={form.description}
                  onChange={handleChange}
                  placeholder="Describe the item, its age, features and anything a trader should know..."
                  rows={5}
                  required
                  className="w-full rounded-xl border px-4 py-3"
                />
              </div>

              <div className="grid gap-5 md:grid-cols-2">
                <div>
                  <label className="mb-2 block text-sm font-medium">
                    Category
                  </label>

                  <select
                    name="categoryId"
                    value={form.categoryId}
                    onChange={handleChange}
                    required
                    className="w-full rounded-xl border px-4 py-3"
                  >
                    <option value="">
                      Select category
                    </option>

                    {categories.map(
                      (category) => (
                        <option
                          key={category.id}
                          value={category.id}
                        >
                          {category.name}
                        </option>
                      )
                    )}
                  </select>
                </div>

                <div>
                  <label className="mb-2 block text-sm font-medium">
                    Condition
                  </label>

                  <select
                    name="condition"
                    value={form.condition}
                    onChange={handleChange}
                    className="w-full rounded-xl border px-4 py-3"
                  >
                    <option value="NEW">
                      New
                    </option>

                    <option value="LIKE_NEW">
                      Like New
                    </option>

                    <option value="GOOD">
                      Good
                    </option>

                    <option value="FAIR">
                      Fair
                    </option>

                    <option value="POOR">
                      Poor
                    </option>
                  </select>
                </div>
              </div>
            </div>
          </section>

          <section className="rounded-2xl border bg-white p-6">
            <h2 className="text-xl font-semibold">
              Barter value
            </h2>

            <p className="mt-2 text-sm text-gray-500">
              This helps Barter Trade find
              items of similar value for you.
            </p>

            <div className="mt-6 grid gap-5 md:grid-cols-3">
              <div>
                <label className="mb-2 block text-sm font-medium">
                  Estimated value (KES)
                </label>

                <input
                  name="estimatedValue"
                  type="number"
                  min="1"
                  value={
                    form.estimatedValue
                  }
                  onChange={handleChange}
                  placeholder="85000"
                  required
                  className="w-full rounded-xl border px-4 py-3"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium">
                  Minimum acceptable value
                </label>

                <input
                  name="minimumValue"
                  type="number"
                  min="0"
                  value={form.minimumValue}
                  onChange={handleChange}
                  placeholder="75000"
                  className="w-full rounded-xl border px-4 py-3"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium">
                  Maximum acceptable value
                </label>

                <input
                  name="maximumValue"
                  type="number"
                  min="0"
                  value={form.maximumValue}
                  onChange={handleChange}
                  placeholder="95000"
                  className="w-full rounded-xl border px-4 py-3"
                />
              </div>
            </div>
          </section>

          <section className="rounded-2xl border bg-white p-6">
            <h2 className="text-xl font-semibold">
              Location
            </h2>

            <div className="mt-5">
              <label className="mb-2 block text-sm font-medium">
                Location
              </label>

              <input
                name="location"
                value={form.location}
                onChange={handleChange}
                placeholder="e.g. Nairobi, Westlands"
                className="w-full rounded-xl border px-4 py-3"
              />
            </div>
          </section>

          <section className="rounded-2xl border bg-white p-6">
            <h2 className="text-xl font-semibold">
              Item images
            </h2>

            <p className="mt-2 text-sm text-gray-500">
              Add image URLs for now. We'll
              connect Cloudinary upload in the
              next part.
            </p>

            <div className="mt-5 flex gap-3">
              <input
                type="url"
                value={imageUrl}
                onChange={(e) =>
                  setImageUrl(e.target.value)
                }
                placeholder="https://..."
                className="flex-1 rounded-xl border px-4 py-3"
              />

              <button
                type="button"
                onClick={addImage}
                className="rounded-xl bg-gray-900 px-5 font-medium text-white"
              >
                Add
              </button>
            </div>

            {images.length > 0 && (
              <div className="mt-5 grid grid-cols-2 gap-4 md:grid-cols-4">
                {images.map(
                  (image, index) => (
                    <div
                      key={index}
                      className="relative overflow-hidden rounded-xl border"
                    >
                      <img
                        src={image.url}
                        alt=""
                        className="aspect-square w-full object-cover"
                      />

                      <button
                        type="button"
                        onClick={() =>
                          removeImage(index)
                        }
                        className="absolute right-2 top-2 rounded-full bg-black/70 px-2 py-1 text-xs text-white"
                      >
                        Remove
                      </button>
                    </div>
                  )
                )}
              </div>
            )}
          </section>

          {error && (
            <div className="rounded-xl bg-red-50 p-4 text-sm text-red-600">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-xl bg-green-600 px-6 py-4 font-semibold text-white transition hover:bg-green-700 disabled:opacity-50"
          >
            {loading
              ? "Creating listing..."
              : "Publish item for barter"}
          </button>
        </form>
      </div>
    </div>
  );
};

export default CreateListing;