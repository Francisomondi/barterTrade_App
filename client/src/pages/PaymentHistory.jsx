
import { useEffect, useState } from "react";

import { getMyPayments } from "../api/paymentApi";

const PaymentHistory = () => {
  const [payments, setPayments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState(
    {
      page: 1,
      limit: 10,
      total: 0,
      totalPages: 0,
      hasNextPage: false,
      hasPreviousPage: false,
    });
  const [statusFilter, setStatusFilter] = useState("");

  const loadPayments = async () => {
    try {
      setLoading(true);
      setError("");

      const response = await getMyPayments({
          page,
          limit: 10,
          status: statusFilter,
        });

      setPayments(response?.payments || []);

      setPagination(response?.pagination || {
          page,
          limit: 10,
          total: 0,
          totalPages: 0,
          hasNextPage: false,
          hasPreviousPage: false,
        }
      );
    } catch (error) {
      console.error("Load payment history error:", error);
      setError(error.response?.data?.message || "Unable to load payment history.");
      
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadPayments();
  }, [page, statusFilter]);

  const formatDate = (date) => {
    if (!date) {
      return "—";
    }

    return new Date(date).toLocaleString(
      "en-KE",
      {
        dateStyle: "medium",
        timeStyle: "short",
      }
    );
  };

  const formatType = (type) => {
    if (!type) {
      return "Payment";
    }

    return type
      .replace(/_/g, " ")
      .toLowerCase()
      .replace(/\b\w/g, (letter) =>
        letter.toUpperCase()
      );
  };

  const statusClasses = (status) => {
    switch (status) {
      case "COMPLETED":
        return "bg-green-100 text-green-700";

      case "PENDING":
        return "bg-yellow-100 text-yellow-700";

      case "FAILED":
        return "bg-red-100 text-red-700";

      case "REFUNDED":
        return "bg-blue-100 text-blue-700";

      case "CANCELLED":
        return "bg-gray-100 text-gray-700";

      default:
        return "bg-gray-100 text-gray-700";
    }
  };

  return (
    <div className="min-h-screen bg-[#F8F5F3] px-4 py-8 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-6xl">
        {/* Header */}
        <div className="mb-8">
          <p className="text-sm font-semibold uppercase tracking-wide text-[#8A2638]">
            Payments
          </p>

          <h1 className="mt-1 text-3xl font-bold text-[#3D0F18]">
            Payment History
          </h1>

          <p className="mt-2 text-sm text-gray-600">
            View your M-PESA payments and
            transaction receipts.
          </p>
        </div>

        {/* Filters */}
        <div className="mb-6 rounded-2xl bg-white p-4 shadow-sm">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <label className="text-sm font-semibold text-gray-700">
              Filter by status
            </label>

            <select
              value={statusFilter}
              onChange={(event) => {
                setPage(1);
                setStatusFilter(
                  event.target.value
                );
              }}
              className="rounded-xl border border-gray-300 px-4 py-2 text-sm outline-none focus:border-[#8A2638]"
            >
              <option value="">
                All Payments
              </option>

              <option value="COMPLETED">
                Completed
              </option>

              <option value="PENDING">
                Pending
              </option>

              <option value="FAILED">
                Failed
              </option>

              <option value="REFUNDED">
                Refunded
              </option>

              <option value="CANCELLED">
                Cancelled
              </option>
            </select>
          </div>
        </div>

        {/* Error */}
        {error && (
          <div className="mb-6 rounded-xl border border-red-200 bg-red-50 p-4">
            <p className="text-sm font-semibold text-red-700">
              {error}
            </p>
          </div>
        )}

        {/* Loading */}
        {loading && (
          <div className="rounded-2xl bg-white p-10 text-center shadow-sm">
            <p className="text-sm text-gray-500">
              Loading payment history...
            </p>
          </div>
        )}

        {/* Empty */}
        {!loading &&
          payments.length === 0 && (
            <div className="rounded-2xl bg-white p-10 text-center shadow-sm">
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-[#F8F5F3] text-2xl">
                ₭
              </div>

              <h2 className="mt-4 text-lg font-bold text-[#3D0F18]">
                No payments found
              </h2>

              <p className="mt-1 text-sm text-gray-500">
                Your payment transactions will
                appear here.
              </p>
            </div>
          )}

        {/* Desktop table */}
        {!loading &&
          payments.length > 0 && (
            <div className="hidden overflow-hidden rounded-2xl bg-white shadow-sm md:block">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-[#F8F5F3]">
                    <tr>
                      <th className="px-5 py-4 text-left text-xs font-bold uppercase tracking-wide text-gray-500">
                        Payment
                      </th>

                      <th className="px-5 py-4 text-left text-xs font-bold uppercase tracking-wide text-gray-500">
                        Amount
                      </th>

                      <th className="px-5 py-4 text-left text-xs font-bold uppercase tracking-wide text-gray-500">
                        Status
                      </th>

                      <th className="px-5 py-4 text-left text-xs font-bold uppercase tracking-wide text-gray-500">
                        Receipt
                      </th>

                      <th className="px-5 py-4 text-left text-xs font-bold uppercase tracking-wide text-gray-500">
                        Date
                      </th>
                    </tr>
                  </thead>

                  <tbody className="divide-y divide-gray-100">
                    {payments.map(
                      (payment) => (
                        <tr
                          key={payment.id}
                          className="transition hover:bg-[#F8F5F3]/50"
                        >
                          <td className="px-5 py-4">
                            <p className="font-semibold text-[#3D0F18]">
                              {formatType(
                                payment.type
                              )}
                            </p>

                            <p className="mt-1 text-xs text-gray-500">
                              {payment.description ||
                                "M-PESA Payment"}
                            </p>
                          </td>

                          <td className="px-5 py-4">
                            <p className="font-bold text-gray-800">
                              {payment.currency}{" "}
                              {Number(
                                payment.amount
                              ).toLocaleString()}
                            </p>
                          </td>

                          <td className="px-5 py-4">
                            <span
                              className={`inline-flex rounded-full px-3 py-1 text-xs font-bold ${statusClasses(
                                payment.status
                              )}`}
                            >
                              {payment.status}
                            </span>
                          </td>

                          <td className="px-5 py-4">
                            <span className="font-mono text-sm text-gray-700">
                              {payment.receiptNumber ||
                                "—"}
                            </span>
                          </td>

                          <td className="px-5 py-4 text-sm text-gray-500">
                            {formatDate(
                              payment.createdAt
                            )}
                          </td>
                        </tr>
                      )
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

        {/* Mobile cards */}
        {!loading &&
          payments.length > 0 && (
            <div className="space-y-4 md:hidden">
              {payments.map(
                (payment) => (
                  <div
                    key={payment.id}
                    className="rounded-2xl bg-white p-5 shadow-sm"
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <p className="font-bold text-[#3D0F18]">
                          {formatType(
                            payment.type
                          )}
                        </p>

                        <p className="mt-1 text-xs text-gray-500">
                          {formatDate(
                            payment.createdAt
                          )}
                        </p>
                      </div>

                      <span
                        className={`rounded-full px-3 py-1 text-xs font-bold ${statusClasses(
                          payment.status
                        )}`}
                      >
                        {payment.status}
                      </span>
                    </div>

                    <div className="mt-5 grid grid-cols-2 gap-4">
                      <div>
                        <p className="text-xs text-gray-500">
                          Amount
                        </p>

                        <p className="mt-1 font-bold text-gray-800">
                          {payment.currency}{" "}
                          {Number(
                            payment.amount
                          ).toLocaleString()}
                        </p>
                      </div>

                      <div>
                        <p className="text-xs text-gray-500">
                          Receipt
                        </p>

                        <p className="mt-1 font-mono text-sm font-semibold text-gray-800">
                          {payment.receiptNumber ||
                            "—"}
                        </p>
                      </div>
                    </div>

                    {payment.description && (
                      <p className="mt-4 border-t border-gray-100 pt-4 text-sm text-gray-600">
                        {payment.description}
                      </p>
                    )}
                  </div>
                )
              )}
            </div>
          )}

        {/* Pagination */}
        {!loading &&
          pagination.totalPages > 1 && (
            <div className="mt-6 flex items-center justify-between rounded-2xl bg-white p-4 shadow-sm">
              <button
                type="button"
                disabled={
                  !pagination.hasPreviousPage
                }
                onClick={() =>
                  setPage(
                    (current) =>
                      Math.max(
                        current - 1,
                        1
                      )
                  )
                }
                className="rounded-xl border border-gray-200 px-4 py-2 text-sm font-semibold text-gray-700 transition hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-40"
              >
                ← Previous
              </button>

              <p className="text-sm font-semibold text-gray-600">
                Page {pagination.page} of{" "}
                {pagination.totalPages}
              </p>

              <button
                type="button"
                disabled={
                  !pagination.hasNextPage
                }
                onClick={() =>
                  setPage(
                    (current) =>
                      current + 1
                  )
                }
                className="rounded-xl border border-gray-200 px-4 py-2 text-sm font-semibold text-gray-700 transition hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-40"
              >
                Next →
              </button>
            </div>
          )}
      </div>
    </div>
  );
};

export default PaymentHistory;
