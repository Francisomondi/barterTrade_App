
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

const Dashboard = () => {
  const navigate = useNavigate();
  const { user } = useAuth();

  /*
   * Create a safe avatar fallback using the user's initials.
   */
  const getInitials = (name = "") => {
    const parts = name.trim().split(/\s+/).filter(Boolean);

    if (parts.length === 0) return "U";

    if (parts.length === 1) {
      return parts[0].charAt(0).toUpperCase();
    }

    return (
      parts[0].charAt(0) +
      parts[parts.length - 1].charAt(0)
    ).toUpperCase();
  };

  const initials = getInitials(user?.name);

  return (
    <div className="min-h-screen bg-[#FAF7F5]">
      <main className="mx-auto w-full max-w-7xl px-4 py-6 sm:px-6 lg:px-8">

        {/* =====================================================
            TOP WELCOME SECTION
        ====================================================== */}
        <section className="relative overflow-hidden rounded-3xl bg-[#3D0F18] px-5 py-6 shadow-lg sm:px-7 sm:py-7 lg:px-8">

          {/* Decorative background */}
          <div className="pointer-events-none absolute -right-24 -top-24 h-64 w-64 rounded-full bg-[#C9A227]/15 blur-3xl" />

          <div className="pointer-events-none absolute -bottom-28 -left-20 h-64 w-64 rounded-full bg-[#8A2638]/40 blur-3xl" />

          <div className="relative flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">

            {/* Welcome content */}
            <div className="min-w-0">

              <p className="text-xs font-bold uppercase tracking-[0.2em] text-[#D8B84C]">
                Your BarterConnect dashboard
              </p>

              <h1 className="mt-2 text-2xl font-black tracking-tight text-white sm:text-3xl lg:text-4xl">
                Welcome back
                {user?.name ? `, ${user.name.split(" ")[0]}` : ""}
              </h1>

              <p className="mt-2 max-w-xl text-sm leading-6 text-white/65 sm:text-base">
                Manage your listings, discover new items and
                keep track of your trade offers.
              </p>

            </div>

            {/* =================================================
                USER AVATAR
            ================================================== */}
            <Link
              to="/profile"
              className="group flex shrink-0 items-center gap-3 self-start rounded-2xl border border-white/10 bg-white/5 p-2 pr-4 backdrop-blur transition hover:bg-white/10 sm:self-center"
            >

              <div className="relative">

                {user?.avatar ? (
                  <img
                    src={user.avatar}
                    alt={`${user?.name || "User"} avatar`}
                    className="h-14 w-14 rounded-full border-2 border-[#D8B84C] bg-white object-cover shadow-lg"
                    onError={(event) => {
                      event.currentTarget.style.display = "none";
                      event.currentTarget.nextElementSibling.style.display =
                        "flex";
                    }}
                  />
                ) : null}

                {/* Avatar fallback */}
                <div
                  className={`${
                    user?.avatar ? "hidden" : "flex"
                  } h-14 w-14 items-center justify-center rounded-full border-2 border-[#D8B84C] bg-[#8A2638] text-lg font-black text-white shadow-lg`}
                >
                  {initials}
                </div>

                {/* Online indicator */}
                <span className="absolute bottom-0 right-0 h-4 w-4 rounded-full border-2 border-[#3D0F18] bg-green-500" />

              </div>

              <div className="hidden min-w-0 sm:block">

                <p className="truncate text-sm font-bold text-white">
                  {user?.name || "User"}
                </p>

                <p className="max-w-[180px] truncate text-xs text-white/50">
                  {user?.email || "Welcome to BarterConnect"}
                </p>

              </div>

            </Link>

          </div>
        </section>

        {/* =====================================================
            QUICK ACTIONS
        ====================================================== */}
        <section className="mt-6">

          <div className="mb-4">
            <h2 className="text-lg font-black text-[#21191B]">
              Quick actions
            </h2>

            <p className="mt-1 text-sm text-gray-500">
              Everything you need to manage your barter activity.
            </p>
          </div>

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">

            {/* Marketplace */}
            <Link
              to="/marketplace"
              className="group rounded-2xl border border-[#E7DDDF] bg-white p-5 shadow-sm transition duration-200 hover:-translate-y-1 hover:border-[#C9A227]/50 hover:shadow-lg"
            >
              <div className="flex items-center justify-between">

                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#F5E8EB] text-xl">
                  🛍️
                </div>

                <span className="text-lg text-[#C9A227] transition group-hover:translate-x-1">
                  →
                </span>

              </div>

              <h3 className="mt-4 text-base font-black text-[#21191B]">
                Marketplace
              </h3>

              <p className="mt-1 text-sm leading-5 text-gray-500">
                Browse items available for barter.
              </p>
            </Link>

            {/* Create Listing */}
            <Link
              to="/listings/create"
              className="group rounded-2xl border border-[#E7DDDF] bg-white p-5 shadow-sm transition duration-200 hover:-translate-y-1 hover:border-[#C9A227]/50 hover:shadow-lg"
            >
              <div className="flex items-center justify-between">

                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#FBF3D8] text-xl">
                  ➕
                </div>

                <span className="text-lg text-[#C9A227] transition group-hover:translate-x-1">
                  →
                </span>

              </div>

              <h3 className="mt-4 text-base font-black text-[#21191B]">
                List an Item
              </h3>

              <p className="mt-1 text-sm leading-5 text-gray-500">
                Put something up for barter.
              </p>
            </Link>

            {/* My Listings */}
            <Link
              to="/my-listings"
              className="group rounded-2xl border border-[#E7DDDF] bg-white p-5 shadow-sm transition duration-200 hover:-translate-y-1 hover:border-[#C9A227]/50 hover:shadow-lg"
            >
              <div className="flex items-center justify-between">

                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#F5E8EB] text-xl">
                  📦
                </div>

                <span className="text-lg text-[#C9A227] transition group-hover:translate-x-1">
                  →
                </span>

              </div>

              <h3 className="mt-4 text-base font-black text-[#21191B]">
                My Listings
              </h3>

              <p className="mt-1 text-sm leading-5 text-gray-500">
                Manage your barter items.
              </p>
            </Link>

          </div>
        </section>

        {/* =====================================================
            TRADE OFFERS
        ====================================================== */}
        <section className="mt-6">

          <div
            onClick={() => navigate("/offers")}
            role="button"
            tabIndex={0}
            onKeyDown={(event) => {
              if (event.key === "Enter" || event.key === " ") {
                navigate("/offers");
              }
            }}
            className="group cursor-pointer overflow-hidden rounded-2xl border border-[#E7DDDF] bg-white shadow-sm transition duration-200 hover:-translate-y-1 hover:border-[#C9A227]/50 hover:shadow-lg"
          >

            <div className="flex flex-col gap-5 p-5 sm:flex-row sm:items-center sm:justify-between sm:p-6">

              <div className="flex items-start gap-4">

                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-[#F5E8EB] text-xl transition group-hover:scale-105">
                  🤝
                </div>

                <div>

                  <h3 className="text-lg font-black text-[#21191B]">
                    My Trade Offers
                  </h3>

                  <p className="mt-1 max-w-2xl text-sm leading-6 text-gray-500">
                    View offers you've received and offers
                    you've sent to other traders.
                  </p>

                </div>

              </div>

              <div className="flex shrink-0 items-center gap-2 font-bold text-[#5B1725]">
                Manage Offers
                <span className="transition group-hover:translate-x-1">
                  →
                </span>
              </div>

            </div>

            {/* Gold accent */}
            <div className="h-1 w-0 bg-[#C9A227] transition-all duration-300 group-hover:w-full" />

          </div>

        </section>

        {/* =====================================================
            ACCOUNT SUMMARY
        ====================================================== */}
        <section className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">

          <div className="rounded-2xl border border-[#E7DDDF] bg-white p-5 shadow-sm">

            <p className="text-xs font-bold uppercase tracking-wider text-gray-400">
              Barter score
            </p>

            <div className="mt-2 flex items-end gap-2">
              <span className="text-2xl font-black text-[#5B1725]">
                {user?.barterScore ?? 0}
              </span>

              <span className="mb-1 text-xs text-gray-400">
                points
              </span>
            </div>

          </div>

          <div className="rounded-2xl border border-[#E7DDDF] bg-white p-5 shadow-sm">

            <p className="text-xs font-bold uppercase tracking-wider text-gray-400">
              Completed trades
            </p>

            <div className="mt-2 flex items-end gap-2">
              <span className="text-2xl font-black text-[#5B1725]">
                {user?.completedTrades ?? 0}
              </span>

              <span className="mb-1 text-xs text-gray-400">
                trades
              </span>
            </div>

          </div>

          <div className="rounded-2xl border border-[#E7DDDF] bg-white p-5 shadow-sm sm:col-span-2 lg:col-span-1">

            <p className="text-xs font-bold uppercase tracking-wider text-gray-400">
              Account
            </p>

            <div className="mt-2 flex items-center gap-2">

              <span className="h-2.5 w-2.5 rounded-full bg-green-500" />

              <span className="text-sm font-bold text-[#21191B]">
                {user?.status || "Active"}
              </span>

            </div>

          </div>

        </section>

      </main>
    </div>
  );
};

export default Dashboard;

