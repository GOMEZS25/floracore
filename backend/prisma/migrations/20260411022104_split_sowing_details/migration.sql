/*
  Warnings:

  - You are about to drop the column `product_id` on the `sowings` table. All the data in the column will be lost.
  - You are about to drop the column `stems_planted` on the `sowings` table. All the data in the column will be lost.

*/
-- DropForeignKey
ALTER TABLE `sowings` DROP FOREIGN KEY `sowings_product_id_fkey`;

-- AlterTable
ALTER TABLE `sowings` DROP COLUMN `product_id`,
    DROP COLUMN `stems_planted`;

-- CreateTable
CREATE TABLE `sowing_details` (
    `detail_id` BIGINT NOT NULL AUTO_INCREMENT,
    `sowing_id` BIGINT NOT NULL,
    `product_id` BIGINT NOT NULL,
    `stems_planted` INTEGER NOT NULL,

    INDEX `sowing_details_sowing_id_idx`(`sowing_id`),
    INDEX `sowing_details_product_id_idx`(`product_id`),
    PRIMARY KEY (`detail_id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `sowing_details` ADD CONSTRAINT `sowing_details_sowing_id_fkey` FOREIGN KEY (`sowing_id`) REFERENCES `sowings`(`sowing_id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `sowing_details` ADD CONSTRAINT `sowing_details_product_id_fkey` FOREIGN KEY (`product_id`) REFERENCES `products`(`product_id`) ON DELETE RESTRICT ON UPDATE CASCADE;
