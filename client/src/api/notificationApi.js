import api from "./axios";

/**

* Get the current user's notifications.
  */
  export const getNotifications = (params = {}) =>
  api.get("/notifications", {
  params,
  });

/**

* Get unread notification count.
  */
  export const getUnreadNotificationCount = () =>
  api.get("/notifications/unread-count");

/**

* Mark one notification as read.
  */
  export const markNotificationAsRead = (notificationId) =>
  api.patch(
  `/notifications/${notificationId}/read`
  );

/**

* Mark all notifications as read.
  */
  export const markAllNotificationsAsRead = () =>
  api.patch("/notifications/read-all");

/**

* Delete one notification.
  */
  export const deleteNotification = (notificationId) =>
  api.delete(`/notifications/${notificationId}`);
