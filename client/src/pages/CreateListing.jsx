import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { getCategories } from "../api/categoryApi";
import { createListing } from "../api/listingApi";
import { showError, showSuccess, showWarning } from "../utils/toast";

const MAX_IMAGES = 5;
// Match this with the actual backend Multer/Cloudinary limits.
const MAX_IMAGE_SIZE = 5 * 1024 * 1024;
const ALLOWED_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);
const INITIAL_FORM = {
  title: "", description: "", categoryId: "", condition: "GOOD",
  estimatedValue: "", minimumValue: "", maximumValue: "", location: "",
};
const CONDITIONS = [
  { value: "NEW", label: "New" }, { value: "LIKE_NEW", label: "Like new" },
  { value: "GOOD", label: "Good" }, { value: "FAIR", label: "Fair" },
  { value: "POOR", label: "Poor" },
];
const fieldClass = "w-full rounded-xl border border-[#E4D8DB] bg-[#FCFAFA] px-4 py-3 text-sm text-[#30161D] outline-none transition placeholder:text-[#A39599] focus:border-[#8A2638] focus:bg-white focus:ring-4 focus:ring-[#8A2638]/10 disabled:opacity-60";
const labelClass = "mb-1.5 block text-sm font-semibold text-[#3D0F18]";

function ImageTile({ item, index, onRemove, disabled }) {
  const [url, setUrl] = useState("");
  useEffect(() => {
    const objectUrl = URL.createObjectURL(item.file);
    setUrl(objectUrl);
    return () => URL.revokeObjectURL(objectUrl);
  }, [item.file]);

  return (
    <div className="group relative aspect-square overflow-hidden rounded-2xl border border-[#E4D8DB] bg-[#F4EBED]">
      {url && <img src={url} alt={`Selected item photo ${index + 1}`} className="h-full w-full object-cover" />}
      {index === 0 && <span className="absolute left-2 top-2 rounded-full bg-[#5B1725] px-2.5 py-1 text-[11px] font-semibold text-white">Cover photo</span>}
      <button type="button" disabled={disabled} onClick={() => onRemove(item.id)} aria-label={`Remove photo ${index + 1}`} className="absolute bottom-2 right-2 rounded-lg bg-white/95 px-3 py-1.5 text-xs font-bold text-[#5B1725] shadow-sm transition hover:bg-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#5B1725] disabled:opacity-50">Remove</button>
    </div>
  );
}

