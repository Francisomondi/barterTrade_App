import {
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";

import {
  Link,
  useNavigate,
} from "react-router-dom";

import {
  useAuth,
} from "../context/AuthContext";

import {
  AlertTriangle,
  ArrowLeft,
  Camera,
  CheckCircle2,
  ExternalLink,
  Globe,
  ImageIcon,
  Mail,
  MapPin,
  Phone,
  RefreshCw,
  Save,
  Store,
  Trash2,
  Upload,
} from "lucide-react";

import {
  toast,
} from "react-toastify";

import {
  deleteBusinessCover,
  deleteBusinessLogo,
  getMyBusiness,
  updateMyBusiness,
  uploadBusinessCover,
  uploadBusinessLogo,
} from "../api/business";

import BusinessBadge from "../components/business/BusinessBadge";

const BUSINESS_CATEGORIES = [
  "Automotive",
  "Beauty & Personal Care",
  "Books & Education",
  "Construction & Hardware",
  "Electronics",
  "Fashion & Clothing",
  "Furniture & Interior Decor",
  "Home & Garden",
  "Kids & Baby",
  "Professional Services",
  "Sports & Fitness",
  "Technology",
  "Other",
];

const EMPTY_FORM = {
  businessName: "",
  description: "",
  category: "",
  location: "",
  address: "",
  phone: "",
  email: "",
  website: "",
};

const ManageBusiness = () => {
  const navigate =
    useNavigate();

  const {
    refreshBusiness,
  } = useAuth();

  const logoInputRef =
    useRef(null);

  const coverInputRef =
    useRef(null);

  const [business, setBusiness] =
    useState(null);

  const [form, setForm] =
    useState(EMPTY_FORM);

  const [loading, setLoading] =
    useState(true);

  const [saving, setSaving] =
    useState(false);

  const [
    logoUploading,
    setLogoUploading,
  ] = useState(false);

  const [
    coverUploading,
    setCoverUploading,
  ] = useState(false);

  const [
    logoDeleting,
    setLogoDeleting,
  ] = useState(false);

  const [
    coverDeleting,
    setCoverDeleting,
  ] = useState(false);

  const [error, setError] =
    useState("");

  /*
   * ==========================================================
   * APPLY BUSINESS TO FORM
   * ==========================================================
   */

  const applyBusiness = (
    value
  ) => {
    if (!value) {
      return;
    }

    setBusiness(value);

    setForm({
      businessName:
        value.businessName ||
        "",

      description:
        value.description ||
        "",

      category:
        value.category ||
        "",

      location:
        value.location ||
        "",

      address:
        value.address ||
        "",

      phone:
        value.phone ||
        "",

      email:
        value.email ||
        "",

      website:
        value.website ||
        "",
    });
  };

  /*
   * ==========================================================
   * LOAD
   * ==========================================================
   */

  const loadBusiness =
    useCallback(async () => {
      try {
        setLoading(true);
        setError("");

        const response =
          await getMyBusiness();

        if (
          !response?.isBusiness ||
          !response?.business
        ) {
          navigate(
            "/business/create",
            {
              replace: true,
            }
          );

          return;
        }

        applyBusiness(
          response.business
        );
      } catch (error) {
        console.error(
          "LOAD BUSINESS ERROR:",
          error
        );

        setError(
          error?.response?.data
            ?.message ||
            "Unable to load your Business Profile."
        );
      } finally {
        setLoading(false);
      }
    }, [navigate]);

  useEffect(() => {
    loadBusiness();
  }, [loadBusiness]);

  /*
   * ==========================================================
   * FORM
   * ==========================================================
   */

  const handleChange = (
    event
  ) => {
    const {
      name,
      value,
    } = event.target;

    setForm((current) => ({
      ...current,
      [name]: value,
    }));
  };

  const handleSave =
    async (event) => {
      event.preventDefault();

      if (
        !form.businessName.trim()
      ) {
        toast.error(
          "Business name is required."
        );

        return;
      }

      try {
        setSaving(true);

        const payload = {
          businessName:
            form.businessName.trim(),

          description:
            form.description.trim(),

          category:
            form.category,

          location:
            form.location.trim(),

          address:
            form.address.trim(),

          phone:
            form.phone.trim(),

          email:
            form.email.trim(),

          website:
            form.website.trim(),
        };

        /*
         * IMPORTANT:
         *
         * For update we keep empty
         * strings because the owner
         * may intentionally clear an
         * optional field.
         */

        const response =
          await updateMyBusiness(
            payload
          );

       if (
        response?.business
        ) {
        applyBusiness(
            response.business
        );
        } else {
        const refreshed =
            await getMyBusiness();

        if (
            refreshed?.business
        ) {
            applyBusiness(
            refreshed.business
            );
        }
        }

        /*
        * Keep the global Business state
        * synchronized with this page.
        *
        * This immediately updates Navbar
        * business name, slug, status, etc.
        */
        await refreshBusiness();

        toast.success(
        "Business Profile updated."
        );
      } catch (error) {
        console.error(
          "UPDATE BUSINESS ERROR:",
          error
        );

        toast.error(
          error?.response?.data
            ?.message ||
            "Unable to update Business Profile."
        );
      } finally {
        setSaving(false);
      }
    };

  /*
   * ==========================================================
   * LOGO
   * ==========================================================
   */

  const handleLogoUpload =
    async (event) => {
      const file =
        event.target.files?.[0];

      event.target.value = "";

      if (!file) {
        return;
      }

      if (
        !file.type.startsWith(
          "image/"
        )
      ) {
        toast.error(
          "Please select an image."
        );

        return;
      }

      try {
        setLogoUploading(
          true
        );

        const response =
          await uploadBusinessLogo(
            file
          );

        if (
        response?.business
        ) {
        applyBusiness(
            response.business
        );
        } else {
        await loadBusiness();
        }

        await refreshBusiness();

        toast.success(
        "Business logo updated."
        );
      } catch (error) {
        console.error(
          "UPLOAD BUSINESS LOGO ERROR:",
          error
        );

        toast.error(
          error?.response?.data
            ?.message ||
            "Unable to upload business logo."
        );
      } finally {
        setLogoUploading(
          false
        );
      }
    };

  const handleDeleteLogo =
    async () => {
      if (
        !business?.logo
      ) {
        return;
      }

      if (
        !window.confirm(
          "Remove your Business logo?"
        )
      ) {
        return;
      }

      try {
        setLogoDeleting(true);

        const response =
          await deleteBusinessLogo();

        if (
        response?.business
        ) {
        applyBusiness(
            response.business
        );
        } else {
        await loadBusiness();
        }

        await refreshBusiness();

        toast.success(
        "Business logo removed."
        );
      } catch (error) {
        console.error(
          "DELETE BUSINESS LOGO ERROR:",
          error
        );

        toast.error(
          error?.response?.data
            ?.message ||
            "Unable to remove business logo."
        );
      } finally {
        setLogoDeleting(false);
      }
    };

  /*
   * ==========================================================
   * COVER
   * ==========================================================
   */

  const handleCoverUpload =
    async (event) => {
      const file =
        event.target.files?.[0];

      event.target.value = "";

      if (!file) {
        return;
      }

      if (
        !file.type.startsWith(
          "image/"
        )
      ) {
        toast.error(
          "Please select an image."
        );

        return;
      }

      try {
        setCoverUploading(
          true
        );

        const response =
          await uploadBusinessCover(
            file
          );

        if (
        response?.business
        ) {
        applyBusiness(
            response.business
        );
        } else {
        await loadBusiness();
        }

        await refreshBusiness();

        toast.success(
        "Business cover updated."
        );
      } catch (error) {
        console.error(
          "UPLOAD BUSINESS COVER ERROR:",
          error
        );

        toast.error(
          error?.response?.data
            ?.message ||
            "Unable to upload business cover."
        );
      } finally {
        setCoverUploading(
          false
        );
      }
    };

  const handleDeleteCover =
    async () => {
      if (
        !business?.coverImage
      ) {
        return;
      }

      if (
        !window.confirm(
          "Remove your Business cover image?"
        )
      ) {
        return;
      }

      try {
        setCoverDeleting(
          true
        );

        const response =
          await deleteBusinessCover();

        if (
        response?.business
        ) {
        applyBusiness(
            response.business
        );
        } else {
        await loadBusiness();
        }

        await refreshBusiness();

        toast.success(
        "Business cover removed."
        );
      } catch (error) {
        console.error(
          "DELETE BUSINESS COVER ERROR:",
          error
        );

        toast.error(
          error?.response?.data
            ?.message ||
            "Unable to remove business cover."
        );
      } finally {
        setCoverDeleting(
          false
        );
      }
    };

  /*
   * ==========================================================
   * LOADING
   * ==========================================================
   */

  if (loading) {
    return (
      <div className="min-h-screen bg-[#F8F5F3] px-4 py-12 font-sans">
        <div className="mx-auto max-w-6xl animate-pulse">
          <div className="h-5 w-40 rounded bg-[#E6DBD7]" />

          <div className="mt-5 h-48 rounded-2xl bg-white" />

          <div className="mt-5 h-96 rounded-2xl bg-white" />
        </div>
      </div>
    );
  }

  /*
   * ==========================================================
   * ERROR
   * ==========================================================
   */

  if (error) {
    return (
      <div className="flex min-h-[70vh] items-center justify-center bg-[#F8F5F3] px-4">
        <div className="w-full max-w-md rounded-2xl border border-[#E8DFDB] bg-white p-8 text-center shadow-sm">
          <AlertTriangle
            size={38}
            className="mx-auto text-[#8A2638]"
          />

          <h1 className="mt-4 text-lg font-black text-[#3D0F18]">
            Business Profile unavailable
          </h1>

          <p className="mt-2 text-xs leading-5 text-gray-500">
            {error}
          </p>

          <button
            type="button"
            onClick={
              loadBusiness
            }
            className="mt-5 inline-flex items-center gap-2 rounded-xl bg-[#5B1725] px-5 py-2.5 text-xs font-black text-white"
          >
            <RefreshCw
              size={14}
            />

            Try again
          </button>
        </div>
      </div>
    );
  }

  if (!business) {
    return null;
  }

  const isVerified =
    business.verificationStatus ===
      "VERIFIED" ||
    Boolean(
      business.isVerified
    );

  const badgeBusiness = {
    isBusiness: true,

    businessName:
      business.businessName,

    slug:
      business.slug,

    logo:
      business.logo,

    category:
      business.category,

    location:
      business.location,

    verificationStatus:
      business.verificationStatus,

    isVerified,
  };

  const imageBusy =
    logoUploading ||
    logoDeleting ||
    coverUploading ||
    coverDeleting;

  return (
    <div className="min-h-screen bg-[#F8F5F3] pb-16 font-sans">
      <main className="mx-auto max-w-6xl px-4 py-7 sm:px-6 lg:px-8">
        {/* TOP */}

        <div className="flex flex-wrap items-center justify-between gap-4">
          <Link
            to="/business/dashboard"
            className="inline-flex items-center gap-2 text-xs font-bold text-[#6B1D2C]"
          >
            <ArrowLeft
              size={15}
            />

            Business Dashboard
          </Link>

          {business.slug &&
            business.status ===
              "ACTIVE" && (
              <Link
                to={`/business/${business.slug}`}
                className="inline-flex items-center gap-2 rounded-xl border border-[#DCCBC5] bg-white px-4 py-2.5 text-xs font-black text-[#5B1725]"
              >
                View Storefront

                <ExternalLink
                  size={14}
                />
              </Link>
            )}
        </div>

        {/* HEADER */}

        <div className="mt-6">
          <p className="text-[9px] font-black uppercase tracking-[0.18em] text-[#9A5D37]">
            Business Settings
          </p>

          <h1 className="mt-1 text-2xl font-black tracking-tight text-[#3D0F18] sm:text-3xl">
            Manage Business
          </h1>

          <p className="mt-1 text-xs text-gray-500">
            Update your public
            Business Profile and
            storefront appearance.
          </p>
        </div>

        {/* STOREFRONT PREVIEW */}

        <section className="mt-6 overflow-hidden rounded-2xl border border-[#E8DFDB] bg-white shadow-sm">
          {/* COVER */}

          <div className="group relative h-40 overflow-hidden bg-[#EDE5E2] sm:h-52">
            {business.coverImage ? (
              <img
                src={
                  business.coverImage
                }
                alt={`${business.businessName} cover`}
                className="h-full w-full object-cover"
              />
            ) : (
              <div className="flex h-full items-center justify-center">
                <ImageIcon
                  size={34}
                  className="text-[#B8A49C]"
                />
              </div>
            )}

            <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent" />

            <div className="absolute right-3 top-3 flex gap-2">
              <button
                type="button"
                disabled={
                  imageBusy
                }
                onClick={() =>
                  coverInputRef
                    .current
                    ?.click()
                }
                className="inline-flex items-center gap-1.5 rounded-lg bg-white/95 px-3 py-2 text-[10px] font-black text-[#5B1725] shadow-sm disabled:opacity-50"
              >
                {coverUploading ? (
                  <RefreshCw
                    size={13}
                    className="animate-spin"
                  />
                ) : (
                  <Camera
                    size={13}
                  />
                )}

                {business.coverImage
                  ? "Change cover"
                  : "Add cover"}
              </button>

              {business.coverImage && (
                <button
                  type="button"
                  disabled={
                    imageBusy
                  }
                  onClick={
                    handleDeleteCover
                  }
                  className="flex h-8 w-8 items-center justify-center rounded-lg bg-white/95 text-red-600 shadow-sm disabled:opacity-50"
                  aria-label="Delete business cover"
                >
                  {coverDeleting ? (
                    <RefreshCw
                      size={13}
                      className="animate-spin"
                    />
                  ) : (
                    <Trash2
                      size={13}
                    />
                  )}
                </button>
              )}
            </div>

            <input
              ref={
                coverInputRef
              }
              type="file"
              accept="image/*"
              onChange={
                handleCoverUpload
              }
              className="hidden"
            />
          </div>

          {/* IDENTITY */}

          <div className="p-5 sm:p-6">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
              <div className="relative">
                <div className="flex h-24 w-24 items-center justify-center overflow-hidden rounded-2xl border-4 border-white bg-[#F5E8EB] shadow-md">
                  {business.logo ? (
                    <img
                      src={
                        business.logo
                      }
                      alt={
                        business.businessName
                      }
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <Store
                      size={34}
                      className="text-[#5B1725]"
                    />
                  )}
                </div>

                <button
                  type="button"
                  disabled={
                    imageBusy
                  }
                  onClick={() =>
                    logoInputRef
                      .current
                      ?.click()
                  }
                  className="absolute -bottom-2 -right-2 flex h-8 w-8 items-center justify-center rounded-full bg-[#5B1725] text-white shadow-md disabled:opacity-50"
                  aria-label="Upload business logo"
                >
                  {logoUploading ? (
                    <RefreshCw
                      size={13}
                      className="animate-spin"
                    />
                  ) : (
                    <Upload
                      size={13}
                    />
                  )}
                </button>

                <input
                  ref={
                    logoInputRef
                  }
                  type="file"
                  accept="image/*"
                  onChange={
                    handleLogoUpload
                  }
                  className="hidden"
                />
              </div>

              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <h2 className="text-xl font-black text-[#3D0F18]">
                    {
                      business.businessName
                    }
                  </h2>

                  <BusinessBadge
                    business={
                      badgeBusiness
                    }
                    size="sm"
                    showVerified
                  />
                </div>

                {business.category && (
                  <p className="mt-1 text-[10px] font-black uppercase tracking-wide text-[#9A5D37]">
                    {
                      business.category
                    }
                  </p>
                )}

                <p className="mt-2 text-[10px] text-gray-500">
                  Status:{" "}
                  <strong>
                    {
                      business.status
                    }
                  </strong>
                </p>

                {business.logo && (
                  <button
                    type="button"
                    disabled={
                      imageBusy
                    }
                    onClick={
                      handleDeleteLogo
                    }
                    className="mt-3 inline-flex items-center gap-1.5 text-[10px] font-black text-red-600 hover:underline disabled:opacity-50"
                  >
                    <Trash2
                      size={12}
                    />

                    Remove logo
                  </button>
                )}
              </div>
            </div>
          </div>
        </section>

        {/* FORM */}

        <form
          onSubmit={
            handleSave
          }
          className="mt-5 rounded-2xl border border-[#E8DFDB] bg-white p-5 shadow-sm sm:p-7"
        >
          <div>
            <p className="text-[9px] font-black uppercase tracking-[0.15em] text-[#9A5D37]">
              Profile
            </p>

            <h2 className="mt-1 text-lg font-black text-[#3D0F18]">
              Business Information
            </h2>

            <p className="mt-1 text-[11px] text-gray-500">
              This information can
              appear on your public
              storefront.
            </p>
          </div>

          <div className="mt-6 grid gap-5">
            <ManageField
              label="Business name"
              name="businessName"
              value={
                form.businessName
              }
              onChange={
                handleChange
              }
              required
              maxLength={100}
            />

            <div>
              <label
                htmlFor="category"
                className="text-[10px] font-black uppercase tracking-[0.1em] text-[#5B1725]"
              >
                Category
              </label>

              <select
                id="category"
                name="category"
                value={
                  form.category
                }
                onChange={
                  handleChange
                }
                className="mt-2 w-full rounded-xl border border-[#DDD0CB] bg-white px-4 py-3 text-sm text-gray-700 outline-none focus:border-[#8A2638]"
              >
                <option value="">
                  Select category
                </option>

                {BUSINESS_CATEGORIES.map(
                  (category) => (
                    <option
                      key={
                        category
                      }
                      value={
                        category
                      }
                    >
                      {category}
                    </option>
                  )
                )}
              </select>
            </div>

            <div>
              <div className="flex items-center justify-between">
                <label
                  htmlFor="description"
                  className="text-[10px] font-black uppercase tracking-[0.1em] text-[#5B1725]"
                >
                  Description
                </label>

                <span className="text-[9px] text-gray-400">
                  {
                    form.description
                      .length
                  }
                  /1000
                </span>
              </div>

              <textarea
                id="description"
                name="description"
                value={
                  form.description
                }
                onChange={
                  handleChange
                }
                rows={5}
                maxLength={1000}
                className="mt-2 w-full resize-none rounded-xl border border-[#DDD0CB] px-4 py-3 text-sm leading-6 text-gray-700 outline-none focus:border-[#8A2638]"
              />
            </div>

            <div className="grid gap-5 sm:grid-cols-2">
              <ManageField
                icon={MapPin}
                label="Location"
                name="location"
                value={
                  form.location
                }
                onChange={
                  handleChange
                }
                maxLength={150}
              />

              <ManageField
                icon={MapPin}
                label="Address"
                name="address"
                value={
                  form.address
                }
                onChange={
                  handleChange
                }
                maxLength={250}
              />
            </div>

            <div className="grid gap-5 sm:grid-cols-2">
              <ManageField
                icon={Phone}
                label="Phone"
                name="phone"
                type="tel"
                value={
                  form.phone
                }
                onChange={
                  handleChange
                }
                maxLength={30}
              />

              <ManageField
                icon={Mail}
                label="Email"
                name="email"
                type="email"
                value={
                  form.email
                }
                onChange={
                  handleChange
                }
                maxLength={150}
              />
            </div>

            <ManageField
              icon={Globe}
              label="Website"
              name="website"
              type="url"
              value={
                form.website
              }
              onChange={
                handleChange
              }
              maxLength={255}
            />
          </div>

          <div className="mt-7 flex flex-wrap items-center justify-between gap-3 border-t border-[#F0E8E5] pt-5">
            <p className="text-[10px] text-gray-400">
              Your storefront slug is
              managed automatically.
            </p>

            <button
              type="submit"
              disabled={
                saving
              }
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#5B1725] px-5 py-3 text-xs font-black text-white transition hover:bg-[#46111C] disabled:cursor-not-allowed disabled:opacity-60"
            >
              {saving ? (
                <>
                  <RefreshCw
                    size={14}
                    className="animate-spin"
                  />

                  Saving...
                </>
              ) : (
                <>
                  <Save
                    size={14}
                  />

                  Save Changes
                </>
              )}
            </button>
          </div>
        </form>

        {/* ACCOUNT STATE */}

        {business.status ===
          "SUSPENDED" && (
          <div className="mt-5 flex items-start gap-3 rounded-2xl border border-red-200 bg-red-50 p-5">
            <AlertTriangle
              size={19}
              className="mt-0.5 shrink-0 text-red-600"
            />

            <div>
              <p className="text-xs font-black text-red-800">
                Business suspended
              </p>

              <p className="mt-1 text-[11px] leading-5 text-red-700">
                Image changes and
                storefront controls may
                be restricted while the
                Business Account is
                suspended.
              </p>
            </div>
          </div>
        )}

        {business.status ===
          "ACTIVE" && (
          <div className="mt-5 flex items-start gap-3 rounded-2xl border border-emerald-200 bg-emerald-50 p-5">
            <CheckCircle2
              size={19}
              className="mt-0.5 shrink-0 text-emerald-600"
            />

            <div>
              <p className="text-xs font-black text-emerald-800">
                Storefront active
              </p>

              <p className="mt-1 text-[11px] leading-5 text-emerald-700">
                Your Business
                Storefront is currently
                available publicly.
              </p>
            </div>
          </div>
        )}
      </main>
    </div>
  );
};

const ManageField = ({
  icon: Icon,
  label,
  name,
  value,
  onChange,
  type = "text",
  required = false,
  maxLength,
}) => {
  return (
    <div>
      <label
        htmlFor={name}
        className="text-[10px] font-black uppercase tracking-[0.1em] text-[#5B1725]"
      >
        {label}

        {required && (
          <span className="ml-1 text-red-500">
            *
          </span>
        )}
      </label>

      <div className="relative mt-2">
        {Icon && (
          <Icon
            size={15}
            className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400"
          />
        )}

        <input
          id={name}
          name={name}
          type={type}
          value={value}
          onChange={onChange}
          required={required}
          maxLength={
            maxLength
          }
          className={`w-full rounded-xl border border-[#DDD0CB] bg-white py-3 pr-4 text-sm text-gray-700 outline-none transition focus:border-[#8A2638] focus:ring-2 focus:ring-[#8A2638]/10 ${
            Icon
              ? "pl-10"
              : "pl-4"
          }`}
        />
      </div>
    </div>
  );
};

export default ManageBusiness;