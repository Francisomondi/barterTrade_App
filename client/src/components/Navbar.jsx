
import {
  useEffect,
  useRef,
  useState,
} from "react";

import {
  Link,
  useNavigate,
} from "react-router-dom";

import {
  ArrowLeftRight,
  ChevronDown,
  Crown,
  ExternalLink,
  Handshake,
  LayoutDashboard,
  LogOut,
  Package,
  Settings,
  Store,
  User,
} from "lucide-react";

import {
  useAuth,
} from "../context/AuthContext";

import {
  getUnreadNotificationCount,
} from "../api/notificationApi";

import {
  NOTIFICATION_COUNT_EVENT,
} from "../utils/notificationEvents";

import logo from "../assets/logo4.png";

import {
  showSuccess,
} from "../utils/toast";

const Navbar = () => {
  const navigate =
    useNavigate();

  /*
   * ============================================================
   * REFS
   * ============================================================
   */

  const businessMenuRef =
    useRef(null);

  const profileMenuRef =
    useRef(null);

  /*
   * ============================================================
   * AUTH
   * ============================================================
   */

  const {
    user,
    logout,

    isPremium,

    business,
    isBusiness,
    businessSlug,
    businessStatus,
    isBusinessStorefrontActive,
  } = useAuth();

  /*
   * ============================================================
   * STATE
   * ============================================================
   */

  const [
    menuOpen,
    setMenuOpen,
  ] = useState(false);

  const [
    businessMenuOpen,
    setBusinessMenuOpen,
  ] = useState(false);

  const [
    profileMenuOpen,
    setProfileMenuOpen,
  ] = useState(false);

  const [
    mobileAccountOpen,
    setMobileAccountOpen,
  ] = useState(false);

  const [
    unreadCount,
    setUnreadCount,
  ] = useState(0);

  /*
   * ============================================================
   * LOAD UNREAD NOTIFICATION COUNT
   * ============================================================
   */

  useEffect(() => {
    if (!user) {
      setUnreadCount(0);
      return;
    }

    let mounted = true;

    const loadUnreadCount =
      async () => {
        try {
          const response =
            await getUnreadNotificationCount();

          if (mounted) {
            setUnreadCount(
              response?.data?.count ||
                0
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

  /*
   * ============================================================
   * CLOSE DESKTOP DROPDOWNS ON OUTSIDE CLICK
   * ============================================================
   */

  useEffect(() => {
    const handleOutsideClick = (
      event
    ) => {
      if (
        businessMenuRef.current &&
        !businessMenuRef.current.contains(
          event.target
        )
      ) {
        setBusinessMenuOpen(
          false
        );
      }

      if (
        profileMenuRef.current &&
        !profileMenuRef.current.contains(
          event.target
        )
      ) {
        setProfileMenuOpen(
          false
        );
      }
    };

    document.addEventListener(
      "mousedown",
      handleOutsideClick
    );

    return () => {
      document.removeEventListener(
        "mousedown",
        handleOutsideClick
      );
    };
  }, []);

  /*
   * ============================================================
   * LOGOUT
   * ============================================================
   */

  const handleLogout = () => {
    logout();

    setUnreadCount(0);
    setMenuOpen(false);
    setBusinessMenuOpen(false);
    setProfileMenuOpen(false);
    setMobileAccountOpen(false);

    showSuccess(
      "You have been logged out successfully."
    );

    setTimeout(() => {
      navigate(
        "/login",
        {
          replace: true,
        }
      );
    }, 800);
  };

  /*
   * ============================================================
   * CLOSE ALL MENUS
   * ============================================================
   */

  const closeMenu = () => {
    setMenuOpen(false);
    setBusinessMenuOpen(false);
    setProfileMenuOpen(false);
    setMobileAccountOpen(false);
  };

  /*
   * ============================================================
   * BUSINESS DISPLAY
   * ============================================================
   */

  const businessName =
    business?.businessName ||
    "My Business";

  const canViewStorefront =
    isBusinessStorefrontActive &&
    Boolean(
      businessSlug
    );

  /*
   * ============================================================
   * USER DISPLAY
   * ============================================================
   */

  const userName =
    user?.name ||
    user?.username ||
    "My Account";

  const userInitial =
    userName
      ?.charAt(0)
      ?.toUpperCase() ||
    "U";

  /*
   * ============================================================
   * ACCOUNT MENU LINK CLASS
   * ============================================================
   */

  const accountLinkClass = `
    flex items-center gap-3
    rounded-xl
    px-3 py-2.5
    text-xs font-semibold
    text-gray-700
    transition-all duration-200
    hover:bg-[#f9f1f3]
    hover:text-[#5b1725]
  `;

  /*
   * ============================================================
   * NAVBAR
   * ============================================================
   */

  return (
    <header className="sticky top-0 z-50 border-b border-[#e7dddf] bg-white/95 backdrop-blur">
      {/* =======================================================
          MAIN NAVBAR
      ======================================================= */}

      <div className="mx-auto flex h-18 max-w-7xl items-center justify-between px-3 sm:px-5 lg:px-8">
        {/* =====================================================
            LOGO
        ===================================================== */}

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

        {/* =====================================================
            DESKTOP NAVIGATION
        ===================================================== */}

        <nav className="hidden items-center gap-2 md:flex lg:gap-3">
          {/* MARKETPLACE */}

          <Link
            to="/marketplace"
            className="
              whitespace-nowrap rounded-lg
              px-2 py-1.5
              text-[13px] font-medium
              text-gray-700
              transition-all duration-200
              hover:bg-[#f9f1f3]
              hover:text-[#5b1725]
            "
          >
            Marketplace
          </Link>

          {user && (
            <>
              {/* ===============================================
                  BUSINESS
              =============================================== */}

              {!isBusiness ? (
                <Link
                  to="/business/create"
                  className="
                    flex items-center gap-1.5
                    whitespace-nowrap rounded-lg
                    px-2 py-1.5
                    text-[13px] font-semibold
                    text-[#6b1d2c]
                    transition-all duration-200
                    hover:bg-[#f9f1f3]
                    hover:text-[#3d0f18]
                  "
                >
                  <Store
                    size={16}
                  />

                  Create Business
                </Link>
              ) : (
                <div
                  ref={
                    businessMenuRef
                  }
                  className="relative"
                >
                  <button
                    type="button"
                    onClick={() => {
                      setBusinessMenuOpen(
                        (current) =>
                          !current
                      );

                      setProfileMenuOpen(
                        false
                      );
                    }}
                    aria-expanded={
                      businessMenuOpen
                    }
                    aria-haspopup="menu"
                    className="
                      flex items-center gap-1.5
                      whitespace-nowrap rounded-lg
                      px-2 py-1.5
                      text-[13px] font-semibold
                      text-[#6b1d2c]
                      transition-all duration-200
                      hover:bg-[#f9f1f3]
                      hover:text-[#3d0f18]
                    "
                  >
                    <Store
                      size={16}
                    />

                    Business

                    <ChevronDown
                      size={14}
                      className={`
                        transition-transform
                        duration-200
                        ${
                          businessMenuOpen
                            ? "rotate-180"
                            : ""
                        }
                      `}
                    />
                  </button>

                  {/* BUSINESS DROPDOWN */}

                  {businessMenuOpen && (
                    <div
                      role="menu"
                      className="
                        absolute left-0 top-full
                        z-60 mt-2
                        w-64 overflow-hidden
                        rounded-2xl
                        border border-[#eadfe1]
                        bg-white
                        p-2
                        shadow-xl
                      "
                    >
                      {/* BUSINESS HEADER */}

                      <div className="border-b border-[#f0e7e9] px-3 py-2.5">
                        <div className="flex items-center gap-2">
                          <div
                            className="
                              flex h-9 w-9 shrink-0
                              items-center justify-center
                              overflow-hidden rounded-xl
                              bg-[#f5ecee]
                              text-[#8a2638]
                            "
                          >
                            {business?.logo ? (
                              <img
                                src={
                                  business.logo
                                }
                                alt={
                                  businessName
                                }
                                className="h-full w-full object-cover"
                              />
                            ) : (
                              <Store
                                size={17}
                              />
                            )}
                          </div>

                          <div className="min-w-0">
                            <p className="truncate text-xs font-bold text-[#3d0f18]">
                              {
                                businessName
                              }
                            </p>

                            <div className="mt-1 flex items-center gap-1.5">
                              <span
                                className={`h-1.5 w-1.5 rounded-full ${
                                  businessStatus ===
                                  "ACTIVE"
                                    ? "bg-emerald-500"
                                    : businessStatus ===
                                        "SUSPENDED"
                                      ? "bg-red-500"
                                      : "bg-gray-400"
                                }`}
                              />

                              <p className="text-[9px] font-bold uppercase tracking-wide text-gray-400">
                                {businessStatus ||
                                  "Business"}
                              </p>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* BUSINESS DASHBOARD */}

                      <Link
                        to="/business/dashboard"
                        onClick={() =>
                          setBusinessMenuOpen(
                            false
                          )
                        }
                        className={`
                          ${accountLinkClass}
                          mt-1
                        `}
                      >
                        <LayoutDashboard
                          size={16}
                          className="text-[#8a2638]"
                        />

                        Business Dashboard
                      </Link>

                      {/* MANAGE BUSINESS */}

                      <Link
                        to="/business/manage"
                        onClick={() =>
                          setBusinessMenuOpen(
                            false
                          )
                        }
                        className={
                          accountLinkClass
                        }
                      >
                        <Settings
                          size={16}
                          className="text-[#8a2638]"
                        />

                        Manage Business
                      </Link>

                      {/* PUBLIC STOREFRONT */}

                      {canViewStorefront && (
                        <Link
                          to={`/business/${businessSlug}`}
                          onClick={() =>
                            setBusinessMenuOpen(
                              false
                            )
                          }
                          className={
                            accountLinkClass
                          }
                        >
                          <ExternalLink
                            size={16}
                            className="text-[#8a2638]"
                          />

                          View Storefront
                        </Link>
                      )}
                    </div>
                  )}
                </div>
              )}

              {/* ===============================================
                  PREMIUM
              =============================================== */}

              <Link
                to={
                  isPremium
                    ? "/account/subscription"
                    : "/premium"
                }
                className="
                  flex items-center gap-1.5
                  whitespace-nowrap rounded-lg
                  px-2 py-1.5
                  text-[13px] font-medium
                  text-gray-700
                  transition-all duration-200
                  hover:bg-amber-50
                  hover:text-amber-700
                "
              >
                <Crown
                  size={17}
                  className="text-amber-500"
                />

                Premium
              </Link>

              {/* MATCHES */}

              <Link
                to="/matches"
                className="
                  whitespace-nowrap rounded-lg
                  px-2 py-1.5
                  text-[13px] font-medium
                  text-gray-700
                  transition-all duration-200
                  hover:bg-[#f9f1f3]
                  hover:text-[#5b1725]
                "
              >
                Matches
              </Link>
            </>
          )}
        </nav>

        {/* =====================================================
            DESKTOP USER ACTIONS
        ===================================================== */}

        <div className="hidden items-center gap-2 md:flex">
          {user ? (
            <>
              {/* ===============================================
                  NOTIFICATIONS
              =============================================== */}

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

              {/* ===============================================
                  LIST ITEM
              =============================================== */}

              <Link
                to="/listings/create"
                className="
                  whitespace-nowrap
                  rounded-lg
                  bg-[#5b1725]
                  px-3 py-2
                  text-xs font-semibold
                  text-white
                  shadow-sm
                  transition-all duration-200
                  hover:bg-[#3d0f18]
                  hover:shadow-md
                "
              >
                + List Item
              </Link>

              <div className="h-7 w-px bg-[#eee4e6]" />

              {/* ===============================================
                  PROFILE / ACCOUNT DROPDOWN
              =============================================== */}

              <div
                ref={
                  profileMenuRef
                }
                className="relative"
              >
                <button
                  type="button"
                  onClick={() => {
                    setProfileMenuOpen(
                      (current) =>
                        !current
                    );

                    setBusinessMenuOpen(
                      false
                    );
                  }}
                  aria-expanded={
                    profileMenuOpen
                  }
                  aria-haspopup="menu"
                  className="
                    flex items-center gap-2
                    rounded-xl
                    border border-transparent
                    px-2 py-1.5
                    text-gray-700
                    transition-all duration-200
                    hover:border-[#eadfe1]
                    hover:bg-[#f9f1f3]
                  "
                >
                  {/* AVATAR */}

                  <div
                    className="
                      flex h-9 w-9 shrink-0
                      items-center justify-center
                      overflow-hidden rounded-full
                      bg-[#f4e7ea]
                      font-bold text-[#5b1725]
                      ring-1 ring-[#eadfe1]
                    "
                  >
                    {user?.avatar ? (
                      <img
                        src={
                          user.avatar
                        }
                        alt={
                          userName
                        }
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      userInitial
                    )}
                  </div>

                  {/* USERNAME */}

                  <div className="hidden min-w-0 text-left lg:block">
                    <p className="max-w-28 truncate text-xs font-bold text-[#3d0f18]">
                      {userName}
                    </p>

                    <p className="text-[9px] font-medium text-gray-400">
                      My Account
                    </p>
                  </div>

                  <ChevronDown
                    size={14}
                    className={`
                      hidden text-gray-400
                      transition-transform
                      duration-200 lg:block
                      ${
                        profileMenuOpen
                          ? "rotate-180"
                          : ""
                      }
                    `}
                  />
                </button>

                {/* =============================================
                    DESKTOP ACCOUNT MENU
                ============================================= */}

                {profileMenuOpen && (
                  <div
                    role="menu"
                    className="
                      absolute right-0 top-full
                      z-60 mt-2
                      w-64 overflow-hidden
                      rounded-2xl
                      border border-[#eadfe1]
                      bg-white
                      p-2
                      shadow-xl
                    "
                  >
                    {/* ACCOUNT HEADER */}

                    <div className="flex items-center gap-3 border-b border-[#f0e7e9] px-3 py-3">
                      <div
                        className="
                          flex h-11 w-11 shrink-0
                          items-center justify-center
                          overflow-hidden rounded-full
                          bg-[#f4e7ea]
                          font-black text-[#5b1725]
                          ring-1 ring-[#eadfe1]
                        "
                      >
                        {user?.avatar ? (
                          <img
                            src={
                              user.avatar
                            }
                            alt={
                              userName
                            }
                            className="h-full w-full object-cover"
                          />
                        ) : (
                          userInitial
                        )}
                      </div>

                      <div className="min-w-0">
                        <p className="truncate text-sm font-black text-[#3d0f18]">
                          {userName}
                        </p>

                        {user?.email && (
                          <p className="mt-0.5 truncate text-[10px] text-gray-400">
                            {
                              user.email
                            }
                          </p>
                        )}
                      </div>
                    </div>

                    {/* MY PROFILE */}

                    <Link
                      to="/profile"
                      onClick={() =>
                        setProfileMenuOpen(
                          false
                        )
                      }
                      className={`
                        ${accountLinkClass}
                        mt-1
                      `}
                    >
                      <User
                        size={16}
                        className="text-[#8a2638]"
                      />

                      My Profile
                    </Link>

                    {/* DASHBOARD */}

                    <Link
                      to="/dashboard"
                      onClick={() =>
                        setProfileMenuOpen(
                          false
                        )
                      }
                      className={
                        accountLinkClass
                      }
                    >
                      <LayoutDashboard
                        size={16}
                        className="text-[#8a2638]"
                      />

                      Dashboard
                    </Link>

                    {/* MY OFFERS */}

                    <Link
                      to="/offers"
                      onClick={() =>
                        setProfileMenuOpen(
                          false
                        )
                      }
                      className={
                        accountLinkClass
                      }
                    >
                      <Handshake
                        size={16}
                        className="text-[#8a2638]"
                      />

                      My Offers
                    </Link>

                    {/* MY LISTINGS */}

                    <Link
                      to="/my-listings"
                      onClick={() =>
                        setProfileMenuOpen(
                          false
                        )
                      }
                      className={
                        accountLinkClass
                      }
                    >
                      <Package
                        size={16}
                        className="text-[#8a2638]"
                      />

                      My Listings
                    </Link>

                    {/* MY TRADES */}

                    <Link
                      to="/trades"
                      onClick={() =>
                        setProfileMenuOpen(
                          false
                        )
                      }
                      className={
                        accountLinkClass
                      }
                    >
                      <ArrowLeftRight
                        size={16}
                        className="text-[#8a2638]"
                      />

                      My Trades
                    </Link>

                    {/* DIVIDER */}

                    <div className="my-1 border-t border-[#f0e7e9]" />

                    {/* LOGOUT */}

                    <button
                      type="button"
                      onClick={
                        handleLogout
                      }
                      className="
                        flex w-full items-center
                        gap-3 rounded-xl
                        px-3 py-2.5
                        text-left
                        text-xs font-semibold
                        text-red-600
                        transition-all duration-200
                        hover:bg-red-50
                        hover:text-red-700
                      "
                    >
                      <LogOut
                        size={16}
                      />

                      Logout
                    </button>
                  </div>
                )}
              </div>
            </>
          ) : (
            <>
              {/* LOGIN */}

              <Link
                to="/login"
                className="
                  whitespace-nowrap rounded-lg
                  px-2 py-1.5
                  text-[13px] font-medium
                  text-gray-700
                  transition-all duration-200
                  hover:bg-[#f9f1f3]
                  hover:text-[#5b1725]
                "
              >
                Login
              </Link>

              {/* REGISTER */}

              <Link
                to="/register"
                className="
                  whitespace-nowrap
                  rounded-lg
                  bg-[#5b1725]
                  px-3 py-2
                  text-xs font-semibold
                  text-white
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

        {/* =====================================================
            MOBILE TOP ACTIONS
        ===================================================== */}

        <div className="flex items-center gap-1.5 md:hidden">
          {/* MOBILE NOTIFICATION */}

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

          {/* MOBILE HAMBURGER */}

          <button
            type="button"
            onClick={() => {
              setMenuOpen(
                (current) =>
                  !current
              );

              setMobileAccountOpen(
                false
              );

              setBusinessMenuOpen(
                false
              );

              setProfileMenuOpen(
                false
              );
            }}
            aria-label={
              menuOpen
                ? "Close menu"
                : "Open menu"
            }
            aria-expanded={
              menuOpen
            }
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
              {/* TOP */}

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

              {/* MIDDLE */}

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

              {/* BOTTOM */}

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

      {/* =======================================================
          MOBILE MENU
      ======================================================= */}

      <div
        className={`
          overflow-hidden
          border-[#e7dddf]
          bg-white shadow-lg
          transition-all duration-300
          ease-in-out md:hidden
          ${
            menuOpen
              ? "max-h-[calc(100vh-4.5rem)] border-t opacity-100"
              : "max-h-0 border-t-0 opacity-0"
          }
        `}
      >
        <div className="max-h-[calc(100vh-5rem)] overflow-y-auto px-4 py-4">
          <nav className="flex flex-col gap-1">
            {/* =================================================
                MOBILE ACCOUNT DROPDOWN
            ================================================= */}

            {user && (
              <div className="mb-2">
                {/* ACCOUNT TRIGGER */}

                <button
                  type="button"
                  onClick={() =>
                    setMobileAccountOpen(
                      (current) =>
                        !current
                    )
                  }
                  aria-expanded={
                    mobileAccountOpen
                  }
                  className="
                    flex w-full items-center
                    gap-3 rounded-2xl
                    border border-[#eee4e6]
                    bg-[#faf5f6]
                    p-3 text-left
                    transition-all duration-200
                    hover:bg-[#f9f1f3]
                  "
                >
                  {/* AVATAR */}

                  <div
                    className="
                      flex h-11 w-11 shrink-0
                      items-center justify-center
                      overflow-hidden rounded-full
                      bg-[#e9d3d8]
                      font-bold text-[#5b1725]
                      ring-1 ring-[#dfcbd0]
                    "
                  >
                    {user?.avatar ? (
                      <img
                        src={
                          user.avatar
                        }
                        alt={
                          userName
                        }
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      userInitial
                    )}
                  </div>

                  {/* USER DETAILS */}

                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-bold text-[#5b1725]">
                      {userName}
                    </p>

                    {user?.email ? (
                      <p className="mt-0.5 truncate text-[10px] text-gray-500">
                        {
                          user.email
                        }
                      </p>
                    ) : (
                      <p className="mt-0.5 text-[10px] text-gray-500">
                        My Account
                      </p>
                    )}
                  </div>

                  <ChevronDown
                    size={17}
                    className={`
                      shrink-0 text-[#8a2638]
                      transition-transform
                      duration-200
                      ${
                        mobileAccountOpen
                          ? "rotate-180"
                          : ""
                      }
                    `}
                  />
                </button>

                {/* =============================================
                    MOBILE ACCOUNT CONTENT
                ============================================= */}

                <div
                  className={`
                    overflow-hidden
                    transition-all
                    duration-300
                    ${
                      mobileAccountOpen
                        ? "max-h-120 pt-2 opacity-100"
                        : "max-h-0 opacity-0"
                    }
                  `}
                >
                  <div className="rounded-2xl border border-[#eee4e6] bg-white p-2">
                    {/* PROFILE */}

                    <Link
                      to="/profile"
                      onClick={closeMenu}
                      className="
                        flex items-center gap-3
                        rounded-xl
                        px-3 py-3
                        text-sm font-semibold
                        text-gray-700
                        transition
                        hover:bg-[#f9f1f3]
                        hover:text-[#5b1725]
                      "
                    >
                      <User
                        size={18}
                        className="text-[#8a2638]"
                      />

                      My Profile
                    </Link>

                    {/* DASHBOARD */}

                    <Link
                      to="/dashboard"
                      onClick={closeMenu}
                      className="
                        flex items-center gap-3
                        rounded-xl
                        px-3 py-3
                        text-sm font-semibold
                        text-gray-700
                        transition
                        hover:bg-[#f9f1f3]
                        hover:text-[#5b1725]
                      "
                    >
                      <LayoutDashboard
                        size={18}
                        className="text-[#8a2638]"
                      />

                      Dashboard
                    </Link>

                    {/* OFFERS */}

                    <Link
                      to="/offers"
                      onClick={closeMenu}
                      className="
                        flex items-center gap-3
                        rounded-xl
                        px-3 py-3
                        text-sm font-semibold
                        text-gray-700
                        transition
                        hover:bg-[#f9f1f3]
                        hover:text-[#5b1725]
                      "
                    >
                      <Handshake
                        size={18}
                        className="text-[#8a2638]"
                      />

                      My Offers
                    </Link>

                    {/* LISTINGS */}

                    <Link
                      to="/my-listings"
                      onClick={closeMenu}
                      className="
                        flex items-center gap-3
                        rounded-xl
                        px-3 py-3
                        text-sm font-semibold
                        text-gray-700
                        transition
                        hover:bg-[#f9f1f3]
                        hover:text-[#5b1725]
                      "
                    >
                      <Package
                        size={18}
                        className="text-[#8a2638]"
                      />

                      My Listings
                    </Link>

                    {/* TRADES */}

                    <Link
                      to="/trades"
                      onClick={closeMenu}
                      className="
                        flex items-center gap-3
                        rounded-xl
                        px-3 py-3
                        text-sm font-semibold
                        text-gray-700
                        transition
                        hover:bg-[#f9f1f3]
                        hover:text-[#5b1725]
                      "
                    >
                      <ArrowLeftRight
                        size={18}
                        className="text-[#8a2638]"
                      />

                      My Trades
                    </Link>

                    <div className="my-1 border-t border-[#eee4e6]" />

                    {/* LOGOUT */}

                    <button
                      type="button"
                      onClick={
                        handleLogout
                      }
                      className="
                        flex w-full items-center
                        gap-3 rounded-xl
                        px-3 py-3
                        text-left
                        text-sm font-semibold
                        text-red-600
                        transition
                        hover:bg-red-50
                        hover:text-red-700
                      "
                    >
                      <LogOut
                        size={18}
                      />

                      Logout
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* =================================================
                MARKETPLACE
            ================================================= */}

            <Link
              to="/marketplace"
              onClick={closeMenu}
              className="
                flex items-center
                rounded-xl
                px-4 py-3
                text-sm font-medium
                text-gray-700
                transition-all duration-200
                hover:bg-[#f9f1f3]
                hover:text-[#5b1725]
              "
            >
              Marketplace
            </Link>

            {user && (
              <>
                {/* =============================================
                    BUSINESS SECTION
                ============================================= */}

                <div className="my-2 border-t border-[#eee4e6]" />

                <p className="px-4 pb-1 pt-1 text-[9px] font-black uppercase tracking-[0.15em] text-[#9a5d37]">
                  Business
                </p>

                {!isBusiness ? (
                  <Link
                    to="/business/create"
                    onClick={closeMenu}
                    className="
                      flex items-center gap-3
                      rounded-xl
                      bg-[#faf5f6]
                      px-4 py-3
                      text-sm font-semibold
                      text-[#5b1725]
                      transition-all duration-200
                      hover:bg-[#f3e7e9]
                    "
                  >
                    <Store
                      size={17}
                    />

                    Create Business Account
                  </Link>
                ) : (
                  <>
                    {/* BUSINESS IDENTITY */}

                    <div className="mx-1 mb-1 flex items-center gap-3 rounded-xl bg-[#faf5f6] px-3 py-3">
                      <div
                        className="
                          flex h-10 w-10 shrink-0
                          items-center justify-center
                          overflow-hidden rounded-xl
                          bg-[#f0e1e4]
                          text-[#8a2638]
                        "
                      >
                        {business?.logo ? (
                          <img
                            src={
                              business.logo
                            }
                            alt={
                              businessName
                            }
                            className="h-full w-full object-cover"
                          />
                        ) : (
                          <Store
                            size={18}
                          />
                        )}
                      </div>

                      <div className="min-w-0">
                        <p className="truncate text-xs font-bold text-[#3d0f18]">
                          {
                            businessName
                          }
                        </p>

                        <div className="mt-1 flex items-center gap-1.5">
                          <span
                            className={`h-1.5 w-1.5 rounded-full ${
                              businessStatus ===
                              "ACTIVE"
                                ? "bg-emerald-500"
                                : businessStatus ===
                                    "SUSPENDED"
                                  ? "bg-red-500"
                                  : "bg-gray-400"
                            }`}
                          />

                          <span className="text-[9px] font-bold uppercase tracking-wide text-gray-400">
                            {businessStatus ||
                              "Business"}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* BUSINESS DASHBOARD */}

                    <Link
                      to="/business/dashboard"
                      onClick={closeMenu}
                      className="
                        flex items-center gap-3
                        rounded-xl
                        px-4 py-3
                        text-sm font-medium
                        text-gray-700
                        transition-all duration-200
                        hover:bg-[#f9f1f3]
                        hover:text-[#5b1725]
                      "
                    >
                      <LayoutDashboard
                        size={17}
                        className="text-[#8a2638]"
                      />

                      Business Dashboard
                    </Link>

                    {/* MANAGE BUSINESS */}

                    <Link
                      to="/business/manage"
                      onClick={closeMenu}
                      className="
                        flex items-center gap-3
                        rounded-xl
                        px-4 py-3
                        text-sm font-medium
                        text-gray-700
                        transition-all duration-200
                        hover:bg-[#f9f1f3]
                        hover:text-[#5b1725]
                      "
                    >
                      <Settings
                        size={17}
                        className="text-[#8a2638]"
                      />

                      Manage Business
                    </Link>

                    {/* VIEW STOREFRONT */}

                    {canViewStorefront && (
                      <Link
                        to={`/business/${businessSlug}`}
                        onClick={closeMenu}
                        className="
                          flex items-center gap-3
                          rounded-xl
                          px-4 py-3
                          text-sm font-medium
                          text-gray-700
                          transition-all duration-200
                          hover:bg-[#f9f1f3]
                          hover:text-[#5b1725]
                        "
                      >
                        <ExternalLink
                          size={17}
                          className="text-[#8a2638]"
                        />

                        View Storefront
                      </Link>
                    )}
                  </>
                )}

                {/* =============================================
                    PREMIUM / MATCHES
                ============================================= */}

                <div className="my-2 border-t border-[#eee4e6]" />

                {/* PREMIUM */}

                <Link
                  to={
                    isPremium
                      ? "/account/subscription"
                      : "/premium"
                  }
                  onClick={closeMenu}
                  className="
                    flex items-center gap-3
                    rounded-xl
                    px-4 py-3
                    text-sm font-medium
                    text-gray-700
                    transition-all duration-200
                    hover:bg-amber-50
                    hover:text-amber-700
                  "
                >
                  <Crown
                    size={17}
                    className="text-amber-500"
                  />

                  {isPremium
                    ? "My Premium"
                    : "Upgrade to Premium"}
                </Link>

                {/* MATCHES */}

                <Link
                  to="/matches"
                  onClick={closeMenu}
                  className="
                    flex items-center
                    rounded-xl
                    px-4 py-3
                    text-sm font-medium
                    text-gray-700
                    transition-all duration-200
                    hover:bg-[#f9f1f3]
                    hover:text-[#5b1725]
                  "
                >
                  Matches
                </Link>

                {/* =============================================
                    NOTIFICATIONS
                ============================================= */}

                <Link
                  to="/notifications"
                  onClick={closeMenu}
                  className="
                    flex items-center justify-between
                    rounded-xl
                    px-4 py-3
                    text-sm font-medium
                    text-gray-700
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

                {/* =============================================
                    LIST ITEM
                ============================================= */}

                <div className="my-2 border-t border-[#eee4e6]" />

                <Link
                  to="/listings/create"
                  onClick={closeMenu}
                  className="
                    flex items-center justify-center
                    rounded-xl
                    bg-[#5b1725]
                    px-4 py-3
                    text-sm font-semibold
                    text-white
                    shadow-sm
                    transition-all duration-200
                    hover:bg-[#3d0f18]
                    hover:shadow-md
                  "
                >
                  + List Item
                </Link>
              </>
            )}

            {/* =================================================
                LOGGED OUT MOBILE
            ================================================= */}

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
                    text-sm font-semibold
                    text-[#5b1725]
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
                    text-sm font-semibold
                    text-white
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