export default function CreateListing() {
  const navigate = useNavigate();
  const redirectTimerRef = useRef(null);
  const submittingRef = useRef(false);
  const fileInputRef = useRef(null);
  const [categories, setCategories] = useState([]);
  const [categoriesLoading, setCategoriesLoading] = useState(true);
  const [categoriesError, setCategoriesError] = useState(false);
  const [form, setForm] = useState(INITIAL_FORM);
  const [images, setImages] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [uncertainResult, setUncertainResult] = useState(false);

  useEffect(() => {
    let active = true;
    const load = async () => {
      setCategoriesLoading(true);
      setCategoriesError(false);
      try {
        const data = await getCategories();
        if (active) setCategories(Array.isArray(data?.categories) ? data.categories : []);
      } catch (err) {
        console.error("LOAD CATEGORIES ERROR:", err);
        if (active) setCategoriesError(true);
      } finally {
        if (active) setCategoriesLoading(false);
      }
    };
    load();
    return () => { active = false; };
  }, []);

  useEffect(() => () => {
    if (redirectTimerRef.current) clearTimeout(redirectTimerRef.current);
  }, []);

  const completed = useMemo(() => [
    Boolean(form.title.trim() && form.description.trim() && form.categoryId),
    Boolean(form.estimatedValue && Number(form.estimatedValue) > 0),
    images.length > 0,
  ].filter(Boolean).length, [form, images]);

  const handleChange = (event) => {
    const { name, value } = event.target;
    setForm((prev) => ({ ...prev, [name]: value }));
    setError("");
    setUncertainResult(false);
  };

  const handleImageChange = (event) => {
    const selected = Array.from(event.target.files || []);
    event.target.value = "";
    if (!selected.length || loading) return;
    if (images.length + selected.length > MAX_IMAGES) {
      showWarning(`You can upload up to ${MAX_IMAGES} photos.`);
      return;
    }
    if (selected.some((file) => !ALLOWED_TYPES.has(file.type))) {
      showError("Please choose JPG, PNG or WebP images only.");
      return;
    }
    if (selected.some((file) => file.size === 0 || file.size > MAX_IMAGE_SIZE)) {
      showError("Each photo must be non-empty and no larger than 10 MB.");
      return;
    }
    const existing = new Set(images.map((item) => `${item.file.name}:${item.file.size}:${item.file.lastModified}`));
    const unique = selected.filter((file) => {
      const signature = `${file.name}:${file.size}:${file.lastModified}`;
      if (existing.has(signature)) return false;
      existing.add(signature);
      return true;
    });
    if (unique.length < selected.length) showWarning("Duplicate photos were skipped.");
    setImages((prev) => [...prev, ...unique.map((file) => ({ id: `${file.name}:${file.size}:${file.lastModified}`, file }))]);
    setError("");
    setUncertainResult(false);
  };

  const removeImage = (id) => {
    if (loading) return;
    setImages((prev) => prev.filter((item) => item.id !== id));
  };

  const validate = () => {
    if (!form.title.trim()) return "Enter an item title.";
    if (!form.categoryId || !categories.some((category) => category.id === form.categoryId)) return "Select a valid category.";
    if (!form.description.trim()) return "Describe the item you are offering.";
    const estimate = Number(form.estimatedValue);
    if (form.estimatedValue.trim() === "" || !Number.isFinite(estimate) || estimate <= 0) return "Enter an estimated value greater than zero.";
    for (const field of ["minimumValue", "maximumValue"]) {
      const raw = form[field].trim();
      if (raw !== "" && (!Number.isFinite(Number(raw)) || Number(raw) < 0)) return "Minimum and maximum values must be zero or greater.";
    }
    if (form.minimumValue.trim() && form.maximumValue.trim() && Number(form.minimumValue) > Number(form.maximumValue)) return "Minimum value cannot exceed maximum value.";
    if (images.length > MAX_IMAGES) return `Choose at most ${MAX_IMAGES} images.`;
    return "";
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (submittingRef.current) return;
    setError("");
    const validationError = validate();
    if (validationError) {
      setError(validationError);
      showError(validationError);
      return;
    }
    submittingRef.current = true;
    setLoading(true);
    setUncertainResult(false);
    try {
      const payload = new FormData();
      payload.append("title", form.title.trim());
      payload.append("description", form.description.trim());
      payload.append("categoryId", form.categoryId);
      payload.append("condition", form.condition);
      payload.append("estimatedValue", form.estimatedValue);
      if (form.minimumValue !== "") payload.append("minimumValue", form.minimumValue);
      if (form.maximumValue !== "") payload.append("maximumValue", form.maximumValue);
      if (form.location.trim()) payload.append("location", form.location.trim());
      images.forEach(({ file }) => payload.append("images", file));
      const data = await createListing(payload);
      if (!data?.listing?.id) throw new Error("The server did not confirm the new listing. Check My Listings before trying again.");
      showSuccess("Your listing has been published!");
      redirectTimerRef.current = setTimeout(() => navigate("/marketplace", {
        replace: true, state: { newListing: data.listing },
      }), 1000);
    } catch (err) {
      console.error("CREATE LISTING ERROR:", err);
      const uncertain = err?.code === "ECONNABORTED" || err?.code === "ETIMEDOUT" || (!err?.response && err?.request);
      setUncertainResult(Boolean(uncertain));
      const message = uncertain
        ? "The request took too long or the connection was interrupted. Your item may have been published. Check My Listings before submitting again."
        : err?.response?.data?.message || err?.message || "Unable to create the listing. Please try again.";
      setError(message);
      showError(message);
    } finally {
      submittingRef.current = false;
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen bg-[#F8F5F3] px-4 py-7 sm:px-6 lg:py-10">
      <div className="mx-auto max-w-6xl">
        <div className="mb-7 flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <button type="button" onClick={() => navigate("/marketplace")} className="mb-4 inline-flex items-center gap-2 text-sm font-semibold text-[#7B4B57] transition hover:text-[#5B1725]">← Back to marketplace</button>
            <p className="mb-2 text-xs font-bold uppercase tracking-[0.2em] text-[#9B762C]">BarterConnekt marketplace</p>
            <h1 className="text-3xl font-black tracking-tight text-[#3D0F18] sm:text-4xl">List something worth trading</h1>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-[#75676A]">Give your item a great first impression. Add a clear description, a fair value, and photos to help people discover your offer.</p>
          </div>
          <div className="w-full rounded-2xl border border-[#E8DDE0] bg-white px-5 py-4 shadow-sm sm:w-52">
            <div className="flex items-center justify-between text-xs font-semibold text-[#5B1725]"><span>Listing progress</span><span>{completed}/3</span></div>
            <div className="mt-3 h-2 overflow-hidden rounded-full bg-[#F1E8EA]"><div className="h-full rounded-full bg-[#8A2638] transition-all" style={{ width: `${(completed / 3) * 100}%` }} /></div>
            <p className="mt-2 text-xs text-[#887A7E]">Details · Value · Photos</p>
          </div>
        </div>

        {error && <div role="alert" className="mb-5 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm leading-6 text-red-800"><strong className="block">{uncertainResult ? "Check your listing before retrying" : "Please review your listing"}</strong>{error}</div>}

        <form onSubmit={handleSubmit} className="grid gap-6 lg:grid-cols-[minmax(0,1.45fr)_minmax(310px,1fr)]" aria-busy={loading}>
          <div className="space-y-6">
            <section className="rounded-3xl border border-[#E8DDE0] bg-white p-5 shadow-sm sm:p-7">
              <div className="mb-6 flex items-start gap-3"><span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#F6E9ED] font-black text-[#8A2638]">01</span><div><h2 className="text-lg font-extrabold text-[#3D0F18]">Tell us about your item</h2><p className="mt-1 text-sm text-[#817478]">Make it easy for another trader to understand what you have.</p></div></div>
              <div className="space-y-5">
                <div><label htmlFor="title" className={labelClass}>Item title <span className="text-[#A52E44]">*</span></label><input id="title" name="title" value={form.title} onChange={handleChange} disabled={loading} required maxLength={120} placeholder="e.g. Samsung Galaxy S23, 256GB" className={fieldClass} /><p className="mt-1.5 text-xs text-[#918489]">Be specific about the brand, model or type.</p></div>
                <div className="grid gap-4 sm:grid-cols-2"><div><label htmlFor="categoryId" className={labelClass}>Category <span className="text-[#A52E44]">*</span></label><select id="categoryId" name="categoryId" value={form.categoryId} onChange={handleChange} disabled={loading || categoriesLoading} required className={fieldClass}><option value="">{categoriesLoading ? "Loading categories..." : "Select a category"}</option>{categories.map((category) => <option key={category.id} value={category.id}>{category.name}</option>)}</select>{categoriesError && <p className="mt-2 text-xs text-red-700">Could not load categories. Refresh the page to retry.</p>}</div><div><label htmlFor="condition" className={labelClass}>Condition</label><select id="condition" name="condition" value={form.condition} onChange={handleChange} disabled={loading} className={fieldClass}>{CONDITIONS.map((condition) => <option key={condition.value} value={condition.value}>{condition.label}</option>)}</select></div></div>
                <div><div className="mb-1.5 flex items-center justify-between gap-2"><label htmlFor="description" className="text-sm font-semibold text-[#3D0F18]">Description <span className="text-[#A52E44]">*</span></label><span className="text-xs text-[#918489]">{form.description.length} characters</span></div><textarea id="description" name="description" value={form.description} onChange={handleChange} disabled={loading} required rows={6} placeholder="Describe its features, age, condition, what's included, and any known defects..." className={`${fieldClass} resize-y leading-6`} /><p className="mt-1.5 text-xs text-[#918489]">Mention any defects so other traders know what to expect.</p></div>
              </div>
            </section>
            <section className="rounded-3xl border border-[#E8DDE0] bg-white p-5 shadow-sm sm:p-7">
              <div className="mb-6 flex items-start gap-3"><span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#FFF4DA] font-black text-[#9B762C]">02</span><div><h2 className="text-lg font-extrabold text-[#3D0F18]">Set a fair barter value</h2><p className="mt-1 text-sm text-[#817478]">Values help match items; this isn't a checkout price.</p></div></div>
              <div className="grid gap-4 sm:grid-cols-3">{[{ name: "estimatedValue", label: "Estimated value", placeholder: "85000", required: true }, { name: "minimumValue", label: "Minimum", placeholder: "75000" }, { name: "maximumValue", label: "Maximum", placeholder: "95000" }].map(({ name, label, placeholder, required }) => <div key={name}><label htmlFor={name} className={labelClass}>{label} {required && <span className="text-[#A52E44]">*</span>}</label><div className="relative"><span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-xs font-bold text-[#9B762C]">KES</span><input id={name} name={name} type="number" min={required ? "0.01" : "0"} step="any" value={form[name]} onChange={handleChange} disabled={loading} required={required} placeholder={placeholder} className={`${fieldClass} pl-12`} /></div></div>)}</div>
              <p className="mt-4 rounded-xl bg-[#FFF9EC] px-4 py-3 text-xs leading-5 text-[#775C22]">Tip: Minimum and maximum values are optional. Use them only if you have a preferred trade-value range.</p>
            </section>
            <section className="rounded-3xl border border-[#E8DDE0] bg-white p-5 shadow-sm sm:p-7">
              <div className="mb-5 flex items-start gap-3"><span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#F6E9ED] font-black text-[#8A2638]">03</span><div><h2 className="text-lg font-extrabold text-[#3D0F18]">Where is the item?</h2><p className="mt-1 text-sm text-[#817478]">A general area is enough. Don't share your exact address.</p></div></div>
              <label htmlFor="location" className={labelClass}>Location <span className="font-normal text-[#918489]">(optional)</span></label><input id="location" name="location" value={form.location} onChange={handleChange} disabled={loading} maxLength={150} placeholder="e.g. Nairobi, Westlands" className={fieldClass} />
            </section>
          </div>

          <div className="space-y-6">
            <section className="rounded-3xl border border-[#E8DDE0] bg-white p-5 shadow-sm sm:p-7">
              <div className="mb-5 flex items-start justify-between gap-3"><div><h2 className="text-lg font-extrabold text-[#3D0F18]">Item photos</h2><p className="mt-1 text-sm text-[#817478]">Clear, well-lit photos attract more interest.</p></div><span className="shrink-0 rounded-full bg-[#F6E9ED] px-3 py-1 text-xs font-bold text-[#5B1725]">{images.length}/{MAX_IMAGES}</span></div>
              <input ref={fileInputRef} id="images" type="file" accept="image/jpeg,image/png,image/webp" multiple onChange={handleImageChange} disabled={loading || images.length >= MAX_IMAGES} className="sr-only" />
              <button type="button" onClick={() => fileInputRef.current?.click()} disabled={loading || images.length >= MAX_IMAGES} className="flex w-full flex-col items-center rounded-2xl border-2 border-dashed border-[#D9AFBA] bg-[#FCF7F8] px-5 py-8 text-center transition hover:border-[#8A2638] hover:bg-[#F9EEF1] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#8A2638] disabled:cursor-not-allowed disabled:opacity-50"><span className="mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-white text-2xl shadow-sm" aria-hidden="true">📷</span><span className="font-bold text-[#5B1725]">{images.length >= MAX_IMAGES ? "Maximum photos selected" : "Choose item photos"}</span><span className="mt-1 text-xs leading-5 text-[#887A7E]">JPG, PNG or WebP · Up to 10 MB each · Maximum 5</span></button>
              {images.length > 0 ? <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-2" aria-label="Selected photos">{images.map((item, index) => <ImageTile key={item.id} item={item} index={index} onRemove={removeImage} disabled={loading} />)}</div> : <p className="mt-3 text-center text-xs text-[#918489]">The first photo will be your cover photo.</p>}
            </section>
            <section className="rounded-3xl border border-[#E8DDE0] bg-white p-5 shadow-sm lg:sticky lg:top-6">
              <div className="p-5 sm:p-6"><h2 className="text-lg font-extrabold text-[#3D0F18]">Ready to publish?</h2><p className="mt-2 text-sm leading-6 text-[#817478]">Review your information before making it visible to other traders.</p><div className="my-5 border-t border-[#F0E7E9]" /><div className="mb-5 space-y-3 text-sm"><div className="flex justify-between gap-3"><span className="text-[#817478]">Item</span><span className="max-w-[60%] truncate font-semibold text-[#3D0F18]">{form.title.trim() || "Not entered"}</span></div><div className="flex justify-between gap-3"><span className="text-[#817478]">Estimated value</span><span className="font-semibold text-[#3D0F18]">{form.estimatedValue && Number.isFinite(Number(form.estimatedValue)) ? `KES ${Number(form.estimatedValue).toLocaleString("en-KE")}` : "Not set"}</span></div><div className="flex justify-between gap-3"><span className="text-[#817478]">Photos</span><span className="font-semibold text-[#3D0F18]">{images.length} selected</span></div></div><button type="submit" disabled={loading || categoriesLoading || categoriesError || !categories.length} className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#5B1725] px-5 py-3.5 text-sm font-extrabold text-white shadow-lg shadow-[#5B1725]/15 transition hover:bg-[#3D0F18] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#8A2638] disabled:cursor-not-allowed disabled:opacity-60">{loading ? <><span className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />Publishing your listing...</> : "Publish item for barter →"}</button><p className="mt-3 text-center text-xs leading-5 text-[#918489]">{loading ? "Please wait. Avoid refreshing or submitting again." : "Your item will appear in the marketplace after publication."}</p></div>
            </section>
          </div>
        </form>
      </div>
    </main>
  );
}
