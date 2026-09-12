
import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

const Login = () => {
  const navigate = useNavigate();
  const { login } = useAuth();

  const [form, setForm] = useState({
    email: "",
    password: "",
  });

  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleChange = (event) => {
    setForm({
      ...form,
      [event.target.name]: event.target.value,
    });
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    setError("");

    if (!form.email || !form.password) {
      setError("Email and password are required.");
      return;
    }

    try {
      setLoading(true);

      await login({
        email: form.email,
        password: form.password,
      });

      navigate("/dashboard");
    } catch (error) {
      setError(
        error.response?.data?.message ||
          "Login failed. Please check your credentials."
      );
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = () => {
    window.location.href =
      "http://localhost:5000/api/auth/google";
  };

  return (
    <div className="relative min-h-screen overflow-hidden bg-[#F8F5F3]">
      {/* =====================================================
          BACKGROUND DECORATION
      ====================================================== */}

      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -left-48 -top-48 h-[420px] w-[420px] rounded-full bg-[#3D0F18]" />

        <div className="absolute -bottom-48 -right-48 h-[420px] w-[420px] rounded-full bg-[#8A2638]/15 blur-3xl" />

        <div className="absolute right-[12%] top-[12%] h-24 w-24 rounded-full bg-[#DCAEB7]/20 blur-2xl" />

        <div className="absolute bottom-[15%] left-[8%] h-20 w-20 rounded-full bg-[#701F30]/10 blur-xl" />
      </div>

      {/* =====================================================
          PAGE CONTENT
      ====================================================== */}

      <div className="relative z-10 flex min-h-screen items-center justify-center px-4 py-6 sm:px-6 sm:py-8">
        <div className="grid w-full max-w-5xl overflow-hidden rounded-[1.75rem] border border-[#E7DDDF] bg-white shadow-xl lg:grid-cols-2">
          
          {/* =================================================
              DESKTOP BRAND PANEL
          ================================================== */}

          <div className="relative hidden overflow-hidden bg-[#3D0F18] px-10 py-8 text-white lg:flex lg:flex-col lg:justify-between xl:px-12">
            
            {/* Decorative background */}

            <div className="pointer-events-none absolute -right-28 -top-28 h-72 w-72 rounded-full bg-[#8A2638]/40 blur-3xl" />

            <div className="pointer-events-none absolute -bottom-36 -left-24 h-80 w-80 rounded-full bg-[#701F30]/40 blur-3xl" />

            <div className="pointer-events-none absolute right-12 top-24 h-16 w-16 rounded-full border border-white/10 bg-white/5" />

            <div className="pointer-events-none absolute bottom-24 right-20 h-10 w-10 rounded-full border border-white/10 bg-white/5" />

            {/* Logo */}

            <div className="relative flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#8A2638] text-xl font-black shadow-lg">
                ⇄
              </div>

              <div>
                <h2 className="text-lg font-black">
                  Barter Trade
                </h2>

                <p className="text-[11px] text-white/50">
                  Trade smarter
                </p>
              </div>
            </div>

            {/* Main message */}

            <div className="relative py-6">
              <p className="mb-3 text-xs font-bold uppercase tracking-[0.2em] text-[#DCAEB7]">
                Welcome back
              </p>

              <h2 className="max-w-md text-4xl font-black leading-[1.08] xl:text-[2.75rem]">
                Trade what you have.
                <br />

                <span className="text-[#DCAEB7]">
                  Get what you need.
                </span>
              </h2>

              <p className="mt-5 max-w-md text-sm leading-6 text-white/60">
                Discover items from people around you
                and exchange things of similar value
                without the traditional buying and
                selling process.
              </p>

              {/* Feature pills */}

              <div className="mt-6 flex flex-wrap gap-2">
                <div className="rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-xs text-white/70">
                  ✓ Fair-value trades
                </div>

                <div className="rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-xs text-white/70">
                  ✓ Trusted users
                </div>

                <div className="rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-xs text-white/70">
                  ✓ Secure trading
                </div>
              </div>
            </div>

            {/* Footer */}

            <div className="relative text-xs text-white/35">
              © {new Date().getFullYear()} Barter Trade
            </div>
          </div>

          {/* =================================================
              LOGIN PANEL
          ================================================== */}

          <div className="flex items-center justify-center px-6 py-7 sm:px-10 sm:py-9 lg:px-10 xl:px-12">
            <div className="w-full max-w-sm">

              {/* =================================================
                  MOBILE LOGO
              ================================================== */}

              <div className="mb-6 flex items-center gap-3 lg:hidden">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#5B1725] text-lg font-bold text-white shadow-sm">
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

              {/* =================================================
                  HEADING
              ================================================== */}

              <div className="mb-6">
                <p className="mb-1.5 text-xs font-bold uppercase tracking-[0.18em] text-[#8A2638]">
                  Account login
                </p>

                <h1 className="text-3xl font-black tracking-tight text-[#21191B]">
                  Welcome back
                </h1>

                <p className="mt-2 text-sm leading-5 text-gray-500">
                  Login to continue trading on Barter Trade.
                </p>
              </div>

              {/* =================================================
                  ERROR MESSAGE
              ================================================== */}

              {error && (
                <div
                  role="alert"
                  className="mb-5 flex items-start gap-2.5 rounded-xl border border-red-200 bg-red-50 px-3.5 py-3 text-sm text-red-700"
                >
                  <span className="mt-0.5 shrink-0">
                    ⚠
                  </span>

                  <span>{error}</span>
                </div>
              )}

              {/* =================================================
                  LOGIN FORM
              ================================================== */}

              <form
                onSubmit={handleSubmit}
                className="space-y-4"
              >
                {/* EMAIL */}

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
                    name="email"
                    value={form.email}
                    onChange={handleChange}
                    placeholder="you@example.com"
                    autoComplete="email"
                    required
                    className="w-full rounded-xl border border-[#E7DDDF] bg-[#FBF8F8] px-4 py-3 text-sm text-[#21191B] outline-none transition placeholder:text-gray-400 focus:border-[#8A2638] focus:bg-white focus:ring-4 focus:ring-[#8A2638]/10"
                  />
                </div>

                {/* PASSWORD */}

                <div>
                  <div className="mb-1.5 flex items-center justify-between gap-3">
                    <label
                      htmlFor="password"
                      className="block text-sm font-bold text-[#21191B]"
                    >
                      Password
                    </label>

                    <button
                      type="button"
                      className="text-xs font-semibold text-[#8A2638] transition hover:text-[#3D0F18]"
                    >
                      Forgot password?
                    </button>
                  </div>

                  <input
                    id="password"
                    type="password"
                    name="password"
                    value={form.password}
                    onChange={handleChange}
                    placeholder="Enter your password"
                    autoComplete="current-password"
                    required
                    className="w-full rounded-xl border border-[#E7DDDF] bg-[#FBF8F8] px-4 py-3 text-sm text-[#21191B] outline-none transition placeholder:text-gray-400 focus:border-[#8A2638] focus:bg-white focus:ring-4 focus:ring-[#8A2638]/10"
                  />
                </div>

                {/* LOGIN BUTTON */}

                <button
                  type="submit"
                  disabled={loading}
                  className="mt-1 w-full rounded-xl bg-[#5B1725] px-5 py-3 text-sm font-bold text-white shadow-md shadow-[#5B1725]/20 transition duration-200 hover:bg-[#3D0F18] hover:shadow-lg disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {loading ? (
                    <span className="flex items-center justify-center gap-2.5">
                      <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />

                      Signing in...
                    </span>
                  ) : (
                    "Login"
                  )}
                </button>
              </form>

              {/* =================================================
                  DIVIDER
              ================================================== */}

              <div className="my-5 flex items-center gap-3">
                <div className="h-px flex-1 bg-[#E7DDDF]" />

                <span className="text-[10px] font-bold text-gray-400">
                  OR
                </span>

                <div className="h-px flex-1 bg-[#E7DDDF]" />
              </div>

              {/* =================================================
                  GOOGLE LOGIN
              ================================================== */}

              <button
                type="button"
                onClick={handleGoogleLogin}
                className="flex w-full items-center justify-center gap-3 rounded-xl border border-[#E7DDDF] bg-white px-5 py-3 text-sm font-bold text-[#21191B] shadow-sm transition hover:border-[#8A2638] hover:bg-[#FBF5F6] hover:shadow-md"
              >
                {/* Google icon */}

                <svg
                  width="19"
                  height="19"
                  viewBox="0 0 24 24"
                  fill="none"
                  xmlns="http://www.w3.org/2000/svg"
                  aria-hidden="true"
                >
                  <path
                    d="M21.805 10.023h-9.765v3.955h5.619c-.242 1.272-.968 2.35-2.056 3.072v2.55h3.32c1.944-1.79 3.062-4.427 3.062-7.577 0-.686-.061-1.347-.18-2z"
                    fill="#4285F4"
                  />

                  <path
                    d="M12.04 21c2.777 0 5.103-.92 6.803-2.5l-3.32-2.55c-.92.62-2.094.99-3.483.99-2.68 0-4.953-1.81-5.766-4.243H2.842v2.633A10.28 10.28 0 0 0 12.04 21z"
                    fill="#34A853"
                  />

                  <path
                    d="M6.274 12.697A6.18 6.18 0 0 1 5.95 10.75c0-.676.116-1.333.324-1.947V6.17H2.842A10.28 10.28 0 0 0 1.75 10.75c0 1.657.397 3.224 1.092 4.58l3.432-2.633z"
                    fill="#FBBC05"
                  />

                  <path
                    d="M12.04 4.56c1.51 0 2.867.52 3.936 1.54l2.95-2.95C17.137 1.52 14.812.5 12.04.5a10.28 10.28 0 0 0-9.198 5.67l3.432 2.633C7.087 6.37 9.36 4.56 12.04 4.56z"
                    fill="#EA4335"
                  />
                </svg>

                Continue with Google
              </button>

              {/* =================================================
                  REGISTER
              ================================================== */}

              <p className="mt-6 text-center text-sm text-gray-500">
                Don't have an account?{" "}

                <Link
                  to="/register"
                  className="font-bold text-[#8A2638] transition hover:text-[#3D0F18]"
                >
                  Create an account
                </Link>
              </p>

              {/* =================================================
                  SECURITY NOTE
              ================================================== */}

              <div className="mt-5 flex items-center justify-center gap-2 text-[11px] text-gray-400">
                <span>🔒</span>

                <span>
                  Your account information is protected.
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;

