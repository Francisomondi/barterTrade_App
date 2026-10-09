
import { useCallback, useEffect, useState } from "react";
import {
  CheckCircle2,
  AlertCircle,
  FileText,
  LockKeyhole,
  RefreshCw,
  Save,
} from "lucide-react";

import {
  getMyBusinessIntroduction,
  updateMyBusinessIntroduction,
} from "../../api/business";

const MAX_INTRODUCTION_LENGTH = 1000;

const getErrorMessage = (error, fallback) =>
  error?.response?.data?.message ||
  error?.message ||
  fallback;

export default function BusinessIntroductionManagement() {
  const [introduction, setIntroduction] = useState("");
  const [savedIntroduction, setSavedIntroduction] = useState("");

  const [canManage, setCanManage] = useState(false);
  const [tier, setTier] = useState("BUSINESS_FREE");

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const loadIntroduction = useCallback(async () => {
    try {
      setLoading(true);
      setError("");
      setSuccess("");

      const response = await getMyBusinessIntroduction();

      const value = response?.introduction ?? "";

      setIntroduction(value);
      setSavedIntroduction(value);
      setCanManage(
        response?.access?.canManageIntroduction === true
      );
      setTier(response?.access?.tier ?? "BUSINESS_FREE");
    } catch (err) {
      setError(
        getErrorMessage(
          err,
          "Unable to load your business introduction."
        )
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadIntroduction();
  }, [loadIntroduction]);

  const normalizedIntroduction = introduction.trim();
  const hasChanges =
    normalizedIntroduction !== savedIntroduction;

  const handleSave = async () => {
    if (!canManage || saving || !hasChanges) return;

    if (normalizedIntroduction.length > MAX_INTRODUCTION_LENGTH) {
      setError("Introduction cannot exceed 1,000 characters.");
      return;
    }

    try {
      setSaving(true);
      setError("");
      setSuccess("");

      const response = await updateMyBusinessIntroduction(
        normalizedIntroduction || null
      );

      const savedValue = response?.introduction ?? "";

      setIntroduction(savedValue);
      setSavedIntroduction(savedValue);
      setSuccess("Business introduction saved successfully.");
    } catch (err) {
      if (err?.response?.status === 403) {
        setCanManage(false);
        setTier("BUSINESS_FREE");
      }

      setError(
        getErrorMessage(
          err,
          "Unable to save your business introduction."
        )
      );
    } finally {
      setSaving(false);
    }
  };

  const handleReset = () => {
    setIntroduction(savedIntroduction);
    setError("");
    setSuccess("");
  };

  if (loading) {
    return (
      <section className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
        <div className="flex items-center gap-3 text-gray-600">
          <RefreshCw className="h-5 w-5 animate-spin" />
          <span>Loading business introduction...</span>
        </div>
      </section>
    );
  }

  return (
    <section className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
      <div className="border-b border-gray-100 bg-[#F8F5F3] px-5 py-5 sm:px-6">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="flex items-start gap-3">
            <div className="rounded-xl bg-[#5B1725] p-3 text-white">
              <FileText className="h-5 w-5" />
            </div>

            <div>
              <h2 className="text-lg font-bold text-[#3D0F18]">
                Business Introduction
              </h2>

              <p className="mt-1 text-sm text-gray-600">
                Tell visitors your story, what you offer, and why
                they should trade with your business.
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
                Unlock Business Introduction
              </p>

              <p className="mt-1 text-sm text-gray-700">
                Upgrade to Business Pro to create or edit your
                storefront introduction. Any introduction
                previously saved remains stored if your
                subscription expires.
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

        <div>
          <label
            htmlFor="business-introduction"
            className="mb-2 block text-sm font-semibold text-[#3D0F18]"
          >
            Your Business Introduction
          </label>

          <textarea
            id="business-introduction"
            value={introduction}
            onChange={(event) => {
              setIntroduction(event.target.value);
              setSuccess("");
            }}
            disabled={!canManage || saving}
            maxLength={MAX_INTRODUCTION_LENGTH}
            rows={7}
            placeholder="Welcome to our business! We specialize in..."
            className="w-full resize-y rounded-xl border border-gray-300 bg-white px-4 py-3 text-sm leading-6 text-gray-800 outline-none transition focus:border-[#8A2638] focus:ring-2 focus:ring-[#8A2638]/15 disabled:cursor-not-allowed disabled:bg-gray-50 disabled:text-gray-500"
          />

          <div className="mt-2 flex flex-wrap items-center justify-between gap-2 text-xs text-gray-500">
            <span>
              Introduce your products, services, and barter opportunities.
            </span>

            <span className="font-medium tabular-nums">
              {introduction.length.toLocaleString()} / 1,000
            </span>
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-gray-100 pt-4">
          <p className="text-xs text-gray-500">
            {hasChanges
              ? "You have unsaved changes."
              : "Your introduction is up to date."}
          </p>

          <div className="flex flex-wrap gap-3">
            <button
              type="button"
              onClick={handleReset}
              disabled={!canManage || saving || !hasChanges}
              className="rounded-xl border border-gray-300 px-4 py-2.5 text-sm font-semibold text-gray-700 transition hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
            >
              Reset
            </button>

            <button
              type="button"
              onClick={handleSave}
              disabled={!canManage || saving || !hasChanges}
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#5B1725] px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-[#3D0F18] disabled:cursor-not-allowed disabled:opacity-50"
            >
              {saving ? (
                <RefreshCw className="h-4 w-4 animate-spin" />
              ) : (
                <Save className="h-4 w-4" />
              )}

              {saving ? "Saving..." : "Save Introduction"}
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}
