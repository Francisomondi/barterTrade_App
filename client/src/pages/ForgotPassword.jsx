
import { useState } from "react";
import { Link } from "react-router-dom";
import { forgotPassword } from "../api/authApi";

const ForgotPassword = () => {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const handleSubmit = async (event) => {
    event.preventDefault();

    setError("");
    setSuccess("");

    if (!email.trim()) {
      setError("Please enter your email address.");
      return;
    }

    try {
      setLoading(true);

      const response = await forgotPassword(
        email.trim()
      );

      setSuccess(
        response.message ||
          "If an account exists with this email, a password reset link has been sent."
      );
    } catch (error) {
      setError(
        error.response?.data?.message ||
          "Unable to process your request. Please try again."
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
              Account recovery
            </p>

            <h1 className="text-3xl font-black tracking-tight text-[#21191B]">
              Forgot your password?
            </h1>

            <p className="mt-2 text-sm leading-5 text-gray-500">
              Enter the email address associated with
              your account and we'll send you a link
              to reset your password.
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
                Check your email
              </p>

              <p className="mt-1">
                {success}
              </p>
            </div>
          )}

          {/* Form */}

          <form
            onSubmit={handleSubmit}
            className="space-y-4"
          >
            <div>
              <label
                htmlFor="email"
                className="mb-1.5 block text-sm font-bold text-[#21191B]"
              >
                Email address
              </label>

              <input
                id="email"
                type="email"
                value={email}
                onChange={(event) =>
                  setEmail(event.target.value)
                }
                placeholder="you@example.com"
                autoComplete="email"
                required
                disabled={loading || !!success}
                className="w-full rounded-xl border border-[#E7DDDF] bg-[#FBF8F8] px-4 py-3 text-sm text-[#21191B] outline-none transition placeholder:text-gray-400 focus:border-[#8A2638] focus:bg-white focus:ring-4 focus:ring-[#8A2638]/10 disabled:cursor-not-allowed disabled:opacity-60"
              />
            </div>

            <button
              type="submit"
              disabled={loading || !!success}
              className="w-full rounded-xl bg-[#5B1725] px-5 py-3 text-sm font-bold text-white shadow-md shadow-[#5B1725]/20 transition hover:bg-[#3D0F18] hover:shadow-lg disabled:cursor-not-allowed disabled:opacity-60"
            >
              {loading ? (
                <span className="flex items-center justify-center gap-2.5">
                  <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />

                  Sending link...
                </span>
              ) : (
                "Send reset link"
              )}
            </button>
          </form>

          {/* Back */}

          <div className="mt-6 text-center">
            <Link
              to="/login"
              className="text-sm font-bold text-[#8A2638] transition hover:text-[#3D0F18]"
            >
              ← Back to login
            </Link>
          </div>

          {/* Security */}

          <div className="mt-6 flex items-center justify-center gap-2 text-[11px] text-gray-400">
            <span>🔒</span>
            <span>
              Your account information is protected.
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ForgotPassword;

