-- CreateTable
CREATE TABLE `projections` (
    `projection_id` BIGINT NOT NULL AUTO_INCREMENT,
    `sowing_id` BIGINT NOT NULL,
    `week_number` INTEGER NOT NULL,
    `year` INTEGER NOT NULL,
    `status` ENUM('PROYECTADO', 'CORTADO') NOT NULL DEFAULT 'PROYECTADO',
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `projections_sowing_id_idx`(`sowing_id`),
    INDEX `projections_week_number_year_idx`(`week_number`, `year`),
    INDEX `projections_status_idx`(`status`),
    PRIMARY KEY (`projection_id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `projection_details` (
    `detail_id` BIGINT NOT NULL AUTO_INCREMENT,
    `projection_id` BIGINT NOT NULL,
    `product_id` BIGINT NOT NULL,
    `stems_projected` INTEGER NOT NULL,
    `stems_actual` INTEGER NULL,

    INDEX `projection_details_projection_id_idx`(`projection_id`),
    INDEX `projection_details_product_id_idx`(`product_id`),
    PRIMARY KEY (`detail_id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `projections` ADD CONSTRAINT `projections_sowing_id_fkey` FOREIGN KEY (`sowing_id`) REFERENCES `sowings`(`sowing_id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `projection_details` ADD CONSTRAINT `projection_details_projection_id_fkey` FOREIGN KEY (`projection_id`) REFERENCES `projections`(`projection_id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `projection_details` ADD CONSTRAINT `projection_details_product_id_fkey` FOREIGN KEY (`product_id`) REFERENCES `products`(`product_id`) ON DELETE RESTRICT ON UPDATE CASCADE;
