import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { getUnreadNotificationCount } from "../api/notificationApi";
import {
NOTIFICATION_COUNT_EVENT,
} from "../utils/notificationEvents";
import logo from "../assets/logo4.png";

const Navbar = () => {
const navigate = useNavigate();
const { user, logout } = useAuth();

const [menuOpen, setMenuOpen] = useState(false);
const [unreadCount, setUnreadCount] = useState(0);

/*

* Load unread notification count.
*
* The count is loaded:
* * when the user logs in
* * when the user changes
* * whenever another part of the application
* dispatches NOTIFICATION_COUNT_EVENT
  */
  useEffect(() => {
  if (!user) {
  setUnreadCount(0);
  return;
  }


let mounted = true;



const loadUnreadCount = async () => {
  try {
    const response =
      await getUnreadNotificationCount();

    if (mounted) {
      setUnreadCount(
        response.data?.count || 0
      );
    }
  } catch (error) {
    console.error(
      "Failed to load unread notification count:",
      error
    );
  }
};

loadUnreadCount();

window.addEventListener(
  NOTIFICATION_COUNT_EVENT,
  loadUnreadCount
);

return () => {
  mounted = false;

  window.removeEventListener(
    NOTIFICATION_COUNT_EVENT,
    loadUnreadCount
  );
};


}, [user]);

const handleLogout = () => {
logout();
setUnreadCount(0);
setMenuOpen(false);
navigate("/login", { replace: true });
};

const closeMenu = () => {
setMenuOpen(false);
};

return ( <header className="sticky top-0 z-50 border-b border-[#e7dddf] bg-white/95 backdrop-blur">


  {/* ========================================================= */}
  {/* MAIN NAVBAR */}
  {/* ========================================================= */}

  <div className="mx-auto flex h-18 max-w-7xl items-center justify-between px-3 sm:px-5 lg:px-8">

    {/* ================= LOGO ================= */}

    <Link
      to="/marketplace"
      onClick={closeMenu}
      className="flex min-w-0 shrink-0 items-center"
    >
      <div
        className="
          flex items-center justify-start overflow-hidden
          h-11 w-36.25
          sm:h-13 sm:w-48.75
          md:h-14 md:w-56.25
          lg:h-15 lg:w-61.25
        "
      >
        <img
          src={logo}
          alt="BarterConnect Logo"
          className="block h-full w-full object-contain object-left"
        />
      </div>
    </Link>

    {/* ========================================================= */}
    {/* DESKTOP + MEDIUM NAVIGATION */}
    {/* ========================================================= */}

    <nav className="hidden items-center gap-2 md:flex lg:gap-3">

      {/* Marketplace */}

      <Link
        to="/marketplace"
        className="
          whitespace-nowrap rounded-lg
          px-1.5 py-1.5
          text-[13px] font-medium text-gray-700
          transition-all duration-200
          hover:bg-[#f9f1f3]
          hover:text-[#5b1725]
        "
      >
        Marketplace
      </Link>

      {user && (
        <>

          {/* Dashboard */}

          <Link
            to="/dashboard"
            className="
              whitespace-nowrap rounded-lg
              px-1.5 py-1.5
              text-[13px] font-medium text-gray-700
              transition-all duration-200
              hover:bg-[#f9f1f3]
              hover:text-[#5b1725]
            "
          >
            Dashboard
          </Link>

          {/* Matches */}

          <Link
            to="/matches"
            className="
              whitespace-nowrap rounded-lg
              px-1.5 py-1.5
              text-[13px] font-medium text-gray-700
              transition-all duration-200
              hover:bg-[#f9f1f3]
              hover:text-[#5b1725]
            "
          >
            Matches
          </Link>

          {/* My Offers */}

          <Link
            to="/offers"
            className="
              whitespace-nowrap rounded-lg
              px-1.5 py-1.5
              text-[13px] font-semibold text-gray-700
              transition-all duration-200
              hover:bg-[#f9f1f3]
              hover:text-[#8a2638]
            "
          >
            My Offers
          </Link>

          {/* My Listings */}

          <Link
            to="/my-listings"
            className="
              whitespace-nowrap rounded-lg
              px-1.5 py-1.5
              text-[13px] font-medium text-gray-700
              transition-all duration-200
              hover:bg-[#f9f1f3]
              hover:text-[#5b1725]
            "
          >
            My Listings
          </Link>

          {/* My Trades */}

          <Link
            to="/trades"
            className="
              whitespace-nowrap rounded-lg
              px-1.5 py-1.5
              text-[13px] font-medium text-gray-700
              transition-all duration-200
              hover:bg-[#f9f1f3]
              hover:text-[#5b1725]
            "
          >
            My Trades
          </Link>

        </>
      )}

    </nav>

    {/* ========================================================= */}
    {/* DESKTOP + MEDIUM USER ACTIONS */}
    {/* ========================================================= */}

    <div className="hidden items-center gap-2 md:flex">

      {user ? (
        <>

          {/* ================================================= */}
          {/* NOTIFICATIONS */}
          {/* ================================================= */}

          <Link
            to="/notifications"
            aria-label={
              unreadCount > 0
                ? `${unreadCount} unread notifications`
                : "Notifications"
            }
            className="
              relative flex h-10 w-10
              items-center justify-center
              rounded-full
              text-[#5b1725]
              transition-all duration-200
              hover:bg-[#f9f1f3]
            "
          >
            <span
              className="text-xl leading-none"
              aria-hidden="true"
            >
              🔔
            </span>

            {unreadCount > 0 && (
              <span
                className="
                  absolute -right-1 -top-1
                  flex min-h-5 min-w-5
                  items-center justify-center
                  rounded-full
                  bg-[#8a2638]
                  px-1
                  text-[10px] font-bold
                  leading-none text-white
                  shadow
                "
              >
                {unreadCount > 99
                  ? "99+"
                  : unreadCount}
              </span>
            )}
          </Link>

          {/* ================================================= */}
          {/* LIST ITEM */}
          {/* ================================================= */}

          <Link
            to="/listings/create"
            className="
              hidden sm:block
              whitespace-nowrap
              rounded-lg
              bg-[#5b1725]
              px-3 py-2
              text-xs font-semibold text-white
              shadow-sm
              transition-all duration-200
              hover:bg-[#3d0f18]
              hover:shadow-md
            "
          >
            + List Item
          </Link>

          {/* Divider */}

          <div className="hidden h-7 w-px bg-[#eee4e6] sm:block" />

          {/* ================================================= */}
          {/* PROFILE */}
          {/* ================================================= */}

          <Link
            to="/profile"
            className="
              rounded-lg
              px-1.5 py-1
              text-[13px] font-medium text-gray-700
              transition-all duration-200
              hover:bg-[#f9f1f3]
              hover:text-[#5b1725]
            "
          >
            <div className="flex items-center gap-1.5">

              <div
                className="
                  flex h-8 w-8 shrink-0
                  items-center justify-center
                  overflow-hidden rounded-full
                  bg-[#f4e7ea]
                  font-semibold text-[#5b1725]
                "
              >
                {user?.avatar ? (
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

              <span className="hidden max-w-20 truncate text-[13px] font-medium lg:block">
                {user.name}
              </span>

            </div>
          </Link>

          {/* ================================================= */}
          {/* LOGOUT */}
          {/* ================================================= */}

          <button
            type="button"
            onClick={handleLogout}
            className="
              hidden lg:block
              rounded-lg
              px-1.5 py-1.5
              text-xs font-medium text-gray-500
              transition-all duration-200
              hover:bg-[#f9f1f3]
              hover:text-[#8a2638]
            "
          >
            Logout
          </button>

        </>
      ) : (
        <>

          {/* Login */}

          <Link
            to="/login"
            className="
              whitespace-nowrap rounded-lg
              px-1.5 py-1.5
              text-[13px] font-medium text-gray-700
              transition-all duration-200
              hover:bg-[#f9f1f3]
              hover:text-[#5b1725]
            "
          >
            Login
          </Link>

          {/* Get Started */}

          <Link
            to="/register"
            className="
              whitespace-nowrap
              rounded-lg
              bg-[#5b1725]
              px-3 py-2
              text-xs font-semibold text-white
              shadow-sm
              transition-all duration-200
              hover:bg-[#3d0f18]
              hover:shadow-md
            "
          >
            Get Started
          </Link>

        </>
      )}

    </div>

    {/* ========================================================= */}
    {/* MOBILE ACTIONS */}
    {/* ========================================================= */}

    <div className="flex items-center gap-2 md:hidden">

      {/* Mobile Notification Bell */}

      {user && (
        <Link
          to="/notifications"
          onClick={closeMenu}
          aria-label={
            unreadCount > 0
              ? `${unreadCount} unread notifications`
              : "Notifications"
          }
          className="
            relative flex h-10 w-10
            items-center justify-center
            rounded-full
            text-[#5b1725]
            transition-all duration-200
            hover:bg-[#f9f1f3]
          "
        >
          <span
            className="text-xl leading-none"
            aria-hidden="true"
          >
            🔔
          </span>

          {unreadCount > 0 && (
            <span
              className="
                absolute -right-1 -top-1
                flex min-h-5 min-w-5
                items-center justify-center
                rounded-full
                bg-[#8a2638]
                px-1
                text-[9px] font-bold
                leading-none text-white
                shadow
              "
            >
              {unreadCount > 99
                ? "99+"
                : unreadCount}
            </span>
          )}
        </Link>
      )}

      {/* Mobile Profile Avatar */}

      {user && (
        <Link
          to="/profile"
          onClick={closeMenu}
          className="
            flex h-9 w-9
            items-center justify-center
            overflow-hidden rounded-full
            bg-[#f4e7ea]
            font-semibold text-[#5b1725]
            transition
            hover:ring-2 hover:ring-[#e7cdd2]
          "
        >
          {user?.avatar ? (
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
        </Link>
      )}

      {/* Hamburger */}

      <button
        type="button"
        onClick={() =>
          setMenuOpen(!menuOpen)
        }
        aria-label={
          menuOpen
            ? "Close menu"
            : "Open menu"
        }
        aria-expanded={menuOpen}
        className="
          flex h-10 w-10
          items-center justify-center
          rounded-xl
          border border-[#e7dddf]
          bg-white
          text-[#5b1725]
          transition-all duration-200
          hover:border-[#d8bdc3]
          hover:bg-[#f9f1f3]
          focus:outline-none
        "
      >
        <div className="relative h-5 w-6">

          {/* Top */}

          <span
            className={`
              absolute left-0
              h-0.5 w-6
              rounded-full
              bg-[#5b1725]
              transition-all duration-300
              ${
                menuOpen
                  ? "top-2 rotate-45"
                  : "top-0"
              }
            `}
          />

          {/* Middle */}

          <span
            className={`
              absolute left-0 top-2
              h-0.5 w-6
              rounded-full
              bg-[#5b1725]
              transition-all duration-300
              ${
                menuOpen
                  ? "opacity-0"
                  : "opacity-100"
              }
            `}
          />

          {/* Bottom */}

          <span
            className={`
              absolute left-0
              h-0.5 w-6
              rounded-full
              bg-[#5b1725]
              transition-all duration-300
              ${
                menuOpen
                  ? "top-2 -rotate-45"
                  : "top-4"
              }
            `}
          />

        </div>
      </button>

    </div>

  </div>

  {/* ========================================================= */}
  {/* MOBILE MENU */}
  {/* ========================================================= */}

  <div
    className={`
      overflow-hidden md:hidden
      border-t border-[#e7dddf]
      bg-white shadow-lg
      transition-all duration-300 ease-in-out
      ${
        menuOpen
          ? "max-h-200 opacity-100"
          : "max-h-0 border-t-0 opacity-0"
      }
    `}
  >

    <div className="px-4 py-4">

      {/* ================================================= */}
      {/* MOBILE USER */}
      {/* ================================================= */}

      {user && (
        <Link
          to="/profile"
          onClick={closeMenu}
          className="
            mb-3 flex items-center gap-3
            rounded-xl
            border border-[#eee4e6]
            bg-[#faf5f6]
            p-3
            transition
            hover:bg-[#f9f1f3]
          "
        >

          <div
            className="
              flex h-10 w-10 shrink-0
              items-center justify-center
              overflow-hidden rounded-full
              bg-[#e9d3d8]
              font-bold text-[#5b1725]
            "
          >
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

          <div className="min-w-0">
            <p className="truncate text-sm font-semibold text-[#5b1725]">
              {user.name}
            </p>

            <p className="text-xs text-gray-500">
              BarterConnect Member
            </p>
          </div>

        </Link>
      )}

      {/* ================================================= */}
      {/* MOBILE NAVIGATION */}
      {/* ================================================= */}

      <nav className="flex flex-col gap-1">

        {/* Marketplace */}

        <Link
          to="/marketplace"
          onClick={closeMenu}
          className="
            flex items-center
            rounded-xl
            px-4 py-3
            text-sm font-medium text-gray-700
            transition-all duration-200
            hover:bg-[#f9f1f3]
            hover:text-[#5b1725]
          "
        >
          Marketplace
        </Link>

        {user && (
          <>

            {/* Dashboard */}

            <Link
              to="/dashboard"
              onClick={closeMenu}
              className="
                flex items-center
                rounded-xl
                px-4 py-3
                text-sm font-medium text-gray-700
                transition-all duration-200
                hover:bg-[#f9f1f3]
                hover:text-[#5b1725]
              "
            >
              Dashboard
            </Link>

            {/* Matches */}

            <Link
              to="/matches"
              onClick={closeMenu}
              className="
                flex items-center
                rounded-xl
                px-4 py-3
                text-sm font-medium text-gray-700
                transition-all duration-200
                hover:bg-[#f9f1f3]
                hover:text-[#5b1725]
              "
            >
              Matches
            </Link>

            {/* My Offers */}

            <Link
              to="/offers"
              onClick={closeMenu}
              className="
                flex items-center
                rounded-xl
                px-4 py-3
                text-sm font-semibold text-[#5b1725]
                transition-all duration-200
                hover:bg-[#f9f1f3]
              "
            >
              My Offers
            </Link>

            {/* My Listings */}

            <Link
              to="/my-listings"
              onClick={closeMenu}
              className="
                flex items-center
                rounded-xl
                px-4 py-3
                text-sm font-medium text-gray-700
                transition-all duration-200
                hover:bg-[#f9f1f3]
                hover:text-[#5b1725]
              "
            >
              My Listings
            </Link>

            {/* My Trades */}

            <Link
              to="/trades"
              onClick={closeMenu}
              className="
                flex items-center
                rounded-xl
                px-4 py-3
                text-sm font-medium text-gray-700
                transition-all duration-200
                hover:bg-[#f9f1f3]
                hover:text-[#5b1725]
              "
            >
              My Trades
            </Link>

            {/* Notifications */}

            <Link
              to="/notifications"
              onClick={closeMenu}
              className="
                flex items-center justify-between
                rounded-xl
                px-4 py-3
                text-sm font-medium text-gray-700
                transition-all duration-200
                hover:bg-[#f9f1f3]
                hover:text-[#5b1725]
              "
            >
              <span className="flex items-center gap-3">
                <span
                  className="text-lg"
                  aria-hidden="true"
                >
                  🔔
                </span>

                <span>
                  Notifications
                </span>
              </span>

              {unreadCount > 0 && (
                <span
                  className="
                    rounded-full
                    bg-[#8a2638]
                    px-2 py-1
                    text-[10px] font-bold
                    text-white
                  "
                >
                  {unreadCount > 99
                    ? "99+"
                    : unreadCount}
                </span>
              )}
            </Link>

            {/* Divider */}

            <div className="my-2 border-t border-[#eee4e6]" />

            {/* List Item */}

            <Link
              to="/listings/create"
              onClick={closeMenu}
              className="
                flex items-center justify-center
                rounded-xl
                bg-[#5b1725]
                px-4 py-2.5
                text-sm font-semibold text-white
                shadow-sm
                transition-all duration-200
                hover:bg-[#3d0f18]
                hover:shadow-md
              "
            >
              + List Item
            </Link>

            {/* Logout */}

            <button
              type="button"
              onClick={handleLogout}
              className="
                mt-1 w-full
                rounded-xl
                px-4 py-3
                text-left
                text-sm font-medium text-gray-500
                transition-all duration-200
                hover:bg-[#f9f1f3]
                hover:text-[#8a2638]
              "
            >
              Logout
            </button>

          </>
        )}

        {/* ================================================= */}
        {/* LOGGED OUT MOBILE */}
        {/* ================================================= */}

        {!user && (
          <div className="mt-2 grid grid-cols-2 gap-2 border-t border-[#eee4e6] pt-3">

            <Link
              to="/login"
              onClick={closeMenu}
              className="
                flex items-center justify-center
                rounded-xl
                border border-[#5b1725]
                px-4 py-2.5
                text-sm font-semibold text-[#5b1725]
                transition-all duration-200
                hover:bg-[#f9f1f3]
              "
            >
              Login
            </Link>

            <Link
              to="/register"
              onClick={closeMenu}
              className="
                flex items-center justify-center
                rounded-xl
                bg-[#5b1725]
                px-4 py-2.5
                text-sm font-semibold text-white
                transition-all duration-200
                hover:bg-[#3d0f18]
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
