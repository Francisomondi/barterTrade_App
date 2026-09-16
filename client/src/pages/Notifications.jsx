
import { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  deleteNotification,
  getNotifications,
  markAllNotificationsAsRead,
  markNotificationAsRead,
} from "../api/notificationApi";
import { notifyNotificationCountChanged } from "../utils/notificationEvents";

const notificationIcons = {
  OFFER: "🤝",
  MATCH: "🔎",
  TRADE: "🔄",
  MESSAGE: "💬",
  VERIFICATION: "🛡️",
  DISPUTE: "⚠️",
  SYSTEM: "🔔",
};

const notificationTypeLabels = {
  OFFER: "Offer",
  MATCH: "Match",
  TRADE: "Trade",
  MESSAGE: "Message",
  VERIFICATION: "Verification",
  DISPUTE: "Dispute",
  SYSTEM: "System",
};

const getNotificationIcon = (type) => {
  return notificationIcons[type] || "🔔";
};

const getNotificationTypeLabel = (type) => {
  return notificationTypeLabels[type] || "Notification";
};

const formatNotificationTime = (dateValue) => {
  if (!dateValue) {
    return "Unknown time";
  }

  const date = new Date(dateValue);

  if (Number.isNaN(date.getTime())) {
    return "Unknown time";
  }

  const now = new Date();
  const difference = now.getTime() - date.getTime();

  if (difference < 0) {
    return date.toLocaleString();
  }

  const seconds = Math.floor(difference / 1000);

  if (seconds < 60) {
    return "Just now";
  }

  const minutes = Math.floor(seconds / 60);

  if (minutes < 60) {
    return `${minutes}m ago`;
  }

  const hours = Math.floor(minutes / 60);

  if (hours < 24) {
    return `${hours}h ago`;
  }

  const days = Math.floor(hours / 24);

  if (days < 7) {
    return `${days}d ago`;
  }

  return date.toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
};

