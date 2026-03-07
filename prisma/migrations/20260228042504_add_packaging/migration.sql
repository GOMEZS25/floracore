-- AlterTable
ALTER TABLE `products` ADD COLUMN `packaging_id` INTEGER NULL;

-- CreateTable
CREATE TABLE `packaging` (
    `packaging_id` INTEGER NOT NULL AUTO_INCREMENT,
    `name` VARCHAR(60) NOT NULL,
    `reference` VARCHAR(20) NOT NULL,
    `category` ENUM('QUARTER_BOX', 'HALF_BOX', 'FULL_BOX') NOT NULL,
    `height` DECIMAL(8, 2) NOT NULL,
    `width` DECIMAL(8, 2) NOT NULL,
    `length` DECIMAL(8, 2) NOT NULL,
    `is_active` BOOLEAN NOT NULL DEFAULT true,
    `created_by` BIGINT NOT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `packaging_reference_key`(`reference`),
    INDEX `packaging_category_idx`(`category`),
    INDEX `packaging_is_active_idx`(`is_active`),
    PRIMARY KEY (`packaging_id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `products` ADD CONSTRAINT `products_packaging_id_fkey` FOREIGN KEY (`packaging_id`) REFERENCES `packaging`(`packaging_id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `packaging` ADD CONSTRAINT `packaging_created_by_fkey` FOREIGN KEY (`created_by`) REFERENCES `users`(`user_id`) ON DELETE RESTRICT ON UPDATE CASCADE;
