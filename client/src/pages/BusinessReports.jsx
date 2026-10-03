import {
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";

import {
  ArrowLeft,
  ArrowRight,
  FileText,
  BarChart3,
  CalendarDays,
  CheckCircle2,
  Download,
  Crown,
  FileBarChart,
  FileJson,
  FileSpreadsheet,
  History,
  Lightbulb,
  ListChecks,
  LockKeyhole,
  Megaphone,
  RefreshCw,
  Repeat2,
  Search,
  AlertCircle,
  Loader2,
  Smartphone,
  X,
  ShieldCheck,
  ShoppingBag,
  Store,
  Target,
  TrendingUp,
  Users,
} from "lucide-react";
import { Link } from "react-router-dom";
import { BUSINESS_REPORT_FORMATS, BUSINESS_REPORT_TYPES, generateMyBusinessReport, getMyBusinessReportAccess} from "../api/businessReports";
import { createSubscription, getSubscriptionPlans, getSubscriptionPaymentStatus, payForSubscription} from "../api/subscriptionApi";

/**
 * =========================================================
 * BUSINESS REPORT CATALOG
 * =========================================================
 */


/**
 * =========================================================
 * BUSINESS PRO PAYMENT CONFIG
 * =========================================================
 */

const BUSINESS_PRO_PLAN_TYPE =
  "BUSINESS_PRO";

const PAYMENT_POLL_INTERVAL =
  3000;

const PAYMENT_MAX_ATTEMPTS =
  40;

const wait = (milliseconds) =>
  new Promise((resolve) => {
    setTimeout(resolve, milliseconds);
  });

const BUSINESS_REPORT_CATALOG = [
  {
    type: BUSINESS_REPORT_TYPES.BUSINESS_PERFORMANCE,
    title: "Business Performance",
    description:
      "See how your business is performing across key marketplace activity and engagement metrics.",
    icon: BarChart3,
    category: "Performance",
    accent: "maroon",
    highlights: [
      "Overall business activity",
      "Performance overview",
      "Key marketplace metrics",
    ],
  },
  {
    type: BUSINESS_REPORT_TYPES.LISTING_PERFORMANCE,
    title: "Listing Performance",
    description:
      "Understand which listings attract attention and contribute most to your marketplace activity.",
    icon: ShoppingBag,
    category: "Listings",
    accent: "blue",
    highlights: [
      "Listing-level performance",
      "Top-performing items",
      "Listing engagement",
    ],
  },
  {
    type: BUSINESS_REPORT_TYPES.CONVERSION_INTELLIGENCE,
    title: "Conversion Intelligence",
    description:
      "Understand how marketplace engagement progresses toward meaningful business actions.",
    icon: Repeat2,
    category: "Conversion",
    accent: "emerald",
    highlights: [
      "Conversion indicators",
      "Engagement progression",
      "Business action insights",
    ],
  },
  {
    type: BUSINESS_REPORT_TYPES.DEMAND_INTELLIGENCE,
    title: "Demand Intelligence",
    description:
      "Explore signals that help you understand customer interest and marketplace demand.",
    icon: Users,
    category: "Demand",
    accent: "violet",
    highlights: [
      "Customer interest signals",
      "Demand patterns",
      "Marketplace activity",
    ],
  },
  {
    type: BUSINESS_REPORT_TYPES.CATEGORY_BENCHMARK,
    title: "Category Benchmark",
    description:
      "Compare your business with privacy-safe category-level benchmarks and broader performance patterns.",
    icon: Target,
    category: "Benchmark",
    accent: "amber",
    highlights: [
      "Category comparisons",
      "Privacy-safe benchmarks",
      "Relative performance",
    ],
  },
  {
    type: BUSINESS_REPORT_TYPES.GROWTH_RECOMMENDATIONS,
    title: "Growth Recommendations",
    description:
      "Review structured opportunities and recommendations based on your business analytics.",
    icon: Lightbulb,
    category: "Growth",
    accent: "orange",
    highlights: [
      "Growth opportunities",
      "Actionable recommendations",
      "Business improvement ideas",
    ],
  },
  {
    type: BUSINESS_REPORT_TYPES.PROMOTION_INTELLIGENCE,
    title: "Promotion Intelligence",
    description:
      "Review promotion-related performance signals without treating observed changes as guaranteed causal effects.",
    icon: Megaphone,
    category: "Promotions",
    accent: "rose",
    highlights: [
      "Promotion activity",
      "Observed performance signals",
      "Non-causal interpretation",
    ],
  },
  {
    type: BUSINESS_REPORT_TYPES.BUSINESS_INTELLIGENCE,
    title: "Business Intelligence",
    description:
      "Bring multiple business analytics areas together into a broader intelligence report.",
    icon: TrendingUp,
    category: "Intelligence",
    accent: "indigo",
    featured: true,
    highlights: [
      "Combined business insights",
      "Broader performance picture",
      "Executive-level overview",
    ],
  },
];

const REPORT_ACCENTS = {
  maroon: {
    icon: "bg-[#F5E8EB] text-[#5B1725]",
    badge: "bg-[#F5E8EB] text-[#6B1D2C]",
  },
  blue: {
    icon: "bg-blue-50 text-blue-700",
    badge: "bg-blue-50 text-blue-700",
  },
  emerald: {
    icon: "bg-emerald-50 text-emerald-700",
    badge: "bg-emerald-50 text-emerald-700",
  },
  violet: {
    icon: "bg-violet-50 text-violet-700",
    badge: "bg-violet-50 text-violet-700",
  },
  amber: {
    icon: "bg-amber-50 text-amber-700",
    badge: "bg-amber-50 text-amber-700",
  },
  orange: {
    icon: "bg-orange-50 text-orange-700",
    badge: "bg-orange-50 text-orange-700",
  },
  rose: {
    icon: "bg-rose-50 text-rose-700",
    badge: "bg-rose-50 text-rose-700",
  },
  indigo: {
    icon: "bg-indigo-50 text-indigo-700",
    badge: "bg-indigo-50 text-indigo-700",
  },
};

/**
 * =========================================================
 * BUSINESS REPORTS
 * =========================================================
 *
 * 9.11.20.1 — Reports Dashboard Foundation
 * 9.11.20.2 — Business Pro Access / Locked State
 * 9.11.20.3 — Report Catalog
 * 9.11.20.4 — Report Type Selection
 * 9.11.20.5 — Date Range Controls
 * 9.11.20.6 — Report Generation Flow
 * 9.11.20.7 — Executive Summary UI
 * 9.11.20.9 — Report Tables
 * 9.11.20.10 — Trends / Chart Visualization
 * 9.11.20.11 — Data Coverage & Methodology
 * 9.11.20.12 — JSON Export Experience
 * 9.11.20.14 — PDF_READY Preview
 * 9.11.20.15 — Export Download UX
 * 9.11.20.16 — Loading / Error / Empty States
 * 9.11.20.17 — Responsive Mobile Experience
 * 9.11.20.18 — Frontend Security / Entitlement Handling
 * * 9.11.20.19 — Testing
 * 
 * 
 *
 * SECURITY MODEL
 *
 * Business Pro access is NEVER derived from:
 *
 * - Personal Premium
 * - AuthContext premium state
 * - BusinessProfile fields
 * - localStorage
 * - query parameters
 * - frontend flags
 *
 * Source of truth:
 *
 * GET /business/me/reports
 *
 * Canonical entitlement:
 *
 * reports.isBusinessPro
 *
 * Report generation:
 *
 * GET /business/me/reports/:reportType
 *
 * Backend remains authoritative for authentication,
 * ownership, Business Pro entitlement, report type,
 * date range validation and analytics generation.
 */

const BusinessReports = () => {
  const [accessResponse, setAccessResponse] =
    useState(null);

  const [loading, setLoading] =
    useState(true);

  const [error, setError] =
    useState("");

  /*
   * =======================================================
   * BUSINESS PRO PAYMENT STATE
   * =======================================================
   */

  const [businessProPlan, setBusinessProPlan] =
    useState(null);

  const [planLoading, setPlanLoading] =
    useState(false);

  const [planError, setPlanError] =
    useState("");

  const [showPaymentModal, setShowPaymentModal] =
    useState(false);

  const [phoneNumber, setPhoneNumber] =
    useState("");

  const [paymentState, setPaymentState] =
    useState("IDLE");

  const [paymentMessage, setPaymentMessage] =
    useState("");

  const [paymentError, setPaymentError] =
    useState("");

  const [currentPayment, setCurrentPayment] =
    useState(null);

  const [currentSubscription, setCurrentSubscription] =
    useState(null);

  const pollingRef =
    useRef(false);

  const mountedRef =
    useRef(true);

  /*
   * =======================================================
   * LOAD REPORT ENTITLEMENT
   * =======================================================
   */

  const loadReportAccess =
    useCallback(async ({
      showLoader = true,
    } = {}) => {
      try {
        if (showLoader) {
          setLoading(true);
        }

        setError("");

        const response =
          await getMyBusinessReportAccess();

        if (!mountedRef.current) {
          return null;
        }

        setAccessResponse(
          response || null
        );

        return response || null;
      } catch (err) {
        console.error(
          "LOAD BUSINESS REPORT ACCESS ERROR:",
          err
        );

        if (!mountedRef.current) {
          return null;
        }

        if (showLoader) {
          setAccessResponse(null);
        }

        setError(
          err?.response?.data?.message ||
            "We couldn't load your business report access. Please try again."
        );

        return null;
      } finally {
        if (
          showLoader &&
          mountedRef.current
        ) {
          setLoading(false);
        }
      }
    }, []);

  /*
   * =======================================================
   * LOAD BUSINESS PRO PLAN
   * =======================================================
   *
   * Price, currency and duration come from the backend.
   *
   * React does NOT define the Business Pro price.
   */

  const loadBusinessProPlan =
    useCallback(async () => {
      try {
        setPlanLoading(true);
        setPlanError("");

        const response =
          await getSubscriptionPlans();

        const plan =
          response?.plans?.find(
            (item) =>
              item?.type ===
              BUSINESS_PRO_PLAN_TYPE
          ) || null;

        if (!mountedRef.current) {
          return null;
        }

        if (!plan) {
          setBusinessProPlan(null);

          setPlanError(
            "Business Pro is temporarily unavailable."
          );

          return null;
        }

        setBusinessProPlan(plan);

        return plan;
      } catch (err) {
        console.error(
          "LOAD BUSINESS PRO PLAN ERROR:",
          err
        );

        if (!mountedRef.current) {
          return null;
        }

        setBusinessProPlan(null);

        setPlanError(
          err?.response?.data?.message ||
            "Unable to load the Business Pro plan."
        );

        return null;
      } finally {
        if (mountedRef.current) {
          setPlanLoading(false);
        }
      }
    }, []);

  /*
   * =======================================================
   * INITIAL LOAD
   * =======================================================
   */

  useEffect(() => {
    mountedRef.current = true;

    loadReportAccess();
    loadBusinessProPlan();

    return () => {
      mountedRef.current = false;
      pollingRef.current = false;
    };
  }, [
    loadReportAccess,
    loadBusinessProPlan,
  ]);

  /*
   * =======================================================
   * PAYMENT MODAL
   * =======================================================
   */

  const openPaymentModal = () => {
    setPaymentError("");
    setPaymentMessage("");
    setPaymentState("IDLE");

    setCurrentPayment(null);
    setCurrentSubscription(null);

    setShowPaymentModal(true);
  };

  const closePaymentModal = () => {
    const processing =
      paymentState === "CREATING" ||
      paymentState === "INITIATING" ||
      paymentState === "POLLING";

    if (processing) {
      return;
    }

    pollingRef.current = false;
    setShowPaymentModal(false);
  };

  /*
   * =======================================================
   * POLL BUSINESS PRO PAYMENT
   * =======================================================
   */

  const pollBusinessProPayment = async (paymentId) => {
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
        attempt <= PAYMENT_MAX_ATTEMPTS;
        attempt += 1
      ) {
        if (
          !pollingRef.current ||
          !mountedRef.current
        ) {
          return;
        }

        try {
          const response =
            await getSubscriptionPaymentStatus(
              paymentId
            );

          if (!mountedRef.current) {
            return;
          }

          const payment =
            response?.payment || null;

          const subscription =
            response?.subscription || null;

          if (payment) {
            setCurrentPayment(payment);
          }

          if (subscription) {
            setCurrentSubscription(
              subscription
            );
          }

          /*
           * ===============================================
           * PAYMENT COMPLETED
           * ===============================================
           *
           * IMPORTANT:
           *
           * COMPLETED payment does NOT cause React to set
           * Business Pro access locally.
           *
           * We refresh /business/me/reports and require
           * reports.isBusinessPro === true.
           */

          if (
            payment?.status ===
            "COMPLETED"
          ) {
            pollingRef.current = false;

            setPaymentMessage(
              "Payment confirmed. Verifying Business Pro access..."
            );

            const refreshedAccess =
              await loadReportAccess({
                showLoader: false,
              });

            const serverGrantedAccess =
              refreshedAccess?.reports
                ?.isBusinessPro === true;

            if (serverGrantedAccess) {
              setPaymentState(
                "SUCCESS"
              );

              setPaymentMessage(
                "Payment confirmed. Business Pro is now active."
              );

              return;
            }

            setPaymentState(
              "VERIFYING"
            );

            setPaymentMessage(
              "Payment was confirmed. Your Business Pro access is still being verified by the server."
            );

            return;
          }

          /*
           * ===============================================
           * PAYMENT FAILED / CANCELLED
           * ===============================================
           */

         /*
 * ===============================================
 * PAYMENT CANCELLED
 * ===============================================
 *
 * Close the modal immediately and inform the user.
 *
 * IMPORTANT:
 * Cancellation never grants Business Pro access.
 * We refresh the canonical backend entitlement
 * before returning to the locked reports page.
 */

if (
  payment?.status ===
  "CANCELLED"
) {
  pollingRef.current = false;

  const cancellationMessage =
    payment?.resultDescription ||
    "M-Pesa payment was cancelled. Business Pro was not activated.";

  // Refresh canonical entitlement from backend.
  await loadReportAccess({
    showLoader: false,
  });

  if (!mountedRef.current) {
    return;
  }

  // Close and reset the payment modal.
  setShowPaymentModal(false);
  setPaymentState("IDLE");
  setPaymentMessage("");
  setPaymentError("");
  setCurrentPayment(null);
  setCurrentSubscription(null);

  // Inform the user after the modal closes.
  window.alert(
    cancellationMessage
  );

  return;
}

/*
 * ===============================================
 * PAYMENT FAILED
 * ===============================================
 *
 * Genuine payment failures remain inside the
 * modal so the user can see the failure and retry.
 */

if (
  payment?.status ===
  "FAILED"
) {
  pollingRef.current = false;

  setPaymentState("FAILED");

  setPaymentError(
    payment?.resultDescription ||
    "The M-Pesa payment failed."
  );

  return;
}
        } catch (err) {
          console.error(
            "BUSINESS PRO PAYMENT POLLING ERROR:",
            err
          );

          /*
           * A temporary network error must not make a
           * successful M-Pesa payment appear failed.
           */
        }

        if (
          attempt <
          PAYMENT_MAX_ATTEMPTS
        ) {
          await wait(
            PAYMENT_POLL_INTERVAL
          );
        }
      }

      pollingRef.current = false;

      if (!mountedRef.current) {
        return;
      }

      setPaymentState("TIMEOUT");

      setPaymentError(
        "Payment confirmation is taking longer than expected. If you completed the M-Pesa payment, your Business Pro access will update after the server confirms it."
      );
    };

  /*
   * =======================================================
   * START BUSINESS PRO PAYMENT
   * =======================================================
   */

  const handleBusinessProPayment =
    async (event) => {
      event.preventDefault();

      const phone =
        phoneNumber.trim();

      if (!phone) {
        setPaymentError(
          "Enter the Safaricom number that will make the payment."
        );

        return;
      }

      if (!businessProPlan) {
        setPaymentError(
          "Business Pro is currently unavailable. Please try again."
        );

        return;
      }

      try {
        pollingRef.current = false;

        setPaymentError("");

        setPaymentState(
          "CREATING"
        );

        setPaymentMessage(
          "Preparing your Business Pro subscription..."
        );

        /*
         * ===============================================
         * CREATE / REUSE BUSINESS_PRO SUBSCRIPTION
         * ===============================================
         */

        const subscriptionResponse =
          await createSubscription(
            BUSINESS_PRO_PLAN_TYPE
          );

        const subscription =
          subscriptionResponse
            ?.subscription;

        if (!subscription?.id) {
          throw new Error(
            "Business Pro subscription could not be created."
          );
        }

        /*
         * Defensive frontend validation only.
         *
         * The backend remains authoritative.
         */

        if (
          subscription.plan !==
          BUSINESS_PRO_PLAN_TYPE
        ) {
          throw new Error(
            "Unexpected subscription plan returned by the server."
          );
        }

        setCurrentSubscription(
          subscription
        );

        /*
         * ===============================================
         * INITIATE M-PESA STK
         * ===============================================
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
          paymentResponse?.payment;

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

        await pollBusinessProPayment(
          payment.id
        );
      } catch (err) {
        console.error(
          "BUSINESS PRO PAYMENT ERROR:",
          err
        );

        pollingRef.current = false;

        const response =
          err?.response?.data;

        /*
         * Existing STK request.
         */

        if (
          response?.code ===
          "PAYMENT_ALREADY_PENDING"
        ) {
          const existingPayment =
            response?.payment;

          if (existingPayment?.id) {
            setCurrentPayment(
              existingPayment
            );

            setPaymentMessage(
              "An M-Pesa request is already pending. Waiting for confirmation..."
            );

            await pollBusinessProPayment(
              existingPayment.id
            );

            return;
          }
        }

        /*
         * If backend says Business Pro is already active,
         * do NOT set entitlement locally.
         *
         * Refresh the canonical report-access endpoint.
         */

        if (
          response?.code ===
            "SUBSCRIPTION_ALREADY_ACTIVE" ||
          response?.code ===
            "ACTIVE_SUBSCRIPTION_EXISTS"
        ) {
          const refreshedAccess =
            await loadReportAccess({
              showLoader: false,
            });

          if (
            refreshedAccess?.reports
              ?.isBusinessPro === true
          ) {
            setPaymentState(
              "SUCCESS"
            );

            setPaymentMessage(
              "Business Pro is already active."
            );

            return;
          }
        }

        setPaymentState("FAILED");

        setPaymentError(
          response?.message ||
            response?.reason ||
            err?.message ||
            "Unable to start the Business Pro payment."
        );
      }
    };

  /*
   * =======================================================
   * RECHECK ENTITLEMENT
   * =======================================================
   */

  const recheckBusinessProAccess =
    async () => {
      setPaymentError("");

      setPaymentMessage(
        "Checking Business Pro access..."
      );

      const refreshedAccess =
        await loadReportAccess({
          showLoader: false,
        });

      if (
        refreshedAccess?.reports
          ?.isBusinessPro === true
      ) {
        setPaymentState("SUCCESS");

        setPaymentMessage(
          "Business Pro is now active."
        );

        return;
      }

      setPaymentState("VERIFYING");

      setPaymentMessage(
        "Business Pro is not active yet. If your M-Pesa payment completed, please try again shortly."
      );
    };

  const finishBusinessProPayment =
    async () => {
      pollingRef.current = false;

      setShowPaymentModal(false);

      setPaymentState("IDLE");
      setPaymentError("");
      setPaymentMessage("");

      await loadReportAccess({
        showLoader: false,
      });
    };

  /*
   * =======================================================
   * PAGE STATES
   * =======================================================
   */

  if (loading) {
    return <BusinessReportsLoading />;
  }

  if (error) {
    return (
      <BusinessReportsError
        message={error}
        onRetry={loadReportAccess}
      />
    );
  }

  const business =
    accessResponse?.business || null;

  const reports =
    accessResponse?.reports || null;

  /*
   * SECURITY:
   *
   * This remains the ONLY frontend Business Pro
   * entitlement decision.
   */

  const hasBusinessProAccess =
    reports?.isBusinessPro === true;

  if (!hasBusinessProAccess) {
    return (
      <>
        <BusinessReportsLocked
          business={business}
          plan={businessProPlan}
          planLoading={planLoading}
          planError={planError}
          onUpgrade={
            openPaymentModal
          }
          onReloadPlan={
            loadBusinessProPlan
          }
        />

        {showPaymentModal && (
          <BusinessProPaymentModal
            plan={businessProPlan}
            phoneNumber={phoneNumber}
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
              handleBusinessProPayment
            }
            onClose={
              closePaymentModal
            }
            onFinish={
              finishBusinessProPayment
            }
            onRecheck={
              recheckBusinessProAccess
            }
            onRetry={() => {
              pollingRef.current =
                false;

              setPaymentState(
                "IDLE"
              );

              setPaymentError("");
              setPaymentMessage("");
              setCurrentPayment(null);
            }}
          />
        )}
      </>
    );
  }

  return (
    <BusinessReportsUnlocked
      business={business}
      reports={reports}
      hasBusinessProAccess={
        hasBusinessProAccess
      }
    />
  );
};

const ReportsPageShell = ({ children }) => (
  <div className="min-h-screen overflow-x-hidden bg-[#F8F5F3] pb-12 font-sans sm:pb-16">
    <main className="mx-auto w-full max-w-7xl px-3 py-4 sm:px-6 sm:py-8 lg:px-8">
      {children}
    </main>
  </div>
);

