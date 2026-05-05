/*
  Warnings:

  - The primary key for the `attribute` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - The primary key for the `cart` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - The primary key for the `category` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - The primary key for the `chatmessage` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - The primary key for the `design` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - The primary key for the `design_comment` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - The primary key for the `design_favorite` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - The primary key for the `design_request` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - The primary key for the `designerprofile` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - The primary key for the `favoritecolor` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - The primary key for the `favoriteproduct` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - The primary key for the `offer` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - The primary key for the `order` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - The primary key for the `orderitem` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - The primary key for the `otp` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - The primary key for the `paint` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - You are about to drop the column `subCategoryId` on the `paint` table. All the data in the column will be lost.
  - The primary key for the `paintattribute` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - The primary key for the `painter` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - The primary key for the `paintergallery` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - The primary key for the `painterreview` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - The primary key for the `selection` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - The primary key for the `user` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - The primary key for the `usercategory` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - The primary key for the `vendor` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - The primary key for the `visit_request` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - A unique constraint covering the columns `[name]` on the table `attribute` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[title]` on the table `offer` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[sku]` on the table `paint` will be added. If there are existing duplicate values, this will fail.

*/
-- DropIndex
DROP INDEX `Paint_subCategoryId_fkey` ON `paint`;

-- AlterTable
ALTER TABLE `attribute` DROP PRIMARY KEY,
    MODIFY `id` VARCHAR(191) NOT NULL,
    ADD PRIMARY KEY (`id`);

-- AlterTable
ALTER TABLE `cart` DROP PRIMARY KEY,
    MODIFY `id` VARCHAR(191) NOT NULL,
    MODIFY `userId` VARCHAR(191) NOT NULL,
    MODIFY `paintId` VARCHAR(191) NOT NULL,
    ADD PRIMARY KEY (`id`);

-- AlterTable
ALTER TABLE `category` DROP PRIMARY KEY,
    ADD COLUMN `imageUrl` VARCHAR(512) NULL,
    MODIFY `id` VARCHAR(191) NOT NULL,
    ADD PRIMARY KEY (`id`);

-- AlterTable
ALTER TABLE `chatmessage` DROP PRIMARY KEY,
    MODIFY `id` VARCHAR(191) NOT NULL,
    MODIFY `userId` VARCHAR(191) NOT NULL,
    ADD PRIMARY KEY (`id`);

-- AlterTable
ALTER TABLE `design` DROP PRIMARY KEY,
    MODIFY `id` VARCHAR(191) NOT NULL,
    MODIFY `designerId` VARCHAR(191) NOT NULL,
    ALTER COLUMN `updatedAt` DROP DEFAULT,
    ADD PRIMARY KEY (`id`);

-- AlterTable
ALTER TABLE `design_comment` DROP PRIMARY KEY,
    MODIFY `id` VARCHAR(191) NOT NULL,
    MODIFY `designId` VARCHAR(191) NOT NULL,
    MODIFY `userId` VARCHAR(191) NOT NULL,
    ADD PRIMARY KEY (`id`);

-- AlterTable
ALTER TABLE `design_favorite` DROP PRIMARY KEY,
    MODIFY `userId` VARCHAR(191) NOT NULL,
    MODIFY `designId` VARCHAR(191) NOT NULL,
    ADD PRIMARY KEY (`userId`, `designId`);

-- AlterTable
ALTER TABLE `design_request` DROP PRIMARY KEY,
    MODIFY `id` VARCHAR(191) NOT NULL,
    MODIFY `designId` VARCHAR(191) NOT NULL,
    MODIFY `clientUserId` VARCHAR(191) NOT NULL,
    ADD PRIMARY KEY (`id`);

-- AlterTable
ALTER TABLE `designerprofile` DROP PRIMARY KEY,
    ADD COLUMN `bio` TEXT NULL,
    ADD COLUMN `location` VARCHAR(191) NULL,
    MODIFY `id` VARCHAR(191) NOT NULL,
    MODIFY `userId` VARCHAR(191) NOT NULL,
    ADD PRIMARY KEY (`id`);

-- AlterTable
ALTER TABLE `favoritecolor` DROP PRIMARY KEY,
    MODIFY `id` VARCHAR(191) NOT NULL,
    MODIFY `userId` VARCHAR(191) NOT NULL,
    ADD PRIMARY KEY (`id`);

-- AlterTable
ALTER TABLE `favoriteproduct` DROP PRIMARY KEY,
    MODIFY `userId` VARCHAR(191) NOT NULL,
    MODIFY `paintId` VARCHAR(191) NOT NULL,
    ADD PRIMARY KEY (`userId`, `paintId`);

-- AlterTable
ALTER TABLE `offer` DROP PRIMARY KEY,
    MODIFY `id` VARCHAR(191) NOT NULL,
    ADD PRIMARY KEY (`id`);

-- AlterTable
ALTER TABLE `order` DROP PRIMARY KEY,
    MODIFY `id` VARCHAR(191) NOT NULL,
    MODIFY `userId` VARCHAR(191) NOT NULL,
    MODIFY `painterId` VARCHAR(191) NULL,
    ADD PRIMARY KEY (`id`);

-- AlterTable
ALTER TABLE `orderitem` DROP PRIMARY KEY,
    ADD COLUMN `unitPrice` DOUBLE NULL,
    MODIFY `id` VARCHAR(191) NOT NULL,
    MODIFY `orderId` VARCHAR(191) NOT NULL,
    MODIFY `paintId` VARCHAR(191) NOT NULL,
    ADD PRIMARY KEY (`id`);

