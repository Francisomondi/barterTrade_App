
// client/src/utils/notificationEvents.js

/**
 * Event used to notify components that the unread
 * notification count has changed.
 */
export const NOTIFICATION_COUNT_EVENT =
  "barter:notification-count-changed";

/**
 * Notify the Navbar and other listeners that the
 * notification count should be refreshed.
 */
export const notifyNotificationCountChanged = () => {
  window.dispatchEvent(
    new Event(NOTIFICATION_COUNT_EVENT)
  );
};