const ReportsHeader = ({ business, isBusinessPro }) => (
  <>
    <Link
      to="/business/dashboard"
      className="inline-flex min-h-10 items-center gap-2 rounded-lg pr-2 text-xs font-bold text-[#6B1D2C] transition hover:text-[#3D0F18] focus:outline-none focus:ring-2 focus:ring-[#8A2638]/20"
    >
      <ArrowLeft size={15} />
      Back to Business Dashboard
    </Link>

    <div className="mt-4 flex flex-col gap-4 sm:mt-6 sm:gap-5 lg:flex-row lg:items-end lg:justify-between">
      <div className="max-w-3xl">
        <div className="flex flex-wrap items-center gap-2">
          <p className="text-[10px] font-black uppercase tracking-[0.18em] text-[#9A5D37]">
            Business Intelligence
          </p>

          {isBusinessPro && (
            <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-1 text-[9px] font-black text-emerald-700">
              <CheckCircle2 size={11} />
              PRO ACTIVE
            </span>
          )}
        </div>

        <h1 className="mt-2 text-xl font-black tracking-tight text-[#3D0F18] sm:text-3xl">
          Business Reports
        </h1>

        <p className="mt-2 max-w-2xl text-xs leading-5 text-gray-500 sm:text-sm sm:leading-6">
          Understand how your business is performing with clear,
          structured reports built from your marketplace activity.
        </p>
      </div>

      {business && (
        <div className="min-w-0 w-full rounded-2xl border border-[#E8DFDB] bg-white p-3 shadow-sm sm:w-auto sm:min-w-[240px] sm:max-w-sm">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#F5E8EB]">
              <Store size={18} className="text-[#5B1725]" />
            </div>

            <div className="min-w-0">
              <p className="text-[9px] font-black uppercase tracking-[0.12em] text-gray-400">
                Business
              </p>

              <p className="truncate text-sm font-black text-[#3D0F18]">
                {business.businessName || "My Business"}
              </p>

              {business.status && (
                <p className="mt-0.5 text-[10px] font-semibold capitalize text-gray-500">
                  {String(business.status)
                    .toLowerCase()
                    .replaceAll("_", " ")}
                </p>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  </>
);

const BusinessReportsLocked = ({
  business,
  plan,
  planLoading,
  planError,
  onUpgrade,
  onReloadPlan,
}) => (
  <ReportsPageShell>
    <ReportsHeader business={business} isBusinessPro={false} />

    <section className="mt-5 overflow-hidden rounded-2xl border border-[#E8DFDB] bg-white shadow-sm sm:mt-7 sm:rounded-3xl">
      <div className="h-1 bg-linear-to-r from-[#5B1725] via-[#8A2638] to-[#D6B15E]" />

      <div className="grid lg:grid-cols-[1.15fr_0.85fr]">
        <div className="p-6 sm:p-8 lg:p-10">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-[#F5E8EB]">
            <LockKeyhole size={25} className="text-[#5B1725]" />
          </div>

          <p className="mt-6 text-[10px] font-black uppercase tracking-[0.18em] text-[#9A5D37]">
            Business Pro
          </p>

          <h2 className="mt-2 max-w-xl text-2xl font-black tracking-tight text-[#3D0F18] sm:text-3xl">
            Turn your business data into useful reports
          </h2>

          <p className="mt-4 max-w-2xl text-sm leading-6 text-gray-500">
            Business Pro Reports help you understand performance,
            listings, conversions, customer demand, promotions and
            growth opportunities in one organised reporting centre.
          </p>

          <div className="mt-6 flex items-start gap-3 rounded-2xl border border-amber-200 bg-amber-50 p-4">
            <ShieldCheck
              size={19}
              className="mt-0.5 shrink-0 text-amber-700"
            />

            <div>
              <p className="text-xs font-black text-amber-900">
                Business Pro is separate from Personal Premium
              </p>

              <p className="mt-1 text-[11px] leading-5 text-amber-800">
                Your Personal Premium subscription does not
                automatically unlock Business Reports. Business access
                is checked separately and securely by the server.
              </p>
            </div>
          </div>
          <div className="mt-6 overflow-hidden rounded-2xl border border-[#E8DFDB] bg-[#FBF9F8]">
            <div className="p-5 sm:p-6">
              <div className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <Crown
                      size={18}
                      className="text-[#9A5D37]"
                    />

                    <p className="text-[10px] font-black uppercase tracking-[0.16em] text-[#9A5D37]">
                      Business Pro Plan
                    </p>
                  </div>

                  {planLoading ? (
                    <div className="mt-4 flex items-center gap-2 text-sm font-bold text-gray-500">
                      <Loader2
                        size={17}
                        className="animate-spin"
                      />

                      Loading Business Pro...
                    </div>
                  ) : plan ? (
                    <>
                      <div className="mt-3 flex flex-wrap items-end gap-x-2 gap-y-1">
                        <span className="text-sm font-black text-gray-500">
                          {plan.currency || "KES"}
                        </span>

                        <span className="text-4xl font-black tracking-tight text-[#3D0F18]">
                          {Number(
                            plan.amount
                          ).toLocaleString()}
                        </span>

                        <span className="pb-1 text-xs font-bold text-gray-400">
                          / {plan.durationDays || 30} days
                        </span>
                      </div>

                      <p className="mt-2 max-w-lg text-xs leading-5 text-gray-500">
                        {plan.description ||
                          "Unlock advanced business analytics, reports and export tools for your business."}
                      </p>
                    </>
                  ) : (
                    <p className="mt-3 text-sm font-bold text-gray-500">
                      Business Pro pricing is currently unavailable.
                    </p>
                  )}
                </div>

                {!planLoading && plan && (
                  <button
                    type="button"
                    onClick={onUpgrade}
                    className="inline-flex min-h-12 w-full shrink-0 items-center justify-center gap-2 rounded-xl bg-[#5B1725] px-6 py-3 text-sm font-black text-white shadow-sm transition hover:bg-[#48101C] focus:outline-none focus:ring-2 focus:ring-[#8A2638]/30 sm:w-auto"
                  >
                    <Smartphone size={18} />

                    Upgrade with M-Pesa
                  </button>
                )}
              </div>

              {plan && (
                <div className="mt-5 flex flex-wrap gap-2 border-t border-[#E8DFDB] pt-4">
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-3 py-1.5 text-[10px] font-black text-emerald-700">
                    <CheckCircle2 size={12} />
                    Business Reports
                  </span>

                  <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-3 py-1.5 text-[10px] font-black text-emerald-700">
                    <CheckCircle2 size={12} />
                    Extended History
                  </span>

                  <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-3 py-1.5 text-[10px] font-black text-emerald-700">
                    <CheckCircle2 size={12} />
                    Custom Date Ranges
                  </span>

                  <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-3 py-1.5 text-[10px] font-black text-emerald-700">
                    <CheckCircle2 size={12} />
                    Report Exports
                  </span>
                </div>
              )}

              <div className="mt-4 flex items-start gap-2">
                <ShieldCheck
                  size={15}
                  className="mt-0.5 shrink-0 text-gray-400"
                />

                <p className="text-[10px] leading-4 text-gray-400">
                  Business Pro activates only after your M-Pesa
                  payment is successfully confirmed by the server.
                  Opening or completing the payment form does not
                  grant report access by itself.
                </p>
              </div>
            </div>
          </div>
          {planError && !planLoading && !plan && (
            <div className="mt-4 flex flex-col gap-3 rounded-2xl border border-red-200 bg-red-50 p-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-start gap-3">
                <AlertCircle
                  size={18}
                  className="mt-0.5 shrink-0 text-red-600"
                />

                <div>
                  <p className="text-xs font-black text-red-900">
                    Business Pro couldn't be loaded
                  </p>

                  <p className="mt-1 text-[11px] leading-5 text-red-700">
                    {planError}
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={onReloadPlan}
                className="inline-flex min-h-10 shrink-0 items-center justify-center gap-2 rounded-xl border border-red-200 bg-white px-4 py-2 text-xs font-black text-red-700 transition hover:bg-red-100"
              >
                <RefreshCw size={14} />
                Try Again
              </button>
            </div>
          )}
        </div>

        <div className="border-t border-[#EEE6E2] bg-[#FBF9F8] p-6 sm:p-8 lg:border-l lg:border-t-0">
          <p className="text-[10px] font-black uppercase tracking-[0.15em] text-[#9A5D37]">
            What you unlock
          </p>

          <h3 className="mt-2 text-lg font-black text-[#3D0F18]">
            Advanced business intelligence
          </h3>

          <div className="mt-5 space-y-3">
            <FeatureRow
              icon={BarChart3}
              title="Performance insights"
              description="Review business performance across supported reporting periods."
            />

            <FeatureRow
              icon={FileSpreadsheet}
              title="Spreadsheet exports"
              description="Prepare structured CSV datasets for deeper analysis."
            />

            <FeatureRow
              icon={FileJson}
              title="Structured report data"
              description="Access clean JSON representations of your reports."
            />

            <FeatureRow
              icon={FileBarChart}
              title="Presentation-ready data"
              description="Prepare structured report information for future PDF rendering."
            />
          </div>
        </div>
      </div>
    </section>

    <section className="mt-8">
      <SectionHeading
        eyebrow="Reporting Tools"
        title="Available with Business Pro"
        description="A simple reporting toolkit designed to help you understand and grow your marketplace business."
      />

      <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <LockedCapability
          icon={BarChart3}
          title="Business Reports"
          description="Performance, conversion, demand and growth intelligence."
        />

        <LockedCapability
          icon={History}
          title="Extended History"
          description="Analyse performance across longer reporting periods."
        />

        <LockedCapability
          icon={CalendarDays}
          title="Custom Date Ranges"
          description="Choose specific reporting periods for deeper analysis."
        />

        <LockedCapability
          icon={FileSpreadsheet}
          title="Report Exports"
          description="Prepare your report data for JSON, CSV and PDF-ready workflows."
        />
      </div>
    </section>

    <section className="mt-8 rounded-2xl border border-[#E8DFDB] bg-white p-5 shadow-sm sm:p-6">
      <div className="flex items-start gap-4">
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-emerald-50">
          <ShieldCheck size={20} className="text-emerald-700" />
        </div>

        <div>
          <h3 className="text-sm font-black text-[#3D0F18]">
            Your report access is securely verified
          </h3>

          <p className="mt-1 max-w-3xl text-xs leading-5 text-gray-500">
            Report permissions are verified using your authenticated
            Business Account. The browser does not decide whether your
            account has Business Pro access.
          </p>
        </div>
      </div>
    </section>
  </ReportsPageShell>
);


/**
 * =========================================================
 * BUSINESS PRO M-PESA PAYMENT MODAL
 * =========================================================
 *
 * SECURITY:
 *
 * This modal never grants Business Pro access.
 *
 * Successful M-Pesa payment is followed by a refresh of
 * the protected Business Reports entitlement endpoint.
 *
 * Only:
 *
 * reports.isBusinessPro === true
 *
 * unlocks the reporting experience.
 */

const BusinessProPaymentModal = ({
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
  onRecheck,
  onRetry,
}) => {
  const isCreating =
    paymentState === "CREATING";

  const isInitiating =
    paymentState === "INITIATING";

  const isPolling =
    paymentState === "POLLING";

  const isProcessing =
    isCreating ||
    isInitiating ||
    isPolling;

  const isSuccess =
    paymentState === "SUCCESS";

  const isFailed =
    paymentState === "FAILED";

  const isTimeout =
    paymentState === "TIMEOUT";

  const isVerifying =
    paymentState === "VERIFYING";

  const canClose =
    !isProcessing;

  const paymentStatus =
    currentPayment?.status || null;

  const receiptNumber =
    currentPayment?.receiptNumber ||
    null;

  const subscriptionStatus =
    currentSubscription?.status ||
    null;

  const formattedAmount =
    Number.isFinite(
      Number(plan?.amount)
    )
      ? Number(
          plan.amount
        ).toLocaleString()
      : "—";

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 p-0 backdrop-blur-[2px] sm:items-center sm:p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="business-pro-payment-title"
    >
      <div className="max-h-[92vh] w-full overflow-y-auto rounded-t-3xl bg-white shadow-2xl sm:max-w-lg sm:rounded-3xl">
        {/* HEADER */}

        <div className="sticky top-0 z-10 border-b border-[#EEE6E2] bg-white/95 px-5 py-4 backdrop-blur sm:px-6">
          <div className="flex items-start justify-between gap-4">
            <div className="flex min-w-0 items-start gap-3">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[#F5E8EB]">
                <Crown
                  size={20}
                  className="text-[#5B1725]"
                />
              </div>

              <div className="min-w-0">
                <p className="text-[9px] font-black uppercase tracking-[0.16em] text-[#9A5D37]">
                  Business Pro
                </p>

                <h2
                  id="business-pro-payment-title"
                  className="mt-0.5 text-lg font-black text-[#3D0F18]"
                >
                  Upgrade with M-Pesa
                </h2>
              </div>
            </div>

            <button
              type="button"
              onClick={onClose}
              disabled={!canClose}
              aria-label="Close payment"
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-gray-400 transition hover:bg-gray-100 hover:text-gray-700 disabled:cursor-not-allowed disabled:opacity-40"
            >
              <X size={19} />
            </button>
          </div>
        </div>

        <div className="p-5 sm:p-6">
          {/* PLAN SUMMARY */}

          <div className="rounded-2xl border border-[#E8DFDB] bg-[#FBF9F8] p-4">
            <div className="flex items-end justify-between gap-4">
              <div>
                <p className="text-[9px] font-black uppercase tracking-[0.14em] text-gray-400">
                  Subscription
                </p>

                <p className="mt-1 text-sm font-black text-[#3D0F18]">
                  {plan?.name ||
                    "BarterTrade Business Pro"}
                </p>
              </div>

              <div className="shrink-0 text-right">
                <div className="flex items-end justify-end gap-1">
                  <span className="pb-1 text-[10px] font-black text-gray-400">
                    {plan?.currency ||
                      "KES"}
                  </span>

                  <span className="text-2xl font-black tracking-tight text-[#3D0F18]">
                    {formattedAmount}
                  </span>
                </div>

                <p className="text-[10px] font-bold text-gray-400">
                  {plan?.durationDays
                    ? `${plan.durationDays} days`
                    : "30 days"}
                </p>
              </div>
            </div>
          </div>

          {/* IDLE PAYMENT FORM */}

          {paymentState === "IDLE" && (
            <form
              onSubmit={onSubmit}
              className="mt-6"
            >
              <label
                htmlFor="business-pro-phone"
                className="text-xs font-black text-[#3D0F18]"
              >
                Safaricom M-Pesa number
              </label>

              <p className="mt-1 text-[11px] leading-5 text-gray-500">
                Enter the phone number that
                should receive the M-Pesa STK
                push.
              </p>

              <div className="relative mt-3">
                <Smartphone
                  size={17}
                  className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-gray-400"
                />

                <input
                  id="business-pro-phone"
                  type="tel"
                  inputMode="tel"
                  autoComplete="tel"
                  value={phoneNumber}
                  onChange={(event) =>
                    setPhoneNumber(
                      event.target.value
                    )
                  }
                  placeholder="e.g. 0712345678"
                  className="min-h-12 w-full rounded-xl border border-[#DDD3CF] bg-white py-3 pl-11 pr-4 text-sm font-bold text-[#3D0F18] outline-none transition placeholder:font-medium placeholder:text-gray-300 focus:border-[#8A2638] focus:ring-2 focus:ring-[#8A2638]/10"
                />
              </div>

              {paymentError && (
                <div className="mt-3 flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 p-3">
                  <AlertCircle
                    size={16}
                    className="mt-0.5 shrink-0 text-red-600"
                  />

                  <p className="text-[11px] leading-5 text-red-700">
                    {paymentError}
                  </p>
                </div>
              )}

              <button
                type="submit"
                disabled={!plan}
                className="mt-5 inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-[#5B1725] px-5 py-3 text-sm font-black text-white transition hover:bg-[#48101C] disabled:cursor-not-allowed disabled:opacity-50"
              >
                <Smartphone size={18} />

                Pay{" "}
                {plan?.currency ||
                  "KES"}{" "}
                {formattedAmount} with
                M-Pesa
              </button>

              <div className="mt-4 flex items-start gap-2">
                <ShieldCheck
                  size={14}
                  className="mt-0.5 shrink-0 text-gray-400"
                />

                <p className="text-[10px] leading-4 text-gray-400">
                  Your Business Pro access
                  activates only after the
                  backend confirms the M-Pesa
                  payment and activates your
                  subscription.
                </p>
              </div>
            </form>
          )}

          {/* PROCESSING */}

          {isProcessing && (
            <div className="py-8 text-center">
              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-[#F5E8EB]">
                <Loader2
                  size={28}
                  className="animate-spin text-[#5B1725]"
                />
              </div>

              <h3 className="mt-5 text-base font-black text-[#3D0F18]">
                {isCreating
                  ? "Preparing Business Pro"
                  : isInitiating
                    ? "Sending M-Pesa request"
                    : "Waiting for payment"}
              </h3>

              <p className="mx-auto mt-2 max-w-sm text-xs leading-5 text-gray-500">
                {paymentMessage ||
                  "Please wait while we process your request."}
              </p>

              {isPolling && (
                <div className="mt-5 rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-left">
                  <div className="flex items-start gap-3">
                    <Smartphone
                      size={18}
                      className="mt-0.5 shrink-0 text-emerald-700"
                    />

                    <div>
                      <p className="text-xs font-black text-emerald-900">
                        Check your phone
                      </p>

                      <p className="mt-1 text-[11px] leading-5 text-emerald-700">
                        Enter your M-Pesa PIN
                        when the Safaricom
                        payment prompt appears.
                        Keep this window open
                        while we wait for
                        confirmation.
                      </p>
                    </div>
                  </div>
                </div>
              )}

              <p className="mt-5 text-[10px] leading-4 text-gray-400">
                Do not refresh or submit
                another payment while this
                request is being processed.
              </p>
            </div>
          )}

          {/* SUCCESS */}

          {isSuccess && (
            <div className="py-5">
              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-emerald-100">
                <CheckCircle2
                  size={30}
                  className="text-emerald-700"
                />
              </div>

              <div className="mt-4 text-center">
                <h3 className="text-lg font-black text-[#3D0F18]">
                  Business Pro activated
                </h3>

                <p className="mx-auto mt-2 max-w-sm text-xs leading-5 text-gray-500">
                  {paymentMessage ||
                    "Your Business Pro access has been verified by the server."}
                </p>
              </div>

              {(receiptNumber ||
                paymentStatus ||
                subscriptionStatus) && (
                <div className="mt-6 divide-y divide-[#EEE6E2] rounded-2xl border border-[#E8DFDB] bg-[#FBF9F8] px-4">
                  {receiptNumber && (
                    <PaymentDetailRow
                      label="M-Pesa receipt"
                      value={
                        receiptNumber
                      }
                    />
                  )}

                  {paymentStatus && (
                    <PaymentDetailRow
                      label="Payment"
                      value={
                        paymentStatus
                      }
                    />
                  )}

                  {subscriptionStatus && (
                    <PaymentDetailRow
                      label="Subscription"
                      value={
                        subscriptionStatus
                      }
                    />
                  )}
                </div>
              )}

              <button
                type="button"
                onClick={onFinish}
                className="mt-6 inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-[#5B1725] px-5 py-3 text-sm font-black text-white transition hover:bg-[#48101C]"
              >
                <FileBarChart size={18} />
                Open Business Reports
              </button>
            </div>
          )}

          {/* SERVER VERIFICATION */}

          {isVerifying && (
            <div className="py-5">
              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-amber-100">
                <RefreshCw
                  size={27}
                  className="text-amber-700"
                />
              </div>

              <div className="mt-4 text-center">
                <h3 className="text-lg font-black text-[#3D0F18]">
                  Verifying Business Pro
                </h3>

                <p className="mx-auto mt-2 max-w-sm text-xs leading-5 text-gray-500">
                  {paymentMessage}
                </p>
              </div>

              <div className="mt-5 rounded-2xl border border-amber-200 bg-amber-50 p-4">
                <div className="flex items-start gap-3">
                  <ShieldCheck
                    size={18}
                    className="mt-0.5 shrink-0 text-amber-700"
                  />

                  <p className="text-[11px] leading-5 text-amber-800">
                    A payment confirmation
                    alone does not unlock
                    reports. We are checking
                    your Business Pro
                    entitlement directly with
                    the server.
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={onRecheck}
                className="mt-5 inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-[#5B1725] px-5 py-3 text-sm font-black text-white transition hover:bg-[#48101C]"
              >
                <RefreshCw size={17} />
                Check Access Again
              </button>

              <button
                type="button"
                onClick={onClose}
                className="mt-2 inline-flex min-h-11 w-full items-center justify-center rounded-xl px-5 py-2 text-xs font-black text-gray-500 transition hover:bg-gray-50"
              >
                Close
              </button>
            </div>
          )}

          {/* FAILED */}

          {isFailed && (
            <div className="py-5">
              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-red-100">
                <AlertCircle
                  size={29}
                  className="text-red-700"
                />
              </div>

              <div className="mt-4 text-center">
                <h3 className="text-lg font-black text-[#3D0F18]">
                  Payment not completed
                </h3>

                <p className="mx-auto mt-2 max-w-sm text-xs leading-5 text-gray-500">
                  Your Business Pro access
                  has not been unlocked.
                </p>
              </div>

              {paymentError && (
                <div className="mt-5 rounded-2xl border border-red-200 bg-red-50 p-4">
                  <p className="text-xs font-bold leading-5 text-red-700">
                    {paymentError}
                  </p>
                </div>
              )}

              <button
                type="button"
                onClick={onRetry}
                className="mt-5 inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-[#5B1725] px-5 py-3 text-sm font-black text-white transition hover:bg-[#48101C]"
              >
                <RefreshCw size={17} />
                Try Again
              </button>

              <button
                type="button"
                onClick={onClose}
                className="mt-2 inline-flex min-h-11 w-full items-center justify-center rounded-xl px-5 py-2 text-xs font-black text-gray-500 transition hover:bg-gray-50"
              >
                Close
              </button>
            </div>
          )}

          {/* TIMEOUT */}

          {isTimeout && (
            <div className="py-5">
              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-amber-100">
                <History
                  size={28}
                  className="text-amber-700"
                />
              </div>

              <div className="mt-4 text-center">
                <h3 className="text-lg font-black text-[#3D0F18]">
                  Confirmation is taking longer
                </h3>

                <p className="mx-auto mt-2 max-w-sm text-xs leading-5 text-gray-500">
                  We have not received a final
                  payment state yet.
                </p>
              </div>

              {paymentError && (
                <div className="mt-5 rounded-2xl border border-amber-200 bg-amber-50 p-4">
                  <p className="text-xs font-bold leading-5 text-amber-800">
                    {paymentError}
                  </p>
                </div>
              )}

              <button
                type="button"
                onClick={onRecheck}
                className="mt-5 inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-[#5B1725] px-5 py-3 text-sm font-black text-white transition hover:bg-[#48101C]"
              >
                <RefreshCw size={17} />
                Check Business Pro Access
              </button>

              <button
                type="button"
                onClick={onClose}
                className="mt-2 inline-flex min-h-11 w-full items-center justify-center rounded-xl px-5 py-2 text-xs font-black text-gray-500 transition hover:bg-gray-50"
              >
                Close
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

/**
 * =========================================================
 * PAYMENT DETAIL ROW
 * =========================================================
 */

const PaymentDetailRow = ({
  label,
  value,
}) => (
  <div className="flex items-center justify-between gap-4 py-3">
    <span className="text-[10px] font-bold text-gray-400">
      {label}
    </span>

    <span className="break-all text-right text-[11px] font-black text-[#3D0F18]">
      {value}
    </span>
  </div>
);

/**
 * =========================================================
 * UNLOCKED STATE
 * =========================================================
 */

const BusinessReportsUnlocked = ({ business, reports, hasBusinessProAccess }) => {
  const [selectedReportType, setSelectedReportType] = useState(null);
  const [confirmedReportType, setConfirmedReportType] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");

  const [dateMode, setDateMode] = useState("RELATIVE");
  const [relativeDays, setRelativeDays] = useState(30);
  const [customStartDate, setCustomStartDate] = useState("");
  const [customEndDate, setCustomEndDate] = useState("");
  const [dateRangeError, setDateRangeError] = useState("");

  const [reportLoading, setReportLoading] = useState(false);
  const [reportError, setReportError] = useState("");
  const [generatedReport, setGeneratedReport] = useState(null);
  const [generatedReportType, setGeneratedReportType] = useState(null);
  const [generatedReportPeriod, setGeneratedReportPeriod] = useState(null);

  const [ jsonExportLoading, setJsonExportLoading] = useState(false);
  const [ jsonExportError, setJsonExportError] = useState("");
  const [ jsonExportResponse, setJsonExportResponse,] = useState(null);
  const [ csvExportLoading, setCsvExportLoading,] = useState(false);
  const [ csvExportError, setCsvExportError,] = useState("");
  const [ csvExportResponse, setCsvExportResponse,] = useState(null);
  const [ pdfReadyLoading, setPdfReadyLoading] = useState(false);
  const [ pdfReadyError,setPdfReadyError] = useState("");
  const [ pdfReadyResponse, setPdfReadyResponse,] = useState(null);
  const [ downloadStatus, setDownloadStatus,] = useState(null);
  const [ downloadError, setDownloadError,] = useState("");

  const maxHistoryDays = reports?.maxHistoryDays ?? "—";
  const customDateRange = reports?.customDateRange === true;
  const reportExport = reports?.reportExport === true;
  const reportGeneration = reports?.reportGeneration === true;
  const reportVersion = reports?.reportVersion || null;
  const canGenerateReports = hasBusinessProAccess === true && reportGeneration === true;
  const canExportReports = hasBusinessProAccess === true && reportExport === true;

const numericMaxHistoryDays =
  Number.isInteger(Number(maxHistoryDays)) &&
  Number(maxHistoryDays) > 0
    ? Number(maxHistoryDays)
    : null;

  const todayDate = new Date().toISOString().split("T")[0];

  const REPORT_PERIOD_PRESETS = [
    { label: "7 days", days: 7 },
    { label: "30 days", days: 30 },
    { label: "90 days", days: 90 },
    { label: "180 days", days: 180 },
    { label: "365 days", days: 365 },
  ].filter(
  (preset) =>
    numericMaxHistoryDays !== null &&
    preset.days <= numericMaxHistoryDays
);

  const normalizedSearch = searchTerm.trim().toLowerCase();

  const visibleReports = normalizedSearch
    ? BUSINESS_REPORT_CATALOG.filter(
        (report) =>
          report.title.toLowerCase().includes(normalizedSearch) ||
          report.description.toLowerCase().includes(normalizedSearch) ||
          report.category.toLowerCase().includes(normalizedSearch)
      )
    : BUSINESS_REPORT_CATALOG;

  const selectedReport =
    BUSINESS_REPORT_CATALOG.find(
      (report) => report.type === selectedReportType
    ) || null;

  const confirmedReport = BUSINESS_REPORT_CATALOG.find(
      (report) => report.type === confirmedReportType
    ) || null;

    /**
 * =========================================================
 * 9.11.20.7 — CANONICAL GENERATED REPORT
 * =========================================================
 *
 * JSON report API response:
 *
 * {
 *   success: true,
 *   export: {...},
 *   data: canonicalReport
 * }
 *
 * IMPORTANT:
 *
 * The canonical report lives under generatedReport.data.
 * We do not fall back to the API envelope itself because
 * that would hide backend/frontend contract mistakes.
 */

const canonicalGeneratedReport =
  generatedReport?.success === true &&
  generatedReport?.data &&
  typeof generatedReport.data === "object"
    ? generatedReport.data
    : null;

const generatedExecutiveSummary =
  canonicalGeneratedReport?.summary &&
  typeof canonicalGeneratedReport.summary === "object"
    ? canonicalGeneratedReport.summary
    : null;

    /**
 * =======================================================
 * 9.11.20.16 — GENERATED REPORT UI STATE
 * =======================================================
 */

const generatedReportMatchesSelection =
  Boolean(
    generatedReportType &&
      generatedReportType ===
        confirmedReportType
  );

const hasCanonicalGeneratedReport =
  Boolean(
    canonicalGeneratedReport &&
      generatedReportMatchesSelection
  );

const showGeneratedReportLoading =
  Boolean(
    reportLoading &&
      confirmedReportType
  );

const showGeneratedReportError =
  Boolean(
    !reportLoading &&
      reportError &&
      confirmedReportType
  );

const showGeneratedReportEmpty =
  Boolean(
    !reportLoading &&
      !reportError &&
      generatedReport &&
      generatedReportMatchesSelection &&
      !canonicalGeneratedReport
  );

  const resetGeneratedReport = () => {
    setGeneratedReport(null);
    setGeneratedReportType(null);
    setGeneratedReportPeriod(null);
    setReportError("");
    setJsonExportLoading(false);
    setJsonExportError("");
    setJsonExportResponse(null);
    setCsvExportLoading(false);
    setCsvExportError("");
    setCsvExportResponse(null);
    setPdfReadyLoading(false);
    setPdfReadyError("");
    setPdfReadyResponse(null);
    setDownloadStatus(null);
    setDownloadError("");
  };

  const handleSelectReport = (reportType) => {
    setSelectedReportType(reportType);

    if (
      confirmedReportType &&
      confirmedReportType !== reportType
    ) {
      setConfirmedReportType(null);

      setDateMode("RELATIVE");
      setRelativeDays(30);
      setCustomStartDate("");
      setCustomEndDate("");
      setDateRangeError("");

      resetGeneratedReport();
    }
  };

  const handleConfirmReport = () => {
    if (!selectedReportType) {
      return;
    }

    const changingReport =
      confirmedReportType &&
      confirmedReportType !== selectedReportType;

    setConfirmedReportType(selectedReportType);

    if (changingReport) {
      setDateMode("RELATIVE");
      setRelativeDays(30);
      setCustomStartDate("");
      setCustomEndDate("");
      setDateRangeError("");
    }

    resetGeneratedReport();
  };

  const handleClearSelection = () => {
    setSelectedReportType(null);
    setConfirmedReportType(null);

    setDateMode("RELATIVE");
    setRelativeDays(30);
    setCustomStartDate("");
    setCustomEndDate("");
    setDateRangeError("");

    resetGeneratedReport();
  };

  const handleDateModeChange = (mode) => {
    setDateMode(mode);
    setDateRangeError("");

    resetGeneratedReport();

    if (mode === "RELATIVE") {
      setCustomStartDate("");
      setCustomEndDate("");
    }
  };

  const handleRelativeDaysChange = (days) => {
    setRelativeDays(days);
    setDateMode("RELATIVE");

    setDateRangeError("");
    setCustomStartDate("");
    setCustomEndDate("");

    resetGeneratedReport();
  };

  const handleCustomStartDateChange = (event) => {
    setCustomStartDate(event.target.value);
    setDateRangeError("");
    resetGeneratedReport();
  };

  const handleCustomEndDateChange = (event) => {
    setCustomEndDate(event.target.value);
    setDateRangeError("");
    resetGeneratedReport();
  };

  const validateCustomDateRange = () => {
    if (dateMode !== "CUSTOM") {
      setDateRangeError("");
      return true;
    }

    if (numericMaxHistoryDays === null) {
      setDateRangeError(
        "Your report history entitlement could not be verified. Please refresh and try again."
      );
      return false;
    }

    if (!customStartDate || !customEndDate) {
      setDateRangeError(
        "Choose both a start date and an end date."
      );
      return false;
    }

    const start = new Date(`${customStartDate}T00:00:00`);
    const end = new Date(`${customEndDate}T00:00:00`);

    if (
      Number.isNaN(start.getTime()) ||
      Number.isNaN(end.getTime())
    ) {
      setDateRangeError("Choose a valid reporting period.");
      return false;
    }

    if (start > end) {
      setDateRangeError(
        "The start date cannot be after the end date."
      );
      return false;
    }

    const DAY_MS = 24 * 60 * 60 * 1000;

    const selectedDays =
      Math.floor((end.getTime() - start.getTime()) / DAY_MS) + 1;

    if (selectedDays > numericMaxHistoryDays) {
      setDateRangeError(
        `Your current Business Pro access supports up to ${numericMaxHistoryDays} days of report history.`
      );
      return false;
    }

    setDateRangeError("");
    return true;
  };

  const selectedReportPeriod =
    dateMode === "CUSTOM"
      ? {
          mode: "CUSTOM",
          days: null,
          startDate: customStartDate || null,
          endDate: customEndDate || null,
        }
      : {
          mode: "RELATIVE",
          days: relativeDays,
          startDate: null,
          endDate: null,
        };

  const handleGenerateReport = async () => {
    if (!confirmedReportType) {
      setReportError(
        "Choose and confirm a report type before generating a report."
      );
      return;
    }

    if (!canGenerateReports) {
      setReportError(
        "Report generation is unavailable for your current business entitlement."
      );
      return;
    }

    if (
      selectedReportPeriod.mode === "CUSTOM" &&
      !validateCustomDateRange()
    ) {
      return;
    }

    try {
      setReportLoading(true);
      setReportError("");

      const request = {
        reportType: confirmedReportType,
        format: BUSINESS_REPORT_FORMATS.JSON,
      };

      if (selectedReportPeriod.mode === "CUSTOM") {
        request.startDate = selectedReportPeriod.startDate;
        request.endDate = selectedReportPeriod.endDate;
      } else {
        request.days = selectedReportPeriod.days;
      }

      const response = await generateMyBusinessReport(request);

      setGeneratedReport(response || null);
      setGeneratedReportType(confirmedReportType);
      setGeneratedReportPeriod({
        ...selectedReportPeriod,
      });
    } catch (err) {
      console.error("GENERATE BUSINESS REPORT ERROR:", err);

      setGeneratedReport(null);
      setGeneratedReportType(null);
      setGeneratedReportPeriod(null);

      setReportError(
        err?.response?.data?.message ||
          err?.message ||
          "We couldn't generate your business report. Please try again."
      );
    } finally {
      setReportLoading(false);
    }
  };

  /**
 * =======================================================
 * 9.11.20.12 — REQUEST JSON EXPORT
 * =======================================================
 *
 * IMPORTANT:
 *
 * We do NOT JSON.stringify(canonicalGeneratedReport) and
 * pretend that is a backend export.
 *
 * We request format=JSON from the protected report API.
 *
 * The export uses the exact report type and period that
 * produced the currently displayed canonical report.
 */

const handleGenerateJsonExport = async () => {
    if (!canExportReports) {
      setJsonExportError(
        "Report export is unavailable for your current business entitlement."
      );
      return;
    }

    if (
      !generatedReportType ||
      !generatedReportPeriod
    ) {
      setJsonExportError(
        "Generate a report before preparing its JSON export."
      );

      return;
    }

    if (
      generatedReportType !==
      confirmedReportType
    ) {
      setJsonExportError(
        "The generated report no longer matches the selected report type. Generate the report again before exporting."
      );

      return;
    }

    try {
      setJsonExportLoading(
        true
      );

      setJsonExportError("");

      setJsonExportResponse(
        null
      );

      const request = {
        reportType:
          generatedReportType,

        format:
          BUSINESS_REPORT_FORMATS.JSON,
      };

      /**
       * Reuse the period that actually generated the report.
       *
       * Do NOT use potentially edited date-control values.
       */
      if (
        generatedReportPeriod.mode ===
        "CUSTOM"
      ) {
        request.startDate =
          generatedReportPeriod.startDate;

        request.endDate =
          generatedReportPeriod.endDate;
      } else {
        request.days =
          generatedReportPeriod.days;
      }

      const response =
        await generateMyBusinessReport(
          request
        );

      /**
       * Validate only the API envelope required by the
       * frontend.
       *
       * We do not reconstruct export metadata.
       */
      if (
        response?.success !==
          true ||
        !response?.export ||
        response?.export
          ?.format !==
          BUSINESS_REPORT_FORMATS.JSON ||
        response?.data ===
          undefined
      ) {
        throw new Error(
          "The server returned an invalid JSON export response."
        );
      }

      setJsonExportResponse(
        response
      );
    } catch (err) {
      console.error(
        "GENERATE BUSINESS REPORT JSON EXPORT ERROR:",
        err
      );

      setJsonExportResponse(
        null
      );

      setJsonExportError(
        err?.response?.data
          ?.message ||
          err?.message ||
          "We couldn't prepare the JSON export. Please try again."
      );
    } finally {
      setJsonExportLoading(
        false
      );
    }
  };

  /**
 * =======================================================
 * 9.11.20.13 — REQUEST CSV MULTI-DATASET EXPORT
 * =======================================================
 *
 * The backend remains responsible for:
 *
 * - report generation
 * - Business Pro authorization
 * - CSV serialization
 * - dataset boundaries
 * - CSV injection protection
 * - export limits
 * - safe filename generation
 *
 * The frontend does not convert the canonical report
 * into CSV.
 */

const handleGenerateCsvExport = async () => {
    if (!canExportReports) {
      setCsvExportError(
        "Report export is unavailable for your current business entitlement."
      );
      return;
    }

    if (
      !generatedReportType ||
      !generatedReportPeriod
    ) {
      setCsvExportError(
        "Generate a report before preparing its CSV export."
      );

      return;
    }

    if (
      generatedReportType !==
      confirmedReportType
    ) {
      setCsvExportError(
        "The generated report no longer matches the selected report type. Generate the report again before exporting."
      );

      return;
    }

    try {
      setCsvExportLoading(true);
      setCsvExportError("");
      setCsvExportResponse(null);

      const request = {
        reportType:
          generatedReportType,

        format:
          BUSINESS_REPORT_FORMATS.CSV,
      };

      /**
       * Export the exact period that generated the
       * currently displayed report.
       */
      if (
        generatedReportPeriod.mode ===
        "CUSTOM"
      ) {
        request.startDate =
          generatedReportPeriod.startDate;

        request.endDate =
          generatedReportPeriod.endDate;
      } else {
        request.days =
          generatedReportPeriod.days;
      }

      const response =
        await generateMyBusinessReport(
          request
        );

      /**
       * Validate the known API envelope only.
       *
       * We intentionally do NOT assume the internal
       * shape of response.data here.
       *
       * The preview component below safely discovers
       * the datasets returned by the backend.
       */
      if (
        response?.success !== true ||
        !response?.export ||
        response?.export?.format !==
          BUSINESS_REPORT_FORMATS.CSV ||
        response?.data === undefined
      ) {
        throw new Error(
          "The server returned an invalid CSV export response."
        );
      }

      setCsvExportResponse(
        response
      );
    } catch (err) {
      console.error(
        "GENERATE BUSINESS REPORT CSV EXPORT ERROR:",
        err
      );

      setCsvExportResponse(null);

      setCsvExportError(
        err?.response?.data?.message ||
          err?.message ||
          "We couldn't prepare the CSV export. Please try again."
      );
    } finally {
      setCsvExportLoading(false);
    }
  };

  /**
 * =======================================================
 * 9.11.20.14 — REQUEST PDF_READY EXPORT
 * =======================================================
 *
 * PDF_READY is generated by the protected backend report
 * service.
 *
 * The frontend does NOT:
 *
 * - convert HTML into PDF
 * - use window.print()
 * - use jsPDF
 * - create a Blob
 * - calculate report metrics
 * - reconstruct report sections
 *
 * It requests the backend's structured PDF-ready payload.
 */

const handleGeneratePdfReady = async () => {
    if (!canExportReports) {
      setPdfReadyError(
        "Report export is unavailable for your current business entitlement."
      );
      return;
    }

    if (
      !generatedReportType ||
      !generatedReportPeriod
    ) {
      setPdfReadyError(
        "Generate a report before preparing its PDF-ready preview."
      );

      return;
    }

    if (
      generatedReportType !==
      confirmedReportType
    ) {
      setPdfReadyError(
        "The generated report no longer matches the selected report type. Generate the report again before preparing the PDF-ready preview."
      );

      return;
    }

    try {
      setPdfReadyLoading(true);
      setPdfReadyError("");
      setPdfReadyResponse(null);

      const request = {
        reportType:
          generatedReportType,

        format:
          BUSINESS_REPORT_FORMATS.PDF_READY,
      };

      /**
       * Preserve the exact period associated with the
       * currently displayed generated report.
       */
      if (
        generatedReportPeriod.mode ===
        "CUSTOM"
      ) {
        request.startDate =
          generatedReportPeriod.startDate;

        request.endDate =
          generatedReportPeriod.endDate;
      } else {
        request.days =
          generatedReportPeriod.days;
      }

      const response =
        await generateMyBusinessReport(
          request
        );

      /**
       * Validate the API envelope only.
       *
       * The internal PDF_READY payload remains owned by
       * the backend.
       */
      if (
        response?.success !== true ||
        !response?.export ||
        response?.export?.format !==
          BUSINESS_REPORT_FORMATS.PDF_READY ||
        response?.data === undefined
      ) {
        throw new Error(
          "The server returned an invalid PDF-ready response."
        );
      }

      setPdfReadyResponse(
        response
      );
    } catch (err) {
      console.error(
        "GENERATE BUSINESS REPORT PDF_READY ERROR:",
        err
      );

      setPdfReadyResponse(null);

      setPdfReadyError(
        err?.response?.data?.message ||
          err?.message ||
          "We couldn't prepare the PDF-ready preview. Please try again."
      );
    } finally {
      setPdfReadyLoading(false);
    }
  };

  /**
 * =======================================================
 * 9.11.20.15 — DOWNLOAD HANDLERS
 * =======================================================
 */

const handleDownloadJson = () => {
  if (!canExportReports) {
    setDownloadStatus(null);
    setDownloadError(
      "Report export is unavailable for your current business entitlement."
    );
    return;
  }

  if (
    jsonExportResponse?.success !== true ||
    jsonExportResponse?.export?.format !==
      BUSINESS_REPORT_FORMATS.JSON ||
    jsonExportResponse?.data === undefined
  ) {
    setDownloadStatus(null);
    setDownloadError(
      "Prepare a valid JSON export before downloading."
    );
    return;
  }

  try {
    setDownloadError("");
    setDownloadStatus(null);

    downloadJsonExport(jsonExportResponse);

    setDownloadStatus(
      "JSON export download started."
    );
  } catch (err) {
    console.error(
      "DOWNLOAD JSON EXPORT ERROR:",
      err
    );

    setDownloadStatus(null);

    setDownloadError(
      err?.message ||
        "The JSON export could not be downloaded."
    );
  }
};

const handleDownloadCsv = () => {
  if (!canExportReports) {
    setDownloadStatus(null);
    setDownloadError(
      "Report export is unavailable for your current business entitlement."
    );
    return;
  }

  if (
    csvExportResponse?.success !== true ||
    csvExportResponse?.export?.format !==
      BUSINESS_REPORT_FORMATS.CSV ||
    csvExportResponse?.data === undefined
  ) {
    setDownloadStatus(null);
    setDownloadError(
      "Prepare a valid CSV export before downloading."
    );
    return;
  }

  try {
    setDownloadError("");
    setDownloadStatus(null);

    const count =
      downloadCsvExport(csvExportResponse);

    setDownloadStatus(
      count === 1
        ? "CSV export download started."
        : `${count} CSV dataset downloads started.`
    );
  } catch (err) {
    console.error(
      "DOWNLOAD CSV EXPORT ERROR:",
      err
    );

    setDownloadStatus(null);

    setDownloadError(
      err?.message ||
        "The CSV export could not be downloaded."
    );
  }
};

const handleDownloadPdfReady =
  () => {
    try {
      if (
        pdfReadyResponse?.success !== true ||
        pdfReadyResponse?.export?.format !==
          BUSINESS_REPORT_FORMATS.PDF_READY ||
        pdfReadyResponse?.data === undefined
      ) {
        setDownloadStatus(null);
        setDownloadError(
          "Prepare valid PDF-ready data before downloading."
        );
        return;
      }
      if (!canExportReports) {
        setDownloadStatus(null);
        setDownloadError(
          "Report export is unavailable for your current business entitlement."
        );
        return;
      }
      setDownloadError("");
      setDownloadStatus(null);

      downloadPdfReadyExport(
        pdfReadyResponse
      );

      setDownloadStatus(
        "PDF-ready structured data download started."
      );
    } catch (err) {
      console.error(
        "DOWNLOAD PDF_READY EXPORT ERROR:",
        err
      );

      setDownloadStatus(null);

      setDownloadError(
        err?.message ||
          "The PDF-ready data could not be downloaded."
      );
    }
  };

  return (
    <ReportsPageShell>
      <ReportsHeader business={business} isBusinessPro />

      <section className="mt-7 overflow-hidden rounded-3xl border border-[#E8DFDB] bg-white shadow-sm">
        <div className="h-1 bg-linear-to-r from-[#5B1725] via-[#8A2638] to-[#D6B15E]" />

        <div className="flex flex-col gap-5 p-4 sm:gap-6 sm:p-8 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex min-w-0 max-w-3xl items-start gap-3 sm:gap-4">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[#F5E8EB] sm:h-14 sm:w-14 sm:rounded-2xl">
              <Crown size={25} className="text-[#5B1725]" />
            </div>

            <div>
              <div className="flex flex-wrap items-center gap-2">
                <p className="text-[10px] font-black uppercase tracking-[0.16em] text-[#9A5D37]">
                  Reports Centre
                </p>

                <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-1 text-[9px] font-black text-emerald-700">
                  <CheckCircle2 size={11} />
                  UNLOCKED
                </span>
              </div>

              <h2 className="mt-2 text-lg font-black leading-snug text-[#3D0F18] sm:text-2xl">
                Your Business Pro reporting is active
              </h2>

              <p className="mt-2 max-w-2xl text-xs leading-5 text-gray-500 sm:text-sm sm:leading-6">
                You can generate advanced business intelligence
                reports, analyse longer periods and prepare your data
                for export.
              </p>
            </div>
          </div>

         <div className="flex w-full min-w-0 items-center gap-3 rounded-2xl border border-emerald-100 bg-emerald-50 p-3 sm:p-4 lg:w-auto lg:min-w-[210px]">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white">
              <ShieldCheck size={19} className="text-emerald-700" />
            </div>

            <div>
              <p className="text-[9px] font-black uppercase tracking-wide text-emerald-600">
                Access
              </p>

              <p className="text-sm font-black text-emerald-800">
                Business Pro
              </p>
            </div>
          </div>
        </div>
      </section>

      <section className="mt-8">
        <SectionHeading
          eyebrow="Your Access"
          title="Reporting capabilities"
          description="These capabilities are provided by your current Business Pro entitlement."
        />

        <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatusCard
            icon={FileBarChart}
            label="Report generation"
            value={canGenerateReports ? "Enabled" : "Unavailable"}
            active={canGenerateReports}
          />

          <StatusCard
            icon={FileSpreadsheet}
            label="Report export"
            value={canExportReports ? "Enabled" : "Unavailable"}
            active={canExportReports}
          />

          <StatusCard
            icon={History}
            label="History"
            value={
              maxHistoryDays === "—"
                ? "—"
                : `${maxHistoryDays} days`
            }
            active={maxHistoryDays !== "—"}
          />

          <StatusCard
            icon={CalendarDays}
            label="Custom dates"
            value={customDateRange ? "Enabled" : "Unavailable"}
            active={customDateRange}
          />
        </div>
      </section>

      <section className="mt-8">
        <SectionHeading
          eyebrow="Export Options"
          title="Work with your reports"
          description="Business Reports support structured formats for viewing, analysis and future presentation workflows."
        />

        <div className="mt-5 grid gap-4 md:grid-cols-3">
          <UnlockedCapability
            icon={FileJson}
            title="JSON Reports"
            description="Structured report data suitable for applications, integrations and detailed inspection."
          />

          <UnlockedCapability
            icon={FileSpreadsheet}
            title="CSV Datasets"
            description="Spreadsheet-friendly datasets for further analysis in tools such as Excel."
          />

          <UnlockedCapability
            icon={FileBarChart}
            title="PDF Ready"
            description="Structured presentation data prepared for the future PDF rendering workflow."
          />
        </div>
      </section>

      <section className="mt-6 sm:mt-8">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <SectionHeading
            eyebrow="Report Library"
            title="Choose a business report"
            description="Explore the reports available with your Business Pro account. Select one to review what it covers."
          />

          <div className="w-full sm:max-w-md lg:w-[300px] lg:max-w-none">
            <label htmlFor="report-search" className="sr-only">
              Search reports
            </label>

            <div className="relative">
              <Search
                size={16}
                className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400"
              />

              <input
                id="report-search"
                type="search"
                value={searchTerm}
                onChange={(event) => setSearchTerm(event.target.value)}
                placeholder="Search reports..."
                className="w-full rounded-xl border border-[#DED3CE] bg-white py-3 pl-10 pr-4 text-xs font-semibold text-[#3D0F18] outline-none transition placeholder:text-gray-400 focus:border-[#8A2638] focus:ring-2 focus:ring-[#8A2638]/10"
              />
            </div>
          </div>
        </div>

        <div className="mt-5 flex flex-wrap items-center gap-2">
          <span className="rounded-full border border-[#E8DFDB] bg-white px-3 py-1.5 text-[10px] font-black text-[#5B1725]">
            {BUSINESS_REPORT_CATALOG.length} Reports
          </span>

          <span className="rounded-full border border-[#E8DFDB] bg-white px-3 py-1.5 text-[10px] font-bold text-gray-500">
            Business Pro
          </span>

          {maxHistoryDays !== "—" && (
            <span className="rounded-full border border-[#E8DFDB] bg-white px-3 py-1.5 text-[10px] font-bold text-gray-500">
              Up to {maxHistoryDays} days
            </span>
          )}

          {customDateRange && (
            <span className="rounded-full border border-[#E8DFDB] bg-white px-3 py-1.5 text-[10px] font-bold text-gray-500">
              Custom dates
            </span>
          )}
        </div>

        {visibleReports.length > 0 ? (
          <div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {visibleReports.map((report) => (
              <ReportCatalogCard
                key={report.type}
                report={report}
                selected={selectedReportType === report.type}
                confirmed={confirmedReportType === report.type}
                onSelect={() => handleSelectReport(report.type)}
              />
            ))}
          </div>
        ) : (
          <div className="mt-5 rounded-2xl border border-dashed border-[#DCCFC9] bg-white px-5 py-10 text-center">
            <div className="mx-auto flex h-11 w-11 items-center justify-center rounded-xl bg-[#F5E8EB]">
              <Search size={19} className="text-[#5B1725]" />
            </div>

            <h3 className="mt-4 text-sm font-black text-[#3D0F18]">
              No reports found
            </h3>

            <p className="mx-auto mt-1 max-w-md text-[11px] leading-5 text-gray-500">
              We couldn't find a report matching "{searchTerm}". Try a
              different search.
            </p>

            <button
              type="button"
              onClick={() => setSearchTerm("")}
              className="mt-4 text-xs font-black text-[#6B1D2C] transition hover:text-[#3D0F18]"
            >
              Clear search
            </button>
          </div>
        )}
      </section>

      {confirmedReport && (
        <section className="mt-6 overflow-hidden rounded-2xl border border-emerald-200 bg-emerald-50 shadow-sm">
          <div className="flex flex-col gap-4 p-4 sm:flex-row sm:items-center sm:justify-between sm:p-5">
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-white shadow-sm">
                <CheckCircle2 size={19} className="text-emerald-700" />
              </div>

              <div>
                <p className="text-[9px] font-black uppercase tracking-[0.12em] text-emerald-700">
                  Active Report Type
                </p>

                <p className="mt-0.5 text-sm font-black text-emerald-950">
                  {confirmedReport.title}
                </p>

                <p className="mt-1 text-[10px] leading-4 text-emerald-800">
                  This report is selected and ready for configuration.
                </p>
              </div>
            </div>

            <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row sm:flex-wrap sm:items-center">
              <span className="inline-flex min-h-9 w-full items-center justify-center gap-1.5 rounded-xl bg-white px-3 py-1.5 text-[9px] font-black uppercase tracking-wide text-emerald-700 sm:w-auto sm:rounded-full">
                <CheckCircle2 size={11} />
                Selected
              </span>

              <button
                type="button"
                onClick={handleClearSelection}
                className="min-h-10 w-full rounded-xl border border-emerald-200 bg-white px-4 py-2 text-[9px] font-black text-emerald-800 transition hover:border-emerald-300 hover:bg-emerald-100 sm:w-auto"
              >
                Change report
              </button>
            </div>
          </div>
        </section>
      )}

      {selectedReport && (
        <SelectedReportPanel
          report={selectedReport}
          confirmed={confirmedReportType === selectedReport.type}
          onConfirm={handleConfirmReport}
          onClose={handleClearSelection}
        />
      )}

      {confirmedReport && (
        <ReportDateRangeControls
          report={confirmedReport}
          dateMode={dateMode}
          relativeDays={relativeDays}
          presets={REPORT_PERIOD_PRESETS}
          customStartDate={customStartDate}
          customEndDate={customEndDate}
          customDateRange={customDateRange}
          maxHistoryDays={numericMaxHistoryDays ?? "Unavailable"}
          todayDate={todayDate}
          error={dateRangeError}
          selectedPeriod={selectedReportPeriod}
          reportLoading={reportLoading}
          reportError={reportError}
          reportGeneration={canGenerateReports}
          generatedReport={generatedReport}
          generatedReportType={generatedReportType}
          generatedReportPeriod={generatedReportPeriod}
          onModeChange={handleDateModeChange}
          onRelativeDaysChange={handleRelativeDaysChange}
          onStartDateChange={handleCustomStartDateChange}
          onEndDateChange={handleCustomEndDateChange}
          onValidateCustomRange={validateCustomDateRange}
          onGenerateReport={handleGenerateReport}
        />
      )}

      {/* ==================================================
    9.11.20.16 — REPORT GENERATION STATES
================================================== */}

{showGeneratedReportLoading && (
  <GeneratedReportLoadingState
    reportTitle={
      confirmedReport?.title
    }
  />
)}

{showGeneratedReportError && (
  <GeneratedReportErrorState
    message={reportError}
    onRetry={
      handleGenerateReport
    }
  />
)}

{showGeneratedReportEmpty && (
  <GeneratedReportEmptyState
    reportTitle={
      confirmedReport?.title
    }
    onRetry={
      handleGenerateReport
    }
  />
)}

      {/* ==================================================
          9.11.20.7 — EXECUTIVE SUMMARY UI
      ================================================== */}

     {!reportLoading &&
      !reportError &&
      hasCanonicalGeneratedReport && (
      <>
        {generatedExecutiveSummary ? (
          <>
            <ReportExecutiveSummary
              report={
                canonicalGeneratedReport
              }
              summary={
                generatedExecutiveSummary
              }
            />

            <ReportKpiPerformanceCards
              summary={
                generatedExecutiveSummary
              }
            />
          </>
        ) : (
          <section className="mt-6">
            <ReportSectionEmptyState
              title="No executive summary available"
              description="This generated report does not contain an executive summary for the selected reporting period."
              icon={BarChart3}
            />
          </section>
        )}
      </>
  )}

            {/* ==================================================
                9.11.20.9 — REPORT TABLES
            ================================================== */}

            {!reportLoading &&
              !reportError &&
              hasCanonicalGeneratedReport && (
                <ReportTables
                  sections={
                    canonicalGeneratedReport.sections
                  }
                />
              )}

              {/* ==================================================
          9.11.20.10 — TRENDS / CHART VISUALIZATION
      ================================================== */}

   

      {!reportLoading &&
        !reportError &&
        hasCanonicalGeneratedReport && (
          <ReportTrendVisualization
            sections={
              canonicalGeneratedReport.sections
            }
          />
        )}

              {/* ==================================================
          9.11.20.11 — DATA COVERAGE & METHODOLOGY
      ================================================== */}

      {!reportLoading &&
        !reportError &&
        hasCanonicalGeneratedReport && (
          <ReportCoverageAndMethodology
            dataCoverage={
              canonicalGeneratedReport.dataCoverage
            }
            methodology={
              canonicalGeneratedReport.methodology
            }
          />
        )}

              {/* ==================================================
          9.11.20.12 — JSON EXPORT EXPERIENCE
      ================================================== */}

      {!reportLoading &&
      !reportError &&
      hasCanonicalGeneratedReport && (
        <ReportJsonExportExperience
          reportExport={canExportReports}
          loading={jsonExportLoading}
          error={jsonExportError}
          response={jsonExportResponse}
          onGenerate={handleGenerateJsonExport}
          onDownload={handleDownloadJson}
        />
        )}

        {/* ==================================================
    9.11.20.13 — CSV MULTI-DATASET EXPORT
================================================== */}

{!reportLoading &&
  !reportError &&
  hasCanonicalGeneratedReport && (
    <ReportCsvExportExperience
      reportExport={canExportReports}
      loading={csvExportLoading}
      error={csvExportError}
      response={csvExportResponse}
      onGenerate={handleGenerateCsvExport}
      onDownload={handleDownloadCsv}
    />
  )}

  {/* ==================================================
    9.11.20.14 — PDF_READY PREVIEW
================================================== */}

{!reportLoading &&
  !reportError &&
  hasCanonicalGeneratedReport && (
    <ReportPdfReadyExperience
    reportExport={canExportReports}
    loading={pdfReadyLoading}
    error={pdfReadyError}
    response={pdfReadyResponse}
    onGenerate={handleGeneratePdfReady}
    onDownload={handleDownloadPdfReady}
    />
  )}

    {/* ==================================================
    9.11.20.15 — DOWNLOAD FEEDBACK
    ================================================== */}

    {downloadStatus && (
    <div
        role="status"
        className="mt-4 flex items-start gap-3 rounded-xl border border-emerald-200 bg-emerald-50 p-4"
    >
        <CheckCircle2
        size={16}
        className="mt-0.5 shrink-0 text-emerald-700"
        />

        <p className="text-[10px] font-semibold leading-5 text-emerald-800">
        {downloadStatus}
        </p>
    </div>
    )}

    {downloadError && (
    <div
        role="alert"
        className="mt-4 rounded-xl border border-red-200 bg-red-50 p-4"
    >
        <p className="text-[10px] font-black text-red-800">
        Download failed
        </p>

        <p className="mt-1 text-[10px] leading-5 text-red-700">
        {downloadError}
        </p>
    </div>
    )}

      {reportVersion && (
        <div className="mt-6 flex justify-center sm:justify-end">
          <p className="text-[10px] font-semibold text-gray-400">
            Reporting version {reportVersion}
          </p>
        </div>
      )}
    </ReportsPageShell>
  );
};

const SectionHeading = ({ eyebrow, title, description }) => (
  <div className="max-w-3xl">
    <p className="text-[9px] font-black uppercase tracking-[0.15em] text-[#9A5D37]">
      {eyebrow}
    </p>

    <h2 className="mt-1 text-lg font-black text-[#3D0F18] sm:text-xl">
      {title}
    </h2>

    {description && (
      <p className="mt-1 text-xs leading-5 text-gray-500">
        {description}
      </p>
    )}
  </div>
);

const FeatureRow = ({ icon: Icon, title, description }) => (
  <div className="flex items-start gap-3 rounded-xl border border-[#ECE4E0] bg-white p-3.5">
    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[#F5E8EB]">
      <Icon size={16} className="text-[#5B1725]" />
    </div>

    <div>
      <p className="text-xs font-black text-[#3D0F18]">{title}</p>
      <p className="mt-1 text-[10px] leading-4 text-gray-500">
        {description}
      </p>
    </div>
  </div>
);

const StatusCard = ({ icon: Icon, label, value, active = false }) => (
  <div className="rounded-2xl border border-[#E8DFDB] bg-white p-4 shadow-sm">
    <div className="flex items-center justify-between gap-3">
      <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#F5E8EB]">
        <Icon size={18} className="text-[#5B1725]" />
      </div>

      {active && (
        <CheckCircle2 size={17} className="text-emerald-600" />
      )}
    </div>

    <p className="mt-4 text-[9px] font-black uppercase tracking-[0.12em] text-gray-400">
      {label}
    </p>

    <p className="mt-1 text-sm font-black text-[#3D0F18]">{value}</p>
  </div>
);

const ReportCatalogCard = ({
  report,
  selected,
  confirmed,
  onSelect,
}) => {
  const Icon = report.icon;
  const accent =
    REPORT_ACCENTS[report.accent] || REPORT_ACCENTS.maroon;

  return (
    <button
      type="button"
      onClick={onSelect}
      aria-pressed={selected}
      className={`group flex h-full w-full flex-col overflow-hidden rounded-2xl border bg-white text-left shadow-sm transition duration-200 hover:-translate-y-0.5 hover:shadow-md ${
        confirmed
          ? "border-emerald-400 ring-2 ring-emerald-500/10"
          : selected
            ? "border-[#8A2638] ring-2 ring-[#8A2638]/10"
            : "border-[#E8DFDB] hover:border-[#D8C7C0]"
      }`}
    >
      {report.featured && (
        <div className="flex items-center justify-between bg-[#5B1725] px-4 py-2 text-white">
          <span className="text-[8px] font-black uppercase tracking-[0.14em]">
            Complete View
          </span>
          <TrendingUp size={13} />
        </div>
      )}

      <div className="flex flex-1 flex-col p-5">
        <div className="flex items-start justify-between gap-3">
          <div
            className={`flex h-11 w-11 items-center justify-center rounded-xl ${accent.icon}`}
          >
            <Icon size={20} />
          </div>

          {confirmed ? (
            <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-emerald-100">
              <CheckCircle2 size={15} className="text-emerald-700" />
            </div>
          ) : selected ? (
            <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[#F5E8EB]">
              <ListChecks size={14} className="text-[#5B1725]" />
            </div>
          ) : null}
        </div>

        <div className="mt-4">
          <span
            className={`inline-flex rounded-full px-2.5 py-1 text-[8px] font-black uppercase tracking-wide ${accent.badge}`}
          >
            {report.category}
          </span>

          <h3 className="mt-3 text-sm font-black text-[#3D0F18]">
            {report.title}
          </h3>

          <p className="mt-2 text-[11px] leading-5 text-gray-500">
            {report.description}
          </p>
        </div>

        <div className="mt-5 border-t border-[#F0EAE7] pt-4">
          <div className="space-y-2">
            {report.highlights.map((highlight) => (
              <div key={highlight} className="flex items-center gap-2">
                <CheckCircle2
                  size={13}
                  className="shrink-0 text-emerald-600"
                />

                <span className="text-[10px] font-semibold text-gray-600">
                  {highlight}
                </span>
              </div>
            ))}
          </div>
        </div>

        <div className="mt-auto pt-5">
          <div className="flex items-center justify-between">
            <span
              className={`text-[10px] font-black ${
                confirmed
                  ? "text-emerald-700"
                  : "text-[#6B1D2C]"
              }`}
            >
              {confirmed
                ? "Report selected"
                : selected
                  ? "Reviewing report"
                  : "View report details"}
            </span>

            {confirmed ? (
              <CheckCircle2 size={15} className="text-emerald-700" />
            ) : (
              <ArrowRight
                size={15}
                className={`text-[#6B1D2C] transition-transform group-hover:translate-x-1 ${
                  selected ? "translate-x-1" : ""
                }`}
              />
            )}
          </div>
        </div>
      </div>
    </button>
  );
};

const SelectedReportPanel = ({
  report,
  confirmed,
  onConfirm,
  onClose,
}) => {
  const Icon = report.icon;
  const accent =
    REPORT_ACCENTS[report.accent] || REPORT_ACCENTS.maroon;

  return (
    <section
      id="selected-report"
      className="mt-6 overflow-hidden rounded-2xl border border-[#D8C7C0] bg-white shadow-sm sm:rounded-3xl"
    >
      <div className="h-1 bg-linear-to-r from-[#5B1725] via-[#8A2638] to-[#D6B15E]" />

      <div lassName="p-4 sm:p-6">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
          <div className="flex max-w-3xl items-start gap-4">
            <div
              className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-xl ${accent.icon}`}
            >
              <Icon size={21} />
            </div>

            <div>
              <div className="flex flex-wrap items-center gap-2">
                <span
                  className={`rounded-full px-2.5 py-1 text-[8px] font-black uppercase tracking-wide ${accent.badge}`}
                >
                  {report.category}
                </span>

                {confirmed ? (
                  <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-1 text-[8px] font-black uppercase tracking-wide text-emerald-700">
                    <CheckCircle2 size={10} />
                    Selected
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2.5 py-1 text-[8px] font-black uppercase tracking-wide text-amber-700">
                    <ListChecks size={10} />
                    Review Selection
                  </span>
                )}
              </div>

              <h2 className="mt-3 text-lg font-black text-[#3D0F18] sm:text-xl">
                {report.title}
              </h2>

              <p className="mt-2 max-w-2xl text-xs leading-5 text-gray-500">
                {report.description}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="w-fit rounded-xl border border-[#E3D6D1] bg-white px-4 py-2 text-[10px] font-black text-[#5B1725] transition hover:bg-[#F8F5F3]"
          >
            Clear selection
          </button>
        </div>

        <div className="mt-6 border-t border-[#EEE6E2] pt-5">
          <p className="text-[9px] font-black uppercase tracking-[0.14em] text-[#9A5D37]">
            Report includes
          </p>

          <div className="mt-3 grid gap-3 sm:grid-cols-3">
            {report.highlights.map((highlight) => (
              <div
                key={highlight}
                className="flex items-center gap-3 rounded-xl bg-[#FAF8F7] p-3"
              >
                <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-white">
                  <CheckCircle2
                    size={14}
                    className="text-emerald-600"
                  />
                </div>

                <p className="text-[10px] font-bold leading-4 text-gray-600">
                  {highlight}
                </p>
              </div>
            ))}
          </div>
        </div>

        {!confirmed ? (
          <div className="mt-6 rounded-2xl border border-[#E8DFDB] bg-[#FAF8F7] p-4 sm:p-5">
           <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row sm:items-center">
              <div className="flex items-start gap-3">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-white">
                  <ListChecks size={17} className="text-[#5B1725]" />
                </div>

                <div>
                  <p className="text-xs font-black text-[#3D0F18]">
                    Use this report type?
                  </p>

                  <p className="mt-1 max-w-xl text-[10px] leading-5 text-gray-500">
                    Confirm{" "}
                    <strong className="text-[#3D0F18]">
                      {report.title}
                    </strong>{" "}
                    as the report you want to configure. This does not
                    generate the report yet.
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={onConfirm}
                className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-xl bg-[#5B1725] px-5 py-2.5 text-xs font-black text-white transition hover:bg-[#46111C] disabled:cursor-not-allowed disabled:opacity-50 sm:w-auto"
              >
                <CheckCircle2 size={14} />
                Select Report
              </button>
            </div>
          </div>
        ) : (
          <div className="mt-6 overflow-hidden rounded-2xl border border-emerald-200 bg-emerald-50">
            <div className="flex flex-col gap-4 p-4 sm:flex-row sm:items-center sm:justify-between sm:p-5">
              <div className="flex items-start gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white">
                  <CheckCircle2 size={19} className="text-emerald-700" />
                </div>

                <div>
                  <p className="text-xs font-black text-emerald-900">
                    Report type selected
                  </p>

                  <p className="mt-1 text-[10px] leading-5 text-emerald-800">
                    {report.title} is now your active report selection.
                  </p>
                </div>
              </div>

              <span className="inline-flex w-fit items-center rounded-full bg-white px-3 py-1.5 text-[9px] font-black uppercase tracking-wide text-emerald-700">
                Ready to configure
              </span>
            </div>
          </div>
        )}

        {confirmed && (
          <div className="mt-4 flex items-start gap-3 rounded-xl border border-[#E8DFDB] bg-white p-4">
            <CalendarDays
              size={17}
              className="mt-0.5 shrink-0 text-[#5B1725]"
            />

            <div>
              <p className="text-[10px] font-black text-[#3D0F18]">
                Next: reporting period
              </p>

              <p className="mt-1 text-[10px] leading-5 text-gray-500">
                Your report type is ready. Choose the reporting period
                below, then generate the report.
              </p>
            </div>
          </div>
        )}
      </div>
    </section>
  );
};

/**
 * =========================================================
 * DATE RANGE + GENERATION
 * =========================================================
 */

const ReportDateRangeControls = ({
  report,
  dateMode,
  relativeDays,
  presets,
  customStartDate,
  customEndDate,
  customDateRange,
  maxHistoryDays,
  todayDate,
  error,
  selectedPeriod,
  reportLoading,
  reportError,
  reportGeneration,
  generatedReport,
  generatedReportType,
  generatedReportPeriod,
  onModeChange,
  onRelativeDaysChange,
  onStartDateChange,
  onEndDateChange,
  onValidateCustomRange,
  onGenerateReport,
}) => {
  const isRelative = dateMode === "RELATIVE";
  const isCustom = dateMode === "CUSTOM";

  const customComplete = Boolean(
    customStartDate && customEndDate
  );

  const periodReady =
    isRelative || (isCustom && customComplete && !error);

  const canGenerate =
    reportGeneration && periodReady && !reportLoading;

  const generatedSuccessfully = Boolean(
    generatedReport && generatedReportType === report.type
  );

  return (
    <section className="mt-6 overflow-hidden rounded-2xl border border-[#D8C7C0] bg-white shadow-sm sm:rounded-3xl">
      <div className="border-b border-[#EEE6E2] bg-[#FAF8F7] p-4 sm:p-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex items-start gap-3">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[#F5E8EB]">
              <CalendarDays size={20} className="text-[#5B1725]" />
            </div>

            <div>
              <p className="text-[9px] font-black uppercase tracking-[0.14em] text-[#9A5D37]">
                Reporting Period
              </p>

              <h2 className="mt-1 text-lg font-black text-[#3D0F18]">
                Choose your date range
              </h2>

              <p className="mt-1 max-w-2xl text-[11px] leading-5 text-gray-500">
                Choose the period that should be used for your{" "}
                <strong className="text-[#3D0F18]">
                  {report.title}
                </strong>{" "}
                report.
              </p>
            </div>
          </div>

          <span className="inline-flex w-fit items-center gap-1.5 rounded-full bg-white px-3 py-1.5 text-[9px] font-black text-[#5B1725] shadow-sm">
            <History size={11} />
            Up to {maxHistoryDays} days
          </span>
        </div>
      </div>

      <div className="p-4 sm:p-6">
        <div>
          <p className="text-[9px] font-black uppercase tracking-[0.12em] text-gray-400">
            Range Type
          </p>

          <div className="grid w-full grid-cols-1 gap-2 sm:grid-cols-2">
            <button
              type="button"
              onClick={() => onModeChange("RELATIVE")}
              className={`rounded-2xl min-h-11 w-full border p-4 text-left transition ${
                isRelative
                  ? "border-[#8A2638] bg-[#FBF5F6] ring-2 ring-[#8A2638]/10"
                  : "border-[#E8DFDB] bg-white hover:border-[#D8C7C0]"
              }`}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-white">
                  <History size={17} className="text-[#5B1725]" />
                </div>

                {isRelative && (
                  <CheckCircle2
                    size={17}
                    className="text-emerald-600"
                  />
                )}
              </div>

              <p className="mt-3 text-xs font-black text-[#3D0F18]">
                Recent period
              </p>

              <p className="mt-1 text-[10px] leading-5 text-gray-500">
                Analyse a fixed number of recent days.
              </p>
            </button>

            <button
              type="button"
              disabled={!customDateRange}
              onClick={() => {
                if (customDateRange) {
                  onModeChange("CUSTOM");
                }
              }}
              className={`rounded-2xl min-h-11 w-ful border p-4 text-left transition ${
                !customDateRange
                  ? "cursor-not-allowed border-[#ECE7E4] bg-gray-50 opacity-60"
                  : isCustom
                    ? "border-[#8A2638] bg-[#FBF5F6] ring-2 ring-[#8A2638]/10"
                    : "border-[#E8DFDB] bg-white hover:border-[#D8C7C0]"
              }`}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-white">
                  <CalendarDays size={17} className="text-[#5B1725]" />
                </div>

                {isCustom && (
                  <CheckCircle2
                    size={17}
                    className="text-emerald-600"
                  />
                )}
              </div>

              <p className="mt-3 text-xs font-black text-[#3D0F18]">
                Custom dates
              </p>

              <p className="mt-1 text-[10px] leading-5 text-gray-500">
                {customDateRange
                  ? "Choose an exact start and end date."
                  : "Custom date ranges are unavailable for this entitlement."}
              </p>
            </button>
          </div>
        </div>

        {isRelative && (
          <div className="mt-6 border-t border-[#EEE6E2] pt-5">
            <p className="text-[9px] font-black uppercase tracking-[0.12em] text-[#9A5D37]">
              Recent History
            </p>

            <h3 className="mt-1 text-sm font-black text-[#3D0F18]">
              How far back should we analyse?
            </h3>

            <p className="mt-1 text-[10px] leading-5 text-gray-500">
              Select one of the available reporting periods.
            </p>

            <div className="mt-4 grid grid-cols-2 gap-2 sm:flex sm:flex-wrap">
              {presets.map((preset) => {
                const active = relativeDays === preset.days;

                return (
                  <button
                    key={preset.days}
                    type="button"
                    onClick={() =>
                      onRelativeDaysChange(preset.days)
                    }
                    className={`min-h-10 w-full rounded-xl border px-4 py-2.5 text-[10px] font-black transition sm:w-auto ${
                      active
                        ? "border-[#5B1725] bg-[#5B1725] text-white shadow-sm"
                        : "border-[#DED3CE] bg-white text-[#5B1725] hover:border-[#8A2638] hover:bg-[#FBF5F6]"
                    }`}
                  >
                    {preset.label}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {isCustom && customDateRange && (
          <div className="mt-6 border-t border-[#EEE6E2] pt-5">
            <p className="text-[9px] font-black uppercase tracking-[0.12em] text-[#9A5D37]">
              Custom Period
            </p>

            <h3 className="mt-1 text-sm font-black text-[#3D0F18]">
              Choose exact dates
            </h3>

            <p className="mt-1 text-[10px] leading-5 text-gray-500">
              Both dates are required. The selected period cannot
              exceed {maxHistoryDays} days.
            </p>

            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              <div>
                <label
                  htmlFor="report-start-date"
                  className="text-[10px] font-black text-[#3D0F18]"
                >
                  Start date
                </label>

                <input
                  id="report-start-date"
                  type="date"
                  value={customStartDate}
                  max={customEndDate || todayDate}
                  onChange={onStartDateChange}
                  className="mt-2 min-h-11 w-full rounded-xl border border-[#DED3CE] bg-white px-3 py-3 text-xs font-semibold text-[#3D0F18] outline-none transition focus:border-[#8A2638] focus:ring-2 focus:ring-[#8A2638]/10"
                />
              </div>

              <div>
                <label
                  htmlFor="report-end-date"
                  className="text-[10px] font-black text-[#3D0F18]"
                >
                  End date
                </label>

                <input
                  id="report-end-date"
                  type="date"
                  value={customEndDate}
                  min={customStartDate || undefined}
                  max={todayDate}
                  onChange={onEndDateChange}
                  onBlur={onValidateCustomRange}
                  className="mt-2 min-h-11 w-full rounded-xl border border-[#DED3CE] bg-white px-3 py-3 text-xs font-semibold text-[#3D0F18] outline-none transition focus:border-[#8A2638] focus:ring-2 focus:ring-[#8A2638]/10"
                />
              </div>
            </div>

            {error && (
              <div
                role="alert"
                className="mt-4 rounded-xl border border-red-200 bg-red-50 p-3"
              >
                <p className="text-[10px] font-bold leading-5 text-red-700">
                  {error}
                </p>
              </div>
            )}

            {customComplete && !error && (
              <button
                type="button"
                onClick={onValidateCustomRange}
                className="mt-4 inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-xl border border-[#DED3CE] bg-white px-4 py-2.5 text-[10px] font-black text-[#5B1725] transition hover:border-[#8A2638] hover:bg-[#FBF5F6] sm:w-auto"
              >
                <CheckCircle2 size={13} />
                Validate dates
              </button>
            )}
          </div>
        )}

        <div className="mt-6 rounded-2xl border border-emerald-200 bg-emerald-50 p-4">
          <div className="flex items-start gap-3">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-white">
              <CheckCircle2 size={17} className="text-emerald-700" />
            </div>

            <div>
              <p className="text-[10px] font-black text-emerald-900">
                Reporting period
              </p>

              {selectedPeriod.mode === "RELATIVE" ? (
                <p className="mt-1 text-[10px] leading-5 text-emerald-800">
                  The report will use the most recent{" "}
                  <strong>{selectedPeriod.days} days</strong>.
                </p>
              ) : customComplete && !error ? (
                <p className="mt-1 text-[10px] leading-5 text-emerald-800">
                  The report will cover{" "}
                  <strong>{selectedPeriod.startDate}</strong> through{" "}
                  <strong>{selectedPeriod.endDate}</strong>.
                </p>
              ) : (
                <p className="mt-1 text-[10px] leading-5 text-emerald-800">
                  Choose both custom dates to complete your reporting
                  period.
                </p>
              )}
            </div>
          </div>
        </div>

        <div className="mt-6 overflow-hidden rounded-2xl border border-[#D8C7C0] bg-[#FAF8F7]">
          <div className="p-4 sm:p-5">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-start gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white shadow-sm">
                  {reportLoading ? (
                    <RefreshCw
                      size={18}
                      className="animate-spin text-[#5B1725]"
                    />
                  ) : generatedSuccessfully ? (
                    <CheckCircle2
                      size={18}
                      className="text-emerald-700"
                    />
                  ) : (
                    <FileBarChart
                      size={18}
                      className="text-[#5B1725]"
                    />
                  )}
                </div>

                <div className="min-w-0">
                  <p className="text-xs font-black text-[#3D0F18]">
                    {reportLoading
                      ? "Generating report..."
                      : generatedSuccessfully
                        ? "Report generated"
                        : "Generate business report"}
                  </p>

                  <p className="mt-1 max-w-xl text-[10px] leading-5 text-gray-500">
                    {reportLoading
                      ? `We're preparing your ${report.title} report using the selected reporting period.`
                      : generatedSuccessfully
                        ? "Your report data has been returned successfully and is ready for the reporting views."
                        : "Generate the report using your confirmed report type and reporting period."}
                  </p>
                </div>
              </div>

              <button
                type="button"
                disabled={!canGenerate}
                onClick={onGenerateReport}
                aria-busy={reportLoading}
                className={`inline-flex min-h-12 w-full shrink-0 items-center justify-center gap-2 rounded-xl px-5 py-3 text-[10px] font-black transition sm:w-auto ${
                  canGenerate
                    ? "bg-[#5B1725] text-white shadow-sm hover:bg-[#46111C]"
                    : "cursor-not-allowed bg-gray-200 text-gray-400"
                }`}
               
              >
                {reportLoading ? (
                  <>
                    <RefreshCw size={14} className="animate-spin" />
                    Generating...
                  </>
                ) : generatedSuccessfully ? (
                  <>
                    <RefreshCw size={14} />
                    Regenerate
                  </>
                ) : (
                  <>
                    <FileBarChart size={14} />
                    Generate Report
                  </>
                )}
              </button>
            </div>
          </div>


          {generatedSuccessfully &&
            !reportLoading &&
            !reportError && (
              <div className="border-t border-emerald-200 bg-emerald-50 px-4 py-4 sm:px-5">
                <div className="flex items-start gap-3">
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-white">
                    <CheckCircle2
                      size={15}
                      className="text-emerald-700"
                    />
                  </div>

                  <div className="min-w-0">
                    <p className="text-[10px] font-black text-emerald-900">
                      Report data ready
                    </p>

                    <p className="mt-1 text-[10px] leading-5 text-emerald-800">
                      {report.title} was generated successfully. The
                      canonical report response is now ready for the
                      report presentation steps.
                    </p>

                    {generatedReportPeriod && (
                      <p className="mt-2 wrap-break- text-[9px] font-bold text-emerald-700">
                        {generatedReportPeriod.mode === "RELATIVE"
                          ? `Period: last ${generatedReportPeriod.days} days`
                          : `Period: ${generatedReportPeriod.startDate} to ${generatedReportPeriod.endDate}`}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            )}
        </div>
      </div>
    </section>
  );
};
/**
 * =========================================================
 * 9.11.20.7 — EXECUTIVE SUMMARY HELPERS
 * =========================================================
 */

const EXECUTIVE_SUMMARY_GROUPS = [
  {
    key: "overview",
    title: "Business Overview",
    description:
      "A high-level view of business activity during the selected reporting period.",
    icon: BarChart3,
  },
  {
    key: "conversion",
    title: "Conversion",
    description:
      "A summary of observed marketplace progression and conversion activity.",
    icon: Repeat2,
  },
  {
    key: "demand",
    title: "Demand",
    description:
      "A summary of observed marketplace demand and customer-interest signals.",
    icon: Users,
  },
  {
    key: "promotions",
    title: "Promotions",
    description:
      "Observed promotion-related activity for the selected reporting period.",
    icon: Megaphone,
  },
];

const formatSummaryLabel = (value) => {
  if (!value) {
    return "";
  }

  return String(value)
    .replace(/([a-z0-9])([A-Z])/g, "$1 $2")
    .replace(/_/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/\b\w/g, (character) =>
      character.toUpperCase()
    );
};

const formatSummaryPrimitive = (value) => {
  if (value === null || value === undefined) {
    return "Not available";
  }

  if (typeof value === "boolean") {
    return value ? "Yes" : "No";
  }

  if (typeof value === "number") {
    return new Intl.NumberFormat("en-KE", {
      maximumFractionDigits: 2,
    }).format(value);
  }

  if (typeof value === "string") {
    const normalized = value.trim();

    if (!normalized) {
      return "—";
    }

    return normalized;
  }

  return String(value);
};

const hasSummaryContent = (value) => {
  if (value === null || value === undefined) {
    return false;
  }

  if (Array.isArray(value)) {
    return value.length > 0;
  }

  if (typeof value === "object") {
    return Object.keys(value).length > 0;
  }

  return true;
};

const formatReportDate = (value) => {
  if (!value) {
    return "—";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return String(value);
  }

  return new Intl.DateTimeFormat("en-KE", {
    year: "numeric",
    month: "short",
    day: "numeric",
  }).format(date);
};

const formatReportDateTime = (value) => {
  if (!value) {
    return "—";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return String(value);
  }

  return new Intl.DateTimeFormat("en-KE", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
};

/**
 * Recursively presents backend-owned summary values.
 *
 * IMPORTANT:
 *
 * This does not calculate KPIs.
 * It does not rename backend values.
 * It does not infer missing analytics.
 *
  * Dedicated KPI cards are rendered separately by 9.11.20.
 */
const ExecutiveSummaryValue = ({
  value,
  depth = 0,
}) => {
  if (
    value === null ||
    value === undefined
  ) {
    return (
      <span className="text-[10px] font-semibold text-gray-400">
        Not available
      </span>
    );
  }

  if (
    typeof value !== "object"
  ) {
    return (
      <span className="wrap-break- text-[11px] font-black text-[#3D0F18]">
        {formatSummaryPrimitive(value)}
      </span>
    );
  }

  if (Array.isArray(value)) {
    if (value.length === 0) {
      return (
        <span className="text-[10px] font-semibold text-gray-400">
          No data available
        </span>
      );
    }

    return (
      <div className="space-y-2">
        {value.map((item, index) => (
          <div
            key={index}
            className="rounded-lg border border-[#EEE6E2] bg-white p-2.5"
          >
            {typeof item === "object" &&
            item !== null ? (
              <ExecutiveSummaryValue
                value={item}
                depth={depth + 1}
              />
            ) : (
              <span className="text-[10px] font-bold text-gray-700">
                {formatSummaryPrimitive(item)}
              </span>
            )}
          </div>
        ))}
      </div>
    );
  }

  const entries =
    Object.entries(value);

  if (entries.length === 0) {
    return (
      <span className="text-[10px] font-semibold text-gray-400">
        No data available
      </span>
    );
  }

  return (
    <div
      className={
        depth === 0
          ? "grid gap-3 sm:grid-cols-2"
          : "space-y-2"
      }
    >
      {entries.map(
        ([key, nestedValue]) => {
          const nestedObject =
            nestedValue !== null &&
            typeof nestedValue ===
              "object";

          return (
            <div
              key={key}
              className={`rounded-xl border border-[#EEE6E2] bg-[#FAF8F7] ${
                nestedObject
                  ? "p-3"
                  : "flex items-center justify-between gap-4 p-3"
              }`}
            >
              <p className="text-[9px] font-black uppercase tracking-[0.08em] text-gray-400">
                {formatSummaryLabel(
                  key
                )}
              </p>

              {nestedObject ? (
                <div className="mt-2">
                  <ExecutiveSummaryValue
                    value={
                      nestedValue
                    }
                    depth={
                      depth + 1
                    }
                  />
                </div>
              ) : (
                <ExecutiveSummaryValue
                  value={
                    nestedValue
                  }
                  depth={
                    depth + 1
                  }
                />
              )}
            </div>
          );
        }
      )}
    </div>
  );
};

/**
 * =========================================================
 * 9.11.20.7 — EXECUTIVE SUMMARY
 * =========================================================
 */

const ReportExecutiveSummary = ({
  report,
  summary,
}) => {
  const availableGroups =
    EXECUTIVE_SUMMARY_GROUPS.filter(
      ({ key }) =>
        hasSummaryContent(
          summary?.[key]
        )
    );

  const period =
    report?.period || {};

  return (
    <section className="mt-6 overflow-hidden rounded-3xl border border-[#D8C7C0] bg-white shadow-sm">
      <div className="h-1 bg-gradient-to-r from-[#5B1725] via-[#8A2638] to-[#D6B15E]" />

      {/* HEADER */}

      <div className="border-b border-[#EEE6E2] bg-[#FAF8F7] p-5 sm:p-6">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
          <div className="flex max-w-3xl items-start gap-4">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-[#F5E8EB]">
              <FileBarChart
                size={21}
                className="text-[#5B1725]"
              />
            </div>

            <div>
              <div className="flex flex-wrap items-center gap-2">
                <p className="text-[9px] font-black uppercase tracking-[0.16em] text-[#9A5D37]">
                  Generated Report
                </p>

                <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-1 text-[8px] font-black uppercase tracking-wide text-emerald-700">
                  <CheckCircle2
                    size={10}
                  />
                  Ready
                </span>
              </div>

              <h2 className="mt-2 text-xl font-black tracking-tight text-[#3D0F18] sm:text-2xl">
                Executive Summary
              </h2>

              <p className="mt-2 max-w-2xl text-xs leading-5 text-gray-500">
                {report?.description ||
                  "A high-level summary of the generated business report."}
              </p>
            </div>
          </div>

          <div className="w-full rounded-2xl border border-[#E8DFDB] bg-white p-4 lg:w-auto lg:min-w-[230px]">
            <p className="text-[9px] font-black uppercase tracking-[0.12em] text-gray-400">
              Report
            </p>

            <p className="mt-1 text-sm font-black text-[#3D0F18]">
              {report?.title ||
                "Business Report"}
            </p>

            {report?.version && (
              <p className="mt-1 text-[9px] font-bold text-gray-400">
                Version{" "}
                {report.version}
              </p>
            )}
          </div>
        </div>
      </div>

      {/* REPORT CONTEXT */}

      <div className="grid border-b border-[#EEE6E2] sm:grid-cols-2 lg:grid-cols-4">
        <ExecutiveSummaryMetadata
          label="Business"
          value={
            report?.business
              ?.businessName ||
            "My Business"
          }
        />

        <ExecutiveSummaryMetadata
          label="Period"
          value={
            period?.startDate &&
            period?.endDate
              ? `${formatReportDate(
                  period.startDate
                )} – ${formatReportDate(
                  period.endDate
                )}`
              : period?.days
                ? `${period.days} days`
                : "—"
          }
        />

        <ExecutiveSummaryMetadata
          label="Generated"
          value={formatReportDateTime(
            report?.generatedAt
          )}
        />

        <ExecutiveSummaryMetadata
          label="Report ID"
          value={
            report?.reportId ||
            "—"
          }
          monospace
        />
      </div>

      {/* SUMMARY */}

      <div className="p-5 sm:p-6">
        <div className="flex items-start gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#F5E8EB]">
            <BarChart3
              size={18}
              className="text-[#5B1725]"
            />
          </div>

          <div>
            <p className="text-[9px] font-black uppercase tracking-[0.14em] text-[#9A5D37]">
              Executive View
            </p>

            <h3 className="mt-1 text-base font-black text-[#3D0F18]">
              Report highlights
            </h3>

            <p className="mt-1 max-w-2xl text-[10px] leading-5 text-gray-500">
              These values come
              directly from the
              canonical executive
              summary generated by
              the reporting engine.
            </p>
          </div>
        </div>

        {availableGroups.length >
        0 ? (
          <div className="mt-5 space-y-4">
            {availableGroups.map(
              ({
                key,
                title,
                description,
                icon: Icon,
              }) => (
                <div
                  key={key}
                  className="overflow-hidden rounded-2xl border border-[#E8DFDB]"
                >
                  <div className="flex items-start gap-3 border-b border-[#EEE6E2] bg-[#FAF8F7] p-4">
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-white">
                      <Icon
                        size={16}
                        className="text-[#5B1725]"
                      />
                    </div>

                    <div>
                      <h4 className="text-xs font-black text-[#3D0F18]">
                        {title}
                      </h4>

                      <p className="mt-1 text-[9px] leading-4 text-gray-500">
                        {
                          description
                        }
                      </p>
                    </div>
                  </div>

                  <div className="p-4">
                    <ExecutiveSummaryValue
                      value={
                        summary[
                          key
                        ]
                      }
                    />
                  </div>
                </div>
              )
            )}
          </div>
        ) : (
          <div className="mt-5 rounded-2xl border border-dashed border-[#DCCFC9] bg-[#FAF8F7] p-6 text-center">
            <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-xl bg-white">
              <FileBarChart
                size={17}
                className="text-gray-400"
              />
            </div>

            <p className="mt-3 text-xs font-black text-[#3D0F18]">
              No executive summary
              data
            </p>

            <p className="mx-auto mt-1 max-w-md text-[10px] leading-5 text-gray-500">
              The report was
              generated successfully,
              but this report did not
              return executive
              summary values for the
              selected period.
            </p>
          </div>
        )}

        <div className="mt-5 flex items-start gap-3 rounded-xl border border-[#E8DFDB] bg-[#FAF8F7] p-4">
          <ShieldCheck
            size={16}
            className="mt-0.5 shrink-0 text-[#5B1725]"
          />

          <p className="text-[9px] leading-5 text-gray-500">
            This summary presents
            backend-generated
            analytics without
            recalculating metrics in
            the browser. Numeric KPI
            values available in this
            canonical summary are
            presented separately
            below.
          </p>
        </div>
      </div>
    </section>
  );
};

const ExecutiveSummaryMetadata = ({
  label,
  value,
  monospace = false,
}) => (
  <div className="border-b border-[#EEE6E2] p-4 last:border-b-0 sm:border-b-0 sm:border-r sm:last:border-r-0">
    <p className="text-[8px] font-black uppercase tracking-[0.12em] text-gray-400">
      {label}
    </p>

    <p
      className={`mt-1.5 wrap-break- text-[10px] font-black text-[#3D0F18] ${
        monospace
          ? "font-mono"
          : ""
      }`}
    >
      {value}
    </p>
  </div>
);

/**
 * =========================================================
 * 9.11.20.8 — KPI / PERFORMANCE CARDS
 * =========================================================
 *
 * PURPOSE
 *
 * Present numeric KPI values already contained in the
 * canonical executive summary returned by the backend.
 *
 * IMPORTANT
 *
 * This frontend code does NOT:
 *
 * - calculate conversion rates
 * - calculate engagement rates
 * - calculate demand metrics
 * - calculate promotion metrics
 * - calculate business performance metrics
 * - create replacement values for missing metrics
 *
 * It only presents finite numeric values already returned
 * inside the canonical report summary.
 */

const KPI_MAX_METRICS_PER_GROUP = 6;

const KPI_EXCLUDED_KEYS = new Set([
  "id",
  "reportId",
  "businessId",
  "userId",
  "listingId",
  "categoryId",
  "promotionId",
  "subscriptionId",
  "version",
  "reportVersion",
  "year",
  "month",
  "day",
  "days",
  "timestamp",
  "createdAt",
  "updatedAt",
  "generatedAt",
]);

/**
 * Prevent identifiers, version values and date metadata from
 * accidentally being presented as business KPIs.
 */
const isExcludedKpiKey = (key) => {
  const normalizedKey = String(key || "").trim();

  if (!normalizedKey) {
    return true;
  }

  if (KPI_EXCLUDED_KEYS.has(normalizedKey)) {
    return true;
  }

  return /(^|_)(id|version)$/i.test(normalizedKey);
};

/**
 * Recursively collect numeric values from ONE canonical
 * summary group.
 *
 * Example source:
 *
 * summary.overview
 * summary.conversion
 * summary.demand
 * summary.promotions
 *
 * This function does not perform analytics.
 *
 * It only finds finite numbers that already exist in the
 * backend response.
 */
const collectKpiMetrics = (
  value,
  path = [],
  results = [],
  seen = new WeakSet()
) => {
  if (results.length >= KPI_MAX_METRICS_PER_GROUP) {
    return results;
  }

  if (value === null || value === undefined) {
    return results;
  }

  if (typeof value === "number") {
    const metricKey =
      path.length > 0
        ? path[path.length - 1]
        : "";

    if (
      Number.isFinite(value) &&
      !isExcludedKpiKey(metricKey)
    ) {
      results.push({
        key: path.join("."),
        label: formatSummaryLabel(metricKey),
        value,
      });
    }

    return results;
  }

  if (typeof value !== "object") {
    return results;
  }

  if (seen.has(value)) {
    return results;
  }

  seen.add(value);

  if (Array.isArray(value)) {
    value.forEach((item, index) => {
      if (
        results.length <
        KPI_MAX_METRICS_PER_GROUP
      ) {
        collectKpiMetrics(
          item,
          [...path, String(index + 1)],
          results,
          seen
        );
      }
    });

    return results;
  }

  Object.entries(value).forEach(
    ([key, nestedValue]) => {
      if (
        results.length <
        KPI_MAX_METRICS_PER_GROUP
      ) {
        collectKpiMetrics(
          nestedValue,
          [...path, key],
          results,
          seen
        );
      }
    }
  );

  return results;
};

/**
 * Build KPI groups from the SAME four canonical summary
 * groups already used by 9.11.20.7.
 *
 * We deliberately reuse EXECUTIVE_SUMMARY_GROUPS instead
 * of creating another frontend interpretation of the report.
 */
const buildKpiPerformanceGroups = (
  summary
) => {
  if (
    !summary ||
    typeof summary !== "object" ||
    Array.isArray(summary)
  ) {
    return [];
  }

  return EXECUTIVE_SUMMARY_GROUPS.map(
    (group) => {
      const source =
        summary[group.key];

      const metrics =
        collectKpiMetrics(source);

      return {
        ...group,
        metrics,
      };
    }
  ).filter(
    (group) =>
      group.metrics.length > 0
  );
};

/**
 * Single KPI card.
 *
 * The displayed value is formatted using the existing
 * 9.11.20.7 primitive formatter.
 *
 * No mathematical transformation occurs here.
 */
const KpiPerformanceCard = ({
  metric,
}) => (
  <article className="min-w-0 rounded-2xl border border-[#E8DFDB] bg-white p-4 shadow-sm transition duration-200 hover:-translate-y-0.5 hover:shadow-md">
    <div className="flex items-start justify-between gap-3">
      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[#F5E8EB]">
        <BarChart3
          size={16}
          className="text-[#5B1725]"
        />
      </div>

      <span className="rounded-full bg-[#FAF8F7] px-2.5 py-1 text-[8px] font-black uppercase tracking-wide text-[#9A5D37]">
        KPI
      </span>
    </div>

    <p className="mt-4 wrap-break- text-[9px] font-black uppercase tracking-widest text-gray-400">
      {metric.label}
    </p>

    <p className="mt-1 wrap-break- text-xl font-black leading-tight tracking-tight text-[#3D0F18] sm:text-2xl">
      {formatSummaryPrimitive(
        metric.value
      )}
    </p>
  </article>
);

/**
 * One canonical summary group.
 *
 * Example:
 *
 * Business Overview
 * Conversion
 * Demand
 * Promotions
 */
const KpiPerformanceGroup = ({
  group,
}) => {
  const Icon = group.icon;

  return (
    <div className="overflow-hidden rounded-2xl border border-[#E8DFDB] bg-[#FAF8F7]">
      <div className="border-b border-[#EEE6E2] bg-white p-4 sm:p-5">
        <div className="flex items-start gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#F5E8EB]">
            <Icon
              size={18}
              className="text-[#5B1725]"
            />
          </div>

          <div>
            <h3 className="text-sm font-black text-[#3D0F18]">
              {group.title}
            </h3>

            <p className="mt-1 max-w-2xl text-[10px] leading-5 text-gray-500">
              {group.description}
            </p>
          </div>
        </div>
      </div>

      <div className="grid gap-3 p-4 sm:grid-cols-2 sm:p-5 lg:grid-cols-3 xl:grid-cols-4">
        {group.metrics.map(
          (metric) => (
            <KpiPerformanceCard
              key={`${group.key}-${metric.key}`}
              metric={metric}
            />
          )
        )}
      </div>
    </div>
  );
};

/**
 * Main 9.11.20.8 presentation component.
 *
 * If the backend summary contains no numeric KPI values,
 * nothing is rendered.
 *
 * We intentionally do not manufacture an empty KPI state
 * because absence of a metric is not equivalent to zero.
 */
const ReportKpiPerformanceCards = ({
  summary,
}) => {
  const groups =
    buildKpiPerformanceGroups(
      summary
    );

  if (groups.length === 0) {
    return null;
  }

  const totalMetrics =
    groups.reduce(
      (total, group) =>
        total +
        group.metrics.length,
      0
    );

  return (
    <section className="mt-6 overflow-hidden rounded-3xl border border-[#D8C7C0] bg-white shadow-sm">
      <div className="h-1 bg-gradient-to-r from-[#5B1725] via-[#8A2638] to-[#D6B15E]" />

      <div className="border-b border-[#EEE6E2] bg-[#FAF8F7] p-5 sm:p-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex items-start gap-4">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[#F5E8EB]">
              <TrendingUp
                size={19}
                className="text-[#5B1725]"
              />
            </div>

            <div>
              <p className="text-[9px] font-black uppercase tracking-[0.14em] text-[#9A5D37]">
                KPI Snapshot
              </p>

              <h2 className="mt-1 text-lg font-black text-[#3D0F18] sm:text-xl">
                Performance cards
              </h2>

              <p className="mt-1 max-w-2xl text-[10px] leading-5 text-gray-500">
                Numeric performance
                values returned directly
                by the generated
                business report.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1.5 rounded-full border border-[#E8DFDB] bg-white px-3 py-1.5 text-[9px] font-black text-[#5B1725]">
              <BarChart3 size={11} />

              {totalMetrics}{" "}
              {totalMetrics === 1
                ? "metric"
                : "metrics"}
            </span>

            <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-3 py-1.5 text-[9px] font-black text-emerald-700">
              <CheckCircle2
                size={11}
              />
              Backend generated
            </span>
          </div>
        </div>
      </div>

      <div className="space-y-4 p-5 sm:p-6">
        {groups.map((group) => (
          <KpiPerformanceGroup
            key={group.key}
            group={group}
          />
        ))}

        <div className="flex items-start gap-3 rounded-xl border border-[#E8DFDB] bg-[#FAF8F7] p-4">
          <ShieldCheck
            size={16}
            className="mt-0.5 shrink-0 text-[#5B1725]"
          />

          <p className="text-[9px] leading-5 text-gray-500">
            These cards only present
            finite numeric values
            already contained in the
            canonical executive
            summary. Missing metrics
            remain missing and no
            analytics are recalculated
            in the browser.
          </p>
        </div>
      </div>
    </section>
  );
};


/**
 * =========================================================
 * 9.11.20.9 — REPORT TABLES
 * =========================================================
 *
 * PURPOSE
 *
 * Present structured data already contained in the canonical
 * backend report sections.
 *
 * Canonical source:
 *
 * canonicalGeneratedReport.sections
 *
 * IMPORTANT
 *
 * This presentation layer does NOT:
 *
 * - calculate analytics
 * - rebuild report sections
 * - infer missing metrics
 * - manufacture zero values
 * - change backend section data
 * - flatten data for export
 *
 * It only converts suitable backend-owned section data into
 * readable frontend tables.
 */

/**
 * Executive Summary is already presented by 9.11.20.7 and
 * 9.11.20.8.
 *
 * Methodology and Data Coverage receive dedicated treatment
 * in 9.11.20.11.
 *
 * We therefore exclude them from the main report-table area.
 */
const REPORT_TABLE_EXCLUDED_SECTION_CODES =
  new Set([
    "EXECUTIVE_SUMMARY",
    "METHODOLOGY",
    "DATA_COVERAGE",
  ]);

const REPORT_TABLE_MAX_ROWS = 100;

const REPORT_TABLE_MAX_COLUMNS = 12;

/**
 * ---------------------------------------------------------
 * BASIC VALUE HELPERS
 * ---------------------------------------------------------
 */

const isReportTablePrimitive = (
  value
) =>
  value === null ||
  value === undefined ||
  typeof value === "string" ||
  typeof value === "number" ||
  typeof value === "boolean";

const hasReportTableData = (
  value
) => {
  if (
    value === null ||
    value === undefined
  ) {
    return false;
  }

  if (Array.isArray(value)) {
    return value.length > 0;
  }

  if (
    typeof value === "object"
  ) {
    return (
      Object.keys(value).length >
      0
    );
  }

  return true;
};

/**
 * Format one primitive value for table presentation.
 *
 * We intentionally reuse the existing 20.7 formatter so
 * numeric and boolean formatting remains consistent across
 * Executive Summary, KPI cards and Report Tables.
 */
const formatReportTablePrimitive = (
  value
) => {
  if (
    value === null ||
    value === undefined
  ) {
    return "—";
  }

  return formatSummaryPrimitive(
    value
  );
};

/**
 * Nested objects cannot safely become "[object Object]".
 *
 * For compact nested values we provide a readable
 * presentation without changing the underlying analytics.
 */
const formatReportTableNestedValue = (
  value
) => {
  if (
    value === null ||
    value === undefined
  ) {
    return "—";
  }

  if (
    isReportTablePrimitive(value)
  ) {
    return formatReportTablePrimitive(
      value
    );
  }

  if (Array.isArray(value)) {
    if (value.length === 0) {
      return "—";
    }

    const primitiveItems =
      value.filter(
        isReportTablePrimitive
      );

    if (
      primitiveItems.length ===
      value.length
    ) {
      return primitiveItems
        .map((item) =>
          formatReportTablePrimitive(
            item
          )
        )
        .join(", ");
    }

    return `${value.length} ${
      value.length === 1
        ? "item"
        : "items"
    }`;
  }

  if (
    typeof value === "object"
  ) {
    const entries =
      Object.entries(value);

    if (entries.length === 0) {
      return "—";
    }

    const primitiveEntries =
      entries.filter(([, item]) =>
        isReportTablePrimitive(
          item
        )
      );

    if (
      primitiveEntries.length > 0 &&
      primitiveEntries.length <= 3
    ) {
      return primitiveEntries
        .map(
          ([key, item]) =>
            `${formatSummaryLabel(
              key
            )}: ${formatReportTablePrimitive(
              item
            )}`
        )
        .join(" · ");
    }

    return `${entries.length} fields`;
  }

  return String(value);
};

/**
 * ---------------------------------------------------------
 * COLUMN HELPERS
 * ---------------------------------------------------------
 */

/**
 * Build columns from the keys actually present in backend
 * rows.
 *
 * No report-specific columns are invented here.
 */
const getReportTableColumns = (
  rows
) => {
  const keys = [];
  const seen = new Set();

  rows.forEach((row) => {
    if (
      !row ||
      typeof row !== "object" ||
      Array.isArray(row)
    ) {
      return;
    }

    Object.keys(row).forEach(
      (key) => {
        if (
          !seen.has(key) &&
          keys.length <
            REPORT_TABLE_MAX_COLUMNS
        ) {
          seen.add(key);
          keys.push(key);
        }
      }
    );
  });

  return keys;
};

/**
 * ---------------------------------------------------------
 * TABLE MODEL BUILDERS
 * ---------------------------------------------------------
 */

/**
 * Convert an array into a table model.
 *
 * Array of objects:
 *
 * [
 *   { title: "...", views: 10 },
 *   { title: "...", views: 20 }
 * ]
 *
 * becomes a normal multi-column table.
 *
 * Array of primitives becomes a single-value table.
 */
const buildArrayTableModel = (
  value
) => {
  if (
    !Array.isArray(value) ||
    value.length === 0
  ) {
    return null;
  }

  const rows = value.slice(
    0,
    REPORT_TABLE_MAX_ROWS
  );

  const objectRows = rows.filter(
    (row) =>
      row !== null &&
      typeof row === "object" &&
      !Array.isArray(row)
  );

  if (
    objectRows.length ===
    rows.length
  ) {
    const columns =
      getReportTableColumns(
        objectRows
      );

    if (columns.length === 0) {
      return null;
    }

    return {
      type: "OBJECT_ROWS",
      columns,
      rows: objectRows,
      totalRows: value.length,
      displayedRows:
        objectRows.length,
    };
  }

  return {
    type: "VALUE_ROWS",
    columns: ["value"],
    rows: rows.map((item) => ({
      value: item,
    })),
    totalRows: value.length,
    displayedRows: rows.length,
  };
};

/**
 * Convert an object containing primitive properties into a
 * two-column Metric / Value table.
 *
 * Example:
 *
 * {
 *   listingViews: 1200,
 *   completedTrades: 15
 * }
 *
 * becomes:
 *
 * Metric             Value
 * Listing Views      1,200
 * Completed Trades   15
 */
const buildPrimitiveObjectTableModel =
  (value) => {
    if (
      !value ||
      typeof value !== "object" ||
      Array.isArray(value)
    ) {
      return null;
    }

    const entries =
      Object.entries(value).filter(
        ([, item]) =>
          isReportTablePrimitive(
            item
          )
      );

    if (entries.length === 0) {
      return null;
    }

    const rows = entries
      .slice(
        0,
        REPORT_TABLE_MAX_ROWS
      )
      .map(([key, item]) => ({
        metric:
          formatSummaryLabel(key),
        value: item,
      }));

    return {
      type: "METRIC_ROWS",
      columns: [
        "metric",
        "value",
      ],
      rows,
      totalRows: entries.length,
      displayedRows: rows.length,
    };
  };

/**
 * ---------------------------------------------------------
 * DATASET DISCOVERY
 * ---------------------------------------------------------
 *
 * A report section may itself be:
 *
 * 1. an array
 * 2. an object of primitive metrics
 * 3. an object containing arrays
 * 4. an object containing nested objects
 *
 * We discover table-friendly datasets without assuming the
 * schema of one particular report type.
 */

const buildReportSectionDatasets = (
  section
) => {
  const data = section?.data;

  if (!hasReportTableData(data)) {
    return [];
  }

  /**
   * Entire section is an array.
   */
  if (Array.isArray(data)) {
    const table =
      buildArrayTableModel(data);

    return table
      ? [
          {
            key:
              section.code ||
              section.title ||
              "section",
            title:
              section.title ||
              formatSummaryLabel(
                section.code
              ) ||
              "Report Data",
            table,
          },
        ]
      : [];
  }

  if (
    typeof data !== "object"
  ) {
    return [
      {
        key:
          section.code ||
          section.title ||
          "section",
        title:
          section.title ||
          "Report Data",
        table: {
          type: "VALUE_ROWS",
          columns: ["value"],
          rows: [
            {
              value: data,
            },
          ],
          totalRows: 1,
          displayedRows: 1,
        },
      },
    ];
  }

  const datasets = [];

  /**
   * First capture direct primitive metrics belonging to the
   * section itself.
   */
  const primitiveTable =
    buildPrimitiveObjectTableModel(
      data
    );

  if (primitiveTable) {
    datasets.push({
      key: `${
        section.code ||
        section.title ||
        "section"
      }-summary`,
      title: "Summary",
      table: primitiveTable,
    });
  }

  /**
   * Then inspect direct child collections / objects.
   *
   * This is intentionally one level only.
   *
   * Deep recursive traversal belongs neither in a table UI
   * nor in frontend analytics logic.
   */
  Object.entries(data).forEach(
    ([key, childValue]) => {
      if (
        childValue === null ||
        childValue === undefined ||
        isReportTablePrimitive(
          childValue
        )
      ) {
        return;
      }

      let table = null;

      if (
        Array.isArray(childValue)
      ) {
        table =
          buildArrayTableModel(
            childValue
          );
      } else if (
        typeof childValue ===
        "object"
      ) {
        table =
          buildPrimitiveObjectTableModel(
            childValue
          );

        /**
         * Some child objects may themselves primarily hold
         * an obvious row collection.
         *
         * We do not recursively crawl arbitrary depth here.
         */
        if (!table) {
          const firstArrayEntry =
            Object.entries(
              childValue
            ).find(([, nested]) =>
              Array.isArray(nested)
            );

          if (firstArrayEntry) {
            const [
              nestedKey,
              nestedArray,
            ] = firstArrayEntry;

            const nestedTable =
              buildArrayTableModel(
                nestedArray
              );

            if (nestedTable) {
              datasets.push({
                key: `${
                  section.code ||
                  "section"
                }-${key}-${nestedKey}`,
                title: `${formatSummaryLabel(
                  key
                )} — ${formatSummaryLabel(
                  nestedKey
                )}`,
                table: nestedTable,
              });
            }
          }

          return;
        }
      }

      if (table) {
        datasets.push({
          key: `${
            section.code ||
            "section"
          }-${key}`,
          title:
            formatSummaryLabel(key),
          table,
        });
      }
    }
  );

  return datasets;
};

/**
 * ---------------------------------------------------------
 * SECTION NORMALIZATION
 * ---------------------------------------------------------
 */

const buildReportTableSections = (
  sections
) => {
  if (!Array.isArray(sections)) {
    return [];
  }

  return sections
    .filter((section) => {
      if (
        !section ||
        typeof section !==
          "object"
      ) {
        return false;
      }

      if (
        REPORT_TABLE_EXCLUDED_SECTION_CODES.has(
          section.code
        )
      ) {
        return false;
      }

      return hasReportTableData(
        section.data
      );
    })
    .map((section) => ({
      code: section.code,
      title:
        section.title ||
        formatSummaryLabel(
          section.code
        ) ||
        "Report Section",
      datasets:
        buildReportSectionDatasets(
          section
        ),
    }))
    .filter(
      (section) =>
        section.datasets.length > 0
    );
};

/**
 * ---------------------------------------------------------
 * TABLE CELL
 * ---------------------------------------------------------
 */

const ReportTableCell = ({
  value,
}) => (
  <td className="max-w-[280px] border-b border-[#EEE6E2] px-4 py-3 align-top text-[10px] font-semibold leading-5 text-gray-600 last:border-r-0">
    <div className="max-h-24 overflow-hidden wrap-break-">
      {formatReportTableNestedValue(
        value
      )}
    </div>
  </td>
);

/**
 * ---------------------------------------------------------
 * DATA TABLE
 * ---------------------------------------------------------
 */

const ReportDataTable = ({
  dataset,
}) => {
  const { table } = dataset;

  if (
    !table ||
    !Array.isArray(table.rows) ||
    !Array.isArray(
      table.columns
    ) ||
    table.rows.length === 0 ||
    table.columns.length === 0
  ) {
    return null;
  }

  return (
    <div className="overflow-hidden rounded-2xl border border-[#E8DFDB] bg-white">
      <div className="flex flex-col gap-2 border-b border-[#EEE6E2] bg-[#FAF8F7] px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
        <h4 className="text-[10px] font-black uppercase tracking-widest text-[#3D0F18]">
          {dataset.title}
        </h4>

        <span className="text-[9px] font-bold text-gray-400">
          {table.totalRows}{" "}
          {table.totalRows === 1
            ? "row"
            : "rows"}
        </span>
      </div>

      <div className="w-full overflow-x-auto overscroll-x-contain">
        <table className="min-w-maz w-full border-collapse text-left">
          <thead>
            <tr className="bg-white">
              {table.columns.map(
                (column) => (
                  <th
                    key={column}
                    scope="col"
                    className="whitespace-nowrap border-b border-[#E8DFDB] px-4 py-3 text-[8px] font-black uppercase tracking-widest text-[#9A5D37]"
                  >
                    {formatSummaryLabel(
                      column
                    )}
                  </th>
                )
              )}
            </tr>
          </thead>

          <tbody>
            {table.rows.map(
              (row, rowIndex) => (
                <tr
                  key={rowIndex}
                  className="transition hover:bg-[#FCFAF9]"
                >
                  {table.columns.map(
                    (column) => (
                      <ReportTableCell
                        key={`${rowIndex}-${column}`}
                        value={
                          row?.[
                            column
                          ]
                        }
                      />
                    )
                  )}
                </tr>
              )
            )}
          </tbody>
        </table>
      </div>

      {table.totalRows >
        table.displayedRows && (
        <div className="border-t border-[#EEE6E2] bg-amber-50 px-4 py-3">
          <p className="text-[9px] font-semibold leading-4 text-amber-800">
            Showing the first{" "}
            {table.displayedRows} of{" "}
            {table.totalRows} rows in
            this browser preview.
            Complete report data
            remains available in the
            canonical report.
          </p>
        </div>
      )}
    </div>
  );
};

/**
 * ---------------------------------------------------------
 * REPORT TABLE SECTION
 * ---------------------------------------------------------
 */

const ReportTableSection = ({
  section,
}) => (
  <div className="overflow-hidden rounded-2xl border border-[#D8C7C0] bg-[#FAF8F7]">
    <div className="border-b border-[#EEE6E2] bg-white p-4 sm:p-5">
      <div className="flex items-start gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#F5E8EB]">
          <FileSpreadsheet
            size={18}
            className="text-[#5B1725]"
          />
        </div>

        <div>
          <p className="text-[8px] font-black uppercase tracking-[0.12em] text-[#9A5D37]">
            {section.code
              ? formatSummaryLabel(
                  section.code
                )
              : "Report Section"}
          </p>

          <h3 className="mt-1 text-sm font-black text-[#3D0F18]">
            {section.title}
          </h3>

          <p className="mt-1 text-[10px] leading-5 text-gray-500">
            Structured values
            returned by this report
            section.
          </p>
        </div>
      </div>
    </div>

    <div className="space-y-4 p-4 sm:p-5">
      {section.datasets.map(
        (dataset) => (
          <ReportDataTable
            key={dataset.key}
            dataset={dataset}
          />
        )
      )}
    </div>
  </div>
);

/**
 * ---------------------------------------------------------
 * MAIN 9.11.20.9 COMPONENT
 * ---------------------------------------------------------
 */

const ReportTables = ({
  sections,
}) => {
  const tableSections =
    buildReportTableSections(
      sections
    );

  if (
    tableSections.length === 0
  ) {
        return (
          <section className="mt-6">
            <ReportSectionEmptyState
              title="No report tables available"
              description="This report does not contain tabular datasets for the selected reporting period."
              icon={FileSpreadsheet}
            />
          </section>
        );
  }

  const totalDatasets =
    tableSections.reduce(
      (total, section) =>
        total +
        section.datasets.length,
      0
    );

  return (
    <section className="mt-6 overflow-hidden rounded-2xl border border-[#D8C7C0] bg-white shadow-sm sm:rounded-3xl">
      <div className="h-1 bg-linear-to-r from-[#5B1725] via-[#8A2638] to-[#D6B15E]" />

      <div className="border-b border-[#EEE6E2] bg-[#FAF8F7] p-4 sm:p-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex items-start gap-4">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[#F5E8EB]">
              <FileSpreadsheet
                size={19}
                className="text-[#5B1725]"
              />
            </div>

            <div>
              <p className="text-[9px] font-black uppercase tracking-[0.14em] text-[#9A5D37]">
                Report Data
              </p>

              <h2 className="mt-1 text-lg font-black text-[#3D0F18] sm:text-xl">
                Detailed report
                tables
              </h2>

              <p className="mt-1 max-w-2xl text-[10px] leading-5 text-gray-500">
                Explore structured
                data returned by the
                generated report
                sections.
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center gap-1.5 rounded-full border border-[#E8DFDB] bg-white px-3 py-1.5 text-[9px] font-black text-[#5B1725]">
              <ListChecks size={11} />

              {tableSections.length}{" "}
              {tableSections.length ===
              1
                ? "section"
                : "sections"}
            </span>

            <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-3 py-1.5 text-[9px] font-black text-emerald-700">
              <FileSpreadsheet
                size={11}
              />

              {totalDatasets}{" "}
              {totalDatasets === 1
                ? "table"
                : "tables"}
            </span>
          </div>
        </div>
      </div>

      <div className="space-y-5 p-4 sm:p-6">
        {tableSections.map(
          (section, index) => (
            <ReportTableSection
              key={
                section.code ||
                `${section.title}-${index}`
              }
              section={section}
            />
          )
        )}

        <div className="flex items-start gap-3 rounded-xl border border-[#E8DFDB] bg-[#FAF8F7] p-4">
          <ShieldCheck
            size={16}
            className="mt-0.5 shrink-0 text-[#5B1725]"
          />

          <p className="text-[9px] leading-5 text-gray-500">
            These tables present
            canonical report section
            data returned by the
            backend. They do not
            calculate analytics or
            replace the original
            report payload.
          </p>
        </div>
      </div>
    </section>
  );
};
/**
 * =========================================================
 * 9.11.20.10 — TRENDS / CHART VISUALIZATION
 * =========================================================
 *
 * PURPOSE
 *
 * Visualize historical / ordered numeric datasets that are
 * already present in canonical backend report sections.
 *
 * SOURCE OF TRUTH:
 *
 * canonicalGeneratedReport.sections
 *
 * IMPORTANT:
 *
 * This component does NOT:
 *
 * - calculate analytics
 * - aggregate backend values
 * - calculate percentages
 * - calculate averages
 * - create forecasts
 * - infer missing points
 * - manufacture zero values
 * - modify canonical report data
 *
 * It only visualizes suitable ordered numeric datasets that
 * already exist in the generated report.
 */

/**
 * Maximum number of series drawn on one chart.
 *
 * Too many simultaneous lines make the visualization
 * difficult to understand.
 */
const REPORT_CHART_MAX_SERIES = 5;

/**
 * SVG dimensions.
 *
 * viewBox makes the chart responsive without requiring an
 * external chart dependency.
 */
const REPORT_CHART_WIDTH = 900;
const REPORT_CHART_HEIGHT = 320;

const REPORT_CHART_PADDING = {
  top: 24,
  right: 24,
  bottom: 58,
  left: 58,
};

/**
 * Colors are presentation-only.
 *
 * They do not carry analytics meaning.
 */
const REPORT_CHART_COLORS = [
  "#5B1725",
  "#9A5D37",
  "#2563EB",
  "#059669",
  "#7C3AED",
];

/**
 * Fields commonly used by backend trend datasets to identify
 * an ordered point.
 *
 * We are not inventing values here. This only identifies
 * which existing field should be used as the x-axis.
 */
const REPORT_CHART_X_KEYS = [
  "date",
  "period",
  "day",
  "week",
  "month",
  "bucket",
  "label",
];

/**
 * ---------------------------------------------------------
 * BASIC CHART HELPERS
 * ---------------------------------------------------------
 */

const isFiniteReportChartNumber = (
  value
) =>
  typeof value === "number" &&
  Number.isFinite(value);

const getReportChartXKey = (
  rows
) => {
  if (
    !Array.isArray(rows) ||
    rows.length === 0
  ) {
    return null;
  }

  return (
    REPORT_CHART_X_KEYS.find(
      (candidate) =>
        rows.some(
          (row) =>
            row &&
            typeof row ===
              "object" &&
            !Array.isArray(row) &&
            row[candidate] !==
              null &&
            row[candidate] !==
              undefined
        )
    ) || null
  );
};

/**
 * Discover numeric series from the actual backend rows.
 *
 * Example:
 *
 * {
 *   date: "2026-09-01",
 *   listingViews: 10,
 *   offersReceived: 2
 * }
 *
 * produces:
 *
 * listingViews
 * offersReceived
 *
 * The frontend does not decide what their values should be.
 */
const getReportChartSeriesKeys = (
  rows,
  xKey
) => {
  if (
    !Array.isArray(rows) ||
    rows.length === 0
  ) {
    return [];
  }

  const discovered = [];
  const seen = new Set();

  rows.forEach((row) => {
    if (
      !row ||
      typeof row !== "object" ||
      Array.isArray(row)
    ) {
      return;
    }

    Object.entries(row).forEach(
      ([key, value]) => {
        if (
          key === xKey ||
          seen.has(key) ||
          !isFiniteReportChartNumber(
            value
          )
        ) {
          return;
        }

        seen.add(key);

        if (
          discovered.length <
          REPORT_CHART_MAX_SERIES
        ) {
          discovered.push(key);
        }
      }
    );
  });

  return discovered;
};

/**
 * ---------------------------------------------------------
 * ORDERED DATASET DETECTION
 * ---------------------------------------------------------
 */

const isReportChartDataset = (
  value
) => {
  if (
    !Array.isArray(value) ||
    value.length < 2
  ) {
    return false;
  }

  const objectRows =
    value.filter(
      (row) =>
        row &&
        typeof row ===
          "object" &&
        !Array.isArray(row)
    );

  if (
    objectRows.length !==
    value.length
  ) {
    return false;
  }

  const xKey =
    getReportChartXKey(
      objectRows
    );

  if (!xKey) {
    return false;
  }

  const seriesKeys =
    getReportChartSeriesKeys(
      objectRows,
      xKey
    );

  return seriesKeys.length > 0;
};

/**
 * ---------------------------------------------------------
 * TREND DATASET DISCOVERY
 * ---------------------------------------------------------
 *
 * Report types have different backend structures.
 *
 * Instead of hard-coding:
 *
 * section.data.chart
 *
 * we inspect section data for chart-ready arrays.
 *
 * We deliberately limit traversal depth so this remains a
 * presentation concern rather than a second analytics engine.
 */

const discoverReportChartDatasets = (
  value,
  {
    path = [],
    depth = 0,
    seen = new WeakSet(),
  } = {}
) => {
  if (
    value === null ||
    value === undefined ||
    depth > 3
  ) {
    return [];
  }

  if (
    typeof value !== "object"
  ) {
    return [];
  }

  if (seen.has(value)) {
    return [];
  }

  seen.add(value);

  if (
    isReportChartDataset(value)
  ) {
    return [
      {
        path,
        data: value,
      },
    ];
  }

  const datasets = [];

  if (Array.isArray(value)) {
    value.forEach(
      (item, index) => {
        if (
          item &&
          typeof item ===
            "object"
        ) {
          datasets.push(
            ...discoverReportChartDatasets(
              item,
              {
                path: [
                  ...path,
                  String(
                    index + 1
                  ),
                ],
                depth:
                  depth + 1,
                seen,
              }
            )
          );
        }
      }
    );

    return datasets;
  }

  Object.entries(value).forEach(
    ([key, childValue]) => {
      if (
        childValue &&
        typeof childValue ===
          "object"
      ) {
        datasets.push(
          ...discoverReportChartDatasets(
            childValue,
            {
              path: [
                ...path,
                key,
              ],
              depth:
                depth + 1,
              seen,
            }
          )
        );
      }
    }
  );

  return datasets;
};

/**
 * ---------------------------------------------------------
 * BUILD CHART MODELS FROM CANONICAL REPORT SECTIONS
 * ---------------------------------------------------------
 */

const buildReportTrendCharts = (
  sections
) => {
  if (!Array.isArray(sections)) {
    return [];
  }

  const charts = [];
  const seenData = new WeakSet();

  sections.forEach(
    (section) => {
      if (
        !section ||
        typeof section !==
          "object" ||
        !section.data ||
        typeof section.data !==
          "object"
      ) {
        return;
      }

      const datasets =
        discoverReportChartDatasets(
          section.data
        );

      datasets.forEach(
        (dataset, index) => {
          if (
            seenData.has(
              dataset.data
            )
          ) {
            return;
          }

          seenData.add(
            dataset.data
          );

          const xKey =
            getReportChartXKey(
              dataset.data
            );

          if (!xKey) {
            return;
          }

          const seriesKeys =
            getReportChartSeriesKeys(
              dataset.data,
              xKey
            );

          if (
            seriesKeys.length ===
            0
          ) {
            return;
          }

          const pathTitle =
            dataset.path
              .filter(
                (item) =>
                  !/^\d+$/.test(
                    item
                  )
              )
              .map(
                formatSummaryLabel
              )
              .join(" — ");

          charts.push({
            key: `${
              section.code ||
              section.title ||
              "section"
            }-${index}-${dataset.path.join(
              "-"
            )}`,

            sectionCode:
              section.code ||
              null,

            sectionTitle:
              section.title ||
              formatSummaryLabel(
                section.code
              ) ||
              "Report Trends",

            title:
              pathTitle ||
              section.title ||
              "Performance Trend",

            xKey,

            seriesKeys,

            data: dataset.data,
          });
        }
      );
    }
  );

  return charts;
};

/**
 * ---------------------------------------------------------
 * AXIS LABEL FORMATTER
 * ---------------------------------------------------------
 */

const formatReportChartAxisLabel = (
  value
) => {
  if (
    value === null ||
    value === undefined
  ) {
    return "";
  }

  const stringValue =
    String(value);

  /**
   * Backend trend dates commonly use YYYY-MM-DD.
   *
   * We only change visual formatting.
   * The underlying canonical value remains untouched.
   */
  if (
    /^\d{4}-\d{2}-\d{2}$/.test(
      stringValue
    )
  ) {
    const date = new Date(
      `${stringValue}T00:00:00`
    );

    if (
      !Number.isNaN(
        date.getTime()
      )
    ) {
      return new Intl.DateTimeFormat(
        "en-KE",
        {
          day: "numeric",
          month: "short",
        }
      ).format(date);
    }
  }

  return stringValue;
};

const formatReportChartNumber = (
  value
) => {
  if (
    !isFiniteReportChartNumber(
      value
    )
  ) {
    return "—";
  }

  return new Intl.NumberFormat(
    "en-KE",
    {
      maximumFractionDigits: 2,
    }
  ).format(value);
};

/**
 * ---------------------------------------------------------
 * CHART SCALE
 * ---------------------------------------------------------
 */

const getReportChartMaximum = (
  data,
  seriesKeys
) => {
  let maximum = 0;

  data.forEach((row) => {
    seriesKeys.forEach(
      (key) => {
        const value =
          row?.[key];

        if (
          isFiniteReportChartNumber(
            value
          ) &&
          value > maximum
        ) {
          maximum = value;
        }
      }
    );
  });

  return maximum > 0
    ? maximum
    : 1;
};

/**
 * ---------------------------------------------------------
 * SVG LINE POINTS
 * ---------------------------------------------------------
 */

const buildReportChartPoints = ({
  data,
  seriesKey,
  maximum,
}) => {
  const plotWidth =
    REPORT_CHART_WIDTH -
    REPORT_CHART_PADDING.left -
    REPORT_CHART_PADDING.right;

  const plotHeight =
    REPORT_CHART_HEIGHT -
    REPORT_CHART_PADDING.top -
    REPORT_CHART_PADDING.bottom;

  return data
    .map((row, index) => {
      const value =
        row?.[seriesKey];

      if (
        !isFiniteReportChartNumber(
          value
        )
      ) {
        return null;
      }

      const x =
        data.length === 1
          ? REPORT_CHART_PADDING.left +
            plotWidth / 2
          : REPORT_CHART_PADDING.left +
            (index /
              (data.length -
                1)) *
              plotWidth;

      const y =
        REPORT_CHART_PADDING.top +
        plotHeight -
        (value / maximum) *
          plotHeight;

      return {
        x,
        y,
        value,
        index,
      };
    })
    .filter(Boolean);
};

const reportChartPointsToPolyline = (
  points
) =>
  points
    .map(
      (point) =>
        `${point.x},${point.y}`
    )
    .join(" ");

/**
 * ---------------------------------------------------------
 * Y AXIS
 * ---------------------------------------------------------
 */

const ReportChartYAxis = ({
  maximum,
}) => {
  const ticks = [
    1,
    0.75,
    0.5,
    0.25,
    0,
  ];

  const plotHeight =
    REPORT_CHART_HEIGHT -
    REPORT_CHART_PADDING.top -
    REPORT_CHART_PADDING.bottom;

  return (
    <>
      {ticks.map(
        (ratio) => {
          const y =
            REPORT_CHART_PADDING.top +
            plotHeight -
            ratio *
              plotHeight;

          const value =
            maximum * ratio;

          return (
            <g
              key={ratio}
            >
              <line
                x1={
                  REPORT_CHART_PADDING.left
                }
                y1={y}
                x2={
                  REPORT_CHART_WIDTH -
                  REPORT_CHART_PADDING.right
                }
                y2={y}
                stroke="#EEE6E2"
                strokeWidth="1"
              />

              <text
                x={
                  REPORT_CHART_PADDING.left -
                  10
                }
                y={y + 4}
                textAnchor="end"
                fontSize="10"
                fill="#9CA3AF"
              >
                {formatReportChartNumber(
                  value
                )}
              </text>
            </g>
          );
        }
      )}
    </>
  );
};

/**
 * ---------------------------------------------------------
 * X AXIS
 * ---------------------------------------------------------
 */

const ReportChartXAxis = ({
  data,
  xKey,
}) => {
  const plotWidth =
    REPORT_CHART_WIDTH -
    REPORT_CHART_PADDING.left -
    REPORT_CHART_PADDING.right;

  /**
   * Keep labels readable on large datasets.
   *
   * The chart still draws every backend point.
   * We only reduce the number of visible axis labels.
   */
  const labelEvery =
    Math.max(
      1,
      Math.ceil(
        data.length / 7
      )
    );

  return (
    <>
      {data.map(
        (row, index) => {
          const shouldShow =
            index %
              labelEvery ===
              0 ||
            index ===
              data.length - 1;

          if (!shouldShow) {
            return null;
          }

          const x =
            data.length === 1
              ? REPORT_CHART_PADDING.left +
                plotWidth / 2
              : REPORT_CHART_PADDING.left +
                (index /
                  (data.length -
                    1)) *
                  plotWidth;

          return (
            <g
              key={`${index}-${row?.[
                xKey
              ]}`}
            >
              <line
                x1={x}
                y1={
                  REPORT_CHART_HEIGHT -
                  REPORT_CHART_PADDING.bottom
                }
                x2={x}
                y2={
                  REPORT_CHART_HEIGHT -
                  REPORT_CHART_PADDING.bottom +
                  5
                }
                stroke="#D8C7C0"
              />

              <text
                x={x}
                y={
                  REPORT_CHART_HEIGHT -
                  25
                }
                textAnchor="middle"
                fontSize="10"
                fill="#6B7280"
              >
                {formatReportChartAxisLabel(
                  row?.[xKey]
                )}
              </text>
            </g>
          );
        }
      )}
    </>
  );
};

/**
 * ---------------------------------------------------------
 * CHART LEGEND
 * ---------------------------------------------------------
 */

const ReportChartLegend = ({
  seriesKeys,
}) => (
  <div className="flex flex-wrap gap-x-5 gap-y-2">
    {seriesKeys.map(
      (key, index) => (
        <div
          key={key}
          className="flex items-center gap-2"
        >
          <span
            className="h-2.5 w-2.5 rounded-full"
            style={{
              backgroundColor:
                REPORT_CHART_COLORS[
                  index %
                    REPORT_CHART_COLORS.length
                ],
            }}
          />

          <span className="text-[9px] font-bold text-gray-600">
            {formatSummaryLabel(
              key
            )}
          </span>
        </div>
      )
    )}
  </div>
);

/**
 * ---------------------------------------------------------
 * INDIVIDUAL LINE CHART
 * ---------------------------------------------------------
 */

const ReportLineChart = ({
  chart,
}) => {
  const maximum =
    getReportChartMaximum(
      chart.data,
      chart.seriesKeys
    );

  return (
    <article className="overflow-hidden rounded-2xl border border-[#E8DFDB] bg-white">
      <div className="border-b border-[#EEE6E2] bg-[#FAF8F7] p-4 sm:p-5">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <p className="text-[8px] font-black uppercase tracking-[0.12em] text-[#9A5D37]">
              {chart.sectionTitle}
            </p>

            <h3 className="mt-1 text-sm font-black text-[#3D0F18]">
              {chart.title}
            </h3>

            <p className="mt-1 text-[10px] leading-5 text-gray-500">
              Historical values
              returned by the
              generated report.
            </p>
          </div>

          <span className="w-fit rounded-full bg-white px-3 py-1.5 text-[9px] font-black text-[#5B1725]">
            {chart.data.length}{" "}
            {chart.data.length === 1
              ? "point"
              : "points"}
          </span>
        </div>

        <div className="mt-4">
          <ReportChartLegend
            seriesKeys={
              chart.seriesKeys
            }
          />
        </div>
      </div>

      <div className="overflow-x-auto p-3 sm:p-5">
        <div className="w-full overflow-x-auto overscroll-x-contain">
          <svg
            viewBox={`0 0 ${REPORT_CHART_WIDTH} ${REPORT_CHART_HEIGHT}`}
            className="h-auto min-w-[640px] w-full"
            role="img"
            aria-label={`${chart.title} line chart`}
          >
            <ReportChartYAxis
              maximum={maximum}
            />

            <line
              x1={
                REPORT_CHART_PADDING.left
              }
              y1={
                REPORT_CHART_HEIGHT -
                REPORT_CHART_PADDING.bottom
              }
              x2={
                REPORT_CHART_WIDTH -
                REPORT_CHART_PADDING.right
              }
              y2={
                REPORT_CHART_HEIGHT -
                REPORT_CHART_PADDING.bottom
              }
              stroke="#D8C7C0"
              strokeWidth="1"
            />

            <ReportChartXAxis
              data={chart.data}
              xKey={chart.xKey}
            />

            {chart.seriesKeys.map(
              (
                seriesKey,
                seriesIndex
              ) => {
                const points =
                  buildReportChartPoints(
                    {
                      data:
                        chart.data,
                      seriesKey,
                      maximum,
                    }
                  );

                if (
                  points.length ===
                  0
                ) {
                  return null;
                }

                const color =
                  REPORT_CHART_COLORS[
                    seriesIndex %
                      REPORT_CHART_COLORS.length
                  ];

                return (
                  <g
                    key={
                      seriesKey
                    }
                  >
                    {points.length >
                      1 && (
                      <polyline
                        points={reportChartPointsToPolyline(
                          points
                        )}
                        fill="none"
                        stroke={
                          color
                        }
                        strokeWidth="2.5"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        vectorEffect="non-scaling-stroke"
                      />
                    )}

                    {points.map(
                      (
                        point
                      ) => (
                        <g
                          key={`${seriesKey}-${point.index}`}
                        >
                          <circle
                            cx={
                              point.x
                            }
                            cy={
                              point.y
                            }
                            r="4"
                            fill="white"
                            stroke={
                              color
                            }
                            strokeWidth="2"
                            vectorEffect="non-scaling-stroke"
                          >
                            <title>
                              {`${formatSummaryLabel(
                                seriesKey
                              )}: ${formatReportChartNumber(
                                point.value
                              )}`}
                            </title>
                          </circle>
                        </g>
                      )
                    )}
                  </g>
                );
              }
            )}
          </svg>
        </div>
      </div>

      <div className="border-t border-[#EEE6E2] bg-[#FAF8F7] px-4 py-3">
        <p className="text-[9px] leading-4 text-gray-500">
          Hover over individual
          chart points to view their
          backend-provided values.
          Lines connect existing
          ordered observations only.
        </p>
      </div>
    </article>
  );
};

/**
 * ---------------------------------------------------------
 * MAIN 9.11.20.10 COMPONENT
 * ---------------------------------------------------------
 */

const ReportTrendVisualization = ({
  sections,
}) => {
  const charts =
    buildReportTrendCharts(
      sections
    );

  /**
   * Some reports legitimately contain no historical dataset.
   *
   * We do not manufacture a chart in that situation.
   */
  if (charts.length === 0) {
    return (
      <section className="mt-6">
        <ReportSectionEmptyState
          title="No trend data available"
          description="This report does not contain an ordered historical dataset that can be visualized as a trend."
          icon={TrendingUp}
        />
      </section>
    );
  }

  return (
    <section className="mt-6 overflow-hidden rounded-2xl sm:rounded-3xl border border-[#D8C7C0] bg-white shadow-sm">
      <div className="h-1 bg-linear-to-r from-[#5B1725] via-[#8A2638] to-[#D6B15E]" />

      <div className="border-b border-[#EEE6E2] bg-[#FAF8F7] p-5 sm:p-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex items-start gap-4">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[#F5E8EB]">
              <TrendingUp
                size={19}
                className="text-[#5B1725]"
              />
            </div>

            <div>
              <p className="text-[9px] font-black uppercase tracking-[0.14em] text-[#9A5D37]">
                Historical Trends
              </p>

              <h2 className="mt-1 text-lg font-black text-[#3D0F18] sm:text-xl">
                Performance over
                time
              </h2>

              <p className="mt-1 max-w-2xl text-[10px] leading-5 text-gray-500">
                Visualize ordered
                historical metrics
                returned directly by
                the generated
                business report.
              </p>
            </div>
          </div>

          <span className="inline-flex w-fit items-center gap-1.5 rounded-full border border-[#E8DFDB] bg-white px-3 py-1.5 text-[9px] font-black text-[#5B1725]">
            <BarChart3
              size={11}
            />

            {charts.length}{" "}
            {charts.length === 1
              ? "chart"
              : "charts"}
          </span>
        </div>
      </div>

      <div className="space-y-5p-4 sm:p-6">
        {charts.map(
          (chart) => (
            <ReportLineChart
              key={chart.key}
              chart={chart}
            />
          )
        )}

        <div className="flex items-start gap-3 rounded-xl border border-[#E8DFDB] bg-[#FAF8F7] p-4">
          <ShieldCheck
            size={16}
            className="mt-0.5 shrink-0 text-[#5B1725]"
          />

          <p className="text-[9px] leading-5 text-gray-500">
            Trend charts visualize
            historical numeric
            observations already
            returned by the backend.
            The browser does not
            calculate analytics,
            forecast future results
            or create missing data
            points.
          </p>
        </div>
      </div>
    </section>
  );
};

/**
 * =========================================================
 * 9.11.20.11 — DATA COVERAGE & METHODOLOGY
 * =========================================================
 *
 * PURPOSE
 *
 * Explain:
 *
 * 1. what data was available to the generated report
 * 2. how the backend describes the report methodology
 *
 * SOURCE OF TRUTH:
 *
 * canonicalGeneratedReport.dataCoverage
 * canonicalGeneratedReport.methodology
 *
 * IMPORTANT:
 *
 * The frontend does NOT:
 *
 * - calculate data coverage
 * - determine analytics completeness
 * - infer missing methodology
 * - create confidence scores
 * - create quality scores
 * - reinterpret backend methodology
 * - manufacture missing information
 *
 * This is presentation only.
 */


/**
 * ---------------------------------------------------------
 * EMPTY VALUE CHECK
 * ---------------------------------------------------------
 */

const isEmptyReportInformationValue = (
  value
) => {
  if (
    value === null ||
    value === undefined ||
    value === ""
  ) {
    return true;
  }

  if (
    Array.isArray(value)
  ) {
    return value.length === 0;
  }

  if (
    typeof value === "object"
  ) {
    return (
      Object.keys(value).length ===
      0
    );
  }

  return false;
};


/**
 * ---------------------------------------------------------
 * PRIMITIVE VALUE FORMATTER
 * ---------------------------------------------------------
 *
 * This changes presentation only.
 *
 * Numeric values are NOT recalculated.
 */

const formatReportInformationValue = (
  value
) => {
  if (
    value === null ||
    value === undefined ||
    value === ""
  ) {
    return "—";
  }

  if (
    typeof value === "boolean"
  ) {
    return value
      ? "Yes"
      : "No";
  }

  if (
    typeof value === "number"
  ) {
    if (
      !Number.isFinite(value)
    ) {
      return "—";
    }

    return new Intl.NumberFormat(
      "en-KE",
      {
        maximumFractionDigits: 2,
      }
    ).format(value);
  }

  return String(value);
};


/**
 * ---------------------------------------------------------
 * INFORMATION ROW
 * ---------------------------------------------------------
 */

const ReportInformationRow = ({
  label,
  value,
}) => {
  if (
    isEmptyReportInformationValue(
      value
    )
  ) {
    return null;
  }

  return (
    <div className="flex flex-col gap-1 border-b border-[#F0EAE7] py-3 last:border-b-0 sm:flex-row sm:items-start sm:justify-between sm:gap-6">
      <p className="text-[9px] font-black uppercase tracking-widest text-gray-400 sm:max-w-[42%]">
        {formatSummaryLabel(
          label
        )}
      </p>

      <p className="wrap-break- text-[10px] font-semibold leading-5 text-gray-700 sm:max-w-[58%] sm:text-right">
        {formatReportInformationValue(
          value
        )}
      </p>
    </div>
  );
};


/**
 * ---------------------------------------------------------
 * SIMPLE OBJECT VALUES
 * ---------------------------------------------------------
 *
 * Renders primitive properties from a canonical backend
 * object.
 */

const ReportInformationObject = ({
  value,
}) => {
  if (
    !value ||
    typeof value !== "object" ||
    Array.isArray(value)
  ) {
    return null;
  }

  const entries =
    Object.entries(value).filter(
      ([, entryValue]) =>
        !isEmptyReportInformationValue(
          entryValue
        ) &&
        (
          typeof entryValue !==
            "object" ||
          entryValue === null
        )
    );

  if (
    entries.length === 0
  ) {
    return null;
  }

  return (
    <div>
      {entries.map(
        ([key, entryValue]) => (
          <ReportInformationRow
            key={key}
            label={key}
            value={entryValue}
          />
        )
      )}
    </div>
  );
};


/**
 * ---------------------------------------------------------
 * STRING / PRIMITIVE LIST
 * ---------------------------------------------------------
 */

const ReportInformationList = ({
  items,
}) => {
  if (
    !Array.isArray(items) ||
    items.length === 0
  ) {
    return null;
  }

  const primitiveItems =
    items.filter(
      (item) =>
        item !== null &&
        item !== undefined &&
        typeof item !==
          "object"
    );

  if (
    primitiveItems.length === 0
  ) {
    return null;
  }

  return (
    <ul className="space-y-2.5">
      {primitiveItems.map(
        (item, index) => (
          <li
            key={`${String(
              item
            )}-${index}`}
            className="flex items-start gap-2.5"
          >
            <CheckCircle2
              size={13}
              className="mt-0.5 shrink-0 text-emerald-600"
            />

            <span className="text-[10px] leading-5 text-gray-600">
              {formatReportInformationValue(
                item
              )}
            </span>
          </li>
        )
      )}
    </ul>
  );
};


/**
 * ---------------------------------------------------------
 * RECURSIVE CANONICAL INFORMATION RENDERER
 * ---------------------------------------------------------
 *
 * Coverage and methodology can contain nested backend
 * structures.
 *
 * This renderer preserves those structures without assuming
 * specific fields that the backend has not guaranteed.
 */

const ReportCanonicalInformation = ({
  value,
  depth = 0,
}) => {
  if (
    isEmptyReportInformationValue(
      value
    )
  ) {
    return null;
  }

  /**
   * Primitive
   */
  if (
    typeof value !== "object"
  ) {
    return (
      <p className="text-[10px] leading-5 text-gray-600">
        {formatReportInformationValue(
          value
        )}
      </p>
    );
  }

  /**
   * Array
   */
  if (
    Array.isArray(value)
  ) {
    const primitiveItems =
      value.filter(
        (item) =>
          item !== null &&
          item !== undefined &&
          typeof item !==
            "object"
      );

    const objectItems =
      value.filter(
        (item) =>
          item &&
          typeof item ===
            "object"
      );

    return (
      <div className="space-y-3">
        {primitiveItems.length >
          0 && (
          <ReportInformationList
            items={
              primitiveItems
            }
          />
        )}

        {objectItems.map(
          (item, index) => (
            <div
              key={index}
              className="rounded-xl border border-[#EEE6E2] bg-[#FAF8F7] p-3.5"
            >
              <ReportCanonicalInformation
                value={item}
                depth={
                  depth + 1
                }
              />
            </div>
          )
        )}
      </div>
    );
  }

  /**
   * Object
   */
  const entries =
    Object.entries(value).filter(
      ([, entryValue]) =>
        !isEmptyReportInformationValue(
          entryValue
        )
    );

  if (
    entries.length === 0
  ) {
    return null;
  }

  const primitiveEntries =
    entries.filter(
      ([, entryValue]) =>
        typeof entryValue !==
          "object" ||
        entryValue === null
    );

  const nestedEntries =
    entries.filter(
      ([, entryValue]) =>
        entryValue &&
        typeof entryValue ===
          "object"
    );

  return (
    <div className="space-y-4">
      {primitiveEntries.length >
        0 && (
        <div>
          {primitiveEntries.map(
            ([
              key,
              entryValue,
            ]) => (
              <ReportInformationRow
                key={key}
                label={key}
                value={
                  entryValue
                }
              />
            )
          )}
        </div>
      )}

      {nestedEntries.map(
        ([
          key,
          entryValue,
        ]) => (
          <div
            key={key}
            className={
              depth === 0
                ? "rounded-xl border border-[#EEE6E2] bg-[#FAF8F7] p-4"
                : "border-l-2 border-[#E8DFDB] pl-4"
            }
          >
            <p className="mb-3 text-[9px] font-black uppercase tracking-widest text-[#9A5D37]">
              {formatSummaryLabel(
                key
              )}
            </p>

            <ReportCanonicalInformation
              value={
                entryValue
              }
              depth={
                depth + 1
              }
            />
          </div>
        )
      )}
    </div>
  );
};


/**
 * ---------------------------------------------------------
 * DATA COVERAGE CARD
 * ---------------------------------------------------------
 */

const ReportDataCoverageCard = ({
  dataCoverage,
}) => {
  if (
    isEmptyReportInformationValue(
      dataCoverage
    )
  ) {
    return null;
  }

  return (
    <article className="overflow-hidden rounded-2xl border border-[#E8DFDB] bg-white">
      <div className="border-b border-[#EEE6E2] bg-[#FAF8F7] p-4 sm:p-5">
        <div className="flex items-start gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-50">
            <CheckCircle2
              size={18}
              className="text-emerald-700"
            />
          </div>

          <div>
            <p className="text-[8px] font-black uppercase tracking-[0.12em] text-emerald-700">
              Data Coverage
            </p>

            <h3 className="mt-1 text-sm font-black text-[#3D0F18]">
              Report data
              availability
            </h3>

            <p className="mt-1 text-[10px] leading-5 text-gray-500">
              Coverage information
              supplied by the
              generated report.
            </p>
          </div>
        </div>
      </div>

      <div className="p-4 sm:p-5">
        <ReportCanonicalInformation
          value={dataCoverage}
        />
      </div>
    </article>
  );
};


/**
 * ---------------------------------------------------------
 * METHODOLOGY CARD
 * ---------------------------------------------------------
 */

const ReportMethodologyCard = ({
  methodology,
}) => {
  if (
    isEmptyReportInformationValue(
      methodology
    )
  ) {
    return null;
  }

  return (
    <article className="overflow-hidden rounded-2xl border border-[#E8DFDB] bg-white">
      <div className="border-b border-[#EEE6E2] bg-[#FAF8F7] p-4 sm:p-5">
        <div className="flex items-start gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#F5E8EB]">
            <FileBarChart
              size={18}
              className="text-[#5B1725]"
            />
          </div>

          <div>
            <p className="text-[8px] font-black uppercase tracking-[0.12em] text-[#9A5D37]">
              Methodology
            </p>

            <h3 className="mt-1 text-sm font-black text-[#3D0F18]">
              How this report
              was prepared
            </h3>

            <p className="mt-1 text-[10px] leading-5 text-gray-500">
              Methodology
              information supplied
              directly by the report
              service.
            </p>
          </div>
        </div>
      </div>

      <div className="p-4 sm:p-5">
        <ReportCanonicalInformation
          value={methodology}
        />
      </div>
    </article>
  );
};


/**
 * ---------------------------------------------------------
 * MAIN 9.11.20.11 COMPONENT
 * ---------------------------------------------------------
 */

const ReportCoverageAndMethodology = ({
  dataCoverage,
  methodology,
}) => {
  const hasDataCoverage =
    !isEmptyReportInformationValue(
      dataCoverage
    );

  const hasMethodology =
    !isEmptyReportInformationValue(
      methodology
    );

  /**
   * Backend may legitimately return no coverage or methodology
   * information for a particular report.
   *
   * Do not manufacture placeholders.
   */
if (
  !hasDataCoverage &&
  !hasMethodology
) {
  return (
    <section className="mt-6">
      <ReportSectionEmptyState
        title="No coverage or methodology details available"
        description="The generated report did not include data coverage or methodology information."
        icon={ShieldCheck}
      />
    </section>
  );
}

  return (
    <section className="mt-6 overflow-hidden rounded-2xl border border-[#D8C7C0] bg-white shadow-sm sm:rounded-3xl">
      <div className="h-1 bg-linear-to-r from-[#5B1725] via-[#8A2638] to-[#D6B15E]" />

      <div className="border-b border-[#EEE6E2] bg-[#FAF8F7] p-4 sm:p-6">
        <div className="flex items-start gap-4">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[#F5E8EB]">
            <ShieldCheck
              size={19}
              className="text-[#5B1725]"
            />
          </div>

          <div>
            <p className="text-[9px] font-black uppercase tracking-[0.14em] text-[#9A5D37]">
              Report Transparency
            </p>

            <h2 className="mt-1 text-lg font-black text-[#3D0F18] sm:text-xl">
              Data coverage &
              methodology
            </h2>

            <p className="mt-1 max-w-2xl text-[10px] leading-5 text-gray-500">
              Understand the data
              available to this
              report and the
              methodology information
              supplied by the backend
              reporting service.
            </p>
          </div>
        </div>
      </div>

      <div className="p-4 sm:p-6">
        <div
          className={`grid gap-5 ${
            hasDataCoverage &&
            hasMethodology
              ? "lg:grid-cols-2"
              : "grid-cols-1"
          }`}
        >
          {hasDataCoverage && (
            <ReportDataCoverageCard
              dataCoverage={
                dataCoverage
              }
            />
          )}

          {hasMethodology && (
            <ReportMethodologyCard
              methodology={
                methodology
              }
            />
          )}
        </div>

        <div className="mt-5 flex items-start gap-3 rounded-xl border border-[#E8DFDB] bg-[#FAF8F7] p-4">
          <ShieldCheck
            size={16}
            className="mt-0.5 shrink-0 text-[#5B1725]"
          />

          <p className="text-[9px] leading-5 text-gray-500">
            Coverage and
            methodology shown here
            come from the canonical
            generated report. The
            frontend does not
            calculate completeness,
            confidence, quality
            scores or analytical
            methodology.
          </p>
        </div>
      </div>
    </section>
  );
};
/**
 * =========================================================
 * 9.11.20.12 — JSON EXPORT EXPERIENCE
 * =========================================================
 *
 * PURPOSE
 *
 * Allow a Business Pro user to request and inspect the
 * backend-generated JSON representation of the currently
 * generated report.
 *
 * IMPORTANT:
 *
 * - Backend produces the export.
 * - Frontend does not rebuild the canonical report.
 * - Frontend does not manufacture export metadata.
 * - No file download occurs in this step.
 *
 * Actual download UX belongs to:
 *
 * 9.11.20.15 — Export Download UX
 */


/**
 * ---------------------------------------------------------
 * EXPORT METADATA VALUE
 * ---------------------------------------------------------
 */

const JsonExportMetadataValue = ({
  label,
  value,
  monospace = false,
}) => {
  if (
    value === null ||
    value === undefined ||
    value === ""
  ) {
    return null;
  }

  return (
    <div className="border-b border-[#EEE6E2] py-3 last:border-b-0">
      <p className="text-[8px] font-black uppercase tracking-widest text-gray-400">
        {label}
      </p>

      <p
        className={`mt-1 break-all text-[10px] font-bold text-[#3D0F18] ${
          monospace
            ? "font-mono"
            : ""
        }`}
      >
        {String(value)}
      </p>
    </div>
  );
};


/**
 * ---------------------------------------------------------
 * BYTE LENGTH PRESENTATION
 * ---------------------------------------------------------
 *
 * byteLength comes from the backend.
 *
 * The frontend only formats it for readability.
 */

const formatJsonExportBytes = (
  value
) => {
  if (
    typeof value !== "number" ||
    !Number.isFinite(value) ||
    value < 0
  ) {
    return null;
  }

  if (value < 1024) {
    return `${value} bytes`;
  }

  if (
    value <
    1024 * 1024
  ) {
    return `${(
      value / 1024
    ).toFixed(1)} KB`;
  }

  return `${(
    value /
    (1024 * 1024)
  ).toFixed(2)} MB`;
};


/**
 * ---------------------------------------------------------
 * JSON PREVIEW
 * ---------------------------------------------------------
 *
 * JSON.stringify is used ONLY to make the backend payload
 * readable inside <pre>.
 *
 * It is NOT being used to create the export itself.
 */

const ReportJsonPreview = ({
  payload,
}) => {
  let formattedJson = "";

  try {
    formattedJson =
      JSON.stringify(
        payload,
        null,
        2
      );
  } catch (err) {
    console.error(
      "FORMAT JSON EXPORT PREVIEW ERROR:",
      err
    );

    return (
      <div className="rounded-xl border border-red-200 bg-red-50 p-4">
        <p className="text-[10px] font-bold text-red-700">
          The JSON export was
          returned, but its preview
          could not be formatted in
          the browser.
        </p>
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-2xl border border-[#2B2022] bg-[#171214]">
      <div className="flex items-center justify-between gap-4 border-b border-white/10 px-4 py-3">
        <div className="flex items-center gap-2">
          <FileJson
            size={14}
            className="text-emerald-400"
          />

          <p className="text-[9px] font-black uppercase tracking-widest text-white">
            JSON Payload
          </p>
        </div>

        <span className="rounded-full bg-white/10 px-2.5 py-1 text-[8px] font-black uppercase tracking-wide text-gray-300">
          Read only
        </span>
      </div>

      <div className="max-h-[420px] w-full overflow-auto overscroll-contain sm:max-h-[520px]">
        <pre className="min-w-max p-3 font-mono text-[9px] leading-5 text-emerald-100 sm:p-4 sm:text-[10px]">
          {formattedJson}
        </pre>
      </div>
    </div>
  );
};


/**
 * ---------------------------------------------------------
 * JSON EXPORT METADATA
 * ---------------------------------------------------------
 */

const ReportJsonExportMetadata = ({
  metadata,
}) => {
  if (
    !metadata ||
    typeof metadata !==
      "object"
  ) {
    return null;
  }

  const formattedBytes =
    formatJsonExportBytes(
      metadata.byteLength
    );

  return (
    <div className="rounded-2xl border border-[#E8DFDB] bg-[#FAF8F7] p-4 sm:p-5">
      <div className="flex items-start gap-3">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-white">
          <ShieldCheck
            size={16}
            className="text-[#5B1725]"
          />
        </div>

        <div>
          <p className="text-[9px] font-black uppercase tracking-widest text-[#9A5D37]">
            Export Metadata
          </p>

          <p className="mt-1 text-[10px] leading-5 text-gray-500">
            Metadata returned by
            the backend export
            service.
          </p>
        </div>
      </div>

      <div className="mt-4">
        <JsonExportMetadataValue
          label="Format"
          value={
            metadata.format
          }
        />

        <JsonExportMetadataValue
          label="File name"
          value={
            metadata.fileName
          }
          monospace
        />

        <JsonExportMetadataValue
          label="MIME type"
          value={
            metadata.mimeType
          }
          monospace
        />

        <JsonExportMetadataValue
          label="Extension"
          value={
            metadata.extension
          }
        />

        <JsonExportMetadataValue
          label="Size"
          value={
            formattedBytes
          }
        />

        <JsonExportMetadataValue
          label="Report ID"
          value={
            metadata.reportId
          }
          monospace
        />

        <JsonExportMetadataValue
          label="Report type"
          value={
            metadata.reportType
          }
          monospace
        />

        <JsonExportMetadataValue
          label="Exported at"
          value={
            metadata.exportedAt
          }
        />

        <JsonExportMetadataValue
          label="Source generated at"
          value={
            metadata.sourceGeneratedAt
          }
        />
      </div>
    </div>
  );
};


/**
 * ---------------------------------------------------------
 * MAIN 9.11.20.12 COMPONENT
 * ---------------------------------------------------------
 */

const ReportJsonExportExperience = ({
  reportExport,
  loading,
  error,
  response,
  onGenerate,
  onDownload,
}) => {
  const exportMetadata =
    response?.success === true &&
    response?.export &&
    typeof response.export ===
      "object"
      ? response.export
      : null;

  const exportPayload =
    response?.success === true
      ? response.data
      : undefined;

  const exportReady =
    Boolean(
      exportMetadata &&
      exportMetadata.format ===
        BUSINESS_REPORT_FORMATS.JSON &&
      exportPayload !==
        undefined
    );

  return (
    <section className="mt-6 overflow-hidden rounded-2xl border border-[#D8C7C0] bg-white shadow-sm sm:rounded-3xl">
      <div className="h-1 bg-linear-to-r from-[#5B1725] via-[#8A2638] to-[#D6B15E]" />

      <div className="border-b border-[#EEE6E2] bg-[#FAF8F7] p-4 sm:p-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex items-start gap-4">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[#F5E8EB]">
              <FileJson
                size={19}
                className="text-[#5B1725]"
              />
            </div>

            <div>
              <p className="text-[9px] font-black uppercase tracking-[0.14em] text-[#9A5D37]">
                JSON Export
              </p>

              <h2 className="mt-1 text-lg font-black text-[#3D0F18] sm:text-xl">
                Structured report
                export
              </h2>

              <p className="mt-1 max-w-2xl text-[10px] leading-5 text-gray-500">
                Request the
                backend-generated
                JSON representation
                of this report and
                inspect its canonical
                export payload.
              </p>
            </div>
          </div>

          <span
            className={`inline-flex w-fit items-center gap-1.5 rounded-full px-3 py-1.5 text-[9px] font-black ${
              reportExport
                ? "bg-emerald-50 text-emerald-700"
                : "bg-gray-100 text-gray-500"
            }`}
          >
            {reportExport && (
              <CheckCircle2
                size={11}
              />
            )}

            {reportExport
              ? "Export enabled"
              : "Export unavailable"}
          </span>
        </div>
      </div>

      <div className="p-5 sm:p-6">
        <div className="rounded-2xl border border-[#E8DFDB] bg-[#FAF8F7] p-4 sm:p-5">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-xs font-black text-[#3D0F18]">
                {loading
                  ? "Preparing JSON export..."
                  : exportReady
                    ? "JSON export ready"
                    : "Prepare JSON export"}
              </p>

              <p className="mt-1 max-w-xl text-[10px] leading-5 text-gray-500">
                {loading
                  ? "The protected report API is preparing the JSON export."
                  : exportReady
                    ? "The backend JSON export has been returned successfully."
                    : "Request a fresh JSON export for the generated report and reporting period."}
              </p>
            </div>

            <button
              type="button"
              disabled={
                !reportExport ||
                loading
              }
              onClick={
                onGenerate
              }
              className={`inline-flex shrink-0 items-center justify-center gap-2 rounded-xl px-5 py-3 text-[10px] font-black transition ${
                reportExport &&
                !loading
                  ? "bg-[#5B1725] text-white shadow-sm hover:bg-[#46111C]"
                  : "cursor-not-allowed bg-gray-200 text-gray-400"
              }`}
            >
              {loading ? (
                <>
                  <RefreshCw
                    size={14}
                    className="animate-spin"
                  />

                  Preparing...
                </>
              ) : exportReady ? (
                <>
                  <RefreshCw
                    size={14}
                  />

                  Refresh JSON
                </>
              ) : (
                <>
                  <FileJson
                    size={14}
                  />

                  Prepare JSON
                </>
              )}
            </button>
          </div>
        </div>

        {loading && (
          <ReportExportLoadingState
            label="JSON export"
          />
        )}

        {error && (
          <div
            role="alert"
            className="mt-4 rounded-2xl border border-red-200 bg-red-50 p-4"
          >
            <p className="text-[10px] font-black text-red-800">
              JSON export failed
            </p>

            <p className="mt-1 text-[10px] leading-5 text-red-700">
              {error}
            </p>
          </div>
        )}

        {!loading &&
          !error &&
          response?.success === true &&
          !exportReady && (
            <ReportExportEmptyState
              title="JSON export contains no previewable payload"
              description="The export request completed, but no JSON payload is available to preview or download."
            />
          )}

        {exportReady && (
        <div className="mt-4 flex justify-end">
            <button
            type="button"
            onClick={onDownload}
            className="inline-flex min-h-11 w-full sm:w-auto items-center justify-center gap-2 rounded-xl border border-[#5B1725] bg-white px-4 py-2.5 text-[10px] font-black text-[#5B1725] transition hover:bg-[#F5E8EB]"
            >
            <Download size={14} />
            Download JSON
            </button>
        </div>
        )}

        {exportReady && (
        <div className="mt-4 flex justify-end">
            <button
            type="button"
            onClick={onDownload}
            className="inline-flex items-center justify-center gap-2 rounded-xl border border-[#5B1725] bg-white px-4 py-2.5 text-[10px] font-black text-[#5B1725] transition hover:bg-[#F5E8EB]"
            >
            <Download size={14} />

            Download{" "}
            {normalizeCsvExportDatasets(
                exportPayload
            ).length > 1
                ? "CSV Datasets"
                : "CSV"}
            </button>
        </div>
        )}

        {exportReady && (
          <div className="mt-5 grid gap-5 xl:grid-cols-[300px_minmax(0,1fr)]">
            <ReportJsonExportMetadata
              metadata={
                exportMetadata
              }
            />

            <ReportJsonPreview
              payload={
                exportPayload
              }
            />
          </div>
        )}

        <div className="mt-5 flex items-start gap-3 rounded-xl border border-[#E8DFDB] bg-[#FAF8F7] p-4">
          <ShieldCheck
            size={16}
            className="mt-0.5 shrink-0 text-[#5B1725]"
          />

          <p className="text-[9px] leading-5 text-gray-500">
            JSON shown here is
            produced by the
            protected backend report
            export service. The
            frontend does not rebuild
            the report or manufacture
            export metadata.
            Download handling is
            added separately in the
            export download step.
          </p>
        </div>
      </div>
    </section>
  );
};

/**
 * =========================================================
 * 9.11.20.13 — CSV MULTI-DATASET EXPORT
 * =========================================================
 *
 * IMPORTANT
 *
 * The backend owns CSV generation.
 *
 * The frontend:
 *
 * - requests the CSV export
 * - preserves dataset boundaries
 * - previews the backend response
 *
 * The frontend does NOT:
 *
 * - calculate report metrics
 * - flatten multiple datasets
 * - rebuild CSV rows from the canonical report
 * - perform CSV security sanitization
 * - create downloadable files yet
 *
 * Download UX belongs to 9.11.20.15.
 */


/**
 * ---------------------------------------------------------
 * CSV EXPORT METADATA
 * ---------------------------------------------------------
 */

const ReportCsvExportMetadata = ({
  metadata,
}) => {
  if (
    !metadata ||
    typeof metadata !== "object"
  ) {
    return null;
  }

  const formattedBytes =
    formatJsonExportBytes(
      metadata.byteLength
    );

  return (
    <div className="rounded-2xl border border-[#E8DFDB] bg-[#FAF8F7] p-4 sm:p-5">
      <div className="flex items-start gap-3">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-white">
          <FileSpreadsheet
            size={16}
            className="text-[#5B1725]"
          />
        </div>

        <div>
          <p className="text-[9px] font-black uppercase tracking-widest text-[#9A5D37]">
            Export Metadata
          </p>

          <p className="mt-1 text-[10px] leading-5 text-gray-500">
            CSV export information
            returned by the backend.
          </p>
        </div>
      </div>

      <div className="mt-4">
        <JsonExportMetadataValue
          label="Format"
          value={metadata.format}
        />

        <JsonExportMetadataValue
          label="File name"
          value={metadata.fileName}
          monospace
        />

        <JsonExportMetadataValue
          label="MIME type"
          value={metadata.mimeType}
          monospace
        />

        <JsonExportMetadataValue
          label="Extension"
          value={metadata.extension}
        />

        <JsonExportMetadataValue
          label="Size"
          value={formattedBytes}
        />

        <JsonExportMetadataValue
          label="Report ID"
          value={metadata.reportId}
          monospace
        />

        <JsonExportMetadataValue
          label="Report type"
          value={metadata.reportType}
          monospace
        />

        <JsonExportMetadataValue
          label="Exported at"
          value={metadata.exportedAt}
        />

        <JsonExportMetadataValue
          label="Source generated at"
          value={
            metadata.sourceGeneratedAt
          }
        />
      </div>
    </div>
  );
};


/**
 * ---------------------------------------------------------
 * GENERIC CSV VALUE DISPLAY
 * ---------------------------------------------------------
 */

const formatCsvPreviewValue = (
  value
) => {
  if (
    value === null ||
    value === undefined
  ) {
    return "—";
  }

  if (
    typeof value === "string" ||
    typeof value === "number" ||
    typeof value === "boolean"
  ) {
    return String(value);
  }

  try {
    return JSON.stringify(value);
  } catch {
    return String(value);
  }
};


/**
 * ---------------------------------------------------------
 * DATASET NORMALIZATION
 * ---------------------------------------------------------
 *
 * We do NOT invent dataset contents.
 *
 * This helper only turns the backend payload into a
 * consistent array for rendering.
 *
 * Supported presentation forms:
 *
 * 1. payload.datasets = [...]
 * 2. payload itself is [...]
 * 3. payload is an object whose values represent datasets
 *
 * The original dataset value remains unchanged.
 */

const normalizeCsvExportDatasets = (
  payload
) => {
  if (
    payload === null ||
    payload === undefined
  ) {
    return [];
  }

  if (
    Array.isArray(
      payload?.datasets
    )
  ) {
    return payload.datasets.map(
      (dataset, index) => ({
        key:
          dataset?.key ||
          dataset?.name ||
          dataset?.title ||
          `dataset-${index + 1}`,

        name:
          dataset?.name ||
          dataset?.title ||
          dataset?.key ||
          `Dataset ${index + 1}`,

        value: dataset,
      })
    );
  }

  if (Array.isArray(payload)) {
    return payload.map(
      (dataset, index) => ({
        key:
          dataset?.key ||
          dataset?.name ||
          dataset?.title ||
          `dataset-${index + 1}`,

        name:
          dataset?.name ||
          dataset?.title ||
          dataset?.key ||
          `Dataset ${index + 1}`,

        value: dataset,
      })
    );
  }

  if (
    typeof payload === "object"
  ) {
    return Object.entries(
      payload
    ).map(
      ([key, value]) => ({
        key,
        name: key,
        value,
      })
    );
  }

  return [
    {
      key: "csv-export",
      name: "CSV Export",
      value: payload,
    },
  ];
};


/**
 * ---------------------------------------------------------
 * FIND TABULAR ROWS
 * ---------------------------------------------------------
 *
 * This is presentation-only.
 *
 * We are not creating CSV.
 *
 * We only locate an existing row collection inside a
 * backend-returned dataset so that it can be previewed.
 */

const getCsvDatasetRows = (
  dataset
) => {
  if (Array.isArray(dataset)) {
    return dataset;
  }

  if (
    !dataset ||
    typeof dataset !== "object"
  ) {
    return [];
  }

  const possibleRows = [
    dataset.rows,
    dataset.data,
    dataset.records,
    dataset.items,
  ];

  return (
    possibleRows.find(
      (value) =>
        Array.isArray(value)
    ) || []
  );
};


/**
 * ---------------------------------------------------------
 * DATASET NAME
 * ---------------------------------------------------------
 */

const formatCsvDatasetName = (
  value
) => {
  return formatSummaryLabel(
    String(
      value ||
        "Dataset"
    )
  );
};


/**
 * ---------------------------------------------------------
 * CSV DATASET TABLE PREVIEW
 * ---------------------------------------------------------
 */

const CsvDatasetTablePreview = ({
  rows,
}) => {
  if (
    !Array.isArray(rows) ||
    rows.length === 0
  ) {
    return null;
  }

  /**
   * Preview only.
   *
   * We intentionally limit the browser preview.
   * This does not alter the backend export.
   */
  const previewRows =
    rows.slice(0, 10);

  const objectRows =
    previewRows.filter(
      (row) =>
        row &&
        typeof row ===
          "object" &&
        !Array.isArray(row)
    );

  /**
   * If the dataset contains primitive rows,
   * show them as one value column.
   */
  if (
    objectRows.length === 0
  ) {
    return (
      <div className="overflow-x-auto">
        <table className="min-w-full border-collapse text-left">
          <thead>
            <tr className="border-b border-[#E8DFDB] bg-[#FAF8F7]">
              <th className="px-4 py-3 text-[9px] font-black uppercase tracking-wide text-[#9A5D37]">
                Value
              </th>
            </tr>
          </thead>

          <tbody>
            {previewRows.map(
              (row, index) => (
                <tr
                  key={index}
                  className="border-b border-[#F0E9E6] last:border-b-0"
                >
                  <td className="max-w-[500px] wrap-break- px-4 py-3 text-[10px] text-gray-600">
                    {formatCsvPreviewValue(
                      row
                    )}
                  </td>
                </tr>
              )
            )}
          </tbody>
        </table>
      </div>
    );
  }

  /**
   * Columns come directly from keys already present in
   * the returned rows.
   *
   * No report fields are invented.
   */
  const columns =
    Array.from(
      new Set(
        objectRows.flatMap(
          (row) =>
            Object.keys(row)
        )
      )
    );

  if (
    columns.length === 0
  ) {
    return null;
  }

  return (
    <div className="overflow-x-auto">
      <table className="min-w-full border-collapse text-left">
        <thead>
          <tr className="border-b border-[#E8DFDB] bg-[#FAF8F7]">
            {columns.map(
              (column) => (
                <th
                  key={column}
                  className="whitespace-nowrap px-4 py-3 text-[9px] font-black uppercase tracking-wide text-[#9A5D37]"
                >
                  {formatSummaryLabel(
                    column
                  )}
                </th>
              )
            )}
          </tr>
        </thead>

        <tbody>
          {previewRows.map(
            (row, rowIndex) => (
              <tr
                key={rowIndex}
                className="border-b border-[#F0E9E6] last:border-b-0"
              >
                {columns.map(
                  (column) => (
                    <td
                      key={`${rowIndex}-${column}`}
                      className="max-w-[320px] wrap-break- px-4 py-3 align-top text-[10px] leading-5 text-gray-600"
                    >
                      {row &&
                      typeof row ===
                        "object" &&
                      !Array.isArray(
                        row
                      )
                        ? formatCsvPreviewValue(
                            row[
                              column
                            ]
                          )
                        : "—"}
                    </td>
                  )
                )}
              </tr>
            )
          )}
        </tbody>
      </table>
    </div>
  );
};


/**
 * ---------------------------------------------------------
 * RAW DATASET PREVIEW
 * ---------------------------------------------------------
 *
 * Used when a backend dataset does not expose a row
 * collection that can be rendered as a table.
 */

const CsvDatasetRawPreview = ({
  value,
}) => {
  let content = "";

  try {
    content =
      typeof value === "string"
        ? value
        : JSON.stringify(
            value,
            null,
            2
          );
  } catch {
    content = String(value);
  }

  return (
    <pre className="max-h-[360px] overflow-auto whitespace-pre-wrap wrap-break- bg-[#171214] p-4 font-mono text-[10px] leading-5 text-emerald-100">
      {content}
    </pre>
  );
};


/**
 * ---------------------------------------------------------
 * INDIVIDUAL DATASET PREVIEW
 * ---------------------------------------------------------
 */

const CsvDatasetPreview = ({
  dataset,
  index,
}) => {
  const rows =
    getCsvDatasetRows(
      dataset.value
    );

  const rowCount =
    rows.length;

  const hasTabularRows =
    rowCount > 0;

  return (
    <article className="overflow-hidden rounded-2xl border border-[#E8DFDB] bg-white">
      <div className="flex flex-col gap-3 border-b border-[#EEE6E2] bg-[#FAF8F7] px-4 py-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-start gap-3">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-white shadow-sm">
            <FileSpreadsheet
              size={16}
              className="text-[#5B1725]"
            />
          </div>

          <div>
            <p className="text-[8px] font-black uppercase tracking-widest text-[#9A5D37]">
              Dataset{" "}
              {index + 1}
            </p>

            <h3 className="mt-1 text-xs font-black text-[#3D0F18]">
              {formatCsvDatasetName(
                dataset.name
              )}
            </h3>
          </div>
        </div>

        {hasTabularRows && (
          <span className="inline-flex w-fit rounded-full bg-white px-3 py-1.5 text-[9px] font-black text-gray-600">
            {rowCount}{" "}
            {rowCount === 1
              ? "row"
              : "rows"}
          </span>
        )}
      </div>

      {hasTabularRows ? (
        <>
          <CsvDatasetTablePreview
            rows={rows}
          />

          {rowCount > 10 && (
            <div className="border-t border-[#EEE6E2] bg-[#FAF8F7] px-4 py-3">
              <p className="text-[9px] leading-5 text-gray-500">
                Previewing the
                first 10 of{" "}
                <strong className="text-[#3D0F18]">
                  {rowCount}
                </strong>{" "}
                returned rows. The
                export response
                remains unchanged.
              </p>
            </div>
          )}
        </>
      ) : (
        <CsvDatasetRawPreview
          value={
            dataset.value
          }
        />
      )}
    </article>
  );
};


/**
 * ---------------------------------------------------------
 * CSV DATASET COLLECTION
 * ---------------------------------------------------------
 */

const ReportCsvDatasetCollection = ({
  payload,
}) => {
  const datasets =
    normalizeCsvExportDatasets(
      payload
    );

  if (
    datasets.length === 0
  ) {
    return (
      <div className="rounded-2xl border border-[#E8DFDB] bg-[#FAF8F7] p-5">
        <p className="text-xs font-black text-[#3D0F18]">
          No CSV datasets
          returned
        </p>

        <p className="mt-1 text-[10px] leading-5 text-gray-500">
          The export request
          completed, but there are
          no datasets available to
          preview.
        </p>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-[9px] font-black uppercase tracking-widest text-[#9A5D37]">
            CSV Datasets
          </p>

          <p className="mt-1 text-[10px] text-gray-500">
            Backend-returned
            datasets are shown
            separately.
          </p>
        </div>

        <span className="rounded-full bg-[#F5E8EB] px-3 py-1.5 text-[9px] font-black text-[#5B1725]">
          {datasets.length}{" "}
          {datasets.length === 1
            ? "dataset"
            : "datasets"}
        </span>
      </div>

      <div className="space-y-4">
        {datasets.map(
          (
            dataset,
            index
          ) => (
            <CsvDatasetPreview
              key={`${dataset.key}-${index}`}
              dataset={
                dataset
              }
              index={index}
            />
          )
        )}
      </div>
    </div>
  );
};


/**
 * ---------------------------------------------------------
 * MAIN CSV EXPORT EXPERIENCE
 * ---------------------------------------------------------
 */

const ReportCsvExportExperience = ({
  reportExport,
  loading,
  error,
  response,
  onGenerate,
  onDownload,
}) => {
  const exportMetadata =
    response?.success === true &&
    response?.export &&
    typeof response.export ===
      "object"
      ? response.export
      : null;

  const exportPayload =
    response?.success === true
      ? response.data
      : undefined;

  const exportReady =
    Boolean(
      exportMetadata &&
      exportMetadata.format ===
        BUSINESS_REPORT_FORMATS.CSV &&
      exportPayload !==
        undefined
    );

  return (
    <section className="mt-6 overflow-hidden rounded-2xl border border-[#D8C7C0] bg-white shadow-sm sm:rounded-3xl">
      <div className="h-1 bg-linear-to-r from-[#5B1725] via-[#8A2638] to-[#D6B15E]" />

      <div className="border-b border-[#EEE6E2] bg-[#FAF8F7] p-4 sm:p-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex items-start gap-4">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[#F5E8EB]">
              <FileSpreadsheet
                size={19}
                className="text-[#5B1725]"
              />
            </div>

            <div>
              <p className="text-[9px] font-black uppercase tracking-[0.14em] text-[#9A5D37]">
                CSV Export
              </p>

              <h2 className="mt-1 text-lg font-black text-[#3D0F18] sm:text-xl">
                Multi-dataset
                export
              </h2>

              <p className="mt-1 max-w-2xl text-[10px] leading-5 text-gray-500">
                Prepare the
                backend-generated
                CSV datasets for
                this business
                report without
                flattening separate
                analytical
                datasets into one
                table.
              </p>
            </div>
          </div>

          <span
            className={`inline-flex w-fit items-center gap-1.5 rounded-full px-3 py-1.5 text-[9px] font-black ${
              reportExport
                ? "bg-emerald-50 text-emerald-700"
                : "bg-gray-100 text-gray-500"
            }`}
          >
            {reportExport && (
              <CheckCircle2
                size={11}
              />
            )}

            {reportExport
              ? "Export enabled"
              : "Export unavailable"}
          </span>
        </div>
      </div>

      <div className="p-4 sm:p-6">
        <div className="rounded-2xl border border-[#E8DFDB] bg-[#FAF8F7] p-4 sm:p-5">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-xs font-black text-[#3D0F18]">
                {loading
                  ? "Preparing CSV datasets..."
                  : exportReady
                    ? "CSV export ready"
                    : "Prepare CSV export"}
              </p>

              <p className="mt-1 max-w-xl text-[10px] leading-5 text-gray-500">
                {loading
                  ? "The protected report API is preparing the CSV datasets."
                  : exportReady
                    ? "The backend CSV export has been returned successfully."
                    : "Request the CSV representation of the generated report."}
              </p>
            </div>

            <button
              type="button"
              disabled={
                !reportExport ||
                loading
              }
              onClick={
                onGenerate
              }
              className={`inline-flex min-h-11 w-full shrink-0 items-center justify-center gap-2 rounded-xl px-5 py-3 text-[10px] font-black transition sm:w-auto ${
                reportExport &&
                !loading
                  ? "bg-[#5B1725] text-white shadow-sm hover:bg-[#46111C]"
                  : "cursor-not-allowed bg-gray-200 text-gray-400"
              }`}
            >
              {loading ? (
                <>
                  <RefreshCw
                    size={14}
                    className="animate-spin"
                  />

                  Preparing...
                </>
              ) : exportReady ? (
                <>
                  <RefreshCw
                    size={14}
                  />

                  Refresh CSV
                </>
              ) : (
                <>
                  <FileSpreadsheet
                    size={14}
                  />

                  Prepare CSV
                </>
              )}
            </button>
          </div>
        </div>

        {loading && (
            <ReportExportLoadingState
              label="CSV datasets"
            />
          )
        }

        {error && (
          <div
            role="alert"
            className="mt-4 rounded-2xl border border-red-200 bg-red-50 p-4"
          >
            <p className="text-[10px] font-black text-red-800">
              CSV export failed
            </p>

            <p className="mt-1 text-[10px] leading-5 text-red-700">
              {error}
            </p>
          </div>
        )}

        {!loading &&
        !error &&
        response?.success === true &&
        exportReady &&
        normalizeCsvExportDatasets(
          exportPayload
        ).length === 0 && (
          <ReportExportEmptyState
            title="No CSV datasets available"
            description="The CSV export completed successfully, but the backend returned no datasets for this report."
          />
        )}

        {exportReady && (
          <div className="mt-5 grid gap-5 xl:grid-cols-[300px_minmax(0,1fr)]">
            <ReportCsvExportMetadata
              metadata={
                exportMetadata
              }
            />

            <ReportCsvDatasetCollection
              payload={
                exportPayload
              }
            />
          </div>
        )}

        <div className="mt-5 flex items-start gap-3 rounded-xl border border-[#E8DFDB] bg-[#FAF8F7] p-4">
          <ShieldCheck
            size={16}
            className="mt-0.5 shrink-0 text-[#5B1725]"
          />

          <p className="text-[9px] leading-5 text-gray-500">
            CSV datasets are
            generated and secured
            by the backend. Dataset
            boundaries are
            preserved in the
            frontend instead of
            being merged into a
            single artificial
            table. File download
            handling is added
            separately in the
            download UX step.
          </p>
        </div>
      </div>
    </section>
  );
};

/**
 * =========================================================
 * 9.11.20.14 — PDF_READY PREVIEW
 * =========================================================
 *
 * PURPOSE
 *
 * Preview the structured PDF-ready representation returned
 * by the backend reporting service.
 *
 * IMPORTANT
 *
 * PDF_READY is NOT a binary PDF.
 *
 * This frontend code does NOT:
 *
 * - create PDF bytes
 * - create Blob URLs
 * - call window.print()
 * - use jsPDF
 * - use html2canvas
 * - generate report analytics
 * - reconstruct missing report information
 *
 * It only presents backend-returned structured data.
 */


/**
 * ---------------------------------------------------------
 * PDF_READY METADATA
 * ---------------------------------------------------------
 */

const ReportPdfReadyMetadata = ({
  metadata,
}) => {
  if (
    !metadata ||
    typeof metadata !== "object"
  ) {
    return null;
  }

  const formattedBytes =
    formatJsonExportBytes(
      metadata.byteLength
    );

  return (
    <div className="rounded-2xl border border-[#E8DFDB] bg-[#FAF8F7] p-4 sm:p-5">
      <div className="flex items-start gap-3">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-white">
          <FileText
            size={16}
            className="text-[#5B1725]"
          />
        </div>

        <div>
          <p className="text-[9px] font-black uppercase tracking-widest text-[#9A5D37]">
            Preview Metadata
          </p>

          <p className="mt-1 text-[10px] leading-5 text-gray-500">
            PDF-ready export
            information returned
            by the backend.
          </p>
        </div>
      </div>

      <div className="mt-4">
        <JsonExportMetadataValue
          label="Format"
          value={
            metadata.format
          }
        />

        <JsonExportMetadataValue
          label="File name"
          value={
            metadata.fileName
          }
          monospace
        />

        <JsonExportMetadataValue
          label="MIME type"
          value={
            metadata.mimeType
          }
          monospace
        />

        <JsonExportMetadataValue
          label="Extension"
          value={
            metadata.extension
          }
        />

        <JsonExportMetadataValue
          label="Size"
          value={
            formattedBytes
          }
        />

        <JsonExportMetadataValue
          label="Report ID"
          value={
            metadata.reportId
          }
          monospace
        />

        <JsonExportMetadataValue
          label="Report type"
          value={
            metadata.reportType
          }
          monospace
        />

        <JsonExportMetadataValue
          label="Exported at"
          value={
            metadata.exportedAt
          }
        />

        <JsonExportMetadataValue
          label="Source generated at"
          value={
            metadata.sourceGeneratedAt
          }
        />
      </div>
    </div>
  );
};


/**
 * ---------------------------------------------------------
 * PDF_READY EMPTY CHECK
 * ---------------------------------------------------------
 */

const isEmptyPdfReadyValue = (
  value
) => {
  if (
    value === null ||
    value === undefined ||
    value === ""
  ) {
    return true;
  }

  if (
    Array.isArray(value)
  ) {
    return value.length === 0;
  }

  if (
    typeof value === "object"
  ) {
    return (
      Object.keys(value).length ===
      0
    );
  }

  return false;
};


/**
 * ---------------------------------------------------------
 * PDF_READY VALUE FORMATTER
 * ---------------------------------------------------------
 *
 * Presentation only.
 *
 * Numeric values are never recalculated.
 */

const formatPdfReadyValue = (
  value
) => {
  if (
    value === null ||
    value === undefined ||
    value === ""
  ) {
    return "—";
  }

  if (
    typeof value === "boolean"
  ) {
    return value
      ? "Yes"
      : "No";
  }

  if (
    typeof value === "number"
  ) {
    if (
      !Number.isFinite(value)
    ) {
      return "—";
    }

    return new Intl.NumberFormat(
      "en-KE",
      {
        maximumFractionDigits: 2,
      }
    ).format(value);
  }

  return String(value);
};


/**
 * ---------------------------------------------------------
 * PRIMITIVE PDF_READY FIELD
 * ---------------------------------------------------------
 */

const PdfReadyField = ({
  label,
  value,
}) => {
  if (
    isEmptyPdfReadyValue(
      value
    )
  ) {
    return null;
  }

  return (
    <div className="border-b border-gray-100 py-3 last:border-b-0">
      <p className="text-[8px] font-black uppercase tracking-widest text-gray-400">
        {formatSummaryLabel(
          label
        )}
      </p>

      <p className="mt-1 wrap-break- text-[10px] font-semibold leading-5 text-gray-700">
        {formatPdfReadyValue(
          value
        )}
      </p>
    </div>
  );
};


/**
 * ---------------------------------------------------------
 * PDF_READY TABLE
 * ---------------------------------------------------------
 *
 * Arrays containing object rows are presented as tables.
 *
 * No columns are invented. Columns come from the actual
 * keys present in backend-returned rows.
 */

const PdfReadyTable = ({
  rows,
}) => {
  if (
    !Array.isArray(rows) ||
    rows.length === 0
  ) {
    return null;
  }

  const objectRows =
    rows.filter(
      (row) =>
        row &&
        typeof row ===
          "object" &&
        !Array.isArray(row)
    );

  if (
    objectRows.length !==
    rows.length
  ) {
    return null;
  }

  const columns =
    Array.from(
      new Set(
        objectRows.flatMap(
          (row) =>
            Object.keys(row)
        )
      )
    );

  if (
    columns.length === 0
  ) {
    return null;
  }

  /**
   * Preview is intentionally bounded.
   *
   * Backend export remains unchanged.
   */
  const previewRows =
    objectRows.slice(0, 20);

  return (
    <div className="w-full overflow-x-auto overscroll-x-contain">
      <table className="min-w-max w-full">
        <thead>
          <tr className="border-b border-gray-200 bg-gray-50">
            {columns.map(
              (column) => (
                <th
                  key={column}
                  className="whitespace-nowrap px-3 py-2.5 text-[8px] font-black uppercase tracking-wide text-gray-500"
                >
                  {formatSummaryLabel(
                    column
                  )}
                </th>
              )
            )}
          </tr>
        </thead>

        <tbody>
          {previewRows.map(
            (
              row,
              rowIndex
            ) => (
              <tr
                key={rowIndex}
                className="border-b border-gray-100 last:border-b-0"
              >
                {columns.map(
                  (column) => (
                    <td
                      key={`${rowIndex}-${column}`}
                      className="max-w-[260px] wrap-break- px-3 py-2.5 align-top text-[9px] leading-4 text-gray-600"
                    >
                      {formatCsvPreviewValue(
                        row?.[
                          column
                        ]
                      )}
                    </td>
                  )
                )}
              </tr>
            )
          )}
        </tbody>
      </table>

      {rows.length > 20 && (
        <div className="border-t border-gray-200 bg-gray-50 px-3 py-2">
          <p className="text-[8px] text-gray-500">
            Previewing 20 of{" "}
            {rows.length} rows.
          </p>
        </div>
      )}
    </div>
  );
};


/**
 * ---------------------------------------------------------
 * RECURSIVE PDF_READY CONTENT
 * ---------------------------------------------------------
 *
 * We intentionally avoid hard-coding an assumed payload
 * schema.
 *
 * The renderer handles:
 *
 * - primitives
 * - objects
 * - primitive arrays
 * - object arrays
 * - nested structures
 *
 * All values originate from the backend response.
 */

const PdfReadyContent = ({
  value,
  depth = 0,
}) => {
  if (
    isEmptyPdfReadyValue(
      value
    )
  ) {
    return null;
  }

  /**
   * Primitive value.
   */
  if (
    typeof value !== "object"
  ) {
    return (
      <p className="wrap-break- text-[10px] leading-5 text-gray-700">
        {formatPdfReadyValue(
          value
        )}
      </p>
    );
  }

  /**
   * Array.
   */
  if (
    Array.isArray(value)
  ) {
    const canRenderTable =
      value.length > 0 &&
      value.every(
        (item) =>
          item &&
          typeof item ===
            "object" &&
          !Array.isArray(item)
      );

    if (canRenderTable) {
      return (
        <PdfReadyTable
          rows={value}
        />
      );
    }

    return (
      <div className="space-y-2">
        {value.map(
          (item, index) => {
            if (
              item &&
              typeof item ===
                "object"
            ) {
              return (
                <div
                  key={index}
                  className="rounded-xl border border-gray-200 bg-gray-50 p-3"
                >
                  <PdfReadyContent
                    value={item}
                    depth={
                      depth + 1
                    }
                  />
                </div>
              );
            }

            return (
              <div
                key={index}
                className="flex items-start gap-2"
              >
                <span className="mt-[7px] h-1.5 w-1.5 shrink-0 rounded-full bg-[#9A5D37]" />

                <p className="text-[10px] leading-5 text-gray-700">
                  {formatPdfReadyValue(
                    item
                  )}
                </p>
              </div>
            );
          }
        )}
      </div>
    );
  }

  /**
   * Object.
   */
  const entries =
    Object.entries(value).filter(
      ([, entryValue]) =>
        !isEmptyPdfReadyValue(
          entryValue
        )
    );

  if (
    entries.length === 0
  ) {
    return null;
  }

  const primitiveEntries =
    entries.filter(
      ([, entryValue]) =>
        typeof entryValue !==
          "object" ||
        entryValue === null
    );

  const nestedEntries =
    entries.filter(
      ([, entryValue]) =>
        entryValue &&
        typeof entryValue ===
          "object"
    );

  return (
    <div className="space-y-4">
      {primitiveEntries.length >
        0 && (
        <div>
          {primitiveEntries.map(
            ([
              key,
              entryValue,
            ]) => (
              <PdfReadyField
                key={key}
                label={key}
                value={
                  entryValue
                }
              />
            )
          )}
        </div>
      )}

      {nestedEntries.map(
        ([
          key,
          entryValue,
        ]) => (
          <div
            key={key}
            className={
              depth === 0
                ? "rounded-xl border border-gray-200 bg-white p-4"
                : "border-l-2 border-gray-200 pl-4"
            }
          >
            <h4 className="mb-3 text-[9px] font-black uppercase tracking-widest text-[#5B1725]">
              {formatSummaryLabel(
                key
              )}
            </h4>

            <PdfReadyContent
              value={
                entryValue
              }
              depth={
                depth + 1
              }
            />
          </div>
        )
      )}
    </div>
  );
};


/**
 * ---------------------------------------------------------
 * DOCUMENT PREVIEW
 * ---------------------------------------------------------
 *
 * This intentionally looks like a document/page while
 * remaining ordinary React UI.
 *
 * It is NOT a PDF renderer.
 */

const ReportPdfReadyDocument = ({
  payload,
}) => {
  return (
    <div className="overflow-auto rounded-2xl border border-[#D8C7C0] bg-[#EDE9E7] p-3 sm:p-5">
      <div className="mx-auto min-h-[720px] w-full max-w-[820px] bg-white shadow-lg">
        <div className="border-b-4 border-[#5B1725] px-5 py-6 sm:px-8 sm:py-8">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <p className="text-[9px] font-black uppercase tracking-[0.16em] text-[#9A5D37]">
                Business Report
              </p>

              <h3 className="mt-2 text-xl font-black text-[#3D0F18] sm:text-2xl">
                PDF-ready preview
              </h3>

              <p className="mt-2 max-w-xl text-[10px] leading-5 text-gray-500">
                Structured report
                content prepared by
                the backend for
                document rendering.
              </p>
            </div>

            <span className="w-fit rounded-full bg-[#F5E8EB] px-3 py-1.5 text-[8px] font-black uppercase tracking-wide text-[#5B1725]">
              Preview
            </span>
          </div>
        </div>

        <div className="p-5 sm:p-8">
          <PdfReadyContent
            value={payload}
          />
        </div>

        <div className="mt-8 border-t border-gray-200 px-5 py-4 sm:px-8">
          <p className="text-center text-[8px] leading-4 text-gray-400">
            Structured PDF-ready
            preview. This browser
            view is not the final
            binary PDF document.
          </p>
        </div>
      </div>
    </div>
  );
};


/**
 * ---------------------------------------------------------
 * MAIN 9.11.20.14 COMPONENT
 * ---------------------------------------------------------
 */

const ReportPdfReadyExperience = ({
  reportExport,
  loading,
  error,
  response,
  onGenerate,
  onDownload,
}) => {
  const exportMetadata =
    response?.success === true &&
    response?.export &&
    typeof response.export ===
      "object"
      ? response.export
      : null;

  const exportPayload =
    response?.success === true
      ? response.data
      : undefined;

  const previewReady =
    Boolean(
      exportMetadata &&
      exportMetadata.format ===
        BUSINESS_REPORT_FORMATS.PDF_READY &&
      exportPayload !==
        undefined
    );

  return (
    <section className="mt-6 overflow-hidden rounded-2xl sm:rounded-3xl border border-[#D8C7C0] bg-white shadow-sm">
      <div className="h-1 bg-linear-to-r from-[#5B1725] via-[#8A2638] to-[#D6B15E]" />

      <div className="border-b border-[#EEE6E2] bg-[#FAF8F7] p-4 sm:p-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex items-start gap-4">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[#F5E8EB]">
              <FileText
                size={19}
                className="text-[#5B1725]"
              />
            </div>

            <div>
              <p className="text-[9px] font-black uppercase tracking-[0.14em] text-[#9A5D37]">
                PDF_READY
              </p>

              <h2 className="mt-1 text-lg font-black text-[#3D0F18] sm:text-xl">
                Document preview
              </h2>

              <p className="mt-1 max-w-2xl text-[10px] leading-5 text-gray-500">
                Preview the
                structured,
                bounded report data
                prepared by the
                backend for later
                document rendering.
              </p>
            </div>
          </div>

          <span
            className={`inline-flex w-fit items-center gap-1.5 rounded-full px-3 py-1.5 text-[9px] font-black ${
              reportExport
                ? "bg-emerald-50 text-emerald-700"
                : "bg-gray-100 text-gray-500"
            }`}
          >
            {reportExport && (
              <CheckCircle2
                size={11}
              />
            )}

            {reportExport
              ? "Preview enabled"
              : "Preview unavailable"}
          </span>
        </div>
      </div>

      <div className="p-4 sm:p-6">
        <div className="rounded-2xl border border-[#E8DFDB] bg-[#FAF8F7] p-4 sm:p-5">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-xs font-black text-[#3D0F18]">
                {loading
                  ? "Preparing PDF-ready preview..."
                  : previewReady
                    ? "PDF-ready preview available"
                    : "Prepare document preview"}
              </p>

              <p className="mt-1 max-w-xl text-[10px] leading-5 text-gray-500">
                {loading
                  ? "The protected report API is preparing the structured PDF-ready payload."
                  : previewReady
                    ? "The backend PDF-ready representation has been returned successfully."
                    : "Request the structured PDF-ready representation for this generated report."}
              </p>
            </div>

            <button
              type="button"
              disabled={
                !reportExport ||
                loading
              }
              onClick={
                onGenerate
              }
              className={`inline-flex min-h-11 w-full sm:w-auto shrink-0 items-center justify-center gap-2 rounded-xl px-5 py-3 text-[10px] font-black transition ${
                reportExport &&
                !loading
                  ? "bg-[#5B1725] text-white shadow-sm hover:bg-[#46111C]"
                  : "cursor-not-allowed bg-gray-200 text-gray-400"
              }`}
            >
              {loading ? (
                <>
                  <RefreshCw
                    size={14}
                    className="animate-spin"
                  />

                  Preparing...
                </>
              ) : previewReady ? (
                <>
                  <RefreshCw
                    size={14}
                  />

                  Refresh Preview
                </>
              ) : (
                <>
                  <FileText
                    size={14}
                  />

                  Prepare Preview
                </>
              )}
            </button>
          </div>
        </div>

        {loading && (
          <ReportExportLoadingState
            label="PDF-ready preview"
          />
        )}

        {error && (
          <div
            role="alert"
            className="mt-4 rounded-2xl border border-red-200 bg-red-50 p-4"
          >
            <p className="text-[10px] font-black text-red-800">
              PDF-ready preview
              failed
            </p>

            <p className="mt-1 text-[10px] leading-5 text-red-700">
              {error}
            </p>
          </div>
        )}

        {!loading &&
        !error &&
        response?.success === true &&
        !previewReady && (
          <ReportExportEmptyState
            title="No PDF-ready preview available"
            description="The request completed, but no structured PDF-ready payload is available to preview."
          />
        )}

        {previewReady && (
        <div className="mt-4 flex justify-end">
            <button
            type="button"
            onClick={onDownload}
            className="inline-flex min-h-11 w-full sm:w-auto items-center justify-center gap-2 rounded-xl border border-[#5B1725] bg-white px-4 py-2.5 text-[10px] font-black text-[#5B1725] transition hover:bg-[#F5E8EB]"
            >
            <Download size={14} />
            Download PDF-ready Data
            </button>
        </div>
        )}

        {previewReady && (
          <div className="mt-5 grid gap-5 xl:grid-cols-[300px_minmax(0,1fr)]">
            <ReportPdfReadyMetadata
              metadata={
                exportMetadata
              }
            />

            <ReportPdfReadyDocument
              payload={
                exportPayload
              }
            />
          </div>
        )}

        <div className="mt-5 flex items-start gap-3 rounded-xl border border-[#E8DFDB] bg-[#FAF8F7] p-4">
          <ShieldCheck
            size={16}
            className="mt-0.5 shrink-0 text-[#5B1725]"
          />

          <p className="text-[9px] leading-5 text-gray-500">
            PDF_READY is
            structured report data,
            not a binary PDF. The
            preview above presents
            only information
            returned by the backend
            reporting service. No
            analytics or missing
            report values are
            generated in the
            browser.
          </p>
        </div>
      </div>
    </section>
  );
};

/**
 * =========================================================
 * 9.11.20.15 — EXPORT DOWNLOAD UX
 * =========================================================
 *
 * PURPOSE
 *
 * Download export payloads that have already been returned
 * by the protected backend reporting service.
 *
 * IMPORTANT
 *
 * The frontend does NOT:
 *
 * - calculate report analytics
 * - reconstruct the canonical report
 * - create missing report sections
 * - pretend PDF_READY is a binary PDF
 *
 * The browser only serializes already-returned export data
 * into downloadable local files.
 */


/**
 * ---------------------------------------------------------
 * SAFE CLIENT FILE NAME
 * ---------------------------------------------------------
 *
 * Backend remains responsible for its own safe filename.
 *
 * This frontend sanitization is an additional browser-side
 * safeguard before assigning a value to anchor.download.
 */

const sanitizeDownloadFileName = (
  value,
  fallback = "business-report"
) => {
  const source =
    typeof value === "string" &&
    value.trim()
      ? value.trim()
      : fallback;

  const cleaned = source
    .replace(/[<>:"/\\|?*\u0000-\u001F]/g, "-")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^\.+/, "")
    .slice(0, 180);

  return (
    cleaned ||
    fallback
  );
};


/**
 * ---------------------------------------------------------
 * FILE EXTENSION HELPERS
 * ---------------------------------------------------------
 */

const stripDownloadExtension = (
  fileName
) =>
  String(
    fileName || ""
  ).replace(
    /\.[^.]+$/,
    ""
  );

const ensureDownloadExtension = (
  fileName,
  extension
) => {
  const safeExtension =
    String(
      extension || ""
    )
      .replace(/^\./, "")
      .toLowerCase();

  const safeName =
    sanitizeDownloadFileName(
      fileName
    );

  if (!safeExtension) {
    return safeName;
  }

  if (
    safeName
      .toLowerCase()
      .endsWith(
        `.${safeExtension}`
      )
  ) {
    return safeName;
  }

  return `${stripDownloadExtension(
    safeName
  )}.${safeExtension}`;
};


/**
 * ---------------------------------------------------------
 * GENERIC BROWSER DOWNLOAD
 * ---------------------------------------------------------
 */

const downloadReportBlob = ({
  content,
  fileName,
  mimeType,
}) => {
  const blob =
    content instanceof Blob
      ? content
      : new Blob(
          [content],
          {
            type:
              mimeType ||
              "application/octet-stream",
          }
        );

  const objectUrl =
    URL.createObjectURL(
      blob
    );

  const anchor =
    document.createElement(
      "a"
    );

  anchor.href =
    objectUrl;

  anchor.download =
    sanitizeDownloadFileName(
      fileName
    );

  anchor.style.display =
    "none";

  document.body.appendChild(
    anchor
  );

  anchor.click();

  anchor.remove();

  /**
   * Delay revocation until the browser has had an
   * opportunity to begin consuming the object URL.
   */
  window.setTimeout(
    () => {
      URL.revokeObjectURL(
        objectUrl
      );
    },
    1000
  );
};


/**
 * ---------------------------------------------------------
 * JSON SERIALIZATION
 * ---------------------------------------------------------
 */

const serializeJsonDownload = (
  payload
) => {
  try {
    return JSON.stringify(
      payload,
      null,
      2
    );
  } catch (err) {
    console.error(
      "SERIALIZE REPORT JSON DOWNLOAD ERROR:",
      err
    );

    throw new Error(
      "The report JSON could not be prepared for download."
    );
  }
};


/**
 * ---------------------------------------------------------
 * CSV DOWNLOAD SERIALIZATION
 * ---------------------------------------------------------
 *
 * IMPORTANT:
 *
 * CSV security belongs to the backend serializer.
 *
 * We do NOT apply formula-injection rules here because doing
 * so could mutate backend-owned CSV values.
 *
 * If the backend has already returned a CSV string, we use
 * that string unchanged.
 *
 * Structured row datasets are serialized only so the browser
 * can materialize the backend-returned dataset as a file.
 */

const escapeCsvDownloadValue = (
  value
) => {
  if (
    value === null ||
    value === undefined
  ) {
    return "";
  }

  let stringValue;

  if (
    typeof value === "object"
  ) {
    try {
      stringValue =
        JSON.stringify(
          value
        );
    } catch {
      stringValue =
        String(value);
    }
  } else {
    stringValue =
      String(value);
  }

  /**
   * Standard CSV quoting only.
   *
   * No analytics or security transformation is performed
   * here.
   */
  if (
    /[",\r\n]/.test(
      stringValue
    )
  ) {
    return `"${stringValue.replace(
      /"/g,
      '""'
    )}"`;
  }

  return stringValue;
};

const serializeCsvRowsForDownload = (
  rows
) => {
  if (
    !Array.isArray(rows)
  ) {
    return "";
  }

  if (
    rows.length === 0
  ) {
    return "";
  }

  /**
   * Primitive rows.
   */
  const objectRows =
    rows.filter(
      (row) =>
        row &&
        typeof row ===
          "object" &&
        !Array.isArray(row)
    );

  if (
    objectRows.length !==
    rows.length
  ) {
    return [
      "value",
      ...rows.map(
        (row) =>
          escapeCsvDownloadValue(
            row
          )
      ),
    ].join("\r\n");
  }

  /**
   * Object rows.
   *
   * Column names are discovered only from fields already
   * returned by the backend dataset.
   */
  const columns =
    Array.from(
      new Set(
        objectRows.flatMap(
          (row) =>
            Object.keys(row)
        )
      )
    );

  if (
    columns.length === 0
  ) {
    return "";
  }

  const header =
    columns
      .map(
        escapeCsvDownloadValue
      )
      .join(",");

  const body =
    objectRows.map(
      (row) =>
        columns
          .map(
            (column) =>
              escapeCsvDownloadValue(
                row?.[
                  column
                ]
              )
          )
          .join(",")
    );

  return [
    header,
    ...body,
  ].join("\r\n");
};


/**
 * ---------------------------------------------------------
 * RESOLVE CSV DATASET DOWNLOAD CONTENT
 * ---------------------------------------------------------
 */

const getCsvDatasetDownloadContent = (
  value
) => {
  /**
   * If backend returned serialized CSV text, preserve it
   * exactly.
   */
  if (
    typeof value === "string"
  ) {
    return value;
  }

  if (
    Array.isArray(value)
  ) {
    return serializeCsvRowsForDownload(
      value
    );
  }

  if (
    value &&
    typeof value ===
      "object"
  ) {
    /**
     * Prefer explicit backend CSV content when available.
     */
    const explicitCsv =
      [
        value.csv,
        value.content,
        value.text,
      ].find(
        (candidate) =>
          typeof candidate ===
          "string"
      );

    if (
      explicitCsv !==
      undefined
    ) {
      return explicitCsv;
    }

    const rows =
      getCsvDatasetRows(
        value
      );

    if (
      rows.length > 0
    ) {
      return serializeCsvRowsForDownload(
        rows
      );
    }
  }

  return "";
};


/**
 * ---------------------------------------------------------
 * JSON DOWNLOAD
 * ---------------------------------------------------------
 */

const downloadJsonExport = (
  response
) => {
  if (
    response?.success !==
      true ||
    response?.export?.format !==
      BUSINESS_REPORT_FORMATS.JSON ||
    response?.data ===
      undefined
  ) {
    throw new Error(
      "A prepared JSON export is required before downloading."
    );
  }

  const metadata =
    response.export;

  const fileName =
    ensureDownloadExtension(
      metadata.fileName ||
        "business-report",
      metadata.extension ||
        "json"
    );

  const content =
    serializeJsonDownload(
      response.data
    );

  downloadReportBlob({
    content,
    fileName,
    mimeType:
      metadata.mimeType ||
      "application/json;charset=utf-8",
  });
};


/**
 * ---------------------------------------------------------
 * CSV MULTI-DATASET DOWNLOAD
 * ---------------------------------------------------------
 */

const downloadCsvExport = (
  response
) => {
  if (
    response?.success !==
      true ||
    response?.export?.format !==
      BUSINESS_REPORT_FORMATS.CSV ||
    response?.data ===
      undefined
  ) {
    throw new Error(
      "A prepared CSV export is required before downloading."
    );
  }

  const metadata =
    response.export;

  const datasets =
    normalizeCsvExportDatasets(
      response.data
    );

  if (
    datasets.length === 0
  ) {
    throw new Error(
      "The CSV export does not contain any downloadable datasets."
    );
  }

  const baseFileName =
    stripDownloadExtension(
      sanitizeDownloadFileName(
        metadata.fileName ||
          "business-report"
      )
    );

  let downloadedCount = 0;

  datasets.forEach(
    (dataset, index) => {
      const content =
        getCsvDatasetDownloadContent(
          dataset.value
        );

      if (
        typeof content !==
          "string"
      ) {
        return;
      }

      /**
       * Empty CSV is still valid if the backend explicitly
       * returned an empty string.
       */
      const datasetName =
        sanitizeDownloadFileName(
          dataset.name ||
            `dataset-${
              index + 1
            }`,
          `dataset-${
            index + 1
          }`
        );

      const fileName =
        datasets.length === 1
          ? ensureDownloadExtension(
              baseFileName,
              "csv"
            )
          : ensureDownloadExtension(
              `${baseFileName}-${datasetName}`,
              "csv"
            );

      downloadReportBlob({
        content,
        fileName,
        mimeType:
          "text/csv;charset=utf-8",
      });

      downloadedCount += 1;
    }
  );

  if (
    downloadedCount === 0
  ) {
    throw new Error(
      "The CSV datasets could not be prepared for download."
    );
  }

  return downloadedCount;
};


/**
 * ---------------------------------------------------------
 * PDF_READY DOWNLOAD
 * ---------------------------------------------------------
 *
 * IMPORTANT:
 *
 * We download PDF_READY as structured JSON.
 *
 * We MUST NOT give it a .pdf extension because the backend
 * has not returned binary PDF bytes.
 */

const downloadPdfReadyExport = (
  response
) => {
  if (
    response?.success !==
      true ||
    response?.export?.format !==
      BUSINESS_REPORT_FORMATS.PDF_READY ||
    response?.data ===
      undefined
  ) {
    throw new Error(
      "A prepared PDF-ready export is required before downloading."
    );
  }

  const metadata =
    response.export;

  const backendName =
    metadata.fileName ||
    "business-report-pdf-ready";

  const baseName =
    stripDownloadExtension(
      backendName
    );

  const fileName =
    ensureDownloadExtension(
      `${baseName}-pdf-ready`,
      "json"
    );

  const content =
    serializeJsonDownload(
      response.data
    );

  downloadReportBlob({
    content,
    fileName,
    mimeType:
      "application/json;charset=utf-8",
  });
};

/**
 * =========================================================
 * 9.11.20.16 — LOADING / ERROR / EMPTY STATES
 * =========================================================
 */


/**
 * ---------------------------------------------------------
 * SKELETON BLOCK
 * ---------------------------------------------------------
 */

const ReportSkeletonBlock = ({
  className = "",
}) => (
  <div
    aria-hidden="true"
    className={`animate-pulse rounded-lg bg-gray-200 ${className}`}
  />
);


/**
 * ---------------------------------------------------------
 * GENERATED REPORT LOADING
 * ---------------------------------------------------------
 */

const GeneratedReportLoadingState = ({
  reportTitle,
}) => (
  <section
    role="status"
    aria-live="polite"
    aria-busy="true"
    className="mt-6 overflow-hidden rounded-3xl border border-[#D8C7C0] bg-white shadow-sm"
  >
    <div className="h-1 bg-gradient-to-r from-[#5B1725] via-[#8A2638] to-[#D6B15E]" />

    <div className="p-5 sm:p-6">
      <div className="flex items-start gap-4">
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[#F5E8EB]">
          <RefreshCw
            size={18}
            className="animate-spin text-[#5B1725]"
          />
        </div>

        <div className="flex-1">
          <p className="text-[9px] font-black uppercase tracking-[0.14em] text-[#9A5D37]">
            Generating Report
          </p>

          <h2 className="mt-1 text-lg font-black text-[#3D0F18]">
            Preparing your report
          </h2>

          <p className="mt-1 text-[10px] leading-5 text-gray-500">
            {reportTitle
              ? `Preparing ${reportTitle} using the selected reporting period.`
              : "Preparing the selected business report."}
          </p>
        </div>
      </div>

      <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[1, 2, 3, 4].map((item) => (
          <div
            key={item}
            className="rounded-2xl border border-[#EEE6E2] p-4"
          >
            <ReportSkeletonBlock className="h-2 w-20" />
            <ReportSkeletonBlock className="mt-4 h-7 w-24" />
            <ReportSkeletonBlock className="mt-3 h-2 w-full" />
          </div>
        ))}
      </div>

      <div className="mt-4 rounded-2xl border border-[#EEE6E2] p-4">
        <ReportSkeletonBlock className="h-3 w-40" />

        <div className="mt-5 space-y-3">
          <ReportSkeletonBlock className="h-2 w-full" />
          <ReportSkeletonBlock className="h-2 w-[92%]" />
          <ReportSkeletonBlock className="h-2 w-[76%]" />
        </div>
      </div>
    </div>
  </section>
);


/**
 * ---------------------------------------------------------
 * GENERATED REPORT ERROR
 * ---------------------------------------------------------
 */

const GeneratedReportErrorState = ({
  message,
  onRetry,
}) => (
  <section
    role="alert"
    className="mt-6 rounded-2xl border border-red-200 bg-red-50 p-5 sm:p-6"
  >
    <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
      <div>
        <p className="text-[9px] font-black uppercase tracking-[0.12em] text-red-700">
          Report Generation Failed
        </p>

        <h3 className="mt-1 text-sm font-black text-red-950">
          We couldn't generate this report
        </h3>

        <p className="mt-2 max-w-2xl text-[10px] leading-5 text-red-700">
          {message ||
            "The report could not be generated. Please try again."}
        </p>
      </div>

      {typeof onRetry === "function" && (
        <button
          type="button"
          onClick={onRetry}
          className="inline-flex shrink-0 items-center justify-center gap-2 rounded-xl border border-red-300 bg-white px-4 py-2.5 text-[10px] font-black text-red-800 transition hover:bg-red-100"
        >
          <RefreshCw size={13} />
          Try Again
        </button>
      )}
    </div>
  </section>
);


/**
 * ---------------------------------------------------------
 * GENERATED REPORT EMPTY
 * ---------------------------------------------------------
 */

const GeneratedReportEmptyState = ({
  reportTitle,
  onRetry,
}) => (
  <section className="mt-6 rounded-2xl border border-dashed border-[#D8C7C0] bg-[#FAF8F7] p-6 text-center sm:p-8">
    <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-white shadow-sm">
      <FileBarChart
        size={20}
        className="text-[#9A5D37]"
      />
    </div>

    <p className="mt-4 text-[9px] font-black uppercase tracking-[0.12em] text-[#9A5D37]">
      No Report Data
    </p>

    <h3 className="mt-1 text-sm font-black text-[#3D0F18]">
      Nothing is available to display
    </h3>

    <p className="mx-auto mt-2 max-w-xl text-[10px] leading-5 text-gray-500">
      {reportTitle
        ? `${reportTitle} was requested successfully, but no canonical report payload is available for this period.`
        : "The report request completed, but no canonical report payload is available."}
    </p>

    {typeof onRetry === "function" && (
      <button
        type="button"
        onClick={onRetry}
        className="mt-4 inline-flex items-center justify-center gap-2 rounded-xl bg-[#5B1725] px-4 py-2.5 text-[10px] font-black text-white transition hover:bg-[#46111C]"
      >
        <RefreshCw size={13} />
        Generate Again
      </button>
    )}
  </section>
);


/**
 * ---------------------------------------------------------
 * GENERIC SECTION EMPTY
 * ---------------------------------------------------------
 */

const ReportSectionEmptyState = ({
  title,
  description,
  icon: Icon = FileBarChart,
}) => (
  <div className="rounded-2xl border border-dashed border-[#D8C7C0] bg-[#FAF8F7] p-5">
    <div className="flex items-start gap-3">
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white">
        <Icon
          size={17}
          className="text-[#9A5D37]"
        />
      </div>

      <div>
        <p className="text-xs font-black text-[#3D0F18]">
          {title}
        </p>

        <p className="mt-1 text-[10px] leading-5 text-gray-500">
          {description}
        </p>
      </div>
    </div>
  </div>
);


/**
 * ---------------------------------------------------------
 * EXPORT LOADING
 * ---------------------------------------------------------
 */

const ReportExportLoadingState = ({
  label = "export",
}) => (
  <div
    role="status"
    aria-live="polite"
    aria-busy="true"
    className="mt-4 rounded-2xl border border-[#E8DFDB] bg-[#FAF8F7] p-4"
  >
    <div className="flex items-center gap-3">
      <RefreshCw
        size={15}
        className="animate-spin text-[#5B1725]"
      />

      <div>
        <p className="text-[10px] font-black text-[#3D0F18]">
          Preparing {label}
        </p>

        <p className="mt-0.5 text-[9px] text-gray-500">
          Waiting for the protected report service.
        </p>
      </div>
    </div>

    <div className="mt-4 space-y-2">
      <ReportSkeletonBlock className="h-2 w-full" />
      <ReportSkeletonBlock className="h-2 w-[85%]" />
      <ReportSkeletonBlock className="h-2 w-[65%]" />
    </div>
  </div>
);


/**
 * ---------------------------------------------------------
 * EXPORT EMPTY
 * ---------------------------------------------------------
 */

const ReportExportEmptyState = ({
  title,
  description,
}) => (
  <div className="mt-4 rounded-2xl border border-dashed border-[#D8C7C0] bg-[#FAF8F7] p-4">
    <p className="text-[10px] font-black text-[#3D0F18]">
      {title}
    </p>

    <p className="mt-1 text-[9px] leading-5 text-gray-500">
      {description}
    </p>
  </div>
);

const LockedCapability = ({ icon: Icon, title, description }) => (
  <div className="relative overflow-hidden rounded-2xl border border-[#E8DFDB] bg-white p-5 shadow-sm">
    <div className="absolute right-4 top-4 flex h-7 w-7 items-center justify-center rounded-lg bg-gray-50">
      <LockKeyhole size={13} className="text-gray-400" />
    </div>

    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#F4F1F0]">
      <Icon size={18} className="text-gray-500" />
    </div>

    <h3 className="mt-4 pr-8 text-sm font-black text-[#3D0F18]">
      {title}
    </h3>

    <p className="mt-1.5 text-[11px] leading-5 text-gray-500">
      {description}
    </p>
  </div>
);

const UnlockedCapability = ({ icon: Icon, title, description }) => (
  <div className="rounded-2xl border border-[#E8DFDB] bg-white p-5 shadow-sm transition duration-200 hover:-translate-y-0.5 hover:shadow-md">
    <div className="flex items-start justify-between gap-3">
      <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#F5E8EB]">
        <Icon size={19} className="text-[#5B1725]" />
      </div>

      <CheckCircle2 size={17} className="text-emerald-600" />
    </div>

    <h3 className="mt-4 text-sm font-black text-[#3D0F18]">
      {title}
    </h3>

    <p className="mt-1.5 text-[11px] leading-5 text-gray-500">
      {description}
    </p>
  </div>
);

const BusinessReportsLoading = () => (
  <ReportsPageShell>
    <div className="animate-pulse">
      <div className="h-4 w-44 rounded bg-[#E8DFDB]" />
      <div className="mt-7 h-8 w-64 max-w-full rounded bg-[#E8DFDB]" />
      <div className="mt-3 h-4 w-96 max-w-full rounded bg-[#EEE8E5]" />

      <div className="mt-8 overflow-hidden rounded-3xl border border-[#E8DFDB] bg-white">
        <div className="h-1 bg-[#E8DFDB]" />

        <div className="p-6 sm:p-8">
          <div className="flex items-start gap-4">
            <div className="h-14 w-14 shrink-0 rounded-2xl bg-[#E8DFDB]" />

            <div className="flex-1">
              <div className="h-4 w-36 rounded bg-[#E8DFDB]" />
              <div className="mt-3 h-6 w-72 max-w-full rounded bg-[#E8DFDB]" />
              <div className="mt-4 h-3 w-full max-w-xl rounded bg-[#EEE8E5]" />
              <div className="mt-2 h-3 w-3/4 max-w-lg rounded bg-[#EEE8E5]" />
            </div>
          </div>
        </div>
      </div>

      <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, index) => (
          <div
            key={index}
            className="h-36 rounded-2xl border border-[#E8DFDB] bg-white"
          />
        ))}
      </div>
    </div>
  </ReportsPageShell>
);

const BusinessReportsError = ({ message, onRetry }) => (
  <ReportsPageShell>
    <Link
      to="/business/dashboard"
      className="inline-flex items-center gap-2 text-xs font-bold text-[#6B1D2C] transition hover:text-[#3D0F18]"
    >
      <ArrowLeft size={15} />
      Back to Business Dashboard
    </Link>

    <div className="mx-auto mt-16 max-w-xl overflow-hidden rounded-3xl border border-[#E8DFDB] bg-white shadow-sm">
      <div className="h-1 bg-red-500" />

      <div className="p-7 text-center sm:p-9">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-red-50">
          <FileBarChart size={25} className="text-red-700" />
        </div>

        <h1 className="mt-5 text-xl font-black text-[#3D0F18]">
          We couldn't load your reports
        </h1>

        <p className="mx-auto mt-2 max-w-md text-xs leading-5 text-gray-500">
          {message}
        </p>

        <button
          type="button"
          onClick={onRetry}
          className="mt-6 inline-flex items-center justify-center gap-2 rounded-xl bg-[#5B1725] px-5 py-3 text-xs font-black text-white shadow-sm transition hover:bg-[#46111C]"
        >
          <RefreshCw size={14} />
          Try Again
        </button>
      </div>
    </div>
  </ReportsPageShell>
);

export default BusinessReports;