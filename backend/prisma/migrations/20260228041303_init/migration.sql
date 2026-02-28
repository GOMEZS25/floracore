-- CreateTable
CREATE TABLE `roles` (
    `role_id` INTEGER NOT NULL AUTO_INCREMENT,
    `name` VARCHAR(30) NOT NULL,

    UNIQUE INDEX `roles_name_key`(`name`),
    PRIMARY KEY (`role_id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `users` (
    `user_id` BIGINT NOT NULL AUTO_INCREMENT,
    `role_id` INTEGER NOT NULL,
    `full_name` VARCHAR(120) NOT NULL,
    `email` VARCHAR(120) NOT NULL,
    `password_hash` VARCHAR(255) NOT NULL,
    `is_active` BOOLEAN NOT NULL DEFAULT true,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `users_email_key`(`email`),
    INDEX `users_role_id_idx`(`role_id`),
    INDEX `users_is_active_idx`(`is_active`),
    PRIMARY KEY (`user_id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `products` (
    `product_id` BIGINT NOT NULL AUTO_INCREMENT,
    `sku` VARCHAR(40) NOT NULL,
    `name` VARCHAR(120) NOT NULL,
    `category` VARCHAR(60) NOT NULL,
    `unit_of_measure` VARCHAR(20) NOT NULL,
    `is_active` BOOLEAN NOT NULL DEFAULT true,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `products_sku_key`(`sku`),
    INDEX `products_name_idx`(`name`),
    INDEX `products_category_idx`(`category`),
    INDEX `products_is_active_idx`(`is_active`),
    PRIMARY KEY (`product_id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `inventory_locations` (
    `location_id` INTEGER NOT NULL AUTO_INCREMENT,
    `name` VARCHAR(60) NOT NULL,
    `description` VARCHAR(200) NULL,

    UNIQUE INDEX `inventory_locations_name_key`(`name`),
    PRIMARY KEY (`location_id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `stock_movements` (
    `movement_id` BIGINT NOT NULL AUTO_INCREMENT,
    `product_id` BIGINT NOT NULL,
    `location_id` INTEGER NOT NULL,
    `movement_type` ENUM('IN', 'OUT', 'ADJUST') NOT NULL,
    `quantity` INTEGER NOT NULL,
    `movement_date` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `reference` VARCHAR(80) NULL,
    `notes` VARCHAR(200) NULL,
    `created_by` BIGINT NOT NULL,

    INDEX `stock_movements_product_id_idx`(`product_id`),
    INDEX `stock_movements_location_id_idx`(`location_id`),
    INDEX `stock_movements_created_by_idx`(`created_by`),
    INDEX `stock_movements_movement_type_movement_date_idx`(`movement_type`, `movement_date`),
    PRIMARY KEY (`movement_id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `stock_thresholds` (
    `threshold_id` INTEGER NOT NULL AUTO_INCREMENT,
    `product_id` BIGINT NOT NULL,
    `location_id` INTEGER NULL,
    `min_quantity` INTEGER NOT NULL,
    `is_active` BOOLEAN NOT NULL DEFAULT true,
    `created_by` BIGINT NOT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `stock_thresholds_product_id_idx`(`product_id`),
    INDEX `stock_thresholds_location_id_idx`(`location_id`),
    INDEX `stock_thresholds_is_active_idx`(`is_active`),
    PRIMARY KEY (`threshold_id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `forecast_runs` (
    `forecast_id` BIGINT NOT NULL AUTO_INCREMENT,
    `product_id` BIGINT NOT NULL,
    `forecast_name` VARCHAR(80) NOT NULL,
    `date_from` DATE NOT NULL,
    `date_to` DATE NOT NULL,
    `period_granularity` ENUM('DAY', 'WEEK', 'MONTH') NOT NULL,
    `method` ENUM('HISTORICAL_AVG', 'SIMPLE_TREND') NOT NULL,
    `horizon_periods` INTEGER NOT NULL,
    `adjustment_factor` DECIMAL(6, 3) NOT NULL DEFAULT 0.000,
    `created_by` BIGINT NOT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `forecast_runs_product_id_created_at_idx`(`product_id`, `created_at`),
    INDEX `forecast_runs_created_by_idx`(`created_by`),
    PRIMARY KEY (`forecast_id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `forecast_periods` (
    `forecast_period_id` BIGINT NOT NULL AUTO_INCREMENT,
    `forecast_id` BIGINT NOT NULL,
    `period_start` DATE NOT NULL,
    `period_end` DATE NOT NULL,
    `demand_estimated` INTEGER NOT NULL,
    `availability_estimated` INTEGER NOT NULL,

    INDEX `forecast_periods_forecast_id_idx`(`forecast_id`),
    INDEX `forecast_periods_period_start_period_end_idx`(`period_start`, `period_end`),
    PRIMARY KEY (`forecast_period_id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `users` ADD CONSTRAINT `users_role_id_fkey` FOREIGN KEY (`role_id`) REFERENCES `roles`(`role_id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `stock_movements` ADD CONSTRAINT `stock_movements_product_id_fkey` FOREIGN KEY (`product_id`) REFERENCES `products`(`product_id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `stock_movements` ADD CONSTRAINT `stock_movements_location_id_fkey` FOREIGN KEY (`location_id`) REFERENCES `inventory_locations`(`location_id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `stock_movements` ADD CONSTRAINT `stock_movements_created_by_fkey` FOREIGN KEY (`created_by`) REFERENCES `users`(`user_id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `stock_thresholds` ADD CONSTRAINT `stock_thresholds_product_id_fkey` FOREIGN KEY (`product_id`) REFERENCES `products`(`product_id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `stock_thresholds` ADD CONSTRAINT `stock_thresholds_location_id_fkey` FOREIGN KEY (`location_id`) REFERENCES `inventory_locations`(`location_id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `stock_thresholds` ADD CONSTRAINT `stock_thresholds_created_by_fkey` FOREIGN KEY (`created_by`) REFERENCES `users`(`user_id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `forecast_runs` ADD CONSTRAINT `forecast_runs_product_id_fkey` FOREIGN KEY (`product_id`) REFERENCES `products`(`product_id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `forecast_runs` ADD CONSTRAINT `forecast_runs_created_by_fkey` FOREIGN KEY (`created_by`) REFERENCES `users`(`user_id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `forecast_periods` ADD CONSTRAINT `forecast_periods_forecast_id_fkey` FOREIGN KEY (`forecast_id`) REFERENCES `forecast_runs`(`forecast_id`) ON DELETE CASCADE ON UPDATE CASCADE;
