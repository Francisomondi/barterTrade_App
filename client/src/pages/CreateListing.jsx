import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

import { getCategories } from "../api/categoryApi";
import { createListing } from "../api/listingApi";

const MAX_IMAGES = 8;

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


if (selectedFiles.length === 0) {
  return;
}

setError("");

if (images.length + selectedFiles.length > MAX_IMAGES) {
  setError(
    `You can upload a maximum of ${MAX_IMAGES} images.`
  );

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
  (file) => file.size > 10 * 1024 * 1024
);

if (oversizedFile) {
  setError(
    "Each image must be smaller than 10 MB."
  );

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
previousImages.filter(
(_, imageIndex) => imageIndex !== index
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

if (!form.title.trim()) {
  setError("Please enter an item title.");
  return;
}

if (!form.description.trim()) {
  setError("Please enter an item description.");
  return;
}

if (Number(form.estimatedValue) <= 0) {
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

  const formData = new FormData();

  formData.append("title", form.title);
  formData.append(
    "description",
    form.description
  );
  formData.append(
    "categoryId",
    form.categoryId
  );
  formData.append(
    "condition",
    form.condition
  );
  formData.append(
    "estimatedValue",
    form.estimatedValue
  );

  if (form.minimumValue) {
    formData.append(
      "minimumValue",
      form.minimumValue
    );
  }

  if (form.maximumValue) {
    formData.append(
      "maximumValue",
      form.maximumValue
    );
  }

  if (form.location) {
    formData.append(
      "location",
      form.location
    );
  }

  images.forEach((image) => {
    formData.append("images", image);
  });

  const data = await createListing(formData);

  navigate(
    `/listings/${data.listing.id}`
  );
} catch (error) {
  console.error(
    "CREATE LISTING ERROR:",
    error
  );

  setError(
    error.response?.data?.message ||
      "Unable to create listing."
  );
} finally {
  setLoading(false);
}


};

return ( <div className="min-h-screen bg-gray-50 px-6 py-10"> <div className="mx-auto max-w-4xl">


    <div className="mb-8">
      <p className="text-sm font-medium text-[#8A2638]">
        Barter Trade
      </p>

      <h1 className="mt-2 text-3xl font-bold text-[#3D0F18]">
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

      {/* Item information */}

      <section className="rounded-2xl border bg-white p-6">
        <h2 className="text-xl font-semibold text-[#3D0F18]">
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
              className="w-full rounded-xl border px-4 py-3 outline-none focus:border-[#8A2638]"
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
              className="w-full rounded-xl border px-4 py-3 outline-none focus:border-[#8A2638]"
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
                className="w-full rounded-xl border px-4 py-3 outline-none focus:border-[#8A2638]"
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
                className="w-full rounded-xl border px-4 py-3 outline-none focus:border-[#8A2638]"
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

      {/* Barter value */}

      <section className="rounded-2xl border bg-white p-6">
        <h2 className="text-xl font-semibold text-[#3D0F18]">
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
              value={form.estimatedValue}
              onChange={handleChange}
              placeholder="85000"
              required
              className="w-full rounded-xl border px-4 py-3 outline-none focus:border-[#8A2638]"
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
              className="w-full rounded-xl border px-4 py-3 outline-none focus:border-[#8A2638]"
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
              className="w-full rounded-xl border px-4 py-3 outline-none focus:border-[#8A2638]"
            />
          </div>

        </div>
      </section>

      {/* Location */}

      <section className="rounded-2xl border bg-white p-6">
        <h2 className="text-xl font-semibold text-[#3D0F18]">
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
            className="w-full rounded-xl border px-4 py-3 outline-none focus:border-[#8A2638]"
          />
        </div>
      </section>

      {/* Images */}

      <section className="rounded-2xl border bg-white p-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="text-xl font-semibold text-[#3D0F18]">
              Item images
            </h2>

            <p className="mt-2 text-sm text-gray-500">
              Upload up to 8 images. Each image
              must be smaller than 5 MB.
            </p>
          </div>

          <span className="rounded-full bg-[#F5E8EB] px-3 py-1 text-sm font-semibold text-[#5B1725]">
            {images.length}/{MAX_IMAGES}
          </span>
        </div>

        <div className="mt-5">
          <label
            htmlFor="images"
            className="flex cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed border-[#DCAEB7] bg-[#FBF5F6] px-6 py-10 text-center transition hover:border-[#8A2638] hover:bg-[#F5E8EB]"
          >
            <div className="text-4xl">
              📷
            </div>

            <p className="mt-3 font-semibold text-[#3D0F18]">
              Click to select images
            </p>

            <p className="mt-1 text-sm text-gray-500">
              PNG, JPG, JPEG, WEBP — up to 5 MB each
            </p>
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
        </div>

        {images.length > 0 && (
          <div className="mt-6 grid grid-cols-2 gap-4 md:grid-cols-4">

            {images.map((image, index) => (
              <div
                key={`${image.name}-${index}`}
                className="group relative overflow-hidden rounded-xl border bg-gray-100"
              >
                <img
                  src={URL.createObjectURL(image)}
                  alt={`Listing image ${index + 1}`}
                  className="aspect-square w-full object-cover"
                />

                {index === 0 && (
                  <span className="absolute left-2 top-2 rounded-full bg-[#5B1725] px-2 py-1 text-[10px] font-semibold text-white">
                    Main image
                  </span>
                )}

                <button
                  type="button"
                  onClick={() =>
                    removeImage(index)
                  }
                  className="absolute right-2 top-2 rounded-full bg-black/70 px-3 py-1 text-xs font-medium text-white transition hover:bg-[#8A2638]"
                >
                  Remove
                </button>
              </div>
            ))}

          </div>
        )}

        {images.length === 0 && (
          <p className="mt-4 text-center text-sm text-gray-400">
            No images selected yet.
          </p>
        )}
      </section>

      {/* Error */}

      {error && (
        <div className="rounded-xl bg-red-50 p-4 text-sm text-red-600">
          {error}
        </div>
      )}

      {/* Submit */}

      <button
        type="submit"
        disabled={loading}
        className="w-full rounded-xl bg-[#5B1725] px-6 py-4 font-semibold text-white transition hover:bg-[#3D0F18] disabled:cursor-not-allowed disabled:opacity-50"
      >
        {loading
          ? "Uploading images & creating listing..."
          : "Publish item for barter"}
      </button>

    </form>
  </div>
</div>


);
};

export default CreateListing;
