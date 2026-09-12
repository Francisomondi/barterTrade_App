
import { useMemo, useState } from "react";
import {
  Link,
  useNavigate,
  useParams,
} from "react-router-dom";

import { resetPassword } from "../api/authApi";

const ResetPassword = () => {
  const { token } = useParams();
  const navigate = useNavigate();

  const [form, setForm] = useState({
    password: "",
    confirmPassword: "",
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const passwordValid = useMemo(
    () => form.password.length >= 8,
    [form.password]
  );

  const passwordsMatch =
    form.password &&
    form.confirmPassword &&
    form.password === form.confirmPassword;

  const handleChange = (event) => {
    setForm({
      ...form,
      [event.target.name]: event.target.value,
    });

    setError("");
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    setError("");
    setSuccess("");

    if (!token) {
      setError(
        "This password reset link is invalid."
      );
      return;
    }

    if (!passwordValid) {
      setError(
        "Password must be at least 8 characters."
      );
      return;
    }

    if (!passwordsMatch) {
      setError("Passwords do not match.");
      return;
    }

    try {
      setLoading(true);

      const response = await resetPassword(
        token,
        form.password
      );

      setSuccess(
        response.message ||
          "Password reset successfully."
      );

      setTimeout(() => {
        navigate("/login", {
          replace: true,
        });
      }, 1800);
    } catch (error) {
      setError(
        error.response?.data?.message ||
          "Unable to reset your password. The link may have expired."
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative min-h-screen overflow-hidden bg-[#F8F5F3]">
      {/* Background */}

      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -left-48 -top-48 h-[420px] w-[420px] rounded-full bg-[#3D0F18]" />

        <div className="absolute -bottom-48 -right-48 h-[420px] w-[420px] rounded-full bg-[#8A2638]/15 blur-3xl" />

        <div className="absolute right-[12%] top-[12%] h-24 w-24 rounded-full bg-[#DCAEB7]/20 blur-2xl" />
      </div>

      <div className="relative z-10 flex min-h-screen items-center justify-center px-4 py-6 sm:px-6 sm:py-8">
        <div className="w-full max-w-md rounded-[1.75rem] border border-[#E7DDDF] bg-white p-6 shadow-xl sm:p-9">

          {/* Logo */}

          <div className="mb-7 flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#5B1725] text-xl font-bold text-white shadow-sm">
              ⇄
            </div>

            <div>
              <h2 className="font-black text-[#21191B]">
                Barter Trade
              </h2>

              <p className="text-[11px] text-gray-500">
                Trade smarter
              </p>
            </div>
          </div>

          {/* Heading */}

          <div className="mb-6">
            <p className="mb-1.5 text-xs font-bold uppercase tracking-[0.18em] text-[#8A2638]">
              New password
            </p>

            <h1 className="text-3xl font-black tracking-tight text-[#21191B]">
              Reset your password
            </h1>

            <p className="mt-2 text-sm leading-5 text-gray-500">
              Choose a strong password for your
              Barter Trade account.
            </p>
          </div>

          {/* Error */}

          {error && (
            <div
              role="alert"
              className="mb-5 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"
            >
              {error}
            </div>
          )}

          {/* Success */}

          {success && (
            <div
              role="status"
              className="mb-5 rounded-xl border border-green-200 bg-green-50 px-4 py-3 text-sm leading-5 text-green-700"
            >
              <p className="font-semibold">
                Password updated
              </p>

              <p className="mt-1">
                {success}
              </p>

              <p className="mt-2 text-xs">
                Redirecting you to login...
              </p>
            </div>
          )}

          {/* Form */}

          <form
            onSubmit={handleSubmit}
            className="space-y-4"
          >
            {/* Password */}

            <div>
              <label
                htmlFor="password"
                className="mb-1.5 block text-sm font-bold text-[#21191B]"
              >
                New password
              </label>

              <input
                id="password"
                type="password"
                name="password"
                value={form.password}
                onChange={handleChange}
                placeholder="At least 8 characters"
                autoComplete="new-password"
                required
                disabled={loading || !!success}
                className="w-full rounded-xl border border-[#E7DDDF] bg-[#FBF8F8] px-4 py-3 text-sm text-[#21191B] outline-none transition placeholder:text-gray-400 focus:border-[#8A2638] focus:bg-white focus:ring-4 focus:ring-[#8A2638]/10 disabled:cursor-not-allowed disabled:opacity-60"
              />

              <p
                className={`mt-1.5 text-xs ${
                  form.password.length === 0
                    ? "text-gray-400"
                    : passwordValid
                    ? "text-green-600"
                    : "text-red-500"
                }`}
              >
                {form.password.length === 0
                  ? "Use at least 8 characters."
                  : passwordValid
                  ? "✓ Password length is valid."
                  : "Password must contain at least 8 characters."}
              </p>
            </div>

            {/* Confirm */}

            <div>
              <label
                htmlFor="confirmPassword"
                className="mb-1.5 block text-sm font-bold text-[#21191B]"
              >
                Confirm new password
              </label>

              <input
                id="confirmPassword"
                type="password"
                name="confirmPassword"
                value={form.confirmPassword}
                onChange={handleChange}
                placeholder="Enter your password again"
                autoComplete="new-password"
                required
                disabled={loading || !!success}
                className="w-full rounded-xl border border-[#E7DDDF] bg-[#FBF8F8] px-4 py-3 text-sm text-[#21191B] outline-none transition placeholder:text-gray-400 focus:border-[#8A2638] focus:bg-white focus:ring-4 focus:ring-[#8A2638]/10 disabled:cursor-not-allowed disabled:opacity-60"
              />

              {form.confirmPassword && (
                <p
                  className={`mt-1.5 text-xs ${
                    passwordsMatch
                      ? "text-green-600"
                      : "text-red-500"
                  }`}
                >
                  {passwordsMatch
                    ? "✓ Passwords match."
                    : "Passwords do not match."}
                </p>
              )}
            </div>

            {/* Submit */}

            <button
              type="submit"
              disabled={loading || !!success}
              className="w-full rounded-xl bg-[#5B1725] px-5 py-3 text-sm font-bold text-white shadow-md shadow-[#5B1725]/20 transition hover:bg-[#3D0F18] hover:shadow-lg disabled:cursor-not-allowed disabled:opacity-60"
            >
              {loading ? (
                <span className="flex items-center justify-center gap-2.5">
                  <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />

                  Updating password...
                </span>
              ) : (
                "Reset password"
              )}
            </button>
          </form>

          <div className="mt-6 text-center">
            <Link
              to="/login"
              className="text-sm font-bold text-[#8A2638] transition hover:text-[#3D0F18]"
            >
              ← Back to login
            </Link>
          </div>

          <div className="mt-6 flex items-center justify-center gap-2 text-[11px] text-gray-400">
            <span>🔒</span>
            <span>
              Your new password is securely encrypted.
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ResetPassword;

