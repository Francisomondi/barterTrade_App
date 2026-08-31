
import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";

import { useAuth } from "../context/AuthContext";

const Register = () => {
  const navigate = useNavigate();
  const { register } = useAuth();

  const [form, setForm] = useState({
    name: "",
    email: "",
    phone: "",
    password: "",
    confirmPassword: "",
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

    if (!form.name || !form.email || !form.password) {
      setError(
        "Name, email and password are required."
      );
      return;
    }

    if (form.password.length < 8) {
      setError(
        "Password must be at least 8 characters."
      );
      return;
    }

    if (form.password !== form.confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    try {
      setLoading(true);

      await register({
        name: form.name,
        email: form.email,
        phone: form.phone || undefined,
        password: form.password,
      });

      navigate("/dashboard");
    } catch (error) {
      setError(
        error.response?.data?.message ||
          "Registration failed. Please try again."
      );
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleRegister = () => {
    window.location.href =
      "http://localhost:5000/api/auth/google";
  };

  return (
    <div className="relative min-h-screen overflow-hidden bg-[#F8F5F3]">

      {/* =====================================================
          BACKGROUND
      ====================================================== */}

      <div className="absolute inset-0">

        {/* Main maroon shape */}

        <div className="absolute -right-40 -top-40 h-[550px] w-[550px] rounded-full bg-[#3D0F18]" />

        {/* Bottom glow */}

        <div className="absolute -bottom-48 -left-40 h-[550px] w-[550px] rounded-full bg-[#8A2638]/20 blur-3xl" />

        {/* Decorative glow */}

        <div className="absolute left-[20%] top-[15%] h-32 w-32 rounded-full bg-[#DCAEB7]/20 blur-3xl" />

      </div>

      {/* =====================================================
          MAIN CONTENT
      ====================================================== */}

      <div className="relative z-10 flex min-h-screen items-center justify-center px-6 py-10">

        <div className="grid w-full max-w-6xl overflow-hidden rounded-[2rem] border border-[#E7DDDF] bg-white shadow-2xl lg:grid-cols-2">

          {/* =================================================
              LEFT BRAND PANEL
          ================================================== */}

          <div className="relative hidden overflow-hidden bg-[#3D0F18] p-12 text-white lg:flex lg:flex-col lg:justify-between">

            {/* Glows */}

            <div className="absolute -right-32 -top-32 h-96 w-96 rounded-full bg-[#8A2638]/50 blur-3xl" />

            <div className="absolute -bottom-40 -left-20 h-96 w-96 rounded-full bg-[#701F30]/50 blur-3xl" />

            {/* Decorative circles */}

            <div className="absolute right-20 top-28 h-24 w-24 rounded-full border border-white/10 bg-white/5 backdrop-blur-md" />

            <div className="absolute bottom-36 right-32 h-14 w-14 rounded-full border border-white/10 bg-white/5" />

            {/* Logo */}

            <div className="relative">

              <div className="flex items-center gap-3">

                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#8A2638] text-2xl font-bold shadow-lg">
                  ⇄
                </div>

                <div>

                  <h2 className="text-xl font-black">
                    Barter Trade
                  </h2>

                  <p className="text-xs text-white/50">
                    Trade smarter
                  </p>

                </div>

              </div>

            </div>

            {/* Main brand message */}

            <div className="relative">

              <p className="mb-4 text-sm font-bold uppercase tracking-[0.25em] text-[#DCAEB7]">
                Join the marketplace
              </p>

              <h2 className="max-w-lg text-4xl font-black leading-tight xl:text-5xl">

                Turn what you have

                <br />

                <span className="text-[#DCAEB7]">
                  into what you need.
                </span>

              </h2>

              <p className="mt-6 max-w-md text-base leading-7 text-white/60">
                Create your account and discover
                a smarter way to exchange valuable
                items with people around you.
              </p>

              {/* Features */}

              <div className="mt-8 space-y-4">

                <div className="flex items-center gap-3">

                  <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-white/10">
                    ✓
                  </div>

                  <span className="text-sm text-white/70">
                    Exchange items of similar value
                  </span>

                </div>

                <div className="flex items-center gap-3">

                  <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-white/10">
                    ✓
                  </div>

                  <span className="text-sm text-white/70">
                    Connect with trusted traders
                  </span>

                </div>

                <div className="flex items-center gap-3">

                  <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-white/10">
                    ✓
                  </div>

                  <span className="text-sm text-white/70">
                    Build your barter reputation
                  </span>

                </div>

              </div>

            </div>

            {/* Footer */}

            <div className="relative text-sm text-white/40">
              © {new Date().getFullYear()} Barter Trade
            </div>

          </div>

          {/* =================================================
              REGISTER FORM
          ================================================== */}

          <div className="flex items-center justify-center p-7 sm:p-10 lg:p-12">

            <div className="w-full max-w-md">

              {/* Mobile logo */}

              <div className="mb-7 flex items-center gap-3 lg:hidden">

                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#5B1725] text-xl font-bold text-white">
                  ⇄
                </div>

                <div>

                  <h2 className="font-black text-[#21191B]">
                    Barter Trade
                  </h2>

                  <p className="text-xs text-gray-500">
                    Trade smarter
                  </p>

                </div>

              </div>

              {/* Heading */}

              <div className="mb-7">

                <p className="mb-2 text-sm font-bold uppercase tracking-[0.2em] text-[#8A2638]">
                  Get started
                </p>

                <h1 className="text-3xl font-black tracking-tight text-[#21191B] sm:text-4xl">
                  Create your account
                </h1>

                <p className="mt-3 text-sm leading-6 text-gray-500">
                  Join Barter Trade and start
                  exchanging items with other
                  traders.
                </p>

              </div>

              {/* Error */}

              {error && (
                <div className="mb-6 flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">

                  <span className="mt-0.5">
                    ⚠
                  </span>

                  <span>
                    {error}
                  </span>

                </div>
              )}

              {/* =================================================
                  FORM
              ================================================== */}

              <form
                onSubmit={handleSubmit}
                className="space-y-4"
              >

                {/* NAME */}

                <div>

                  <label
                    htmlFor="name"
                    className="mb-2 block text-sm font-bold text-[#21191B]"
                  >
                    Full name
                  </label>

                  <input
                    id="name"
                    type="text"
                    name="name"
                    value={form.name}
                    onChange={handleChange}
                    placeholder="Enter your full name"
                    autoComplete="name"
                    className="w-full rounded-xl border border-[#E7DDDF] bg-[#FBF8F8] px-4 py-3.5 text-sm text-[#21191B] outline-none transition placeholder:text-gray-400 focus:border-[#8A2638] focus:bg-white focus:ring-4 focus:ring-[#8A2638]/10"
                  />

                </div>

                {/* EMAIL */}

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
                    value={form.email}
                    onChange={handleChange}
                    placeholder="you@example.com"
                    autoComplete="email"
                    className="w-full rounded-xl border border-[#E7DDDF] bg-[#FBF8F8] px-4 py-3.5 text-sm text-[#21191B] outline-none transition placeholder:text-gray-400 focus:border-[#8A2638] focus:bg-white focus:ring-4 focus:ring-[#8A2638]/10"
                  />

                </div>

                {/* PHONE */}

                <div>

                  <label
                    htmlFor="phone"
                    className="mb-2 block text-sm font-bold text-[#21191B]"
                  >
                    Phone number
                    <span className="ml-1 text-xs font-normal text-gray-400">
                      (optional)
                    </span>
                  </label>

                  <input
                    id="phone"
                    type="tel"
                    name="phone"
                    value={form.phone}
                    onChange={handleChange}
                    placeholder="07XXXXXXXX"
                    autoComplete="tel"
                    className="w-full rounded-xl border border-[#E7DDDF] bg-[#FBF8F8] px-4 py-3.5 text-sm text-[#21191B] outline-none transition placeholder:text-gray-400 focus:border-[#8A2638] focus:bg-white focus:ring-4 focus:ring-[#8A2638]/10"
                  />

                </div>

                {/* PASSWORD */}

                <div>

                  <label
                    htmlFor="password"
                    className="mb-2 block text-sm font-bold text-[#21191B]"
                  >
                    Password
                  </label>

                  <input
                    id="password"
                    type="password"
                    name="password"
                    value={form.password}
                    onChange={handleChange}
                    placeholder="Minimum 8 characters"
                    autoComplete="new-password"
                    className="w-full rounded-xl border border-[#E7DDDF] bg-[#FBF8F8] px-4 py-3.5 text-sm text-[#21191B] outline-none transition placeholder:text-gray-400 focus:border-[#8A2638] focus:bg-white focus:ring-4 focus:ring-[#8A2638]/10"
                  />

                  <p className="mt-1.5 text-xs text-gray-400">
                    Use at least 8 characters.
                  </p>

                </div>

                {/* CONFIRM PASSWORD */}

                <div>

                  <label
                    htmlFor="confirmPassword"
                    className="mb-2 block text-sm font-bold text-[#21191B]"
                  >
                    Confirm password
                  </label>

                  <input
                    id="confirmPassword"
                    type="password"
                    name="confirmPassword"
                    value={form.confirmPassword}
                    onChange={handleChange}
                    placeholder="Confirm your password"
                    autoComplete="new-password"
                    className="w-full rounded-xl border border-[#E7DDDF] bg-[#FBF8F8] px-4 py-3.5 text-sm text-[#21191B] outline-none transition placeholder:text-gray-400 focus:border-[#8A2638] focus:bg-white focus:ring-4 focus:ring-[#8A2638]/10"
                  />

                </div>

                {/* CREATE ACCOUNT */}

                <button
                  type="submit"
                  disabled={loading}
                  className="mt-2 w-full rounded-xl bg-[#5B1725] px-5 py-3.5 text-sm font-bold text-white shadow-lg shadow-[#5B1725]/20 transition duration-200 hover:bg-[#3D0F18] hover:shadow-xl disabled:cursor-not-allowed disabled:opacity-60"
                >

                  {loading ? (
                    <span className="flex items-center justify-center gap-3">

                      <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />

                      Creating account...

                    </span>
                  ) : (
                    "Create Account"
                  )}

                </button>

              </form>

              {/* =================================================
                  DIVIDER
              ================================================== */}

              <div className="my-6 flex items-center gap-4">

                <div className="h-px flex-1 bg-[#E7DDDF]" />

                <span className="text-xs font-semibold text-gray-400">
                  OR
                </span>

                <div className="h-px flex-1 bg-[#E7DDDF]" />

              </div>

              {/* =================================================
                  GOOGLE
              ================================================== */}

              <button
                type="button"
                onClick={handleGoogleRegister}
                className="flex w-full items-center justify-center gap-3 rounded-xl border border-[#E7DDDF] bg-white px-5 py-3.5 text-sm font-bold text-[#21191B] shadow-sm transition hover:border-[#8A2638] hover:bg-[#FBF5F6] hover:shadow-md"
              >

                <svg
                  width="20"
                  height="20"
                  viewBox="0 0 24 24"
                  fill="none"
                  xmlns="http://www.w3.org/2000/svg"
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
                  LOGIN LINK
              ================================================== */}

              <p className="mt-7 text-center text-sm text-gray-500">

                Already have an account?{" "}

                <Link
                  to="/login"
                  className="font-bold text-[#8A2638] transition hover:text-[#3D0F18]"
                >
                  Login
                </Link>

              </p>

              {/* Terms */}

              <p className="mt-5 text-center text-xs leading-5 text-gray-400">
                By creating an account, you agree to
                use Barter Trade responsibly and
                honestly.
              </p>

            </div>

          </div>

        </div>

      </div>

    </div>
  );
};

export default Register;
