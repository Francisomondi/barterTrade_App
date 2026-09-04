
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

const Navbar = () => {
  const navigate = useNavigate();

  const { user } = useAuth();

  const handleLogout = () => {
    localStorage.removeItem("token");

    navigate("/login");
  };

  return (
    <header className="sticky top-0 z-50 border-b border-[#e7dddf] bg-white/95 backdrop-blur">
      <div className="mx-auto flex h-18 max-w-7xl items-center justify-between px-5 lg:px-8">

        {/* Logo */}

        <Link
          to="/marketplace"
          className="flex items-center gap-3"
        >
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#5b1725] text-lg font-bold text-white shadow-sm">
            BT
          </div>

          <div className="hidden sm:block">
            <p className="text-lg font-bold leading-none text-[#3d0f18]">
              Barter Trade
            </p>

            <p className="mt-1 text-[10px] font-medium uppercase tracking-[0.18em] text-[#8a2638]">
              Trade differently
            </p>
          </div>
        </Link>

        {/* Navigation */}

        <nav className="hidden items-center gap-7 md:flex">

          <Link
            to="/marketplace"
            className="text-sm font-medium text-gray-700 transition hover:text-[#5b1725]"
          >
            Marketplace
          </Link>

          <Link
            to="/offers"
            className="font-semibold text-[#5B1725] transition hover:text-[#8A2638]"
          >
            My Offers
          </Link>

          {user && (
            <>
              <Link
                to="/dashboard"
                className="text-sm font-medium text-gray-700 transition hover:text-[#5b1725]"
              >
                Dashboard
              </Link>

              <Link
                to="/my-listings"
                className="text-sm font-medium text-gray-700 transition hover:text-[#5b1725]"
              >
                My Listings
              </Link>
            </>
          )}

        </nav>

        {/* User actions */}

        <div className="flex items-center gap-3">

          {user ? (
            <>
              <Link
                to="/listings/create"
                className="hidden rounded-xl bg-[#5b1725] px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-[#3d0f18] sm:block"
              >
                + List Item
              </Link>

              <div className="hidden h-8 w-px bg-gray-200 sm:block" />

              <div className="flex items-center gap-2">

                <div className="flex h-9 w-9 items-center justify-center overflow-hidden rounded-full bg-[#f4e7ea] font-semibold text-[#5b1725]">
                  {user.avatar ? (
                    <img
                      src={user.avatar}
                      alt={user.name}
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    user.name
                      ?.charAt(0)
                      ?.toUpperCase()
                  )}
                </div>

                <span className="hidden max-w-28 truncate text-sm font-medium sm:block">
                  {user.name}
                </span>

              </div>

              <button
                onClick={handleLogout}
                className="hidden text-sm font-medium text-gray-500 transition hover:text-[#8a2638] lg:block"
              >
                Logout
              </button>
            </>
          ) : (
            <>
              <Link
                to="/login"
                className="text-sm font-medium text-gray-700 hover:text-[#5b1725]"
              >
                Login
              </Link>

              <Link
                to="/register"
                className="rounded-xl bg-[#5b1725] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[#3d0f18]"
              >
                Get Started
              </Link>
            </>
          )}

        </div>

      </div>
    </header>
  );
};

export default Navbar;
