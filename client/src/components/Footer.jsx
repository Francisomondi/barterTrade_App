
import { Link } from "react-router-dom";

const Footer = () => {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="border-t border-[#E7DDDF] bg-[#3D0F18] text-white">
      <div className="mx-auto w-full max-w-7xl px-5 py-10 sm:px-6 lg:px-8">

        {/* =====================================================
            MAIN FOOTER
        ====================================================== */}
        <div className="grid gap-10 md:grid-cols-2 lg:grid-cols-3">

          {/* =================================================
              LOGO / ABOUT
          ================================================== */}
          <div>
            <Link
              to="/marketplace"
              className="inline-flex items-center gap-3"
            >
              <div className="flex h-14 w-44 items-center justify-center overflow-hidden rounded-xl bg-white shadow-md">
                <img
                  src="/images/logo4.png"
                  alt="BarterConnect"
                  className="h-full w-full object-contain"
                />
              </div>

              <div>
                <h2 className="text-lg font-black tracking-tight">
                  BarterConnect
                </h2>

                <p className="text-xs font-medium text-[#DCAEB7]">
                  Trade smarter
                </p>
              </div>
            </Link>

            <p className="mt-5 max-w-sm text-sm leading-6 text-white/60">
              Trade what you have for what you need.
              Discover useful items around you and
              exchange them with people in your community.
            </p>

            <div className="mt-5 inline-flex items-center rounded-full border border-white/10 bg-white/5 px-4 py-2 text-xs font-semibold text-[#DCAEB7]">
              Trade what you have. Get what you need.
            </div>
          </div>

          {/* =================================================
              CONTACT
          ================================================== */}
          <div>
            <h3 className="mb-5 text-sm font-black uppercase tracking-[0.18em] text-[#DCAEB7]">
              Contact Us
            </h3>

            <div className="space-y-4">

              {/* Email */}
              <a
                href="mailto:support@barterconnect.com"
                className="group flex items-start gap-3 text-sm text-white/70 transition hover:text-white"
              >
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-white/5 text-base transition group-hover:bg-[#8A2638]">
                  ✉
                </span>

                <span className="pt-1">
                  <span className="block text-xs text-white/40">
                    Email
                  </span>

                  <span className="font-medium">
                    support@barterconnect.com
                  </span>
                </span>
              </a>

              {/* Phone */}
              <a
                href="tel:+254000000000"
                className="group flex items-start gap-3 text-sm text-white/70 transition hover:text-white"
              >
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-white/5 text-base transition group-hover:bg-[#8A2638]">
                  ☎
                </span>

                <span className="pt-1">
                  <span className="block text-xs text-white/40">
                    Customer support Phone
                  </span>

                  <span className="font-medium">
                    +254 0119712745
                  </span>
                </span>
              </a>

              {/* Location */}
              <div className="flex items-start gap-3 text-sm text-white/70">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-white/5 text-base">
                  📍
                </span>

                <span className="pt-1">
                  <span className="block text-xs text-white/40">
                    Location
                  </span>

                  <span className="font-medium">
                    Kenya
                  </span>
                </span>
              </div>

            </div>
          </div>

          {/* =================================================
              SOCIAL + QUICK LINKS
          ================================================== */}
          <div>
            <h3 className="mb-5 text-sm font-black uppercase tracking-[0.18em] text-[#DCAEB7]">
              Connect With Us
            </h3>

            <p className="mb-5 max-w-sm text-sm leading-6 text-white/60">
              Follow BarterConnect for updates, new listings,
              trading tips and community news.
            </p>

            {/* Social links */}
            <div className="flex flex-wrap gap-3">

              <a
                href="#"
                aria-label="Facebook"
                className="flex h-10 w-10 items-center justify-center rounded-xl border border-white/10 bg-white/5 text-sm font-black transition hover:-translate-y-1 hover:bg-[#8A2638] hover:text-white"
              >
                f
              </a>

              <a
                href="#"
                aria-label="Instagram"
                className="flex h-10 w-10 items-center justify-center rounded-xl border border-white/10 bg-white/5 text-sm font-black transition hover:-translate-y-1 hover:bg-[#8A2638] hover:text-white"
              >
                ◎
              </a>

              <a
                href="#"
                aria-label="X"
                className="flex h-10 w-10 items-center justify-center rounded-xl border border-white/10 bg-white/5 text-sm font-black transition hover:-translate-y-1 hover:bg-[#8A2638] hover:text-white"
              >
                𝕏
              </a>

              <a
                href="#"
                aria-label="LinkedIn"
                className="flex h-10 w-10 items-center justify-center rounded-xl border border-white/10 bg-white/5 text-sm font-black transition hover:-translate-y-1 hover:bg-[#8A2638] hover:text-white"
              >
                in
              </a>

            </div>

            {/* Quick links */}
            <div className="mt-7 flex flex-wrap gap-x-5 gap-y-3 text-sm text-white/50">

              <Link
                to="/marketplace"
                className="transition hover:text-[#DCAEB7]"
              >
                Marketplace
              </Link>

              <Link
                to="/login"
                className="transition hover:text-[#DCAEB7]"
              >
                Login
              </Link>

              <Link
                to="/register"
                className="transition hover:text-[#DCAEB7]"
              >
                Register
              </Link>

            </div>
          </div>
        </div>

        {/* =====================================================
            DIVIDER
        ====================================================== */}
        <div className="my-8 h-px bg-white/10" />

        {/* =====================================================
            BOTTOM FOOTER
        ====================================================== */}
        <div className="flex flex-col gap-4 text-xs text-white/40 sm:flex-row sm:items-center sm:justify-between">

          <p>
            © {currentYear} BarterConnect. All rights reserved.
          </p>

          <div className="flex flex-wrap gap-5">
            <span className="transition hover:text-white">
              Secure trading
            </span>

            <span className="transition hover:text-white">
              Trusted community
            </span>

            <span className="transition hover:text-white">
              Trade smarter
            </span>
          </div>

        </div>

      </div>
    </footer>
  );
};

export default Footer;

