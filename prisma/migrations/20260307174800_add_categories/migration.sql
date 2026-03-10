CREATE TABLE `categories` (
    `category_id` BIGINT NOT NULL AUTO_INCREMENT,
    `name` VARCHAR(60) NOT NULL,
    `reference` VARCHAR(20) NOT NULL,
    `is_active` BOOLEAN NOT NULL DEFAULT true,
    `created_by` BIGINT NOT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    UNIQUE INDEX `categories_name_key`(`name`),
    UNIQUE INDEX `categories_reference_key`(`reference`),
    INDEX `categories_name_idx`(`name`),
    INDEX `categories_reference_idx`(`reference`),
    INDEX `categories_is_active_idx`(`is_active`),
    PRIMARY KEY (`category_id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;