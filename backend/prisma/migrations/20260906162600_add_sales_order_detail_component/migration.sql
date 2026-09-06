-- CreateTable
CREATE TABLE `sales_order_detail_components` (
    `component_id` BIGINT NOT NULL AUTO_INCREMENT,
    `detail_id` BIGINT NOT NULL,
    `component_product_id` BIGINT NOT NULL,
    `component_variant_id` BIGINT NULL,
    `product_name_snapshot` VARCHAR(150) NOT NULL,
    `bunches` INTEGER NOT NULL,
    `stems_per_bunch` INTEGER NOT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `sales_order_detail_components_detail_id_idx`(`detail_id`),
    INDEX `sales_order_detail_components_component_product_id_idx`(`component_product_id`),
    PRIMARY KEY (`component_id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `sales_order_detail_components` ADD CONSTRAINT `sales_order_detail_components_detail_id_fkey` FOREIGN KEY (`detail_id`) REFERENCES `sales_order_details`(`detail_id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `sales_order_detail_components` ADD CONSTRAINT `sales_order_detail_components_component_product_id_fkey` FOREIGN KEY (`component_product_id`) REFERENCES `products`(`product_id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `sales_order_detail_components` ADD CONSTRAINT `sales_order_detail_components_component_variant_id_fkey` FOREIGN KEY (`component_variant_id`) REFERENCES `product_variants`(`variant_id`) ON DELETE RESTRICT ON UPDATE CASCADE;
