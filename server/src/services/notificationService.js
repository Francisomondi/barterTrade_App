
import prisma from "../config/prisma.js";

/**
 * CREATE NOTIFICATION
 */
export const createNotification = async ({
  userId,
  type,
  title,
  message,
  referenceId = null,
  referenceType = null,
}) => {
  if (!userId || !type || !title || !message) {
    throw new Error("Missing required notification fields");
  }

  return prisma.notification.create({
    data: {
      userId,
      type,
      title,
      message,
      referenceId,
      referenceType,
    },
  });
};

/**
 * CREATE MULTIPLE NOTIFICATIONS
 */
export const createNotifications = async (notifications = []) => {
  if (!notifications.length) {
    return [];
  }

  return prisma.$transaction(
    notifications.map((notification) =>
      prisma.notification.create({
        data: {
          userId: notification.userId,
          type: notification.type,
          title: notification.title,
          message: notification.message,
          referenceId: notification.referenceId || null,
          referenceType: notification.referenceType || null,
        },
      })
    )
  );
};

/**
 * GET USER NOTIFICATIONS
 */
export const getUserNotifications = async (
  userId,
  { unreadOnly = false, limit = 50 } = {}
) => {
  return prisma.notification.findMany({
    where: {
      userId,
      ...(unreadOnly ? { read: false } : {}),
    },
    orderBy: {
      createdAt: "desc",
    },
    take: Math.min(Number(limit) || 50, 100),
  });
};

/**
 * GET UNREAD NOTIFICATION COUNT
 */
export const getUnreadNotificationCount = async (userId) => {
  return prisma.notification.count({
    where: {
      userId,
      read: false,
    },
  });
};

/**
 * MARK ONE NOTIFICATION AS READ
 */
export const markNotificationAsRead = async (
  notificationId,
  userId
) => {
  return prisma.notification.updateMany({
    where: {
      id: notificationId,
      userId,
    },
    data: {
      read: true,
    },
  });
};

/**
 * MARK ALL NOTIFICATIONS AS READ
 */
export const markAllNotificationsAsRead = async (userId) => {
  return prisma.notification.updateMany({
    where: {
      userId,
      read: false,
    },
    data: {
      read: true,
    },
  });
};

/**
 * DELETE NOTIFICATION
 */
export const deleteNotification = async (
  notificationId,
  userId
) => {
  return prisma.notification.deleteMany({
    where: {
      id: notificationId,
      userId,
    },
  });
};

