
import { useCallback, useEffect, useState } from "react";
import {
  AlertCircle,
  ArrowDown,
  ArrowUp,
  CheckCircle2,
  Edit3,
  LockKeyhole,
  Megaphone,
  Plus,
  RefreshCw,
  Save,
  Trash2,
  X,
} from "lucide-react";

import {
  getMyBusinessPromotionalHighlights,
  createMyBusinessPromotionalHighlight,
  updateMyBusinessPromotionalHighlight,
  deleteMyBusinessPromotionalHighlight,
  reorderMyBusinessPromotionalHighlights,
} from "../../api/business";

const MAX_HIGHLIGHTS = 6;

const EMPTY_FORM = {
  title: "",
  description: "",
  icon: "",
  isActive: true,
};

const getErrorMessage = (error, fallback) =>
  error?.response?.data?.message ||
  error?.message ||
  fallback;

export default function BusinessPromotionalHighlightsManagement() {
  const [highlights, setHighlights] = useState([]);
  const [canManage, setCanManage] = useState(false);
  const [tier, setTier] = useState("BUSINESS_FREE");

  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);

  const [formOpen, setFormOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState({ ...EMPTY_FORM });

  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const loadHighlights = useCallback(async () => {
    try {
      setLoading(true);
      setError("");
      setSuccess("");

      const response =
        await getMyBusinessPromotionalHighlights();

      setHighlights(response?.highlights ?? []);
      setCanManage(
        response?.access?.canManageHighlights === true
      );
      setTier(response?.access?.tier ?? "BUSINESS_FREE");
    } catch (err) {
      setError(
        getErrorMessage(
          err,
          "Unable to load promotional highlights."
        )
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadHighlights();
  }, [loadHighlights]);

  const clearMessages = () => {
    setError("");
    setSuccess("");
  };

  const handleApiError = (err, fallback) => {
    if (err?.response?.status === 403) {
      setCanManage(false);
      setTier("BUSINESS_FREE");
    }

    setError(getErrorMessage(err, fallback));
  };

  const openCreateForm = () => {
    if (!canManage || busy || highlights.length >= MAX_HIGHLIGHTS) {
      return;
    }

    setEditingId(null);
    setForm({ ...EMPTY_FORM });
    setFormOpen(true);
    clearMessages();
  };

  const openEditForm = (highlight) => {
    if (!canManage || busy) return;

    setEditingId(highlight.id);
    setForm({
      title: highlight.title ?? "",
      description: highlight.description ?? "",
      icon: highlight.icon ?? "",
      isActive: highlight.isActive === true,
    });
    setFormOpen(true);
    clearMessages();
  };

  const closeForm = () => {
    if (busy) return;

    setFormOpen(false);
    setEditingId(null);
    setForm({ ...EMPTY_FORM });
  };

  const handleSave = async (event) => {
    event.preventDefault();

    if (!canManage || busy) return;

    const title = form.title.trim();
    const description = form.description.trim();
    const icon = form.icon.trim();

    if (!title || title.length > 100) {
      setError("Title must contain 1 to 100 characters.");
      return;
    }

    if (description.length > 300 || icon.length > 50) {
      setError("Description or icon exceeds its character limit.");
      return;
    }

    try {
      setBusy(true);
      clearMessages();

      const payload = {
        title,
        description: description || null,
        icon: icon || null,
        isActive: form.isActive,
      };

      if (editingId) {
        const response =
          await updateMyBusinessPromotionalHighlight(
            editingId,
            payload
          );

        setHighlights((current) =>
          current.map((item) =>
            item.id === editingId ? response.highlight : item
          )
        );

        setSuccess("Promotional highlight updated successfully.");
      } else {
        const response =
          await createMyBusinessPromotionalHighlight(payload);

        setHighlights((current) => [
          ...current,
          response.highlight,
        ]);

        setSuccess("Promotional highlight created successfully.");
      }

      setFormOpen(false);
      setEditingId(null);
      setForm({ ...EMPTY_FORM });
    } catch (err) {
      handleApiError(err, "Unable to save promotional highlight.");
    } finally {
      setBusy(false);
    }
  };

  const handleDelete = async (highlight) => {
    if (!canManage || busy) return;

    const confirmed = window.confirm(
      `Delete "${highlight.title}" permanently?`
    );

    if (!confirmed) return;

    try {
      setBusy(true);
      clearMessages();

      await deleteMyBusinessPromotionalHighlight(highlight.id);

      setHighlights((current) =>
        current.filter((item) => item.id !== highlight.id)
      );

      setSuccess("Promotional highlight deleted successfully.");
    } catch (err) {
      handleApiError(err, "Unable to delete promotional highlight.");
    } finally {
      setBusy(false);
    }
  };

  const handleToggle = async (highlight) => {
    if (!canManage || busy) return;

    try {
      setBusy(true);
      clearMessages();

      const response =
        await updateMyBusinessPromotionalHighlight(
          highlight.id,
          {
            isActive: !highlight.isActive,
          }
        );

      setHighlights((current) =>
        current.map((item) =>
          item.id === highlight.id ? response.highlight : item
        )
      );

      setSuccess(
        response.highlight.isActive
          ? "Highlight enabled successfully."
          : "Highlight disabled successfully."
      );
    } catch (err) {
      handleApiError(err, "Unable to update highlight status.");
    } finally {
      setBusy(false);
    }
  };

  const handleMove = async (index, direction) => {
    if (!canManage || busy) return;

    const targetIndex = index + direction;

    if (targetIndex < 0 || targetIndex >= highlights.length) {
      return;
    }

    const reordered = [...highlights];

    [reordered[index], reordered[targetIndex]] = [
      reordered[targetIndex],
      reordered[index],
    ];

    try {
      setBusy(true);
      clearMessages();

      const response =
        await reorderMyBusinessPromotionalHighlights(
          reordered.map((item) => item.id)
        );

      setHighlights(response.highlights);
      setSuccess("Highlight order updated successfully.");
    } catch (err) {
      handleApiError(err, "Unable to reorder highlights.");
    } finally {
      setBusy(false);
    }
  };

  if (loading) {
    return (
      <section className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
        <div className="flex items-center gap-3 text-gray-600">
          <RefreshCw className="h-5 w-5 animate-spin" />
          <span>Loading promotional highlights...</span>
        </div>
      </section>
    );
  }

  return (
    <section className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
      <div className="border-b border-gray-100 bg-[#F8F5F3] px-5 py-5 sm:px-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="flex items-start gap-3">
            <div className="rounded-xl bg-[#5B1725] p-3 text-white">
              <Megaphone className="h-5 w-5" />
            </div>

            <div>
              <h2 className="text-lg font-bold text-[#3D0F18]">
                Promotional Highlights
              </h2>

              <p className="mt-1 text-sm text-gray-600">
                Showcase your business strengths, offers, and
                special services on your storefront.
              </p>
            </div>
          </div>

          <span className="rounded-full border border-[#D6B15E]/50 bg-[#D6B15E]/15 px-3 py-1 text-xs font-semibold text-[#5B1725]">
            {tier === "BUSINESS_PRO"
              ? "Business Pro"
              : "Business Free"}
          </span>
        </div>
      </div>

      <div className="space-y-5 p-5 sm:p-6">
        {!canManage && (
          <div className="flex items-start gap-3 rounded-xl border border-[#D6B15E]/40 bg-[#FFF9EA] p-4">
            <LockKeyhole className="mt-0.5 h-5 w-5 shrink-0 text-[#8A2638]" />
            <div>
              <p className="font-semibold text-[#5B1725]">
                Unlock Promotional Highlights
              </p>
              <p className="mt-1 text-sm text-gray-700">
                Upgrade to Business Pro to create and manage up to
                six promotional highlights. Previously saved
                highlights remain stored after subscription expiry.
              </p>
            </div>
          </div>
        )}

        {error && (
          <div
            role="alert"
            className="flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700"
          >
            <AlertCircle className="h-5 w-5 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {success && (
          <div
            role="status"
            className="flex items-start gap-2 rounded-xl border border-green-200 bg-green-50 p-3 text-sm text-green-800"
          >
            <CheckCircle2 className="h-5 w-5 shrink-0" />
            <span>{success}</span>
          </div>
        )}

        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="text-sm font-medium text-gray-700">
            {highlights.length} / {MAX_HIGHLIGHTS} highlights
          </p>

          <button
            type="button"
            onClick={openCreateForm}
            disabled={
              !canManage ||
              busy ||
              highlights.length >= MAX_HIGHLIGHTS
            }
            className="inline-flex items-center gap-2 rounded-xl bg-[#5B1725] px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-[#3D0F18] disabled:cursor-not-allowed disabled:opacity-50"
          >
            <Plus className="h-4 w-4" />
            Add Highlight
          </button>
        </div>

        {formOpen && (
          <form
            onSubmit={handleSave}
            className="space-y-4 rounded-xl border border-[#D6B15E]/40 bg-[#F8F5F3] p-4"
          >
            <div className="flex items-center justify-between gap-3">
              <h3 className="font-semibold text-[#3D0F18]">
                {editingId ? "Edit Highlight" : "New Highlight"}
              </h3>

              <button
                type="button"
                onClick={closeForm}
                disabled={busy}
                aria-label="Close highlight form"
                className="rounded-lg p-2 text-gray-500 hover:bg-gray-200 disabled:opacity-50"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div>
              <label
                htmlFor="highlight-title"
                className="mb-1 block text-sm font-semibold text-gray-700"
              >
                Title
              </label>

              <input
                id="highlight-title"
                type="text"
                required
                maxLength={100}
                value={form.title}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    title: event.target.value,
                  }))
                }
                disabled={busy}
                placeholder="e.g. Quality Guaranteed"
                className="w-full rounded-xl border border-gray-300 bg-white px-4 py-2.5 text-sm outline-none focus:border-[#8A2638] focus:ring-2 focus:ring-[#8A2638]/15"
              />
            </div>

            <div>
              <label
                htmlFor="highlight-description"
                className="mb-1 block text-sm font-semibold text-gray-700"
              >
                Description
              </label>

              <textarea
                id="highlight-description"
                rows={3}
                maxLength={300}
                value={form.description}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    description: event.target.value,
                  }))
                }
                disabled={busy}
                placeholder="Describe this highlight..."
                className="w-full resize-y rounded-xl border border-gray-300 bg-white px-4 py-2.5 text-sm outline-none focus:border-[#8A2638] focus:ring-2 focus:ring-[#8A2638]/15"
              />
              <p className="mt-1 text-right text-xs text-gray-500">
                {form.description.length} / 300
              </p>
            </div>

            <div>
              <label
                htmlFor="highlight-icon"
                className="mb-1 block text-sm font-semibold text-gray-700"
              >
                Icon Name (Optional)
              </label>

              <input
                id="highlight-icon"
                type="text"
                maxLength={50}
                value={form.icon}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    icon: event.target.value,
                  }))
                }
                disabled={busy}
                placeholder="e.g. star, shield-check, truck"
                className="w-full rounded-xl border border-gray-300 bg-white px-4 py-2.5 text-sm outline-none focus:border-[#8A2638] focus:ring-2 focus:ring-[#8A2638]/15"
              />

              <p className="mt-1 text-xs text-gray-500">
                Use a supported icon name. We'll render these on
                the public storefront.
              </p>
            </div>

            <label className="flex items-center gap-3 text-sm font-medium text-gray-700">
              <input
                type="checkbox"
                checked={form.isActive}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    isActive: event.target.checked,
                  }))
                }
                disabled={busy}
                className="h-4 w-4 accent-[#5B1725]"
              />
              Active — show on public storefront
            </label>

            <div className="flex justify-end gap-3">
              <button
                type="button"
                onClick={closeForm}
                disabled={busy}
                className="rounded-xl border border-gray-300 px-4 py-2.5 text-sm font-semibold text-gray-700 hover:bg-white disabled:opacity-50"
              >
                Cancel
              </button>

              <button
                type="submit"
                disabled={busy || !form.title.trim()}
                className="inline-flex items-center gap-2 rounded-xl bg-[#5B1725] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[#3D0F18] disabled:opacity-50"
              >
                {busy ? (
                  <RefreshCw className="h-4 w-4 animate-spin" />
                ) : (
                  <Save className="h-4 w-4" />
                )}
                {busy ? "Saving..." : "Save Highlight"}
              </button>
            </div>
          </form>
        )}

        {highlights.length === 0 ? (
          <div className="rounded-xl border border-dashed border-gray-300 px-5 py-10 text-center">
            <Megaphone className="mx-auto h-8 w-8 text-gray-400" />
            <p className="mt-3 font-semibold text-gray-700">
              No promotional highlights yet
            </p>
            <p className="mt-1 text-sm text-gray-500">
              Add highlights to introduce your business strengths.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {highlights.map((highlight, index) => (
              <div
                key={highlight.id}
                className="rounded-xl border border-gray-200 bg-white p-4"
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="font-semibold text-[#3D0F18]">
                        {highlight.title}
                      </h3>

                      <span
                        className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                          highlight.isActive
                            ? "bg-green-50 text-green-700"
                            : "bg-gray-100 text-gray-600"
                        }`}
                      >
                        {highlight.isActive ? "Active" : "Hidden"}
                      </span>
                    </div>

                    {highlight.description && (
                      <p className="mt-2 text-sm text-gray-600">
                        {highlight.description}
                      </p>
                    )}

                    {highlight.icon && (
                      <p className="mt-2 text-xs text-gray-500">
                        Icon: {highlight.icon}
                      </p>
                    )}
                  </div>

                  <div className="flex flex-wrap items-center gap-1">
                    <button
                      type="button"
                      onClick={() => handleMove(index, -1)}
                      disabled={!canManage || busy || index === 0}
                      aria-label={`Move ${highlight.title} up`}
                      className="rounded-lg p-2 text-gray-600 hover:bg-gray-100 disabled:opacity-30"
                    >
                      <ArrowUp className="h-4 w-4" />
                    </button>

                    <button
                      type="button"
                      onClick={() => handleMove(index, 1)}
                      disabled={
                        !canManage ||
                        busy ||
                        index === highlights.length - 1
                      }
                      aria-label={`Move ${highlight.title} down`}
                      className="rounded-lg p-2 text-gray-600 hover:bg-gray-100 disabled:opacity-30"
                    >
                      <ArrowDown className="h-4 w-4" />
                    </button>

                    <button
                      type="button"
                      onClick={() => handleToggle(highlight)}
                      disabled={!canManage || busy}
                      className="rounded-lg px-2 py-1.5 text-xs font-semibold text-[#5B1725] hover:bg-[#F8F5F3] disabled:opacity-40"
                    >
                      {highlight.isActive ? "Hide" : "Show"}
                    </button>

                    <button
                      type="button"
                      onClick={() => openEditForm(highlight)}
                      disabled={!canManage || busy}
                      aria-label={`Edit ${highlight.title}`}
                      className="rounded-lg p-2 text-[#5B1725] hover:bg-[#F8F5F3] disabled:opacity-40"
                    >
                      <Edit3 className="h-4 w-4" />
                    </button>

                    <button
                      type="button"
                      onClick={() => handleDelete(highlight)}
                      disabled={!canManage || busy}
                      aria-label={`Delete ${highlight.title}`}
                      className="rounded-lg p-2 text-red-600 hover:bg-red-50 disabled:opacity-40"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        <div className="border-t border-gray-100 pt-4">
          <button
            type="button"
            onClick={loadHighlights}
            disabled={loading || busy}
            className="inline-flex items-center gap-2 text-sm font-medium text-[#5B1725] hover:underline disabled:opacity-50"
          >
            <RefreshCw className="h-4 w-4" />
            Refresh Highlights
          </button>
        </div>
      </div>
    </section>
  );
}
