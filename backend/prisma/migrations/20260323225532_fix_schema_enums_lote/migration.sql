-- DropForeignKey
ALTER TABLE `packaging` DROP FOREIGN KEY `Packaging_created_by_fkey`;

-- AlterTable
ALTER TABLE `lotes` MODIFY `estado` ENUM('DISPONIBLE', 'RESERVADO', 'AGOTADO') NOT NULL DEFAULT 'DISPONIBLE';

-- AddForeignKey
ALTER TABLE `packaging` ADD CONSTRAINT `packaging_created_by_fkey` FOREIGN KEY (`created_by`) REFERENCES `users`(`user_id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- RenameIndex
ALTER TABLE `packaging` RENAME INDEX `Packaging_is_active_idx` TO `packaging_is_active_idx`;

-- RenameIndex
ALTER TABLE `packaging` RENAME INDEX `Packaging_reference_key` TO `packaging_reference_key`;
