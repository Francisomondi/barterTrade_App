import {
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";

import {
  AlertCircle,
  ArrowRight,
  BadgeCheck,
  BarChart3,
  BriefcaseBusiness,
  Building2,
  Check,
  CheckCircle2,
  Clock3,
  Crown,
  FileBarChart,
  Loader2,
  Megaphone,
  ShieldCheck,
  Smartphone,
  Sparkles,
  TrendingUp,
  X,
  Zap,
} from "lucide-react";

import {
  createSubscription,
  getMySubscription,
  getSubscriptionPlans,
  getSubscriptionPaymentStatus,
  payForSubscription,
} from "../api/subscriptionApi";

import { useAuth } from "../context/AuthContext";

/*
 * ============================================================
 * CONFIG
 * ============================================================
 */

const PAYMENT_POLL_INTERVAL = 3000;
const PAYMENT_MAX_ATTEMPTS = 40;

const BUSINESS_PRO_PLAN = "BUSINESS_PRO";

/*
 * ============================================================
 * BUSINESS PRO
 * ============================================================
 */

export default function BusinessPro() {
  const { refreshUser } = useAuth();

  const [plan, setPlan] =
    useState(null);

  const [
    subscriptionData,
    setSubscriptionData,
  ] = useState(null);

  const [
    currentSubscription,
    setCurrentSubscription,
  ] = useState(null);

  const [
    currentPayment,
    setCurrentPayment,
  ] = useState(null);

  const [loading, setLoading] =
    useState(true);

  const [
    pageError,
    setPageError,
  ] = useState("");

  const [
    showPaymentModal,
    setShowPaymentModal,
  ] = useState(false);

  const [
    phoneNumber,
    setPhoneNumber,
  ] = useState("");

  const [
    paymentState,
    setPaymentState,
  ] = useState("IDLE");

  const [
    paymentMessage,
    setPaymentMessage,
  ] = useState("");

  const [
    paymentError,
    setPaymentError,
  ] = useState("");

  const pollingRef = useRef(false);
  const mountedRef = useRef(true);

  /*
   * ==========================================================
   * LOAD BUSINESS PRO
   * ==========================================================
   */

  const loadBusinessProData =
    useCallback(async () => {
      try {
        setLoading(true);
        setPageError("");

        const [
          plansResponse,
          subscriptionResponse,
        ] = await Promise.all([
          getSubscriptionPlans(),
          getMySubscription(),
        ]);

        const businessPlan =
          plansResponse?.plans?.find(
            (item) =>
              item.type ===
              BUSINESS_PRO_PLAN
          ) || null;

        if (!mountedRef.current) {
          return;
        }

        setPlan(businessPlan);

        setSubscriptionData(
          subscriptionResponse
        );

        /*
         * Supports the newer structured
         * /subscriptions/me response.
         */

        const businessPro =
          subscriptionResponse
            ?.plans?.businessPro;

        /*
         * Fallback supports existing
         * subscription arrays as well.
         */

        const fallbackActive =
          subscriptionResponse
            ?.subscriptions?.find(
              (subscription) =>
                subscription.plan ===
                  BUSINESS_PRO_PLAN &&
                subscription.status ===
                  "ACTIVE"
            ) || null;

        const fallbackPending =
          subscriptionResponse
            ?.subscriptions?.find(
              (subscription) =>
                subscription.plan ===
                  BUSINESS_PRO_PLAN &&
                subscription.status ===
                  "PENDING"
            ) || null;

        setCurrentSubscription(
          businessPro
            ?.activeSubscription ||
            businessPro
              ?.pendingSubscription ||
            fallbackActive ||
            fallbackPending ||
            null
        );

        if (
          businessPro?.latestPayment
        ) {
          setCurrentPayment(
            businessPro.latestPayment
          );
        }
      } catch (error) {
        console.error(
          "LOAD BUSINESS PRO ERROR:",
          error
        );

        if (!mountedRef.current) {
          return;
        }

        setPageError(
          error.response?.data?.message ||
            "Unable to load Business Pro information."
        );
      } finally {
        if (mountedRef.current) {
          setLoading(false);
        }
      }
    }, []);

  useEffect(() => {
    mountedRef.current = true;

    loadBusinessProData();

    return () => {
      mountedRef.current = false;
      pollingRef.current = false;
    };
  }, [loadBusinessProData]);

  /*
   * ==========================================================
   * DERIVED BUSINESS PRO STATE
   * ==========================================================
   */

  const businessProData =
    subscriptionData
      ?.plans?.businessPro ||
    null;

  const fallbackActiveSubscription =
    subscriptionData
      ?.subscriptions?.find(
        (subscription) =>
          subscription.plan ===
            BUSINESS_PRO_PLAN &&
          subscription.status ===
            "ACTIVE" &&
          (!subscription.endsAt ||
            new Date(
              subscription.endsAt
            ).getTime() > Date.now())
      ) || null;

  const activeSubscription =
    businessProData
      ?.activeSubscription ||
    fallbackActiveSubscription ||
    null;

  const pendingSubscription =
    businessProData
      ?.pendingSubscription ||
    subscriptionData
      ?.subscriptions?.find(
        (subscription) =>
          subscription.plan ===
            BUSINESS_PRO_PLAN &&
          subscription.status ===
            "PENDING"
      ) ||
    null;

  const isBusinessPro =
    Boolean(
      businessProData?.isActive ||
        activeSubscription
    );

  /*
   * If the new API exposes eligibility,
   * respect it.
   *
   * Older responses won't contain this,
   * so we don't block the page.
   */

  const businessEligible =
    businessProData?.eligible !==
    false;

  const daysRemaining =
    businessProData
      ?.daysRemaining ??
    getDaysRemaining(
      activeSubscription?.endsAt
    );

  const latestReceipt =
    businessProData
      ?.latestReceiptNumber ||
    currentPayment
      ?.receiptNumber ||
    null;

  /*
   * ==========================================================
   * PAYMENT MODAL
   * ==========================================================
   */

  const openPaymentModal = () => {
    if (isBusinessPro) {
      return;
    }

    if (!businessEligible) {
      return;
    }

    setPaymentError("");
    setPaymentMessage("");
    setPaymentState("IDLE");

    setShowPaymentModal(true);
  };

  const closePaymentModal = () => {
    if (
      paymentState ===
        "CREATING" ||
      paymentState ===
        "INITIATING" ||
      paymentState ===
        "POLLING"
    ) {
      return;
    }

    pollingRef.current = false;

    setShowPaymentModal(false);
  };

  /*
   * ==========================================================
   * POLL M-PESA PAYMENT
   * ==========================================================
   */

  const pollPayment =
    async (paymentId) => {
      if (!paymentId) {
        return;
      }

      pollingRef.current = true;

      setPaymentState(
        "POLLING"
      );

      setPaymentMessage(
        "Waiting for M-Pesa confirmation..."
      );

      for (
        let attempt = 1;
        attempt <=
        PAYMENT_MAX_ATTEMPTS;
        attempt++
      ) {
        if (
          !pollingRef.current ||
          !mountedRef.current
        ) {
          return;
        }

        try {
          const data =
            await getSubscriptionPaymentStatus(
              paymentId
            );

          if (
            !mountedRef.current
          ) {
            return;
          }

          const payment =
            data?.payment;

          const subscription =
            data?.subscription;

          if (payment) {
            setCurrentPayment(
              payment
            );
          }

          if (subscription) {
            setCurrentSubscription(
              subscription
            );
          }

          /*
           * SUCCESS
           */

          if (
            payment?.status ===
            "COMPLETED"
          ) {
            pollingRef.current =
              false;

            setPaymentState(
              "SUCCESS"
            );

            setPaymentMessage(
              "Payment confirmed. Business Pro is now active."
            );

            await Promise.all([
              loadBusinessProData(),
              refreshUser(),
            ]);

            return;
          }

          /*
           * FAILED / CANCELLED
           */

          if (
            payment?.status ===
              "FAILED" ||
            payment?.status ===
              "CANCELLED"
          ) {
            pollingRef.current =
              false;

            setPaymentState(
              "FAILED"
            );

            setPaymentError(
              payment
                ?.resultDescription ||
                (payment.status ===
                "CANCELLED"
                  ? "The M-Pesa request was cancelled."
                  : "The M-Pesa payment failed.")
            );

            return;
          }
        } catch (error) {
          console.error(
            "BUSINESS PRO PAYMENT POLLING ERROR:",
            error
          );

          /*
           * Keep polling after a temporary
           * network failure.
           */
        }

        if (
          attempt <
          PAYMENT_MAX_ATTEMPTS
        ) {
          await new Promise(
            (resolve) =>
              setTimeout(
                resolve,
                PAYMENT_POLL_INTERVAL
              )
          );
        }
      }

      pollingRef.current = false;

      if (!mountedRef.current) {
        return;
      }

      setPaymentState(
        "TIMEOUT"
      );

      setPaymentError(
        "Payment confirmation is taking longer than expected. If you completed the M-Pesa payment, Business Pro will activate once confirmation arrives."
      );
    };

  /*
   * ==========================================================
   * START BUSINESS PRO PAYMENT
   * ==========================================================
   */

  const handleSubscribe =
    async (event) => {
      event.preventDefault();

      if (!plan) {
        setPaymentError(
          "Business Pro plan information is unavailable."
        );

        return;
      }

      const phone =
        phoneNumber.trim();

      if (!phone) {
        setPaymentError(
          "Enter the Safaricom number that will make the payment."
        );

        return;
      }

      try {
        pollingRef.current =
          false;

        setPaymentError("");

        setPaymentMessage(
          "Preparing your Business Pro subscription..."
        );

        setPaymentState(
          "CREATING"
        );

        /*
         * CREATE / REUSE BUSINESS PRO
         */

        const subscriptionResponse =
          await createSubscription(
            BUSINESS_PRO_PLAN
          );

        const subscription =
          subscriptionResponse
            ?.subscription;

        if (!subscription?.id) {
          throw new Error(
            "Business Pro subscription could not be created."
          );
        }

        setCurrentSubscription(
          subscription
        );

        /*
         * INITIATE M-PESA
         */

        setPaymentState(
          "INITIATING"
        );

        setPaymentMessage(
          "Sending an M-Pesa request to your phone..."
        );

        const paymentResponse =
          await payForSubscription(
            subscription.id,
            phone
          );

        const payment =
          paymentResponse
            ?.payment;

        if (!payment?.id) {
          throw new Error(
            "Payment request could not be created."
          );
        }

        setCurrentPayment(
          payment
        );

        setPaymentMessage(
          "Check your phone and enter your M-Pesa PIN."
        );

        await pollPayment(
          payment.id
        );
      } catch (error) {
        console.error(
          "BUSINESS PRO PAYMENT ERROR:",
          error
        );

        pollingRef.current =
          false;

        const response =
          error.response?.data;

        /*
         * Already active.
         */

        if (
          response?.code ===
            "ACTIVE_SUBSCRIPTION_EXISTS" ||
          response?.code ===
            "SUBSCRIPTION_ALREADY_ACTIVE"
        ) {
          setPaymentState(
            "SUCCESS"
          );

          setPaymentMessage(
            "Your Business Pro subscription is already active."
          );

          await Promise.all([
            loadBusinessProData(),
            refreshUser(),
          ]);

          return;
        }

        /*
         * Existing STK request.
         */

        if (
          response?.code ===
          "PAYMENT_ALREADY_PENDING"
        ) {
          const existingPayment =
            response?.payment;

          if (
            existingPayment?.id
          ) {
            setCurrentPayment(
              existingPayment
            );

            setPaymentMessage(
              "An M-Pesa request is already pending. Waiting for confirmation..."
            );

            await pollPayment(
              existingPayment.id
            );

            return;
          }
        }

        /*
         * Business account required.
         */

        if (
          response?.code ===
          "BUSINESS_ACCOUNT_REQUIRED"
        ) {
          setPaymentState(
            "FAILED"
          );

          setPaymentError(
            response?.message ||
              "Create your business account before upgrading to Business Pro."
          );

          return;
        }

        setPaymentState(
          "FAILED"
        );

        setPaymentError(
          response?.message ||
            error.message ||
            "Unable to start Business Pro payment."
        );
      }
    };

  /*
   * ==========================================================
   * FINISH PAYMENT
   * ==========================================================
   */

  const finishPayment =
    async () => {
      pollingRef.current =
        false;

      setShowPaymentModal(
        false
      );

      setPaymentState(
        "IDLE"
      );

      setPaymentError("");
      setPaymentMessage("");

      await Promise.all([
        loadBusinessProData(),
        refreshUser(),
      ]);
    };

  /*
   * ==========================================================
   * LOADING
   * ==========================================================
   */

  if (loading) {
    return (
      <BusinessProSkeleton />
    );
  }

  /*
   * ==========================================================
   * ERROR
   * ==========================================================
   */

  if (pageError) {
    return (
      <div className="min-h-[70vh] bg-[#F8F5F3] px-4 py-16">
        <div className="mx-auto max-w-xl rounded-3xl border border-red-100 bg-white p-8 text-center shadow-sm">
          <AlertCircle
            size={42}
            className="mx-auto text-red-600"
          />

          <h1 className="mt-4 text-xl font-black text-stone-900">
            Unable to load Business Pro
          </h1>

          <p className="mt-2 text-sm text-stone-500">
            {pageError}
          </p>

          <button
            type="button"
            onClick={
              loadBusinessProData
            }
            className="mt-6 rounded-xl bg-[#5B1725] px-5 py-3 text-sm font-bold text-white transition hover:bg-[#3D0F18]"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  /*
   * ==========================================================
   * PAGE
   * ==========================================================
   */

  return (
    <>
      <main className="min-h-screen bg-[#F8F5F3]">
        {/* HERO */}

        <section className="relative overflow-hidden bg-[#3D0F18]">
          <div
            className="pointer-events-none absolute inset-0 opacity-[0.06]"
            style={{
              backgroundImage:
                "radial-gradient(circle at 1px 1px, white 1px, transparent 0)",
              backgroundSize:
                "26px 26px",
            }}
          />

          <div className="absolute -left-24 top-10 h-72 w-72 rounded-full bg-[#8A2638]/25 blur-3xl" />

          <div className="absolute -right-24 -top-20 h-80 w-80 rounded-full bg-[#D6B15E]/10 blur-3xl" />

          <div className="relative mx-auto grid max-w-7xl gap-8 px-4 py-12 sm:px-6 lg:grid-cols-[1.08fr_0.92fr] lg:px-8 lg:py-16">
            <div className="flex flex-col justify-center">
              <div className="mb-5 flex">
                <span className="inline-flex items-center gap-2 rounded-full border border-[#D6B15E]/30 bg-[#D6B15E]/10 px-4 py-2 text-xs font-bold uppercase tracking-[0.18em] text-[#F0D98E]">
                  <BriefcaseBusiness
                    size={15}
                  />

                  BarterConnekt
                  Business Pro
                </span>
              </div>

              <h1 className="max-w-3xl text-4xl font-black leading-tight text-white sm:text-5xl lg:text-6xl">
                Turn your business
                activity into{" "}
                <span className="text-[#E8C96F]">
                  insight.
                </span>
              </h1>

              <p className="mt-6 max-w-2xl text-base leading-7 text-white/70 sm:text-lg">
                Business Pro gives
                BarterConnekt businesses
                deeper analytics,
                professional reports and
                advanced tools for
                understanding marketplace
                performance.
              </p>

              <div className="mt-8 flex flex-wrap gap-3">
                {isBusinessPro ? (
                  <div className="inline-flex items-center gap-2 rounded-xl bg-emerald-500 px-5 py-3 text-sm font-extrabold text-white">
                    <CheckCircle2
                      size={18}
                    />

                    Business Pro Active
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={
                      openPaymentModal
                    }
                    disabled={
                      !businessEligible
                    }
                    className="inline-flex items-center gap-2 rounded-xl bg-[#D6B15E] px-6 py-3.5 text-sm font-black text-[#3D0F18] shadow-lg shadow-black/10 transition hover:-translate-y-0.5 hover:bg-[#E4C979] disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    <Crown
                      size={18}
                    />

                    Upgrade to Pro

                    <ArrowRight
                      size={17}
                    />
                  </button>
                )}

                <button
                  type="button"
                  onClick={() =>
                    document
                      .getElementById(
                        "business-pro-benefits"
                      )
                      ?.scrollIntoView({
                        behavior:
                          "smooth",
                      })
                  }
                  className="rounded-xl border border-white/20 bg-white/5 px-6 py-3.5 text-sm font-bold text-white transition hover:bg-white/10"
                >
                  Explore benefits
                </button>
              </div>
            </div>

            {/* PLAN CARD */}

            <div className="flex items-center justify-center lg:justify-end">
              <div className="w-full max-w-md rounded-[2rem] border border-white/15 bg-white p-7 shadow-2xl shadow-black/25 sm:p-9">
                <div className="flex items-start justify-between gap-5">
                  <div>
                    <p className="text-xs font-black uppercase tracking-[0.2em] text-[#8A2638]">
                      Business Plan
                    </p>

                    <h2 className="mt-2 text-2xl font-black text-stone-950">
                      {plan?.name ||
                        "Business Pro"}
                    </h2>
                  </div>

                  <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#F5E9C8] text-[#8A6518]">
                    <Building2
                      size={24}
                    />
                  </div>
                </div>

                <div className="mt-8 flex items-end gap-2">
                  <span className="text-sm font-bold text-stone-500">
                    KES
                  </span>

                  <span className="text-5xl font-black tracking-tight text-[#3D0F18]">
                    {plan?.amount ??
                      599}
                  </span>

                  <span className="pb-1 text-sm font-semibold text-stone-400">
                    /{" "}
                    {plan?.durationDays ??
                      30}{" "}
                    days
                  </span>
                </div>

                <p className="mt-4 text-sm leading-6 text-stone-500">
                  One secure M-Pesa
                  payment gives your
                  business full Pro
                  access for the
                  subscription period.
                </p>

                <div className="my-7 h-px bg-stone-100" />

                <div className="space-y-4">
                  {(
                    plan?.features || [
                      "Advanced business analytics",
                      "Professional business reports",
                      "Marketplace performance insights",
                      "Business Pro identity",
                      "Advanced business tools",
                    ]
                  ).map(
                    (feature) => (
                      <div
                        key={
                          feature
                        }
                        className="flex items-start gap-3"
                      >
                        <div className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-emerald-100">
                          <Check
                            size={
                              13
                            }
                            className="text-emerald-700"
                          />
                        </div>

                        <span className="text-sm font-semibold text-stone-700">
                          {
                            feature
                          }
                        </span>
                      </div>
                    )
                  )}
                </div>

                <button
                  type="button"
                  onClick={
                    openPaymentModal
                  }
                  disabled={
                    isBusinessPro ||
                    !businessEligible
                  }
                  className={`mt-8 flex w-full items-center justify-center gap-2 rounded-xl px-5 py-3.5 text-sm font-black transition ${
                    isBusinessPro
                      ? "cursor-default bg-emerald-100 text-emerald-700"
                      : !businessEligible
                        ? "cursor-not-allowed bg-stone-100 text-stone-400"
                        : "bg-[#5B1725] text-white hover:bg-[#3D0F18]"
                  }`}
                >
                  {isBusinessPro ? (
                    <>
                      <CheckCircle2
                        size={18}
                      />

                      Business Pro
                      Active
                    </>
                  ) : (
                    <>
                      <Smartphone
                        size={18}
                      />

                      Upgrade with
                      M-Pesa
                    </>
                  )}
                </button>

                {!isBusinessPro &&
                  businessEligible && (
                    <p className="mt-3 text-center text-xs text-stone-400">
                      No automatic
                      recurring charge.
                    </p>
                  )}
              </div>
            </div>
          </div>
        </section>

        {/* BUSINESS REQUIRED */}

        {!businessEligible && (
          <section className="mx-auto max-w-7xl px-4 pt-10 sm:px-6 lg:px-8">
            <div className="flex gap-4 rounded-3xl border border-amber-200 bg-amber-50 p-6">
              <Building2
                size={25}
                className="shrink-0 text-amber-700"
              />

              <div>
                <h2 className="font-black text-stone-900">
                  Business account
                  required
                </h2>

                <p className="mt-1 text-sm leading-6 text-stone-600">
                  Business Pro is
                  available only to
                  BarterConnekt members
                  who have created a
                  business profile.
                </p>
              </div>
            </div>
          </section>
        )}

        {/* ACTIVE MEMBERSHIP */}

        {isBusinessPro && (
          <BusinessProStatus
            subscription={
              activeSubscription
            }
            daysRemaining={
              daysRemaining
            }
            receipt={
              latestReceipt
            }
          />
        )}

        {/* PENDING */}

        {!isBusinessPro &&
          pendingSubscription && (
            <section className="mx-auto max-w-7xl px-4 pt-10 sm:px-6 lg:px-8">
              <div className="flex flex-col justify-between gap-5 rounded-3xl border border-amber-200 bg-amber-50 p-6 sm:flex-row sm:items-center">
                <div className="flex gap-4">
                  <Clock3
                    size={24}
                    className="shrink-0 text-amber-700"
                  />

                  <div>
                    <h2 className="font-black text-stone-900">
                      Business Pro
                      activation pending
                    </h2>

                    <p className="mt-1 text-sm text-stone-600">
                      Complete the
                      M-Pesa payment to
                      activate your
                      Business Pro
                      subscription.
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={
                    openPaymentModal
                  }
                  className="rounded-xl bg-[#5B1725] px-5 py-3 text-sm font-black text-white transition hover:bg-[#3D0F18]"
                >
                  Complete payment
                </button>
              </div>
            </section>
          )}

        {/* BENEFITS */}

        <section
          id="business-pro-benefits"
          className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8"
        >
          <div className="mx-auto max-w-2xl text-center">
            <span className="text-xs font-black uppercase tracking-[0.2em] text-[#8A2638]">
              Business Pro
              benefits
            </span>

            <h2 className="mt-3 text-3xl font-black text-stone-950 sm:text-4xl">
              Understand your
              business. Make better
              decisions.
            </h2>

            <p className="mt-4 text-sm leading-7 text-stone-500 sm:text-base">
              Business Pro turns your
              BarterConnekt activity
              into useful performance
              information and
              professional business
              tools.
            </p>
          </div>

          <div className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            <BenefitCard
              icon={BarChart3}
              title="Advanced analytics"
              description="Understand listing views, engagement, offers and marketplace performance."
            />

            <BenefitCard
              icon={FileBarChart}
              title="Business reports"
              description="Access professional reports that summarize the performance of your BarterConnekt business."
            />

            <BenefitCard
              icon={TrendingUp}
              title="Performance insights"
              description="Identify activity patterns and understand how your business is performing over time."
            />

            <BenefitCard
              icon={BadgeCheck}
              title="Business Pro identity"
              description="Show supported Business Pro indicators across your business experience."
            />

            <BenefitCard
              icon={Megaphone}
              title="Growth tools"
              description="Unlock supported Pro tools designed to help businesses improve marketplace visibility."
            />

            <BenefitCard
              icon={ShieldCheck}
              title="Professional access"
              description="Access Business Pro-only functionality as BarterConnekt's business platform grows."
            />
          </div>
        </section>

        {/* CTA */}

        {!isBusinessPro &&
          businessEligible && (
            <section className="px-4 pb-20 sm:px-6 lg:px-8">
              <div className="mx-auto max-w-5xl overflow-hidden rounded-[2rem] bg-[#3D0F18] px-6 py-10 text-center sm:px-12 sm:py-14">
                <Sparkles
                  size={32}
                  className="mx-auto text-[#E8C96F]"
                />

                <h2 className="mt-4 text-3xl font-black text-white">
                  Ready to grow
                  smarter?
                </h2>

                <p className="mx-auto mt-3 max-w-xl text-sm leading-6 text-white/65">
                  Activate Business
                  Pro securely through
                  M-Pesa and unlock
                  your advanced
                  business tools.
                </p>

                <button
                  type="button"
                  onClick={
                    openPaymentModal
                  }
                  className="mt-7 inline-flex items-center gap-2 rounded-xl bg-[#D6B15E] px-7 py-3.5 text-sm font-black text-[#3D0F18] transition hover:bg-[#E4C979]"
                >
                  <Crown
                    size={18}
                  />

                  Get Business Pro —
                  KES{" "}
                  {plan?.amount ??
                    599}
                </button>
              </div>
            </section>
          )}
      </main>

      {showPaymentModal && (
        <BusinessProPaymentModal
          plan={plan}
          phoneNumber={
            phoneNumber
          }
          setPhoneNumber={
            setPhoneNumber
          }
          paymentState={
            paymentState
          }
          paymentMessage={
            paymentMessage
          }
          paymentError={
            paymentError
          }
          currentPayment={
            currentPayment
          }
          currentSubscription={
            currentSubscription
          }
          onSubmit={
            handleSubscribe
          }
          onClose={
            closePaymentModal
          }
          onFinish={
            finishPayment
          }
          onRetry={() => {
            pollingRef.current =
              false;

            setPaymentState(
              "IDLE"
            );

            setPaymentError(
              ""
            );

            setPaymentMessage(
              ""
            );

            setCurrentPayment(
              null
            );
          }}
        />
      )}
    </>
  );
}

/*
 * ============================================================
 * PAYMENT MODAL
 * ============================================================
 */

function BusinessProPaymentModal({
  plan,
  phoneNumber,
  setPhoneNumber,
  paymentState,
  paymentMessage,
  paymentError,
  currentPayment,
  currentSubscription,
  onSubmit,
  onClose,
  onFinish,
  onRetry,
}) {
  const processing =
    paymentState ===
      "CREATING" ||
    paymentState ===
      "INITIATING" ||
    paymentState ===
      "POLLING";

  const success =
    paymentState ===
    "SUCCESS";

  const failed =
    paymentState ===
      "FAILED" ||
    paymentState ===
      "TIMEOUT";

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 px-4 py-8 backdrop-blur-sm">
      <div className="relative w-full max-w-md overflow-hidden rounded-[1.75rem] bg-white shadow-2xl">
        {!processing &&
          !success && (
            <button
              type="button"
              onClick={onClose}
              className="absolute right-4 top-4 z-10 flex h-9 w-9 items-center justify-center rounded-full bg-stone-100 text-stone-500 transition hover:bg-stone-200"
            >
              <X size={18} />
            </button>
          )}

        {/* IDLE */}

        {paymentState ===
          "IDLE" && (
          <form
            onSubmit={
              onSubmit
            }
          >
            <div className="bg-[#3D0F18] px-6 py-7 text-white">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#D6B15E] text-[#3D0F18]">
                <BriefcaseBusiness
                  size={24}
                />
              </div>

              <h2 className="mt-4 text-2xl font-black">
                Activate Business
                Pro
              </h2>

              <p className="mt-2 text-sm leading-6 text-white/65">
                Pay securely using
                M-Pesa STK Push.
              </p>
            </div>

            <div className="p-6">
              <div className="flex items-center justify-between rounded-2xl bg-stone-50 p-4">
                <div>
                  <p className="text-xs font-bold uppercase tracking-wider text-stone-400">
                    Business Pro
                  </p>

                  <p className="mt-1 text-sm font-bold text-stone-800">
                    {plan
                      ?.durationDays ??
                      30}{" "}
                    days access
                  </p>
                </div>

                <div className="text-right">
                  <p className="text-xs text-stone-400">
                    Total
                  </p>

                  <p className="text-xl font-black text-[#5B1725]">
                    KES{" "}
                    {plan
                      ?.amount ??
                      599}
                  </p>
                </div>
              </div>

              <label className="mt-6 block">
                <span className="text-sm font-bold text-stone-800">
                  Safaricom number
                </span>

                <div className="mt-2 flex items-center rounded-xl border border-stone-200 bg-white px-3 focus-within:border-[#7b1538] focus-within:ring-2 focus-within:ring-[#7b1538]/10">
                  <Smartphone
                    size={18}
                    className="shrink-0 text-stone-400"
                  />

                  <input
                    type="tel"
                    value={
                      phoneNumber
                    }
                    onChange={(
                      event
                    ) =>
                      setPhoneNumber(
                        event
                          .target
                          .value
                      )
                    }
                    placeholder="0712 345 678"
                    autoFocus
                    className="w-full bg-transparent px-3 py-3.5 text-sm font-semibold text-stone-900 outline-none placeholder:text-stone-300"
                  />
                </div>
              </label>

              {paymentError && (
                <div className="mt-4 flex items-start gap-2 rounded-xl bg-red-50 p-3 text-sm text-red-700">
                  <AlertCircle
                    size={17}
                    className="mt-0.5 shrink-0"
                  />

                  <span>
                    {
                      paymentError
                    }
                  </span>
                </div>
              )}

              <button
                type="submit"
                className="mt-6 flex w-full items-center justify-center gap-2 rounded-xl bg-[#5B1725] px-5 py-3.5 text-sm font-black text-white transition hover:bg-[#3D0F18]"
              >
                <Smartphone
                  size={18}
                />

                Pay KES{" "}
                {plan?.amount ??
                  599}
              </button>

              <p className="mt-4 text-center text-xs leading-5 text-stone-400">
                An M-Pesa prompt will
                be sent to the number
                above. Business Pro
                activates only after
                successful payment
                confirmation.
              </p>
            </div>
          </form>
        )}

        {/* PROCESSING */}

        {processing && (
          <div className="p-8 text-center">
            <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-[#5B1725]/10">
              {paymentState ===
              "POLLING" ? (
                <Smartphone
                  size={34}
                  className="text-[#5B1725]"
                />
              ) : (
                <Loader2
                  size={34}
                  className="animate-spin text-[#5B1725]"
                />
              )}
            </div>

            <h2 className="mt-6 text-2xl font-black text-stone-950">
              {paymentState ===
              "POLLING"
                ? "Check your phone"
                : "Preparing payment"}
            </h2>

            <p className="mx-auto mt-3 max-w-sm text-sm leading-6 text-stone-500">
              {paymentMessage ||
                "Please wait..."}
            </p>

            {paymentState ===
              "POLLING" && (
              <div className="mt-6 rounded-2xl bg-emerald-50 p-4">
                <Loader2
                  size={20}
                  className="mx-auto animate-spin text-emerald-700"
                />

                <p className="mt-2 text-xs font-bold text-emerald-700">
                  Waiting for M-Pesa
                  confirmation
                </p>
              </div>
            )}

            {currentPayment?.id && (
              <p className="mt-5 text-[11px] text-stone-300">
                Payment reference:{" "}
                {currentPayment.id}
              </p>
            )}
          </div>
        )}

        {/* SUCCESS */}

        {success && (
          <div className="p-8 text-center">
            <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-emerald-100">
              <CheckCircle2
                size={40}
                className="text-emerald-600"
              />
            </div>

            <h2 className="mt-6 text-2xl font-black text-stone-950">
              Business Pro Active
            </h2>

            <p className="mt-3 text-sm leading-6 text-stone-500">
              {paymentMessage ||
                "Your Business Pro subscription is now active."}
            </p>

            {currentPayment
              ?.receiptNumber && (
              <div className="mt-6 rounded-2xl bg-stone-50 p-4">
                <p className="text-xs font-semibold uppercase tracking-wider text-stone-400">
                  M-Pesa receipt
                </p>

                <p className="mt-1 font-black text-stone-900">
                  {
                    currentPayment.receiptNumber
                  }
                </p>
              </div>
            )}

            {currentSubscription
              ?.endsAt && (
              <p className="mt-4 text-xs text-stone-400">
                Business Pro until{" "}
                {formatDate(
                  currentSubscription.endsAt
                )}
              </p>
            )}

            <button
              type="button"
              onClick={onFinish}
              className="mt-7 w-full rounded-xl bg-[#5B1725] px-5 py-3.5 text-sm font-black text-white transition hover:bg-[#3D0F18]"
            >
              Continue
            </button>
          </div>
        )}

        {/* FAILURE */}

        {failed && (
          <div className="p-8 text-center">
            <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-red-100">
              {paymentState ===
              "TIMEOUT" ? (
                <Clock3
                  size={38}
                  className="text-amber-600"
                />
              ) : (
                <AlertCircle
                  size={38}
                  className="text-red-600"
                />
              )}
            </div>

            <h2 className="mt-6 text-2xl font-black text-stone-950">
              {paymentState ===
              "TIMEOUT"
                ? "Confirmation pending"
                : "Payment not completed"}
            </h2>

            <p className="mt-3 text-sm leading-6 text-stone-500">
              {paymentError}
            </p>

            <div className="mt-7 flex gap-3">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 rounded-xl border border-stone-200 px-4 py-3 text-sm font-bold text-stone-700 transition hover:bg-stone-50"
              >
                Close
              </button>

              {paymentState !==
                "TIMEOUT" && (
                <button
                  type="button"
                  onClick={
                    onRetry
                  }
                  className="flex-1 rounded-xl bg-[#5B1725] px-4 py-3 text-sm font-black text-white transition hover:bg-[#3D0F18]"
                >
                  Try Again
                </button>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

/*
 * ============================================================
 * ACTIVE BUSINESS PRO STATUS
 * ============================================================
 */

function BusinessProStatus({
  subscription,
  daysRemaining,
  receipt,
}) {
  return (
    <section className="mx-auto max-w-7xl px-4 pt-10 sm:px-6 lg:px-8">
      <div className="rounded-3xl border border-emerald-100 bg-emerald-50 p-6">
        <div className="flex flex-col justify-between gap-6 lg:flex-row lg:items-center">
          <div className="flex items-start gap-4">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-emerald-600 text-white">
              <Crown size={23} />
            </div>

            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="font-black text-stone-950">
                  Business Pro
                </h2>

                <span className="rounded-full bg-emerald-600 px-2.5 py-1 text-[10px] font-black uppercase tracking-wider text-white">
                  Active
                </span>
              </div>

              <p className="mt-1 text-sm text-stone-600">
                Your advanced
                business tools are
                currently unlocked.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-x-8 gap-y-4 sm:grid-cols-3">
            <StatusItem
              label="Expires"
              value={formatDate(
                subscription?.endsAt
              )}
            />

            <StatusItem
              label="Remaining"
              value={`${daysRemaining} ${
                daysRemaining === 1
                  ? "day"
                  : "days"
              }`}
              accent
            />

            <StatusItem
              label="Receipt"
              value={
                receipt || "—"
              }
            />
          </div>
        </div>
      </div>
    </section>
  );
}

/*
 * ============================================================
 * STATUS ITEM
 * ============================================================
 */

function StatusItem({
  label,
  value,
  accent = false,
}) {
  return (
    <div>
      <p className="text-[10px] font-bold uppercase tracking-wider text-stone-400">
        {label}
      </p>

      <p
        className={`mt-1 text-sm font-black ${
          accent
            ? "text-emerald-700"
            : "text-stone-800"
        }`}
      >
        {value}
      </p>
    </div>
  );
}

/*
 * ============================================================
 * BENEFIT CARD
 * ============================================================
 */

function BenefitCard({
  icon: Icon,
  title,
  description,
}) {
  return (
    <article className="group relative overflow-hidden rounded-2xl border border-[#E7DDDF] bg-white p-6 transition duration-300 hover:-translate-y-1 hover:border-[#D6B15E]/60 hover:shadow-xl hover:shadow-[#5B1725]/5">
      <div className="flex items-start justify-between">
        <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#F5E8EB] text-[#5B1725] transition group-hover:bg-[#5B1725] group-hover:text-white">
          <Icon size={21} />
        </div>

        <Sparkles
          size={16}
          className="text-[#D6B15E] opacity-60"
        />
      </div>

      <h3 className="mt-5 text-lg font-black text-[#21191B]">
        {title}
      </h3>

      <p className="mt-2 text-sm leading-6 text-gray-500">
        {description}
      </p>

      <div className="absolute bottom-0 left-0 h-1 w-0 bg-[#D6B15E] transition-all duration-300 group-hover:w-full" />
    </article>
  );
}

/*
 * ============================================================
 * SKELETON
 * ============================================================
 */

function BusinessProSkeleton() {
  return (
    <div className="min-h-screen animate-pulse bg-[#F8F5F3]">
      <div className="bg-[#3D0F18]">
        <div className="mx-auto grid max-w-7xl gap-10 px-4 py-20 sm:px-6 lg:grid-cols-2 lg:px-8">
          <div>
            <div className="h-8 w-44 rounded-full bg-white/10" />

            <div className="mt-7 h-12 max-w-lg rounded-xl bg-white/10" />

            <div className="mt-4 h-12 max-w-md rounded-xl bg-white/10" />

            <div className="mt-7 h-5 max-w-xl rounded bg-white/10" />

            <div className="mt-3 h-5 max-w-md rounded bg-white/10" />
          </div>

          <div className="h-[430px] rounded-[2rem] bg-white/10" />
        </div>
      </div>
    </div>
  );
}

/*
 * ============================================================
 * HELPERS
 * ============================================================
 */

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