-- AlterTable
ALTER TABLE `otp` DROP PRIMARY KEY,
    MODIFY `id` VARCHAR(191) NOT NULL,
    ADD PRIMARY KEY (`id`);

-- AlterTable
ALTER TABLE `paint` DROP PRIMARY KEY,
    DROP COLUMN `subCategoryId`,
    ADD COLUMN `sku` VARCHAR(191) NULL,
    ADD COLUMN `weightKg` DOUBLE NULL DEFAULT 1,
    ADD COLUMN `wholesalePrice` DOUBLE NULL,
    MODIFY `id` VARCHAR(191) NOT NULL,
    MODIFY `categoryId` VARCHAR(191) NOT NULL,
    MODIFY `offerId` VARCHAR(191) NULL,
    ADD PRIMARY KEY (`id`);

-- AlterTable
ALTER TABLE `paintattribute` DROP PRIMARY KEY,
    MODIFY `paintId` VARCHAR(191) NOT NULL,
    MODIFY `attributeId` VARCHAR(191) NOT NULL,
    ADD PRIMARY KEY (`paintId`, `attributeId`);

-- AlterTable
ALTER TABLE `painter` DROP PRIMARY KEY,
    ADD COLUMN `bio` TEXT NULL,
    MODIFY `id` VARCHAR(191) NOT NULL,
    MODIFY `userId` VARCHAR(191) NOT NULL,
    ADD PRIMARY KEY (`id`);

-- AlterTable
ALTER TABLE `paintergallery` DROP PRIMARY KEY,
    MODIFY `id` VARCHAR(191) NOT NULL,
    MODIFY `painterId` VARCHAR(191) NOT NULL,
    ADD PRIMARY KEY (`id`);

-- AlterTable
ALTER TABLE `painterreview` DROP PRIMARY KEY,
    MODIFY `id` VARCHAR(191) NOT NULL,
    MODIFY `painterId` VARCHAR(191) NOT NULL,
    MODIFY `userId` VARCHAR(191) NOT NULL,
    ADD PRIMARY KEY (`id`);

-- AlterTable
ALTER TABLE `selection` DROP PRIMARY KEY,
    MODIFY `id` VARCHAR(191) NOT NULL,
    MODIFY `userId` VARCHAR(191) NOT NULL,
    MODIFY `paintId` VARCHAR(191) NOT NULL,
    ADD PRIMARY KEY (`id`);

-- AlterTable
ALTER TABLE `user` DROP PRIMARY KEY,
    ADD COLUMN `avatarUrl` VARCHAR(512) NULL,
    MODIFY `id` VARCHAR(191) NOT NULL,
    ADD PRIMARY KEY (`id`);

-- AlterTable
ALTER TABLE `usercategory` DROP PRIMARY KEY,
    MODIFY `id` VARCHAR(191) NOT NULL,
    MODIFY `userId` VARCHAR(191) NOT NULL,
    MODIFY `categoryId` VARCHAR(191) NOT NULL,
    ADD PRIMARY KEY (`id`);

-- AlterTable
ALTER TABLE `vendor` DROP PRIMARY KEY,
    ADD COLUMN `isApproved` BOOLEAN NOT NULL DEFAULT true,
    ADD COLUMN `paymentStatus` BOOLEAN NOT NULL DEFAULT false,
    ADD COLUMN `region` VARCHAR(191) NULL,
    ADD COLUMN `taxRegistration` VARCHAR(191) NULL,
    MODIFY `id` VARCHAR(191) NOT NULL,
    MODIFY `userId` VARCHAR(191) NOT NULL,
    ADD PRIMARY KEY (`id`);

-- AlterTable
ALTER TABLE `visit_request` DROP PRIMARY KEY,
    ADD COLUMN `region` TEXT NULL,
    MODIFY `id` VARCHAR(191) NOT NULL,
    MODIFY `clientUserId` VARCHAR(191) NOT NULL,
    MODIFY `painterId` VARCHAR(191) NOT NULL,
    ADD PRIMARY KEY (`id`);

-- CreateTable
CREATE TABLE `auditlog` (
    `id` VARCHAR(191) NOT NULL,
    `userId` VARCHAR(191) NULL,
    `action` VARCHAR(191) NOT NULL,
    `details` TEXT NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `AuditLog_userId_fkey`(`userId`),
    INDEX `AuditLog_action_idx`(`action`),
    INDEX `AuditLog_createdAt_idx`(`createdAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateIndex
CREATE UNIQUE INDEX `attribute_name_key` ON `attribute`(`name`);

-- CreateIndex
CREATE UNIQUE INDEX `offer_title_key` ON `offer`(`title`);

-- CreateIndex
CREATE UNIQUE INDEX `paint_sku_key` ON `paint`(`sku`);

-- AddForeignKey
ALTER TABLE `category` ADD CONSTRAINT `category_offerId_fkey` FOREIGN KEY (`offerId`) REFERENCES `offer`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- RenameIndex
ALTER TABLE `paint` RENAME INDEX `Paint_categoryId_fkey` TO `paint_categoryId_idx`;

-- RenameIndex
ALTER TABLE `paint` RENAME INDEX `Paint_offerId_fkey` TO `paint_offerId_idx`;

-- RenameIndex
ALTER TABLE `paint` RENAME INDEX `Paint_vendorId_fkey` TO `paint_vendorId_idx`;
