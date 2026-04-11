-- AlterTable
ALTER TABLE `clients` ADD COLUMN `transaction_category_id` INTEGER NULL;

-- AlterTable
ALTER TABLE `lotes` ADD COLUMN `week_number` INTEGER NULL,
    ADD COLUMN `year` INTEGER NULL;

-- CreateTable
CREATE TABLE `transaction_categories` (
    `category_id` INTEGER NOT NULL AUTO_INCREMENT,
    `name` VARCHAR(60) NOT NULL,
    `description` VARCHAR(200) NULL,
    `is_active` BOOLEAN NOT NULL DEFAULT true,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `transaction_categories_name_key`(`name`),
    PRIMARY KEY (`category_id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `sales_orders` (
    `order_id` BIGINT NOT NULL AUTO_INCREMENT,
    `order_number` INTEGER NOT NULL,
    `client_id` BIGINT NOT NULL,
    `client_address_id` BIGINT NOT NULL,
    `transaction_category_id` INTEGER NULL,
    `delivery_date` DATE NOT NULL,
    `status` ENUM('BORRADOR', 'APROBADA', 'DESPACHADA', 'CANCELADA') NOT NULL DEFAULT 'BORRADOR',
    `document_url` VARCHAR(500) NULL,
    `notes` VARCHAR(500) NULL,
    `created_by` BIGINT NOT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `sales_orders_order_number_key`(`order_number`),
    INDEX `sales_orders_client_id_idx`(`client_id`),
    INDEX `sales_orders_client_address_id_idx`(`client_address_id`),
    INDEX `sales_orders_transaction_category_id_idx`(`transaction_category_id`),
    INDEX `sales_orders_status_idx`(`status`),
    INDEX `sales_orders_delivery_date_idx`(`delivery_date`),
    PRIMARY KEY (`order_id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `sales_order_details` (
    `detail_id` BIGINT NOT NULL AUTO_INCREMENT,
    `order_id` BIGINT NOT NULL,
    `lote_id` BIGINT NOT NULL,
    `product_id` BIGINT NOT NULL,
    `line_number` INTEGER NOT NULL,
    `packaging_type` ENUM('TALLO', 'RAMO', 'CAJA') NOT NULL,
    `quantity` INTEGER NOT NULL,
    `stems_per_bunch` INTEGER NULL,
    `bunches_per_box` INTEGER NULL,
    `total_stems` INTEGER NOT NULL,
    `total_bunches` INTEGER NULL,
    `total_boxes` INTEGER NULL,
    `unit_price` DECIMAL(10, 2) NOT NULL,
    `subtotal` DECIMAL(10, 2) NOT NULL,
    `notes` VARCHAR(300) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `sales_order_details_order_id_idx`(`order_id`),
    INDEX `sales_order_details_lote_id_idx`(`lote_id`),
    INDEX `sales_order_details_product_id_idx`(`product_id`),
    PRIMARY KEY (`detail_id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `sales_orders` ADD CONSTRAINT `sales_orders_client_id_fkey` FOREIGN KEY (`client_id`) REFERENCES `clients`(`client_id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `sales_orders` ADD CONSTRAINT `sales_orders_client_address_id_fkey` FOREIGN KEY (`client_address_id`) REFERENCES `client_addresses`(`address_id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `sales_orders` ADD CONSTRAINT `sales_orders_transaction_category_id_fkey` FOREIGN KEY (`transaction_category_id`) REFERENCES `transaction_categories`(`category_id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `sales_orders` ADD CONSTRAINT `sales_orders_created_by_fkey` FOREIGN KEY (`created_by`) REFERENCES `users`(`user_id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `sales_order_details` ADD CONSTRAINT `sales_order_details_order_id_fkey` FOREIGN KEY (`order_id`) REFERENCES `sales_orders`(`order_id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `sales_order_details` ADD CONSTRAINT `sales_order_details_lote_id_fkey` FOREIGN KEY (`lote_id`) REFERENCES `lotes`(`lote_id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `sales_order_details` ADD CONSTRAINT `sales_order_details_product_id_fkey` FOREIGN KEY (`product_id`) REFERENCES `products`(`product_id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `clients` ADD CONSTRAINT `clients_transaction_category_id_fkey` FOREIGN KEY (`transaction_category_id`) REFERENCES `transaction_categories`(`category_id`) ON DELETE RESTRICT ON UPDATE CASCADE;
