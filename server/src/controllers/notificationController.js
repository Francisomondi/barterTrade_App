import {
getUserNotifications,
getUnreadNotificationCount,
markNotificationAsRead,
markAllNotificationsAsRead,
deleteNotification,
} from "../services/notificationService.js";

/**

* GET /api/notifications
*
* Get notifications belonging to the logged-in user.
  */
  export const getNotifications = async (req, res) => {
  try {
  const userId = req.user.id;

  const unreadOnly =
  String(req.query.unreadOnly).toLowerCase() === "true";

  const limit = Number(req.query.limit) || 50;

  const notifications = await getUserNotifications(userId, {
  unreadOnly,
  limit,
  });

  return res.status(200).json({
  success: true,
  count: notifications.length,
  notifications,
  });
  } catch (error) {
  console.error("GET NOTIFICATIONS ERROR:", error);

  return res.status(500).json({
  success: false,
  message: "Failed to load notifications.",
  });
  }
  };

/**

* GET /api/notifications/unread-count
*
* Get unread notification count.
  */
  export const getUnreadCount = async (req, res) => {
  try {
  const userId = req.user.id;

  const count = await getUnreadNotificationCount(userId);

  return res.status(200).json({
  success: true,
  count,
  });
  } catch (error) {
  console.error("GET UNREAD COUNT ERROR:", error);

  return res.status(500).json({
  success: false,
  message: "Failed to load unread notification count.",
  });
  }
  };

/**

* PATCH /api/notifications/:id/read
*
* Mark one notification as read.
  */
  export const markAsRead = async (req, res) => {
  try {
  const userId = req.user.id;
  const { id } = req.params;

  if (!id) {
  return res.status(400).json({
  success: false,
  message: "Notification ID is required.",
  });
  }

  const result = await markNotificationAsRead(
  id,
  userId
  );

  if (result.count === 0) {
  return res.status(404).json({
  success: false,
  message: "Notification not found or already read.",
  });
  }

  return res.status(200).json({
  success: true,
  message: "Notification marked as read.",
  });
  } catch (error) {
  console.error("MARK NOTIFICATION READ ERROR:", error);

  return res.status(500).json({
  success: false,
  message: "Failed to mark notification as read.",
  });
  }
  };

/**

* PATCH /api/notifications/read-all
*
* Mark all notifications as read.
  */
  export const markAllAsRead = async (req, res) => {
  try {
  const userId = req.user.id;

  const result = await markAllNotificationsAsRead(userId);

  return res.status(200).json({
  success: true,
  message: "All notifications marked as read.",
  count: result.count,
  });
  } catch (error) {
  console.error(
  "MARK ALL NOTIFICATIONS READ ERROR:",
  error
  );

  return res.status(500).json({
  success: false,
  message: "Failed to mark all notifications as read.",
  });
  }
  };

/**

* DELETE /api/notifications/:id
*
* Delete one notification belonging to the logged-in user.
  */
  export const removeNotification = async (req, res) => {
  try {
  const userId = req.user.id;
  const { id } = req.params;

  if (!id) {
  return res.status(400).json({
  success: false,
  message: "Notification ID is required.",
  });
  }

  const result = await deleteNotification(
  id,
  userId
  );

  if (result.count === 0) {
  return res.status(404).json({
  success: false,
  message: "Notification not found.",
  });
  }

  return res.status(200).json({
  success: true,
  message: "Notification deleted.",
  });
  } catch (error) {
  console.error("DELETE NOTIFICATION ERROR:", error);

  return res.status(500).json({
  success: false,
  message: "Failed to delete notification.",
  });
  }
  };
