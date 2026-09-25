import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  AlertCircle,
  ArrowRight,
  BadgeCheck,
  BarChart3,
  CalendarDays,
  Check,
  CheckCircle2,
  Clock3,
  Crown,
  CreditCard,
  History,
  LayoutDashboard,
  ReceiptText,
  RefreshCw,
  ShieldCheck,
  Sparkles,
  Smartphone,
  TrendingUp,
  WalletCards,
  XCircle,
} from "lucide-react";

import { Link } from "react-router-dom";

import {
  getMySubscription,
} from "../api/subscriptionApi";

/*
 * ============================================================
 * MY SUBSCRIPTION
 * ============================================================
 */

export default function MySubscription() {
  const [data, setData] =
    useState(null);

  const [loading, setLoading] =
    useState(true);

  const [refreshing, setRefreshing] =
    useState(false);

  const [error, setError] =
    useState("");

  /*
   * ==========================================================
   * LOAD SUBSCRIPTION
   * ==========================================================
   */

  const loadSubscription =
    useCallback(
      async ({
        silent = false,
      } = {}) => {
        try {
          if (silent) {
            setRefreshing(true);
          } else {
            setLoading(true);
          }

          setError("");

          const response =
            await getMySubscription();

          setData(response);
        } catch (err) {
          console.error(
            "LOAD SUBSCRIPTION ERROR:",
            err
          );

          setError(
            err?.response?.data
              ?.message ||
              "Unable to load your subscription information."
          );
        } finally {
          setLoading(false);
          setRefreshing(false);
        }
      },
      []
    );

  useEffect(() => {
    loadSubscription();
  }, [loadSubscription]);

  /*
   * ==========================================================
   * SUBSCRIPTION DATA
   * ==========================================================
   */

  const subscriptions =
    data?.subscriptions || [];

  const activeSubscription =
    data?.activeSubscription ||
    null;

  const pendingSubscription =
    data?.pendingSubscription ||
    null;

  const isPremium =
    Boolean(
      data?.isPremium &&
        activeSubscription
    );

  const latestSubscription =
    subscriptions[0] ||
    null;

  const latestExpiredSubscription =
    useMemo(() => {
      return (
        subscriptions.find(
          (subscription) =>
            subscription.status ===
            "EXPIRED"
        ) || null
      );
    }, [subscriptions]);

  const displayedSubscription =
    activeSubscription ||
    pendingSubscription ||
    latestExpiredSubscription ||
    latestSubscription ||
    null;

  /*
   * ==========================================================
   * LOADING
   * ==========================================================
   */

  if (loading) {
    return (
      <SubscriptionSkeleton />
    );
  }

  /*
   * ==========================================================
   * INITIAL ERROR
   * ==========================================================
   */

  if (error && !data) {
    return (
      <main className="min-h-screen bg-[#F8F5F3] px-4 py-16">
        <div className="mx-auto max-w-lg rounded-[32px] border border-red-100 bg-white p-8 text-center shadow-sm">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-red-50 text-red-600">
            <AlertCircle
              size={28}
            />
          </div>

          <h1 className="mt-5 text-2xl font-black text-[#3D0F18]">
            Unable to load subscription
          </h1>

          <p className="mt-3 text-sm leading-6 text-gray-500">
            {error}
          </p>

          <button
            type="button"
            onClick={() =>
              loadSubscription()
            }
            className="mt-7 inline-flex items-center justify-center gap-2 rounded-xl bg-[#8A2638] px-5 py-3 text-sm font-black text-white transition hover:bg-[#6F1D2D]"
          >
            <RefreshCw
              size={17}
            />

            Try Again
          </button>
        </div>
      </main>
    );
  }

  /*
   * ==========================================================
   * PAGE
   * ==========================================================
   */

  return (
    <main className="min-h-screen bg-[#F8F5F3]">

      {/* =================================================== */}
      {/* HEADER */}
      {/* =================================================== */}

      <section className="border-b border-[#E7DDDF] bg-white">
        <div className="mx-auto max-w-7xl px-4 py-7 sm:px-6 lg:px-8">
          <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">

            <div>
              <div className="flex items-center gap-2 text-xs font-black uppercase tracking-[0.18em] text-[#8A2638]">
                <Crown
                  size={15}
                  fill="currentColor"
                />

                BarterTrade Membership
              </div>

              <h1 className="mt-2 text-3xl font-black tracking-tight text-[#3D0F18] sm:text-4xl">
                My Subscription
              </h1>

              <p className="mt-2 max-w-2xl text-sm leading-6 text-gray-500">
                Manage your membership,
                Premium tools, billing
                information and subscription
                history.
              </p>
            </div>

            <button
              type="button"
              disabled={refreshing}
              onClick={() =>
                loadSubscription({
                  silent: true,
                })
              }
              className="inline-flex w-fit items-center justify-center gap-2 rounded-xl border border-[#E7DDDF] bg-white px-4 py-2.5 text-sm font-bold text-[#3D0F18] shadow-sm transition hover:bg-[#F8F5F3] disabled:cursor-not-allowed disabled:opacity-60"
            >
              <RefreshCw
                size={16}
                className={
                  refreshing
                    ? "animate-spin"
                    : ""
                }
              />

              {refreshing
                ? "Refreshing..."
                : "Refresh"}
            </button>
          </div>
        </div>
      </section>

      {/* =================================================== */}
      {/* CONTENT */}
      {/* =================================================== */}

      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8 lg:py-10">

        {error && (
          <div className="mb-6 flex items-start gap-3 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm font-semibold text-red-700">
            <AlertCircle
              size={18}
              className="mt-0.5 shrink-0"
            />

            {error}
          </div>
        )}

        {/* ================================================= */}
        {/* MAIN MEMBERSHIP STATE */}
        {/* ================================================= */}

        {isPremium &&
          activeSubscription && (
            <ActiveMembership
              subscription={
                activeSubscription
              }
            />
          )}

        {!isPremium &&
          pendingSubscription && (
            <PendingMembership
              subscription={
                pendingSubscription
              }
            />
          )}

        {!isPremium &&
          !pendingSubscription &&
          latestExpiredSubscription && (
            <ExpiredMembership
              subscription={
                latestExpiredSubscription
              }
            />
          )}

        {!isPremium &&
          !pendingSubscription &&
          !latestExpiredSubscription && (
            <FreeMembership />
          )}

        {/* ================================================= */}
        {/* QUICK ACTIONS */}
        {/* ================================================= */}

        <section className="mt-8">
          <SectionHeading
            title="Quick actions"
            description="Access the most important membership and marketplace tools."
          />

          <div className="mt-5 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">

            {isPremium ? (
              <ActionCard
                to="/account/analytics"
                icon={BarChart3}
                title="Advanced Analytics"
                description="Track promotion views, clicks, offers, conversions and spending."
                action="View analytics"
                featured
              />
            ) : (
              <ActionCard
                to="/premium"
                icon={Crown}
                title="Upgrade to Premium"
                description="Unlock advanced analytics, higher listing limits and promotion benefits."
                action="Explore Premium"
                featured
              />
            )}

            <ActionCard
              to="/premium"
              icon={Sparkles}
              title="Premium Benefits"
              description="Review everything included with your BarterTrade Premium membership."
              action="View benefits"
            />

            <ActionCard
              to="/my-listings"
              icon={LayoutDashboard}
              title="My Listings"
              description="Manage your marketplace listings and promotion activity."
              action="Manage listings"
            />

            <ActionCard
              to="/promotions"
              icon={TrendingUp}
              title="Promotions"
              description="Manage paid promotions and improve listing visibility."
              action="View promotions"
            />
          </div>
        </section>

        {/* ================================================= */}
        {/* ACCOUNT OVERVIEW */}
        {/* ================================================= */}

        <section className="mt-10">
          <SectionHeading
            title="Membership overview"
            description="A quick look at your current subscription status."
          />

          <div className="mt-5 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">

            <OverviewCard
              icon={Crown}
              label="Membership"
              value={
                isPremium
                  ? "Premium"
                  : pendingSubscription
                  ? "Pending"
                  : "Free"
              }
              description={
                isPremium
                  ? "Premium benefits are active."
                  : pendingSubscription
                  ? "Waiting for successful payment."
                  : "Standard BarterTrade account."
              }
            />

            <OverviewCard
              icon={CalendarDays}
              label="Premium until"
              value={
                isPremium
                  ? formatDate(
                      activeSubscription
                        ?.endsAt
                    )
                  : "—"
              }
              description={
                isPremium
                  ? `${getDaysRemaining(
                      activeSubscription
                        ?.endsAt
                    )} days remaining`
                  : "No active Premium expiry date."
              }
            />

            <OverviewCard
              icon={WalletCards}
              label="Plan price"
              value={
                displayedSubscription
                  ? `${
                      displayedSubscription.currency ||
                      "KES"
                    } ${formatMoney(
                      displayedSubscription.amount
                    )}`
                  : "—"
              }
              description={
                displayedSubscription
                  ? `${displayedSubscription.durationDays || 30} day membership`
                  : "No subscription purchased yet."
              }
            />

            <OverviewCard
              icon={ReceiptText}
              label="Latest payment"
              value={
                getLatestPayment(
                  latestSubscription
                )?.status ||
                "No payment"
              }
              description={
                getLatestPayment(
                  latestSubscription
                )?.receiptNumber
                  ? `Receipt ${getLatestPayment(
                      latestSubscription
                    ).receiptNumber}`
                  : "Latest subscription payment status."
              }
            />
          </div>
        </section>

        {/* ================================================= */}
        {/* DETAILS + BENEFITS */}
        {/* ================================================= */}

        <section className="mt-10">
          <SectionHeading
            title="Subscription details"
            description="Plan information, payment details and Premium entitlements."
          />

          <div className="mt-5 grid items-start gap-6 lg:grid-cols-[1.05fr_0.95fr]">

            {displayedSubscription ? (
              <MembershipDetails
                subscription={
                  displayedSubscription
                }
              />
            ) : (
              <NoMembershipDetails />
            )}

            <PremiumBenefits
              isPremium={isPremium}
            />
          </div>
        </section>

        {/* ================================================= */}
        {/* HISTORY */}
        {/* ================================================= */}

        <SubscriptionHistory
          subscriptions={
            subscriptions
          }
        />
      </div>
    </main>
  );
}

