-- Optional manual equivalent of the additive Prisma PushToken model.
-- Prisma db push creates this automatically during Render startup.
CREATE TABLE IF NOT EXISTS `push_token` (
  `id` VARCHAR(191) NOT NULL,
  `token` VARCHAR(255) NOT NULL,
  `platform` VARCHAR(20) NOT NULL,
  `userId` VARCHAR(191) NOT NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` DATETIME(3) NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `push_token_token_key` (`token`),
  KEY `push_token_userId_idx` (`userId`),
  CONSTRAINT `push_token_userId_fkey`
    FOREIGN KEY (`userId`) REFERENCES `user` (`id`)
    ON DELETE CASCADE ON UPDATE CASCADE
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
