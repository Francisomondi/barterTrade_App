import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  ArrowRight,
  BadgeCheck,
  CalendarDays,
  CheckCircle2,
  Clock3,
  Crown,
  CreditCard,
  History,
  Loader2,
  ReceiptText,
  RefreshCw,
  ShieldCheck,
  Sparkles,
  Smartphone,
  XCircle,
  AlertCircle,
} from "lucide-react";

import {
  getMySubscription,
} from "../api/subscriptionApi";

import {
  Link,
} from "react-router-dom";

/**
 * ============================================================
 * MY SUBSCRIPTION DASHBOARD
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

  /**
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
        } catch (error) {
          console.error(
            "LOAD SUBSCRIPTION DASHBOARD ERROR:",
            error
          );

          setError(
            error.response?.data?.message ||
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

  /**
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

  /**
   * Latest subscription of any status.
   */

  const latestSubscription =
    subscriptions[0] ||
    null;

  /**
   * If there is no active subscription,
   * find the latest expired membership.
   */

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

  /**
   * ==========================================================
   * LOADING
   * ==========================================================
   */

  if (loading) {
    return (
      <SubscriptionSkeleton />
    );
  }

  /**
   * ==========================================================
   * ERROR
   * ==========================================================
   */

  if (error && !data) {
    return (
      <div className="min-h-[75vh] bg-[#faf8f5] px-4 py-16">
        <div className="mx-auto max-w-lg rounded-3xl border border-red-100 bg-white p-8 text-center shadow-sm">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-red-50">
            <AlertCircle
              size={28}
              className="text-red-600"
            />
          </div>

          <h1 className="mt-5 text-2xl font-black text-stone-950">
            Unable to load subscription
          </h1>

          <p className="mt-3 text-sm leading-6 text-stone-500">
            {error}
          </p>

          <button
            onClick={() =>
              loadSubscription()
            }
            className="mt-6 inline-flex items-center gap-2 rounded-xl bg-[#5a0b22] px-5 py-3 text-sm font-black text-white transition hover:bg-[#450719]"
          >
            <RefreshCw
              size={17}
            />

            Try Again
          </button>
        </div>
      </div>
    );
  }

  return (
    <main className="min-h-screen bg-[#faf8f5]">
      {/* =====================================================
          HEADER
      ===================================================== */}

      <section className="border-b border-stone-200 bg-white">
        <div className="mx-auto flex max-w-7xl flex-col gap-5 px-4 py-8 sm:flex-row sm:items-center sm:justify-between sm:px-6 lg:px-8">
          <div>
            <div className="flex items-center gap-2 text-xs font-black uppercase tracking-[0.18em] text-[#7b1538]">
              <Crown
                size={15}
              />

              BarterTrade Premium
            </div>

            <h1 className="mt-2 text-3xl font-black tracking-tight text-stone-950">
              My Subscription
            </h1>

            <p className="mt-2 text-sm text-stone-500">
              Manage your Premium
              membership and view
              your subscription
              history.
            </p>
          </div>

          <button
            type="button"
            disabled={
              refreshing
            }
            onClick={() =>
              loadSubscription({
                silent: true,
              })
            }
            className="inline-flex w-fit items-center gap-2 rounded-xl border border-stone-200 bg-white px-4 py-2.5 text-sm font-bold text-stone-700 transition hover:bg-stone-50 disabled:cursor-not-allowed disabled:opacity-60"
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
      </section>

      {/* =====================================================
          CONTENT
      ===================================================== */}

      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8 lg:py-10">
        {error && (
          <div className="mb-6 flex items-start gap-3 rounded-2xl border border-red-100 bg-red-50 p-4 text-sm text-red-700">
            <AlertCircle
              size={18}
              className="mt-0.5 shrink-0"
            />

            <span>
              {error}
            </span>
          </div>
        )}

        {/* ===================================================
            ACTIVE SUBSCRIPTION
        =================================================== */}

        {isPremium &&
          activeSubscription && (
            <ActiveMembership
              subscription={
                activeSubscription
              }
            />
          )}

        {/* ===================================================
            PENDING SUBSCRIPTION
        =================================================== */}

        {!isPremium &&
          pendingSubscription && (
            <PendingMembership
              subscription={
                pendingSubscription
              }
            />
          )}

        {/* ===================================================
            EXPIRED
        =================================================== */}

        {!isPremium &&
          !pendingSubscription &&
          latestExpiredSubscription && (
            <ExpiredMembership
              subscription={
                latestExpiredSubscription
              }
            />
          )}

        {/* ===================================================
            NEVER SUBSCRIBED
        =================================================== */}

        {!isPremium &&
          !pendingSubscription &&
          !latestExpiredSubscription && (
            <NoSubscription />
          )}

        {/* ===================================================
            OVERVIEW
        =================================================== */}

        <section className="mt-8 grid gap-5 lg:grid-cols-3">
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
                ? "Premium is awaiting successful payment."
                : "Upgrade anytime from the Premium page."
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
                : "Your latest payment information."
            }
          />
        </section>

        {/* ===================================================
            MEMBERSHIP DETAILS
        =================================================== */}

        {(activeSubscription ||
          pendingSubscription ||
          latestExpiredSubscription) && (
          <section className="mt-8 grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
            <MembershipDetails
              subscription={
                activeSubscription ||
                pendingSubscription ||
                latestExpiredSubscription
              }
            />

            <PremiumBenefits
              isPremium={
                isPremium
              }
            />
          </section>
        )}

        {/* ===================================================
            HISTORY
        =================================================== */}

        <SubscriptionHistory
          subscriptions={
            subscriptions
          }
        />
      </div>
    </main>
  );
}