const Notifications = () => {
  const navigate = useNavigate();

  const [notifications, setNotifications] = useState([]);

  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(null);

  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const [filter, setFilter] = useState("all");

  /**
   * LOAD NOTIFICATIONS
   */
  const loadNotifications = useCallback(async () => {
    try {
      setLoading(true);
      setError("");

      const response = await getNotifications();

      const data = response?.data;

      setNotifications(data?.notifications || []);
    } catch (err) {
      console.error("Failed to load notifications:", err);

      setError(
        err?.response?.data?.message ||
          "Failed to load notifications. Please try again."
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadNotifications();
  }, [loadNotifications]);

  /**
   * UNREAD COUNT
   */
  const unreadCount = useMemo(() => {
    return notifications.filter(
      (notification) => !notification.read
    ).length;
  }, [notifications]);

  /**
   * FILTERED NOTIFICATIONS
   */
  const displayedNotifications = useMemo(() => {
    if (filter === "unread") {
      return notifications.filter(
        (notification) => !notification.read
      );
    }

    return notifications;
  }, [notifications, filter]);

  /**
   * MARK ONE NOTIFICATION AS READ
   */
  const handleMarkAsRead = async (notificationId) => {
    try {
      setActionLoading(`read-${notificationId}`);
      setError("");
      setSuccess("");

      await markNotificationAsRead(notificationId);

      setNotifications((currentNotifications) =>
        currentNotifications.map((notification) =>
          notification.id === notificationId
            ? {
                ...notification,
                read: true,
              }
            : notification
        )
      );

      notifyNotificationCountChanged();

      setSuccess("Notification marked as read.");
    } catch (err) {
      console.error(
        "Failed to mark notification as read:",
        err
      );

      setError(
        err?.response?.data?.message ||
          "Failed to mark notification as read."
      );
    } finally {
      setActionLoading(null);
    }
  };

  /**
   * MARK ALL NOTIFICATIONS AS READ
   */
  const handleMarkAllAsRead = async () => {
    if (unreadCount === 0) {
      return;
    }

    try {
      setActionLoading("read-all");
      setError("");
      setSuccess("");

      await markAllNotificationsAsRead();

      setNotifications((currentNotifications) =>
        currentNotifications.map((notification) => ({
          ...notification,
          read: true,
        }))
      );

      notifyNotificationCountChanged();

      setSuccess("All notifications marked as read.");
    } catch (err) {
      console.error(
        "Failed to mark all notifications as read:",
        err
      );

      setError(
        err?.response?.data?.message ||
          "Failed to mark all notifications as read."
      );
    } finally {
      setActionLoading(null);
    }
  };

  /**
   * DELETE NOTIFICATION
   */
  const handleDelete = async (notificationId) => {
    try {
      setActionLoading(`delete-${notificationId}`);
      setError("");
      setSuccess("");

      await deleteNotification(notificationId);

      setNotifications((currentNotifications) =>
        currentNotifications.filter(
          (notification) =>
            notification.id !== notificationId
        )
      );

      notifyNotificationCountChanged();

      setSuccess("Notification deleted.");
    } catch (err) {
      console.error("Failed to delete notification:", err);

      setError(
        err?.response?.data?.message ||
          "Failed to delete notification."
      );
    } finally {
      setActionLoading(null);
    }
  };

  /**
   * GET DESTINATION FOR NOTIFICATION
   *
   * referenceType + referenceId determine where
   * the notification should take the user.
   */
  const getNotificationDestination = (notification) => {
    const { referenceId, referenceType } = notification;

    if (!referenceId) {
      return null;
    }

    switch (referenceType) {
      case "OFFER":
        return "/offers";

      case "MATCH":
        return `/matches/${referenceId}`;

      case "TRADE":
        return `/trades/${referenceId}`;

      case "MESSAGE":
        return `/messages/${referenceId}`;

      case "VERIFICATION":
        return `/trades/${referenceId}`;

      case "DISPUTE":
        return `/trades/${referenceId}`;

      default:
        return null;
    }
  };

  /**
   * OPEN NOTIFICATION
   *
   * If unread:
   * 1. Mark it as read.
   * 2. Update local state.
   * 3. Refresh Navbar unread count.
   *
   * Then navigate to the referenced resource.
   */
  const handleNotificationClick = async (notification) => {
    try {
      if (!notification.read) {
        await markNotificationAsRead(notification.id);

        setNotifications((currentNotifications) =>
          currentNotifications.map((item) =>
            item.id === notification.id
              ? {
                  ...item,
                  read: true,
                }
              : item
          )
        );

        notifyNotificationCountChanged();
      }

      const destination =
        getNotificationDestination(notification);

      if (destination) {
        navigate(destination);
      }
    } catch (err) {
      console.error(
        "Failed to open notification:",
        err
      );

      setError(
        err?.response?.data?.message ||
          "Failed to open notification."
      );
    }
  };

  return (
    <div className="min-h-screen bg-[#F8F5F3]">
      <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6 lg:px-8">

        {/* =====================================================
            HEADER
        ====================================================== */}
        <div className="mb-8">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="text-sm font-bold uppercase tracking-wider text-[#8A2638]">
                Your activity
              </p>

              <h1 className="mt-1 text-3xl font-extrabold text-[#3D0F18]">
                Notifications
              </h1>

              <p className="mt-2 text-sm text-gray-600">
                Stay updated on your offers, matches, trades
                and account activity.
              </p>
            </div>

            <div className="flex items-center gap-2">
              <span className="rounded-full bg-[#F5E8EB] px-4 py-2 text-sm font-bold text-[#5B1725]">
                {unreadCount} unread
              </span>

              <button
                type="button"
                onClick={handleMarkAllAsRead}
                disabled={
                  unreadCount === 0 ||
                  actionLoading === "read-all"
                }
                className="rounded-xl border border-[#DCAEB7] bg-white px-4 py-2 text-sm font-bold text-[#5B1725] transition hover:bg-[#FBF5F6] disabled:cursor-not-allowed disabled:opacity-50"
              >
                {actionLoading === "read-all"
                  ? "Marking..."
                  : "Mark all as read"}
              </button>
            </div>
          </div>
        </div>

        {/* =====================================================
            ERROR MESSAGE
        ====================================================== */}
        {error && (
          <div className="mb-5 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
            {error}
          </div>
        )}

        {/* =====================================================
            SUCCESS MESSAGE
        ====================================================== */}
        {success && (
          <div className="mb-5 rounded-xl border border-green-200 bg-green-50 px-4 py-3 text-sm font-medium text-green-700">
            {success}
          </div>
        )}

        {/* =====================================================
            FILTERS
        ====================================================== */}
        <div className="mb-6 flex gap-2 rounded-2xl border border-[#E7DDDF] bg-white p-2 shadow-sm">
          <button
            type="button"
            onClick={() => setFilter("all")}
            className={`flex-1 rounded-xl px-4 py-2.5 text-sm font-bold transition ${
              filter === "all"
                ? "bg-[#5B1725] text-white shadow-sm"
                : "text-gray-600 hover:bg-[#FBF5F6]"
            }`}
          >
            All
          </button>

          <button
            type="button"
            onClick={() => setFilter("unread")}
            className={`flex-1 rounded-xl px-4 py-2.5 text-sm font-bold transition ${
              filter === "unread"
                ? "bg-[#5B1725] text-white shadow-sm"
                : "text-gray-600 hover:bg-[#FBF5F6]"
            }`}
          >
            Unread

            {unreadCount > 0 && (
              <span className="ml-2 rounded-full bg-[#8A2638] px-2 py-0.5 text-xs text-white">
                {unreadCount}
              </span>
            )}
          </button>
        </div>

        {/* =====================================================
            LOADING
        ====================================================== */}
        {loading && (
          <div className="space-y-4">
            {[1, 2, 3].map((item) => (
              <div
                key={item}
                className="animate-pulse rounded-2xl border border-[#E7DDDF] bg-white p-5 shadow-sm"
              >
                <div className="flex gap-4">
                  <div className="h-12 w-12 rounded-full bg-gray-200" />

                  <div className="flex-1">
                    <div className="h-4 w-1/3 rounded bg-gray-200" />

                    <div className="mt-3 h-3 w-full rounded bg-gray-200" />

                    <div className="mt-2 h-3 w-2/3 rounded bg-gray-200" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* =====================================================
            EMPTY STATE
        ====================================================== */}
        {!loading &&
          displayedNotifications.length === 0 && (
            <div className="rounded-2xl border border-[#E7DDDF] bg-white px-6 py-14 text-center shadow-sm">
              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-[#F5E8EB] text-3xl">
                🔔
              </div>

              <h2 className="mt-5 text-xl font-extrabold text-[#3D0F18]">
                {filter === "unread"
                  ? "You're all caught up"
                  : "No notifications yet"}
              </h2>

              <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-gray-500">
                {filter === "unread"
                  ? "You don't have any unread notifications right now."
                  : "When you receive offers, matches, trade updates or other important activity, they will appear here."}
              </p>

              {filter === "unread" && (
                <button
                  type="button"
                  onClick={() => setFilter("all")}
                  className="mt-5 rounded-xl bg-[#5B1725] px-5 py-3 text-sm font-bold text-white transition hover:bg-[#3D0F18]"
                >
                  View all notifications
                </button>
              )}
            </div>
          )}

        {/* =====================================================
            NOTIFICATIONS
        ====================================================== */}
        {!loading &&
          displayedNotifications.length > 0 && (
            <div className="space-y-4">
              {displayedNotifications.map((notification) => {
                const isUnread = !notification.read;

                const destination =
                  getNotificationDestination(notification);

                const readLoading =
                  actionLoading ===
                  `read-${notification.id}`;

                const deleteLoading =
                  actionLoading ===
                  `delete-${notification.id}`;

                return (
                  <div
                    key={notification.id}
                    onClick={() =>
                      handleNotificationClick(notification)
                    }
                    role={destination ? "button" : undefined}
                    tabIndex={destination ? 0 : undefined}
                    onKeyDown={(event) => {
                      if (
                        destination &&
                        (event.key === "Enter" ||
                          event.key === " ")
                      ) {
                        event.preventDefault();
                        handleNotificationClick(
                          notification
                        );
                      }
                    }}
                    className={`rounded-2xl border bg-white p-5 shadow-sm transition ${
                      destination
                        ? "cursor-pointer hover:-translate-y-0.5 hover:shadow-md"
                        : ""
                    } ${
                      isUnread
                        ? "border-[#DCAEB7] bg-[#FBF5F6]"
                        : "border-[#E7DDDF]"
                    }`}
                  >
                    <div className="flex gap-4">

                      {/* =================================================
                          ICON
                      ================================================== */}
                      <div
                        className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-full text-2xl ${
                          isUnread
                            ? "bg-[#F5E8EB]"
                            : "bg-gray-100"
                        }`}
                      >
                        {getNotificationIcon(
                          notification.type
                        )}
                      </div>

                      {/* =================================================
                          CONTENT
                      ================================================== */}
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                          <div>
                            <div className="flex flex-wrap items-center gap-2">
                              <h2
                                className={`text-base ${
                                  isUnread
                                    ? "font-extrabold text-[#3D0F18]"
                                    : "font-bold text-gray-800"
                                }`}
                              >
                                {notification.title}
                              </h2>

                              {isUnread && (
                                <span className="rounded-full bg-[#8A2638] px-2.5 py-0.5 text-[10px] font-extrabold uppercase tracking-wide text-white">
                                  New
                                </span>
                              )}
                            </div>

                            <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-gray-500">
                              <span className="rounded-full bg-gray-100 px-2.5 py-1 font-semibold">
                                {getNotificationTypeLabel(
                                  notification.type
                                )}
                              </span>

                              <span>•</span>

                              <span
                                title={
                                  notification.createdAt
                                    ? new Date(
                                        notification.createdAt
                                      ).toLocaleString()
                                    : ""
                                }
                              >
                                {formatNotificationTime(
                                  notification.createdAt
                                )}
                              </span>
                            </div>
                          </div>
                        </div>

                        {/* =================================================
                            MESSAGE
                        ================================================== */}
                        <p
                          className={`mt-3 text-sm leading-6 ${
                            isUnread
                              ? "text-gray-700"
                              : "text-gray-500"
                          }`}
                        >
                          {notification.message}
                        </p>

                        {/* =================================================
                            OPEN INDICATOR
                        ================================================== */}
                        {destination && (
                          <p className="mt-3 text-xs font-bold text-[#8A2638]">
                            Click to view →
                          </p>
                        )}

                        {/* =================================================
                            ACTIONS
                        ================================================== */}
                        <div className="mt-4 flex flex-wrap items-center gap-2">
                          {isUnread && (
                            <button
                              type="button"
                              onClick={(event) => {
                                event.stopPropagation();

                                handleMarkAsRead(
                                  notification.id
                                );
                              }}
                              disabled={
                                readLoading ||
                                actionLoading !== null
                              }
                              className="rounded-lg bg-[#5B1725] px-3 py-2 text-xs font-bold text-white transition hover:bg-[#3D0F18] disabled:cursor-not-allowed disabled:opacity-50"
                            >
                              {readLoading
                                ? "Marking..."
                                : "Mark as read"}
                            </button>
                          )}

                          <button
                            type="button"
                            onClick={(event) => {
                              event.stopPropagation();

                              handleDelete(
                                notification.id
                              );
                            }}
                            disabled={
                              deleteLoading ||
                              actionLoading !== null
                            }
                            className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-xs font-bold text-gray-600 transition hover:border-red-200 hover:bg-red-50 hover:text-red-600 disabled:cursor-not-allowed disabled:opacity-50"
                          >
                            {deleteLoading
                              ? "Deleting..."
                              : "Delete"}
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

        {/* =====================================================
            BOTTOM NAVIGATION
        ====================================================== */}
        <div className="mt-8 flex flex-wrap gap-3">
          <Link
            to="/dashboard"
            className="rounded-xl border border-[#DCAEB7] bg-white px-5 py-3 text-sm font-bold text-[#5B1725] transition hover:bg-[#FBF5F6]"
          >
            ← Dashboard
          </Link>

          <Link
            to="/offers"
            className="rounded-xl bg-[#5B1725] px-5 py-3 text-sm font-bold text-white transition hover:bg-[#3D0F18]"
          >
            View My Offers
          </Link>
        </div>
      </div>
    </div>
  );
};

export default Notifications;