/*
 * ============================================================
 * ACTIVE MEMBERSHIP
 * ============================================================
 */

function ActiveMembership({
  subscription,
}) {
  const daysRemaining =
    getDaysRemaining(
      subscription.endsAt
    );

  const progress =
    getSubscriptionProgress(
      subscription.startsAt,
      subscription.endsAt
    );

  return (
    <section className="relative overflow-hidden rounded-[32px] bg-gradient-to-br from-[#3D0F18] via-[#5B1725] to-[#8A2638] text-white shadow-xl">

      <div className="absolute -right-20 -top-24 h-72 w-72 rounded-full bg-amber-300/10 blur-3xl" />

      <div className="absolute -bottom-24 -left-20 h-64 w-64 rounded-full bg-white/5 blur-3xl" />

      <div className="relative p-6 sm:p-8 lg:p-10">

        <div className="flex flex-col gap-8 lg:flex-row lg:items-center lg:justify-between">

          <div className="max-w-2xl">
            <span className="inline-flex items-center gap-2 rounded-full border border-emerald-300/20 bg-emerald-400/10 px-3 py-1.5 text-xs font-black uppercase tracking-wide text-emerald-300">
              <CheckCircle2
                size={14}
              />

              Active Membership
            </span>

            <div className="mt-5 flex items-center gap-4">
              <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-amber-300 text-[#3D0F18] shadow-lg">
                <Crown
                  size={28}
                  fill="currentColor"
                />
              </div>

              <div>
                <h2 className="text-2xl font-black sm:text-3xl">
                  BarterTrade Premium
                </h2>

                <p className="mt-1 text-sm leading-6 text-white/65">
                  Your Premium tools
                  and marketplace
                  benefits are currently
                  active.
                </p>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3 sm:min-w-[340px]">
            <div className="rounded-2xl border border-white/10 bg-white/5 p-4 backdrop-blur">
              <p className="text-[10px] font-black uppercase tracking-wider text-white/45">
                Remaining
              </p>

              <p className="mt-2 text-3xl font-black text-amber-300">
                {daysRemaining}
              </p>

              <p className="mt-1 text-xs text-white/50">
                {daysRemaining === 1
                  ? "day"
                  : "days"}
              </p>
            </div>

            <div className="rounded-2xl border border-white/10 bg-white/5 p-4 backdrop-blur">
              <p className="text-[10px] font-black uppercase tracking-wider text-white/45">
                Listing limit
              </p>

              <p className="mt-2 text-3xl font-black text-white">
                30
              </p>

              <p className="mt-1 text-xs text-white/50">
                active listings
              </p>
            </div>
          </div>
        </div>

        {/* PROGRESS */}

        <div className="mt-8">
          <div className="mb-2 flex flex-wrap justify-between gap-2 text-xs font-semibold text-white/50">
            <span>
              Started{" "}
              {formatDate(
                subscription.startsAt
              )}
            </span>

            <span>
              Expires{" "}
              {formatDate(
                subscription.endsAt
              )}
            </span>
          </div>

          <div className="h-2 overflow-hidden rounded-full bg-white/10">
            <div
              className="h-full rounded-full bg-amber-300 transition-all duration-500"
              style={{
                width: `${progress}%`,
              }}
            />
          </div>
        </div>

        {/* BUTTONS */}

        <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:flex-wrap">

          <Link
            to="/account/analytics"
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-amber-300 px-5 py-3 text-sm font-black text-[#3D0F18] shadow-sm transition hover:-translate-y-0.5 hover:bg-amber-200"
          >
            <BarChart3
              size={18}
            />

            Advanced Analytics

            <ArrowRight
              size={16}
            />
          </Link>

          <Link
            to="/premium"
            className="inline-flex items-center justify-center gap-2 rounded-xl border border-white/15 bg-white/10 px-5 py-3 text-sm font-bold text-white transition hover:bg-white/15"
          >
            <Sparkles
              size={17}
            />

            View Premium Benefits
          </Link>

          <Link
            to="/my-listings"
            className="inline-flex items-center justify-center gap-2 rounded-xl border border-white/15 bg-transparent px-5 py-3 text-sm font-bold text-white/80 transition hover:bg-white/10 hover:text-white"
          >
            <LayoutDashboard
              size={17}
            />

            Manage Listings
          </Link>
        </div>
      </div>
    </section>
  );
}

/*
 * ============================================================
 * PENDING MEMBERSHIP
 * ============================================================
 */

function PendingMembership({
  subscription,
}) {
  const payment =
    getLatestPayment(
      subscription
    );

  return (
    <section className="rounded-[32px] border border-amber-200 bg-gradient-to-br from-amber-50 to-white p-6 shadow-sm sm:p-8">

      <div className="flex flex-col gap-6 md:flex-row md:items-center md:justify-between">

        <div className="flex items-start gap-4">
          <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-amber-100 text-amber-700">
            <Clock3
              size={26}
            />
          </div>

          <div>
            <span className="text-xs font-black uppercase tracking-wider text-amber-700">
              Payment Pending
            </span>

            <h2 className="mt-1 text-2xl font-black text-[#3D0F18]">
              Complete your Premium payment
            </h2>

            <p className="mt-2 max-w-xl text-sm leading-6 text-gray-500">
              Your Premium
              subscription has been
              created but will only
              activate after a
              successful M-PESA
              payment.
            </p>

            {payment?.status && (
              <div className="mt-4 inline-flex items-center gap-2 rounded-full bg-amber-100 px-3 py-1.5 text-xs font-black text-amber-800">
                <Smartphone
                  size={13}
                />

                Payment{" "}
                {payment.status}
              </div>
            )}
          </div>
        </div>

        <div className="flex flex-col gap-3 sm:flex-row">
          <Link
            to="/premium"
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#8A2638] px-5 py-3 text-sm font-black text-white transition hover:bg-[#6F1D2D]"
          >
            Complete Payment

            <ArrowRight
              size={17}
            />
          </Link>
        </div>
      </div>
    </section>
  );
}

/*
 * ============================================================
 * EXPIRED MEMBERSHIP
 * ============================================================
 */

function ExpiredMembership({
  subscription,
}) {
  return (
    <section className="rounded-[32px] border border-[#E7DDDF] bg-white p-6 shadow-sm sm:p-8">

      <div className="flex flex-col gap-6 md:flex-row md:items-center md:justify-between">

        <div className="flex items-start gap-4">
          <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-gray-100 text-gray-500">
            <XCircle
              size={26}
            />
          </div>

          <div>
            <span className="text-xs font-black uppercase tracking-wider text-gray-400">
              Membership Expired
            </span>

            <h2 className="mt-1 text-2xl font-black text-[#3D0F18]">
              Your Premium membership
              has ended
            </h2>

            <p className="mt-2 max-w-xl text-sm leading-6 text-gray-500">
              Your previous Premium
              membership expired on{" "}
              <strong className="text-gray-700">
                {formatDate(
                  subscription.endsAt
                )}
              </strong>
              . Renew to restore your
              Premium entitlements.
            </p>
          </div>
        </div>

        <Link
          to="/premium"
          className="inline-flex shrink-0 items-center justify-center gap-2 rounded-xl bg-[#8A2638] px-5 py-3 text-sm font-black text-white transition hover:bg-[#6F1D2D]"
        >
          <RefreshCw
            size={16}
          />

          Renew Premium
        </Link>
      </div>
    </section>
  );
}

/*
 * ============================================================
 * FREE MEMBERSHIP
 * ============================================================
 */

function FreeMembership() {
  return (
    <section className="overflow-hidden rounded-[32px] border border-[#E7DDDF] bg-white shadow-sm">
      <div className="grid lg:grid-cols-[1.2fr_0.8fr]">

        <div className="p-7 sm:p-9 lg:p-10">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-amber-100 text-amber-700">
            <Crown
              size={27}
            />
          </div>

          <p className="mt-6 text-xs font-black uppercase tracking-[0.18em] text-[#8A2638]">
            BarterTrade Free
          </p>

          <h2 className="mt-2 max-w-xl text-3xl font-black tracking-tight text-[#3D0F18]">
            Unlock more tools for your
            marketplace activity.
          </h2>

          <p className="mt-4 max-w-xl text-sm leading-7 text-gray-500">
            Premium gives you advanced
            analytics, a higher active
            listing allowance, promotion
            discounts, a Premium badge
            and priority support.
          </p>

          <div className="mt-7 flex flex-col gap-3 sm:flex-row">
            <Link
              to="/premium"
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#8A2638] px-6 py-3.5 text-sm font-black text-white transition hover:bg-[#6F1D2D]"
            >
              <Crown
                size={17}
              />

              Explore Premium

              <ArrowRight
                size={17}
              />
            </Link>

            <Link
              to="/my-listings"
              className="inline-flex items-center justify-center gap-2 rounded-xl border border-[#E7DDDF] bg-white px-6 py-3.5 text-sm font-bold text-[#3D0F18] transition hover:bg-[#F8F5F3]"
            >
              <LayoutDashboard
                size={17}
              />

              My Listings
            </Link>
          </div>
        </div>

        <div className="flex items-center bg-gradient-to-br from-[#3D0F18] to-[#8A2638] p-7 text-white sm:p-9">
          <div className="w-full">
            <Sparkles
              size={34}
              className="text-amber-300"
            />

            <p className="mt-5 text-xs font-black uppercase tracking-[0.18em] text-amber-300">
              Premium includes
            </p>

            <div className="mt-5 space-y-4">
              {[
                "30 active listings",
                "Advanced analytics",
                "20% promotion discount",
                "Premium profile badge",
                "Priority support",
              ].map(
                (benefit) => (
                  <div
                    key={benefit}
                    className="flex items-center gap-3"
                  >
                    <div className="flex h-6 w-6 items-center justify-center rounded-full bg-white/10 text-amber-300">
                      <Check
                        size={13}
                      />
                    </div>

                    <span className="text-sm font-semibold text-white/85">
                      {benefit}
                    </span>
                  </div>
                )
              )}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

/*
 * ============================================================
 * QUICK ACTION
 * ============================================================
 */

function ActionCard({
  to,
  icon: Icon,
  title,
  description,
  action,
  featured = false,
}) {
  return (
    <Link
      to={to}
      className={`group flex min-h-[210px] flex-col rounded-3xl border p-5 shadow-sm transition duration-200 hover:-translate-y-1 hover:shadow-md ${
        featured
          ? "border-[#8A2638]/20 bg-[#3D0F18] text-white"
          : "border-[#E7DDDF] bg-white text-[#3D0F18]"
      }`}
    >
      <div
        className={`flex h-11 w-11 items-center justify-center rounded-2xl ${
          featured
            ? "bg-amber-300 text-[#3D0F18]"
            : "bg-[#F8ECEF] text-[#8A2638]"
        }`}
      >
        <Icon
          size={21}
        />
      </div>

      <h3 className="mt-5 text-base font-black">
        {title}
      </h3>

      <p
        className={`mt-2 flex-1 text-xs leading-5 ${
          featured
            ? "text-white/60"
            : "text-gray-500"
        }`}
      >
        {description}
      </p>

      <div
        className={`mt-5 flex items-center gap-2 text-xs font-black ${
          featured
            ? "text-amber-300"
            : "text-[#8A2638]"
        }`}
      >
        {action}

        <ArrowRight
          size={14}
          className="transition-transform group-hover:translate-x-1"
        />
      </div>
    </Link>
  );
}

/*
 * ============================================================
 * OVERVIEW
 * ============================================================
 */

function OverviewCard({
  icon: Icon,
  label,
  value,
  description,
}) {
  return (
    <article className="rounded-3xl border border-[#E7DDDF] bg-white p-5 shadow-sm">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <p className="text-[10px] font-black uppercase tracking-[0.14em] text-gray-400">
            {label}
          </p>

          <p className="mt-3 break-words text-xl font-black text-[#3D0F18]">
            {formatStatusValue(
              value
            )}
          </p>
        </div>

        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-[#F8ECEF] text-[#8A2638]">
          <Icon
            size={20}
          />
        </div>
      </div>

      <p className="mt-3 text-xs leading-5 text-gray-500">
        {description}
      </p>
    </article>
  );
}

/*
 * ============================================================
 * MEMBERSHIP DETAILS
 * ============================================================
 */

function MembershipDetails({
  subscription,
}) {
  const payment =
    getLatestPayment(
      subscription
    );

  return (
    <section className="rounded-[28px] border border-[#E7DDDF] bg-white p-6 shadow-sm sm:p-7">

      <div className="flex items-center gap-3">
        <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#F8ECEF] text-[#8A2638]">
          <CreditCard
            size={20}
          />
        </div>

        <div>
          <h3 className="font-black text-[#3D0F18]">
            Membership details
          </h3>

          <p className="mt-0.5 text-xs text-gray-400">
            Current or most recent
            subscription information.
          </p>
        </div>
      </div>

      <div className="mt-6 divide-y divide-[#F0E8EA]">

        <DetailRow
          label="Plan"
          value={
            subscription.plan ||
            "PREMIUM"
          }
        />

        <DetailRow
          label="Status"
          value={
            <StatusBadge
              status={
                subscription.status
              }
            />
          }
        />

        <DetailRow
          label="Price"
          value={`${
            subscription.currency ||
            "KES"
          } ${formatMoney(
            subscription.amount
          )}`}
        />

        <DetailRow
          label="Duration"
          value={`${subscription.durationDays || 30} days`}
        />

        <DetailRow
          label="Started"
          value={formatDateTime(
            subscription.startsAt
          )}
        />

        <DetailRow
          label="Expires"
          value={formatDateTime(
            subscription.endsAt
          )}
        />

        <DetailRow
          label="Created"
          value={formatDateTime(
            subscription.createdAt
          )}
        />

        {payment && (
          <>
            <DetailRow
              label="Payment status"
              value={
                <PaymentStatus
                  status={
                    payment.status
                  }
                />
              }
            />

            <DetailRow
              label="Provider"
              value={
                payment.provider ||
                "MPESA"
              }
            />

            <DetailRow
              label="Phone"
              value={formatPhone(
                payment.phoneNumber
              )}
            />

            <DetailRow
              label="M-PESA receipt"
              value={
                payment.receiptNumber ||
                "—"
              }
            />
          </>
        )}
      </div>
    </section>
  );
}

/*
 * ============================================================
 * NO DETAILS
 * ============================================================
 */

function NoMembershipDetails() {
  return (
    <section className="rounded-[28px] border border-[#E7DDDF] bg-white p-7 text-center shadow-sm">
      <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-gray-100 text-gray-400">
        <CreditCard
          size={22}
        />
      </div>

      <h3 className="mt-4 font-black text-[#3D0F18]">
        No subscription yet
      </h3>

      <p className="mx-auto mt-2 max-w-sm text-sm leading-6 text-gray-500">
        Your subscription and payment
        information will appear here
        after you start a Premium
        membership.
      </p>
    </section>
  );
}

/*
 * ============================================================
 * PREMIUM BENEFITS
 * ============================================================
 */

function PremiumBenefits({
  isPremium,
}) {
  const benefits = [
    {
      title:
        "30 active listings",
      description:
        "Increase your active listing allowance from 10 to 30.",
    },
    {
      title:
        "Advanced analytics",
      description:
        "Track promotion views, clicks, offers and conversion performance.",
    },
    {
      title:
        "20% promotion discount",
      description:
        "Receive Premium pricing on eligible paid listing promotions.",
    },
    {
      title:
        "Premium profile badge",
      description:
        "Show buyers and sellers your active Premium membership.",
    },
    {
      title:
        "Priority support",
      description:
        "Premium support entitlement while your membership remains active.",
    },
  ];

  return (
    <section className="rounded-[28px] bg-gradient-to-br from-[#3D0F18] to-[#6F1D2D] p-6 text-white shadow-sm sm:p-7">

      <div className="flex items-center justify-between gap-4">
        <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-amber-300 text-[#3D0F18]">
          <BadgeCheck
            size={22}
          />
        </div>

        <span
          className={`rounded-full px-3 py-1 text-[10px] font-black uppercase tracking-wider ${
            isPremium
              ? "bg-emerald-400/15 text-emerald-300"
              : "bg-white/10 text-white/50"
          }`}
        >
          {isPremium
            ? "Unlocked"
            : "Locked"}
        </span>
      </div>

      <h3 className="mt-5 text-xl font-black">
        Premium benefits
      </h3>

      <p className="mt-2 text-sm leading-6 text-white/55">
        {isPremium
          ? "Your Premium entitlements are currently available."
          : "Upgrade your account to unlock these marketplace benefits."}
      </p>

      <div className="mt-6 space-y-5">
        {benefits.map(
          ({
            title,
            description,
          }) => (
            <div
              key={title}
              className="flex items-start gap-3"
            >
              <div
                className={`mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full ${
                  isPremium
                    ? "bg-emerald-400/15 text-emerald-300"
                    : "bg-white/10 text-white/40"
                }`}
              >
                <Check
                  size={13}
                />
              </div>

              <div>
                <p
                  className={`text-sm font-bold ${
                    isPremium
                      ? "text-white"
                      : "text-white/60"
                  }`}
                >
                  {title}
                </p>

                <p className="mt-1 text-xs leading-5 text-white/45">
                  {description}
                </p>
              </div>
            </div>
          )
        )}
      </div>

      {isPremium ? (
        <Link
          to="/account/analytics"
          className="mt-7 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-amber-300 px-5 py-3 text-sm font-black text-[#3D0F18] transition hover:bg-amber-200"
        >
          <BarChart3
            size={17}
          />

          Open Advanced Analytics

          <ArrowRight
            size={16}
          />
        </Link>
      ) : (
        <Link
          to="/premium"
          className="mt-7 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-amber-300 px-5 py-3 text-sm font-black text-[#3D0F18] transition hover:bg-amber-200"
        >
          <Crown
            size={17}
          />

          Get Premium

          <ArrowRight
            size={16}
          />
        </Link>
      )}
    </section>
  );
}

/*
 * ============================================================
 * SUBSCRIPTION HISTORY
 * ============================================================
 */

function SubscriptionHistory({
  subscriptions,
}) {
  return (
    <section className="mt-10">

      <SectionHeading
        title="Subscription history"
        description="Previous and current Premium memberships and payment records."
      />

      <div className="mt-5 overflow-hidden rounded-[28px] border border-[#E7DDDF] bg-white shadow-sm">

        <div className="flex items-center justify-between border-b border-[#F0E8EA] px-5 py-5 sm:px-6">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#F8ECEF] text-[#8A2638]">
              <History
                size={19}
              />
            </div>

            <div>
              <p className="text-sm font-black text-[#3D0F18]">
                Membership records
              </p>

              <p className="mt-0.5 text-xs text-gray-400">
                Your Premium subscription
                activity.
              </p>
            </div>
          </div>

          <span className="rounded-full bg-gray-100 px-3 py-1 text-xs font-black text-gray-600">
            {subscriptions.length}
          </span>
        </div>

        {subscriptions.length ===
        0 ? (
          <div className="px-6 py-14 text-center">
            <ReceiptText
              size={30}
              className="mx-auto text-gray-300"
            />

            <p className="mt-3 text-sm font-bold text-gray-600">
              No subscription history
              yet.
            </p>
          </div>
        ) : (
          <>
            {/* DESKTOP */}

            <div className="hidden overflow-x-auto md:block">
              <table className="w-full">
                <thead className="bg-[#FCFAF9]">
                  <tr className="border-b border-[#F0E8EA]">

                    <TableHeading>
                      Plan
                    </TableHeading>

                    <TableHeading>
                      Status
                    </TableHeading>

                    <TableHeading>
                      Started
                    </TableHeading>

                    <TableHeading>
                      Expires
                    </TableHeading>

                    <TableHeading>
                      Payment
                    </TableHeading>

                    <TableHeading>
                      Receipt
                    </TableHeading>
                  </tr>
                </thead>

                <tbody>
                  {subscriptions.map(
                    (
                      subscription
                    ) => {
                      const payment =
                        getLatestPayment(
                          subscription
                        );

                      return (
                        <tr
                          key={
                            subscription.id
                          }
                          className="border-b border-[#F0E8EA] transition last:border-0 hover:bg-[#FCFAF9]"
                        >
                          <td className="px-6 py-5">
                            <div className="flex items-center gap-2">
                              <Crown
                                size={16}
                                className="text-amber-500"
                              />

                              <span className="text-sm font-black text-[#3D0F18]">
                                {subscription.plan ||
                                  "PREMIUM"}
                              </span>
                            </div>
                          </td>

                          <td className="px-6 py-5">
                            <StatusBadge
                              status={
                                subscription.status
                              }
                            />
                          </td>

                          <td className="px-6 py-5 text-sm font-semibold text-gray-600">
                            {formatDate(
                              subscription.startsAt
                            )}
                          </td>

                          <td className="px-6 py-5 text-sm font-semibold text-gray-600">
                            {formatDate(
                              subscription.endsAt
                            )}
                          </td>

                          <td className="px-6 py-5">
                            {payment ? (
                              <PaymentStatus
                                status={
                                  payment.status
                                }
                              />
                            ) : (
                              <span className="text-sm text-gray-400">
                                —
                              </span>
                            )}
                          </td>

                          <td className="px-6 py-5 text-sm font-bold text-gray-700">
                            {payment
                              ?.receiptNumber ||
                              "—"}
                          </td>
                        </tr>
                      );
                    }
                  )}
                </tbody>
              </table>
            </div>

            {/* MOBILE */}

            <div className="divide-y divide-[#F0E8EA] md:hidden">
              {subscriptions.map(
                (
                  subscription
                ) => {
                  const payment =
                    getLatestPayment(
                      subscription
                    );

                  return (
                    <div
                      key={
                        subscription.id
                      }
                      className="p-5"
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex items-center gap-2">
                          <Crown
                            size={16}
                            className="text-amber-500"
                          />

                          <span className="text-sm font-black text-[#3D0F18]">
                            {subscription.plan ||
                              "PREMIUM"}
                          </span>
                        </div>

                        <StatusBadge
                          status={
                            subscription.status
                          }
                        />
                      </div>

                      <div className="mt-5 grid grid-cols-2 gap-x-5 gap-y-5">

                        <MobileHistoryValue
                          label="Started"
                          value={formatDate(
                            subscription.startsAt
                          )}
                        />

                        <MobileHistoryValue
                          label="Expires"
                          value={formatDate(
                            subscription.endsAt
                          )}
                        />

                        <div>
                          <p className="text-[10px] font-black uppercase tracking-wider text-gray-400">
                            Payment
                          </p>

                          <div className="mt-1.5">
                            {payment ? (
                              <PaymentStatus
                                status={
                                  payment.status
                                }
                              />
                            ) : (
                              "—"
                            )}
                          </div>
                        </div>

                        <MobileHistoryValue
                          label="Receipt"
                          value={
                            payment
                              ?.receiptNumber ||
                            "—"
                          }
                        />
                      </div>
                    </div>
                  );
                }
              )}
            </div>
          </>
        )}
      </div>
    </section>
  );
}

/*
 * ============================================================
 * SMALL COMPONENTS
 * ============================================================
 */

function SectionHeading({
  title,
  description,
}) {
  return (
    <div>
      <h2 className="text-xl font-black text-[#3D0F18]">
        {title}
      </h2>

      <p className="mt-1 text-sm leading-6 text-gray-500">
        {description}
      </p>
    </div>
  );
}

function DetailRow({
  label,
  value,
}) {
  return (
    <div className="flex items-center justify-between gap-5 py-4">
      <span className="text-sm text-gray-500">
        {label}
      </span>

      <div className="max-w-[65%] break-words text-right text-sm font-bold text-gray-800">
        {value ?? "—"}
      </div>
    </div>
  );
}

function TableHeading({
  children,
}) {
  return (
    <th className="px-6 py-4 text-left text-[10px] font-black uppercase tracking-[0.14em] text-gray-400">
      {children}
    </th>
  );
}

function MobileHistoryValue({
  label,
  value,
}) {
  return (
    <div>
      <p className="text-[10px] font-black uppercase tracking-wider text-gray-400">
        {label}
      </p>

      <p className="mt-1.5 break-words text-xs font-semibold text-gray-700">
        {value}
      </p>
    </div>
  );
}

/*
 * ============================================================
 * STATUS BADGE
 * ============================================================
 */

function StatusBadge({
  status,
}) {
  const config = {
    ACTIVE: {
      className:
        "bg-emerald-100 text-emerald-700",
      icon:
        CheckCircle2,
    },

    PENDING: {
      className:
        "bg-amber-100 text-amber-700",
      icon:
        Clock3,
    },

    EXPIRED: {
      className:
        "bg-gray-100 text-gray-600",
      icon:
        XCircle,
    },

    CANCELLED: {
      className:
        "bg-red-100 text-red-700",
      icon:
        XCircle,
    },
  };

  const selected =
    config[status] ||
    config.PENDING;

  const Icon =
    selected.icon;

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[10px] font-black uppercase tracking-wider ${selected.className}`}
    >
      <Icon
        size={12}
      />

      {status || "UNKNOWN"}
    </span>
  );
}

/*
 * ============================================================
 * PAYMENT STATUS
 * ============================================================
 */

function PaymentStatus({
  status,
}) {
  const styles = {
    COMPLETED:
      "text-emerald-700",

    PENDING:
      "text-amber-700",

    FAILED:
      "text-red-600",

    CANCELLED:
      "text-gray-500",

    REFUNDED:
      "text-blue-600",
  };

  return (
    <span
      className={`text-xs font-black uppercase ${
        styles[status] ||
        "text-gray-500"
      }`}
    >
      {status || "—"}
    </span>
  );
}

/*
 * ============================================================
 * LOADING
 * ============================================================
 */

function SubscriptionSkeleton() {
  return (
    <main className="min-h-screen animate-pulse bg-[#F8F5F3]">
      <div className="border-b border-[#E7DDDF] bg-white">
        <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
          <div className="h-4 w-40 rounded bg-gray-200" />

          <div className="mt-3 h-9 w-64 rounded bg-gray-200" />

          <div className="mt-3 h-4 w-80 max-w-full rounded bg-gray-100" />
        </div>
      </div>

      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">

        <div className="h-80 rounded-[32px] bg-gray-200" />

        <div className="mt-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {[1, 2, 3, 4].map(
            (item) => (
              <div
                key={item}
                className="h-48 rounded-3xl bg-gray-200"
              />
            )
          )}
        </div>

        <div className="mt-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {[1, 2, 3, 4].map(
            (item) => (
              <div
                key={item}
                className="h-32 rounded-3xl bg-gray-200"
              />
            )
          )}
        </div>

        <div className="mt-8 h-96 rounded-[28px] bg-gray-200" />
      </div>
    </main>
  );
}

/*
 * ============================================================
 * HELPERS
 * ============================================================
 */

function getLatestPayment(
  subscription
) {
  if (!subscription) {
    return null;
  }

  if (
    Array.isArray(
      subscription.payments
    )
  ) {
    return (
      subscription.payments[0] ||
      null
    );
  }

  return null;
}

function formatDate(value) {
  if (!value) {
    return "—";
  }

  const date =
    new Date(value);

  if (
    Number.isNaN(
      date.getTime()
    )
  ) {
    return "—";
  }

  return new Intl.DateTimeFormat(
    "en-KE",
    {
      day: "numeric",
      month: "short",
      year: "numeric",
    }
  ).format(date);
}

function formatDateTime(
  value
) {
  if (!value) {
    return "—";
  }

  const date =
    new Date(value);

  if (
    Number.isNaN(
      date.getTime()
    )
  ) {
    return "—";
  }

  return new Intl.DateTimeFormat(
    "en-KE",
    {
      day: "numeric",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    }
  ).format(date);
}

function formatMoney(value) {
  const number =
    Number(value);

  if (
    Number.isNaN(number)
  ) {
    return "0";
  }

  return new Intl.NumberFormat(
    "en-KE",
    {
      maximumFractionDigits:
        2,
    }
  ).format(number);
}

function formatPhone(value) {
  if (!value) {
    return "—";
  }

  const phone =
    String(value);

  if (
    phone.startsWith("254") &&
    phone.length === 12
  ) {
    return `+254 ${phone.slice(
      3,
      6
    )} ${phone.slice(
      6,
      9
    )} ${phone.slice(9)}`;
  }

  return phone;
}

function getDaysRemaining(
  endsAt
) {
  if (!endsAt) {
    return 0;
  }

  const end =
    new Date(
      endsAt
    ).getTime();

  const difference =
    end - Date.now();

  if (difference <= 0) {
    return 0;
  }

  return Math.ceil(
    difference /
      (1000 *
        60 *
        60 *
        24)
  );
}

function getSubscriptionProgress(
  startsAt,
  endsAt
) {
  if (
    !startsAt ||
    !endsAt
  ) {
    return 0;
  }

  const start =
    new Date(
      startsAt
    ).getTime();

  const end =
    new Date(
      endsAt
    ).getTime();

  const now =
    Date.now();

  if (
    Number.isNaN(start) ||
    Number.isNaN(end) ||
    end <= start
  ) {
    return 0;
  }

  if (now <= start) {
    return 0;
  }

  if (now >= end) {
    return 100;
  }

  return Math.min(
    100,
    Math.max(
      0,
      ((now - start) /
        (end - start)) *
        100
    )
  );
}

function formatStatusValue(
  value
) {
  if (!value) {
    return "—";
  }

  const string =
    String(value);

  /*
   * Don't modify formatted dates, money,
   * receipt numbers etc.
   */
  if (
    string.includes(" ") ||
    string.includes(",") ||
    /\d/.test(string)
  ) {
    return string;
  }

  return (
    string.charAt(0) +
    string
      .slice(1)
      .toLowerCase()
  );
}