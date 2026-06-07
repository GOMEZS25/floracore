-- AlterTable
ALTER TABLE `sales_order_details` ADD COLUMN `variant_id` BIGINT NULL;

-- AddForeignKey
ALTER TABLE `sales_order_details` ADD CONSTRAINT `sales_order_details_variant_id_fkey` FOREIGN KEY (`variant_id`) REFERENCES `product_variants`(`variant_id`) ON DELETE RESTRICT ON UPDATE CASCADE;
