-- AlterTable
ALTER TABLE `sales_order_details` MODIFY `lote_id` BIGINT NULL;

-- CreateTable
CREATE TABLE `sales_order_assignments` (
    `assignment_id` BIGINT NOT NULL AUTO_INCREMENT,
    `detail_id` BIGINT NOT NULL,
    `lote_id` BIGINT NOT NULL,
    `quantity` INTEGER NOT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `sales_order_assignments_detail_id_idx`(`detail_id`),
    INDEX `sales_order_assignments_lote_id_idx`(`lote_id`),
    PRIMARY KEY (`assignment_id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- Migrate data
INSERT INTO `sales_order_assignments` (`detail_id`, `lote_id`, `quantity`)
SELECT `detail_id`, `lote_id`, `quantity` FROM `sales_order_details` WHERE `lote_id` IS NOT NULL;

-- AddForeignKey
ALTER TABLE `sales_order_assignments` ADD CONSTRAINT `sales_order_assignments_detail_id_fkey` FOREIGN KEY (`detail_id`) REFERENCES `sales_order_details`(`detail_id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `sales_order_assignments` ADD CONSTRAINT `sales_order_assignments_lote_id_fkey` FOREIGN KEY (`lote_id`) REFERENCES `lotes`(`lote_id`) ON DELETE RESTRICT ON UPDATE CASCADE;
