import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import logo from "../assets/logo4.png";

const Navbar = () => {
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const [menuOpen, setMenuOpen] = useState(false);

  const handleLogout = () => {
    logout();
    setMenuOpen(false);
    navigate("/login", { replace: true });
  };

  const closeMenu = () => {
    setMenuOpen(false);
  };

  return (
    <header className="sticky top-0 z-50 border-b border-[#e7dddf] bg-white/95 backdrop-blur">
      <div className="mx-auto flex h-[76px] max-w-7xl items-center justify-between px-3 sm:px-5 lg:px-8">

        {/* ================= LOGO ================= */}
        <Link
          to="/marketplace"
          onClick={closeMenu}
          className="flex min-w-0 shrink-0 items-center"
        >
          <div
            className="
              flex items-center justify-start overflow-hidden
              h-12 w-[155px]
              sm:h-14 sm:w-[210px]
              md:h-16 md:w-[260px]
              lg:h-[68px] lg:w-[290px]
            "
          >
            <img
              src={logo}
              alt="BarterConnect Logo"
              className="block h-full w-full object-contain object-left"
            />
          </div>
        </Link>

        {/* ================================================= */}
        {/* DESKTOP + MEDIUM NAVIGATION - UNCHANGED */}
        {/* ================================================= */}

        <nav className="hidden items-center gap-7 md:flex">

          <Link
            to="/marketplace"
            className="text-sm font-medium text-gray-700 transition hover:text-[#5b1725]"
          >
            Marketplace
          </Link>

          {user && (
            <>
              <Link
                to="/dashboard"
                className="text-sm font-medium text-gray-700 transition hover:text-[#5b1725]"
              >
                Dashboard
              </Link>

              <Link to="/matches">Matches</Link>

              <Link
                to="/offers"
                className="font-semibold text-[#5B1725] transition hover:text-[#8A2638]"
              >
                My Offers
              </Link>

              <Link
                to="/my-listings"
                className="text-sm font-medium text-gray-700 transition hover:text-[#5b1725]"
              >
                My Listings
              </Link>

              <Link
                to="/trades"
                className="text-sm font-medium text-gray-700 transition hover:text-[#5b1725]"
              >
                My Trades
              </Link>
            </>
          )}

        </nav>

        {/* ================================================= */}
        {/* DESKTOP + MEDIUM USER ACTIONS - UNCHANGED */}
        {/* ================================================= */}

        <div className="hidden md:flex items-center gap-3">

          {user ? (
            <>
              <Link
                to="/listings/create"
                className="hidden rounded-xl bg-[#5b1725] px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-[#3d0f18] sm:block"
              >
                + List Item
              </Link>

              <div className="hidden h-8 w-px bg-gray-200 sm:block" />

              <Link
                to="/profile"
                className="text-sm font-medium text-gray-700 transition hover:text-[#5b1725]"
              >
                  <div className="flex items-center gap-2">

                    <div className="flex h-9 w-9 items-center justify-center overflow-hidden rounded-full bg-[#f4e7ea] font-semibold text-[#5b1725]">
                      {user?.avatar?  (
                        <img
                          src={user?.avatar}
                          alt={user.name}
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        user.name?.charAt(0)?.toUpperCase()
                      )}
                    </div>

                    <span className="hidden max-w-28 truncate text-sm font-medium sm:block">
                      {user.name}
                    </span>

                  </div>
            </Link>

              

              <button
                type="button"
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

        {/* ================================================= */}
        {/* MOBILE ONLY HAMBURGER */}
        {/* ================================================= */}

        <div className="flex items-center gap-2 md:hidden">




          {/* Mobile Avatar */}
          {user && (
            <div className="flex h-9 w-9 items-center justify-center overflow-hidden rounded-full bg-[#f4e7ea] font-semibold text-[#5b1725]">
              <Link
                to="/profile"
              >
                {user?.avatar ? (
                <img
                  src={user?.avatar}
                  alt={user.name}
                  className="h-full w-full object-cover"
                />
              ) : (
                user.name?.charAt(0)?.toUpperCase()
              )}
              </Link>
              
            </div>
          )}

          {/* Hamburger */}
          <button
            type="button"
            onClick={() => setMenuOpen(!menuOpen)}
            aria-label={menuOpen ? "Close menu" : "Open menu"}
            aria-expanded={menuOpen}
            className="
              flex h-11 w-11 items-center justify-center
              rounded-xl border border-[#e7dddf]
              bg-white text-[#5b1725]
              transition hover:bg-[#f9f1f3]
              focus:outline-none
            "
          >
            <div className="relative h-5 w-6">

              {/* Top */}
              <span
                className={`
                  absolute left-0 h-0.5 w-6 rounded-full
                  bg-[#5b1725]
                  transition-all duration-300
                  ${menuOpen ? "top-2 rotate-45" : "top-0"}
                `}
              />

              {/* Middle */}
              <span
                className={`
                  absolute left-0 top-2 h-0.5 w-6 rounded-full
                  bg-[#5b1725]
                  transition-all duration-300
                  ${menuOpen ? "opacity-0" : "opacity-100"}
                `}
              />

              {/* Bottom */}
              <span
                className={`
                  absolute left-0 h-0.5 w-6 rounded-full
                  bg-[#5b1725]
                  transition-all duration-300
                  ${menuOpen ? "top-2 -rotate-45" : "top-4"}
                `}
              />

            </div>
          </button>

        </div>

      </div>

      {/* ================================================= */}
      {/* MOBILE DROPDOWN ONLY */}
      {/* ================================================= */}

      <div
        className={`
          md:hidden overflow-hidden
          border-t border-[#e7dddf]
          bg-white shadow-lg
          transition-all duration-300 ease-in-out
          ${
            menuOpen
              ? "max-h-[700px] opacity-100"
              : "max-h-0 border-t-0 opacity-0"
          }
        `}
      >

        <div className="px-4 py-4">

          {/* User Information */}
          {user && (
            <div className="mb-3 flex items-center gap-3 rounded-xl bg-[#f9f1f3] p-3">

              <div className="flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-full bg-[#e9d3d8] font-bold text-[#5b1725]">
                <Link
                  to="/profile"
                  
                >
                  {user.avatar ? (
                  <img
                    src={user.avatar}
                    alt={user.name}
                    className="h-full w-full object-cover"
                  />
                ) : (
                  user.name?.charAt(0)?.toUpperCase()
                )}
                </Link>
               
              </div>

              <div className="min-w-0">
                <p className="truncate text-sm font-semibold text-[#5b1725]">
                  {user.name}
                </p>

                <p className="text-xs text-gray-500">
                  BarterConnect Member
                </p>
              </div>

            </div>
          )}

          {/* Mobile Links */}
          <nav className="flex flex-col gap-1">

            <Link
              to="/marketplace"
              onClick={closeMenu}
              className="
                rounded-xl px-4 py-3
                text-sm font-medium text-gray-700
                transition hover:bg-[#f9f1f3]
                hover:text-[#5b1725]
              "
            >
              Marketplace
            </Link>

            {user && (
              <>
                <Link
                  to="/dashboard"
                  onClick={closeMenu}
                  className="
                    rounded-xl px-4 py-3
                    text-sm font-medium text-gray-700
                    transition hover:bg-[#f9f1f3]
                    hover:text-[#5b1725]
                  "
                >
                  Dashboard
                </Link>
                <Link to="/matches">Matches</Link>

                <Link
                  to="/offers"
                  onClick={closeMenu}
                  className="
                    rounded-xl px-4 py-3
                    text-sm font-semibold text-[#5b1725]
                    transition hover:bg-[#f9f1f3]
                  "
                >
                  My Offers
                </Link>

                <Link
                  to="/my-listings"
                  onClick={closeMenu}
                  className="
                    rounded-xl px-4 py-3
                    text-sm font-medium text-gray-700
                    transition hover:bg-[#f9f1f3]
                    hover:text-[#5b1725]
                  "
                >
                  My Listings
                </Link>

                <Link
                  to="/trades"
                  onClick={closeMenu}
                  className="
                    rounded-xl px-4 py-3
                    text-sm font-medium text-gray-700
                    transition hover:bg-[#f9f1f3]
                    hover:text-[#5b1725]
                  "
                >
                  My Trades
                </Link>

                {/* List Item */}
                <Link
                  to="/listings/create"
                  onClick={closeMenu}
                  className="
                    mt-2 flex items-center justify-center
                    rounded-xl bg-[#5b1725]
                    px-4 py-3
                    text-sm font-semibold text-white
                    shadow-sm transition
                    hover:bg-[#3d0f18]
                  "
                >
                  + List Item
                </Link>

                {/* Logout */}
                <button
                  type="button"
                  onClick={handleLogout}
                  className="
                    mt-1 w-full rounded-xl
                    px-4 py-3 text-left
                    text-sm font-medium text-gray-500
                    transition hover:bg-[#f9f1f3]
                    hover:text-[#8a2638]
                  "
                >
                  Logout
                </button>
              </>
            )}

            {/* Logged Out Mobile */}
            {!user && (
              <div className="mt-2 grid grid-cols-2 gap-2 border-t border-[#eee4e6] pt-3">

                <Link
                  to="/login"
                  onClick={closeMenu}
                  className="
                    flex items-center justify-center
                    rounded-xl border border-[#5b1725]
                    px-4 py-3
                    text-sm font-semibold text-[#5b1725]
                    transition hover:bg-[#f9f1f3]
                  "
                >
                  Login
                </Link>

                <Link
                  to="/register"
                  onClick={closeMenu}
                  className="
                    flex items-center justify-center
                    rounded-xl bg-[#5b1725]
                    px-4 py-3
                    text-sm font-semibold text-white
                    transition hover:bg-[#3d0f18]
                  "
                >
                  Get Started
                </Link>

              </div>
            )}

          </nav>
        </div>
      </div>
    </header>
  );
};

export default Navbar;