-- AlterTable
ALTER TABLE `lotes` ADD COLUMN `variant_id` BIGINT NULL;

-- CreateIndex
CREATE INDEX `lotes_variant_id_idx` ON `lotes`(`variant_id`);

-- AddForeignKey
ALTER TABLE `lotes` ADD CONSTRAINT `lotes_variant_id_fkey` FOREIGN KEY (`variant_id`) REFERENCES `product_variants`(`variant_id`) ON DELETE RESTRICT ON UPDATE CASCADE;
