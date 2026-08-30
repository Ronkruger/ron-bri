-- --------------------------------------------------------
-- Host:                         127.0.0.1
-- Server version:               8.0.46 - MySQL Community Server - GPL
-- Server OS:                    Win64
-- HeidiSQL Version:             12.21.0.7344
-- --------------------------------------------------------

/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET NAMES utf8 */;
/*!50503 SET NAMES utf8mb4 */;
/*!40103 SET @OLD_TIME_ZONE=@@TIME_ZONE */;
/*!40103 SET TIME_ZONE='+00:00' */;
/*!40014 SET @OLD_FOREIGN_KEY_CHECKS=@@FOREIGN_KEY_CHECKS, FOREIGN_KEY_CHECKS=0 */;
/*!40101 SET @OLD_SQL_MODE=@@SQL_MODE, SQL_MODE='NO_AUTO_VALUE_ON_ZERO' */;
/*!40111 SET @OLD_SQL_NOTES=@@SQL_NOTES, SQL_NOTES=0 */;

-- Dumping structure for table ronbri.dateevent
CREATE TABLE IF NOT EXISTS `dateevent` (
  `id` varchar(191) COLLATE utf8mb4_unicode_ci NOT NULL,
  `title` varchar(191) COLLATE utf8mb4_unicode_ci NOT NULL,
  `description` varchar(191) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `date` datetime(3) NOT NULL,
  `emoji` varchar(191) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `imageUrl` varchar(191) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `createdById` varchar(191) COLLATE utf8mb4_unicode_ci NOT NULL,
  `createdAt` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`),
  KEY `DateEvent_createdById_idx` (`createdById`),
  CONSTRAINT `DateEvent_createdById_fkey` FOREIGN KEY (`createdById`) REFERENCES `user` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Dumping data for table ronbri.dateevent: ~0 rows (approximately)

-- Dumping structure for table ronbri.dateinvite
CREATE TABLE IF NOT EXISTS `dateinvite` (
  `id` varchar(191) COLLATE utf8mb4_unicode_ci NOT NULL,
  `type` enum('OUTSIDE','FOOD','BONDING','CUSTOM') COLLATE utf8mb4_unicode_ci NOT NULL,
  `title` varchar(191) COLLATE utf8mb4_unicode_ci NOT NULL,
  `message` varchar(191) COLLATE utf8mb4_unicode_ci NOT NULL,
  `emojis` json NOT NULL,
  `gifUrl` varchar(191) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `imageUrl` varchar(191) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `senderId` varchar(191) COLLATE utf8mb4_unicode_ci NOT NULL,
  `receiverId` varchar(191) COLLATE utf8mb4_unicode_ci NOT NULL,
  `status` enum('PENDING','ACCEPTED','DECLINED','RESCHEDULED') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'PENDING',
  `scheduledDate` datetime(3) DEFAULT NULL,
  `rescheduleDate` datetime(3) DEFAULT NULL,
  `seenAt` datetime(3) DEFAULT NULL,
  `createdAt` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`),
  KEY `DateInvite_senderId_idx` (`senderId`),
  KEY `DateInvite_receiverId_idx` (`receiverId`),
  CONSTRAINT `DateInvite_receiverId_fkey` FOREIGN KEY (`receiverId`) REFERENCES `user` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT `DateInvite_senderId_fkey` FOREIGN KEY (`senderId`) REFERENCES `user` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Dumping data for table ronbri.dateinvite: ~0 rows (approximately)

-- Dumping structure for table ronbri.message
CREATE TABLE IF NOT EXISTS `message` (
  `id` varchar(191) COLLATE utf8mb4_unicode_ci NOT NULL,
  `content` varchar(191) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `imageUrl` varchar(191) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `gifUrl` varchar(191) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `senderId` varchar(191) COLLATE utf8mb4_unicode_ci NOT NULL,
  `createdAt` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `readAt` datetime(3) DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `Message_senderId_idx` (`senderId`),
  CONSTRAINT `Message_senderId_fkey` FOREIGN KEY (`senderId`) REFERENCES `user` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Dumping data for table ronbri.message: ~0 rows (approximately)

-- Dumping structure for table ronbri.relationship
CREATE TABLE IF NOT EXISTS `relationship` (
  `id` varchar(191) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'singleton',
  `startDate` datetime(3) NOT NULL,
  `updatedAt` datetime(3) NOT NULL ON UPDATE CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Dumping data for table ronbri.relationship: ~0 rows (approximately)
INSERT INTO `relationship` (`id`, `startDate`, `updatedAt`) VALUES
	('singleton', '2025-10-15 00:00:00.000', '2026-08-19 06:22:46.967');

-- Dumping structure for table ronbri.user
CREATE TABLE IF NOT EXISTS `user` (
  `id` varchar(191) COLLATE utf8mb4_unicode_ci NOT NULL,
  `username` varchar(191) COLLATE utf8mb4_unicode_ci NOT NULL,
  `displayName` varchar(191) COLLATE utf8mb4_unicode_ci NOT NULL,
  `role` enum('BOY','GIRL') COLLATE utf8mb4_unicode_ci NOT NULL,
  `theme` varchar(191) COLLATE utf8mb4_unicode_ci NOT NULL,
  `avatar` varchar(191) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `passwordHash` varchar(191) COLLATE utf8mb4_unicode_ci NOT NULL,
  `createdAt` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`),
  UNIQUE KEY `User_username_key` (`username`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Dumping data for table ronbri.user: ~2 rows (approximately)
INSERT INTO `user` (`id`, `username`, `displayName`, `role`, `theme`, `avatar`, `passwordHash`, `createdAt`) VALUES
	('user_boy', 'ronron', 'Ron Ron', 'BOY', 'blue', 'https://res.cloudinary.com/dtdviify8/image/upload/v1787129379/ronbri/wfapahkwvouyohlzarvr.jpg', '$2a$12$Vu6V9KejXL4Rh88w2s04yuoiKrk0RwPQTjNe0VW5phZ5bt3jG.g5e', '2026-08-19 06:22:46.913'),
	('user_girl', 'bribri', 'BriBri', 'GIRL', 'yellow', 'https://res.cloudinary.com/dtdviify8/image/upload/v1787130082/ronbri/hry7m1cdvqmk3r6xxqq2.jpg', '$2a$12$mEqpLiQyIh850WqdFog2JeGW3.O26jQv.MmYh2NygOiQATHirDLdq', '2026-08-19 06:22:46.961');

/*!40103 SET TIME_ZONE=IFNULL(@OLD_TIME_ZONE, 'system') */;
/*!40101 SET SQL_MODE=IFNULL(@OLD_SQL_MODE, '') */;
/*!40014 SET FOREIGN_KEY_CHECKS=IFNULL(@OLD_FOREIGN_KEY_CHECKS, 1) */;
/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40111 SET SQL_NOTES=IFNULL(@OLD_SQL_NOTES, 1) */;
