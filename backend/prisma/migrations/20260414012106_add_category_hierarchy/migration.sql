-- AlterTable
ALTER TABLE `categories` ADD COLUMN `parent_id` BIGINT NULL,
    MODIFY `is_active` BOOLEAN NOT NULL DEFAULT false;

-- CreateIndex
CREATE INDEX `categories_parent_id_idx` ON `categories`(`parent_id`);

-- AddForeignKey
ALTER TABLE `categories` ADD CONSTRAINT `categories_parent_id_fkey` FOREIGN KEY (`parent_id`) REFERENCES `categories`(`category_id`) ON DELETE RESTRICT ON UPDATE CASCADE;
