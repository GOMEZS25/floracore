-- CreateTable
CREATE TABLE `attributes` (
    `attribute_id` BIGINT NOT NULL AUTO_INCREMENT,
    `name` VARCHAR(60) NOT NULL,
    `is_active` BOOLEAN NOT NULL DEFAULT true,
    `created_by` BIGINT NOT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `attributes_name_key`(`name`),
    INDEX `attributes_created_by_idx`(`created_by`),
    INDEX `attributes_is_active_idx`(`is_active`),
    PRIMARY KEY (`attribute_id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `attribute_values` (
    `value_id` BIGINT NOT NULL AUTO_INCREMENT,
    `attribute_id` BIGINT NOT NULL,
    `value` VARCHAR(60) NOT NULL,
    `is_active` BOOLEAN NOT NULL DEFAULT true,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `attribute_values_attribute_id_idx`(`attribute_id`),
    PRIMARY KEY (`value_id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `product_variants` (
    `variant_id` BIGINT NOT NULL AUTO_INCREMENT,
    `product_id` BIGINT NOT NULL,
    `sku_variant` VARCHAR(60) NOT NULL,
    `is_active` BOOLEAN NOT NULL DEFAULT false,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `product_variants_sku_variant_key`(`sku_variant`),
    INDEX `product_variants_product_id_idx`(`product_id`),
    PRIMARY KEY (`variant_id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `product_variant_attributes` (
    `id` BIGINT NOT NULL AUTO_INCREMENT,
    `variant_id` BIGINT NOT NULL,
    `value_id` BIGINT NOT NULL,

    INDEX `product_variant_attributes_variant_id_idx`(`variant_id`),
    INDEX `product_variant_attributes_value_id_idx`(`value_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `attributes` ADD CONSTRAINT `attributes_created_by_fkey` FOREIGN KEY (`created_by`) REFERENCES `users`(`user_id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `attribute_values` ADD CONSTRAINT `attribute_values_attribute_id_fkey` FOREIGN KEY (`attribute_id`) REFERENCES `attributes`(`attribute_id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `product_variants` ADD CONSTRAINT `product_variants_product_id_fkey` FOREIGN KEY (`product_id`) REFERENCES `products`(`product_id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `product_variant_attributes` ADD CONSTRAINT `product_variant_attributes_variant_id_fkey` FOREIGN KEY (`variant_id`) REFERENCES `product_variants`(`variant_id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `product_variant_attributes` ADD CONSTRAINT `product_variant_attributes_value_id_fkey` FOREIGN KEY (`value_id`) REFERENCES `attribute_values`(`value_id`) ON DELETE RESTRICT ON UPDATE CASCADE;
