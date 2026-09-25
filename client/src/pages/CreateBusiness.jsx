import {
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
  ArrowLeft,
  ArrowRight,
  BriefcaseBusiness,
  CheckCircle2,
  Globe,
  Mail,
  MapPin,
  Phone,
  Store,
} from "lucide-react";

import {
  toast,
} from "react-toastify";

import {
  createBusinessAccount,
} from "../api/business";

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

const INITIAL_FORM = {
  businessName: "",
  description: "",
  category: "",
  location: "",
  address: "",
  phone: "",
  email: "",
  website: "",
};

const CreateBusiness = () => {
  const navigate =
    useNavigate();

    const {
    refreshBusiness,
    } = useAuth();

  const [form, setForm] =
    useState(INITIAL_FORM);

  const [submitting, setSubmitting] =
    useState(false);

  const handleChange = (event) => {
    const {
      name,
      value,
    } = event.target;

    setForm((current) => ({
      ...current,
      [name]: value,
    }));
  };

  const handleSubmit =
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
        setSubmitting(true);

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
         * Remove empty optional
         * values before sending.
         */
        Object.keys(
          payload
        ).forEach((key) => {
          if (
            key !==
              "businessName" &&
            !payload[key]
          ) {
            delete payload[key];
          }
        });

        const response =
          await createBusinessAccount(
            payload
          );


        if (
          !response?.business
        ) {
          throw new Error(
            "Business Account was not returned."
          );
        }
        await refreshBusiness();

        toast.success(
          "Business Account created successfully."
        );

        navigate(
          "/business/dashboard",
          {
            replace: true,
          }
        );
      } catch (error) {
        console.error(
          "CREATE BUSINESS ERROR:",
          error
        );

        toast.error(
          error?.response?.data
            ?.message ||
            error?.message ||
            "Unable to create Business Account."
        );
      } finally {
        setSubmitting(false);
      }
    };

  return (
    <div className="min-h-screen bg-[#F8F5F3] pb-16 font-sans">
      <main className="mx-auto max-w-5xl px-4 py-7 sm:px-6 lg:px-8">
        {/* BACK */}

        <Link
          to="/dashboard"
          className="inline-flex items-center gap-2 text-xs font-bold text-[#6B1D2C] transition hover:text-[#3D0F18]"
        >
          <ArrowLeft
            size={15}
          />

          Back to dashboard
        </Link>

        {/* HEADER */}

        <div className="mt-5 max-w-2xl">
          <p className="text-[9px] font-black uppercase tracking-[0.18em] text-[#9A5D37]">
            BarterTrade Business
          </p>

          <h1 className="mt-1 text-2xl font-black tracking-tight text-[#3D0F18] sm:text-3xl">
            Create your Business Account
          </h1>

          <p className="mt-2 text-sm leading-6 text-gray-500">
            Create a professional
            storefront while keeping
            your existing BarterTrade
            account and listings.
          </p>
        </div>

        <div className="mt-7 grid gap-6 lg:grid-cols-[minmax(0,1fr)_300px]">
          {/* FORM */}

          <form
            onSubmit={
              handleSubmit
            }
            className="rounded-2xl border border-[#E8DFDB] bg-white p-5 shadow-sm sm:p-7"
          >
            <div className="flex items-center gap-3 border-b border-[#F0E8E5] pb-5">
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#F5E8EB]">
                <Store
                  size={21}
                  className="text-[#5B1725]"
                />
              </div>

              <div>
                <h2 className="text-base font-black text-[#3D0F18]">
                  Business information
                </h2>

                <p className="mt-0.5 text-[10px] text-gray-500">
                  Tell marketplace
                  users about your
                  business.
                </p>
              </div>
            </div>

            <div className="mt-6 grid gap-5">
              <BusinessField
                label="Business name"
                name="businessName"
                value={
                  form.businessName
                }
                onChange={
                  handleChange
                }
                placeholder="e.g. Royal Pallets & Interior Decor"
                required
                maxLength={100}
              />

              <div>
                <label
                  htmlFor="category"
                  className="text-[10px] font-black uppercase tracking-[0.1em] text-[#5B1725]"
                >
                  Business category
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
                  className="mt-2 w-full rounded-xl border border-[#DDD0CB] bg-white px-4 py-3 text-sm text-gray-700 outline-none transition focus:border-[#8A2638] focus:ring-2 focus:ring-[#8A2638]/10"
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
                <div className="flex items-center justify-between gap-4">
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
                  placeholder="Describe your business, products or services..."
                  className="mt-2 w-full resize-none rounded-xl border border-[#DDD0CB] bg-white px-4 py-3 text-sm leading-6 text-gray-700 outline-none transition placeholder:text-gray-400 focus:border-[#8A2638] focus:ring-2 focus:ring-[#8A2638]/10"
                />
              </div>

              <div className="grid gap-5 sm:grid-cols-2">
                <BusinessField
                  icon={MapPin}
                  label="Location"
                  name="location"
                  value={
                    form.location
                  }
                  onChange={
                    handleChange
                  }
                  placeholder="e.g. Nairobi"
                  maxLength={150}
                />

                <BusinessField
                  icon={MapPin}
                  label="Address"
                  name="address"
                  value={
                    form.address
                  }
                  onChange={
                    handleChange
                  }
                  placeholder="Business address"
                  maxLength={250}
                />
              </div>

              <div className="grid gap-5 sm:grid-cols-2">
                <BusinessField
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
                  placeholder="+254..."
                  maxLength={30}
                />

                <BusinessField
                  icon={Mail}
                  label="Business email"
                  name="email"
                  type="email"
                  value={
                    form.email
                  }
                  onChange={
                    handleChange
                  }
                  placeholder="business@example.com"
                  maxLength={150}
                />
              </div>

              <BusinessField
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
                placeholder="https://example.com"
                maxLength={255}
              />
            </div>

            <div className="mt-7 flex flex-col-reverse gap-3 border-t border-[#F0E8E5] pt-5 sm:flex-row sm:items-center sm:justify-end">
              <Link
                to="/dashboard"
                className="inline-flex items-center justify-center rounded-xl border border-[#DDD0CB] bg-white px-5 py-3 text-xs font-black text-[#5B1725] transition hover:bg-[#F8F3F1]"
              >
                Cancel
              </Link>

              <button
                type="submit"
                disabled={
                  submitting
                }
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#5B1725] px-5 py-3 text-xs font-black text-white transition hover:bg-[#46111C] disabled:cursor-not-allowed disabled:opacity-60"
              >
                {submitting ? (
                  <>
                    <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />

                    Creating...
                  </>
                ) : (
                  <>
                    Create Business

                    <ArrowRight
                      size={15}
                    />
                  </>
                )}
              </button>
            </div>
          </form>

          {/* INFO */}

          <aside className="space-y-4">
            <div className="rounded-2xl border border-[#E8DFDB] bg-white p-5 shadow-sm">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#F5E8EB]">
                <BriefcaseBusiness
                  size={19}
                  className="text-[#5B1725]"
                />
              </div>

              <h2 className="mt-4 text-sm font-black text-[#3D0F18]">
                One account
              </h2>

              <p className="mt-1 text-[11px] leading-5 text-gray-500">
                Your existing
                BarterTrade login,
                listings and trading
                account remain the
                same.
              </p>
            </div>

            <div className="rounded-2xl border border-[#E8DFDB] bg-white p-5 shadow-sm">
              <h2 className="text-sm font-black text-[#3D0F18]">
                Business features
              </h2>

              <div className="mt-4 space-y-3">
                <Benefit>
                  Public Business
                  Storefront
                </Benefit>

                <Benefit>
                  Business badge
                </Benefit>

                <Benefit>
                  Business Dashboard
                </Benefit>

                <Benefit>
                  Existing listings
                  automatically appear
                  in your store
                </Benefit>

                <Benefit>
                  Business contact
                  information
                </Benefit>
              </div>
            </div>

            <div className="rounded-2xl border border-amber-200 bg-amber-50 p-5">
              <p className="text-[10px] font-black uppercase tracking-[0.1em] text-amber-800">
                Verification
              </p>

              <p className="mt-2 text-[11px] leading-5 text-amber-800/80">
                Creating a Business
                Account does not
                automatically verify
                the business.
                Verification is handled
                separately.
              </p>
            </div>
          </aside>
        </div>
      </main>
    </div>
  );
};

const BusinessField = ({
  label,
  name,
  value,
  onChange,
  placeholder,
  type = "text",
  required = false,
  maxLength,
  icon: Icon,
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
          placeholder={
            placeholder
          }
          className={`w-full rounded-xl border border-[#DDD0CB] bg-white py-3 pr-4 text-sm text-gray-700 outline-none transition placeholder:text-gray-400 focus:border-[#8A2638] focus:ring-2 focus:ring-[#8A2638]/10 ${
            Icon
              ? "pl-10"
              : "pl-4"
          }`}
        />
      </div>
    </div>
  );
};

const Benefit = ({
  children,
}) => {
  return (
    <div className="flex items-start gap-2">
      <CheckCircle2
        size={15}
        className="mt-0.5 shrink-0 text-emerald-600"
      />

      <p className="text-[11px] leading-5 text-gray-600">
        {children}
      </p>
    </div>
  );
};

export default CreateBusiness;