/**
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
    <section className="relative overflow-hidden rounded-[2rem] bg-[#4b0a20] p-6 text-white shadow-xl shadow-[#4b0a20]/10 sm:p-8 lg:p-10">
      <div className="absolute -right-20 -top-24 h-72 w-72 rounded-full bg-amber-300/10 blur-3xl" />

      <div className="absolute -bottom-24 -left-20 h-64 w-64 rounded-full bg-[#9d3156]/20 blur-3xl" />

      <div className="relative">
        <div className="flex flex-col gap-7 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <span className="inline-flex items-center gap-2 rounded-full border border-emerald-300/20 bg-emerald-400/10 px-3 py-1.5 text-xs font-black text-emerald-300">
              <CheckCircle2
                size={14}
              />

              ACTIVE
            </span>

            <div className="mt-5 flex items-center gap-4">
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-amber-300 text-[#4b0a20]">
                <Crown
                  size={28}
                />
              </div>

              <div>
                <h2 className="text-2xl font-black sm:text-3xl">
                  BarterTrade
                  Premium
                </h2>

                <p className="mt-1 text-sm text-white/60">
                  Your Premium
                  membership is
                  active.
                </p>
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-white/10 bg-white/5 p-5 lg:min-w-[240px]">
            <p className="text-xs font-bold uppercase tracking-wider text-white/45">
              Time remaining
            </p>

            <div className="mt-2 flex items-end gap-2">
              <span className="text-4xl font-black text-amber-300">
                {daysRemaining}
              </span>

              <span className="pb-1 text-sm font-semibold text-white/60">
                {daysRemaining === 1
                  ? "day"
                  : "days"}
              </span>
            </div>
          </div>
        </div>

        <div className="mt-8">
          <div className="mb-2 flex justify-between text-xs font-semibold text-white/50">
            <span>
              {formatDate(
                subscription.startsAt
              )}
            </span>

            <span>
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

        <div className="mt-7 flex flex-wrap gap-3">
          <Link
            to="/premium"
            className="inline-flex items-center gap-2 rounded-xl bg-white px-5 py-3 text-sm font-black text-[#4b0a20] transition hover:bg-stone-100"
          >
            <Sparkles
              size={17}
            />

            View Premium Benefits
          </Link>

          <span className="inline-flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-5 py-3 text-sm font-semibold text-white/60">
            <ShieldCheck
              size={17}
            />

            Premium benefits active
          </span>
        </div>
      </div>
    </section>
  );
}

/**
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
    <section className="rounded-[2rem] border border-amber-200 bg-amber-50 p-6 sm:p-8">
      <div className="flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-start gap-4">
          <div className="flex h-13 w-13 shrink-0 items-center justify-center rounded-2xl bg-amber-200 p-3 text-amber-800">
            <Clock3
              size={25}
            />
          </div>

          <div>
            <span className="text-xs font-black uppercase tracking-wider text-amber-700">
              Payment pending
            </span>

            <h2 className="mt-1 text-2xl font-black text-stone-950">
              Premium is not
              active yet
            </h2>

            <p className="mt-2 max-w-xl text-sm leading-6 text-stone-600">
              Your Premium
              subscription has been
              created, but it still
              requires a successful
              M-Pesa payment.
            </p>

            {payment?.status && (
              <p className="mt-3 text-xs font-bold text-amber-800">
                Latest payment:{" "}
                {payment.status}
              </p>
            )}
          </div>
        </div>

        <Link
          to="/premium"
          className="inline-flex shrink-0 items-center justify-center gap-2 rounded-xl bg-[#5a0b22] px-5 py-3 text-sm font-black text-white transition hover:bg-[#450719]"
        >
          Complete Payment

          <ArrowRight
            size={17}
          />
        </Link>
      </div>
    </section>
  );
}

/**
 * ============================================================
 * EXPIRED MEMBERSHIP
 * ============================================================
 */

