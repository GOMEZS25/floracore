-- CreateTable
CREATE TABLE `sowings` (
    `sowing_id` BIGINT NOT NULL AUTO_INCREMENT,
    `location_id` INTEGER NOT NULL,
    `product_id` BIGINT NOT NULL,
    `stems_planted` INTEGER NOT NULL,
    `planting_date` DATE NOT NULL,
    `estimated_cut_week` INTEGER NOT NULL,
    `status` ENUM('ACTIVA', 'CERRADA') NOT NULL DEFAULT 'ACTIVA',
    `created_by` BIGINT NOT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `sowings_location_id_idx`(`location_id`),
    INDEX `sowings_product_id_idx`(`product_id`),
    INDEX `sowings_status_idx`(`status`),
    INDEX `sowings_planting_date_idx`(`planting_date`),
    PRIMARY KEY (`sowing_id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `sowings` ADD CONSTRAINT `sowings_location_id_fkey` FOREIGN KEY (`location_id`) REFERENCES `inventory_locations`(`location_id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `sowings` ADD CONSTRAINT `sowings_product_id_fkey` FOREIGN KEY (`product_id`) REFERENCES `products`(`product_id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `sowings` ADD CONSTRAINT `sowings_created_by_fkey` FOREIGN KEY (`created_by`) REFERENCES `users`(`user_id`) ON DELETE RESTRICT ON UPDATE CASCADE;
