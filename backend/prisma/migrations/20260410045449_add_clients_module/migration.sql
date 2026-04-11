-- CreateTable
CREATE TABLE `clients` (
    `client_id` BIGINT NOT NULL AUTO_INCREMENT,
    `code` VARCHAR(20) NOT NULL,
    `name` VARCHAR(120) NOT NULL,
    `origin` VARCHAR(60) NOT NULL,
    `currency` VARCHAR(10) NOT NULL,
    `delivery_terms` VARCHAR(80) NOT NULL,
    `status` ENUM('ACTIVO', 'INACTIVO') NOT NULL DEFAULT 'ACTIVO',
    `is_active` BOOLEAN NOT NULL DEFAULT true,
    `created_by` BIGINT NOT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `clients_code_key`(`code`),
    INDEX `clients_code_idx`(`code`),
    INDEX `clients_status_idx`(`status`),
    INDEX `clients_is_active_idx`(`is_active`),
    PRIMARY KEY (`client_id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `client_addresses` (
    `address_id` BIGINT NOT NULL AUTO_INCREMENT,
    `client_id` BIGINT NOT NULL,
    `address_type` ENUM('BILLING', 'SHIPPING') NOT NULL,
    `address_line` VARCHAR(200) NOT NULL,
    `city` VARCHAR(60) NOT NULL,
    `country` VARCHAR(60) NOT NULL,
    `is_active` BOOLEAN NOT NULL DEFAULT true,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `client_addresses_client_id_idx`(`client_id`),
    INDEX `client_addresses_address_type_idx`(`address_type`),
    PRIMARY KEY (`address_id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `client_contacts` (
    `contact_id` BIGINT NOT NULL AUTO_INCREMENT,
    `client_id` BIGINT NOT NULL,
    `full_name` VARCHAR(120) NOT NULL,
    `email` VARCHAR(120) NOT NULL,
    `phone` VARCHAR(30) NOT NULL,
    `role` VARCHAR(60) NOT NULL,
    `is_active` BOOLEAN NOT NULL DEFAULT true,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `client_contacts_client_id_idx`(`client_id`),
    PRIMARY KEY (`contact_id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `clients` ADD CONSTRAINT `clients_created_by_fkey` FOREIGN KEY (`created_by`) REFERENCES `users`(`user_id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `client_addresses` ADD CONSTRAINT `client_addresses_client_id_fkey` FOREIGN KEY (`client_id`) REFERENCES `clients`(`client_id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `client_contacts` ADD CONSTRAINT `client_contacts_client_id_fkey` FOREIGN KEY (`client_id`) REFERENCES `clients`(`client_id`) ON DELETE RESTRICT ON UPDATE CASCADE;