function ExpiredMembership({
  subscription,
}) {
  return (
    <section className="rounded-[2rem] border border-stone-200 bg-white p-6 shadow-sm sm:p-8">
      <div className="flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-start gap-4">
          <div className="flex h-13 w-13 shrink-0 items-center justify-center rounded-2xl bg-stone-100 p-3 text-stone-500">
            <XCircle
              size={25}
            />
          </div>

          <div>
            <span className="text-xs font-black uppercase tracking-wider text-stone-400">
              Expired
            </span>

            <h2 className="mt-1 text-2xl font-black text-stone-950">
              Your Premium
              membership has ended
            </h2>

            <p className="mt-2 text-sm leading-6 text-stone-500">
              Your previous
              membership expired on{" "}
              <strong className="text-stone-700">
                {formatDate(
                  subscription.endsAt
                )}
              </strong>
              .
            </p>
          </div>
        </div>

        <Link
          to="/premium"
          className="inline-flex shrink-0 items-center justify-center gap-2 rounded-xl bg-[#5a0b22] px-5 py-3 text-sm font-black text-white transition hover:bg-[#450719]"
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

/**
 * ============================================================
 * NO SUBSCRIPTION
 * ============================================================
 */

function NoSubscription() {
  return (
    <section className="overflow-hidden rounded-[2rem] border border-stone-200 bg-white shadow-sm">
      <div className="grid lg:grid-cols-[1fr_0.8fr]">
        <div className="p-7 sm:p-10">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-amber-100 text-amber-700">
            <Crown size={27} />
          </div>

          <h2 className="mt-6 text-3xl font-black text-stone-950">
            You are currently
            using BarterTrade Free
          </h2>

          <p className="mt-4 max-w-xl text-sm leading-7 text-stone-500">
            Upgrade to Premium to
            unlock additional
            marketplace tools,
            analytics and member
            benefits.
          </p>

          <Link
            to="/premium"
            className="mt-7 inline-flex items-center gap-2 rounded-xl bg-[#5a0b22] px-6 py-3.5 text-sm font-black text-white transition hover:bg-[#450719]"
          >
            <Crown
              size={17}
            />

            Explore Premium

            <ArrowRight
              size={17}
            />
          </Link>
        </div>

        <div className="flex items-center justify-center bg-[#4b0a20] p-8">
          <div className="text-center">
            <Sparkles
              size={36}
              className="mx-auto text-amber-300"
            />

            <p className="mt-4 text-sm font-black uppercase tracking-[0.18em] text-amber-300">
              Premium
            </p>

            <p className="mt-2 text-4xl font-black text-white">
              More from barter.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}

/**
 * ============================================================
 * OVERVIEW CARD
 * ============================================================
 */

function OverviewCard({
  icon: Icon,
  label,
  value,
  description,
}) {
  return (
    <article className="rounded-2xl border border-stone-200 bg-white p-5 shadow-sm">
      <div className="flex items-start gap-4">
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[#5a0b22]/10 text-[#6d1030]">
          <Icon size={20} />
        </div>

        <div className="min-w-0">
          <p className="text-xs font-bold uppercase tracking-wider text-stone-400">
            {label}
          </p>

          <p className="mt-1 truncate text-lg font-black text-stone-900">
            {formatStatusValue(
              value
            )}
          </p>

          <p className="mt-1 text-xs leading-5 text-stone-500">
            {description}
          </p>
        </div>
      </div>
    </article>
  );
}

/**
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
    <section className="rounded-3xl border border-stone-200 bg-white p-6 shadow-sm sm:p-7">
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#5a0b22]/10 text-[#6d1030]">
          <CreditCard
            size={19}
          />
        </div>

        <div>
          <h2 className="font-black text-stone-950">
            Membership details
          </h2>

          <p className="text-xs text-stone-400">
            Your current or most
            recent subscription.
          </p>
        </div>
      </div>

      <div className="mt-6 divide-y divide-stone-100">
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
          value={`${subscription.currency || "KES"} ${formatMoney(
            subscription.amount
          )}`}
        />

        <DetailRow
          label="Duration"
          value={`${subscription.durationDays} days`}
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
              label="Payment"
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
              value={
                formatPhone(
                  payment.phoneNumber
                )
              }
            />

            <DetailRow
              label="M-Pesa receipt"
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

/**
 * ============================================================
 * PREMIUM BENEFITS
 * ============================================================
 */

function PremiumBenefits({
  isPremium,
}) {
  const benefits = [
    "Premium profile badge",
    "Advanced listing analytics",
    "Higher active listing allowance",
    "Promotion benefits",
    "Priority support",
  ];

  return (
    <section className="rounded-3xl bg-[#4b0a20] p-6 text-white shadow-sm sm:p-7">
      <BadgeCheck
        size={26}
        className="text-amber-300"
      />

      <h2 className="mt-4 text-xl font-black">
        Premium benefits
      </h2>

      <p className="mt-2 text-sm leading-6 text-white/55">
        {isPremium
          ? "These benefits are available while your membership remains active."
          : "Activate Premium to unlock these benefits."}
      </p>

      <div className="mt-6 space-y-4">
        {benefits.map(
          (benefit) => (
            <div
              key={benefit}
              className="flex items-center gap-3"
            >
              <div
                className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full ${
                  isPremium
                    ? "bg-emerald-400/15 text-emerald-300"
                    : "bg-white/10 text-white/40"
                }`}
              >
                <CheckCircle2
                  size={14}
                />
              </div>

              <span
                className={`text-sm font-semibold ${
                  isPremium
                    ? "text-white"
                    : "text-white/50"
                }`}
              >
                {benefit}
              </span>
            </div>
          )
        )}
      </div>

      {!isPremium && (
        <Link
          to="/premium"
          className="mt-7 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-amber-300 px-5 py-3 text-sm font-black text-[#4b0a20] transition hover:bg-amber-200"
        >
          Get Premium

          <ArrowRight
            size={16}
          />
        </Link>
      )}
    </section>
  );
}

/**
 * ============================================================
 * SUBSCRIPTION HISTORY
 * ============================================================
 */

function SubscriptionHistory({
  subscriptions,
}) {
  return (
    <section className="mt-8 rounded-3xl border border-stone-200 bg-white shadow-sm">
      <div className="flex items-center justify-between border-b border-stone-100 px-6 py-5">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-stone-100 text-stone-600">
            <History
              size={19}
            />
          </div>

          <div>
            <h2 className="font-black text-stone-950">
              Subscription history
            </h2>

            <p className="text-xs text-stone-400">
              Previous and current
              Premium memberships.
            </p>
          </div>
        </div>

        <span className="rounded-full bg-stone-100 px-3 py-1 text-xs font-black text-stone-600">
          {subscriptions.length}
        </span>
      </div>

      {subscriptions.length ===
      0 ? (
        <div className="px-6 py-14 text-center">
          <ReceiptText
            size={30}
            className="mx-auto text-stone-300"
          />

          <p className="mt-3 text-sm font-bold text-stone-600">
            No subscription
            history yet.
          </p>
        </div>
      ) : (
        <>
          {/* DESKTOP */}

          <div className="hidden overflow-x-auto md:block">
            <table className="w-full">
              <thead>
                <tr className="border-b border-stone-100 text-left">
                  <th className="px-6 py-4 text-[11px] font-black uppercase tracking-wider text-stone-400">
                    Plan
                  </th>

                  <th className="px-6 py-4 text-[11px] font-black uppercase tracking-wider text-stone-400">
                    Status
                  </th>

                  <th className="px-6 py-4 text-[11px] font-black uppercase tracking-wider text-stone-400">
                    Started
                  </th>

                  <th className="px-6 py-4 text-[11px] font-black uppercase tracking-wider text-stone-400">
                    Expires
                  </th>

                  <th className="px-6 py-4 text-[11px] font-black uppercase tracking-wider text-stone-400">
                    Payment
                  </th>

                  <th className="px-6 py-4 text-[11px] font-black uppercase tracking-wider text-stone-400">
                    Receipt
                  </th>
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
                        className="border-b border-stone-100 last:border-0"
                      >
                        <td className="px-6 py-5">
                          <div className="flex items-center gap-2">
                            <Crown
                              size={
                                16
                              }
                              className="text-amber-500"
                            />

                            <span className="text-sm font-black text-stone-800">
                              {
                                subscription.plan
                              }
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

                        <td className="px-6 py-5 text-sm font-semibold text-stone-600">
                          {formatDate(
                            subscription.startsAt
                          )}
                        </td>

                        <td className="px-6 py-5 text-sm font-semibold text-stone-600">
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
                            <span className="text-sm text-stone-400">
                              —
                            </span>
                          )}
                        </td>

                        <td className="px-6 py-5 text-sm font-bold text-stone-700">
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

          <div className="divide-y divide-stone-100 md:hidden">
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
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex items-center gap-2">
                        <Crown
                          size={16}
                          className="text-amber-500"
                        />

                        <span className="text-sm font-black text-stone-900">
                          {
                            subscription.plan
                          }
                        </span>
                      </div>

                      <StatusBadge
                        status={
                          subscription.status
                        }
                      />
                    </div>

                    <div className="mt-4 grid grid-cols-2 gap-4 text-xs">
                      <div>
                        <p className="font-bold uppercase tracking-wider text-stone-400">
                          Started
                        </p>

                        <p className="mt-1 font-semibold text-stone-700">
                          {formatDate(
                            subscription.startsAt
                          )}
                        </p>
                      </div>

                      <div>
                        <p className="font-bold uppercase tracking-wider text-stone-400">
                          Expires
                        </p>

                        <p className="mt-1 font-semibold text-stone-700">
                          {formatDate(
                            subscription.endsAt
                          )}
                        </p>
                      </div>

                      <div>
                        <p className="font-bold uppercase tracking-wider text-stone-400">
                          Payment
                        </p>

                        <div className="mt-1">
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

                      <div>
                        <p className="font-bold uppercase tracking-wider text-stone-400">
                          Receipt
                        </p>

                        <p className="mt-1 font-semibold text-stone-700">
                          {payment
                            ?.receiptNumber ||
                            "—"}
                        </p>
                      </div>
                    </div>
                  </div>
                );
              }
            )}
          </div>
        </>
      )}
    </section>
  );
}

/**
 * ============================================================
 * DETAIL ROW
 * ============================================================
 */

function DetailRow({
  label,
  value,
}) {
  return (
    <div className="flex items-center justify-between gap-5 py-4">
      <span className="text-sm text-stone-500">
        {label}
      </span>

      <div className="text-right text-sm font-bold text-stone-800">
        {value ?? "—"}
      </div>
    </div>
  );
}

/**
 * ============================================================
 * SUBSCRIPTION STATUS BADGE
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
        "bg-stone-100 text-stone-600",
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
      <Icon size={12} />

      {status || "UNKNOWN"}
    </span>
  );
}

/**
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
      "text-stone-500",

    REFUNDED:
      "text-blue-600",
  };

  return (
    <span
      className={`text-xs font-black uppercase ${
        styles[status] ||
        "text-stone-500"
      }`}
    >
      {status || "—"}
    </span>
  );
}

/**
 * ============================================================
 * LOADING SKELETON
 * ============================================================
 */

function SubscriptionSkeleton() {
  return (
    <div className="min-h-screen animate-pulse bg-[#faf8f5]">
      <div className="border-b border-stone-200 bg-white">
        <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
          <div className="h-4 w-40 rounded bg-stone-200" />

          <div className="mt-3 h-9 w-64 rounded bg-stone-200" />

          <div className="mt-3 h-4 w-80 max-w-full rounded bg-stone-100" />
        </div>
      </div>

      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="h-72 rounded-[2rem] bg-stone-200" />

        <div className="mt-8 grid gap-5 lg:grid-cols-3">
          {[1, 2, 3].map(
            (item) => (
              <div
                key={item}
                className="h-32 rounded-2xl bg-stone-200"
              />
            )
          )}
        </div>

        <div className="mt-8 h-96 rounded-3xl bg-stone-200" />
      </div>
    </div>
  );
}

/**
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
    phone.startsWith(
      "254"
    ) &&
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

  const elapsed =
    now - start;

  const duration =
    end - start;

  return Math.min(
    100,
    Math.max(
      0,
      (elapsed / duration) *
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

  return (
    string.charAt(0) +
    string
      .slice(1)
      .toLowerCase()
  );
}