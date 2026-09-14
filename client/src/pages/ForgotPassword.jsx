import { useState } from "react";
import { Link } from "react-router-dom";

import { forgotPassword } from "../api/authApi";

const ForgotPassword = () => {
  const [email, setEmail] = useState("");

  const [loading, setLoading] =
    useState(false);

  const [success, setSuccess] =
    useState("");

  const [error, setError] =
    useState("");

  const handleSubmit = async (event) => {
    event.preventDefault();

    setError("");
    setSuccess("");

    const normalizedEmail =
      email.toLowerCase().trim();

    if (!normalizedEmail) {
      setError(
        "Please enter your email address."
      );

      return;
    }

    try {
      setLoading(true);

      const response =
        await forgotPassword(
          normalizedEmail
        );

      setSuccess(
        response?.message ||
          "If an account exists with this email, a password reset link has been sent."
      );

      /*
       * Clear the form after successful request.
       */
      setEmail("");
    } catch (error) {
      console.error(
        "FORGOT PASSWORD ERROR:",
        error
      );

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
      {/* =====================================================
          BACKGROUND DECORATION
      ====================================================== */}

      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -left-40 -top-40 h-80 w-80 rounded-full bg-[#3D0F18]" />

        <div className="absolute -bottom-40 -right-40 h-80 w-80 rounded-full bg-[#8A2638]/10 blur-3xl" />

        <div className="absolute right-[15%] top-[15%] h-24 w-24 rounded-full bg-[#DCAEB7]/20 blur-2xl" />
      </div>

      {/* =====================================================
          CONTENT
      ====================================================== */}

      <div className="relative z-10 flex min-h-screen items-center justify-center px-4 py-8">
        <div className="w-full max-w-md">

          {/* =================================================
              CARD
          ================================================== */}

          <div className="overflow-hidden rounded-[1.75rem] border border-[#E7DDDF] bg-white shadow-xl">

            {/* =================================================
                LOGO
            ================================================== */}

            <div className="flex justify-center px-6 pt-8">
              <div className="flex items-center gap-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-[#5B1725] text-xl font-black text-white shadow-md">
                  ⇄
                </div>

                <div>
                  <h2 className="text-lg font-black text-[#21191B]">
                    BarterConnect
                  </h2>

                  <p className="text-[11px] text-gray-500">
                    Trade smarter
                  </p>
                </div>
              </div>
            </div>

            {/* =================================================
                MAIN CONTENT
            ================================================== */}

            <div className="px-6 py-8 sm:px-10">

              <div className="mb-7 text-center">
                <p className="mb-2 text-xs font-bold uppercase tracking-[0.18em] text-[#8A2638]">
                  Account recovery
                </p>

                <h1 className="text-3xl font-black tracking-tight text-[#21191B]">
                  Forgot your password?
                </h1>

                <p className="mx-auto mt-3 max-w-sm text-sm leading-6 text-gray-500">
                  Enter the email address associated
                  with your BarterConnect account and
                  we'll send you a secure link to create
                  a new password.
                </p>
              </div>

              {/* =================================================
                  SUCCESS
              ================================================== */}

              {success && (
                <div
                  role="status"
                  className="mb-5 rounded-xl border border-green-200 bg-green-50 px-4 py-3 text-sm leading-6 text-green-700"
                >
                  <div className="font-bold">
                    Check your email
                  </div>

                  <div className="mt-1">
                    {success}
                  </div>
                </div>
              )}

              {/* =================================================
                  ERROR
              ================================================== */}

              {error && (
                <div
                  role="alert"
                  className="mb-5 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm leading-6 text-red-700"
                >
                  {error}
                </div>
              )}

              {/* =================================================
                  FORM
              ================================================== */}

              <form
                onSubmit={handleSubmit}
                className="space-y-5"
              >

                <div>
                  <label
                    htmlFor="email"
                    className="mb-2 block text-sm font-bold text-[#21191B]"
                  >
                    Email address
                  </label>

                  <input
                    id="email"
                    type="email"
                    name="email"
                    value={email}
                    onChange={(event) =>
                      setEmail(
                        event.target.value
                      )
                    }
                    placeholder="you@example.com"
                    autoComplete="email"
                    required
                    className="w-full rounded-xl border border-[#E7DDDF] bg-[#FBF8F8] px-4 py-3.5 text-sm text-[#21191B] outline-none transition placeholder:text-gray-400 focus:border-[#8A2638] focus:bg-white focus:ring-4 focus:ring-[#8A2638]/10"
                  />
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full rounded-xl bg-[#5B1725] px-5 py-3.5 text-sm font-bold text-white shadow-md shadow-[#5B1725]/20 transition hover:bg-[#3D0F18] hover:shadow-lg disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {loading ? (
                    <span className="flex items-center justify-center gap-2.5">
                      <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />

                      Sending link...
                    </span>
                  ) : (
                    "Send Password Link"
                  )}
                </button>
              </form>

              {/* =================================================
                  BACK TO LOGIN
              ================================================== */}

              <div className="mt-7 text-center">
                <Link
                  to="/login"
                  className="text-sm font-bold text-[#8A2638] transition hover:text-[#3D0F18]"
                >
                  ← Back to login
                </Link>
              </div>

              {/* =================================================
                  SECURITY NOTE
              ================================================== */}

              <div className="mt-6 flex items-center justify-center gap-2 text-[11px] text-gray-400">
                <span>🔒</span>

                <span>
                  Your account information is protected.
                </span>
              </div>
            </div>
          </div>

          {/* =================================================
              FOOTER
          ================================================== */}

          <p className="mt-5 text-center text-xs text-gray-400">
            © {new Date().getFullYear()} BarterConnect
          </p>
        </div>
      </div>
    </div>
  );
};

export default ForgotPassword;