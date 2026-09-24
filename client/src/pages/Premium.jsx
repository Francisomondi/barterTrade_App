import {
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";

import {
  Check,
  Crown,
  Sparkles,
  BarChart3,
  BadgeCheck,
  Megaphone,
  Headphones,
  ShieldCheck,
  Smartphone,
  X,
  Loader2,
  CheckCircle2,
  AlertCircle,
  Clock3,
  ArrowRight,
  Zap,
} from "lucide-react";

import {
  createSubscription,
  getMySubscription,
  getSubscriptionPlans,
  getSubscriptionPaymentStatus,
  payForSubscription,
} from "../api/subscriptionApi";

import {useAuth} from "../context/AuthContext";

/**
 * ============================================================
 * CONFIG
 * ============================================================
 */

const PAYMENT_POLL_INTERVAL = 3000;

const PAYMENT_MAX_ATTEMPTS = 40;

/**
 * ============================================================
 * PREMIUM PAGE
 * ============================================================
 */

export default function Premium() {
    const {refreshUser} = useAuth();

  const [plan, setPlan] = useState(null);
  const [ subscriptionData, setSubscriptionData,] = useState(null);
  const [loading, setLoading] = useState(true);
  const [ pageError,setPageError,] = useState("");
  const [ showPaymentModal, setShowPaymentModal,] = useState(false);
  const [phoneNumber, setPhoneNumber] = useState("");
  const [ paymentState, setPaymentState,] = useState("IDLE");
  const [ paymentMessage, setPaymentMessage,] = useState("");
  const [ paymentError, setPaymentError,] = useState("");
  const [ currentPayment, setCurrentPayment,] = useState(null);
  const [ currentSubscription, setCurrentSubscription,] = useState(null);
  const pollingRef = useRef(false);
  const mountedRef = useRef(true);

  /**
   * ==========================================================
   * LOAD PREMIUM DATA
   * ==========================================================
   */

  const loadPremiumData =
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

        const premiumPlan =
          plansResponse?.plans?.find(
            (item) =>
              item.type === "PREMIUM"
          ) ||
          plansResponse?.plans?.[0] ||
          null;

        if (!mountedRef.current) {
          return;
        }

        setPlan(premiumPlan);

        setSubscriptionData(
          subscriptionResponse
        );

        setCurrentSubscription(
          subscriptionResponse
            ?.activeSubscription ||
            subscriptionResponse
              ?.pendingSubscription ||
            null
        );
      } catch (error) {
        console.error(
          "LOAD PREMIUM ERROR:",
          error
        );

        if (!mountedRef.current) {
          return;
        }

        setPageError(
          error.response?.data?.message ||
            "Unable to load Premium information."
        );
      } finally {
        if (mountedRef.current) {
          setLoading(false);
        }
      }
    }, []);

  useEffect(() => {
    mountedRef.current = true;

    loadPremiumData();

    return () => {
      mountedRef.current = false;
      pollingRef.current = false;
    };
  }, [loadPremiumData]);

  /**
   * ==========================================================
   * DERIVED STATE
   * ==========================================================
   */

  const activeSubscription =
    subscriptionData
      ?.activeSubscription ||
    null;

  const isPremium =
    Boolean(
      subscriptionData?.isPremium &&
        activeSubscription
    );

  /**
   * ==========================================================
   * OPEN PAYMENT
   * ==========================================================
   */

  const openPaymentModal = () => {
    if (isPremium) {
      return;
    }

    setPaymentError("");
    setPaymentMessage("");
    setPaymentState("IDLE");

    setShowPaymentModal(true);
  };

  /**
   * ==========================================================
   * CLOSE PAYMENT
   * ==========================================================
   */

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

    setShowPaymentModal(false);
  };

  /**
   * ==========================================================
   * POLL PAYMENT
   * ==========================================================
   */

  const pollPayment =
    async (paymentId) => {
      if (!paymentId) {
        return;
      }

      pollingRef.current = true;

      setPaymentState("POLLING");

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

          /**
           * PAYMENT SUCCESS
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
              "Payment confirmed. Premium is now active."
            );
            await Promise.all([
            loadPremiumData(),
            refreshUser(),
            ]);

            return;
          }

          /**
           * PAYMENT FAILURE
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
            "PAYMENT POLLING ERROR:",
            error
          );

          /**
           * Don't immediately kill polling because
           * one temporary network failure should not
           * make the payment appear failed.
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

      setPaymentState("TIMEOUT");

      setPaymentError(
        "Payment confirmation is taking longer than expected. If you completed the M-Pesa payment, your Premium status will update once confirmation arrives."
      );
    };

  /**
   * ==========================================================
   * START PAYMENT
   * ==========================================================
   */

  const handleSubscribe =
    async (event) => {
      event.preventDefault();

      if (!plan) {
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
          "Preparing your Premium subscription..."
        );

        setPaymentState(
          "CREATING"
        );

        /**
         * ================================================
         * CREATE OR REUSE PENDING SUBSCRIPTION
         * ================================================
         */

        const subscriptionResponse =
          await createSubscription(
            plan.type
          );

        const subscription =
          subscriptionResponse
            ?.subscription;

        if (
          !subscription?.id
        ) {
          throw new Error(
            "Subscription could not be created."
          );
        }

        setCurrentSubscription(
          subscription
        );

        /**
         * ================================================
         * INITIATE STK
         * ================================================
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

        /**
         * ================================================
         * POLL CALLBACK RESULT
         * ================================================
         */

        await pollPayment(
          payment.id
        );
      } catch (error) {
        console.error(
          "PREMIUM PAYMENT ERROR:",
          error
        );

        pollingRef.current =
          false;

        const response =
          error.response?.data;

        /**
         * Already Premium
         */

        if (
          response?.code ===
          "ACTIVE_SUBSCRIPTION_EXISTS"
        ) {
          setPaymentState(
            "SUCCESS"
          );

          setPaymentMessage(
            "Your Premium membership is already active."
          );

          await Promise.all([
            loadPremiumData(),
            refreshUser(),
            ]);

            return;
        }

        /**
         * Existing STK still waiting.
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

        setPaymentState(
          "FAILED"
        );

        setPaymentError(
          response?.message ||
            error.message ||
            "Unable to start Premium payment."
        );
      }
    };

  /**
   * ==========================================================
   * SUCCESS MODAL CLOSE
   * ==========================================================
   */

  const finishPayment = async () => {
    pollingRef.current =
      false;

    setShowPaymentModal(
      false
    );

    setPaymentState("IDLE");
    setPaymentError("");
    setPaymentMessage("");

    await Promise.all([
    loadPremiumData(),
    refreshUser(),
    ]);
  };

  /**
   * ==========================================================
   * LOADING
   * ==========================================================
   */

  if (loading) {
    return <PremiumSkeleton />;
  }

  /**
   * ==========================================================
   * PAGE ERROR
   * ==========================================================
   */

  if (pageError) {
    return (
      <div className="min-h-[70vh] bg-stone-50 px-4 py-16">
        <div className="mx-auto max-w-xl rounded-3xl border border-red-100 bg-white p-8 text-center shadow-sm">
          <AlertCircle
            size={42}
            className="mx-auto text-red-600"
          />

          <h1 className="mt-4 text-xl font-black text-stone-900">
            Unable to load Premium
          </h1>

          <p className="mt-2 text-sm text-stone-500">
            {pageError}
          </p>

          <button
            onClick={
              loadPremiumData
            }
            className="mt-6 rounded-xl bg-[#5a0b22] px-5 py-3 text-sm font-bold text-white transition hover:bg-[#450719]"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  return (
    <>
      <main className="min-h-screen bg-[#faf8f5]">
        {/* ===================================================
            HERO
        =================================================== */}

        <section className="relative overflow-hidden bg-[#3f0719]">
          <div className="absolute -left-28 top-16 h-80 w-80 rounded-full bg-[#8d2448]/20 blur-3xl" />

          <div className="absolute -right-28 -top-24 h-96 w-96 rounded-full bg-amber-400/10 blur-3xl" />

          <div className="relative mx-auto grid max-w-7xl gap-10 px-4 py-16 sm:px-6 lg:grid-cols-[1.1fr_0.9fr] lg:px-8 lg:py-24">
            <div className="flex flex-col justify-center">
              <div className="mb-5 flex">
                <span className="inline-flex items-center gap-2 rounded-full border border-amber-300/30 bg-amber-300/10 px-4 py-2 text-xs font-bold uppercase tracking-[0.18em] text-amber-200">
                  <Crown size={15} />

                  BarterTrade Premium
                </span>
              </div>

              <h1 className="max-w-3xl text-4xl font-black leading-tight text-white sm:text-5xl lg:text-6xl">
                Get more from every{" "}
                <span className="text-amber-300">
                  barter.
                </span>
              </h1>

              <p className="mt-6 max-w-2xl text-base leading-7 text-white/70 sm:text-lg">
                Unlock Premium tools,
                deeper marketplace
                insights and benefits
                designed for active
                BarterTrade members.
              </p>

              <div className="mt-8 flex flex-wrap gap-3">
                {isPremium ? (
                  <div className="inline-flex items-center gap-2 rounded-xl bg-emerald-500 px-5 py-3 text-sm font-extrabold text-white">
                    <CheckCircle2
                      size={18}
                    />

                    Premium Active
                  </div>
                ) : (
                  <button
                    onClick={
                      openPaymentModal
                    }
                    className="inline-flex items-center gap-2 rounded-xl bg-amber-300 px-6 py-3.5 text-sm font-black text-[#3f0719] shadow-lg shadow-black/10 transition hover:-translate-y-0.5 hover:bg-amber-200"
                  >
                    <Crown
                      size={18}
                    />

                    Get Premium

                    <ArrowRight
                      size={17}
                    />
                  </button>
                )}

                <button
                  onClick={() => {
                    document
                      .getElementById(
                        "premium-benefits"
                      )
                      ?.scrollIntoView({
                        behavior:
                          "smooth",
                      });
                  }}
                  className="rounded-xl border border-white/20 bg-white/5 px-6 py-3.5 text-sm font-bold text-white transition hover:bg-white/10"
                >
                  Explore benefits
                </button>
              </div>
            </div>

            {/* PRICE CARD */}

            <div className="flex items-center justify-center lg:justify-end">
              <div className="w-full max-w-md rounded-[2rem] border border-white/10 bg-white p-7 shadow-2xl shadow-black/20 sm:p-9">
                <div className="flex items-start justify-between gap-5">
                  <div>
                    <p className="text-xs font-black uppercase tracking-[0.2em] text-[#7b1538]">
                      Premium
                    </p>

                    <h2 className="mt-2 text-2xl font-black text-stone-950">
                      {plan?.name ||
                        "BarterTrade Premium"}
                    </h2>
                  </div>

                  <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-amber-100 text-amber-700">
                    <Crown
                      size={24}
                    />
                  </div>
                </div>

                <div className="mt-8 flex items-end gap-2">
                  <span className="text-sm font-bold text-stone-500">
                    KES
                  </span>

                  <span className="text-5xl font-black tracking-tight text-[#4b0a20]">
                    {plan?.amount ??
                      299}
                  </span>

                  <span className="pb-1 text-sm font-semibold text-stone-400">
                    /{" "}
                    {plan?.durationDays ??
                      30}{" "}
                    days
                  </span>
                </div>

                <p className="mt-4 text-sm leading-6 text-stone-500">
                  Pay securely with
                  M-Pesa. Premium stays
                  active for the full
                  subscription period.
                </p>

                <div className="my-7 h-px bg-stone-100" />

                <div className="space-y-4">
                  {(
                    plan?.features || [
                      "Premium profile badge",
                      "Advanced listing analytics",
                      "Higher active listing allowance",
                      "Discounts on listing promotions",
                      "Priority support",
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
                  onClick={
                    openPaymentModal
                  }
                  disabled={
                    isPremium
                  }
                  className={`mt-8 flex w-full items-center justify-center gap-2 rounded-xl px-5 py-3.5 text-sm font-black transition ${
                    isPremium
                      ? "cursor-default bg-emerald-100 text-emerald-700"
                      : "bg-[#5a0b22] text-white hover:bg-[#450719]"
                  }`}
                >
                  {isPremium ? (
                    <>
                      <CheckCircle2
                        size={18}
                      />

                      Premium Active
                    </>
                  ) : (
                    <>
                      <Smartphone
                        size={18}
                      />

                      Subscribe with
                      M-Pesa
                    </>
                  )}
                </button>

                {!isPremium && (
                  <p className="mt-3 text-center text-xs text-stone-400">
                    No automatic
                    recurring charge.
                  </p>
                )}
              </div>
            </div>
          </div>
        </section>

        {/* ===================================================
            ACTIVE MEMBERSHIP
        =================================================== */}

        {isPremium && (
          <ActiveSubscriptionCard
            subscription={
              activeSubscription
            }
          />
        )}

        {/* ===================================================
            BENEFITS
        =================================================== */}

        <section
          id="premium-benefits"
          className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8 lg:py-20"
        >
          <div className="mx-auto max-w-2xl text-center">
            <span className="text-xs font-black uppercase tracking-[0.2em] text-[#7b1538]">
              Premium benefits
            </span>

            <h2 className="mt-3 text-3xl font-black text-stone-950 sm:text-4xl">
              More tools. More
              visibility. More insight.
            </h2>

            <p className="mt-4 text-sm leading-7 text-stone-500 sm:text-base">
              Premium is designed for
              members who want to get
              more from their listings
              and marketplace activity.
            </p>
          </div>

          <div className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            <BenefitCard
              icon={BadgeCheck}
              title="Premium badge"
              description="Stand out with a Premium identity across supported areas of your BarterTrade profile."
            />

            <BenefitCard
              icon={BarChart3}
              title="Advanced analytics"
              description="Get deeper insight into listing activity and understand how people interact with your items."
            />

            <BenefitCard
              icon={Zap}
              title="More listings"
              description="Premium members can receive a higher active listing allowance as their inventory grows."
            />

            <BenefitCard
              icon={Megaphone}
              title="Promotion benefits"
              description="Access Premium promotion benefits and discounts when boosting eligible listings."
            />

            <BenefitCard
              icon={Headphones}
              title="Priority support"
              description="Premium members receive priority handling through supported customer assistance channels."
            />

            <BenefitCard
              icon={ShieldCheck}
              title="Premium access"
              description="Unlock features reserved for active Premium members as BarterTrade continues to grow."
            />
          </div>
        </section>

        {/* ===================================================
            CTA
        =================================================== */}

        {!isPremium && (
          <section className="px-4 pb-20 sm:px-6 lg:px-8">
            <div className="mx-auto max-w-5xl overflow-hidden rounded-[2rem] bg-[#4b0a20] px-6 py-10 text-center sm:px-12 sm:py-14">
              <Sparkles
                size={32}
                className="mx-auto text-amber-300"
              />

              <h2 className="mt-4 text-3xl font-black text-white">
                Ready to go Premium?
              </h2>

              <p className="mx-auto mt-3 max-w-xl text-sm leading-6 text-white/65">
                Activate your Premium
                membership securely
                through M-Pesa.
              </p>

              <button
                onClick={
                  openPaymentModal
                }
                className="mt-7 inline-flex items-center gap-2 rounded-xl bg-amber-300 px-7 py-3.5 text-sm font-black text-[#3f0719] transition hover:bg-amber-200"
              >
                <Crown
                  size={18}
                />

                Get Premium — KES{" "}
                {plan?.amount ??
                  299}
              </button>
            </div>
          </section>
        )}
      </main>

      {/* =====================================================
          PAYMENT MODAL
      ===================================================== */}

      {showPaymentModal && (
        <PaymentModal
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

/**
 * ============================================================
 * PAYMENT MODAL
 * ============================================================
 */

function PaymentModal({
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
              onClick={
                onClose
              }
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
            <div className="bg-[#4b0a20] px-6 py-7 text-white">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-amber-300 text-[#4b0a20]">
                <Crown
                  size={24}
                />
              </div>

              <h2 className="mt-4 text-2xl font-black">
                Activate Premium
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
                    Premium
                  </p>

                  <p className="mt-1 text-sm font-bold text-stone-800">
                    {plan?.durationDays ??
                      30}{" "}
                    days access
                  </p>
                </div>

                <div className="text-right">
                  <p className="text-xs text-stone-400">
                    Total
                  </p>

                  <p className="text-xl font-black text-[#5a0b22]">
                    KES{" "}
                    {plan?.amount ??
                      299}
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
                className="mt-6 flex w-full items-center justify-center gap-2 rounded-xl bg-[#5a0b22] px-5 py-3.5 text-sm font-black text-white transition hover:bg-[#450719]"
              >
                <Smartphone
                  size={18}
                />

                Pay KES{" "}
                {plan?.amount ??
                  299}
              </button>

              <p className="mt-4 text-center text-xs leading-5 text-stone-400">
                An M-Pesa prompt
                will be sent to the
                number above. Premium
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
            <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-[#5a0b22]/10">
              {paymentState ===
              "POLLING" ? (
                <Smartphone
                  size={34}
                  className="text-[#5a0b22]"
                />
              ) : (
                <Loader2
                  size={34}
                  className="animate-spin text-[#5a0b22]"
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
                  Waiting for
                  M-Pesa confirmation
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
              Welcome to Premium
            </h2>

            <p className="mt-3 text-sm leading-6 text-stone-500">
              {paymentMessage ||
                "Your Premium membership is now active."}
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
                Premium until{" "}
                {formatDate(
                  currentSubscription.endsAt
                )}
              </p>
            )}

            <button
              onClick={
                onFinish
              }
              className="mt-7 w-full rounded-xl bg-[#5a0b22] px-5 py-3.5 text-sm font-black text-white transition hover:bg-[#450719]"
            >
              Continue
            </button>
          </div>
        )}

        {/* FAILED */}

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
                onClick={
                  onClose
                }
                className="flex-1 rounded-xl border border-stone-200 px-4 py-3 text-sm font-bold text-stone-700 transition hover:bg-stone-50"
              >
                Close
              </button>

              {paymentState !==
                "TIMEOUT" && (
                <button
                  onClick={
                    onRetry
                  }
                  className="flex-1 rounded-xl bg-[#5a0b22] px-4 py-3 text-sm font-black text-white transition hover:bg-[#450719]"
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

/**
 * ============================================================
 * ACTIVE SUBSCRIPTION CARD
 * ============================================================
 */

function ActiveSubscriptionCard({
  subscription,
}) {
  const daysRemaining =
    getDaysRemaining(
      subscription?.endsAt
    );

  return (
    <section className="mx-auto max-w-7xl px-4 pt-10 sm:px-6 lg:px-8">
      <div className="flex flex-col justify-between gap-6 rounded-3xl border border-emerald-100 bg-emerald-50 p-6 sm:flex-row sm:items-center">
        <div className="flex items-start gap-4">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-emerald-600 text-white">
            <Crown size={23} />
          </div>

          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="font-black text-stone-950">
                Premium membership
              </h2>

              <span className="rounded-full bg-emerald-600 px-2.5 py-1 text-[10px] font-black uppercase tracking-wider text-white">
                Active
              </span>
            </div>

            <p className="mt-1 text-sm text-stone-600">
              Your Premium benefits
              are currently active.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-5 sm:text-right">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-wider text-stone-400">
              Expires
            </p>

            <p className="mt-1 text-sm font-black text-stone-800">
              {formatDate(
                subscription?.endsAt
              )}
            </p>
          </div>

          <div>
            <p className="text-[10px] font-bold uppercase tracking-wider text-stone-400">
              Remaining
            </p>

            <p className="mt-1 text-sm font-black text-emerald-700">
              {daysRemaining}{" "}
              {daysRemaining === 1
                ? "day"
                : "days"}
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}

/**
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
    <article className="rounded-2xl border border-stone-200/80 bg-white p-6 shadow-sm transition hover:-translate-y-1 hover:shadow-md">
      <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#5a0b22]/10 text-[#6d1030]">
        <Icon size={21} />
      </div>

      <h3 className="mt-5 text-lg font-black text-stone-900">
        {title}
      </h3>

      <p className="mt-2 text-sm leading-6 text-stone-500">
        {description}
      </p>
    </article>
  );
}

/**
 * ============================================================
 * LOADING SKELETON
 * ============================================================
 */

function PremiumSkeleton() {
  return (
    <div className="min-h-screen animate-pulse bg-[#faf8f5]">
      <div className="bg-[#3f0719]">
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

/**
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