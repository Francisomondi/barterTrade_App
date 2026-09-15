import express from "express";

import { protect } from "../middleware/authMiddleware.js";

import {
getNotifications,
getUnreadCount,
markAsRead,
markAllAsRead,
removeNotification,
} from "../controllers/notificationController.js";

const router = express.Router();

/**

* All notification routes require authentication.
  */
  router.use(protect);

/**

* GET /api/notifications
  */
  router.get("/", getNotifications);

/**

* GET /api/notifications/unread-count
*
* Keep this BEFORE /:id/read.
  */
  router.get("/unread-count", getUnreadCount);

/**

* PATCH /api/notifications/read-all
*
* Keep this BEFORE /:id/read.
  */
  router.patch("/read-all", markAllAsRead);

/**

* PATCH /api/notifications/:id/read
  */
  router.patch("/:id/read", markAsRead);

/**

* DELETE /api/notifications/:id
  */
  router.delete("/:id", removeNotification);

export default router;
