-- RonBri MySQL schema
-- Run this script in HeidiSQL while connected to your local MySQL server.
-- It creates the database and tables used by server/prisma/schema.prisma.

CREATE DATABASE IF NOT EXISTS `ronbri`
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

USE `ronbri`;

SET NAMES utf8mb4;

CREATE TABLE IF NOT EXISTS `User` (
  `id`           VARCHAR(191) NOT NULL,
  `username`     VARCHAR(191) NOT NULL,
  `displayName`  VARCHAR(191) NOT NULL,
  `role`         ENUM('BOY', 'GIRL') NOT NULL,
  `theme`        VARCHAR(191) NOT NULL,
  `avatar`       VARCHAR(191) NULL,
  `passwordHash` VARCHAR(191) NOT NULL,
  `createdAt`    DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`),
  UNIQUE KEY `User_username_key` (`username`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `Relationship` (
  `id`        VARCHAR(191) NOT NULL,
  `startDate` DATETIME(3) NOT NULL,
  `updatedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `DateEvent` (
  `id`          VARCHAR(191) NOT NULL,
  `title`       VARCHAR(191) NOT NULL,
  `description` VARCHAR(191) NULL,
  `date`        DATETIME(3) NOT NULL,
  `emoji`       VARCHAR(191) NULL,
  `imageUrl`    VARCHAR(191) NULL,
  `createdById` VARCHAR(191) NOT NULL,
  `createdAt`   DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`),
  KEY `DateEvent_createdById_idx` (`createdById`),
  CONSTRAINT `DateEvent_createdById_fkey`
    FOREIGN KEY (`createdById`) REFERENCES `User` (`id`)
    ON DELETE RESTRICT ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `DateInvite` (
  `id`             VARCHAR(191) NOT NULL,
  `type`           ENUM('OUTSIDE', 'FOOD', 'BONDING', 'CUSTOM') NOT NULL,
  `title`          VARCHAR(191) NOT NULL,
  `message`        VARCHAR(191) NOT NULL,
  `emojis`         JSON NOT NULL,
  `gifUrl`         VARCHAR(191) NULL,
  `imageUrl`       VARCHAR(191) NULL,
  `senderId`       VARCHAR(191) NOT NULL,
  `receiverId`     VARCHAR(191) NOT NULL,
  `status`         ENUM('PENDING', 'ACCEPTED', 'DECLINED', 'RESCHEDULED') NOT NULL DEFAULT 'PENDING',
  `scheduledDate`  DATETIME(3) NULL,
  `rescheduleDate` DATETIME(3) NULL,
  `seenAt`         DATETIME(3) NULL,
  `createdAt`      DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`),
  KEY `DateInvite_senderId_idx` (`senderId`),
  KEY `DateInvite_receiverId_idx` (`receiverId`),
  CONSTRAINT `DateInvite_senderId_fkey`
    FOREIGN KEY (`senderId`) REFERENCES `User` (`id`)
    ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT `DateInvite_receiverId_fkey`
    FOREIGN KEY (`receiverId`) REFERENCES `User` (`id`)
    ON DELETE RESTRICT ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `Message` (
  `id`        VARCHAR(191) NOT NULL,
  `content`   VARCHAR(191) NULL,
  `imageUrl`  VARCHAR(191) NULL,
  `gifUrl`    VARCHAR(191) NULL,
  `senderId`  VARCHAR(191) NOT NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `readAt`    DATETIME(3) NULL,
  PRIMARY KEY (`id`),
  KEY `Message_senderId_idx` (`senderId`),
  CONSTRAINT `Message_senderId_fkey`
    FOREIGN KEY (`senderId`) REFERENCES `User` (`id`)
    ON DELETE RESTRICT ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
