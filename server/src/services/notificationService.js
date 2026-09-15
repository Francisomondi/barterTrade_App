
import prisma from "../config/prisma.js";

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

  if (referenceId && referenceType) {
    return prisma.notification.upsert({
      where: {
        userId_type_referenceId_referenceType: {
          userId,
          type,
          referenceId,
          referenceType,
        },
      },
      update: {},
      create: {
        userId,
        type,
        title,
        message,
        referenceId,
        referenceType,
      },
    });
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
    notifications.map((notification) => {
      const {
        userId,
        type,
        title,
        message,
        referenceId = null,
        referenceType = null,
      } = notification;

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
    })
  );
};

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


export const getUnreadNotificationCount = async (userId) => {
  return prisma.notification.count({
    where: {
      userId,
      read: false,
    },
  });
};

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

